import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronDown, Filter, FileSpreadsheet, Bell, User } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { EditActionButton, CodeText, PostCodeTag } from '../components/HrFormControls';
import EmployeeActivityModal from '../components/EmployeeActivityModal';
import DeputationNotificationModal from '../components/DeputationNotificationModal';
import DeputationBackModal from '../components/DeputationBackModal';
import ExportActivityModal from '../components/ExportActivityModal';
import { CLASS_OPTIONS } from '../utils/hrAdministration';
import { createTableExporter } from '../utils/exportTable';
import { useDebouncedSearch, useLatestRef, usePagedList } from '../hooks/usePagedList';
import { useHrListStore } from '../store/useHrListStore';
import {
  fetchDeputationEndedEmployees,
  fetchEmployeesPage,
  fetchHrDepartments,
  fetchHrPostsByDepartment,
  fetchMmtDropdown,
} from '../api';
import { alignHrColumns } from '../utils/tableAlignment';

const COL_LABELS = {
  post_id: 'Post ID',
  class: 'Class',
  department_name: 'Department',
  post_name: 'Post Name',
  emp_post_code: 'Post Code',
  reference_id: 'Reference ID / Personnel No.',
  employee_id: 'Employee ID',
  emp_name: 'Employee Name',
  method_of_appointment: 'Method of Appointment',
};

const DEFAULT_VISIBLE = {
  post_id: false,
  class: false,
  department_name: false,
  post_name: true,
  emp_post_code: true,
  reference_id: true,
  employee_id: false,
  emp_name: true,
  method_of_appointment: false,
};

const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

const selectClass =
  'appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';

// Rows have a fixed height; long text is clamped to two lines (full value on hover).
const ROW_HEIGHT = 52;

const textCell = (className) => ({
  headerClass: 'text-center',
  cellClass: 'text-center flex items-center justify-center',
  cellRenderer: (p) => (
    <span title={p.value || ''} className={`line-clamp-2 whitespace-normal break-words leading-[18px] w-full ${className}`}>
      {p.value || '--'}
    </span>
  ),
});

