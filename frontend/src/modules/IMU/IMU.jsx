import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { GraduationCap, BookOpen, Building2, Handshake, FlaskConical, Users } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import StudentEnrollmentDataList from './components/StudentEnrollmentDataList';
import FinalYearPassPercentageDataList from './components/FinalYearPassPercentageDataList';
import NewCourseUpgradationDataList from './components/NewCourseUpgradationDataList';
import FacilitiesDataList from './components/FacilitiesDataList';
import PartnershipDataList from './components/PartnershipDataList';
import ResearchDataList from './components/ResearchDataList';
import StudentEnrollmentInputForm from './pages/StudentEnrollment/InputForm';
import StudentEnrollmentReports from './pages/StudentEnrollment/Reports';
import FinalYearPassPercentageInputForm from './pages/FinalYearPassPercentage/InputForm';
import FinalYearPassPercentageReports from './pages/FinalYearPassPercentage/Reports';
import NewCourseUpgradationInputForm from './pages/NewCourseUpgradation/InputForm';
import NewCourseUpgradationReports from './pages/NewCourseUpgradation/Reports';
import FacilitiesInputForm from './pages/Facilities/InputForm';
import FacilitiesReports from './pages/Facilities/Reports';
import PartnershipInputForm from './pages/Partnership/InputForm';
import PartnershipReports from './pages/Partnership/Reports';
import ResearchInputForm from './pages/Research/InputForm';
import ResearchReports from './pages/Research/Reports';
import { useIMUPermissions } from './hooks/useIMUPermissions';
import { useImuStore } from './store/useImuStore';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { IMU_TOASTS } from './toastMessages';
import {
  fetchStudentEnrollment, deleteStudentEnrollment,
  fetchFinalYearPassPercentage, deleteFinalYearPassPercentage,
  fetchNewCourseUpgradation, deleteNewCourseUpgradation,
  fetchFacilities, deleteFacilities,
  fetchPartnership, deletePartnership,
  fetchResearch, deleteResearch,
} from './api';

const byYear = (r) => r.financial_year;

// The IMU KPI sections (K-5.1 to K-5.5; Final Year Pass % is K-5.1.1): what each one fetches,
// deletes and renders. `name` is used in messages; `period` names a row in the delete confirmation.
// `paged`: the server pages and searches the list. Final Year Pass % returns every row and
// is searched and paged in the browser by its Data List.
const SECTIONS = [
  { id: 'studentEnrollment', code: 'K-5.1', label: 'IMU - Student Enrollment', name: 'Student Enrollment', icon: GraduationCap, paged: true,
    fetchList: fetchStudentEnrollment, remove: deleteStudentEnrollment, idField: 'student_id', period: byYear,
    DataList: StudentEnrollmentDataList, InputForm: StudentEnrollmentInputForm, Reports: StudentEnrollmentReports },
  { id: 'finalYearPassPercentage', code: 'K-5.1.1', label: 'IMU - Final Year Pass %', name: 'Final Year Pass Percentage', icon: Users, paged: false,
    fetchList: () => fetchFinalYearPassPercentage().then((res) => ({ data: { data: res.data || [], pagination: null } })),
    remove: deleteFinalYearPassPercentage, idField: 'id', period: (r) => `${r.programme} ${r.batch}`,
    DataList: FinalYearPassPercentageDataList, InputForm: FinalYearPassPercentageInputForm, Reports: FinalYearPassPercentageReports },
  { id: 'newCourseUpgradation', code: 'K-5.2', label: 'IMU - New Courses & Upgradation', name: 'New Course Upgradation', icon: BookOpen, paged: true,
    fetchList: fetchNewCourseUpgradation, remove: deleteNewCourseUpgradation, idField: 'course_id', period: byYear,
    DataList: NewCourseUpgradationDataList, InputForm: NewCourseUpgradationInputForm, Reports: NewCourseUpgradationReports },
  { id: 'facilities', code: 'K-5.3', label: 'IMU - Facilities', name: 'Facilities', icon: Building2, paged: true,
    fetchList: fetchFacilities, remove: deleteFacilities, idField: 'facilities_id', period: byYear,
    DataList: FacilitiesDataList, InputForm: FacilitiesInputForm, Reports: FacilitiesReports },
  { id: 'partnership', code: 'K-5.4', label: 'IMU - Partnerships/MoUs', name: 'Partnership', icon: Handshake, paged: true,
    fetchList: fetchPartnership, remove: deletePartnership, idField: 'partnership_id', period: byYear,
    DataList: PartnershipDataList, InputForm: PartnershipInputForm, Reports: PartnershipReports },
  { id: 'research', code: 'K-5.5', label: 'IMU - Research, Innovation & Startups', name: 'Research', icon: FlaskConical, paged: true,
    fetchList: fetchResearch, remove: deleteResearch, idField: 'research_id', period: byYear,
    DataList: ResearchDataList, InputForm: ResearchInputForm, Reports: ResearchReports },
];
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const TAB_IDS = ['add', 'list', 'report'];
const EMPTY_PAGINATION = { total: 0, page: 1, limit: 10, totalPages: 0 };

