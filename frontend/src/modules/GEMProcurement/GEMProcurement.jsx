import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Calendar, Edit } from 'lucide-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { useShallow } from 'zustand/react/shallow';

import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import GEMDataListView from './components/GEMDataListView';
import GEMInputForm from './pages/InputForm';
import GEMUpdateForm from './pages/UpdateForm';
import GEMMonthlyDataPage from './pages/MonthlyDataPage';
import GEMReports from './pages/Reports';
import { useGemPermissions } from './hooks/useGemPermissions';
import {
  fetchGemList,
  createGemTarget,
  updateGemTarget,
} from './api';
import { useGemStore } from './store/useGemStore';
import { GEM_TOASTS } from './toastMessages';
import { COMMON_TOASTS, useNotifier } from '../../utils/notify';
import {
  getGemRecordId,
  getGemFinancialYear,
  getGemOrganisationId,
  getGemPotential,
  getElapsedFinancialMonths,
  proportionalTarget,
  GEM_CATEGORY_TABS,
} from './utils/gemUtils';
import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../utils/tableCellWrap';

ModuleRegistry.registerModules([AllCommunityModule]);

const GEM_BASE = '/governance/gem-procurements';
const INIT_TAB_KEY = 'gemInitTab';
// Category tabs that have targets to add / update (Total is a read-only roll-up)
const TARGET_CATEGORIES = ['goods', 'services', 'works'];

function resolvePathSegment(label) {
  const key = String(label || '').toLowerCase().trim();
  if (key.includes('report')) return 'reports';
  if (key.includes('goods')) return 'goods';
  if (key.includes('service')) return 'services';
  if (key.includes('work')) return 'works';
  if (key.includes('total') || key.includes('datalist') || key.includes('data list')) {
    return 'total';
  }
  return 'total';
}

function getTabKeyFromPath(pathname = '') {
  const path = pathname.toLowerCase();
  if (path.includes('/reports') || path.endsWith('/report')) return 'report';
  if (path.includes('/goods')) return 'goods';
  if (path.includes('/services')) return 'services';
  if (path.includes('/works')) return 'works';
  if (path.includes('/total')) return 'total';
  return 'total';
}

function pathSegmentForTab(tabId) {
  return tabId === 'report' ? 'reports' : tabId;
}

function listCategoryForTab(tab) {
  if (tab === 'services') return 'services';
  if (tab === 'works') return 'works';
  if (tab === 'goods') return 'goods';
  return 'total';
}