export default function HrAdministration({ notify, triggerNotification, permissions }) {
  const { orgId, orgName: sessionOrgName } = permissions;
  const orgName = sessionOrgName || 'Organisation';
  const canEdit = permissions.canEdit;

  const sendNotification = useCallback(
    (msg, type = 'success') => {
      if (typeof notify === 'function') notify(msg, type);
      else if (typeof triggerNotification === 'function') triggerNotification(msg, type);
    },
    [notify, triggerNotification]
  );

  // ── data
  const [deputationEnded, setDeputationEnded] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [departments, setDepartments] = useState([]);
  // Posts of the selected department, tagged with it so a stale list is never shown
  const [deptPosts, setDeptPosts] = useState({ departmentId: '', list: [] });
  const [organisations, setOrganisations] = useState([]);

  // ── filters / search / paging live in the HR list store
  const list = useHrListStore((state) => state.employees);
  const actions = useHrListStore((state) => state.employeesActions);
  const {
    departmentId, postId, className, exactMatch, searchTerm, debouncedSearch,
    showFilterPanel, currentPage, pageSize,
  } = list;
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE);
  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // ── popups
  const [activityEmployee, setActivityEmployee] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [deputationEmployee, setDeputationEmployee] = useState(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    function handler(e) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setColDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // App recreates triggerNotification on every render (each toast re-renders it), so loaders
  // read the notifier through a ref; depending on it directly would refetch after every toast.
  const notifyRef = useLatestRef(sendNotification);

  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);

  // One params object is the request: page, limit and only the filters that are set
  const params = useMemo(() => {
    const query = { page: currentPage, limit: pageSize };
    if (departmentId) query.departmentId = departmentId;
    if (postId) query.postId = postId;
    if (className) query.className = className;
    if (debouncedSearch) {
      query.search = debouncedSearch;
      if (exactMatch) query.exact = true;
    }
    return query;
  }, [currentPage, pageSize, departmentId, postId, className, debouncedSearch, exactMatch]);

  const handleLoadError = useCallback(
    (err) => notifyRef.current(err?.response?.data?.message || 'Failed to load the employee list.', 'error'),
    [notifyRef]
  );
  const { rows, total: totalCount, totalPages, loading, refreshing, reload } = usePagedList({
    scope: 'employees',
    params,
    request: fetchEmployeesPage,
    onError: handleLoadError,
  });
  // Copy / export only what is on screen once the newest page has arrived
  const busy = loading || refreshing;

  // After a change empties the last page, step back to the new last page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) actions.setCurrentPage(totalPages);
  }, [totalPages, currentPage, actions]);

  // Bumping reloadKey refetches the deputation notifications.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId) return undefined;
    let alive = true;
    fetchDeputationEndedEmployees(orgId)
      .then((res) => { if (alive) setDeputationEnded(asList(res)); })
      .catch(() => { if (alive) setDeputationEnded([]); })
      .finally(() => { if (alive) setLoadingNotifications(false); });
    return () => { alive = false; };
  }, [orgId, reloadKey]);

  // Master lists for filters and popups.
  useEffect(() => {
    if (!orgId) return undefined;
    let alive = true;
    Promise.allSettled([fetchHrDepartments(orgId), fetchMmtDropdown('mmt_organisation')]).then(
      ([deptRes, orgRes]) => {
        if (!alive) return;
        if (deptRes.status === 'fulfilled') setDepartments(asList(deptRes.value));
        if (orgRes.status === 'fulfilled') setOrganisations(asList(orgRes.value));
      }
    );
    return () => {
      alive = false;
    };
  }, [orgId]);

  useEffect(() => {
    if (!departmentId || !orgId) return undefined;
    let alive = true;
    fetchHrPostsByDepartment(departmentId, orgId)
      .then((res) => { if (alive) setDeptPosts({ departmentId, list: asList(res) }); })
      .catch(() => { if (alive) setDeptPosts({ departmentId, list: [] }); });
    return () => { alive = false; };
  }, [departmentId, orgId]);
  const filterPosts = departmentId && deptPosts.departmentId === departmentId ? deptPosts.list : [];

  const refreshAll = () => {
    setLoadingNotifications(true);
    setReloadKey((k) => k + 1);
    reload();
  };

  const activeFiltersCount = (departmentId ? 1 : 0) + (postId ? 1 : 0) + (className ? 1 : 0);

  // S.No continues across pages
  const serialStart = (currentPage - 1) * pageSize;
  const pageRows = useMemo(
    () => rows.map((row, i) => ({ ...row, sNo: serialStart + i + 1 })),
    [rows, serialStart]
  );

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo', headerName: 'S.No', minWidth: 70, maxWidth: 80, pinned: 'left',
        headerClass: 'text-center', cellClass: 'text-center font-bold flex items-center justify-center',
      },
      { field: 'post_id', headerName: COL_LABELS.post_id, flex: 0.7, minWidth: 90, hide: !visibleCols.post_id, headerClass: 'text-center', cellRenderer: (p) => <CodeText>{p.value}</CodeText> },
      { field: 'class', headerName: COL_LABELS.class, flex: 0.7, minWidth: 90, hide: !visibleCols.class, ...textCell('font-semibold') },
      { field: 'department_name', headerName: COL_LABELS.department_name, flex: 1.3, minWidth: 150, hide: !visibleCols.department_name, ...textCell('font-semibold text-slate-800 dark:text-slate-200') },
      { field: 'post_name', headerName: COL_LABELS.post_name, flex: 2, minWidth: 200, hide: !visibleCols.post_name, ...textCell('font-semibold text-slate-800 dark:text-slate-200') },
      {
        field: 'emp_post_code', headerName: COL_LABELS.emp_post_code, flex: 1.1, minWidth: 150, hide: !visibleCols.emp_post_code,
        headerClass: 'text-center', cellClass: 'text-center font-bold flex items-center justify-center',
        cellRenderer: (p) => (
          <PostCodeTag>{p.value}</PostCodeTag>
        ),
      },
      { field: 'reference_id', headerName: COL_LABELS.reference_id, flex: 1.3, minWidth: 170, hide: !visibleCols.reference_id, headerClass: 'text-center', cellRenderer: (p) => <CodeText>{p.value}</CodeText> },
      { field: 'employee_id', headerName: COL_LABELS.employee_id, flex: 0.8, minWidth: 110, hide: !visibleCols.employee_id, headerClass: 'text-center', cellRenderer: (p) => <CodeText>{p.value}</CodeText> },
      {
        field: 'emp_name', headerName: COL_LABELS.emp_name, flex: 1.5, minWidth: 170, hide: !visibleCols.emp_name,
        headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (p) => (
          <span className="flex items-center justify-center gap-1.5 w-full font-semibold">
            <User size={13} className="text-slate-400 shrink-0" />
            <span>{p.value || '--'}</span>
          </span>
        ),
      },
      { field: 'method_of_appointment', headerName: COL_LABELS.method_of_appointment, flex: 1.2, minWidth: 160, hide: !visibleCols.method_of_appointment, ...textCell('font-semibold text-slate-700 dark:text-slate-300') },
    ];

    if (canEdit) {
      cols.push({
        field: 'action', headerName: 'Activity', minWidth: 110, maxWidth: 120, pinned: 'right', sortable: false,
        headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center py-1',
        cellRenderer: (p) => p.data && (
          <EditActionButton
            label={`Record activity for ${p.data.emp_name || 'employee'}`}
            onClick={() => setActivityEmployee(p.data)}
          />
        ),
      });
    }
    return cols;
  }, [visibleCols, canEdit]);

  // Copy / Export cover the rows on screen (this page), once it has finished loading
  const exporter = createTableExporter({
    loadRows: () => rows,
    getColumns: () => Object.keys(COL_LABELS).filter((f) => visibleCols[f]).map((f) => ({ field: f, label: COL_LABELS[f] })),
    notify: sendNotification,
    isBusy: busy,
    serialStart,
    title: `HR Administration & Actions - ${orgName} (Page ${currentPage})`,
    fileName: `HR_Administration_${orgName}_Page_${currentPage}`,
    sheetName: 'HR Administration',
    label: 'Employee list',
  });

  // Text columns left, numeric/code/date columns centred (see utils/tableAlignment)
  const alignedColumns = useMemo(() => ({ columnDefs: alignHrColumns(columnDefs) }), [columnDefs]);

  if (!orgId) {

    return (
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm font-semibold text-slate-500">
        HR Administration & Actions is available to organisation users only.
      </div>
    );
  }

  const pendingCount = deputationEnded.length;

  return (
    <div className="space-y-4 animate-fade-in relative text-slate-800 dark:text-slate-100">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 dark:bg-slate-950 dark:border-slate-800">
        {/* ── Toolbar ── */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel((p) => !p)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={actions.resetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Activity Data</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              title={pendingCount ? `${pendingCount} employee(s) completed deputation` : 'No pending notifications'}
              className={`relative inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                pendingCount
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
              }`}
            >
              <Bell className={`h-4 w-4 ${pendingCount ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>Notifications</span>
              {pendingCount > 0 && (
                <span className="min-w-5 rounded bg-rose-600 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="flex flex-col items-end gap-1 min-w-[200px] flex-1 sm:flex-initial">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => actions.setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
                />
                {searchTerm && (
                  <button type="button" onClick={() => actions.setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exactMatch}
                  onChange={(e) => actions.setFilters({ exactMatch: e.target.checked })}
                  className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Show exact match
              </label>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {totalCount}
            </div>
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setColDropdownOpen((o) => !o)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {colDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800 max-h-72 overflow-y-auto">
                  {Object.keys(COL_LABELS).map((col) => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{COL_LABELS[col]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <CopyButton onCopy={exporter.copy} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={exporter.excel} onExportPdf={exporter.pdf} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</label>
              <div className="relative">
                <select value={departmentId} onChange={(e) => actions.setFilters({ departmentId: e.target.value, postId: '' })} className={selectClass}>
                  <option value="">-- All Departments --</option>
                  {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Post Name</label>
              <div className="relative">
                <select
                  value={postId}
                  onChange={(e) => actions.setFilters({ postId: e.target.value })}
                  disabled={!departmentId}
                  className={`${selectClass} ${!departmentId ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''}`}
                >
                  <option value="">{!departmentId ? 'Select Dept First' : '-- All Posts --'}</option>
                  {filterPosts.map((p) => <option key={p.post_id} value={p.post_id}>{p.post_name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class</label>
              <div className="relative">
                <select value={className} onChange={(e) => actions.setFilters({ className: e.target.value })} className={selectClass}>
                  <option value="">-- All Classes --</option>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* ── Data Table ── */}
        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={pageRows}
            columnDefs={alignedColumns.columnDefs}
            rowHeight={ROW_HEIGHT}
            loading={loading}
            pagination={false}
            enableExport={false}
            defaultColDef={{ minWidth: 90, filter: false, sortable: true, resizable: true }}
          />
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={totalCount}
            pageSize={pageSize}
            onPageChange={(i) => actions.setCurrentPage(i + 1)}
            onPrevPage={() => actions.setCurrentPage((p) => Math.max(1, p - 1))}
            onNextPage={() => actions.setCurrentPage((p) => Math.min(totalPages, p + 1))}
            color="#0f417a"
          />
          <style dangerouslySetInnerHTML={{ __html: `
            .ag-theme-quartz .ag-header { background-color: #0f417a !important; border-bottom: 2px solid #0a2d55 !important; }
            .ag-theme-quartz .ag-header-cell { background-color: #0f417a !important; color: #ffffff !important; font-weight: 700 !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; }
            .ag-theme-quartz .ag-header-cell .ag-icon { color: #ffffff !important; }
            .ag-theme-quartz .ag-header-cell-label { color: #ffffff !important; justify-content: center !important; }
            .ag-theme-quartz .ag-row { font-size: 13px !important; border-bottom: 1px solid #f1f5f9 !important; }
            .ag-theme-quartz .ag-row-hover { background-color: #f8fafc !important; }
            .dark .ag-theme-quartz .ag-row-hover { background-color: #1e293b !important; }
          `}} />
        </div>
      </div>

      {/* ── Popups (mounted only while open so each opens with fresh state) ── */}
      {activityEmployee && (
        <EmployeeActivityModal
          key={`${activityEmployee.employee_id}-${activityEmployee.emp_post_code}`}
          isOpen
          employee={activityEmployee}
          organisations={organisations}
          departments={departments}
          orgId={orgId}
          notify={sendNotification}
          onClose={() => setActivityEmployee(null)}
          onSuccess={refreshAll}
        />
      )}

      {showNotifications && (
        <DeputationNotificationModal
          isOpen
          rows={deputationEnded}
          loading={loadingNotifications}
          canEdit={canEdit}
          onClose={() => setShowNotifications(false)}
          onSelect={(row) => {
            setShowNotifications(false);
            setDeputationEmployee(row);
          }}
        />
      )}

      {deputationEmployee && (
        <DeputationBackModal
          key={`${deputationEmployee.employee_id}-${deputationEmployee.emp_master_id}`}
          isOpen
          employee={deputationEmployee}
          departments={departments}
          orgId={orgId}
          notify={sendNotification}
          onClose={() => {
            setDeputationEmployee(null);
            setShowNotifications(true);
          }}
          onSuccess={refreshAll}
        />
      )}

      {showExport && (
        <ExportActivityModal
          isOpen
          orgId={orgId}
          notify={sendNotification}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
