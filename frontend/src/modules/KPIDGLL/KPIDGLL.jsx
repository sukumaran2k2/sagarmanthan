import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Lightbulb, Radio, Activity, Wifi, MapPin, IndianRupee } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import LightHouseMasterDataList from './components/LightHouseMasterDataList';
import VTMSIntegrationDataList from './components/VTMSIntegrationDataList';
import NAISUptimeDataList from './components/NAISUptimeDataList';
import NAISIntegrationDataList from './components/NAISIntegrationDataList';
import TouristDestinationsDataList from './components/TouristDestinationsDataList';
import FinancialPerformanceDataList from './components/FinancialPerformanceDataList';
import LightHouseMasterInputForm from './pages/LightHouseMaster/InputForm';
import LightHouseMasterReports from './pages/LightHouseMaster/Reports';
import VTMSIntegrationInputForm from './pages/VTMSIntegration/InputForm';
import VTMSIntegrationReports from './pages/VTMSIntegration/Reports';
import NAISUptimeInputForm from './pages/NAISUptime/InputForm';
import NAISUptimeReports from './pages/NAISUptime/Reports';
import NAISIntegrationInputForm from './pages/NAISIntegration/InputForm';
import NAISIntegrationReports from './pages/NAISIntegration/Reports';
import TouristDestinationsInputForm from './pages/TouristDestinations/InputForm';
import TouristDestinationsReports from './pages/TouristDestinations/Reports';
import FinancialPerformanceInputForm from './pages/FinancialPerformance/InputForm';
import FinancialPerformanceReports from './pages/FinancialPerformance/Reports';
import { useKPIDGLLPermissions } from './hooks/useKPIDGLLPermissions';
import { useDgllStore } from './store/useDgllStore';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { DGLL_TOASTS } from './toastMessages';
import {
  fetchLightHouseMaster, deleteLightHouseMaster,
  fetchVtmsIntegration, deleteVtmsIntegration,
  fetchNaisUptime, deleteNaisUptime,
  fetchNaisIntegration, deleteNaisIntegration,
  fetchTouristDestinations, fetchTargetDetails, deleteTouristDestination, deleteTargetDetail,
  fetchFinancialPerformance, deleteFinancialPerformance,
} from './api';

const byYear = (r) => r.financial_year;

// What each list fetches and deletes. `name` is used in messages; `period` names a row in the
// delete confirmation. The list endpoints take a userID but don't filter by it.
// Tourist Destinations shows two lists (destinations and their yearly targets) in one section.
const LISTS = {
  lightHouseMaster: { name: 'Light House Master', fetchList: (p) => fetchLightHouseMaster(1, p), remove: deleteLightHouseMaster,
    idField: 'lights_house_id', period: (r) => r.light_house_name },
  vtmsIntegration: { name: 'VTMS Integration', fetchList: (p) => fetchVtmsIntegration(1, p), remove: deleteVtmsIntegration,
    idField: 'vtms_id', period: byYear },
  naisUptime: { name: 'NAIS Uptime', fetchList: (p) => fetchNaisUptime(1, p), remove: deleteNaisUptime,
    idField: 'nais_id', period: byYear },
  naisIntegration: { name: 'NAIS Integration', fetchList: (p) => fetchNaisIntegration(1, p), remove: deleteNaisIntegration,
    idField: 'nais_integration_id', period: byYear },
  touristDestinations: { name: 'Tourist Destination', fetchList: (p) => fetchTouristDestinations(1, p), remove: deleteTouristDestination,
    idField: 'tourist_destination_id', period: (r) => r.finacial_year },
  touristTargets: { name: 'Target Details', fetchList: (p) => fetchTargetDetails(1, p), remove: deleteTargetDetail,
    idField: 'tourist_destination_target_id', period: (r) => r.year },
  financialPerformance: { name: 'Financial Performance', fetchList: fetchFinancialPerformance, remove: deleteFinancialPerformance,
    idField: 'financial_id', period: (r) => r.financialyear },
};

