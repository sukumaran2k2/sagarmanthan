import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Edit } from 'lucide-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import GEMKpiCards from './components/GEMKpiCards';
import GEMDataListView from './components/GEMDataListView';
import GEMAddTargetModal from './components/GEMAddTargetModal';
import GEMMonthlyDataModal from './components/GEMMonthlyDataModal';
import GEMReportView from './components/GEMReportView';
import { useGemPermissions } from './hooks/useGemPermissions';
import {
  fetchGemList,
  createGemTarget,
  fetchOrganisationsDropdown,
} from './api';
import {
  calculateGemPercentage,
  getGemFinancialYear,
  getGemOrganisationId,
  getGemPotential,
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
  const showAdd = Boolean(permissions.canAdd && viewMode !== 'org');

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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

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
        console.error('Failed to load organisations for GEM:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const openMonthly = useCallback((record) => {
    setSelectedRecord(record);
    setIsMonthlyModalOpen(true);
  }, []);

  const categoryTitle =
    activeTab === 'total'
      ? 'Total'
      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const [visibleCols, setVisibleCols] = useState({
    'Sl.No': true,
    Organisation: true,
    'Financial Year': true,
    'Planned Total Procurement': true,
    '8 Months Proportional Target': true,
    'Procurement Through GEM': true,
    'Procurement Outside GEM': true,
    'Last Updated Date': true,
    Update: true,
  });

  const colDefs = useMemo(() => {
    const canUpdateMonthly = permissions.canEdit && !permissions.isViewOnlyAdmin;
    return [
      {
        headerName: 'Sl.No',
        key: 'Sl.No',
        valueGetter: (params) => {
          const base = (pagination.page - 1) * pagination.limit;
          return params.node ? base + params.node.rowIndex + 1 : base + 1;
        },
        flex: 0.6,
        minWidth: 70,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
        hide: visibleCols['Sl.No'] === false,
      },
      {
        field: 'organisation_name',
        headerName: 'Organisation',
        key: 'Organisation',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-bold text-slate-800 text-left flex items-center',
        hide: visibleCols.Organisation === false,
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
        key: 'Financial Year',
        flex: 1.2,
        minWidth: 130,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
        hide: visibleCols['Financial Year'] === false,
        valueGetter: (params) => getGemFinancialYear(params.data) || '—',
      },
      {
        headerName: 'Planned Total Procurement (In Crore)',
        key: 'Planned Total Procurement',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-black text-[#0f417a] text-center flex items-center justify-center',
        hide: visibleCols['Planned Total Procurement'] === false,
        valueGetter: (params) =>
          Number(getGemPotential(params.data, listCategoryForTab(activeTab))).toFixed(2),
      },
      {
        headerName: '8 Months Proportional Target (In Crore)',
        key: '8 Months Proportional Target',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
        hide: visibleCols['8 Months Proportional Target'] === false,
        valueGetter: (params) =>
          Number(params.data?.eight_months_proportional_target || 0).toFixed(2),
      },
      {
        headerName: 'Procurement Through GEM (In Crore)',
        key: 'Procurement Through GEM',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-semibold text-emerald-700 text-center flex items-center justify-center',
        hide: visibleCols['Procurement Through GEM'] === false,
        valueGetter: (params) => {
          const through = Number(params.data?.total_procurement_through_gem || 0);
          const potential = getGemPotential(params.data, listCategoryForTab(activeTab));
          const pct = calculateGemPercentage(through, potential);
          return `${through.toFixed(2)} (${pct}%)`;
        },
      },
      {
        headerName: 'Procurement Outside GEM (In Crore)',
        key: 'Procurement Outside GEM',
        flex: 2,
        minWidth: 220,
        cellClass: 'font-semibold text-amber-700 text-center flex items-center justify-center',
        hide: visibleCols['Procurement Outside GEM'] === false,
        valueGetter: (params) =>
          Number(params.data?.total_procurement_outside_gem || 0).toFixed(2),
      },
      {
        headerName: 'Last Updated Date',
        key: 'Last Updated Date',
        flex: 1.4,
        minWidth: 150,
        cellClass: 'text-slate-600 text-center flex items-center justify-center',
        hide: visibleCols['Last Updated Date'] === false,
        valueGetter: (params) => {
          const raw = params.data?.updated_date;
          if (!raw) return '—';
          const d = new Date(raw);
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
        },
      },
      {
        headerName: 'Update',
        key: 'Update',
        flex: 1,
        minWidth: 110,
        pinned: 'right',
        cellClass: 'flex items-center justify-center',
        hide: visibleCols.Update === false || activeTab === 'total' || !canUpdateMonthly,
        cellRenderer: (params) => {
          if (!params.data || activeTab === 'total' || !canUpdateMonthly) return null;
          return (
            <button
              type="button"
              onClick={() => openMonthly(params.data)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#0f417a] text-xs font-bold hover:bg-blue-100 cursor-pointer"
              title="Update monthly expenditure"
            >
              <Edit size={13} />
              Update
            </button>
          );
        },
      },
    ];
  }, [
    visibleCols,
    organisations,
    activeTab,
    permissions.canEdit,
    permissions.isViewOnlyAdmin,
    openMonthly,
    pagination.page,
    pagination.limit,
  ]);

  const pinnedBottomRowData = useMemo(() => {
    if (!rows.length) return [];
    const category = listCategoryForTab(activeTab);
    const planned = rows.reduce((sum, r) => sum + getGemPotential(r, category), 0);
    const through = rows.reduce(
      (sum, r) => sum + (Number(r.total_procurement_through_gem) || 0),
      0
    );
    const outside = rows.reduce(
      (sum, r) => sum + (Number(r.total_procurement_outside_gem) || 0),
      0
    );
    const eight = rows.reduce(
      (sum, r) => sum + (Number(r.eight_months_proportional_target) || 0),
      0
    );
    return [
      {
        organisation_name: 'TOTAL (page)',
        goods_procurement_potential: planned,
        service_procurement_potential: planned,
        works_procurement_potential: planned,
        total_procurement_potential: planned,
        eight_months_proportional_target: eight,
        total_procurement_through_gem: through,
        total_procurement_outside_gem: outside,
      },
    ];
  }, [rows, activeTab]);

  const handleAddSubmit = async (payload) => {
    const category = listCategoryForTab(activeTab);
    if (category === 'total') return;
    try {
      await createGemTarget(category, payload);
      showToast(`✅ ${categoryTitle} target added successfully`, '#10B981');
      fetchList();
    } catch (err) {
      const msg =
        err?.response?.data?.error || `❌ Failed to add ${categoryTitle} target`;
      showToast(msg, '#EF4444');
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
          r.eight_months_proportional_target || 0,
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
      '8 Months Target': r.eight_months_proportional_target || 0,
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
          tabs={GEM_CATEGORY_TABS.map((t) => ({
            id: t.id,
            label: t.label,
            icon: t.id === 'report' ? Calendar : undefined,
          }))}
          currentTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {activeTab !== 'report' && (
        <>
          <GEMKpiCards data={rows} activeCategory={categoryTitle} />
          <GEMDataListView
            categoryTitle={categoryTitle}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pageSize={pageSize}
            setPageSize={setPageSize}
            filteredData={rows}
            colDefs={colDefs}
            pinnedBottomRowData={pinnedBottomRowData}
            loading={loading}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            handleCopyData={handleCopyData}
            handleExportExcel={handleExportExcel}
            handleExportPdf={() => showToast('PDF export coming soon', '#0f417a')}
            organisations={organisations}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            filterOrg={filterOrg}
            setFilterOrg={setFilterOrg}
            visibleCols={visibleCols}
            setVisibleCols={setVisibleCols}
            viewMode={showAdd ? viewMode : 'org'}
            page={page}
            setPage={setPage}
            pagination={pagination}
          />
        </>
      )}

      {activeTab === 'report' && <GEMReportView showToast={showToast} />}

      <GEMAddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        organisations={organisations}
        categoryTitle={categoryTitle}
        existingData={rows}
      />

      <GEMMonthlyDataModal
        isOpen={isMonthlyModalOpen}
        onClose={() => {
          setIsMonthlyModalOpen(false);
          setSelectedRecord(null);
          fetchList();
        }}
        record={selectedRecord}
        categoryType={listCategoryForTab(activeTab)}
        showToast={showToast}
      />

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