export default function GEMProcurementView({
  activeSubTab: activeSubTabProp,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useGemPermissions();
  const viewMode = permissions.viewMode;
  const canManageTargets = Boolean(
    !permissions.isViewOnlyAdmin && viewMode !== 'org'
  );
  const canUpdateMonthly = Boolean(
    permissions.canEdit && !permissions.isViewOnlyAdmin
  );

  const elapsedMonths = getElapsedFinancialMonths();
  const activeTab = getTabKeyFromPath(location.pathname);

  // The record being updated travels with the <category>/input-form route entry, so it is
  // gone as soon as the form is opened any other way (tab, sidebar, new session):
  //  - state.target: a ministry user updating the planned procurement
  //  - state.item:   the monthly procurement data of a record
  //  - neither:      a new planned procurement
  const editTarget = location.state?.target ?? null;
  const monthlyRecord = location.state?.item ?? null;

  const [selectedOrgId, setSelectedOrgId] = useState(
    permissions.organisationId ? String(permissions.organisationId) : ''
  );
  const [rows, setRows] = useState([]);
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
  } = useGemStore(useShallow((state) => ({
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
  })));
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const goToGemTab = useCallback(
    (segment) => {
      navigate(`${GEM_BASE}/${segment}`);
    },
    [navigate]
  );

  const canAddForTab = Boolean(
    canManageTargets && permissions.canAdd && activeTab !== 'total'
  );
  const canUpdateTarget = Boolean(
    canManageTargets && permissions.canEdit && activeTab !== 'total'
  );

  useEffect(() => {
    if (permissions.organisationId) {
      setSelectedOrgId(String(permissions.organisationId));
    }
  }, [permissions.organisationId]);

  useEffect(() => {
    const apply = (label) => goToGemTab(resolvePathSegment(label));
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }
    const onMenu = (e) => apply(e.detail);
    window.addEventListener('gem-subtab', onMenu);
    return () => window.removeEventListener('gem-subtab', onMenu);
  }, [goToGemTab]);

  useEffect(() => {
    if (!activeSubTabProp) return;
    goToGemTab(resolvePathSegment(activeSubTabProp));
  }, [activeSubTabProp, goToGemTab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setDebouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterYear, filterOrg, pageSize, viewMode, selectedOrgId, activeTab, setPage]);

  useEffect(() => {
    let cancelled = false;
    loadOrganisations().then((ok) => {
      if (!ok && !cancelled) notify(COMMON_TOASTS.loadFailed('The organisation list'));
    });
    return () => {
      cancelled = true;
    };
  }, [loadOrganisations, notify]);

  const fetchList = useCallback(
    async (signal) => {
      if (!permissions.canView || activeTab === 'report') return;
      setLoading(true);
      try {
        const category = listCategoryForTab(activeTab);
        const params = {
          page,
          limit: pageSize,
          financialYear: filterYear || undefined,
          search: debouncedSearch.trim() || undefined,
        };
        if (viewMode === 'org' && selectedOrgId) {
          params.organisationId = selectedOrgId;
        } else if (filterOrg) {
          params.organisationId = filterOrg;
        }

        const res = await fetchGemList(category, params, { signal });
        const payload = res.data || {};
        const data = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setRows(data);
        setPagination(
          payload.pagination || {
            total: data.length,
            page,
            limit: pageSize,
            totalPages: 1,
          }
        );
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch GEM list:', err);
        notify(COMMON_TOASTS.loadFailed('GEM procurement data'));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [
      permissions.canView,
      activeTab,
      page,
      pageSize,
      filterYear,
      debouncedSearch,
      viewMode,
      selectedOrgId,
      filterOrg,
      notify,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

  const openAddPage = useCallback(() => {
    navigate(`${GEM_BASE}/${activeTab}/input-form`);
  }, [navigate, activeTab]);

  const openTargetPage = useCallback((record) => {
    navigate(`${GEM_BASE}/${activeTab}/input-form`, { state: { target: record } });
  }, [navigate, activeTab]);

  const openMonthlyPage = useCallback((record) => {
    navigate(`${GEM_BASE}/${activeTab}/input-form`, { state: { item: record } });
  }, [navigate, activeTab]);

  const closeUpdatePage = useCallback(() => {
    goToGemTab(activeTab);
  }, [goToGemTab, activeTab]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSaved = useCallback(() => {
    navigate(`${GEM_BASE}/${activeTab}`, { replace: true });
    fetchList();
  }, [navigate, activeTab, fetchList]);

  const handleTabChange = useCallback(
    (tabId) => goToGemTab(pathSegmentForTab(tabId)),
    [goToGemTab]
  );

  const categoryTitle =
    activeTab === 'total'
      ? 'Total'
      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const visibleTabs = useMemo(
    () =>
      GEM_CATEGORY_TABS.map((t) => ({
        id: t.id,
        label: t.label,
        icon: t.id === 'report' ? Calendar : undefined,
      })),
    []
  );

  const colDefs = useMemo(() => {
    const canUpdate = canUpdateMonthly;
    const allDefs = [
      {
        headerName: 'Sl.No',
        valueGetter: (params) => {
          const base = (page - 1) * pageSize;
          return params.node ? base + params.node.rowIndex + 1 : base + 1;
        },
        flex: 0.6,
        minWidth: 70,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
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
          const orgId = getGemOrganisationId(params.data);
          const found = organisations.find(
            (o) => String(o.organisation_id || o.id) === String(orgId)
          );
          return found ? found.organisation_name || found.name : '—';
        },
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-bold text-slate-800 text-left', '—'),
      },
      {
        headerName: 'Financial Year',
        flex: 1.2,
        minWidth: 130,
        ...getWrapColumnProps('font-semibold text-slate-700 text-center'),
        valueGetter: (params) => getGemFinancialYear(params.data) || '—',
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-semibold text-slate-700 text-center', '—'),
      },
      {
        headerName: 'Planned Total Procurement (In Crore)',
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps('font-black text-[#0f417a] text-center'),
        valueGetter: (params) =>
          Number(getGemPotential(params.data, listCategoryForTab(activeTab))).toFixed(2),
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-black text-[#0f417a] text-center', '0.00'),
      },
      {
        headerName: `${elapsedMonths} Months Proportional Target (In Crore)`,
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps('font-semibold text-slate-700 text-center'),
        valueGetter: (params) =>
          proportionalTarget(
            getGemPotential(params.data, listCategoryForTab(activeTab)),
            elapsedMonths
          ).toFixed(2),
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-semibold text-slate-700 text-center', '0.00'),
      },
      {
        headerName: 'Procurement Through GEM (In Crore)',
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps(
          activeTab === 'total'
            ? 'font-bold text-slate-800 text-center'
            : 'font-black text-blue-700 text-center cursor-pointer hover:underline'
        ),
        valueGetter: (params) =>
          Number(params.data?.total_procurement_through_gem || 0).toFixed(2),
        cellRenderer: (params) => {
          if (!params.data) return null;
          if (activeTab === 'total') {
            return renderWrappedText(params.value, 'font-bold text-slate-800 text-center', '0.00');
          }
          return (
            <div
              onClick={() => openMonthlyPage(params.data)}
              className="w-full max-w-full text-blue-700 font-black underline cursor-pointer whitespace-normal break-words leading-snug py-0.5 text-center"
              title="Click to view/edit monthly procurement data"
            >
              {params.value}
            </div>
          );
        },
      },
      {
        headerName: 'Procurement Outside GEM (In Crore)',
        flex: 2,
        minWidth: 220,
        ...getWrapColumnProps('font-bold text-slate-800 text-center'),
        valueGetter: (params) =>
          Number(params.data?.total_procurement_outside_gem || 0).toFixed(2),
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'font-bold text-slate-800 text-center', '0.00'),
      },
    ];

    if (activeTab !== 'total') {
      allDefs.push({
        headerName: 'Last Updated Date',
        flex: 1.4,
        minWidth: 150,
        ...getWrapColumnProps('text-slate-600 font-semibold text-center'),
        valueGetter: (params) => {
          const raw = params.data?.updated_date;
          if (!raw) return '—';
          const d = new Date(raw);
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
        },
        cellRenderer: (params) =>
          renderWrappedText(
            params.value,
            'text-slate-600 font-semibold text-center font-mono text-xs',
            '—'
          ),
      });
    }

    if (canUpdate && activeTab !== 'total') {
      allDefs.push({
        headerName: viewMode === 'org' ? 'Update Actuals' : 'Update Target',
        flex: 1.15,
        minWidth: 145,
        maxWidth: 155,
        pinned: 'right',
        lockPinned: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const isMinistry = viewMode !== 'org';
          return (
            <div className="flex items-center justify-center gap-1 w-full h-full py-1">
              <button
                type="button"
                onClick={() => (isMinistry ? openTargetPage(row) : openMonthlyPage(row))}
                className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                title={isMinistry ? 'Update Planned Procurement' : 'Update Monthly Data'}
                aria-label={isMinistry ? 'Update Planned Procurement' : 'Update Monthly Data'}
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
  }, [
    organisations,
    activeTab,
    viewMode,
    elapsedMonths,
    canUpdateMonthly,
    openTargetPage,
    openMonthlyPage,
    page,
    pageSize,
  ]);

  // The forms show the success / failure toast; an API error is passed on to them
  const handleAddSubmit = async (payload) => {
    const category = listCategoryForTab(activeTab);
    if (category === 'total') return;
    await createGemTarget(category, payload);
  };

  const handleTargetUpdate = async (payload) => {
    const category = listCategoryForTab(activeTab);
    if (category === 'total') return;
    await updateGemTarget(category, payload);
  };

  const handleCopyData = () => {
    if (!rows.length) {
      notify(COMMON_TOASTS.nothingToCopy());
      return;
    }
    const text = rows
      .map((r) => {
        const category = listCategoryForTab(activeTab);
        return [
          r.organisation_name || '',
          getGemFinancialYear(r),
          getGemPotential(r, category),
          proportionalTarget(getGemPotential(r, category), elapsedMonths),
          r.total_procurement_through_gem || 0,
          r.total_procurement_outside_gem || 0,
        ].join('\t');
      })
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => notify(COMMON_TOASTS.copySuccess(rows.length)),
      () => notify(COMMON_TOASTS.copyFailed()),
    );
  };

  const handleExportExcel = () => {
    if (!rows.length) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    const category = listCategoryForTab(activeTab);
    const sheet = rows.map((r, idx) => ({
      'Sl.No': (pagination.page - 1) * pagination.limit + idx + 1,
      Organisation: r.organisation_name || '',
      'Financial Year': getGemFinancialYear(r),
      'Planned Procurement': getGemPotential(r, category),
      [`${elapsedMonths} Months Proportional Target`]: proportionalTarget(
        getGemPotential(r, category),
        elapsedMonths
      ),
      'Through GEM': r.total_procurement_through_gem || 0,
      'Outside GEM': r.total_procurement_outside_gem || 0,
    }));
    const fileName = `GEM_${categoryTitle}_${filterYear || 'all'}.xlsx`;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, categoryTitle);
    XLSX.writeFile(wb, fileName);
    notify(COMMON_TOASTS.excelExported(fileName));
  };

  if (!permissions.canView) {
    return <RestrictedAccess moduleName="GEM Procurement" />;
  }

  const listPanel = (
    <div className="module-card space-y-4">
      <GEMDataListView
        categoryTitle={categoryTitle}
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
        rowData={rows}
        colDefs={colDefs}
        loading={loading}
        showAddButton={canAddForTab}
        onOpenAddPage={openAddPage}
        handleCopyData={handleCopyData}
        handleExportExcel={handleExportExcel}
        handleExportPdf={() => notify(GEM_TOASTS.pdfComingSoon())}
        organisations={organisations}
        filterYear={filterYear}
        setFilterYear={setFilterYear}
        filterOrg={filterOrg}
        setFilterOrg={setFilterOrg}
        viewMode={viewMode}
        notify={notify}
      />
    </div>
  );

  // <category>/input-form shows the target update (state.target), the monthly data
  // (state.item) or a new target; anything the user may not open goes back to the list
  let formPanel = <Navigate to={`${GEM_BASE}/${activeTab}`} replace />;
  if (editTarget) {
    if (canUpdateTarget) {
      formPanel = (
        <GEMUpdateForm
          key={getGemRecordId(editTarget, listCategoryForTab(activeTab)) ?? 'target'}
          record={editTarget}
          category={listCategoryForTab(activeTab)}
          categoryTitle={categoryTitle}
          onSubmit={handleTargetUpdate}
          onBack={closeUpdatePage}
          onSuccess={handleSaved}
          notify={notify}
        />
      );
    }
  } else if (monthlyRecord) {
    formPanel = (
      <GEMMonthlyDataPage
        record={monthlyRecord}
        category={listCategoryForTab(activeTab)}
        categoryTitle={categoryTitle}
        canEdit={canUpdateMonthly}
        onBack={closeUpdatePage}
        onSaved={handleSaved}
        notify={notify}
      />
    );
  } else if (canAddForTab) {
    formPanel = (
      <GEMInputForm
        organisations={organisations}
        categoryTitle={categoryTitle}
        existingData={rows}
        onSubmit={handleAddSubmit}
        onBack={closeUpdatePage}
        onSuccess={handleSaved}
        notify={notify}
      />
    );
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">GEM Procurement</h1>
          <p className="module-header-subtitle">
            Track Goods, Services and Works procurement targets and monthly actuals across organisations.
          </p>
        </div>
        <InternalNavigation
          tabs={visibleTabs}
          currentTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      <Routes>
        <Route path="total" element={listPanel} />
        {TARGET_CATEGORIES.map((segment) => (
          <Route key={segment} path={segment} element={listPanel} />
        ))}
        {TARGET_CATEGORIES.map((segment) => (
          <Route key={`${segment}-form`} path={`${segment}/input-form`} element={formPanel} />
        ))}
        <Route path="reports" element={<GEMReports notify={notify} viewMode={viewMode} />} />
        <Route path="report" element={<Navigate to="../reports" replace />} />
        <Route index element={<Navigate to="total" replace />} />
        <Route path="*" element={<Navigate to="total" replace />} />
      </Routes>
    </div>
  );
}
