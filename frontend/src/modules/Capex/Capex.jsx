import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Edit } from 'lucide-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import CapexDataListView from './components/CapexDataListView';
// import CapexKpiCards from './components/CapexKpiCards';
import CapexMonthlyDataModal from './components/CapexMonthlyDataModal';
import CapexActualExpenditurePage from './components/CapexActualExpenditurePage';
import CapexReports from './pages/Reports';
import CapexInputForm from './pages/InputForm';
import CapexUpdateForm from './pages/UpdateForm';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCapexPermissions } from './hooks/useCapexPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchCapexList,
  fetchCapexDataEntry,
  createCapexTarget,
  updateCapexTarget,
} from './api';
import { calculateCapexExpenditurePercentage } from './utils/capexUtils';

ModuleRegistry.registerModules([AllCommunityModule]);

const INIT_TAB_KEY = 'capexInitTab';

function resolveSubTabId(label, showInputForm) {
  const key = String(label || '').toLowerCase().trim();
  if (!key || key === 'capex') return 'data';
  if (key.includes('input form') || key === 'add') return showInputForm ? 'add' : 'data';
  if (key.includes('datalist') || key.includes('data list') || key.includes('dashboard')) {
    return 'data';
  }
  if (key.includes('report')) return 'report';
  return 'data';
}

