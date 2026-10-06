import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronDown, X, Pencil, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { getCurrentUserId, isOrganisationUser } from '../../../utils/authSession';

export default function ContractualEmployment() {
  const [staff, setStaff] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;
    const userId = getCurrentUserId() || '1';

    axios.get(`${API_BASE_URL}/get-all-contractual-data/${userId}`)
      .then(res => {
        if (isMounted) {
          console.log("Contractual data received:", res.data);
          setStaff(res.data || []);
        }
      })
      .catch(err => {
        console.error("Error loading staff data:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const isMinistryView = useMemo(() => {
    return !isOrganisationUser();
  }, []);

  const columnDefs = useMemo(() => {
    const cols = [
      { headerName: 'S.No', valueGetter: 'node.rowIndex + 1', minWidth: 80, maxWidth: 100, pinned: 'left', cellClass: 'text-center font-bold text-slate-500', headerClass: 'text-center' },
      { field: 'Organisation Name', headerName: 'Organisation Name', minWidth: 250, pinned: 'left', cellClass: 'font-extrabold text-slate-900 text-center', headerClass: 'text-center' },
      { field: 'Financial Year', headerName: 'Financial Year', minWidth: 150, cellClass: 'text-center', headerClass: 'text-center' },
      { field: 'Total for officers level', headerName: 'Total Contractual Employees at Officer level', minWidth: 250, cellClass: 'text-center font-bold text-blue-600', headerClass: 'text-center' },
      { field: 'Total for Non-officers level', headerName: 'Total Contractual Employees at Non Officer level', minWidth: 250, cellClass: 'text-center font-bold text-blue-600', headerClass: 'text-center' }
    ];
    
    if (!isMinistryView) {
      cols.push({
        headerName: 'Update',
        minWidth: 150,
        cellClass: 'text-center',
        headerClass: 'text-center',
        cellRenderer: (params) => (
          <div className="flex items-center justify-center space-x-2 h-full">
            <button className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded transition cursor-pointer flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded transition cursor-pointer flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      });
    }
    
    return cols;
  }, [isMinistryView]);

  const uniqueOrgs = useMemo(() => {
    return [...new Set(staff.map(item => item['Organisation Name']).filter(Boolean))].sort();
  }, [staff]);

  const uniqueYears = useMemo(() => {
    return [...new Set(staff.map(item => item['Financial Year']).filter(Boolean))].sort();
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchOrg = selectedOrg === '' || s['Organisation Name'] === selectedOrg;
      const matchYear = selectedYear === '' || s['Financial Year'] === selectedYear;
      
      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
                          (s['Organisation Name'] || '').toLowerCase().includes(term) ||
                          (s['Financial Year'] || '').toLowerCase().includes(term);
      
      return matchOrg && matchYear && matchSearch;
    });
  }, [staff, selectedOrg, selectedYear, searchTerm]);

  const [visibleCols, setVisibleCols] = useState(() => {
    const initial = {
      'Organisation Name': true,
      'Financial Year': true,
      'Total for officers level': true,
      'Total for Non-officers level': true,
      'Update': true
    };
    return initial;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColumnDefs = useMemo(() => {
    return columnDefs.filter(col => {
      if (col.headerName === 'S.No') return true;
      if (col.field) return visibleCols[col.field] !== false;
      return true;
    });
  }, [columnDefs, visibleCols]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Top Action Row for Org View */}
      {!isMinistryView && (
        <div className="flex justify-end mb-4">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition cursor-pointer">
            Add Contractual Data
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center gap-4">
          
          {/* 1. Left: Filter Drops */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Org Dropdown (Only in Ministry View) */}
            {isMinistryView && (
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="">All Organisations</option>
                  {uniqueOrgs.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Year Dropdown */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {(selectedOrg || selectedYear) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrg('');
                  setSelectedYear('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="hidden lg:block flex-1" />

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows Limit */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
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
            </div>

            {/* Total Count */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredStaff.length}
            </div>

            {/* Column Visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-[9999] animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onClick={() => {}} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => {}} onExportPdf={() => {}} color="#0f417a" hoverColor="#134e96" />
          </div>
        </div>

        {/* Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800">
          <Table
            rowData={filteredStaff}
            columnDefs={activeColumnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            defaultColDef={{
              minWidth: 120,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
