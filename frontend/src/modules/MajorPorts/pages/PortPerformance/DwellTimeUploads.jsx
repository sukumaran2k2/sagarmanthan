import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Edit, Info, Loader2, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import ConfirmModal from '../../../../components/ConfirmModal';
import { deleteDwellTimePeriod, downloadDwellTimePeriodExcel, fetchDwellTimePeriods } from '../../api';
import { usePortPerformanceStore } from '../../store/usePortPerformanceStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { PORT_PERFORMANCE_TOASTS } from '../../toastMessages';
import { buildFinancialYearOptions } from '../Traffic/trafficConstants';
import { describePeriod, exportNumber, formatDate, formatQuantity, monthLabel } from '../Traffic/trafficFormat';
import { copyRowsToClipboard, downloadExcel, downloadPdf } from '../Traffic/trafficExport';
import { useDebouncedSearch, usePagedList } from '../Traffic/usePagedList';
import ListToolbar, { FilterSelect, RefreshBar } from '../Traffic/components/ListToolbar';
import { TRAFFIC_DEFAULT_COL_DEF } from '../Traffic/gridDefaults';
import DwellUploadCard from './components/DwellUploadCard';
import DwellEditModal from './components/DwellEditModal';

const FY_OPTIONS = buildFinancialYearOptions().map((fy) => ({ value: fy, label: fy }));

const cellText = (column) => (params) => {
  const text = column.numeric
    ? formatQuantity(params.value)
    : column.isDate ? formatDate(params.value) : (params.value ?? '-');
  return <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{text}</span>;
};

const LEAD = [
  { field: 'fiscal_year', label: 'Financial Year', minWidth: 130, pinned: 'left' },
  { field: 'month_label', label: 'Month', minWidth: 110, pinned: 'left' },
];
const GROUPS = [
  {
    title: 'All Major Ports (Hours)',
    columns: [
      { field: 'monthly_import', label: 'Monthly Import', minWidth: 130, numeric: true },
      { field: 'monthly_export', label: 'Monthly Export', minWidth: 130, numeric: true },
      { field: 'monthly_overall', label: 'Monthly Overall', minWidth: 130, numeric: true },
      { field: 'ytd_overall', label: 'YTD Overall', minWidth: 120, numeric: true },
    ].map((c) => ({ ...c, exportValue: (r) => exportNumber(r[c.field]) })),
  },
];
const TRAIL = [
  { field: 'ports_with_data', label: 'Ports With Data', minWidth: 120 },
  { field: 'file_name', label: 'Last File', minWidth: 180 },
  { field: 'uploaded_by_name', label: 'Uploaded By', minWidth: 150 },
  { field: 'uploaded_date', label: 'Uploaded On', minWidth: 130, isDate: true, exportValue: (r) => formatDate(r.uploaded_date) },
  { field: 'last_updated', label: 'Last Updated', minWidth: 130, isDate: true, exportValue: (r) => formatDate(r.last_updated) },
];
const ALL_COLUMNS = [...LEAD, ...GROUPS.flatMap((g) => g.columns), ...TRAIL];

/**
 * Ministry tab: upload one month's dwell time sheet, and list the uploaded months.
 * Per month: Update corrects the values in a form, Download gives the saved values as Excel
 * (upload layout), Delete removes the uploaded values. Uploading the sheet again also replaces it.
 */
