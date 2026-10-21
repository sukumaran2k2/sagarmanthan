import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  ChevronDown, 
  X, 
  User, 
  Filter, 
  RotateCcw,
  CheckCircle2,
  Building,
  Briefcase,
  Layers,
  Calendar,
  ShieldCheck,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';

export default function EmployeeDatabase({ triggerNotification }) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine if Organisation or Ministry view
  const isMinistryView = useMemo(() => !isOrganisationUser(), []);

  // Filter States
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPostName, setSelectedPostName] = useState('');
  // In Org view, default working status is 'Active'
  const [selectedWorkingStatus, setSelectedWorkingStatus] = useState(!isMinistryView ? 'Active' : '');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Column Visibility
  const [visibleCols, setVisibleCols] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Modals
  const [selectedEmpForDetails, setSelectedEmpForDetails] = useState(null);
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
    join_date: new Date().toISOString().slice(0, 10),
  });
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

  // Fetch Employee Database
  const fetchEmployees = async () => {
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
      const data = Array.isArray(res.data) ? res.data : [];
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employee list:', err);
      setError('Failed to fetch employee database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [isMinistryView]);

  // Derived filter options
  const uniqueOrgs = useMemo(() => {
    return [...new Set(employees.map(e => e.organisation_name).filter(Boolean))].sort();
  }, [employees]);

  const uniqueDepts = useMemo(() => {
    return [...new Set(employees.map(e => e.emp_department_name).filter(Boolean))].sort();
  }, [employees]);

  const uniqueClasses = useMemo(() => {
    const list = [...new Set(employees.map(e => e.class).filter(c => c && c.trim() !== ''))].sort();
    return list.length ? list : ['I/A', 'II/B', 'III/C', 'IV/D'];
  }, [employees]);

  const uniquePostNames = useMemo(() => {
    return [...new Set(employees.map(e => e.emp_post_name).filter(Boolean))].sort();
  }, [employees]);

  const activeFiltersCount = 
    (selectedOrg ? 1 : 0) + 
    (selectedDept ? 1 : 0) + 
    (selectedClass ? 1 : 0) + 
    (selectedPostName ? 1 : 0) + 
    (!isMinistryView && selectedWorkingStatus && selectedWorkingStatus !== 'Active' ? 1 : 0);

  const clearFilters = () => {
    setSelectedOrg('');
    setSelectedDept('');
    setSelectedClass('');
    setSelectedPostName('');
    setSelectedWorkingStatus(!isMinistryView ? 'Active' : '');
    setSearchTerm('');
    setExactMatch(false);
  };

  // Filtered dataset mapped for table display
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(item => {
        if (isMinistryView && selectedOrg && item.organisation_name !== selectedOrg) return false;
        if (selectedDept && item.emp_department_name !== selectedDept) return false;
        if (selectedClass && item.class !== selectedClass) return false;
        if (!isMinistryView && selectedPostName && item.emp_post_name !== selectedPostName) return false;
        if (selectedWorkingStatus && selectedWorkingStatus !== '') {
          if (item.working_status !== selectedWorkingStatus) return false;
        }

        if (searchTerm.trim()) {
          const query = searchTerm.trim().toLowerCase();
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
  }, [employees, isMinistryView, selectedOrg, selectedDept, selectedClass, selectedPostName, selectedWorkingStatus, searchTerm]);

  const handleToggleColumn = (field) => {
    setVisibleCols(prev => ({ ...prev, [field]: prev[field] === false ? true : false }));
  };

  // Notification helper
  const notify = (msg, type = 'success') => {
    if (triggerNotification) {
      triggerNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  // Export All Data (full database)
  const handleExportAllData = () => {
    if (!employees.length) {
      notify('No data available to export.', 'error');
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
    notify('All employee records exported successfully!');
  };

  // Add Employee Form Submit
  const handleAddEmployeeSubmit = (e) => {
    e.preventDefault();
    if (!newEmpForm.emp_name || !newEmpForm.employee_id) {
      notify('Please fill out all required fields.', 'error');
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
      notify(`Employee ${newEmpForm.emp_name} (${newEmpForm.employee_id}) added successfully!`);
      setNewEmpForm({
        emp_name: '',
        employee_id: '',
        emp_reference_id: '',
        emp_department_name: '',
        emp_post_name: '',
        class: 'I/A',
        method_of_appointment: 'Direct Recruitment',
        working_status: 'Active',
        join_date: new Date().toISOString().slice(0, 10),
      });
    }, 300);
  };

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
        cellRenderer: (params) => (
          <div className="w-full text-center">
            <button
              type="button"
              onClick={() => setSelectedEmpForDetails(params.data._raw || params.data)}
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
  }, [visibleCols]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">
          
          {/* Left: Filter Toggle Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
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
                onChange={(e) => setPageSize(Number(e.target.value))}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
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

            {/* Copy Button */}
            <CopyButton
              text={() => {
                const headers = [
                  'S.No',
                  'Employee ID',
                  'Reference ID / Personnel Number',
                  'Employee Name',
                  'Working Status'
                ];
                const rows = filteredEmployees.map((p, idx) => [
                  idx + 1,
                  p['Employee ID'],
                  p['Reference ID / Personnel Number'],
                  p['Employee Name'],
                  p['Working Status']
                ].join('\t'));
                return [headers.join('\t'), ...rows].join('\n');
              }}
            />

            {/* Export Dropdown */}
            <ExportDropdown
              data={filteredEmployees}
              filename="Employee_Database"
              columns={[
                { header: 'Employee ID', key: 'Employee ID' },
                { header: 'Reference ID / Personnel Number', key: 'Reference ID / Personnel Number' },
                { header: 'Employee Name', key: 'Employee Name' },
                { header: 'Working Status', key: 'Working Status' }
              ]}
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div className={`border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all duration-300 ease-in-out ${showFilterPanel ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className={`p-5 grid grid-cols-1 md:grid-cols-2 ${isMinistryView ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
            
            {/* Ministry View: Organisation Filter */}
            {isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">Show All</option>
                  {uniqueOrgs.map(org => <option key={org} value={org}>{org}</option>)}
                </select>
              </div>
            )}

            {/* Department Filter (Both views) */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Department</label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">-- Show All --</option>
                {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            {/* Class Filter (Both views) */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Class</label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">-- Show All --</option>
                {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>

            {/* Org View: Post Name Filter */}
            {!isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Post Name</label>
                <select
                  value={selectedPostName}
                  onChange={e => setSelectedPostName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">-- Show All --</option>
                  {uniquePostNames.map(post => <option key={post} value={post}>{post}</option>)}
                </select>
              </div>
            )}

            {/* Org View: Working Status Filter */}
            {!isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Working Status</label>
                <div className="relative">
                  <select
                    value={selectedWorkingStatus}
                    onChange={e => setSelectedWorkingStatus(e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="">-- Show All --</option>
                  </select>
                  {selectedWorkingStatus === 'Active' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* AG-Grid Data Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800 flex-1 bg-white dark:bg-slate-900 min-h-[400px]">
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
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
                cellClass: 'text-center flex items-center justify-center',
                headerClass: 'text-center [&_.ag-header-cell-label]:justify-center',
              }}
              domLayout="autoHeight"
              className="border-none [&_.ag-header]:bg-[#28408f] [&_.ag-header-cell-text]:text-white [&_.ag-header-cell-label]:justify-center [&_.ag-cell]:justify-center [&_.ag-cell]:text-center"
            />
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmpForDetails && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          onClick={() => setSelectedEmpForDetails(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedEmpForDetails(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shadow-xs">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedEmpForDetails.emp_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Employee ID: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmpForDetails.employee_id}</span>
                </p>
              </div>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Personnel / Ref No</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.emp_reference_id || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Working Status</span>
                  <span className={`inline-block px-2.5 py-0.5 text-2xs font-bold rounded-full ${
                    selectedEmpForDetails.working_status === 'Active' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {selectedEmpForDetails.working_status}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Organisation</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.organisation_name || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Department</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.emp_department_name || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Post / Designation</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.emp_post_name || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Class</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.class || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Employment Category</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedEmpForDetails.type_of_people || '--'}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider mb-0.5">Action Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedEmpForDetails.action_date ? String(selectedEmpForDetails.action_date).slice(0, 10) : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setSelectedEmpForDetails(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
