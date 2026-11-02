import { useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import DataListToolbar from '../../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';
import { exportDataListToCsv } from '../../../../utils/exportDataListCsv';
import { COMMON_TOASTS } from '../../../../utils/notify';

const COLUMN_LABELS = {
  financial_year: 'Financial Year',
  total_no_of_offshore_in_fleet: 'Total Offshore Vessels in Fleet',
  total_no_days_on_offshore_time_charter: 'Days on Time Charter',
  total_no_days_on_offshore_voyage_charter: 'Days on Voyage Charter',
  total_revenue_offshore: 'Total Revenue (Rs. in Crs.)',
  average_earnings_offshore: 'Average Earnings per Day (US $)',
};

const DEFAULT_VISIBLE_COLS = {
  financial_year: true,
  total_no_of_offshore_in_fleet: true,
  total_no_days_on_offshore_time_charter: true,
  total_no_days_on_offshore_voyage_charter: true,
  total_revenue_offshore: true,
  average_earnings_offshore: true,
};

export default function TimeVoyageOffshoreDataList({
  rowData = [],
  loading = false,
  onEdit,
  onDelete,
  canEdit = true,
  canRemove = false,
  financialYear = '',
  onFinancialYearChange,
  searchQuery = '',
  onSearchChange,
  currentPage = 1,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  visibleCols: storedVisibleCols = null,
  onVisibleColsChange,
  notify,
}) {
  // List state is kept in the SCI store per section; null columns means "not changed yet"
  const visibleCols = storedVisibleCols ?? DEFAULT_VISIBLE_COLS;
  const setVisibleCols = (updater) => onVisibleColsChange?.((prev) => {
    const current = prev ?? DEFAULT_VISIBLE_COLS;
    return typeof updater === 'function' ? updater(current) : updater;
  });
  const gridRef = useRef(null);

  const years = useMemo(
    () => [...new Set(rowData.map((r) => r.financial_year))].sort().reverse(),
    [rowData]
  );

  const filteredData = useMemo(() => {
    let data = financialYear ? rowData.filter((r) => r.financial_year === financialYear) : rowData;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) => (r.financial_year || '').toLowerCase().includes(q));
  }, [rowData, financialYear, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  // A stored page can be past the end once the data or filters change
  const page = Math.min(currentPage, totalPages);
  const pageRows = useMemo(() => filteredData.slice((page - 1) * pageSize, page * pageSize), [filteredData, page, pageSize]);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      filteredData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => row[c] ?? '')];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).then(
        () => notify?.(COMMON_TOASTS.copySuccess(filteredData.length)),
        () => notify?.(COMMON_TOASTS.copyFailed()),
      );
    } else if (type === 'Excel') {
      // Every filtered row, not just the page on show
      exportDataListToCsv({ columnLabels: COLUMN_LABELS, visibleCols, rowData: filteredData, fileName: 'sci_time_voyage_offshore' });
      notify?.(COMMON_TOASTS.excelExported('sci_time_voyage_offshore.csv'));
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'SCI Time Voyage Offshore Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: filteredData,
        fileName: 'sci_time_voyage_offshore',
      });
      notify?.(COMMON_TOASTS.downloadStarted('sci_time_voyage_offshore.pdf'));
    }
  };

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1 + (page - 1) * pageSize, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.financial_year ? [{ headerName: 'Financial Year', field: 'financial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.total_no_of_offshore_in_fleet ? [{ headerName: 'Total Offshore Vessels in Fleet', field: 'total_no_of_offshore_in_fleet', flex: 1.2, minWidth: 210, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.total_no_days_on_offshore_time_charter ? [{ headerName: 'Days on Time Charter', field: 'total_no_days_on_offshore_time_charter', flex: 1.1, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.total_no_days_on_offshore_voyage_charter ? [{ headerName: 'Days on Voyage Charter', field: 'total_no_days_on_offshore_voyage_charter', flex: 1.1, minWidth: 190, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.total_revenue_offshore ? [{ headerName: 'Total Revenue (Rs. in Crs.)', field: 'total_revenue_offshore', flex: 1.2, minWidth: 200, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.average_earnings_offshore ? [{ headerName: 'Average Earnings per Day (US $)', field: 'average_earnings_offshore', flex: 1.2, minWidth: 220, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'sci_time_voyage_offshore_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEdit && onEdit(params.data)}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDelete && onDelete(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, visibleCols, page, pageSize]);

  return (
    <div className="module-card space-y-4">
      <DataListToolbar
        leftContent={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial Year</span>
            <select
              value={financialYear}
              onChange={(e) => onFinancialYearChange?.(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Show All</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
        searchTerm={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search"
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        totalRows={loading ? '...' : filteredData.length}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={COLUMN_LABELS}
      />

      <div className="module-datalist-grid">
        <Table
          ref={gridRef}
          rowData={pageRows}
          columnDefs={colDefs}
          loading={loading}
          pagination={false}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={42}
          color="#0f417a"
        />
      </div>

      {totalPages > 1 && (
        <TablePagination
          currentPage={page - 1}
          totalPages={totalPages}
          totalRows={filteredData.length}
          pageSize={pageSize}
          onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
          color="#0f417a"
        />
      )}
    </div>
  );
}
