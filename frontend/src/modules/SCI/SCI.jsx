import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Ship, Anchor, MapPin, Landmark, Wrench, Recycle, Users2, Building } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import VesselAvailabilityOwnShipsDataList from './pages/VesselAvailabilityOwnShips/DataList';
import VesselAvailabilityOwnShipsInputForm from './pages/VesselAvailabilityOwnShips/InputForm';
import VesselAvailabilityOwnShipsReports from './pages/VesselAvailabilityOwnShips/Reports';
import TimeVoyageBulkDataList from './pages/TimeVoyageBulk/DataList';
import TimeVoyageBulkInputForm from './pages/TimeVoyageBulk/InputForm';
import TimeVoyageBulkReports from './pages/TimeVoyageBulk/Reports';
import TimeVoyageTankerDataList from './pages/TimeVoyageTanker/DataList';
import TimeVoyageTankerInputForm from './pages/TimeVoyageTanker/InputForm';
import TimeVoyageTankerReports from './pages/TimeVoyageTanker/Reports';
import TimeVoyageOffshoreDataList from './pages/TimeVoyageOffshore/DataList';
import TimeVoyageOffshoreInputForm from './pages/TimeVoyageOffshore/InputForm';
import TimeVoyageOffshoreReports from './pages/TimeVoyageOffshore/Reports';
import VesselAvailabilityLinerDataList from './pages/VesselAvailabilityLiner/DataList';
import VesselAvailabilityLinerInputForm from './pages/VesselAvailabilityLiner/InputForm';
import VesselAvailabilityLinerReports from './pages/VesselAvailabilityLiner/Reports';
import VesselProcurementDataList from './pages/VesselProcurement/DataList';
import VesselProcurementInputForm from './pages/VesselProcurement/InputForm';
import VesselProcurementReports from './pages/VesselProcurement/Reports';
import SecondhandVesselProcurementDataList from './pages/VesselProcurementSecondhand/DataList';
import SecondhandVesselProcurementInputForm from './pages/VesselProcurementSecondhand/InputForm';
import SecondhandVesselProcurementReports from './pages/VesselProcurementSecondhand/Reports';
import ShipDryDockingDataList from './pages/ShipDryDocking/DataList';
import ShipDryDockingInputForm from './pages/ShipDryDocking/InputForm';
import ShipDryDockingReports from './pages/ShipDryDocking/Reports';
import RepairAndMaintenanceDataList from './pages/RepairAndMaintenance/DataList';
import RepairAndMaintenanceInputForm from './pages/RepairAndMaintenance/InputForm';
import RepairAndMaintenanceReports from './pages/RepairAndMaintenance/Reports';
import SaleAndRecyclingDataList from './pages/SaleAndRecycling/DataList';
import SaleAndRecyclingInputForm from './pages/SaleAndRecycling/InputForm';
import SaleAndRecyclingReports from './pages/SaleAndRecycling/Reports';
import SaleAndGreenRecyclingDataList from './pages/SaleAndGreenRecycling/DataList';
import SaleAndGreenRecyclingInputForm from './pages/SaleAndGreenRecycling/InputForm';
import SaleAndGreenRecyclingReports from './pages/SaleAndGreenRecycling/Reports';
import ManningOfOwnedShipsDataList from './pages/ManningOfOwnedShips/DataList';
import ManningOfOwnedShipsInputForm from './pages/ManningOfOwnedShips/InputForm';
import ManningOfOwnedShipsReports from './pages/ManningOfOwnedShips/Reports';
import ShipManagementBusinessDataList from './pages/ShipManagementBusiness/DataList';
import ShipManagementBusinessInputForm from './pages/ShipManagementBusiness/InputForm';
import ShipManagementBusinessReports from './pages/ShipManagementBusiness/Reports';
import { useSCIPermissions } from './hooks/useSCIPermissions';
import { useSciStore } from './store/useSciStore';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { SCI_TOASTS } from './toastMessages';
import {
  fetchVesselAvailabilityOwnShips, deleteVesselAvailabilityOwnShips,
  fetchTimeVoyageBulk, deleteTimeVoyageBulk,
  fetchTimeVoyageTanker, deleteTimeVoyageTanker,
  fetchTimeVoyageOffshore, deleteTimeVoyageOffshore,
  fetchVesselAvailabilityLiner, deleteVesselAvailabilityLiner,
  fetchVesselProcurement, deleteVesselProcurement,
  fetchSecondhandVesselProcurement, deleteSecondhandVesselProcurement,
  fetchShipDryDocking, deleteShipDryDocking,
  fetchRepairAndMaintenance, deleteRepairAndMaintenance,
  fetchSaleAndRecycling, deleteSaleAndRecycling,
  fetchSaleAndGreenRecycling, deleteSaleAndGreenRecycling,
  fetchManningOfOwnedShips, deleteManningOfOwnedShips,
  fetchShipManagementBusiness, deleteShipManagementBusiness,
} from './api';

