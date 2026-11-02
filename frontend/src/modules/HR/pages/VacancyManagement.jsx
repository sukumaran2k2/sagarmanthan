import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
  Calendar,
  Clock,
  User,
  FileSpreadsheet,
  Save
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import MultiSelect from '../../../components/MultiSelect';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { useShallow } from 'zustand/react/shallow';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import VacantDetails from './VacantDetails';
import { CLASS_ID } from '../utils/hrAdministration';
import { HrFilterPanel, FilterField, DeptPostClassFilters } from '../components/HrFilterPanel';
import { classChangeUpdate } from '../hooks/useHrFilterOptions';
import VacancyActivityModal from '../components/VacancyActivityModal';
import { EditActionButton, PostCodeTag } from '../components/HrFormControls';
import {
  fetchHrPostsByDepartment,
  fetchVacancyOverviewPage,
  fetchAnticipatedVacanciesPage,
  submitHrAnticipatedVacancies,
  fetchHrAllData
} from '../api';
import { alignHrColumns } from '../utils/tableAlignment';
import { createTableExporter, fetchAllRows } from '../utils/exportTable';
import { useDebouncedSearch, useLatestRef, usePagedList } from '../hooks/usePagedList';
import { CURRENT_YEAR, useHrStore } from '../store/useHrStore';

// ─────────────────────────── constants ───────────────────────────

const OVERVIEW_COL_LABELS = {
  sNo: 'S.No', department: 'Department', post_id: 'Post ID', class: 'Class', post_name: 'Post Name',
  sanctioned: 'Sanctioned', actual: 'Actual', live_post: 'Vacancy - Live',
  abolished_post: 'Vacancy - Abolished', total_vacant_post: 'Vacancy - Total',
  have_abolished_or_not: 'Have Abolished or Not?'
};

const ANTICIPATED_COL_LABELS = {
  sNo: 'S.No', department_name: 'Department', post_id: 'Post ID', class: 'Class', post_name: 'Post Name',
  post_code: 'Post Code', expected_method: 'Expected Method of Filling (as per RR)',
  anticipated_date: 'Anticipated Vacancy Date', current_occupant: 'Current Occupant',
  retirement_date: 'Date of Retirement', last_updated: 'Last Updated Date', action: 'Action'
};

const AVAILABLE_YEARS = Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() + i).toString());
const YEAR_OPTIONS = AVAILABLE_YEARS.map((y) => ({ value: y, label: y }));

// Vacancy count that opens the post's vacancy list. Zero is plain text: there is nothing to open.
const CHIP_TONES = {
  live: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60',
  abolished: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60',
};

// Rows have a fixed height (see ROW_HEIGHT) so long post names are clamped to two lines.
const ROW_HEIGHT = 52;

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  // Server dates arrive as ISO strings; take the stored calendar date (DATETIME values are
  // server-local tagged 'Z', so new Date() would move evening saves to the next day).
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

// Overview row from /hr/vacancy-overview -> fields the grid and exports use.
const toOverviewRow = (item) => {
  const isAbolished = Number(item.abolishing_this_month) === 1;
  return {
    ...item,
    is_abolished: isAbolished,
    have_abolished_or_not: isAbolished ? 'Yes' : 'No',
    sanctioned: item.sanctioned_strength ?? 0,
    actual: item.filled_post ?? 0,
    calculated_total_vacant: item.total_vacant_post != null
      ? item.total_vacant_post
      : (Number(item.live_post) || 0) + (Number(item.abolished_post) || 0),
  };
};

// Anticipated vacancies: unsaved choices are keyed by post code.
const anticipatedKey = (row) => row.post_code || row.post_id;

// Export field per visibility key (S.No is added by the exporter).
const OVERVIEW_EXPORT_FIELDS = {
  department: 'department', post_id: 'post_id', class: 'class', post_name: 'post_name', sanctioned: 'sanctioned', actual: 'actual',
  live_post: 'live_post', abolished_post: 'abolished_post', total_vacant_post: 'calculated_total_vacant',
  have_abolished_or_not: 'have_abolished_or_not',
};

function PostNameCell({ value }) {
  return (
    <span title={value || ''} className="line-clamp-2 whitespace-normal break-words leading-[18px] font-semibold text-slate-800 dark:text-slate-200">
      {value || '--'}
    </span>
  );
}

