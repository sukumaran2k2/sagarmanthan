import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ChevronDown, X, Pencil, Trash2, Filter, RotateCcw } from 'lucide-react';
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

  const navigate = useNavigate();

  const handleEdit = (data) => {
    navigate('/hr/hr-management/input-form/contractual-data', { state: { editData: data } });
  };

  const handleDelete = (data) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      alert(`Delete record for ${data['Financial Year']} ? Backend API integration pending.`);
    }
  };

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
        field: 'Actions',
        headerName: 'Actions',
        minWidth: 150,
        cellClass: 'text-center',
        headerClass: 'text-center',
        cellRenderer: (params) => (
          <div className="flex items-center justify-center space-x-2 h-full">
            <button 
              onClick={() => handleEdit(params.data)}
              className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded transition cursor-pointer flex items-center justify-center" 
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => handleDelete(params.data)}
              className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded transition cursor-pointer flex items-center justify-center" 
              title="Delete"
            >
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear) count++;
    if (selectedOrg) count++;
    return count;
  }, [selectedYear, selectedOrg]);

  const resetFilters = () => {
    setSelectedOrg('');
    setSelectedYear('');
    setSearchTerm('');
  };

  const [visibleCols, setVisibleCols] = useState(() => {
    const initial = {
      'Organisation Name': true,
      'Financial Year': true,
      'Total for officers level': true,
      'Total for Non-officers level': true,
      'Actions': true
    };
    return initial;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = React.useRef(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalType, setModalType] = useState(''); // 'officer' or 'non-officer'

  const [filterOpen, setFilterOpen] = useState(false);
  const filterDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColumnDefs = useMemo(() => {
    return columnDefs.map(col => {
      if (col.field === 'Total for officers level') {
        return {
          ...col,
          cellRenderer: (params) => (
            <div 
              className="cursor-pointer hover:underline h-full flex items-center justify-center w-full"
              onClick={() => {
                setModalData(params.data);
                setModalType('officer');
                setModalOpen(true);
              }}
            >
              {params.value}
            </div>
          )
        };
      }
      if (col.field === 'Total for Non-officers level') {
        return {
          ...col,
          cellRenderer: (params) => (
            <div 
              className="cursor-pointer hover:underline h-full flex items-center justify-center w-full"
              onClick={() => {
                setModalData(params.data);
                setModalType('non-officer');
                setModalOpen(true);
              }}
            >
              {params.value}
            </div>
          )
        };
      }
      return col;
    }).filter(col => {
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
          <button 
            onClick={() => navigate('/hr/hr-management/input-form/contractual-data')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition cursor-pointer"
          >
            Add Contractual Data
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">
          
          {/* 1. Left: Collapsible Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Collapsible Filter Toggle Button */}
            <button
              onClick={() => setFilterOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border shadow-sm select-none
                ${
                filterOpen || activeFiltersCount > 0
                  ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-blue-600 text-white text-[10px] h-4 w-4 rounded-full font-black">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  filterOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Quick Reset Button if filters active */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer dark:hover:bg-rose-900/30"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

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

        {/* Collapsible Filter Panel */}
        {filterOpen && (
          <div className="bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl p-4 shadow-sm animate-fade-in -mt-1 z-10 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Filter Options
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isMinistryView && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Organisation</label>
                  <select 
                    value={selectedOrg} 
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <option value="">All Organisations</option>
                    {uniqueOrgs.map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Financial Year</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  <option value="">All Years</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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

      {/* Breakdown Modal */}
      {modalOpen && modalData && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          ></div>
          
          <div className="relative bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-[#0f417a] text-white">
              <div>
                <h3 className="text-xl font-bold tracking-wide">
                  {modalType === 'officer' ? 'Contractual Employees - Officer Level' : 'Contractual Employees - Non-Officer Level'}
                </h3>
                <p className="text-blue-100 text-sm mt-0.5 opacity-90">
                  Detailed breakdown of employment categories
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* Context Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {modalData['Organisation Name'] && (
                  <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-4 py-1.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <span className="uppercase text-xs tracking-wider opacity-80">Organisation</span>
                    <span className="text-sm">{modalData['Organisation Name']}</span>
                  </div>
                )}
                <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-4 py-1.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800 shadow-sm">
                  <span className="uppercase text-xs tracking-wider opacity-80">Financial Year</span>
                  <span className="text-sm">{modalData['Financial Year'] || 'N/A'}</span>
                </div>
              </div>
              {/* Grid of Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Direct Engagement */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Direct Engagement
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Direct engagement'] || 0) : (modalData['Non-officer Direct engagement'] || 0)}
                  </span>
                </div>

                {/* Retired from other Govt/PSU */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Retired from Govt/PSU
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Retired from Govt.'] || 0) : (modalData['Non-officer retired from Govt.'] || 0)}
                  </span>
                </div>

                {/* Retired From own Organisation */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Retired from own Org
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Retired from own organisation'] || 0) : (modalData['Non-officer retired from own organisation'] || 0)}
                  </span>
                </div>

                {/* Through Agency */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Through Agency
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - Through agency'] || 0) : (modalData['Non-officer through agency'] || 0)}
                  </span>
                </div>

                {/* For Ministry */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition duration-200 flex flex-col items-center text-center lg:col-span-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    For Ministry
                  </span>
                  <span className="text-3xl font-extrabold text-[#0f417a] dark:text-blue-400">
                    {modalType === 'officer' ? (modalData['Officer - For ministry'] || 0) : (modalData['Non-officer for ministry'] || 0)}
                  </span>
                </div>

              </div>
              
              {/* Total Summary Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Count:</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {modalType === 'officer' ? (modalData['Total for officers level'] || 0) : (modalData['Total for Non-officers level'] || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