// The 6 real DGLL KPI sections. Hydrographic Surveys / Vessel Accidents were
// deprecated in the old system (confirmed via commented-out old menu entries
// and no matching backend routes), so they're intentionally excluded here.
const SECTIONS = [
  { id: 'lightHouseMaster', code: 'K-3.1', label: 'DGLL - Light House Master', icon: Lightbulb,
    DataList: LightHouseMasterDataList, InputForm: LightHouseMasterInputForm, Reports: LightHouseMasterReports },
  { id: 'vtmsIntegration', code: 'K-3.2', label: 'DGLL - VTMS Integration', icon: Radio,
    DataList: VTMSIntegrationDataList, InputForm: VTMSIntegrationInputForm, Reports: VTMSIntegrationReports },
  { id: 'naisUptime', code: 'K-3.3', label: 'DGLL - NAIS Uptime', icon: Activity,
    DataList: NAISUptimeDataList, InputForm: NAISUptimeInputForm, Reports: NAISUptimeReports },
  { id: 'naisIntegration', code: 'K-3.4', label: 'DGLL - NAIS Integration', icon: Wifi,
    DataList: NAISIntegrationDataList, InputForm: NAISIntegrationInputForm, Reports: NAISIntegrationReports },
  { id: 'touristDestinations', code: 'K-3.5', label: 'DGLL - Lighthouse as Tourist Destinations', icon: MapPin,
    DataList: TouristDestinationsDataList, InputForm: TouristDestinationsInputForm, Reports: TouristDestinationsReports },
  { id: 'financialPerformance', code: 'K-3.6', label: 'DGLL - Financial Performance', icon: IndianRupee,
    DataList: FinancialPerformanceDataList, InputForm: FinancialPerformanceInputForm, Reports: FinancialPerformanceReports },
];
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const TAB_IDS = ['add', 'list', 'report'];
const EMPTY_PAGINATION = { total: 0, page: 1, limit: 10, totalPages: 0 };
const EMPTY_COUNTS = { active: 0, inactive: 0 };

