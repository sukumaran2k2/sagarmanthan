import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Ship, Anchor, Truck, Gauge, Hammer, Wrench } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import VesselsBuiltDataList from './components/VesselsBuiltDataList';
import ShipBuildingOrdersDataList from './components/ShipBuildingOrdersDataList';
import ShipDeliveryPerformanceDataList from './components/ShipDeliveryPerformanceDataList';
import CapacityUtilizationDataList from './components/CapacityUtilizationDataList';
import FabricationOfSteelsDataList from './components/FabricationOfSteelsDataList';
import ShipsRepairedDataList from './components/ShipsRepairedDataList';
import VesselsBuiltInputForm from './pages/VesselsBuilt/InputForm';
import VesselsBuiltReports from './pages/VesselsBuilt/Reports';
import ShipBuildingOrdersInputForm from './pages/ShipBuildingOrders/InputForm';
import ShipBuildingOrdersReports from './pages/ShipBuildingOrders/Reports';
import ShipDeliveryPerformanceInputForm from './pages/ShipDeliveryPerformance/InputForm';
import ShipDeliveryPerformanceReports from './pages/ShipDeliveryPerformance/Reports';
import CapacityUtilizationInputForm from './pages/CapacityUtilization/InputForm';
import CapacityUtilizationReports from './pages/CapacityUtilization/Reports';
import FabricationOfSteelsInputForm from './pages/FabricationOfSteels/InputForm';
import FabricationOfSteelsReports from './pages/FabricationOfSteels/Reports';
import ShipsRepairedInputForm from './pages/ShipsRepaired/InputForm';
import ShipsRepairedReports from './pages/ShipsRepaired/Reports';
import { useCSLPermissions } from './hooks/useCSLPermissions';
import { useCslStore } from './store/useCslStore';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { CSL_TOASTS } from './toastMessages';
import {
  fetchVesselsBuilt, deleteVesselsBuilt,
  fetchShipBuildingOrders, deleteShipBuildingOrders,
  fetchShipDeliveryPerformance, deleteShipDeliveryPerformance,
  fetchCapacityUtilization, deleteCapacityUtilization,
  fetchFabricationOfSteels, deleteFabricationOfSteels,
  fetchShipsRepaired, deleteShipsRepaired,
} from './api';

const quarterPeriod = (row) => `${row.financial_year} ${row.financial_quater}`;

// The 6 CSL KPI sections (K-4.1 to K-4.6): what each one fetches, deletes and renders.
// `name` is used in messages; `period` names a row in the delete confirmation.
const SECTIONS = [
  { id: 'vesselsBuilt', code: 'K-4.1', label: 'CSL - Vessels Built', name: 'Vessels Built', icon: Ship,
    fetchList: fetchVesselsBuilt, remove: deleteVesselsBuilt, idField: 'csl_vessel_id', period: (r) => r.financial_year,
    DataList: VesselsBuiltDataList, InputForm: VesselsBuiltInputForm, Reports: VesselsBuiltReports },
  { id: 'shipBuildingOrders', code: 'K-4.2', label: 'CSL - Ship Building Orders', name: 'Ship Building Orders', icon: Anchor,
    fetchList: fetchShipBuildingOrders, remove: deleteShipBuildingOrders, idField: 'csl_shipbuilding_id', period: quarterPeriod,
    DataList: ShipBuildingOrdersDataList, InputForm: ShipBuildingOrdersInputForm, Reports: ShipBuildingOrdersReports },
  { id: 'shipDelivery', code: 'K-4.3', label: 'CSL - Ship Delivery Performance', name: 'Ship Delivery Performance', icon: Truck,
    fetchList: fetchShipDeliveryPerformance, remove: deleteShipDeliveryPerformance, idField: 'csl_shipdelivery_id', period: quarterPeriod,
    DataList: ShipDeliveryPerformanceDataList, InputForm: ShipDeliveryPerformanceInputForm, Reports: ShipDeliveryPerformanceReports },
  { id: 'capacityUtilization', code: 'K-4.4', label: 'CSL - Capacity Utilization', name: 'Capacity Utilization', icon: Gauge,
    fetchList: fetchCapacityUtilization, remove: deleteCapacityUtilization, idField: 'csl_capacity_utilization_id', period: (r) => r.financial_year,
    DataList: CapacityUtilizationDataList, InputForm: CapacityUtilizationInputForm, Reports: CapacityUtilizationReports },
  { id: 'fabricationOfSteels', code: 'K-4.5', label: 'CSL - Fabrication of Steels', name: 'Fabrication of Steels', icon: Hammer,
    fetchList: fetchFabricationOfSteels, remove: deleteFabricationOfSteels, idField: 'csl_fabrication_id', period: (r) => `${r.financial_year}${r.month ? ` ${r.month}` : ''}`,
    DataList: FabricationOfSteelsDataList, InputForm: FabricationOfSteelsInputForm, Reports: FabricationOfSteelsReports },
  { id: 'shipsRepaired', code: 'K-4.6', label: 'CSL - Ships Repaired', name: 'Ships Repaired', icon: Wrench,
    fetchList: fetchShipsRepaired, remove: deleteShipsRepaired, idField: 'csl_ships_reapired_id', period: quarterPeriod,
    DataList: ShipsRepairedDataList, InputForm: ShipsRepairedInputForm, Reports: ShipsRepairedReports },
];
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const TAB_IDS = ['add', 'list', 'report'];
const EMPTY_PAGINATION = { total: 0, page: 1, limit: 10, totalPages: 0 };

