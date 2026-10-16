import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Lock, Unlock } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import ConfirmModal from '../../../../components/ConfirmModal';
import { fetchTrafficAccessGrants, revokeTrafficAccessGrant } from '../../api';
import { useTrafficStore } from '../../store/useTrafficStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { TRAFFIC_TOASTS } from '../../toastMessages';
import { ACCESS_STATUS_TABS, ENTRY_WINDOW_LAST_DAY, FY_MONTHS, buildFinancialYearOptions } from './trafficConstants';
import { formatDate, monthLabel } from './trafficFormat';
import { copyRowsToClipboard, downloadExcel, downloadPdf } from './trafficExport';
import { useDebouncedSearch, usePagedList } from './usePagedList';
import ListToolbar, { FilterSelect, RefreshBar } from './components/ListToolbar';
import { TRAFFIC_DEFAULT_COL_DEF } from './gridDefaults';
import GrantAccessModal from './components/GrantAccessModal';

const FY_OPTIONS = buildFinancialYearOptions({ back: 3 }).map((fy) => ({ value: fy, label: fy }));
const FISCAL_ORDER = FY_MONTHS.map((m) => m.value);

function describeMonths(months = []) {
  if (months.length === 12) return 'All months';
  return [...months]
    .sort((a, b) => FISCAL_ORDER.indexOf(a) - FISCAL_ORDER.indexOf(b))
    .map(monthLabel)
    .join(', ');
}

const STATUS_TONE = {
  ACTIVE: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40',
  EXPIRED: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
  REVOKED: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40',
};

const wrapText = (className) => (params) => (
  <div className={`whitespace-normal break-words leading-snug py-1 text-[12px] text-center w-full ${className}`}>
    {params.valueFormatted ?? params.value ?? '-'}
  </div>
);

