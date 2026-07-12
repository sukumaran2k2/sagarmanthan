import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ClipboardList, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table';

export default function EmployeeDatabase() {
  const [employees, setEmployees] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('55'); // Default to SMPA - Haldia Dock Complex
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Load organisations list
  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation")
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  // Fetch all employees from get-hr-all-employee-data endpoint without pagination params
  useEffect(() => {
    if (!selectedOrg) return;
    setLoading(true);
    axios.get(`http://localhost:3000/get-hr-all-employee-data/1/${selectedOrg}`)
      .then(res => {
        setEmployees(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching employees list:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedOrg]);

  const columnDefs = useMemo(() => [
    { 
      headerName: 'S.No', 
      valueGetter: (params) => params.node.rowIndex + 1,
      minWidth: 70, 
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500'
    },
    { field: 'EMPLOYEE ID', headerName: 'Emp ID', minWidth: 120, pinned: 'left', cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'EMPLOYEE NAME', headerName: 'Employee Name', minWidth: 180, pinned: 'left', cellClass: 'font-extrabold text-slate-900' },
    { field: 'POST NAME', headerName: 'Designation', minWidth: 180 },
    { field: 'DEPARTMENT', headerName: 'Department', minWidth: 180 },
    { field: 'GENDER', headerName: 'Gender', minWidth: 100 },
    { field: 'ETHNIC ORIGIN', headerName: 'Community', minWidth: 120, cellClass: 'text-center font-semibold' },
    { field: 'WHETHER PWBD', headerName: 'Disability', minWidth: 120 },
    { field: 'METHOD OF APPOINTMENT', headerName: 'Employment Type', minWidth: 150 },
    { 
      field: 'EMPLOYEE JOINING DATE', 
      headerName: 'Joining Date', 
      minWidth: 140,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'
    }
  ], []);

  // Frontend filter for search query
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = (emp['EMPLOYEE NAME'] || '').toLowerCase();
      const code = (emp['EMPLOYEE ID'] || '').toLowerCase();
      const designation = (emp['POST NAME'] || '').toLowerCase();
      const department = (emp['DEPARTMENT'] || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm ||
        name.includes(term) ||
        code.includes(term) ||
        designation.includes(term) ||
        department.includes(term);
    });
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageBanner 
        title="Employee Database" 
        description="Comprehensive repository of all staff members, consultants, and young professionals."
        icon={ClipboardList}
      />

      <div className="space-y-6">
        {/* Expandable Filter Container matching ProjectTable.jsx */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`w-full flex items-center justify-between text-left transition cursor-pointer ${
              isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 font-display">Search Filter Controls</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
              {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {isFiltersExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Organisation</label>
                <div className="relative">
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-105 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Select Organisation--</option>
                    {organisations.map(o => (
                      <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Search query</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, code or designation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium text-slate-700"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reusable Table wrapper around ag-Grid with standard pagination */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <Table
            rowData={filteredEmployees}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            enableExport={true}
            exportFileName="Employee_Database_Report"
            exportPdfTitle="Employee Database Report"
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
              suppressSizeToFit: false
            }}
          />
        </div>
      </div>
    </div>
  );
}