export default function CSLView({ triggerNotification }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView, canRemove } = useCSLPermissions();

  // Section and tab live in the URL (?section=&tab=), so refresh, bookmarks and Back work
  const sectionId = SECTION_BY_ID[searchParams.get('section')] ? searchParams.get('section') : 'vesselsBuilt';
  const requestedTab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'list';
  const section = SECTION_BY_ID[sectionId];

  // The record being edited travels with the route entry (and only counts for its own section),
  // so it is gone as soon as the form is opened any other way
  const routeItem = location.state?.section === sectionId ? (location.state.item ?? null) : null;
  // Editing needs edit rights; a new entry needs add rights
  const formAllowed = routeItem ? canEdit : canAdd;
  // Fall back to a tab the user can open
  let activeTab = requestedTab;
  if (requestedTab === 'add' && !formAllowed) activeTab = canView ? 'list' : 'add';
  else if (requestedTab !== 'add' && !canView) activeTab = 'add';
  const editData = activeTab === 'add' ? routeItem : null;

  const go = useCallback((nextSection, nextTab, state, replace = false) => {
    setSearchParams({ section: nextSection, tab: nextTab }, { state, replace });
  }, [setSearchParams]);

  // Write the defaults into the URL on first load, as before, so the breadcrumb shows the tab
  useEffect(() => {
    if (searchParams.get('section') !== sectionId || searchParams.get('tab') !== activeTab) {
      go(sectionId, activeTab, location.state, true);
    }
  }, [searchParams, sectionId, activeTab, go, location.state]);

  // This section's list state, one selector each so other sections' changes don't re-render
  const listSlice = useCslStore((state) => state[sectionId]);
  const listActions = useCslStore((state) => state[`${sectionId}Actions`]);
  const years = useCslStore((state) => state.years[sectionId]);
  const loadYears = useCslStore((state) => state.loadYears);

  useEffect(() => {
    if (canView) loadYears(sectionId);
  }, [canView, sectionId, loadYears]);

  // Search applies 300 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => listActions.setDebouncedSearch(listSlice.searchTerm), 300);
    return () => clearTimeout(timer);
  }, [listSlice.searchTerm, listActions]);

  // Fetched rows are tagged with the request they answer; a mismatch means it is still loading.
  // Only the latest request may update them (an older response can arrive last).
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null);
  const latestRequestRef = useRef(0);
  const { debouncedSearch, financialYear, currentPage, pageSize } = listSlice;
  const requestKey = JSON.stringify([sectionId, debouncedSearch, financialYear, currentPage, pageSize, reloadKey]);

  useEffect(() => {
    if (!canView || activeTab !== 'list') return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    section.fetchList(1, { page: currentPage, limit: pageSize, search: debouncedSearch, financialYear })
      .then((res) => {
        if (isStale()) return;
        setResult({ key: requestKey, rows: res.data?.data || [], pagination: res.data?.pagination || { ...EMPTY_PAGINATION, limit: pageSize } });
      })
      .catch((err) => {
        if (isStale()) return;
        console.error(`Error loading CSL ${section.name}:`, err);
        setResult({ key: requestKey, rows: [], pagination: { ...EMPTY_PAGINATION, limit: pageSize } });
        notify(COMMON_TOASTS.loadFailed(`${section.name} entries`));
      });
  }, [requestKey, canView, activeTab, section, currentPage, pageSize, debouncedSearch, financialYear, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];
  const pagination = result?.pagination ?? { ...EMPTY_PAGINATION, limit: pageSize };

  // A deleted row can leave the page empty; step back so the list doesn't look blank
  useEffect(() => {
    if (!loading && rows.length === 0 && currentPage > 1) listActions.setCurrentPage(currentPage - 1);
  }, [loading, rows.length, currentPage, listActions]);

  const handleEdit = useCallback((row) => {
    go(sectionId, 'add', { section: sectionId, item: row });
  }, [go, sectionId]);

  const handleDelete = useCallback((row) => {
    const period = section.period(row);
    if (!window.confirm(`Delete the ${section.name} entry for ${period}? This cannot be undone.`)) return;
    section.remove(row[section.idField], getCurrentUserId())
      .then(() => {
        notify(CSL_TOASTS.deleted(section.name, period));
        setReloadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error(`Error deleting CSL ${section.name} entry:`, err);
        notify(CSL_TOASTS.deleteFailed(getErrorMessage(err)));
      });
  }, [section, notify]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    setReloadKey((k) => k + 1);
    go(sectionId, canView ? 'list' : 'add', undefined, true);
  }, [go, sectionId, canView]);

  const handleBack = useCallback(() => go(sectionId, 'list'), [go, sectionId]);

  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'add', label: 'Input Form' });
    if (canView) list.push({ id: 'list', label: 'Data List' });
    if (canView) list.push({ id: 'report', label: 'Reports' });
    return list;
  }, [canAdd, canView]);

  if (!canAdd && !canView) {
    return <RestrictedAccess moduleName="KPI - CSL" />;
  }

  const { DataList, InputForm, Reports } = section;

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5">
        <div className="module-header-container">
          <div>
            <h1 className="module-header-title">KPI - CSL</h1>
            <p className="module-header-subtitle">Cochin Shipyard Limited -- track KPI data across all sections.</p>
          </div>
          <InternalNavigation tabs={tabs} currentTab={activeTab} onTabChange={(tabId) => go(sectionId, tabId)} />
        </div>

        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Section</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = sectionId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(s.id, activeTab)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer border flex-shrink-0 ${
                    active ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a]/30 dark:border-blue-500/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{s.code}</span>
                    <span className={`text-xs font-bold whitespace-nowrap ${active ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">Scroll for more sections →</p>
        </div>
      </div>

      {activeTab === 'report' ? (
        <Reports />
      ) : activeTab === 'add' ? (
        <InputForm
          key={`${sectionId}-${editData?.[section.idField] ?? 'new'}`}
          editData={editData}
          onBack={canView ? handleBack : undefined}
          onSuccess={handleSuccess}
          triggerNotification={triggerNotification}
        />
      ) : (
        <DataList
          rowData={rows}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canRemove={canRemove}
          pagination={pagination}
          onPageChange={listActions.setCurrentPage}
          searchQuery={listSlice.searchTerm}
          onSearchChange={listActions.setSearchTerm}
          financialYear={financialYear}
          onFinancialYearChange={(fy) => listActions.setFilters({ financialYear: fy })}
          years={years || []}
          visibleCols={listSlice.visibleCols}
          onVisibleColsChange={listActions.setVisibleCols}
          notify={notify}
        />
      )}
    </div>
  );
}