export default function CapexView({ activeSubTab: activeSubTabProp, onGoHome, triggerNotification }) {
  const permissions = useCapexPermissions();
  const viewMode = permissions.viewMode;
  const showInputForm = Boolean(permissions.canAdd && viewMode !== 'org');

  const [activeTab, setActiveTab] = useState('data');
  const [selectedOrgId, setSelectedOrgId] = useState(
    permissions.organisationId ? String(permissions.organisationId) : ''
  );
  const [capexData, setCapexData] = useState([]);
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

  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [isActualExpenditurePageActive, setIsActualExpenditurePageActive] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('#10B981');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback(
    (msg, color = '#10B981') => {
      if (typeof triggerNotification === 'function') {
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
    const apply = (label) => {
      setActiveTab(resolveSubTabId(label, showInputForm));
    };
    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }
    const onMenu = (e) => apply(e.detail);
    window.addEventListener('capex-subtab', onMenu);
    return () => window.removeEventListener('capex-subtab', onMenu);
  }, [showInputForm]);

  useEffect(() => {
    setActiveTab(resolveSubTabId(activeSubTabProp, showInputForm));
  }, [activeSubTabProp, showInputForm]);

  useEffect(() => {
    if (activeTab === 'add' && !showInputForm) {
      setActiveTab('data');
    }
    if (activeTab === 'edit' && (!permissions.canEdit || viewMode !== 'ministry' || !selectedRecord)) {
      setActiveTab('data');
    }
  }, [activeTab, showInputForm, permissions.canEdit, viewMode, selectedRecord]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterYear, filterOrg, pageSize, viewMode, selectedOrgId]);

  const fetchCapexData = useCallback(
    async (signal) => {
      if (!permissions.canView) return;
      setLoading(true);
      try {
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
        showToast('❌ Failed to load Capex data from server', '#EF4444');
        setCapexData([]);
        setPagination({ total: 0, page: 1, limit: pageSize, totalPages: 0 });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      permissions.canView,
      showToast,
      page,
      pageSize,
      filterYear,
      filterOrg,
      debouncedSearch,
      viewMode,
      selectedOrgId,
    ]
  );

  const fetchOrganisations = useCallback(async () => {
    try {
      const res = await fetchCapexDataEntry();
      if (res.data?.organisations) {
        setOrganisations(res.data.organisations);
      } else if (Array.isArray(res.data)) {
        setOrganisations(res.data);
      }
    } catch (err) {
      console.warn('Organisations fetch fallback:', err.message);
      setOrganisations([]);
    }
  }, []);

  useEffect(() => {
    if (!permissions.canView) return;
    fetchOrganisations();
  }, [permissions.canView, fetchOrganisations]);

  useEffect(() => {
    if (!permissions.canView) return;
    const controller = new AbortController();
    fetchCapexData(controller.signal);
    return () => controller.abort();
  }, [permissions.canView, fetchCapexData]);

  const handleAddSubmit = async (payload) => {
    const userID = getCurrentUserId();
    try {
      const res = await createCapexTarget({ userID, ...payload });
      if (res.status === 201 || res.status === 200) {
        showToast('✅ Capex target submitted successfully!', '#10B981');
        fetchCapexData();
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error || err.message || 'Failed to submit Capex target.';
      showToast(`❌ ${serverMsg}`, '#EF4444');
      throw new Error(serverMsg);
    }
  };

  const handleEditSubmit = async (payload) => {
    try {
      const res = await updateCapexTarget({
        ID: payload.ID,
        gbsValue: payload.gbsValue,
        iebrValue: payload.iebrValue,
        pppValue: payload.pppValue,
        totalValue: payload.totalValue,
        userID: getCurrentUserId(),
      });
      if (res.status === 200) {
        await fetchCapexData();
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error || err.message || 'Failed to update Capex target.';
      showToast(`❌ ${serverMsg}`, '#EF4444');
      throw new Error(serverMsg);
    }
  };

  const openUpdatePage = useCallback(
    (row) => {
      setSelectedRecord(row);
      setIsActualExpenditurePageActive(false);
      if (viewMode === 'ministry') {
        setActiveTab('edit');
      } else {
        setIsActualExpenditurePageActive(true);
        setActiveTab('data');
      }
    },
    [viewMode]
  );

  const closeUpdatePage = useCallback(() => {
    setActiveTab('data');
    setSelectedRecord(null);
  }, []);
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
        cellClass: 'font-bold text-slate-800 text-left flex items-center',
        valueGetter: (params) => {
          if (!params.data) return '—';
          if (params.data.organisation_name) return params.data.organisation_name;
          const orgId = params.data.capex_organisation_id;
          const foundOrg = organisations.find(
            (o) => String(o.organisation_id || o.id) === String(orgId)
          );
          return foundOrg ? foundOrg.organisation_name || foundOrg.name : '—';
        },
      },
      {
        field: 'capex_financial_year',
        headerName: 'Financial Year',
        flex: 1.2,
        minWidth: 130,
        cellClass:
          'font-semibold text-slate-700 text-center flex items-center justify-center',
        valueFormatter: (params) =>
          params.value ? String(params.value).replace(/,/g, '') : '—',
      },
      {
        field: 'capex_total_value',
        headerName: 'Total Planned Expenditure (In Crore)',
        flex: 2,
        minWidth: 220,
        cellClass:
          'font-black text-[#0f417a] text-center flex items-center justify-center',
        valueFormatter: (params) =>
          params.value !== undefined && params.value !== null
            ? Number(params.value).toFixed(2)
            : '0.00',
      },
      {
        field: 'total_capex_expenditure',
        headerName: 'Actual Expenditure (In Crore)',
        flex: 2,
        minWidth: 200,
        cellClass:
          'font-black text-blue-700 text-center flex items-center justify-center cursor-pointer hover:underline',
        cellRenderer: (params) => (
          <div
            onClick={() => {
              setSelectedRecord(params.data);
              setIsActualExpenditurePageActive(true);
            }}
            className="text-blue-700 font-black underline cursor-pointer flex items-center justify-center gap-1.5"
            title="Click to view/edit monthly expenditure page"
          >
            <span>
              {params.value !== undefined && params.value !== null
                ? Number(params.value).toFixed(2)
                : '0.00'}
            </span>
          </div>
        ),
      },
      {
        headerName: '% Expenditure Of BE',
        flex: 1.5,
        minWidth: 160,
        cellClass:
          'font-bold text-slate-800 text-center flex items-center justify-center',
        valueGetter: (params) => {
          if (!params.data) return '0.00';
          return calculateCapexExpenditurePercentage(
            params.data.total_capex_expenditure,
            params.data.capex_total_value
          );
        },
      },
      {
        field: 'updated_date',
        headerName: 'Last Updated Date',
        flex: 1.5,
        minWidth: 150,
        cellClass:
          'text-slate-600 font-semibold text-center flex items-center justify-center',
        valueGetter: (params) =>
          params.data.updated_date ? String(params.data.updated_date).slice(0, 10) : '—',
      },
    ];

    if (permissions.canEdit) {
      const updateHeaderLabel =
        viewMode === 'ministry'
          ? 'Update Target'
          : viewMode === 'org'
            ? 'Update Actuals'
            : 'Update';

      allDefs.push({
        headerName: updateHeaderLabel,
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
          return (
            <div className="flex items-center justify-center gap-1 w-full h-full py-1">
              <button
                type="button"
                onClick={() => openUpdatePage(row)}
                className="p-1.5 hover:bg-slate-100 rounded text-[#0f417a] transition cursor-pointer"
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
  }, [viewMode, organisations, permissions.canEdit, page, pageSize, openUpdatePage]);

  const handleCopyData = () => {
    if (!capexData?.length) return;
    const text = capexData
      .map(
        (r) =>
          `${r.organisation_name || ''}\t${r.capex_financial_year || ''}\t${r.capex_total_value || 0}\t${r.total_capex_expenditure || 0}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    showToast('📋 Capex table data copied to clipboard!', '#10B981');
  };

  const handleExportExcel = () => {
    if (!capexData?.length) return;
    const ws = XLSX.utils.json_to_sheet(capexData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capex_Data');
    XLSX.writeFile(wb, 'Capex_Data_List.xlsx');
    showToast('📊 Capex data exported to Excel!', '#10B981');
  };

  const handleExportPdf = () => {
    showToast('📄 PDF export ready. Print via browser dialog.', '#3B82F6');
    window.print();
  };

  const tabs = useMemo(() => {
    const items = [];
    if (showInputForm) {
      items.push({ id: 'add', label: 'Input Form' });
    }
    items.push(
      { id: 'data', label: 'Data List' },
      { id: 'report', label: 'Report' }
    );
    return items;
  }, [showInputForm]);

  if (!permissions.canView) {
    return <RestrictedAccess moduleName="Capex" onGoHome={onGoHome} />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {toastVisible && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow ${
            String(toastColor).toLowerCase().includes('ef4444') ||
            String(toastColor).toLowerCase().includes('red')
              ? 'bg-red-600'
              : 'bg-emerald-600'
          }`}
        >
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
            Capex Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Monitor Capital Expenditure allocations (GBS, Internal Resources, PPP) and track
            monthly target realizations across major port authorities.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeTab === 'edit' ? 'data' : activeTab}
          onTabChange={(tabId) => {
            setIsActualExpenditurePageActive(false);
            if (tabId !== 'edit') setSelectedRecord(null);
            setActiveTab(tabId);
          }}
        />
      </div>

      <div className="space-y-8">
      {activeTab === 'add' && showInputForm && (
        <CapexInputForm
          organisations={organisations}
          onSubmit={handleAddSubmit}
          onBack={() => setActiveTab('data')}
          onSuccess={() => {
            fetchCapexData();
            setActiveTab('data');
          }}
          notify={(msg, type) =>
            showToast(msg, type === 'error' ? '#EF4444' : '#10B981')
          }
        />
      )}

      {activeTab === 'edit' && permissions.canEdit && viewMode === 'ministry' && (
        <CapexUpdateForm
          record={selectedRecord}
          onSubmit={handleEditSubmit}
          onBack={closeUpdatePage}
          onSuccess={() => {
            closeUpdatePage();
            fetchCapexData();
          }}
          notify={(msg, type) =>
            showToast(msg, type === 'error' ? '#EF4444' : '#10B981')
          }
        />
      )}

      {activeTab === 'data' &&
        (isActualExpenditurePageActive && selectedRecord ? (
          <CapexActualExpenditurePage
            capexRecord={selectedRecord}
            onBack={() => setIsActualExpenditurePageActive(false)}
            showToast={showToast}
            onRefresh={fetchCapexData}
            canEdit={permissions.canEdit}
          />
        ) : (
          <>
            {/* KPI cards commented out for now
            <CapexKpiCards data={capexData} />
            */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
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
              />
            </div>
          </>
        ))}

      {activeTab === 'report' && (
        <CapexReports viewMode={viewMode} showToast={showToast} />
      )}
      </div>

      <CapexMonthlyDataModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        capexRecord={selectedRecord}
        showToast={showToast}
      />
    </div>
  );
}
