import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Info, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import ConfirmModal from '../../../../components/ConfirmModal';
import { deleteRenewableEnergyActual, fetchRenewableEnergyActuals } from '../../api';
import { useRenewableEnergyStore } from '../../store/useRenewableEnergyStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { RENEWABLE_ENERGY_TOASTS } from '../../toastMessages';
import { FY_MONTHS, buildFinancialYearOptions, currentFinancialYear } from '../Traffic/trafficConstants';
import { describePeriod, exportNumber, formatDate, formatNumber, monthLabel } from '../Traffic/trafficFormat';
import { copyRowsToClipboard, downloadExcel, downloadPdf } from '../Traffic/trafficExport';
import { useDebouncedSearch, usePagedList } from '../Traffic/usePagedList';
import ListToolbar, { FilterSelect, RefreshBar } from '../Traffic/components/ListToolbar';
import { TRAFFIC_DEFAULT_COL_DEF } from '../Traffic/gridDefaults';
import { INPUT_FIELDS, columnLabel } from './renewableEnergyConfig';

const FY_OPTIONS = buildFinancialYearOptions().map((fy) => ({ value: fy, label: fy }));
const MONTH_OPTIONS = FY_MONTHS.map((m) => ({ value: String(m.value), label: m.label }));

const textCell = (params) => (
  <span className="font-semibold text-slate-700 dark:text-slate-200 text-[12px]">{params.valueFormatted ?? params.value ?? '-'}</span>
);

/**
 * The earlier portal's Actuals columns (total electrical and renewable energy).
 * Drives the grid, visibility menu and exports.
 * Organisation is shown to ministry users only.
 */
function buildColumns(isMinistryView) {
  return [
    ...(isMinistryView ? [{ field: 'organisation_name', label: 'Organisation', minWidth: 210, pinned: 'left', wrap: true }] : []),
    { field: 'fiscal_year', label: 'Financial Year', minWidth: 120, pinned: 'left' },
    { field: 'month', label: 'Month', minWidth: 110, pinned: 'left', format: monthLabel, exportValue: (r) => monthLabel(r.month) },
    ...INPUT_FIELDS.map((f) => ({
      field: f.key,
      label: columnLabel(f),
      minWidth: 170,
      numeric: true,
      exportValue: (r) => exportNumber(r[f.key]),
    })),
    { field: 'last_updated', label: 'Last Updated Date', minWidth: 130, format: formatDate, exportValue: (r) => formatDate(r.last_updated) },
  ];
}

function toColDef(column, visibleCols) {
  return {
    field: column.field,
    headerName: column.label,
    headerTooltip: column.label,
    minWidth: column.minWidth,
    flex: 1,
    pinned: column.pinned,
    hide: visibleCols[column.field] === false,
    autoHeight: column.wrap,
    headerClass: 'text-center',
    cellClass: `text-center ${column.numeric ? 'tabular-nums' : ''}`,
    valueFormatter: column.numeric ? (p) => formatNumber(p.value, 2) : column.format ? (p) => column.format(p.value) : undefined,
    cellRenderer: column.wrap
      ? (params) => (
        <div className="whitespace-normal break-words leading-snug py-1 text-[12px] font-bold text-slate-800 dark:text-slate-100 text-center w-full">
          {params.value ?? '-'}
        </div>
      )
      : textCell,
  };
}