function VacancyCountChip({ count, tone, onOpen }) {
  const n = Number(count) || 0;
  if (n === 0) return <span className="text-slate-400 dark:text-slate-500">0</span>;
  const label = tone === 'live' ? 'live' : 'abolished';
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`View ${n} ${label} vacanc${n === 1 ? 'y' : 'ies'}`}
      className={`inline-flex h-7 min-w-11 items-center justify-center gap-0.5 rounded-md border pl-2.5 pr-1.5 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${CHIP_TONES[tone]}`}
    >
      {n}
      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}

// ─────────────────────────── component ───────────────────────────

const OVERVIEW_VISIBLE = {
  sNo: true, department: true, post_id: false, class: false, post_name: true, sanctioned: true,
  actual: true, live_post: true, abolished_post: true, total_vacant_post: true,
  have_abolished_or_not: false
};
const ANTICIPATED_VISIBLE = {
  sNo: true, department_name: true, post_id: false, class: false, post_name: true, post_code: true,
  expected_method: true, anticipated_date: true, current_occupant: true,
  retirement_date: false, last_updated: false, action: true
};

// departments: reference data loaded once by the HR shell (store)
export default function VacancyManagement({ notify, permissions, departments = [] }) {
  const { orgId, userId, orgName: sessionOrgName } = permissions;
  const orgName = sessionOrgName || 'Organisation';
  const userCanEdit = permissions.canEdit;

  // The shell's notifier changes identity on every App render; keep a stable wrapper so
  // loaders that report errors do not refetch after each toast. Takes a toast definition.
  const notifyRef = useLatestRef(notify);
  const sendNotification = useCallback((toast) => notifyRef.current?.(toast), [notifyRef]);

  // ── tab, filters, search and paging live in the HR list store (one slice per tab),
  // so they survive switching tabs and HR pages
  const activeTab = useHrStore((state) => state.vacancyTab);
  const setActiveTab = useHrStore((state) => state.setVacancyTab);
  const overviewList = useHrStore(useShallow((state) => state.overview));
  const overviewActions = useHrStore((state) => state.overviewActions);
  const anticipatedList = useHrStore(useShallow((state) => state.anticipated));
  const anticipatedActions = useHrStore((state) => state.anticipatedActions);
  const isOverview = activeTab === 'overview';
  const list = isOverview ? overviewList : anticipatedList;
  const actions = isOverview ? overviewActions : anticipatedActions;
  const { departmentId, postId, className, searchTerm, showFilterPanel } = list;
  const { abolishingOnly } = overviewList;
  const selectedYears = anticipatedList.years;

  // ── drill-down into vacant details
  const [selectedVacantDetail, setSelectedVacantDetail] = useState(null);

  // ── loading
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── unsaved "expected method" choices, kept across pages; only these rows are submitted.
  // post_code -> { value, department_id, post_id, post_code }
  const [anticipatedEdits, setAnticipatedEdits] = useState({});

  // ── filter options (departments come from the shell)
  // Posts of the selected department (tagged with it so a stale list is never shown).
  const [deptPosts, setDeptPosts] = useState({ deptId: '', list: [] });

  // ── column visibility dropdowns
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Column visibility lives in the store (only the user's changes, merged over the defaults)
  const visibleColsOverview = useMemo(() => ({ ...OVERVIEW_VISIBLE, ...overviewList.visibleCols }), [overviewList.visibleCols]);
  const visibleColsAnticipated = useMemo(() => ({ ...ANTICIPATED_VISIBLE, ...anticipatedList.visibleCols }), [anticipatedList.visibleCols]);

  // ── Activity Modal for Anticipated Vacancies
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedAnticipatedRow, setSelectedAnticipatedRow] = useState(null);
  const [selectedExpectedMethod, setSelectedExpectedMethod] = useState('');

  const currentMonthName = useMemo(() => new Date().toLocaleString('default', { month: 'long' }), []);

  // ── Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── 2. Posts per department
  useEffect(() => {
    if (!departmentId || !orgId) return undefined;
    let alive = true;
    fetchHrPostsByDepartment(departmentId, orgId)
      .then(r => { if (alive) setDeptPosts({ deptId: departmentId, list: Array.isArray(r.data) ? r.data : (r.data?.data || []) }); })
      .catch(() => { if (alive) setDeptPosts({ deptId: departmentId, list: [] }); });
    return () => { alive = false; };
  }, [departmentId, orgId]);
  const deptPostsList = departmentId && deptPosts.deptId === departmentId ? deptPosts.list : [];
  // The Post filter offers only posts of the chosen class, so it can't pick a post that never matches
  const postsList = className
    ? deptPostsList.filter(p => Number(p.class_id) === CLASS_ID[className])
    : deptPostsList;

  // ── 3. Server-paged lists (organisation comes from the login on the server).
  // Each tab keeps its own search, filters and page; both load so the tab labels show totals.
  useDebouncedSearch(overviewList.searchTerm, overviewActions.setDebouncedSearch);
  useDebouncedSearch(anticipatedList.searchTerm, anticipatedActions.setDebouncedSearch);

  // One params object per list: page, limit and only the filters that are set
  const overviewParams = useMemo(() => {
    const { currentPage, pageSize, debouncedSearch } = overviewList;
    const query = { page: currentPage, limit: pageSize };
    if (overviewList.departmentId) query.departmentId = overviewList.departmentId;
    if (overviewList.postId) query.postId = overviewList.postId;
    if (overviewList.className) query.className = overviewList.className;
    if (overviewList.abolishingOnly) query.abolishingOnly = true;
    if (debouncedSearch) {
      query.search = debouncedSearch;
      if (overviewList.exactMatch) query.exact = true;
    }
    return query;
  }, [overviewList]);
  const anticipatedParams = useMemo(() => {
    const { currentPage, pageSize, debouncedSearch, years } = anticipatedList;
    const query = { page: currentPage, limit: pageSize, years: (years.length ? years : [CURRENT_YEAR]).join(',') };
    if (anticipatedList.departmentId) query.departmentId = anticipatedList.departmentId;
    if (anticipatedList.postId) query.postId = anticipatedList.postId;
    if (anticipatedList.className) query.className = anticipatedList.className;
    if (debouncedSearch) query.search = debouncedSearch;
    return query;
  }, [anticipatedList]);

  const onListError = useCallback(
    (err) => {
      console.error(err);
      sendNotification(COMMON_TOASTS.loadFailed(isOverview ? 'The vacancy overview' : 'Anticipated vacancies'));
    },
    [sendNotification, isOverview]
  );
  const overview = usePagedList({ scope: 'overview', params: overviewParams, request: fetchVacancyOverviewPage, onError: onListError });
  const anticipated = usePagedList({ scope: 'anticipated', params: anticipatedParams, request: fetchAnticipatedVacanciesPage, onError: onListError });
  const activeList = isOverview ? overview : anticipated;
  // Copy / export only what is on screen once the newest page has arrived
  const busy = activeList.loading || activeList.refreshing;

  // After a change empties the last page, step back to the new last page
  useEffect(() => {
    if (overview.totalPages > 0 && overviewList.currentPage > overview.totalPages) overviewActions.setCurrentPage(overview.totalPages);
  }, [overview.totalPages, overviewList.currentPage, overviewActions]);
  useEffect(() => {
    if (anticipated.totalPages > 0 && anticipatedList.currentPage > anticipated.totalPages) anticipatedActions.setCurrentPage(anticipated.totalPages);
  }, [anticipated.totalPages, anticipatedList.currentPage, anticipatedActions]);

  const handleTabChange = (tab) => setActiveTab(tab);

  const handleResetFilters = () => {
    actions.resetFilters();
    actions.setSearchTerm('');
    sendNotification(COMMON_TOASTS.filtersReset());
  };

  const activeFiltersCount =
    (departmentId ? 1 : 0) + (className ? 1 : 0) + (postId ? 1 : 0) +
    (isOverview && abolishingOnly ? 1 : 0) +
    (!isOverview && (selectedYears.length !== 1 || selectedYears[0] !== CURRENT_YEAR) ? 1 : 0);

  const abolishingCount = overview.extra?.counts?.abolishingThisMonth ?? 0;

  // ─────────── Open Action popup from ANTICIPATED row (vacancy activities) ───────────
  const handleOpenActivityModal = useCallback((row) => {
    const edit = anticipatedEdits[anticipatedKey(row)];
    const expectedMethod = edit ? edit.value : (row.expected_anticipated_vacancy || row.expected_method || '');

    if (!expectedMethod || !expectedMethod.trim() || expectedMethod.toLowerCase().startsWith('-- select')) {
      sendNotification(HR_TOASTS.expectedMethodRequired());
      return;
    }

    setSelectedAnticipatedRow(row);
    setSelectedExpectedMethod(expectedMethod);
    setShowActivityModal(true);
  }, [anticipatedEdits, sendNotification]);

  // ─────────── Submit Anticipated Vacancies (expected method per post) ───────────
  const handleSubmitAnticipated = async () => {
    // Posts changed on any page (saved choices are already stored on the server).
    const tableData = Object.values(anticipatedEdits)
      .filter((e) => e.value)
      .map((e) => ({ department_id: e.department_id, post_id: e.post_id, post_code: e.post_code, expected_anticipated_vacancy: e.value }));
    if (!tableData.length) { sendNotification(HR_TOASTS.noAnticipatedChanges()); return; }
    if (!userId || !orgId) { sendNotification(HR_TOASTS.sessionExpired()); return; }
    setIsSubmitting(true);
    try {
      await submitHrAnticipatedVacancies({ organisationID: orgId, userID: userId, tableData });
      sendNotification(HR_TOASTS.anticipatedSaved(tableData.length));
      setAnticipatedEdits({});
      anticipated.reload();
    } catch (err) { sendNotification(HR_TOASTS.anticipatedSaveFailed(getErrorMessage(err))); }
    finally { setIsSubmitting(false); }
  };

  // ─────────── Export All ───────────
  const handleExportAllHRData = async () => {
    setIsExportingAll(true);
    try {
      const r = await fetchHrAllData(orgId);
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      if (!raw.length) { sendNotification(HR_TOASTS.noDataToExport()); return; }
      // Written as received: /get-hr-all-data already formats its dates as dd/mm/yyyy text
      // (SQL style 103). Re-parsing them with new Date() reads them month-first, so 05/03/2020
      // became 3 May and 15/03/2020 was lost.
      const ws = XLSX.utils.json_to_sheet(raw);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HR Post Data');
      const now = new Date();
      const fileName = `HR_Post_Data_${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      sendNotification(HR_TOASTS.hrDataExported(fileName));
    } catch (err) { sendNotification(HR_TOASTS.hrDataExportFailed(getErrorMessage(err))); }
    finally { setIsExportingAll(false); }
  };

  // ─────────── Current page rows (S.No continues across pages) ───────────
  const overviewStart = (overviewList.currentPage - 1) * overviewList.pageSize;
  const anticipatedStart = (anticipatedList.currentPage - 1) * anticipatedList.pageSize;
  const overviewRows = useMemo(
    () => overview.rows.map((item, i) => ({ ...toOverviewRow(item), sNo: overviewStart + i + 1 })),
    [overview.rows, overviewStart]
  );
  const anticipatedRows = useMemo(
    () => anticipated.rows.map((item, i) => ({ ...item, sNo: anticipatedStart + i + 1 })),
    [anticipated.rows, anticipatedStart]
  );
  const paginatedRows = isOverview ? overviewRows : anticipatedRows;
  const { currentPage, pageSize } = list;
  const { total: totalCount, totalPages } = activeList;

  // ─────────── Column defs ───────────

  const openVacantDetail = (item, isLive) => {
    if (!item) return;
    setSelectedVacantDetail({
      postId: item.post_id,
      postName: item.post_name,
      departmentName: item.department,
      className: item.class || 'General',
      sanctionedStrength: item.sanctioned,
      filledPost: item.actual,
      livePost: item.live_post,
      abolishedPost: item.abolished_post,
      totalVacantPost: item.total_vacant_post,
      isLive,
    });
  };

  // Overview columns
  const columnDefsOverview = useMemo(() => [
    {
      field: 'sNo', headerName: 'S.No', minWidth: 80, maxWidth: 90, pinned: 'left',
      headerClass: 'text-center', cellClass: 'text-center font-bold flex items-center justify-center',
      hide: !visibleColsOverview.sNo,
      cellRenderer: (p) => {
        const item = p.data; if (!item) return null;
        return (
          <div className="flex items-center justify-center gap-1.5 w-full">
            <span>{item.sNo}</span>
            {item.is_abolished && <span title="To be abolished" className="h-2 w-2 rounded-full bg-rose-500 inline-block shrink-0" />}
          </div>
        );
      }
    },
    {
      field: 'department', headerName: 'Department', flex: 1.5, minWidth: 160, hide: !visibleColsOverview.department,
      cellClass: 'flex items-center',
      cellRenderer: (p) => (
        <span title={p.value || ''} className="w-full text-left line-clamp-2 whitespace-normal break-words leading-[18px] font-semibold text-slate-800 dark:text-slate-200">
          {p.value || '--'}
        </span>
      )
    },
    {
      field: 'post_id', headerName: 'Post ID', minWidth: 110, maxWidth: 130, headerClass: 'text-center',
      cellClass: 'text-center font-mono flex items-center justify-center', hide: !visibleColsOverview.post_id,
      cellRenderer: (p) => <span className="text-center w-full">{p.value || '--'}</span>
    },
    {
      field: 'class', headerName: 'Class', flex: 0.8, minWidth: 95, headerClass: 'text-center',
      cellClass: 'text-center flex items-center justify-center', hide: !visibleColsOverview.class,
      cellRenderer: (p) => <span className="text-center w-full">{p.value || 'General'}</span>
    },
    {
      field: 'post_name', headerName: 'Post Name', flex: 2, minWidth: 220,
      cellClass: 'flex items-center justify-center text-center',
      hide: !visibleColsOverview.post_name,
      cellRenderer: (p) => <PostNameCell value={p.value} />
    },
    {
      field: 'sanctioned', headerName: 'Sanctioned', flex: 1, minWidth: 120, headerClass: 'text-center',
      cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsOverview.sanctioned,
      cellRenderer: (p) => <span>{p.value ?? 0}</span>
    },
    {
      field: 'actual', headerName: 'Actual', flex: 1, minWidth: 110, headerClass: 'text-center',
      cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsOverview.actual,
      cellRenderer: (p) => <span>{p.value ?? 0}</span>
    },
    {
      headerName: 'Vacancy', headerClass: 'text-center font-bold', children: [
        {
          field: 'live_post', headerName: 'Live', flex: 1, minWidth: 100, headerClass: 'text-center',
          cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsOverview.live_post,
          cellRenderer: (p) => <VacancyCountChip count={p.value} tone="live" onOpen={() => openVacantDetail(p.data, 1)} />
        },
        {
          field: 'abolished_post', headerName: 'Abolished', flex: 1, minWidth: 110, headerClass: 'text-center',
          cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsOverview.abolished_post,
          cellRenderer: (p) => <VacancyCountChip count={p.value} tone="abolished" onOpen={() => openVacantDetail(p.data, 0)} />
        },
        {
          field: 'calculated_total_vacant', headerName: 'Total', flex: 1, minWidth: 100, headerClass: 'text-center',
          cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsOverview.total_vacant_post,
          cellRenderer: (p) => <span>{p.value ?? 0}</span>
        }
      ]
    },
    {
      field: 'have_abolished_or_not', headerName: 'Have Abolished or Not?', flex: 1.2, minWidth: 180,
      headerClass: 'text-center', cellClass: 'text-center font-semibold flex items-center justify-center',
      hide: !visibleColsOverview.have_abolished_or_not,
      cellRenderer: (p) => <span>{p.data?.is_abolished ? 'Yes' : 'No'}</span>
    }
  ], [visibleColsOverview]);

  // Anticipated columns (employees retiring this year)
  const columnDefsAnticipated = useMemo(() => [
    {
      field: 'sNo', headerName: 'S.No', minWidth: 70, maxWidth: 80, pinned: 'left',
      headerClass: 'text-center', cellClass: 'text-center font-bold flex items-center justify-center',
      hide: !visibleColsAnticipated.sNo, cellRenderer: (p) => <span className="text-center w-full">{p.data?.sNo}</span>
    },
    {
      field: 'department_name', headerName: 'Department', flex: 1.2, minWidth: 140, headerClass: 'text-center',
      cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsAnticipated.department_name,
      cellRenderer: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200 text-center w-full">{p.value || '--'}</span>
    },
    {
      field: 'post_id', headerName: 'Post ID', minWidth: 110, maxWidth: 130, headerClass: 'text-center',
      cellClass: 'text-center font-mono flex items-center justify-center', hide: !visibleColsAnticipated.post_id,
      cellRenderer: (p) => <span className="text-center w-full">{p.value || '--'}</span>
    },
    {
      field: 'class', headerName: 'Class', flex: 0.8, minWidth: 95, headerClass: 'text-center',
      cellClass: 'text-center font-semibold flex items-center justify-center', hide: !visibleColsAnticipated.class,
      cellRenderer: (p) => <span className="text-center w-full">{p.value || 'General'}</span>
    },
    {
      field: 'post_name', headerName: 'Post Name', flex: 2, minWidth: 200,
      headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center',
      hide: !visibleColsAnticipated.post_name,
      cellRenderer: (p) => <PostNameCell value={p.value} />
    },
    {
      field: 'post_code', headerName: 'Post Code', flex: 1.1, minWidth: 150, headerClass: 'text-center',
      cellClass: 'text-center font-bold flex items-center justify-center', hide: !visibleColsAnticipated.post_code,
      cellRenderer: (p) => (
        <PostCodeTag>{p.value}</PostCodeTag>
      )
    },
    {
      field: 'expected_method', headerName: 'Expected Method of Filling (as per RR)', flex: 1.6, minWidth: 220,
      headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center py-1',
      hide: !visibleColsAnticipated.expected_method,
      cellRenderer: (p) => {
        const row = p.data; if (!row) return null;
        const key = anticipatedKey(row);
        const val = anticipatedEdits[key] ? anticipatedEdits[key].value : (row.expected_anticipated_vacancy || '');
        return (
          <div className="py-1 w-full flex justify-center">
            <select
              value={val}
              onChange={e => {
                const value = e.target.value;
                setAnticipatedEdits(prev => ({
                  ...prev,
                  [key]: { value, department_id: row.department_id, post_id: row.post_id, post_code: row.post_code },
                }));
              }}
              disabled={!userCanEdit}
              className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-60 text-center cursor-pointer"
            >
              <option value="">-- Select Expected Method of Filling --</option>
              <option value="Direct Recruitment">Direct Recruitment</option>
              <option value="Promotion">Promotion</option>
            </select>
          </div>
        );
      }
    },
    {
      field: 'Anticipated_date', headerName: 'Anticipated Vacancy Date', flex: 1.1, minWidth: 140,
      headerClass: 'text-center', cellClass: 'text-center font-extrabold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5',
      hide: !visibleColsAnticipated.anticipated_date,
      cellRenderer: (p) => <span className="flex items-center justify-center gap-1.5 w-full font-extrabold text-blue-600 dark:text-blue-400"><Clock size={13} /><span>{formatDate(p.value)}</span></span>
    },
    {
      field: 'emp_name', headerName: 'Current Occupant', flex: 1.2, minWidth: 140,
      headerClass: 'text-center', cellClass: 'text-center font-semibold flex items-center justify-center gap-1.5',
      hide: !visibleColsAnticipated.current_occupant,
      cellRenderer: (p) => <span className="flex items-center justify-center gap-1.5 w-full font-semibold"><User size={13} className="text-slate-400 shrink-0" /><span>{p.value || 'Vacant / None'}</span></span>
    },
    {
      field: 'emp_dor', headerName: 'Date of Retirement', flex: 1.1, minWidth: 140,
      headerClass: 'text-center', cellClass: 'text-center font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5',
      hide: !visibleColsAnticipated.retirement_date,
      cellRenderer: (p) => <span className="flex items-center justify-center gap-1.5 w-full font-bold text-amber-600 dark:text-amber-400"><Calendar size={13} className="shrink-0" /><span>{formatDate(p.value)}</span></span>
    },
    {
      // When the post's vacancy record was last changed (created date if never updated)
      field: 'updated_date', headerName: 'Last Updated Date', flex: 1, minWidth: 130, headerClass: 'text-center',
      cellClass: 'text-center flex items-center justify-center', hide: !visibleColsAnticipated.last_updated,
      valueGetter: (p) => p.data?.updated_date || p.data?.created_date || null,
      cellRenderer: (p) => <span className="text-center w-full">{formatDate(p.value)}</span>
    },
    {
      field: 'action', headerName: 'Action', flex: 0.9, minWidth: 110, pinned: 'right',
      headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center py-1',
      hide: !visibleColsAnticipated.action,
      cellRenderer: (p) => {
        const row = p.data; if (!row) return null;
        return (
          <div className="flex items-center justify-center w-full">
            <EditActionButton label={`Update activity for ${row.post_code || 'post'}`} onClick={() => handleOpenActivityModal(row)} disabled={!userCanEdit} />
          </div>
        );
      }
    }
  ], [visibleColsAnticipated, anticipatedEdits, userCanEdit, handleOpenActivityModal]);

  const activeColLabels = activeTab === 'overview' ? OVERVIEW_COL_LABELS : ANTICIPATED_COL_LABELS;
  const activeVisibleCols = activeTab === 'overview' ? visibleColsOverview : visibleColsAnticipated;
  // Toggle one column of the active tab (the store keeps the user's changes)
  const setActiveVisibleCols = (updater) => actions.setVisibleCols((prev) => ({ ...prev, ...updater(activeVisibleCols) }));
  const activeColumnDefs = activeTab === 'overview' ? columnDefsOverview : columnDefsAnticipated;

  // ─────────── Copy / Export: every row matching the filters, visible columns only ───────────
  const exportColumns = () => {
    if (activeTab === 'overview') {
      return Object.keys(OVERVIEW_EXPORT_FIELDS)
        .filter((k) => visibleColsOverview[k])
        .map((k) => ({ field: OVERVIEW_EXPORT_FIELDS[k], label: OVERVIEW_COL_LABELS[k] }));
    }
    const fields = {
      department_name: { field: 'department_name' },
      post_id: { field: 'post_id' },
      class: { field: 'class' },
      post_name: { field: 'post_name' },
      post_code: { field: 'post_code' },
      expected_method: {
        field: 'expected_method',
        value: (r) => anticipatedEdits[anticipatedKey(r)]?.value ?? r.expected_anticipated_vacancy ?? '',
      },
      anticipated_date: { field: 'Anticipated_date', value: (r) => formatDate(r.Anticipated_date) },
      current_occupant: { field: 'emp_name' },
      retirement_date: { field: 'emp_dor', value: (r) => formatDate(r.emp_dor) },
      last_updated: { field: 'updated_date', value: (r) => formatDate(r.updated_date || r.created_date) },
    };
    return Object.keys(fields)
      .filter((k) => visibleColsAnticipated[k])
      .map((k) => ({ ...fields[k], label: ANTICIPATED_COL_LABELS[k] }));
  };
  const tabTitle = activeTab === 'overview' ? 'Vacancy Overview' : 'Anticipated Vacancies';
  // Copy / Excel / PDF cover every row of the filtered list (all pages), as the legacy page did
  const runExport = (kind) => createTableExporter({
    loadRows: async () => {
      const all = await fetchAllRows(
        isOverview ? fetchVacancyOverviewPage : fetchAnticipatedVacanciesPage,
        isOverview ? overviewParams : anticipatedParams
      );
      return isOverview ? all.map(toOverviewRow) : all;
    },
    isBusy: busy,
    getColumns: exportColumns,
    notify: sendNotification,
    title: `${tabTitle} - ${orgName}`,
    fileName: `${tabTitle}_${orgName}`,
    label: tabTitle,
  })[kind]();

  // If a specific vacant post is clicked (Live / Abolished), render the drill-down Vacant Details view
  // Text columns left, numeric/code/date columns centred (see utils/tableAlignment)
  const alignedColumns = useMemo(() => ({ activeColumnDefs: alignHrColumns(activeColumnDefs) }), [activeColumnDefs]);

  if (!orgId) {
    return (
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm font-semibold text-slate-500">
        Your session does not include an organisation, so vacancy data cannot be loaded. Please sign in again.
      </div>
    );
  }

  if (selectedVacantDetail) {
    return (
      <VacantDetails
        postId={selectedVacantDetail.postId}
        postName={selectedVacantDetail.postName}
        departmentName={selectedVacantDetail.departmentName}
        className={selectedVacantDetail.className}
        sanctionedStrength={selectedVacantDetail.sanctionedStrength}
        filledPost={selectedVacantDetail.filledPost}
        livePost={selectedVacantDetail.livePost}
        abolishedPost={selectedVacantDetail.abolishedPost}
        totalVacantPost={selectedVacantDetail.totalVacantPost}
        isLive={selectedVacantDetail.isLive}
        onBack={() => setSelectedVacantDetail(null)}
        notify={notify}
        permissions={permissions}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in relative">

      {/* ── Sub-tabs ── */}
      <div className="module-subtabs-strip" role="tablist" aria-label="Vacancy management views">
        {[
          { id: 'overview', label: `VACANCY OVERVIEW (${overview.total})` },
          { id: 'anticipated', label: `ANTICIPATED VACANCIES (${anticipated.total})` }
        ].map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => handleTabChange(tab.id)}
            className={`module-subtab-btn ${activeTab === tab.id ? 'active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="module-card space-y-4">

        {/* ── Toolbar ── */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
            <button type="button" onClick={() => actions.setShowFilterPanel(p => !p)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}>
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFiltersCount > 0 && <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">{activeFiltersCount}</span>}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>
            {activeFiltersCount > 0 && (
              <button type="button" onClick={handleResetFilters} className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer">
                Reset
              </button>
            )}
            <button type="button" onClick={handleExportAllHRData} disabled={isExportingAll}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer disabled:opacity-50">
              {isExportingAll ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              <span>{isExportingAll ? 'Exporting...' : 'Export All Data'}</span>
            </button>
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input" />
              {searchTerm && <button type="button" aria-label="Clear search" onClick={() => actions.setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            {isOverview && (
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!overviewList.exactMatch}
                  onChange={(e) => overviewActions.setFilters({ exactMatch: e.target.checked })}
                  className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Show exact match
              </label>
            )}
            <div className="flex items-center space-x-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select value={pageSize} onChange={e => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0">
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {totalCount}
            </div>
            <div className="relative" ref={colDropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">
                <span>Visibility</span><ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800 max-h-72 overflow-y-auto">
                  {Object.keys(activeVisibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input type="checkbox" checked={activeVisibleCols[col]}
                        onChange={() => setActiveVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      <span>{activeColLabels[col] || col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* ── Filter Panel (shared HR design) ── */}
        <HrFilterPanel show={showFilterPanel} columns={activeTab === 'overview' ? 3 : 4}>
          <DeptPostClassFilters
            departments={departments}
            departmentId={departmentId}
            onDepartmentChange={(value) => actions.setFilters({ departmentId: value, postId: '' })}
            posts={postsList}
            postId={postId}
            onPostChange={(value) => actions.setFilters({ postId: value })}
            className={className}
            onClassChange={(value) => actions.setFilters(classChangeUpdate(value, postId, deptPostsList))}
          />
          {/* Retirement years (Anticipated only) */}
          {activeTab === 'anticipated' && (
            <FilterField label="Year of retirement">
              <MultiSelect
                options={YEAR_OPTIONS}
                value={selectedYears}
                onChange={(years) => anticipatedActions.setFilters({ years })}
                minSelected={1}
                defaultValue={[CURRENT_YEAR]}
                maxChips={3}
                ariaLabel="Year of retirement"
              />
            </FilterField>
          )}
        </HrFilterPanel>

        {/* Abolition notice */}
        {activeTab === 'overview' && (
          <div className="flex justify-end py-1">
            <button
              type="button"
              role="switch"
              aria-checked={abolishingOnly}
              disabled={abolishingCount === 0 && !abolishingOnly}
              onClick={() => overviewActions.setFilters({ abolishingOnly: !abolishingOnly })}
              title={abolishingOnly ? 'Show all posts' : 'Show only posts to be abolished this month'}
              className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs"
            >
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  abolishingOnly ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                    abolishingOnly ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>
                Post to be abolished by end of <strong>{currentMonthName}</strong>
              </span>
              <span className="rounded px-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {abolishingCount}
              </span>
            </button>
          </div>
        )}

        {/* ── Data Table ── */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          {/* One grid for both tabs: it takes the other tab's columns and rows in place. Keying it by
              tab rebuilt the grid on every switch, and a new grid stays blank until it re-measures. */}
          <Table rowData={paginatedRows} columnDefs={alignedColumns.activeColumnDefs} loading={activeList.loading} rowHeight={ROW_HEIGHT}
            pagination={false} enableExport={false}
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }} />
          <TablePagination currentPage={currentPage - 1} totalPages={totalPages} totalRows={totalCount} pageSize={pageSize}
            onPageChange={i => actions.setCurrentPage(i + 1)}
            onPrevPage={() => actions.setCurrentPage(p => Math.max(1, p - 1))}
            onNextPage={() => actions.setCurrentPage(p => Math.min(totalPages, p + 1))} color="#0f417a" />
        </div>

        {/* ── Submit buttons ── */}
        {activeTab === 'anticipated' && (
          <div className="flex justify-end pt-2">
            <button type="button" onClick={handleSubmitAnticipated} disabled={isSubmitting || !userCanEdit}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-60">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Vacancy Activity Modal (from Anticipated Vacancies → Action)
      ══════════════════════════════════════════════════════════════════ */}
      {showActivityModal && selectedAnticipatedRow && (
        <VacancyActivityModal
          key={selectedAnticipatedRow.post_code}
          target="anticipated"
          onClose={() => {
            setShowActivityModal(false);
            setSelectedAnticipatedRow(null);
            setSelectedExpectedMethod('');
          }}
          post={{
            code: selectedAnticipatedRow.post_code,
            name: selectedAnticipatedRow.post_name,
            id: selectedAnticipatedRow.post_id,
          }}
          method={selectedExpectedMethod}
          expectedMethod={selectedExpectedMethod}
          dateOfVacancy={selectedAnticipatedRow.Anticipated_date || selectedAnticipatedRow.date_of_arise_in_vacancy || selectedAnticipatedRow.emp_dor}
          reasonForExemption={selectedAnticipatedRow.reason_for_exemption || ''}
          userCanEdit={userCanEdit}
          notify={notify}
          onSuccess={() => {
            anticipated.reload();
            overview.reload();
          }}
        />
      )}

    </div>
  );
}