export default function KPIDGLLView({ activeTab: menuTab, triggerNotification }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView, canRemove } = useKPIDGLLPermissions();

  // Section and tab live in the URL (?section=&tab=), so refresh, bookmarks and Back work
  const sectionId = SECTION_BY_ID[searchParams.get('section')] ? searchParams.get('section') : 'lightHouseMaster';
  const defaultTab = menuTab === 'DGLL Reports' ? 'report' : 'list';
  const requestedTab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : defaultTab;
  const section = SECTION_BY_ID[sectionId];

  // Tourist Destinations shows one of its two lists at a time
  const touristTable = useDgllStore((state) => state.touristTable);
  const setTouristTable = useDgllStore((state) => state.setTouristTable);
  const listId = sectionId === 'touristDestinations' && touristTable === 'target' ? 'touristTargets' : sectionId;
  const list = LISTS[listId];

  // The record being edited travels with the route entry (and only counts for its own section),
  // so it is gone as soon as the form is opened any other way. `list` says which Tourist table it is from.
  const routeState = location.state?.section === sectionId ? location.state : null;
  const routeItem = routeState?.item ?? null;
  // Editing needs edit rights; a new entry needs add rights
  const formAllowed = routeItem ? canEdit : canAdd;
  // Fall back to a tab the user can open
  let activeTab = requestedTab;
  if (requestedTab === 'add' && !formAllowed) activeTab = canView ? 'list' : 'add';
  else if (requestedTab !== 'add' && !canView) activeTab = 'add';
  const editData = activeTab === 'add' ? routeItem : null;
  const editList = editData ? routeState.list : null;

  const go = useCallback((nextSection, nextTab, state, replace = false) => {
    setSearchParams({ section: nextSection, tab: nextTab }, { state, replace });
  }, [setSearchParams]);

  // Write the defaults into the URL on first load, as before, so the breadcrumb shows the tab
  useEffect(() => {
    if (searchParams.get('section') !== sectionId || searchParams.get('tab') !== activeTab) {
      go(sectionId, activeTab, location.state, true);
    }
  }, [searchParams, sectionId, activeTab, go, location.state]);

  // This list's state, one selector each so other lists' changes don't re-render
  const listSlice = useDgllStore((state) => state[listId]);
  const listActions = useDgllStore((state) => state[`${listId}Actions`]);
  const years = useDgllStore((state) => state.years[listId]);
  const loadYears = useDgllStore((state) => state.loadYears);
  const states = useDgllStore((state) => state.states);
  const districts = useDgllStore((state) => state.districts);
  const loadLookups = useDgllStore((state) => state.loadLookups);

  useEffect(() => {
    if (canView) loadYears(listId);
  }, [canView, listId, loadYears]);

  // States and districts are only needed by the Light House Master form
  useEffect(() => {
    if (sectionId === 'lightHouseMaster' && activeTab === 'add') loadLookups();
  }, [sectionId, activeTab, loadLookups]);

  // Search applies 300 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => listActions.setDebouncedSearch(listSlice.searchTerm), 300);
    return () => clearTimeout(timer);
  }, [listSlice.searchTerm, listActions]);

  // Fetched rows are tagged with the request they answer; a mismatch means it is still loading.
  // Only the latest request may update them (an older response can arrive last).
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null);
  // Light House Master's Active / Inactive counts, kept on screen while its next page loads
  const [lhCounts, setLhCounts] = useState(EMPTY_COUNTS);
  const latestRequestRef = useRef(0);
  const { debouncedSearch, currentPage, pageSize, status, financialYear } = listSlice;
  // Light House Master filters by status; the other lists by year
  const filter = useMemo(
    () => (listId === 'lightHouseMaster' ? { status } : { financialYear }),
    [listId, status, financialYear],
  );
  const requestKey = JSON.stringify([listId, debouncedSearch, filter, currentPage, pageSize, reloadKey]);

  useEffect(() => {
    if (!canView || activeTab !== 'list') return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    list.fetchList({ page: currentPage, limit: pageSize, search: debouncedSearch, ...filter })
      .then((res) => {
        if (isStale()) return;
        setResult({ key: requestKey, rows: res.data?.data || [], pagination: res.data?.pagination || { ...EMPTY_PAGINATION, limit: pageSize } });
        if (res.data?.counts) setLhCounts(res.data.counts);
      })
      .catch((err) => {
        if (isStale()) return;
        console.error(`Error loading DGLL ${list.name}:`, err);
        setResult({ key: requestKey, rows: [], pagination: { ...EMPTY_PAGINATION, limit: pageSize } });
        notify(COMMON_TOASTS.loadFailed(`${list.name} entries`));
      });
  }, [requestKey, canView, activeTab, list, currentPage, pageSize, debouncedSearch, filter, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];
  const pagination = result?.pagination ?? { ...EMPTY_PAGINATION, limit: pageSize };

  // A deleted row can leave the page empty; step back so the list doesn't look blank
  useEffect(() => {
    if (!loading && rows.length === 0 && currentPage > 1) listActions.setCurrentPage(currentPage - 1);
  }, [loading, rows.length, currentPage, listActions]);

  const handleEdit = useCallback((row) => {
    go(sectionId, 'add', { section: sectionId, list: listId, item: row });
  }, [go, sectionId, listId]);

  const handleDelete = useCallback((row) => {
    const period = list.period(row);
    if (!window.confirm(`Delete the ${list.name} entry for ${period}? This cannot be undone.`)) return;
    list.remove(row[list.idField], getCurrentUserId())
      .then(() => {
        notify(DGLL_TOASTS.deleted(list.name, period));
        setReloadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error(`Error deleting DGLL ${list.name} entry:`, err);
        notify(DGLL_TOASTS.deleteFailed(getErrorMessage(err)));
      });
  }, [list, notify]);

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
    return <RestrictedAccess moduleName="KPI - DGLL" />;
  }

  const { DataList, InputForm, Reports } = section;
  const editKey = editData ? `${editList}-${editData[LISTS[editList]?.idField]}` : 'new';
  // Tourist Destinations edits either table from one form
  const formProps = sectionId === 'touristDestinations'
    ? {
      destinationEditData: editList === 'touristDestinations' ? editData : null,
      targetEditData: editList === 'touristTargets' ? editData : null,
    }
    : { editData, states, districts };

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5">
        <div className="module-header-container">
          <div>
            <h1 className="module-header-title">KPI - DGLL</h1>
            <p className="module-header-subtitle">Directorate General of Lighthouses & Lightships -- track KPI data across all sections.</p>
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
          key={`${sectionId}-${editKey}`}
          {...formProps}
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
          statusFilter={status}
          onStatusChange={(next) => listActions.setFilters({ status: next })}
          counts={lhCounts}
          activeTable={touristTable}
          onTableChange={setTouristTable}
          visibleCols={listSlice.visibleCols}
          onVisibleColsChange={listActions.setVisibleCols}
          notify={notify}
        />
      )}
    </div>
  );
}