export default function RenewableEnergyDataList({
  organisations = [],
  isMinistryView,
  canEdit,
  canDelete,
  onEdit,
  triggerNotification,
}) {
  const list = useRenewableEnergyStore((state) => state.actuals);
  const actions = useRenewableEnergyStore((state) => state.actualsActions);
  const notify = useNotifier(triggerNotification);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    searchTerm, debouncedSearch, fiscalYear, month, organisationId,
    showFilterPanel, currentPage, pageSize, visibleCols,
  } = list;

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (month) query.month = month;
    if (isMinistryView && organisationId) query.organisationId = organisationId;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [currentPage, pageSize, fiscalYear, month, isMinistryView, organisationId, debouncedSearch]);

  const handleLoadError = useCallback(
    () => notify(COMMON_TOASTS.loadFailed('Renewable energy')),
    [notify]
  );
  const { rows, total, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'renewable-energy-actuals',
    params,
    request: fetchRenewableEnergyActuals,
    onError: handleLoadError,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  // After a delete empties the last page, step back to the new last page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  const allColumns = useMemo(() => buildColumns(isMinistryView), [isMinistryView]);

  const rowsWithSerial = useMemo(
    () => rows.map((row, index) => ({ ...row, sNo: (currentPage - 1) * pageSize + index + 1 })),
    [rows, currentPage, pageSize]
  );

  const showActions = !isMinistryView && (canEdit || canDelete);

  const columnDefs = useMemo(() => {
    const serial = {
      field: 'sNo',
      headerName: 'S.No',
      minWidth: 80,
      maxWidth: 80,
      pinned: 'left',
      suppressSizeToFit: true,
      sortable: false,
      cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center',
    };

    const actionCol = showActions ? [{
      headerName: 'Update',
      width: 110,
      pinned: 'right',
      sortable: false,
      headerClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params) => {
        const row = params.data;
        if (!row) return null;
        const name = `${monthLabel(row.month)} ${row.fiscal_year}`;
        return (
          <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(row)}
                title={`Update renewable energy for ${name}`}
                aria-label={`Update renewable energy for ${name}`}
                className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setPendingDelete(row)}
                title={`Delete renewable energy for ${name}`}
                aria-label={`Delete renewable energy for ${name}`}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    }] : [];

    return [serial, ...allColumns.map((c) => toColDef(c, visibleCols)), ...actionCol];
  }, [allColumns, visibleCols, showActions, canEdit, canDelete, onEdit]);

  const visibility = useMemo(() => ({
    columns: allColumns.map((c) => ({ key: c.field, label: c.label })),
    visibleCols,
    onToggle: (key) => actions.setVisibleCols((prev) => ({ ...prev, [key]: prev[key] === false })),
    onShowAll: () => actions.setVisibleCols({}),
  }), [allColumns, visibleCols, actions]);

  const organisationOptions = useMemo(
    () => organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })),
    [organisations]
  );

  // The current financial year is the default, so only a different choice counts as a filter
  const defaultFiscalYear = currentFinancialYear();
  const activeFiltersCount =
    (fiscalYear !== defaultFiscalYear ? 1 : 0) +
    (month ? 1 : 0) +
    (isMinistryView && organisationId ? 1 : 0);

  const handleResetFilters = () => {
    actions.resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const visibleExportColumns = useMemo(
    () => [{ field: 'sNo', label: 'S.No' }, ...allColumns.filter((c) => visibleCols[c.field] !== false)],
    [allColumns, visibleCols]
  );
  const exportBaseName = `Renewable_Energy_Page_${currentPage}`;

  const handleCopy = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('copy'));
    return copyRowsToClipboard(visibleExportColumns, rowsWithSerial)
      .then(() => notify(COMMON_TOASTS.copySuccess(rowsWithSerial.length)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const handleExcel = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    const fileName = downloadExcel(visibleExportColumns, rowsWithSerial, exportBaseName, 'Actuals');
    return notify(COMMON_TOASTS.excelExported(fileName));
  };

  const handlePdf = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return downloadPdf(
      'Renewable Energy - Actuals',
      visibleExportColumns.filter((c) => c.field !== 'sNo'),
      rowsWithSerial,
      exportBaseName
    );
  };

  const confirmDelete = async () => {
    const period = describePeriod(pendingDelete.fiscal_year, pendingDelete.month);
    setDeleting(true);
    try {
      await deleteRenewableEnergyActual(pendingDelete.id);
      notify(RENEWABLE_ENERGY_TOASTS.actualDeleted(period));
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(RENEWABLE_ENERGY_TOASTS.actualDeleteFailed(period, getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  const scopeCaption = [
    fiscalYear ? `FY ${fiscalYear}` : 'All financial years',
    month ? monthLabel(month) : null,
    isMinistryView
      ? (organisationId
        ? organisations.find((o) => String(o.organisation_id) === String(organisationId))?.organisation_name
        : 'All organisations')
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4 animate-fade-in relative">
      <div className="module-card space-y-4">
        <ListToolbar
          showFilterPanel={showFilterPanel}
          onToggleFilters={() => actions.setShowFilterPanel((prev) => !prev)}
          activeFiltersCount={activeFiltersCount}
          onResetFilters={handleResetFilters}
          searchTerm={searchTerm}
          onSearchChange={actions.setSearchTerm}
          searchPlaceholder={isMinistryView ? 'Search organisation, year or month...' : 'Search year or month...'}
          pageSize={pageSize}
          onPageSizeChange={actions.setPageSize}
          totalCount={total}
          loading={loading}
          visibility={visibility}
          onCopy={handleCopy}
          onExportExcel={handleExcel}
          onExportPdf={handlePdf}
        />

        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            <FilterSelect
              label="Financial Year"
              value={fiscalYear}
              onChange={(value) => actions.setFilters({ fiscalYear: value })}
              options={FY_OPTIONS}
              allLabel="All Years"
            />
            <FilterSelect
              label="Month"
              value={month}
              onChange={(value) => actions.setFilters({ month: value })}
              options={MONTH_OPTIONS}
              allLabel="All Months"
            />
            {isMinistryView && (
              <FilterSelect
                label="Organisation"
                value={organisationId}
                onChange={(value) => actions.setFilters({ organisationId: value })}
                options={organisationOptions}
                allLabel="All Organisations"
              />
            )}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span>
            Showing monthly energy consumption for {scopeCaption}. Values are in MWh and include both PPP and
            captive sources.
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

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Renewable Energy"
        message={pendingDelete
          ? `The renewable energy for ${monthLabel(pendingDelete.month)} ${pendingDelete.fiscal_year} will be deleted. This cannot be undone.`
          : ''}
      />
    </div>
  );
}
