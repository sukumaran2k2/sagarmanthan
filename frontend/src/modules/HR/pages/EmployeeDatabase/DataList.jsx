import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { fetchEmployeeList } from '../../api';
import Table from '../../../../components/Table';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../../utils/authSession';
import { COMMON_TOASTS } from '../../../../utils/notify';
import { HR_TOASTS } from '../../toastMessages';
import { useHrStore } from '../../store/useHrStore';
import { useDebouncedSearch } from '../../hooks/usePagedList';
import { useGridPage } from '../../hooks/useGridPage';
import { createTableExporter } from '../../utils/exportTable';
import { HrFilterPanel, FilterSelect, DeptPostClassFilters } from '../../components/HrFilterPanel';
import { classChangeUpdate, useDeptPosts, useHrDepartments } from '../../hooks/useHrFilterOptions';
import { matchesIdOrName, nameOf } from './employeeFilters';
import { formatDate } from '../../utils/dates';
import { HrColumnPicker, HrCopyExport, HrFilterToggle, HrRowsSelect, HrSearchBox, HrTotalBadge } from '../../components/HrListToolbar';

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


  // Fetch Employee Database. Only the latest request may update state (stale-response guard).
  const latestRequestRef = useRef(0);
  const fetchEmployees = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      // Role and organisation come from the token; never guess them (the server scopes by them)
      const claims = getSessionClaims() || {};
      const roleId = claims.roleId || claims.role_id;
      const orgId = !isMinistryView ? (getSessionOrganisationId() || claims.organisationId) : 'null';
      if (!roleId || !orgId) {
        setEmployees([]);
        setError('Your session has expired. Please sign in again.');
        return;
      }
      const res = await fetchEmployeeList(roleId, orgId);
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
        'Action Date': formatDate(row.action_date),
        _raw: row
      }));
  }, [employees, isMinistryView, selectedOrg, selectedOrgName, selectedDept, selectedDeptName, selectedClass, selectedPostName, selectedPostLabel, selectedWorkingStatus, debouncedSearch]);

  // Store keeps only the user's changes (all columns are shown by default)
  const handleToggleColumn = (field) => {
    actions.setVisibleCols(prev => ({ ...prev, [field]: prev[field] === false }));
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

  // AG-Grid Table Column Definitions (all columns; the grid shows the visible ones)
  const allColumnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70,
        maxWidth: 85,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
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

    return cols;
  }, [openDetails]);
  const columnDefs = useMemo(() => allColumnDefs.filter(col => {
    if (col.headerName === 'S.No') return true;
    if (col.field) return visibleCols[col.field] !== false;
    return true;
  }), [allColumnDefs, visibleCols]);

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

          <div className="flex flex-wrap items-center gap-2.5">
            <HrFilterToggle
              open={showFilterPanel}
              activeCount={activeFiltersCount}
              onToggle={() => actions.setShowFilterPanel(prev => !prev)}
              onReset={clearFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <HrRowsSelect value={pageSize} onChange={actions.setPageSize} />
            <HrTotalBadge count={filteredEmployees.length} />
            <HrSearchBox value={searchTerm} onChange={actions.setSearchTerm} />
            <HrColumnPicker
              columns={allColumnDefs
                .filter(c => c.field)
                .map(c => ({ key: c.field, label: c.headerName, visible: visibleCols[c.field] !== false }))}
              onToggle={handleToggleColumn}
            />
            <HrCopyExport onCopy={() => runExport('copy')} onExcel={() => runExport('excel')} onPdf={() => runExport('pdf')} />
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


    </div>
  );
}
