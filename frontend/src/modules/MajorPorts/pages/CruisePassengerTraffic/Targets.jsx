import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Info, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import ConfirmModal from '../../../../components/ConfirmModal';
import { deleteCruisePassengerTarget, fetchCruisePassengerTargets } from '../../api';
import { useCruisePassengerStore } from '../../store/useCruisePassengerStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { CRUISE_PASSENGER_TOASTS } from '../../toastMessages';
import { buildFinancialYearOptions } from '../Traffic/trafficConstants';
import { exportNumber, formatDate, formatNumber } from '../Traffic/trafficFormat';
import { copyRowsToClipboard, downloadExcel, downloadPdf } from '../Traffic/trafficExport';
import { useDebouncedSearch, usePagedList } from '../Traffic/usePagedList';
import ListToolbar, { FilterSelect, RefreshBar } from '../Traffic/components/ListToolbar';
import { TRAFFIC_DEFAULT_COL_DEF } from '../Traffic/gridDefaults';
import { TARGET_FIELDS } from './cruisePassengerConfig';

const FY_OPTIONS = buildFinancialYearOptions({ ahead: 1 }).map((fy) => ({ value: fy, label: fy }));

// Same columns as the earlier portal's Targets table
function buildColumns(isMinistryView) {
  return [
    { field: 'financial_year', label: 'Financial Year', minWidth: 130 },
    ...(isMinistryView ? [{ field: 'organisation_name', label: 'Organisation', minWidth: 220, flex: 1.6 }] : []),
    ...TARGET_FIELDS.map((f) => ({
      field: f.key,
      label: f.label,
      minWidth: 170,
      numeric: true,
      exportValue: (r) => exportNumber(r[f.key]),
    })),
    {
      field: 'last_updated', label: 'Last Updated Date', minWidth: 140, isDate: true,
      exportValue: (r) => formatDate(r.last_updated),
    },
  ];
}

const cellText = (column) => (params) => {
  const text = column.numeric
    ? formatNumber(params.value, 0)
    : column.isDate ? formatDate(params.value) : (params.value ?? '-');
  return <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{text}</span>;
};

export default function CruisePassengerTargets({
  organisations = [],
  isMinistryView,
  canEdit,
  canDelete,
  onEdit,
  triggerNotification,
}) {
  const list = useCruisePassengerStore((state) => state.targets);
  const actions = useCruisePassengerStore((state) => state.targetsActions);
  const notify = useNotifier(triggerNotification);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    searchTerm, debouncedSearch, fiscalYear, organisationId, showFilterPanel, currentPage, pageSize, visibleCols,
  } = list;

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (isMinistryView && organisationId) query.organisationId = organisationId;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [currentPage, pageSize, fiscalYear, isMinistryView, organisationId, debouncedSearch]);

  const handleLoadError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Cruise and ferry targets')), [notify]);
  const { rows, total, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'cruise-passenger-targets',
    params,
    request: fetchCruisePassengerTargets,
    onError: handleLoadError,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  // After a delete empties the last page, step back to the new last page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  const rowsWithSerial = useMemo(
    () => rows.map((row, index) => ({ ...row, sNo: (currentPage - 1) * pageSize + index + 1 })),
    [rows, currentPage, pageSize]
  );

  const columns = useMemo(() => buildColumns(isMinistryView), [isMinistryView]);
  const showActions = isMinistryView && (canEdit || canDelete);

  const columnDefs = useMemo(() => [
    {
      field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true,
      cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center',
    },
    ...columns.map((column) => ({
      field: column.field,
      headerName: column.label,
      headerTooltip: column.label,
      minWidth: column.minWidth,
      flex: column.flex ?? 1,
      hide: visibleCols[column.field] === false,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellRenderer: cellText(column),
    })),
    ...(showActions ? [{
      headerName: 'Update',
      width: 110,
      pinned: 'right',
      headerClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params) => {
        const row = params.data;
        if (!row) return null;
        const name = `${row.organisation_name} ${row.financial_year}`;
        return (
          <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(row)}
                title={`Update targets for ${name}`}
                aria-label={`Update targets for ${name}`}
                className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setPendingDelete(row)}
                title={`Delete targets for ${name}`}
                aria-label={`Delete targets for ${name}`}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    }] : []),
  ], [columns, visibleCols, showActions, canEdit, canDelete, onEdit]);

  const visibility = useMemo(() => ({
    columns: columns.map((c) => ({ key: c.field, label: c.label })),
    visibleCols,
    onToggle: (key) => actions.setVisibleCols((prev) => ({ ...prev, [key]: prev[key] === false })),
    onShowAll: () => actions.setVisibleCols({}),
  }), [columns, visibleCols, actions]);

  const exportColumns = useMemo(
    () => [{ field: 'sNo', label: 'S.No' }, ...columns.filter((c) => visibleCols[c.field] !== false)],
    [columns, visibleCols]
  );

  const exportBaseName = `Cruise_Passenger_Targets_Page_${currentPage}`;
  const handleCopy = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('copy'));
    return copyRowsToClipboard(exportColumns, rowsWithSerial)
      .then(() => notify(COMMON_TOASTS.copySuccess(rowsWithSerial.length)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };
  const handleExcel = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return notify(COMMON_TOASTS.excelExported(downloadExcel(exportColumns, rowsWithSerial, exportBaseName, 'Targets')));
  };
  const handlePdf = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return downloadPdf('Cruise and Passenger Traffic - Targets', exportColumns.filter((c) => c.field !== 'sNo'), rowsWithSerial, exportBaseName);
  };

  const organisationOptions = useMemo(
    () => organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })),
    [organisations]
  );
  const activeFiltersCount = (fiscalYear ? 1 : 0) + (isMinistryView && organisationId ? 1 : 0);

  const confirmDelete = async () => {
    const { id, organisation_name: orgName, financial_year: fy } = pendingDelete;
    setDeleting(true);
    try {
      await deleteCruisePassengerTarget(id);
      notify(CRUISE_PASSENGER_TOASTS.targetDeleted(orgName, fy));
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(CRUISE_PASSENGER_TOASTS.targetDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      <div className="module-card space-y-4">
        <ListToolbar
          showFilterPanel={showFilterPanel}
          onToggleFilters={() => actions.setShowFilterPanel((prev) => !prev)}
          activeFiltersCount={activeFiltersCount}
          onResetFilters={() => {
            actions.resetFilters();
            notify(COMMON_TOASTS.filtersReset());
          }}
          searchTerm={searchTerm}
          onSearchChange={actions.setSearchTerm}
          searchPlaceholder={isMinistryView ? 'Search organisation or year...' : 'Search year...'}
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
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <FilterSelect
              label="Financial Year"
              value={fiscalYear}
              onChange={(value) => actions.setFilters({ fiscalYear: value })}
              options={FY_OPTIONS}
              allLabel="All Years"
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
            One set of cruise and ferry call targets per organisation and financial year.
            {isMinistryView ? ' Add new targets from the Input Form.' : ' Targets are set by the Ministry.'}
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
        title="Delete Targets"
        message={pendingDelete
          ? `The ${pendingDelete.financial_year} cruise and ferry targets for ${pendingDelete.organisation_name} will be deleted. Actuals are not affected.`
          : ''}
      />
    </div>
  );
}
