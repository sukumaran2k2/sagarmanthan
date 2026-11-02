import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Info, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import ConfirmModal from '../../../../components/ConfirmModal';
import { deleteTrafficPeriod, fetchTrafficActuals } from '../../api';
import { useTrafficStore } from '../../store/useTrafficStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../../utils/notify';
import { TRAFFIC_TOASTS } from '../../toastMessages';
import {
  DATA_LIST_VIEWS,
  FY_MONTHS,
  TRAFFIC_CATEGORIES,
  TRAFFIC_CELL_DIMENSIONS,
  TRAFFIC_DIRECTIONS,
  TRAFFIC_FLAG_TYPES,
  buildFinancialYearOptions,
  currentFinancialYear,
} from './trafficConstants';
import { describePeriod, exportNumber, formatDate, formatNumber, monthLabel } from './trafficFormat';
import { copyRowsToClipboard, downloadExcel, downloadPdf } from './trafficExport';
import { useDebouncedSearch, usePagedList } from './usePagedList';
import ListToolbar, { FilterSelect, RefreshBar } from './components/ListToolbar';
import { TRAFFIC_DEFAULT_COL_DEF } from './gridDefaults';

const FY_OPTIONS = buildFinancialYearOptions().map((fy) => ({ value: fy, label: fy }));
const MONTH_OPTIONS = FY_MONTHS.map((m) => ({ value: String(m.value), label: m.label }));
const VIEW_LABELS = Object.fromEntries(DATA_LIST_VIEWS.map((v) => [v.id, v.label]));

const textCell = (className) => (params) => (
  <span className={className}>{params.valueFormatted ?? params.value ?? '-'}</span>
);

/** Column spec per view: drives the grid, visibility menu and exports. */
function buildColumns(view, isMinistryView) {
  const period = [
    { field: 'fiscal_year', label: 'Financial Year', minWidth: 120, pinned: 'left' },
    { field: 'month', label: 'Month', minWidth: 110, pinned: 'left', format: monthLabel, exportValue: (r) => monthLabel(r.month) },
  ];
  const organisation = isMinistryView
    ? [{ field: 'organisation_name', label: 'Organisation', minWidth: 200, flex: 1.6, pinned: view === 'commodity' ? 'left' : undefined }]
    : [];
  const num = (field, label, opts = {}) => ({
    field, label, minWidth: 140, numeric: true, format: (v) => formatNumber(v), exportValue: (r) => exportNumber(r[field]), ...opts,
  });

  if (view === 'commodity') {
    return [
      ...period,
      ...organisation,
      { field: 'commodity_group_name', label: 'Commodity Group', minWidth: 130, pinned: 'left' },
      { field: 'commodity_name', label: 'Commodity', minWidth: 190, pinned: 'left' },
      ...TRAFFIC_CELL_DIMENSIONS.map((d) => num(d.key, d.label, { minWidth: 104, dimension: d })),
      num('row_total', 'Total', { minWidth: 110, emphasis: true }),
    ];
  }

  if (view === 'roro') {
    return [
      ...period,
      ...organisation,
      num('ro_ro_traffic', "Ro-Ro Traffic ('000 Tonnes)", { minWidth: 180, emphasis: true }),
      num('ro_pax_traffic', "Ro-Pax Traffic ('000 Tonnes / Number)", { minWidth: 200 }),
      { field: 'last_updated', label: 'Last Updated', minWidth: 130, format: formatDate, exportValue: (r) => formatDate(r.last_updated) },
    ];
  }

  return [
    ...period,
    ...organisation,
    num('total_tonnes', "Total ('000 Tonnes)", { minWidth: 150, emphasis: true }),
    num('total_teu', "Total ('000 TEUs)", { minWidth: 150, emphasis: true }),
    num('ro_ro_traffic', "Ro-Ro ('000 Tonnes)", { minWidth: 140 }),
    num('ro_pax_traffic', "Ro-Pax ('000 Tonnes / No.)", { minWidth: 160 }),
    { field: 'commodity_count', label: 'Commodities', minWidth: 120, numeric: true },
    { field: 'last_updated', label: 'Last Updated', minWidth: 130, format: formatDate, exportValue: (r) => formatDate(r.last_updated) },
  ];
}

function toColDef(column, visibleCols) {
  const weight = column.emphasis ? 'font-black text-[#0f417a] dark:text-blue-300' : 'font-semibold text-slate-700 dark:text-slate-200';
  return {
    field: column.field,
    headerName: column.dimension ? TRAFFIC_FLAG_TYPES.find((f) => f.id === column.dimension.flagTypeId).name : column.label,
    minWidth: column.minWidth,
    flex: column.flex ?? 1,
    pinned: column.pinned,
    hide: visibleCols[column.field] === false,
    headerClass: 'text-center',
    cellClass: `text-center ${column.numeric ? 'tabular-nums' : ''}`,
    valueFormatter: column.format ? (p) => column.format(p.value) : undefined,
    cellRenderer: textCell(`${weight} text-[12px]`),
  };
}

