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
import { SESSION_EXPIRED_MESSAGE } from '../hooks/useHRPermissions';
import VacantDetails from './VacantDetails';
import VacancyActivityModal from '../components/VacancyActivityModal';
import { EditActionButton, PostCodeTag } from '../components/HrFormControls';
import {
  fetchHrDepartments,
  fetchHrPostsByDepartment,
  fetchVacancyOverviewPage,
  fetchAnticipatedVacanciesPage,
  submitHrAnticipatedVacancies,
  fetchHrAllData
} from '../api';
import { alignHrColumns } from '../utils/tableAlignment';
import { createTableExporter } from '../utils/exportTable';
import { useDebouncedSearch, usePagedList } from '../hooks/usePagedList';
import { CURRENT_YEAR, useHrListStore } from '../store/useHrListStore';

// ─────────────────────────── constants ───────────────────────────

const OVERVIEW_COL_LABELS = {
  sNo: 'S.No', department: 'Department', class: 'Class', post_name: 'Post Name',
  sanctioned: 'Sanctioned', actual: 'Actual', live_post: 'Vacancy - Live',
  abolished_post: 'Vacancy - Abolished', total_vacant_post: 'Vacancy - Total',
  have_abolished_or_not: 'Have Abolished or Not?'
};

const ANTICIPATED_COL_LABELS = {
  sNo: 'S.No', department_name: 'Department', class: 'Class', post_name: 'Post Name',
  post_code: 'Post Code', expected_method: 'Expected Method of Filling (as per RR)',
  anticipated_date: 'Anticipated Vacancy Date', current_occupant: 'Current Occupant',
  retirement_date: 'Date of Retirement', action: 'Action'
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
  department: 'department', class: 'class', post_name: 'post_name', sanctioned: 'sanctioned', actual: 'actual',
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

export default function VacancyManagement({ notify, triggerNotification, permissions }) {
  const { orgId, userId, orgName: sessionOrgName } = permissions;
  const orgName = sessionOrgName || 'Organisation';
  const userCanEdit = permissions.canEdit;

  // Notifiers from the shell change identity on every App render; keep a stable wrapper so
  // loaders that report errors do not refetch after each toast.
  const notifyRef = useRef({ notify, triggerNotification });
  useEffect(() => { notifyRef.current = { notify, triggerNotification }; }, [notify, triggerNotification]);
  const sendNotification = useCallback((msg, type = 'success') => {
    const { notify: n, triggerNotification: t } = notifyRef.current;
    if (typeof n === 'function') n(msg, type);
    else if (typeof t === 'function') t(msg, type);
  }, []);

  // ── tab, filters, search and paging live in the HR list store (one slice per tab),
  // so they survive switching tabs and HR pages
  const activeTab = useHrListStore((state) => state.vacancyTab);
  const setActiveTab = useHrListStore((state) => state.setVacancyTab);
  const overviewList = useHrListStore((state) => state.overview);
  const overviewActions = useHrListStore((state) => state.overviewActions);
  const anticipatedList = useHrListStore((state) => state.anticipated);
  const anticipatedActions = useHrListStore((state) => state.anticipatedActions);
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

  // ── filter options
  const [departments, setDepartments] = useState([]);
  // Posts of the selected department (tagged with it so a stale list is never shown).
  const [deptPosts, setDeptPosts] = useState({ deptId: '', list: [] });

  // ── column visibility dropdowns
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  const [visibleColsOverview, setVisibleColsOverview] = useState({
    sNo: true, department: true, class: false, post_name: true, sanctioned: true,
    actual: true, live_post: true, abolished_post: true, total_vacant_post: true,
    have_abolished_or_not: false
  });
  const [visibleColsAnticipated, setVisibleColsAnticipated] = useState({
    sNo: true, department_name: true, class: false, post_name: true, post_code: true,
    expected_method: true, anticipated_date: true, current_occupant: true,
    retirement_date: false, action: true
  });

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

  // ── 1. Departments
  useEffect(() => {
    if (!orgId) return undefined;
    let alive = true;
    fetchHrDepartments(orgId)
      .then(r => { if (alive) setDepartments(Array.isArray(r.data) ? r.data : (r.data?.data || [])); })
      .catch(() => {});
    return () => { alive = false; };
  }, [orgId]);

  // ── 2. Posts per department
  useEffect(() => {
    if (!departmentId || !orgId) return undefined;
    let alive = true;
    fetchHrPostsByDepartment(departmentId, orgId)
      .then(r => { if (alive) setDeptPosts({ deptId: departmentId, list: Array.isArray(r.data) ? r.data : (r.data?.data || []) }); })
      .catch(() => { if (alive) setDeptPosts({ deptId: departmentId, list: [] }); });
    return () => { alive = false; };
  }, [departmentId, orgId]);
  const postsList = departmentId && deptPosts.deptId === departmentId ? deptPosts.list : [];

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
    if (debouncedSearch) query.search = debouncedSearch;
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
    (err) => sendNotification(err?.response?.data?.message || 'Failed to load the list.', 'error'),
    [sendNotification]
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
    sendNotification('Filters reset.', 'info');
  };

  const activeFiltersCount =
    (departmentId ? 1 : 0) + (className ? 1 : 0) + (postId ? 1 : 0) +
    (isOverview && abolishingOnly ? 1 : 0) +
    (!isOverview && (selectedYears.length !== 1 || selectedYears[0] !== CURRENT_YEAR) ? 1 : 0);

  const abolishingCount = overview.extra?.counts?.abolishingThisMonth ?? 0;

  // ─────────── Open Action popup from ANTICIPATED row (vacancy activities) ───────────
  const handleOpenActivityModal = (row) => {
    const edit = anticipatedEdits[anticipatedKey(row)];
    const expectedMethod = edit ? edit.value : (row.expected_anticipated_vacancy || row.expected_method || '');

    if (!expectedMethod || !expectedMethod.trim() || expectedMethod.toLowerCase().startsWith('-- select')) {
      sendNotification('Please select Expected Method of Filling to update the activity', 'warning');
      return;
    }

    setSelectedAnticipatedRow(row);
    setSelectedExpectedMethod(expectedMethod);
    setShowActivityModal(true);
  };

  // ─────────── Submit Anticipated Vacancies (expected method per post) ───────────
  const handleSubmitAnticipated = async () => {
    // Posts changed on any page (saved choices are already stored on the server).
    const tableData = Object.values(anticipatedEdits)
      .filter((e) => e.value)
      .map((e) => ({ department_id: e.department_id, post_id: e.post_id, post_code: e.post_code, expected_anticipated_vacancy: e.value }));
    if (!tableData.length) { sendNotification('Change the expected method for at least one post.', 'warning'); return; }
    if (!userId || !orgId) { sendNotification(SESSION_EXPIRED_MESSAGE, 'error'); return; }
    setIsSubmitting(true);
    try {
      await submitHrAnticipatedVacancies({ organisationID: orgId, userID: userId, tableData });
      sendNotification('Anticipated vacancies saved!', 'success');
      setAnticipatedEdits({});
      anticipated.reload();
    } catch { sendNotification('Failed to save anticipated vacancies.', 'error'); }
    finally { setIsSubmitting(false); }
  };

  // ─────────── Export All ───────────
  const handleExportAllHRData = async () => {
    setIsExportingAll(true);
    try {
      const r = await fetchHrAllData(orgId);
      const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      if (!raw.length) { sendNotification('No data to export.', 'warning'); return; }
      const rows = raw.map(row => { const c = { ...row }; Object.keys(c).forEach(k => { if (k.toLowerCase().includes('date') && c[k]) c[k] = formatDate(c[k]); }); return c; });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HR Post Data');
      const now = new Date();
      XLSX.writeFile(wb, `HR_Post_Data_${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.xlsx`);
      sendNotification('HR Master Data exported!', 'success');
    } catch { sendNotification('Export failed.', 'error'); }
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
  const serialStart = isOverview ? overviewStart : anticipatedStart;

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
  ], [visibleColsAnticipated, anticipatedEdits, userCanEdit]);

  const activeColLabels = activeTab === 'overview' ? OVERVIEW_COL_LABELS : ANTICIPATED_COL_LABELS;
  const activeVisibleCols = activeTab === 'overview' ? visibleColsOverview : visibleColsAnticipated;
  const setActiveVisibleCols = activeTab === 'overview' ? setVisibleColsOverview : setVisibleColsAnticipated;
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
    };
    return Object.keys(fields)
      .filter((k) => visibleColsAnticipated[k])
      .map((k) => ({ ...fields[k], label: ANTICIPATED_COL_LABELS[k] }));
  };
  const tabTitle = activeTab === 'overview' ? 'Vacancy Overview' : 'Anticipated Vacancies';
  const runExport = (kind) => createTableExporter({
    loadRows: () => paginatedRows,
    isBusy: busy,
    serialStart,
    getColumns: exportColumns,
    notify: sendNotification,
    title: `${tabTitle} - ${orgName} (Page ${currentPage})`,
    fileName: `${tabTitle}_${orgName}_Page_${currentPage}`,
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
        triggerNotification={triggerNotification}
        permissions={permissions}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in relative text-slate-800 dark:text-slate-100">

      {/* ── Sub-tabs ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1 flex-wrap gap-y-1">
        {[
          { id: 'overview', label: `VACANCY OVERVIEW (${overview.total})` },
          { id: 'anticipated', label: `ANTICIPATED VACANCIES (${anticipated.total})` }
        ].map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 dark:bg-slate-950 dark:border-slate-800">

        {/* ── Toolbar ── */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
            <button type="button" onClick={() => actions.setShowFilterPanel(p => !p)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${showFilterPanel || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
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
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200" />
              {searchTerm && <button onClick={() => actions.setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
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

        {/* ── Filter Panel ── */}
        {showFilterPanel && (
          <div className={`p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 ${activeTab === 'overview' ? 'md:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4'} gap-4 animate-fade-in`}>
            {/* Department */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</label>
              <div className="relative">
                <select value={departmentId} onChange={e => actions.setFilters({ departmentId: e.target.value, postId: '' })}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <option value="">-- All Departments --</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            {/* Post */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Post Name</label>
              <div className="relative">
                <select value={postId} onChange={e => actions.setFilters({ postId: e.target.value })} disabled={!departmentId}
                  className={`appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer ${!departmentId ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''}`}>
                  <option value="">{!departmentId ? 'Select Dept First' : '-- All Posts --'}</option>
                  {postsList.map(p => <option key={p.post_id} value={p.post_id}>{p.post_name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            {/* Class */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class</label>
              <div className="relative">
                <select value={className} onChange={e => actions.setFilters({ className: e.target.value })}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <option value="">-- All Classes --</option>
                  <option value="I/A">I/A</option>
                  <option value="II/B">II/B</option>
                  <option value="III/C">III/C</option>
                  <option value="IV/D">IV/D</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            {/* Retirement years (Anticipated only) */}
            {activeTab === 'anticipated' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Year of retirement</label>
                <MultiSelect
                  options={YEAR_OPTIONS}
                  value={selectedYears}
                  onChange={(years) => anticipatedActions.setFilters({ years })}
                  minSelected={1}
                  defaultValue={[CURRENT_YEAR]}
                  maxChips={3}
                  ariaLabel="Year of retirement"
                />
              </div>
            )}
          </div>
        )}

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
        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table key={activeTab} rowData={paginatedRows} columnDefs={alignedColumns.activeColumnDefs} loading={activeList.loading} rowHeight={ROW_HEIGHT}
            pagination={false} enableExport={false}
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }} />
          <TablePagination currentPage={currentPage - 1} totalPages={totalPages} totalRows={totalCount} pageSize={pageSize}
            onPageChange={i => actions.setCurrentPage(i + 1)}
            onPrevPage={() => actions.setCurrentPage(p => Math.max(1, p - 1))}
            onNextPage={() => actions.setCurrentPage(p => Math.min(totalPages, p + 1))} color="#0f417a" />
          <style dangerouslySetInnerHTML={{ __html: `
            .ag-theme-quartz .ag-header { background-color: #0f417a !important; border-bottom: 2px solid #0a2d55 !important; }
            .ag-theme-quartz .ag-header-cell { background-color: #0f417a !important; color: #ffffff !important; font-weight: 700 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; }
            .ag-theme-quartz .ag-header-group-cell { background-color: #0f417a !important; color: #ffffff !important; font-weight: 700 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; border-bottom: 1px solid rgba(255,255,255,0.2) !important; }
            .ag-theme-quartz .ag-header-cell .ag-icon, .ag-theme-quartz .ag-header-group-cell .ag-icon { color: #ffffff !important; }
            .ag-theme-quartz .ag-header-cell-label, .ag-theme-quartz .ag-header-group-cell-label { color: #ffffff !important; justify-content: center !important; }
            .ag-theme-quartz .ag-row { font-size: 13px !important; border-bottom: 1px solid #e2e8f0 !important; }
            .ag-theme-quartz .ag-row-hover { background-color: #f8fafc !important; }
            .dark .ag-theme-quartz .ag-row-hover { background-color: #1e293b !important; }
          `}} />
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
          notify={sendNotification}
          onSuccess={() => {
            anticipated.reload();
            overview.reload();
          }}
        />
      )}

    </div>
  );
}
