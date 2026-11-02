import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { useShallow } from 'zustand/react/shallow';

import { useCapexStore } from './store/useCapexStore';
import CapexDataListView from './components/CapexDataListView';
// import CapexKpiCards from './components/CapexKpiCards';
import CapexActualExpenditurePage from './components/CapexActualExpenditurePage';
import CapexDashboard from './pages/Dashboard';
import CapexReports from './pages/Reports';
import CapexInputForm from './pages/InputForm';
import CapexUpdateForm from './pages/UpdateForm';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCapexPermissions } from './hooks/useCapexPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import { COMMON_TOASTS, useNotifier } from '../../utils/notify';
import { exportDataListToCsv } from '../../utils/exportDataListCsv';
import { exportDataListToPdf } from '../../utils/exportReportPdf';
import {
  fetchCapexList,
  createCapexTarget,
  updateCapexTarget,
} from './api';
import { calculateCapexExpenditurePercentage } from './utils/capexUtils';
import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../utils/tableCellWrap';

ModuleRegistry.registerModules([AllCommunityModule]);

const CAPEX_BASE = '/finance/capex';
const INIT_TAB_KEY = 'capexInitTab';

// Data List columns for Copy / Excel / PDF. key = the grid column's visibility key
// (its field, or its header when it has no field).
const LIST_EXPORT_COLUMNS = [
  { key: 'organisation_name', label: 'Organisation', value: (r) => r.organisation_name || '—' },
  { key: 'capex_financial_year', label: 'Financial Year', value: (r) => r.capex_financial_year || '—' },
  {
    key: 'capex_total_value',
    label: 'Total Planned Expenditure (In Crore)',
    value: (r) => Number(r.capex_total_value || 0).toFixed(2),
  },
  {
    key: 'total_capex_expenditure',
    label: 'Actual Expenditure (In Crore)',
    value: (r) => Number(r.total_capex_expenditure || 0).toFixed(2),
  },
  {
    key: '% Expenditure Of BE',
    label: '% Expenditure Of BE',
    value: (r) => calculateCapexExpenditurePercentage(r.total_capex_expenditure, r.capex_total_value),
  },
  {
    key: 'updated_date',
    label: 'Last Updated Date',
    value: (r) => (r.updated_date ? String(r.updated_date).slice(0, 10) : '—'),
  },
];

function resolvePathSegment(label, showInputForm) {
  const key = String(label || '').toLowerCase().trim();
  if (key.includes('input form') || key === 'add' || key.includes('input-form')) {
    return showInputForm ? 'input-form' : 'data-list';
  }
  if (key.includes('report')) return 'reports';
  if (key.includes('estimate')) return 'data-list';
  if (key.includes('dashboard')) return 'dashboard';
  if (key.includes('datalist') || key.includes('data list') || key.includes('data-list')) {
    return 'data-list';
  }
  return 'data-list';
}

function getTabKeyFromPath(pathname = '') {
  const path = pathname.toLowerCase();
  if (path.includes('/input-form')) return 'input-form';
  if (path.includes('/reports') || path.includes('/report')) return 'reports';
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/data-list') || path.includes('/estimate-values')) {
    return 'data-list';
  }
  return 'data-list';
}

