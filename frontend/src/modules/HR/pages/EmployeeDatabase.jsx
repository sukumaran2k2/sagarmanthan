import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  ChevronDown,
  X,
  Filter,
  RotateCcw,
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';
import { COMMON_TOASTS } from '../../../utils/notify';
import { HR_TOASTS } from '../toastMessages';
import { useHrStore } from '../store/useHrStore';
import { useDebouncedSearch } from '../hooks/usePagedList';
import { useGridPage } from '../hooks/useGridPage';
import { createTableExporter } from '../utils/exportTable';
import { HrFilterPanel, FilterSelect, DeptPostClassFilters } from '../components/HrFilterPanel';
import { classChangeUpdate, useDeptPosts, useHrDepartments } from '../hooks/useHrFilterOptions';
import { matchesIdOrName, nameOf } from '../utils/hrFilters';

export default function EmployeeDatabase({ notify }) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine if Organisation or Ministry view
  const isMinistryView = useMemo(() => !isOrganisationUser(), []);

  // Filters, search, paging and column visibility live in the HR store
  const {
    selectedOrg, selectedDept, selectedClass, selectedPostName, workingStatus,
    showFilterPanel, searchTerm, debouncedSearch, currentPage, pageSize, visibleCols } = useHrStore(useShallow((state) => ({
    selectedOrg: state.employeeDatabase.organisationId,
    selectedDept: state.employeeDatabase.departmentId,
    selectedClass: state.employeeDatabase.className,
    selectedPostName: state.employeeDatabase.postId,
    workingStatus: state.employeeDatabase.workingStatus,
    showFilterPanel: state.employeeDatabase.showFilterPanel,
    searchTerm: state.employeeDatabase.searchTerm,
    debouncedSearch: state.employeeDatabase.debouncedSearch,
    currentPage: state.employeeDatabase.currentPage,
    pageSize: state.employeeDatabase.pageSize,
    visibleCols: state.employeeDatabase.visibleCols })));
  const actions = useHrStore((state) => state.employeeDatabaseActions);
  const organisations = useHrStore((state) => state.organisations);
  useDebouncedSearch(searchTerm, actions.setDebouncedSearch);
  const gridPage = useGridPage(currentPage, actions.setCurrentPage);
  // In Org view, the default working status is 'Active' (null in the store = the view's default)
  const selectedWorkingStatus = workingStatus ?? (!isMinistryView ? 'Active' : '');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Modals
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({
    emp_name: '',
    employee_id: '',
    emp_reference_id: '',
    emp_department_name: '',
    emp_post_name: '',
    class: 'I/A',
    method_of_appointment: 'Direct Recruitment',
    working_status: 'Active',
    join_date: new Date().toISOString().slice(0, 10) });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Outside click for visibility dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Employee Database. Only the latest request may update state (stale-response guard).
  const latestRequestRef = useRef(0);
  const fetchEmployees = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const claims = getSessionClaims() || {};
      const roleId = claims.roleId || claims.role_id || (!isMinistryView ? 6 : 2);
      const orgId = !isMinistryView ? (getSessionOrganisationId() || claims.organisationId || 1) : 'null';
      const depId = 'None';
      const postId = 'None';

      const url = `${API_BASE_URL}/get-employee-list-by-organisation-dep-post/${roleId}/${orgId}/${depId}/${postId}`;
      const res = await axios.get(url);
      if (isStale()) return;
      const data = Array.isArray(res.data) ? res.data : [];
      setEmployees(data);
    } catch (err) {
      if (isStale()) return;
      console.error('Error fetching employee list:', err);
      setError('Failed to fetch employee database records.');
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [isMinistryView]);

  useEffect(() => {
    // Deferred a tick so the load's setState does not run synchronously in the effect
    const timer = setTimeout(fetchEmployees, 0);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  // Filter options as on Vacancy Management: department master, posts of the chosen department
  // (ministry users pick an organisation first), fixed class list
  const ownOrgId = getSessionOrganisationId() || getSessionClaims()?.organisationId || '';
  const filterOrgId = isMinistryView ? selectedOrg : ownOrgId;
  const filterDepartments = useHrDepartments(filterOrgId);
  const { deptPosts, posts: filterPosts } = useDeptPosts(selectedDept, filterOrgId, selectedClass);
  // The list's rows may carry names only, so the chosen ids are also matched by name
  const selectedOrgName = nameOf(organisations, 'organisation_id', 'organisation_name', selectedOrg);
  const selectedDeptName = nameOf(filterDepartments, 'department_id', 'department_name', selectedDept);
  const selectedPostLabel = nameOf(deptPosts, 'post_id', 'post_name', selectedPostName);

  const activeFiltersCount =
    (selectedOrg ? 1 : 0) +
    (selectedDept ? 1 : 0) +
    (selectedClass ? 1 : 0) +
    (selectedPostName ? 1 : 0) +
    (!isMinistryView && selectedWorkingStatus && selectedWorkingStatus !== 'Active' ? 1 : 0);

  const clearFilters = () => {
    actions.resetFilters();
    actions.setSearchTerm('');
    notify?.(COMMON_TOASTS.filtersReset());
  };

  // Filtered dataset mapped for table display
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(item => {
        if (isMinistryView && !matchesIdOrName(item.emp_curr_org_id, item.organisation_name, selectedOrg, selectedOrgName)) return false;
        if (!matchesIdOrName(item.emp_department_id, item.emp_department_name, selectedDept, selectedDeptName)) return false;
        if (selectedClass && String(item.class ?? '').trim() !== selectedClass) return false;
        if (!matchesIdOrName(item.emp_post_id, item.emp_post_name, selectedPostName, selectedPostLabel)) return false;
        if (selectedWorkingStatus && selectedWorkingStatus !== '') {
          if (item.working_status !== selectedWorkingStatus) return false;
        }

        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          const empId = String(item.employee_id || '').toLowerCase();
          const refId = String(item.emp_reference_id || '').toLowerCase();
          const empName = String(item.emp_name || '').toLowerCase();
          const dept = String(item.emp_department_name || '').toLowerCase();
          const post = String(item.emp_post_name || '').toLowerCase();
          const status = String(item.working_status || '').toLowerCase();

          return (
            empId.includes(query) ||
            refId.includes(query) ||
            empName.includes(query) ||
            dept.includes(query) ||
            post.includes(query) ||
            status.includes(query)
          );
        }
        return true;
      })
      .map(row => ({
        'Employee ID': row.employee_id || '--',
        'Reference ID / Personnel Number': row.emp_reference_id || '--',
        'Employee Name': row.emp_name || '--',
        'Working Status': row.working_status || 'Inactive',
        'Organisation': row.organisation_name || '--',
        'Department': row.emp_department_name || '--',
        'Post Name': row.emp_post_name || '--',
        'Class': row.class || '--',
        'Action Date': row.action_date ? String(row.action_date).slice(0, 10) : '--',
        _raw: row
      }));
  }, [employees, isMinistryView, selectedOrg, selectedOrgName, selectedDept, selectedDeptName, selectedClass, selectedPostName, selectedPostLabel, selectedWorkingStatus, debouncedSearch]);

  // Store keeps only the user's changes (all columns are shown by default)
  const handleToggleColumn = (field) => {
    actions.setVisibleCols(prev => ({ ...prev, [field]: prev[field] === false }));
  };

  // Export All Data (full database)
  // Kept for the "Export All" button (not shown on the page yet)
  // eslint-disable-next-line no-unused-vars
  const handleExportAllData = () => {
    if (!employees.length) {
      notify?.(HR_TOASTS.noDataToExport());
      return;
    }
    const exportRows = employees.map((row, index) => ({
      'S.No': index + 1,
      'Employee ID': row.employee_id || '',
      'Reference ID / Personnel Number': row.emp_reference_id || '',
      'Employee Name': row.emp_name || '',
      'Working Status': row.working_status || '',
      'Organisation': row.organisation_name || '',
      'Department': row.emp_department_name || '',
      'Post Name': row.emp_post_name || '',
      'Class': row.class || '',
      'Type of People': row.type_of_people || '',
      'Action Date': row.action_date ? String(row.action_date).slice(0, 10) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Employees');
    XLSX.writeFile(workbook, `employee_database_all_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify?.(HR_TOASTS.employeesExported(exportRows.length));
  };

  // Add Employee Form Submit
  const handleAddEmployeeSubmit = (e) => {
    e.preventDefault();
    if (!newEmpForm.emp_name || !newEmpForm.employee_id) {
      notify?.(COMMON_TOASTS.mandatoryFieldsMissing());
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const newRecord = {
        ...newEmpForm,
        transaction_id: Date.now(),
        emp_master_id: Date.now(),
        organisation_name: getSessionClaims()?.organisationName || 'Organisation',
        action_date: new Date().toISOString(),
        type_of_people: 'General Employee'
      };
      setEmployees(prev => [newRecord, ...prev]);
      setIsSubmitting(false);
      setIsAddEmpModalOpen(false);
      notify?.(HR_TOASTS.employeeAdded(newEmpForm.emp_name, newEmpForm.employee_id));
      setNewEmpForm({
        emp_name: '',
        employee_id: '',
        emp_reference_id: '',
        emp_department_name: '',
        emp_post_name: '',
        class: 'I/A',
        method_of_appointment: 'Direct Recruitment',
        working_status: 'Active',
        join_date: new Date().toISOString().slice(0, 10) });
    }, 300);
  };

  // The employee's details page (profile and service history); editing starts from there
  const openDetails = useCallback((row) => {
    const masterId = row?.emp_master_id ?? row?.employee_master_id ?? row?.employeeMasterId;
    if (masterId == null || masterId === '') {
      notify?.(HR_TOASTS.employeeNotEditable());
      return;
    }
    navigate(`/hr/hr-management/employee-details/${encodeURIComponent(masterId)}`);
  }, [navigate, notify]);

  // AG-Grid Table Column Definitions matching revamp design system
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70,
        maxWidth: 85,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center font-bold text-slate-500">
            {params.node.rowIndex + 1}
          </div>
        )
      },
      {
        field: 'Employee ID',
        headerName: 'Employee ID',
        minWidth: 140,
        cellClass: 'text-center font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center font-semibold text-slate-800 dark:text-slate-200">
            {params.value}
          </div>
        )
      },
      {
        field: 'Reference ID / Personnel Number',
        headerName: 'Reference ID / Personnel Number',
        minWidth: 190,
        cellClass: 'text-center text-slate-600 dark:text-slate-300 flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => (
          <div className="w-full text-center text-slate-600 dark:text-slate-300">
            {params.value}
          </div>
        )
      },
      {
        field: 'Employee Name',
        headerName: 'Employee Name',
        minWidth: 200,
        cellClass: 'text-center flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        // The name opens the employee's details page
        cellRenderer: (params) => (
          <div className="w-full text-center">
            <button
              type="button"
              onClick={() => openDetails(params.data._raw || params.data)}
              title="View employee details"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-semibold cursor-pointer transition-colors"
            >
              {params.value}
            </button>
          </div>
        )
      },
      {
        field: 'Working Status',
        headerName: 'Working Status',
        minWidth: 140,
        cellClass: 'text-center flex items-center justify-center',
        headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
        cellRenderer: (params) => {
          const isActive = String(params.value).toLowerCase() === 'active';
          return (
            <div className="w-full text-center flex items-center justify-center">
              <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold shadow-2xs ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {params.value}
              </span>
            </div>
          );
        }
      }
    ];

    return cols.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [visibleCols, openDetails]);

  // Copy / Export: the rows on the current page, visible data columns only
  const pageStart = (currentPage - 1) * pageSize;
  const runExport = (kind) => createTableExporter({
    loadRows: () => filteredEmployees.slice(pageStart, pageStart + pageSize),
    serialStart: pageStart,
    getColumns: () => columnDefs.filter((c) => c.field).map((c) => ({ field: c.field, label: c.headerName })),
    notify,
    isBusy: loading,
    title: `Employee Database (Page ${currentPage})`,
    fileName: `Employee_Database_Page_${currentPage}`,
    label: 'Employee database' })[kind]();

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Main Content Card */}
      <div className="module-card space-y-4">

        {/* Table Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">

          {/* Left: Filter Toggle Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => actions.setShowFilterPanel(prev => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Right: Entries, Total, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">

            {/* Show Entries */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => actions.setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-[10px] uppercase font-bold text-slate-400">entries</span>
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredEmployees.length}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => actions.setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {columnDefs.filter(c => c.field).map(col => (
                    <label
                      key={col.field}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[col.field] !== false}
                        onChange={() => handleToggleColumn(col.field)}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col.headerName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => runExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => runExport('excel')} onExportPdf={() => runExport('pdf')} color="#0f417a" hoverColor="#1d5594" chevron />
          </div>
        </div>

        {/* Filter Panel (shared HR design) */}
        <div className={showFilterPanel ? 'px-4 pt-4' : ''}>
          <HrFilterPanel show={showFilterPanel} columns={isMinistryView ? 4 : 5}>
            <DeptPostClassFilters
              organisations={isMinistryView ? organisations : undefined}
              organisationId={selectedOrg}
              onOrganisationChange={(value) => actions.setFilters({ organisationId: value, departmentId: '', postId: '' })}
              departments={filterDepartments}
              departmentId={selectedDept}
              onDepartmentChange={(value) => actions.setFilters({ departmentId: value, postId: '' })}
              posts={filterPosts}
              postId={selectedPostName}
              onPostChange={(value) => actions.setFilters({ postId: value })}
              needsOrganisation={isMinistryView && !selectedOrg}
              className={selectedClass}
              onClassChange={(value) => actions.setFilters(classChangeUpdate(value, selectedPostName, deptPosts))}
            />
            {/* Organisation users: Active by default */}
            {!isMinistryView && (
              <FilterSelect
                label="Working Status"
                value={selectedWorkingStatus}
                onChange={(value) => actions.setFilters({ workingStatus: value })}
                allLabel="-- All --"
                options={['Active', 'Inactive']}
              />
            )}
          </HrFilterPanel>
        </div>

        {/* AG-Grid Data Table Area */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f417a] dark:border-blue-400"></div>
              <span className="text-xs font-medium text-slate-500">Loading employee database...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-rose-500">
              <span className="text-xs font-medium">{error}</span>
              <button
                type="button"
                onClick={fetchEmployees}
                className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <Table
              columnDefs={columnDefs}
              rowData={filteredEmployees}
              pagination={true}
              paginationPageSize={pageSize}
              {...gridPage}
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
                cellClass: 'text-center flex items-center justify-center',
                headerClass: 'text-center [&_.ag-header-cell-label]:justify-center' }}
              domLayout="autoHeight"
            />
          )}
        </div>
      </div>


      {/* Add Employee Modal (Organisation View) */}
      {isAddEmpModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          onClick={() => setIsAddEmpModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAddEmpModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shadow-xs">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Employee</h3>
                <p className="text-2xs text-slate-500">Record an employee into your organisation database</p>
              </div>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.emp_name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, emp_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.employee_id}
                    onChange={e => setNewEmpForm({ ...newEmpForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                    placeholder="e.g. 01EMP999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Personnel No
                  </label>
                  <input
                    type="text"
                    value={newEmpForm.emp_reference_id}
                    onChange={e => setNewEmpForm({ ...newEmpForm, emp_reference_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                    placeholder="Personnel Number"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class
                  </label>
                  <select
                    value={newEmpForm.class}
                    onChange={e => setNewEmpForm({ ...newEmpForm, class: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                  >
                    <option value="I/A">I/A</option>
                    <option value="II/B">II/B</option>
                    <option value="III/C">III/C</option>
                    <option value="IV/D">IV/D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newEmpForm.emp_department_name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, emp_department_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                    placeholder="Department Name"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Post / Designation
                  </label>
                  <input
                    type="text"
                    value={newEmpForm.emp_post_name}
                    onChange={e => setNewEmpForm({ ...newEmpForm, emp_post_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                    placeholder="Designation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Method of Appointment
                  </label>
                  <select
                    value={newEmpForm.method_of_appointment}
                    onChange={e => setNewEmpForm({ ...newEmpForm, method_of_appointment: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                  >
                    <option value="Direct Recruitment">Direct Recruitment</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Composite Method">Composite Method</option>
                    <option value="Deputation In">Deputation In</option>
                    <option value="Absorption">Absorption</option>
                    <option value="Transfer In">Transfer In</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Working Status
                  </label>
                  <select
                    value={newEmpForm.working_status}
                    onChange={e => setNewEmpForm({ ...newEmpForm, working_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