/** Direct / Transhipment → category → direction → flag header groups. */
function groupDimensionColumns(dimensionDefs) {
  const byKey = new Map(dimensionDefs.map((d) => [d.field, d]));
  const categoryGroup = (category) => ({
    headerName: category.name,
    marryChildren: true,
    children: TRAFFIC_DIRECTIONS.map((direction) => ({
      headerName: direction.name,
      marryChildren: true,
      children: TRAFFIC_FLAG_TYPES.map((flag) => byKey.get(`c${category.id}_d${direction.id}_f${flag.id}`)),
    })),
  });
  return [
    { headerName: 'Direct', marryChildren: true, children: TRAFFIC_CATEGORIES.filter((c) => !c.transhipment).map(categoryGroup) },
    { headerName: 'Transhipment', marryChildren: true, children: TRAFFIC_CATEGORIES.filter((c) => c.transhipment).map(categoryGroup) },
  ];
}

export default function TrafficDataList({
  organisations = [],
  commodityGroups = [],
  commodities = [],
  isMinistryView,
  canEdit,
  canDelete,
  onEdit,
  triggerNotification,
}) {
  const list = useTrafficStore((state) => state.actuals);
  const actions = useTrafficStore((state) => state.actualsActions);
  const notify = useNotifier(triggerNotification);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    activeView, searchTerm, debouncedSearch, fiscalYear, month, organisationId,
    commodityGroupId, commodityId, showFilterPanel, currentPage, pageSize, visibleCols,
  } = list;
  const isCommodityView = activeView === 'commodity';

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  const params = useMemo(() => {
    const query = { view: activeView, page: currentPage, limit: pageSize };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (month) query.month = month;
    if (isMinistryView && organisationId) query.organisationId = organisationId;
    if (isCommodityView && commodityGroupId) query.commodityGroupId = commodityGroupId;
    if (isCommodityView && commodityId) query.commodityId = commodityId;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [activeView, currentPage, pageSize, fiscalYear, month, isMinistryView, organisationId,
    isCommodityView, commodityGroupId, commodityId, debouncedSearch]);

  const handleLoadError = useCallback(
    () => notify(COMMON_TOASTS.loadFailed('Traffic data')),
    [notify]
  );
  const { rows, total, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'actuals',
    params,
    request: fetchTrafficActuals,
    onError: handleLoadError,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  // After a delete empties the last page, step back to the new last page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  const columns = useMemo(() => buildColumns(activeView, isMinistryView), [activeView, isMinistryView]);

  const rowsWithSerial = useMemo(
    () => rows.map((row, index) => ({ ...row, sNo: (currentPage - 1) * pageSize + index + 1 })),
    [rows, currentPage, pageSize]
  );

  const showActions = !isCommodityView && (canEdit || canDelete);

  const columnDefs = useMemo(() => {
    const defs = columns.map((c) => toColDef(c, visibleCols));
    const dimensionDefs = defs.filter((d) => /^c\d_d\d_f\d$/.test(d.field));
    const plainDefs = defs.filter((d) => !/^c\d_d\d_f\d$/.test(d.field));
    const totalDef = plainDefs.filter((d) => d.field === 'row_total');
    const leadDefs = plainDefs.filter((d) => d.field !== 'row_total');

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
      headerName: 'Action',
      width: 110,
      pinned: 'right',
      sortable: false,
      headerClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params) => {
        const row = params.data;
        if (!row) return null;
        const period = describePeriod(row.fiscal_year, row.month);
        return (
          <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(row)}
                title={`Update traffic for ${period.monthLabel} ${period.fiscalYear}`}
                aria-label={`Update traffic for ${period.monthLabel} ${period.fiscalYear}`}
                className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setPendingDelete(row)}
                title={`Delete traffic for ${period.monthLabel} ${period.fiscalYear}`}
                aria-label={`Delete traffic for ${period.monthLabel} ${period.fiscalYear}`}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    }] : [];

    return [
      serial,
      ...leadDefs,
      ...(dimensionDefs.length ? groupDimensionColumns(dimensionDefs) : []),
      ...totalDef,
      ...actionCol,
    ];
  }, [columns, visibleCols, showActions, canEdit, canDelete, onEdit]);

  const visibility = useMemo(() => ({
    columns: columns.map((c) => ({ key: c.field, label: c.label })),
    visibleCols,
    onToggle: (key) => actions.setVisibleCols((prev) => ({ ...prev, [key]: prev[key] === false })),
    onShowAll: () => actions.setVisibleCols({}),
  }), [columns, visibleCols, actions]);

  const organisationOptions = useMemo(
    () => organisations.map((o) => ({ value: String(o.organisation_id), label: o.organisation_name })),
    [organisations]
  );
  const groupOptions = useMemo(
    () => commodityGroups.map((g) => ({ value: String(g.commodity_group_id), label: g.commodity_group_name })),
    [commodityGroups]
  );
  const commodityOptions = useMemo(
    () => commodities
      .filter((c) => String(c.commodity_group_id) === String(commodityGroupId))
      .map((c) => ({ value: String(c.commodity_id), label: c.commodity_name })),
    [commodities, commodityGroupId]
  );

  // The current financial year is the default, so only a different choice counts as a filter
  const defaultFiscalYear = currentFinancialYear();
  const activeFiltersCount =
    (fiscalYear !== defaultFiscalYear ? 1 : 0) +
    (month ? 1 : 0) +
    (isMinistryView && organisationId ? 1 : 0) +
    (isCommodityView && commodityGroupId ? 1 : 0) +
    (isCommodityView && commodityId ? 1 : 0);

  const handleResetFilters = () => {
    actions.resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const visibleExportColumns = useMemo(
    () => [{ field: 'sNo', label: 'S.No' }, ...columns.filter((c) => visibleCols[c.field] !== false)],
    [columns, visibleCols]
  );
  const exportBaseName = `Traffic_${VIEW_LABELS[activeView].replace(/[^A-Za-z]+/g, '_')}_Page_${currentPage}`;

  const handleCopy = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('copy'));
    return copyRowsToClipboard(visibleExportColumns, rowsWithSerial)
      .then(() => notify(COMMON_TOASTS.copySuccess(rowsWithSerial.length)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const handleExcel = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    const fileName = downloadExcel(visibleExportColumns, rowsWithSerial, exportBaseName, VIEW_LABELS[activeView]);
    return notify(COMMON_TOASTS.excelExported(fileName));
  };

  const handlePdf = () => {
    if (busy) return notify(COMMON_TOASTS.tableNotReady('export'));
    return downloadPdf(
      `Traffic - ${VIEW_LABELS[activeView]}`,
      visibleExportColumns.filter((c) => c.field !== 'sNo'),
      rowsWithSerial,
      exportBaseName
    );
  };

  const confirmDelete = async () => {
    const period = describePeriod(pendingDelete.fiscal_year, pendingDelete.month);
    setDeleting(true);
    try {
      await deleteTrafficPeriod({ fiscalYear: pendingDelete.fiscal_year, month: pendingDelete.month });
      notify(TRAFFIC_TOASTS.periodDeleted(period));
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(TRAFFIC_TOASTS.periodDeleteFailed(period, getErrorMessage(err)));
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
      <div className="module-subtabs-strip" role="tablist" aria-label="Traffic data views">
        {DATA_LIST_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={activeView === view.id}
            onClick={() => actions.setActiveView(view.id)}
            className={`module-subtab-btn ${activeView === view.id ? 'active' : ''}`}
          >
            {view.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="module-card space-y-4">
        <ListToolbar
          showFilterPanel={showFilterPanel}
          onToggleFilters={() => actions.setShowFilterPanel((prev) => !prev)}
          activeFiltersCount={activeFiltersCount}
          onResetFilters={handleResetFilters}
          searchTerm={searchTerm}
          onSearchChange={actions.setSearchTerm}
          searchPlaceholder={isCommodityView ? 'Search organisation or commodity...' : 'Search organisation, year or month...'}
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
          <div className={`p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in ${isCommodityView ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
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
            {isCommodityView && (
              <>
                <FilterSelect
                  label="Commodity Group"
                  value={commodityGroupId}
                  onChange={(value) => actions.setFilters({ commodityGroupId: value, commodityId: '' })}
                  options={groupOptions}
                  allLabel="All Groups"
                />
                <FilterSelect
                  label="Commodity"
                  value={commodityId}
                  onChange={(value) => actions.setFilters({ commodityId: value })}
                  options={commodityOptions}
                  allLabel={commodityGroupId ? 'All Commodities' : 'Select Group First'}
                  disabled={!commodityGroupId}
                />
              </>
            )}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span>
            Showing {VIEW_LABELS[activeView]} for {scopeCaption}.
            {isCommodityView ? ' Values are in \'000 tonnes, except Container (In 000 TEUs).' : ''}
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
        title="Delete Traffic Data"
        message={pendingDelete
          ? `All commodity and Ro-Ro / Ro-Pax values for ${monthLabel(pendingDelete.month)} ${pendingDelete.fiscal_year} will be deleted. This cannot be undone.`
          : ''}
      />
    </div>
  );
}
