import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Edit } from 'lucide-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

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
  fetchOrganisationsDropdown,
} from './api';
import {
  getGemFinancialYear,
  getGemOrganisationId,
  getGemPotential,
  getElapsedFinancialMonths,
  proportionalTarget,
  GEM_CATEGORY_TABS,
} from './utils/gemUtils';

ModuleRegistry.registerModules([AllCommunityModule]);

const INIT_TAB_KEY = 'gemInitTab';

function resolveSubTabId(label) {
  const key = String(label || '').toLowerCase().trim();
  if (!key || key.includes('gem')) {
    if (key.includes('report')) return 'report';
    if (key.includes('goods')) return 'goods';
    if (key.includes('service')) return 'services';
    if (key.includes('work')) return 'works';
    if (key.includes('total') || key.includes('datalist') || key.includes('data list')) {
      return 'total';
    }
    return 'total';
  }
  if (key.includes('report')) return 'report';
  return 'total';
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
  const permissions = useGemPermissions();
  const viewMode = permissions.viewMode;
  const canManageTargets = Boolean(
    !permissions.isViewOnlyAdmin && viewMode !== 'org'
  );
  const canUpdateMonthly = Boolean(
    permissions.canEdit && !permissions.isViewOnlyAdmin
  );

  const elapsedMonths = getElapsedFinancialMonths();

  const [activeTab, setActiveTab] = useState('total');
  const [selectedOrgId, setSelectedOrgId] = useState(
    permissions.organisationId ? String(permissions.organisationId) : ''
  );
  const [rows, setRows] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [filterYear, setFilterYear] = useState('2026-2027');
  const [filterOrg, setFilterOrg] = useState('');

  const [activePage, setActivePage] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const canAddForTab = Boolean(
    canManageTargets && permissions.canAdd && activeTab !== 'total'
  );
  const canUpdateTarget = Boolean(
    canManageTargets && permissions.canEdit && activeTab !== 'total'
  );

  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#10B981');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback(
    (msg, color = '#10B981') => {
      const isError =
        color === '#EF4444' ||
        String(msg || '').includes('❌') ||
        String(msg || '').toLowerCase().includes('failed');
      if (typeof triggerNotification === 'function' && !isError) {
        triggerNotification(msg);
        return;
      }
      setToastMsg(msg);
      setToastColor(color);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    },
    [triggerNotification]
  );

  useEffect(() => {
    if (permissions.organisationId) {
      setSelectedOrgId(String(permissions.organisationId));
    }
  }, [permissions.organisationId]);

  useEffect(() => {
    const apply = (label) => setActiveTab(resolveSubTabId(label));
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }
    const onMenu = (e) => apply(e.detail);
    window.addEventListener('gem-subtab', onMenu);
    return () => window.removeEventListener('gem-subtab', onMenu);
  }, []);

  useEffect(() => {
    if (activeSubTabProp) setActiveTab(resolveSubTabId(activeSubTabProp));
  }, [activeSubTabProp]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (activePage === 'add' && !canAddForTab) setActivePage(null);
    if (activePage === 'target' && !canUpdateTarget) setActivePage(null);
    if (activePage === 'monthly' && activeTab === 'total') setActivePage(null);
  }, [activePage, canAddForTab, canUpdateTarget, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterYear, filterOrg, pageSize, viewMode, selectedOrgId, activeTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchOrganisationsDropdown();
        if (cancelled) return;
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.organisations || [];
        setOrganisations(list);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load organisations for GEM:', err);
        setOrganisations([]);
        showToast('❌ Failed to load organisation list', '#EF4444');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

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
        showToast('❌ Failed to load GEM procurement data', '#EF4444');
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
      showToast,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

  const openAddPage = useCallback(() => {
    setSelectedRecord(null);
    setActivePage('add');
  }, []);

  const openTargetPage = useCallback((record) => {
    setSelectedRecord(record);
    setActivePage('target');
  }, []);

  const openMonthlyPage = useCallback((record) => {
    setSelectedRecord(record);
    setActivePage('monthly');
  }, []);

  const closeUpdatePage = useCallback(() => {
    setActivePage(null);
    setSelectedRecord(null);
  }, []);

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
        cellClass: 'font-bold text-slate-800 text-left flex items-center',
        valueGetter: (params) => {
          if (!params.data) return '—';
          if (params.data.organisation_name) return params.data.organisation_name;
          const orgId = getGemOrganisationId(params.data);
          const found = organisations.find(
            (o) => String(o.organisation_id || o.id) === String(orgId)
          );
          return found ? found.organisation_name || found.name : '—';
        },
      },
      {
        headerName: 'Financial Year',
        flex: 1.2,
        minWidth: 130,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
        valueGetter: (params) => getGemFinancialYear(params.data) || '—',
      },
      {
        headerName: 'Planned Total Procurement (In Crore)',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-black text-[#0f417a] text-center flex items-center justify-center',
        valueGetter: (params) =>
          Number(getGemPotential(params.data, listCategoryForTab(activeTab))).toFixed(2),
      },
      {
        headerName: `${elapsedMonths} Months Proportional Target (In Crore)`,
        flex: 2,
        minWidth: 220,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
        valueGetter: (params) =>
          proportionalTarget(
            getGemPotential(params.data, listCategoryForTab(activeTab)),
            elapsedMonths
          ).toFixed(2),
      },
      {
        headerName: 'Procurement Through GEM (In Crore)',
        flex: 2,
        minWidth: 220,
        cellClass:
          activeTab === 'total'
            ? 'font-bold text-slate-800 text-center flex items-center justify-center'
            : 'font-black text-blue-700 text-center flex items-center justify-center cursor-pointer hover:underline',
        valueGetter: (params) =>
          Number(params.data?.total_procurement_through_gem || 0).toFixed(2),
        cellRenderer: (params) => {
          if (!params.data) return null;
          if (activeTab === 'total') return params.value;
          return (
            <span
              onClick={() => openMonthlyPage(params.data)}
              className="text-blue-700 font-black underline cursor-pointer"
              title="Click to view/edit monthly procurement data"
            >
              {params.value}
            </span>
          );
        },
      },
      {
        headerName: 'Procurement Outside GEM (In Crore)',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-bold text-slate-800 text-center flex items-center justify-center',
        valueGetter: (params) =>
          Number(params.data?.total_procurement_outside_gem || 0).toFixed(2),
      },
    ];

    if (activeTab !== 'total') {
      allDefs.push({
        headerName: 'Last Updated Date',
        flex: 1.4,
        minWidth: 150,
        cellClass: 'text-slate-600 font-semibold text-center flex items-center justify-center',
        valueGetter: (params) => {
          const raw = params.data?.updated_date;
          if (!raw) return '—';
          const d = new Date(raw);
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
        },
      });
    }

    if (canUpdate && activeTab !== 'total') {
      allDefs.push({
        headerName: 'Update',
        flex: 1,
        minWidth: 110,
        maxWidth: 120,
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
                className="p-1.5 hover:bg-slate-100 rounded text-[#0f417a] transition cursor-pointer"
                title={
                  isMinistry
                    ? 'Update Planned Total Procurement'
                    : 'Update monthly procurement'
                }
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

  const handleAddSubmit = async (payload) => {
    const category = listCategoryForTab(activeTab);
    if (category === 'total') return;
    try {
      await createGemTarget(category, payload);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err.message ||
        `Failed to add ${categoryTitle} target.`;
      throw new Error(msg, { cause: err });
    }
  };

  const handleTargetUpdate = async (payload) => {
    const category = listCategoryForTab(activeTab);
    if (category === 'total') return;
    try {
      await updateGemTarget(category, payload);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err.message ||
        'Failed to update planned procurement.';
      throw new Error(msg, { cause: err });
    }
  };

  const handleCopyData = async () => {
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
    await navigator.clipboard.writeText(text);
    showToast('✅ Copied to clipboard', '#10B981');
  };

  const handleExportExcel = () => {
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
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, categoryTitle);
    XLSX.writeFile(wb, `GEM_${categoryTitle}_${filterYear || 'all'}.xlsx`);
  };

  if (!permissions.canView) {
    return <RestrictedAccess moduleName="GEM Procurement" />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0f417a] tracking-tight">
            GEM Procurement
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Track Goods, Services and Works procurement targets and monthly actuals across organisations.
          </p>
        </div>
        <InternalNavigation
          tabs={visibleTabs}
          currentTab={activeTab}
          onTabChange={(tabId) => {
            closeUpdatePage();
            setActiveTab(tabId);
          }}
        />
      </div>

      {activeTab !== 'report' &&
        (activePage === 'add' && canAddForTab ? (
          <GEMInputForm
            organisations={organisations}
            categoryTitle={categoryTitle}
            existingData={rows}
            onSubmit={handleAddSubmit}
            onBack={closeUpdatePage}
            onSuccess={() => {
              closeUpdatePage();
              fetchList();
            }}
            notify={(msg, type) =>
              showToast(msg, type === 'error' ? '#EF4444' : '#10B981')
            }
          />
        ) : activePage === 'target' && selectedRecord && canUpdateTarget ? (
          <GEMUpdateForm
            record={selectedRecord}
            category={listCategoryForTab(activeTab)}
            categoryTitle={categoryTitle}
            onSubmit={handleTargetUpdate}
            onBack={closeUpdatePage}
            onSuccess={() => {
              closeUpdatePage();
              fetchList();
            }}
            notify={(msg, type) =>
              showToast(msg, type === 'error' ? '#EF4444' : '#10B981')
            }
          />
        ) : activePage === 'monthly' && selectedRecord ? (
          <GEMMonthlyDataPage
            record={selectedRecord}
            category={listCategoryForTab(activeTab)}
            categoryTitle={categoryTitle}
            canEdit={canUpdateMonthly}
            onBack={closeUpdatePage}
            onSaved={() => {
              closeUpdatePage();
              fetchList();
            }}
            notify={(msg, type) =>
              showToast(msg, type === 'error' ? '#EF4444' : '#10B981')
            }
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
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
              handleExportPdf={() => showToast('PDF export coming soon', '#0f417a')}
              organisations={organisations}
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              filterOrg={filterOrg}
              setFilterOrg={setFilterOrg}
              viewMode={viewMode}
            />
          </div>
        ))}

      {activeTab === 'report' && <GEMReports showToast={showToast} viewMode={viewMode} />}

      {toastVisible && (
        <div
          className="fixed bottom-6 right-6 z-[10000] text-white text-sm font-bold px-4 py-3 rounded-xl shadow-lg"
          style={{ backgroundColor: toastColor }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