// K-6.1 (Vessel Availability/Utilization) is genuinely one umbrella topic
// with 5 sub-forms, confirmed against the legacy site's report form
// numbers (K-6.1.1 through K-6.1.5); K-6.2 through K-6.6 are separate top-level sections.
// What each section fetches, deletes and renders; `name` is used in messages.
// Every list returns all its rows; each Data List filters and pages them in the browser.
const SECTIONS = [
  { id: 'vesselAvailOwnShips', code: 'K-6.1.1', label: 'SCI - Vessel Availability - Own Ships', name: 'Vessel Availability (Own Ships)', icon: Ship,
    fetchList: fetchVesselAvailabilityOwnShips, remove: deleteVesselAvailabilityOwnShips, idField: 'sci_vessel_id',
    DataList: VesselAvailabilityOwnShipsDataList, InputForm: VesselAvailabilityOwnShipsInputForm, Reports: VesselAvailabilityOwnShipsReports },
  { id: 'timeVoyageBulk', code: 'K-6.1.2', label: 'SCI - Time & Voyage Chartered - Bulk', name: 'Time & Voyage Chartered (Bulk)', icon: Anchor,
    fetchList: fetchTimeVoyageBulk, remove: deleteTimeVoyageBulk, idField: 'sci_time_voyage_bulk_id',
    DataList: TimeVoyageBulkDataList, InputForm: TimeVoyageBulkInputForm, Reports: TimeVoyageBulkReports },
  { id: 'timeVoyageTanker', code: 'K-6.1.3', label: 'SCI - Time & Voyage Chartered - Tanker', name: 'Time & Voyage Chartered (Tanker)', icon: Anchor,
    fetchList: fetchTimeVoyageTanker, remove: deleteTimeVoyageTanker, idField: 'sci_time_voyage_tanker_id',
    DataList: TimeVoyageTankerDataList, InputForm: TimeVoyageTankerInputForm, Reports: TimeVoyageTankerReports },
  { id: 'timeVoyageOffshore', code: 'K-6.1.4', label: 'SCI - Time & Voyage Chartered - Offshore', name: 'Time & Voyage Chartered (Offshore)', icon: Anchor,
    fetchList: fetchTimeVoyageOffshore, remove: deleteTimeVoyageOffshore, idField: 'sci_time_voyage_offshore_id',
    DataList: TimeVoyageOffshoreDataList, InputForm: TimeVoyageOffshoreInputForm, Reports: TimeVoyageOffshoreReports },
  { id: 'vesselAvailLiner', code: 'K-6.1.5', label: 'SCI - Vessel Availability - Liner', name: 'Vessel Availability (Liner)', icon: MapPin,
    fetchList: fetchVesselAvailabilityLiner, remove: deleteVesselAvailabilityLiner, idField: 'sci_vessel_availability_bulk_id',
    DataList: VesselAvailabilityLinerDataList, InputForm: VesselAvailabilityLinerInputForm, Reports: VesselAvailabilityLinerReports },
  { id: 'vesselProcurement', code: 'K-6.2.1', label: 'SCI - Vessel Procurement', name: 'Vessel Procurement', icon: Landmark,
    fetchList: fetchVesselProcurement, remove: deleteVesselProcurement, idField: 'sci_procurement_id',
    DataList: VesselProcurementDataList, InputForm: VesselProcurementInputForm, Reports: VesselProcurementReports },
  { id: 'secondhandVesselProcurement', code: 'K-6.2.2', label: 'SCI - Vessel Procurement - Secondhand', name: 'Secondhand Vessel Procurement', icon: Landmark,
    fetchList: fetchSecondhandVesselProcurement, remove: deleteSecondhandVesselProcurement, idField: 'sci_secondhand_procurement_id',
    DataList: SecondhandVesselProcurementDataList, InputForm: SecondhandVesselProcurementInputForm, Reports: SecondhandVesselProcurementReports },
  { id: 'shipDryDocking', code: 'K-6.3.1', label: 'SCI - Ship Dry-Docking (Own Ships)', name: 'Ship Dry-Docking', icon: Wrench,
    fetchList: fetchShipDryDocking, remove: deleteShipDryDocking, idField: 'sci_ship_dry_docking_id',
    DataList: ShipDryDockingDataList, InputForm: ShipDryDockingInputForm, Reports: ShipDryDockingReports },
  { id: 'repairAndMaintenance', code: 'K-6.3.2', label: 'SCI - Repair & Maintenance Costs', name: 'Repair & Maintenance', icon: Wrench,
    fetchList: fetchRepairAndMaintenance, remove: deleteRepairAndMaintenance, idField: 'sci_repair_and_maintanace_id',
    DataList: RepairAndMaintenanceDataList, InputForm: RepairAndMaintenanceInputForm, Reports: RepairAndMaintenanceReports },
  { id: 'saleAndRecycling', code: 'K-6.4.1', label: 'SCI - Sale & Recycling of Old Vessels', name: 'Sale & Recycling of Old Vessels', icon: Recycle,
    fetchList: fetchSaleAndRecycling, remove: deleteSaleAndRecycling, idField: 'sci_sale_recycling_id',
    DataList: SaleAndRecyclingDataList, InputForm: SaleAndRecyclingInputForm, Reports: SaleAndRecyclingReports },
  { id: 'saleAndGreenRecycling', code: 'K-6.4.2', label: 'SCI - Sale & Green Recycling', name: 'Sale & Green Recycling', icon: Recycle,
    fetchList: fetchSaleAndGreenRecycling, remove: deleteSaleAndGreenRecycling, idField: 'sci_sale_green_recycling_id',
    DataList: SaleAndGreenRecyclingDataList, InputForm: SaleAndGreenRecyclingInputForm, Reports: SaleAndGreenRecyclingReports },
  { id: 'manningOwnedShips', code: 'K-6.5.1', label: 'SCI - Manning of Owned Ships', name: 'Manning of Owned Ships', icon: Users2,
    fetchList: fetchManningOfOwnedShips, remove: deleteManningOfOwnedShips, idField: 'sci_manning_id',
    DataList: ManningOfOwnedShipsDataList, InputForm: ManningOfOwnedShipsInputForm, Reports: ManningOfOwnedShipsReports },
  { id: 'shipManagementBusiness', code: 'K-6.6.1', label: 'SCI - Ship Management Business', name: 'Ship Management Business', icon: Building,
    fetchList: fetchShipManagementBusiness, remove: deleteShipManagementBusiness, idField: 'sci_ship_management_id',
    DataList: ShipManagementBusinessDataList, InputForm: ShipManagementBusinessInputForm, Reports: ShipManagementBusinessReports },
];
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const TAB_IDS = ['add', 'list', 'report'];