/** Ministry view: late-entry unlocks granted to organisations, with grant and revoke. */
export default function TrafficEntryAccess({
  organisations = [],
  canGrant,
  canRevoke,
  triggerNotification,
}) {
  const list = useTrafficStore((state) => state.access);
  const actions = useTrafficStore((state) => state.accessActions);
  const notify = useNotifier(triggerNotification);
  const [grantOpen, setGrantOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const { status, searchTerm, debouncedSearch, fiscalYear, organisationId, showFilterPanel, currentPage, pageSize } = list;
  const isRevokedTab = status === 'REVOKED';

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  const params = useMemo(() => {
    const query = { status, page: currentPage, limit: pageSize };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (organisationId) query.organisationId = organisationId;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [status, currentPage, pageSize, fiscalYear, organisationId, debouncedSearch]);

  const handleLoadError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Data entry access records')), [notify]);
  const { rows, total, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'access',
    params,
    request: fetchTrafficAccessGrants,
    onError: handleLoadError,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  const rowsWithSerial = useMemo(
    () => rows.map((row, index) => ({
      ...row,
      sNo: (currentPage - 1) * pageSize + index + 1,
      months_label: describeMonths(row.months),
    })),
    [rows, currentPage, pageSize]
  );

  const showRevoke = canRevoke && status === 'ACTIVE';

  const columnDefs = useMemo(() => [
    {
      field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 80, pinned: 'left', suppressSizeToFit: true,
      cellClass: 'text-slate-600 dark:text-slate-400 text-center font-bold', headerClass: 'text-center',
    },
    { field: 'organisation_name', headerName: 'Organisation', minWidth: 200, flex: 1.5, autoHeight: true, cellRenderer: wrapText('font-bold text-slate-800 dark:text-slate-100') },
    { field: 'financial_year', headerName: 'Financial Year', minWidth: 120, cellClass: 'text-center font-semibold', headerClass: 'text-center' },
    { field: 'months_label', headerName: 'Months Unlocked', minWidth: 200, flex: 1.6, autoHeight: true, cellRenderer: wrapText('font-semibold text-slate-700 dark:text-slate-200') },
    {
      field: 'expiry_date', headerName: 'Valid Until', minWidth: 120, headerClass: 'text-center', cellClass: 'text-center font-semibold',
      valueFormatter: (p) => (p.value ? formatDate(p.value) : 'Until revoked'),
    },
    {
      field: 'created_at', headerName: 'Granted On', minWidth: 120, headerClass: 'text-center', cellClass: 'text-center',
      valueFormatter: (p) => formatDate(p.value),
    },
    { field: 'granted_by_name', headerName: 'Granted By', minWidth: 140, autoHeight: true, cellRenderer: wrapText('text-slate-700 dark:text-slate-200') },
    ...(isRevokedTab ? [
      {
        field: 'revoked_at', headerName: 'Revoked On', minWidth: 120, headerClass: 'text-center', cellClass: 'text-center',
        valueFormatter: (p) => formatDate(p.value),
      },
      { field: 'revoked_by_name', headerName: 'Revoked By', minWidth: 140, autoHeight: true, cellRenderer: wrapText('text-slate-700 dark:text-slate-200') },
    ] : []),
    { field: 'email_or_remarks', headerName: 'Email / Remarks', minWidth: 200, flex: 1.4, autoHeight: true, cellRenderer: wrapText('text-slate-600 dark:text-slate-300') },
    {
      field: 'status', headerName: 'Status', minWidth: 105, headerClass: 'text-center', cellClass: 'text-center',
      cellRenderer: (params) => (
        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${STATUS_TONE[params.value] || ''}`}>
          {params.value}
        </span>
      ),
    },
    ...(showRevoke ? [{
      headerName: 'Action',
      width: 110,
      pinned: 'right',
      headerClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params) => params.data && (
        <button
          type="button"
          onClick={() => setPendingRevoke(params.data)}
          title={`Revoke access for ${params.data.organisation_name}`}
          aria-label={`Revoke access for ${params.data.organisation_name}`}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          Revoke
        </button>
      ),
    }] : []),
  ], [isRevokedTab, showRevoke]);

  const exportColumns = useMemo(() => [
    { field: 'sNo', label: 'S.No' },
    { field: 'organisation_name', label: 'Organisation' },
    { field: 'financial_year', label: 'Financial Year' },
    { field: 'months_label', label: 'Months Unlocked' },
    { field: 'expiry_date', label: 'Valid Until', exportValue: (r) => (r.expiry_date ? formatDate(r.expiry_date) : 'Until revoked') },
    { field: 'created_at', label: 'Granted On', exportValue: (r) => formatDate(r.created_at) },
    { field: 'granted_by_name', label: 'Granted By' },
    { field: 'email_or_remarks', label: 'Email / Remarks' },
    { field: 'status', label: 'Status' },
  ], []);

  const exportBaseName = `Traffic_Entry_Access_${status}_Page_${currentPage}`;
  const handleCopy = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('copy'));
    return copyRowsToClipboard(exportColumns, rowsWithSerial)
      .then(() => notify(COMMON_TOASTS.copySuccess(rowsWithSerial.length)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };
  const handleExcel = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return notify(COMMON_TOASTS.excelExported(downloadExcel(exportColumns, rowsWithSerial, exportBaseName, 'Entry Access')));
  };
  const handlePdf = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return downloadPdf('Traffic - Data Entry Access', exportColumns.filter((c) => c.field !== 'sNo'), rowsWithSerial, exportBaseName);
  };

  const organisationOptions = useMemo(
    () => organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })),
    [organisations]
  );
  const activeFiltersCount = (fiscalYear ? 1 : 0) + (organisationId ? 1 : 0);

  const confirmRevoke = async () => {
    setRevoking(true);
    try {
      await revokeTrafficAccessGrant(pendingRevoke.access_id);
      notify(TRAFFIC_TOASTS.accessRevoked(pendingRevoke.organisation_name));
      setPendingRevoke(null);
      reload();
    } catch (err) {
      notify(TRAFFIC_TOASTS.accessRevokeFailed(getErrorMessage(err)));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      <div className="module-subtabs-strip" role="tablist" aria-label="Access status">
        {ACCESS_STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={status === tab.id}
            onClick={() => actions.setStatus(tab.id)}
            className={`module-subtab-btn ${status === tab.id ? 'active' : ''}`}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

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
          searchPlaceholder="Search organisation or remarks..."
          pageSize={pageSize}
          onPageSizeChange={actions.setPageSize}
          totalCount={total}
          loading={loading}
          onCopy={handleCopy}
          onExportExcel={handleExcel}
          onExportPdf={handlePdf}
          actions={canGrant ? (
            <button
              type="button"
              onClick={() => setGrantOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlock Entry
            </button>
          ) : null}
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
              label="Organisation"
              value={organisationId}
              onChange={(value) => actions.setFilters({ organisationId: value })}
              options={organisationOptions}
              allLabel="All Organisations"
            />
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span>
            Organisations can enter or change traffic on days 1–{ENTRY_WINDOW_LAST_DAY} of each month.
            Unlock a period to allow changes after that; access ends on its Valid Until date or when revoked.
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

      {grantOpen && (
        <GrantAccessModal
          organisations={organisations}
          onClose={() => setGrantOpen(false)}
          onSaved={reload}
          triggerNotification={triggerNotification}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(pendingRevoke)}
        onClose={() => !revoking && setPendingRevoke(null)}
        onConfirm={confirmRevoke}
        loading={revoking}
        title="Revoke Data Entry Access"
        confirmText="Revoke"
        loadingText="Revoking..."
        message={pendingRevoke
          ? `${pendingRevoke.organisation_name} will no longer be able to change traffic for ${pendingRevoke.months_label} (${pendingRevoke.financial_year}) after the entry window.`
          : ''}
      />
    </div>
  );
}