export default function DwellTimeUploads({ canUpload, canEdit, canDelete, triggerNotification }) {
  const list = usePortPerformanceStore((state) => state.dwell);
  const actions = usePortPerformanceStore((state) => state.dwellActions);
  const notify = useNotifier(triggerNotification);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);

  const { searchTerm, debouncedSearch, fiscalYear, showFilterPanel, currentPage, pageSize } = list;

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [currentPage, pageSize, fiscalYear, debouncedSearch]);

  const handleLoadError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Dwell time uploads')), [notify]);
  const { rows, total, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'port-performance-dwell',
    params,
    request: fetchDwellTimePeriods,
    onError: handleLoadError,
  });
  const busy = loading || refreshing;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  const rowsWithSerial = useMemo(
    () => rows.map((row, index) => ({ ...row, month_label: monthLabel(row.month), sNo: (currentPage - 1) * pageSize + index + 1 })),
    [rows, currentPage, pageSize]
  );

  const showActions = canEdit || canDelete;

  const handleDownload = useCallback(async (row) => {
    const key = `${row.fiscal_year}-${row.month}`;
    setDownloadingKey(key);
    try {
      const res = await downloadDwellTimePeriodExcel({ fiscalYear: row.fiscal_year, month: row.month });
      const startYear = Number(String(row.fiscal_year).slice(0, 4));
      const year = Number(row.month) >= 4 ? startYear : startYear + 1;
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dwell_Time_${monthLabel(row.month)}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(PORT_PERFORMANCE_TOASTS.dwellExcelFailed(getErrorMessage(err)));
    } finally {
      setDownloadingKey(null);
    }
  }, [notify]);

  const columnDefs = useMemo(() => {
    const toColDef = (column) => ({
      field: column.field,
      headerName: column.label,
      headerTooltip: column.label,
      minWidth: column.minWidth,
      flex: 1,
      pinned: column.pinned,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellRenderer: cellText(column),
    });

    return [
      {
        field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true,
        cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center',
      },
      ...LEAD.map(toColDef),
      ...GROUPS.map((g) => ({ headerName: g.title, marryChildren: true, children: g.columns.map(toColDef) })),
      ...TRAIL.map(toColDef),
      {
        headerName: 'Saved Data',
        headerTooltip: 'Download the saved values (with any updates) as Excel, in the upload layout',
        minWidth: 130,
        flex: 1,
        sortable: false,
        headerClass: 'text-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const name = `${row.month_label} ${row.fiscal_year}`;
          const downloading = downloadingKey === `${row.fiscal_year}-${row.month}`;
          return (
            <button
              type="button"
              onClick={() => handleDownload(row)}
              disabled={downloading}
              title={`Download Excel of the saved dwell time for ${name}`}
              aria-label={`Download Excel of the saved dwell time for ${name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0f417a] dark:text-blue-300 border border-blue-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Excel</span>
            </button>
          );
        },
      },
      ...(showActions ? [{
        headerName: 'Action',
        width: 110,
        pinned: 'right',
        sortable: false,
        headerClass: 'text-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const name = `${row.month_label} ${row.fiscal_year}`;
          return (
            <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(row)}
                  title={`Update dwell time for ${name}`}
                  aria-label={`Update dwell time for ${name}`}
                  className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(row)}
                  title={`Delete dwell time for ${name}`}
                  aria-label={`Delete dwell time for ${name}`}
                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      }] : []),
    ];
  }, [showActions, canEdit, canDelete, downloadingKey, handleDownload]);

  const exportColumns = useMemo(() => [{ field: 'sNo', label: 'S.No' }, ...ALL_COLUMNS], []);
  const exportBaseName = `Port_Performance_Dwell_Time_Page_${currentPage}`;
  const handleCopy = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('copy'));
    return copyRowsToClipboard(exportColumns, rowsWithSerial)
      .then(() => notify(COMMON_TOASTS.copySuccess(rowsWithSerial.length)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };
  const handleExcel = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    try {
      return notify(COMMON_TOASTS.excelExported(downloadExcel(exportColumns, rowsWithSerial, exportBaseName, 'Dwell Time')));
    } catch {
      return notify(COMMON_TOASTS.exportFailed());
    }
  };
  const handlePdf = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    try {
      downloadPdf('KPI Port Performance - Dwell Time Uploads', ALL_COLUMNS, rowsWithSerial, exportBaseName);
      return notify(COMMON_TOASTS.downloadStarted(`${exportBaseName}.pdf`));
    } catch {
      return notify(COMMON_TOASTS.exportFailed());
    }
  };

  const confirmDelete = async () => {
    const period = describePeriod(pendingDelete.fiscal_year, pendingDelete.month);
    setDeleting(true);
    try {
      await deleteDwellTimePeriod({ fiscalYear: pendingDelete.fiscal_year, month: pendingDelete.month });
      notify(PORT_PERFORMANCE_TOASTS.dwellDeleted(period));
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(PORT_PERFORMANCE_TOASTS.dwellDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {canUpload && <DwellUploadCard onUploaded={reload} triggerNotification={triggerNotification} />}

      <div className="module-card space-y-4">
        <ListToolbar
          showFilterPanel={showFilterPanel}
          onToggleFilters={() => actions.setShowFilterPanel((prev) => !prev)}
          activeFiltersCount={fiscalYear ? 1 : 0}
          onResetFilters={() => {
            actions.resetFilters();
            notify(COMMON_TOASTS.filtersReset());
          }}
          searchTerm={searchTerm}
          onSearchChange={actions.setSearchTerm}
          searchPlaceholder="Search month or year..."
          pageSize={pageSize}
          onPageSizeChange={actions.setPageSize}
          totalCount={total}
          loading={loading}
          onCopy={handleCopy}
          onExportExcel={handleExcel}
          onExportPdf={handlePdf}
        />

        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <FilterSelect
              label="Financial Year"
              value={fiscalYear}
              onChange={(value) => actions.setFilters({ fiscalYear: value })}
              options={FY_OPTIONS}
              allLabel="All Years"
            />
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span>
            Months uploaded from Excel. Each port sees its own uploaded values, view only, in the Dwell Time step of
            the Port Performance form. To correct a month, update its values or upload its sheet again; download
            gives the saved values as Excel.
          </span>
        </p>

        <div className={`ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800 ${refreshing && !loading ? 'opacity-80' : ''}`}>
          <RefreshBar active={refreshing && !loading} />
          <Table
            rowData={rowsWithSerial}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            defaultColDef={TRAFFIC_DEFAULT_COL_DEF}
          />
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={total}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => actions.setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => actions.setCurrentPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => actions.setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>
      </div>

      {editing && (
        <DwellEditModal
          period={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
          triggerNotification={triggerNotification}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Uploaded Dwell Time"
        message={pendingDelete
          ? `The uploaded dwell time of every port for ${monthLabel(pendingDelete.month)} ${pendingDelete.fiscal_year} will be deleted. The upload history is kept.`
          : ''}
      />
    </div>
  );
}