export default function SCIView({ activeTab: menuTab, triggerNotification }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView, canRemove } = useSCIPermissions();

  // Section and tab live in the URL (?section=&tab=), so refresh, bookmarks and Back work
  const sectionId = SECTION_BY_ID[searchParams.get('section')] ? searchParams.get('section') : 'vesselAvailOwnShips';
  const defaultTab = menuTab === 'SCI Reports' ? 'report' : 'list';
  const requestedTab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : defaultTab;
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
  const listSlice = useSciStore((state) => state[sectionId]);
  const listActions = useSciStore((state) => state[`${sectionId}Actions`]);

  // Search applies 300 ms after the user stops typing (and then returns to page 1)
  useEffect(() => {
    const timer = setTimeout(() => listActions.setDebouncedSearch(listSlice.searchTerm), 300);
    return () => clearTimeout(timer);
  }, [listSlice.searchTerm, listActions]);

  // Fetched rows are tagged with the request they answer; a mismatch means it is still loading.
  // Only the latest request may update them (an older response can arrive last).
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null);
  const latestRequestRef = useRef(0);
  const requestKey = JSON.stringify([sectionId, reloadKey]);

  useEffect(() => {
    if (!canView || activeTab !== 'list') return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    // The list endpoints take a userID but don't filter by it
    section.fetchList(1)
      .then((res) => {
        if (isStale()) return;
        setResult({ key: requestKey, rows: res.data || [] });
      })
      .catch((err) => {
        if (isStale()) return;
        console.error(`Error loading SCI ${section.name}:`, err);
        setResult({ key: requestKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed(`${section.name} entries`));
      });
  }, [requestKey, canView, activeTab, section, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];

  const handleEdit = useCallback((row) => {
    go(sectionId, 'add', { section: sectionId, item: row });
  }, [go, sectionId]);

  const handleDelete = useCallback((row) => {
    if (!window.confirm(`Delete the ${section.name} entry for ${row.financial_year}? This cannot be undone.`)) return;
    section.remove(row[section.idField], getCurrentUserId())
      .then(() => {
        notify(SCI_TOASTS.deleted(section.name, row.financial_year));
        setReloadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error(`Error deleting SCI ${section.name} entry:`, err);
        notify(SCI_TOASTS.deleteFailed(getErrorMessage(err)));
      });
  }, [section, notify]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    setReloadKey((k) => k + 1);
    go(sectionId, canView ? 'list' : 'add', undefined, true);
  }, [go, sectionId, canView]);

  const handleBack = useCallback(() => go(sectionId, 'list'), [go, sectionId]);

  const tabs = useMemo(() => {
    const items = [];
    if (canAdd) items.push({ id: 'add', label: 'Input Form' });
    if (canView) items.push({ id: 'list', label: 'Data List' });
    if (canView) items.push({ id: 'report', label: 'Reports' });
    return items;
  }, [canAdd, canView]);

  if (!canAdd && !canView) {
    return <RestrictedAccess moduleName="KPI - SCI" />;
  }

  const { DataList, InputForm, Reports } = section;

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5">
        <div className="module-header-container">
          <div>
            <h1 className="module-header-title">KPI - SCI</h1>
            <p className="module-header-subtitle">Shipping Corporation of India -- track KPI data across all sections.</p>
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
        <Reports notify={notify} />
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
          financialYear={listSlice.financialYear}
          onFinancialYearChange={(fy) => listActions.setFilters({ financialYear: fy })}
          searchQuery={listSlice.searchTerm}
          onSearchChange={listActions.setSearchTerm}
          currentPage={listSlice.currentPage}
          onPageChange={listActions.setCurrentPage}
          pageSize={listSlice.pageSize}
          onPageSizeChange={listActions.setPageSize}
          visibleCols={listSlice.visibleCols}
          onVisibleColsChange={listActions.setVisibleCols}
          notify={notify}
        />
      )}
    </div>
  );
}