export default function IMUView({ triggerNotification }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotifier(triggerNotification);
  const { canAdd, canEdit, canView, canRemove } = useIMUPermissions();

  // Section and tab live in the URL (?section=&tab=), so refresh, bookmarks and Back work
  const sectionId = SECTION_BY_ID[searchParams.get('section')] ? searchParams.get('section') : 'studentEnrollment';
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
  const listSlice = useImuStore((state) => state[sectionId]);
  const listActions = useImuStore((state) => state[`${sectionId}Actions`]);
  const years = useImuStore((state) => state.years[sectionId]);
  const loadYears = useImuStore((state) => state.loadYears);

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
  // Final Year Pass % is fetched whole; its search and paging happen in the browser
  const requestKey = JSON.stringify(section.paged
    ? [sectionId, debouncedSearch, financialYear, currentPage, pageSize, reloadKey]
    : [sectionId, reloadKey]);

  useEffect(() => {
    if (!canView || activeTab !== 'list') return;
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    section.fetchList({ page: currentPage, limit: pageSize, search: debouncedSearch, financialYear })
      .then((res) => {
        if (isStale()) return;
        setResult({ key: requestKey, rows: res.data?.data || [], pagination: res.data?.pagination || { ...EMPTY_PAGINATION, limit: pageSize } });
      })
      .catch((err) => {
        if (isStale()) return;
        console.error(`Error loading IMU ${section.name}:`, err);
        setResult({ key: requestKey, rows: [], pagination: { ...EMPTY_PAGINATION, limit: pageSize } });
        notify(COMMON_TOASTS.loadFailed(`${section.name} entries`));
      });
  }, [requestKey, canView, activeTab, section, currentPage, pageSize, debouncedSearch, financialYear, notify]);

  const loading = result?.key !== requestKey;
  const rows = result?.rows ?? [];
  const pagination = result?.pagination ?? { ...EMPTY_PAGINATION, limit: pageSize };

  // A deleted row can leave the page empty; step back so the list doesn't look blank
  useEffect(() => {
    if (section.paged && !loading && rows.length === 0 && currentPage > 1) listActions.setCurrentPage(currentPage - 1);
  }, [section.paged, loading, rows.length, currentPage, listActions]);

  const handleEdit = useCallback((row) => {
    go(sectionId, 'add', { section: sectionId, item: row });
  }, [go, sectionId]);

  const handleDelete = useCallback((row) => {
    const period = section.period(row);
    if (!window.confirm(`Delete the ${section.name} entry for ${period}? This cannot be undone.`)) return;
    section.remove(row[section.idField], getCurrentUserId())
      .then(() => {
        notify(IMU_TOASTS.deleted(section.name, period));
        setReloadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error(`Error deleting IMU ${section.name} entry:`, err);
        notify(IMU_TOASTS.deleteFailed(getErrorMessage(err)));
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
    return <RestrictedAccess moduleName="KPI - IMU" />;
  }

  const { DataList, InputForm, Reports } = section;

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5">
        <div className="module-header-container">
          <div>
            <h1 className="module-header-title">KPI - IMU</h1>
            <p className="module-header-subtitle">Indian Maritime University -- track KPI data across all sections.</p>
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
          pagination={pagination}
          onPageChange={listActions.setCurrentPage}
          searchQuery={listSlice.searchTerm}
          onSearchChange={listActions.setSearchTerm}
          financialYear={financialYear}
          onFinancialYearChange={(fy) => listActions.setFilters({ financialYear: fy })}
          years={years || []}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageSizeChange={listActions.setPageSize}
          visibleCols={listSlice.visibleCols}
          onVisibleColsChange={listActions.setVisibleCols}
          notify={notify}
        />
      )}
    </div>
  );
}