export default function CapexView({ activeSubTab: activeSubTabProp, onGoHome, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useCapexPermissions();
  const viewMode = permissions.viewMode;
  const showInputForm = Boolean(permissions.canAdd && viewMode !== 'org');
  const activeTab = getTabKeyFromPath(location.pathname);

  // The record being updated travels with the input-form route entry, so it is gone as soon
  // as the form is opened any other way (tab, sidebar, new session):
  //  - state.target: a ministry user updating the planned target
  //  - state.item:   the monthly actual expenditure of a record
  const editTarget = location.state?.target ?? null;
  const actualsRecord = location.state?.item ?? null;
  const canUpdateTarget = Boolean(permissions.canEdit && viewMode === 'ministry');

  const [selectedOrgId, setSelectedOrgId] = useState(
    permissions.organisationId ? String(permissions.organisationId) : ''
  );
  const [capexData, setCapexData] = useState([]);
  const [loading, setLoading] = useState(false);
  // Search, filters and paging live in the module store so they survive leaving the module
  const {
    organisations,
    loadOrganisations,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    setDebouncedSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filterYear,
    setFilterYear,
    filterOrg,
    setFilterOrg,
    visibleCols,
  } = useCapexStore(useShallow((state) => ({
    organisations: state.organisations,
    loadOrganisations: state.loadOrganisations,
    searchTerm: state.searchTerm,
    setSearchTerm: state.setSearchTerm,
    debouncedSearch: state.debouncedSearch,
    setDebouncedSearch: state.setDebouncedSearch,
    page: state.page,
    setPage: state.setPage,
    pageSize: state.pageSize,
    setPageSize: state.setPageSize,
    filterYear: state.filterYear,
    setFilterYear: state.setFilterYear,
    filterOrg: state.filterOrg,
    setFilterOrg: state.setFilterOrg,
    visibleCols: state.visibleCols,
  })));
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const goToCapexTab = useCallback(
    (segment) => {
      navigate(`${CAPEX_BASE}/${segment}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (permissions.organisationId) {
      setSelectedOrgId(String(permissions.organisationId));
    }
  }, [permissions.organisationId]);

  useEffect(() => {
    const apply = (label) => goToCapexTab(resolvePathSegment(label, showInputForm));
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }
    const onMenu = (e) => apply(e.detail);
    window.addEventListener('capex-subtab', onMenu);
    return () => window.removeEventListener('capex-subtab', onMenu);
  }, [showInputForm, goToCapexTab]);

  useEffect(() => {
    if (!activeSubTabProp) return;
    goToCapexTab(resolvePathSegment(activeSubTabProp, showInputForm));
  }, [activeSubTabProp, showInputForm, goToCapexTab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setDebouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterYear, filterOrg, pageSize, viewMode, selectedOrgId, setPage]);

  // Search and filters as sent to /capex (without paging)
  const listFilterParams = useMemo(() => {
    const params = {
      financialYear: filterYear || undefined,
      search: debouncedSearch.trim() || undefined,
    };
    if (viewMode === 'org' && selectedOrgId) {
      params.organisationId = selectedOrgId;
    } else if (filterOrg) {
      params.organisationId = filterOrg;
    }
    return params;
  }, [filterYear, debouncedSearch, viewMode, selectedOrgId, filterOrg]);

  const fetchCapexData = useCallback(
    async (signal) => {
      if (!permissions.canView) return;
      setLoading(true);
      try {
        const params = { ...listFilterParams, page, limit: pageSize };

        const res = await fetchCapexList(params, { signal });
        const payload = res.data || {};
        const rows = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        setCapexData(rows);
        setPagination({
          total: Number(payload.pagination?.total) || rows.length,
          page: Number(payload.pagination?.page) || page,
          limit: Number(payload.pagination?.limit) || pageSize,
          totalPages:
            Number(payload.pagination?.totalPages) ||
            (rows.length ? 1 : 0),
        });
      } catch (err) {
        if (err?.code === 'ERR_CANCELED') return;
        console.error('Fetch Capex data error:', err);
        notify(COMMON_TOASTS.loadFailed('Capex data'));
        setCapexData([]);
        setPagination({ total: 0, page: 1, limit: pageSize, totalPages: 0 });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      permissions.canView,
      notify,
      page,
      pageSize,
      listFilterParams,
    ]
  );

  useEffect(() => {
    if (!permissions.canView) return;
    loadOrganisations();
  }, [permissions.canView, loadOrganisations]);

  useEffect(() => {
    if (!permissions.canView) return;
    const controller = new AbortController();
    fetchCapexData(controller.signal);
    return () => controller.abort();
  }, [permissions.canView, fetchCapexData]);

  // The forms show the success / failure toast; an API error is passed on to them
  const handleAddSubmit = (payload) =>
    createCapexTarget({ userID: getCurrentUserId(), ...payload });

  const handleEditSubmit = (payload) =>
    updateCapexTarget({
      ID: payload.ID,
      gbsValue: payload.gbsValue,
      iebrValue: payload.iebrValue,
      pppValue: payload.pppValue,
      totalValue: payload.totalValue,
      userID: getCurrentUserId(),
    });

  const openActualsPage = useCallback(
    (row) => navigate(`${CAPEX_BASE}/input-form`, { state: { item: row } }),
    [navigate]
  );

  const openUpdatePage = useCallback(
    (row) => {
      if (viewMode === 'ministry') {
        navigate(`${CAPEX_BASE}/input-form`, { state: { target: row } });
      } else {
        openActualsPage(row);
      }
    },
    [viewMode, navigate, openActualsPage]
  );

  const backToList = useCallback(() => goToCapexTab('data-list'), [goToCapexTab]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSaved = useCallback(() => {
    navigate(`${CAPEX_BASE}/data-list`, { replace: true });
    fetchCapexData();
  }, [navigate, fetchCapexData]);

  const colDefs = useMemo(() => {
    const allDefs = [
      {
        headerName: 'Sl.No',
        valueGetter: (params) =>
          params.node
            ? (page - 1) * pageSize + params.node.rowIndex + 1
            : 1,
        flex: 0.6,
        minWidth: 70,
        pinned: 'left',
        cellClass:
          'font-bold text-slate-500 text-center flex items-center justify-center',
      },
      {
        field: 'organisation_name',
        headerName: 'Organisation',
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps('font-bold text-slate-800 text-left'),
        valueGetter: (params) => {
          if (!params.data) return '—';
          if (params.data.organisation_name) return params.data.organisation_name;
          const orgId = params.data.capex_organisation_id;
          const foundOrg = organisations.find(
            (o) => String(o.organisation_id || o.id) === String(orgId)
          );
          return foundOrg ? foundOrg.organisation_name || foundOrg.name : '—';
        },
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-bold text-slate-800 text-left', '—'),
      },
      {
        field: 'capex_financial_year',
        headerName: 'Financial Year',
        flex: 1.2,
        minWidth: 130,
        ...getWrapColumnProps('font-semibold text-slate-700 text-center'),
        valueFormatter: (params) =>
          params.value ? String(params.value).replace(/,/g, '') : '—',
        cellRenderer: (params) =>
          renderWrappedText(
            params.valueFormatted ?? params.value,
            'font-semibold text-slate-700 text-center',
            '—'
          ),
      },
      {
        field: 'capex_total_value',
        headerName: 'Total Planned Expenditure (In Crore)',
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps('font-black text-[#0f417a] text-center'),
        valueFormatter: (params) =>
          params.value !== undefined && params.value !== null
            ? Number(params.value).toFixed(2)
            : '0.00',
        cellRenderer: (params) =>
          renderWrappedText(
            params.valueFormatted ?? params.value,
            'font-black text-[#0f417a] text-center',
            '0.00'
          ),
      },
      {
        field: 'total_capex_expenditure',
        headerName: 'Actual Expenditure (In Crore)',
        flex: 2,
        minWidth: 200,
        ...getWrapColumnProps(
          'font-black text-blue-700 text-center cursor-pointer hover:underline'
        ),
        cellRenderer: (params) => (
          <div
            onClick={() => openActualsPage(params.data)}
            className="w-full max-w-full text-blue-700 font-black underline cursor-pointer whitespace-normal break-words leading-snug py-0.5 text-center"
            title="Click to view/edit monthly expenditure page"
          >
            {params.value !== undefined && params.value !== null
              ? Number(params.value).toFixed(2)
              : '0.00'}
          </div>
        ),
      },
      {
        headerName: '% Expenditure Of BE',
        flex: 1.5,
        minWidth: 160,
        ...getWrapColumnProps('font-bold text-slate-800 text-center'),
        valueGetter: (params) => {
          if (!params.data) return '0.00';
          return calculateCapexExpenditurePercentage(
            params.data.total_capex_expenditure,
            params.data.capex_total_value
          );
        },
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-bold text-slate-800 text-center', '0.00'),
      },
      {
        field: 'updated_date',
        headerName: 'Last Updated Date',
        flex: 1.5,
        minWidth: 150,
        ...getWrapColumnProps('text-slate-600 font-semibold text-center'),
        valueGetter: (params) =>
          params.data.updated_date ? String(params.data.updated_date).slice(0, 10) : '—',
        cellRenderer: (params) =>
          renderWrappedText(
            params.value,
            'text-slate-600 font-semibold text-center font-mono text-xs',
            '—'
          ),
      },
    ];

    if (permissions.canEdit) {
      allDefs.push({
        headerName: viewMode === 'ministry' ? 'Update Target' : 'Update Actuals',
        flex: 1,
        minWidth: 110,
        maxWidth: 150,
        pinned: 'right',
        lockPinned: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center justify-center gap-1 w-full h-full py-1">
              <button
                type="button"
                onClick={() => openUpdatePage(row)}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                title={viewMode === 'ministry' ? 'Update Planned Expense' : 'Edit Expenditure'}
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          );
        },
      });
    }

    if (viewMode === 'org') {
      return allDefs.filter((col) => col.field !== 'organisation_name');
    }
    return allDefs;
  }, [viewMode, organisations, permissions.canEdit, page, pageSize, openUpdatePage, openActualsPage]);

  // The columns shown in the grid (org users have no Organisation column)
  const exportColumns = useMemo(
    () =>
      LIST_EXPORT_COLUMNS.filter(
        (c) =>
          visibleCols[c.key] !== false && !(viewMode === 'org' && c.key === 'organisation_name')
      ),
    [visibleCols, viewMode]
  );

  // Every row that matches the current search and filters, not just the page on show
  const fetchAllFilteredRows = async () => {
    const res = await fetchCapexList({ ...listFilterParams, page: 1, limit: 2000, all: true });
    const payload = res.data || {};
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return rows.map((r) => Object.fromEntries(exportColumns.map((c) => [c.key, c.value(r)])));
  };

  const exportArgs = (rows) => ({
    columnLabels: Object.fromEntries(exportColumns.map((c) => [c.key, c.label])),
    visibleCols: Object.fromEntries(exportColumns.map((c) => [c.key, true])),
    rowData: rows,
  });

  const handleCopyData = () => {
    if (!capexData?.length) {
      notify(COMMON_TOASTS.nothingToCopy());
      return;
    }
    const text = [
      ['S.No', ...exportColumns.map((c) => c.label)].join('\t'),
      ...capexData.map((r, i) =>
        [(page - 1) * pageSize + i + 1, ...exportColumns.map((c) => c.value(r))].join('\t')
      ),
    ].join('\n');
    navigator.clipboard.writeText(text).then(
      () => notify(COMMON_TOASTS.copySuccess(capexData.length)),
      () => notify(COMMON_TOASTS.copyFailed()),
    );
  };

  const handleExportExcel = async () => {
    if (!capexData?.length) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    try {
      const rows = await fetchAllFilteredRows();
      exportDataListToCsv({ ...exportArgs(rows), fileName: 'Capex_Data_List' });
      notify(COMMON_TOASTS.excelExported('Capex_Data_List.csv', 'Every filtered row'));
    } catch (err) {
      console.error('Capex export failed:', err?.message);
      notify(COMMON_TOASTS.loadFailed('The Capex rows to export'));
    }
  };

  const handleExportPdf = async () => {
    if (!capexData?.length) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    try {
      const rows = await fetchAllFilteredRows();
      exportDataListToPdf({ ...exportArgs(rows), title: 'Capex Data List', fileName: 'Capex_Data_List' });
      notify(COMMON_TOASTS.downloadStarted('Capex_Data_List.pdf'));
    } catch (err) {
      console.error('Capex export failed:', err?.message);
      notify(COMMON_TOASTS.loadFailed('The Capex rows to export'));
    }
  };

  const tabs = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard' }];
    if (showInputForm) {
      items.push({ id: 'input-form', label: 'Input Form' });
    }
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Report' }
    );
    return items;
  }, [showInputForm]);

  const dataListPanel = (
    <>
      {/* KPI cards commented out for now
      <CapexKpiCards data={capexData} />
      */}
      <div className="module-card space-y-4">
        <CapexDataListView
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          page={page}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          pagination={pagination}
          rowData={capexData}
          colDefs={colDefs}
          loading={loading}
          handleCopyData={handleCopyData}
          handleExportExcel={handleExportExcel}
          handleExportPdf={handleExportPdf}
          organisations={organisations}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          filterOrg={filterOrg}
          setFilterOrg={setFilterOrg}
          viewMode={viewMode}
          notify={notify}
        />
      </div>
    </>
  );

  // input-form shows the target update (state.target), the monthly actuals (state.item)
  // or a new target; anything the user may not open goes back to the Data List
  let inputFormPanel = <Navigate to={`${CAPEX_BASE}/data-list`} replace />;
  if (editTarget) {
    if (canUpdateTarget) {
      inputFormPanel = (
        <CapexUpdateForm
          key={editTarget.capex_id}
          record={editTarget}
          onSubmit={handleEditSubmit}
          onBack={backToList}
          onSuccess={handleSaved}
          notify={notify}
        />
      );
    }
  } else if (actualsRecord) {
    inputFormPanel = (
      <CapexActualExpenditurePage
        key={actualsRecord.capex_id}
        capexRecord={actualsRecord}
        onBack={backToList}
        notify={notify}
        onRefresh={fetchCapexData}
        canEdit={permissions.canEdit}
      />
    );
  } else if (showInputForm) {
    inputFormPanel = (
      <CapexInputForm
        organisations={organisations}
        onSubmit={handleAddSubmit}
        onBack={backToList}
        onSuccess={handleSaved}
        notify={notify}
      />
    );
  }

  if (!permissions.canView) {
    return <RestrictedAccess moduleName="Capex" onGoHome={onGoHome} />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Capex Management</h1>
          <p className="module-header-subtitle">
            Monitor Capital Expenditure allocations (GBS, Internal Resources, PPP) and track
            monthly target realizations across major port authorities.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          // Updating a record stays under the Data List tab, as before
          currentTab={editTarget || actualsRecord ? 'data-list' : activeTab}
          onTabChange={(tabId) => goToCapexTab(tabId)}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="dashboard" element={<CapexDashboard orgScoped={viewMode === 'org'} />} />
          <Route path="data-list" element={dataListPanel} />
          <Route path="estimate-values" element={<Navigate to={`${CAPEX_BASE}/data-list`} replace />} />
          <Route path="input-form" element={inputFormPanel} />
          <Route path="reports" element={<CapexReports viewMode={viewMode} notify={notify} />} />
          {/* Absolute paths: a relative one under "*" keeps appending to an unknown path */}
          <Route index element={<Navigate to={`${CAPEX_BASE}/data-list`} replace />} />
          <Route path="*" element={<Navigate to={`${CAPEX_BASE}/data-list`} replace />} />
        </Routes>
      </div>
    </div>
  );
}
