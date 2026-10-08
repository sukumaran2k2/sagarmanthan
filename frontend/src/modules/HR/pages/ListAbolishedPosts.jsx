import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Filter, X, ChevronDown, Check } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { API_BASE_URL } from '../../../config/api';
import { getCurrentUserId, isOrganisationUser, getSessionOrganisationId } from '../../../utils/authSession';

export default function ListAbolishedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPostName, setSelectedPostName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRevokePost, setSelectedRevokePost] = useState(null);
  const [revokeRemarks, setRevokeRemarks] = useState('');
  const [revokeDate, setRevokeDate] = useState('');
  const [revokeFile, setRevokeFile] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRevokePost(null);
    setRevokeRemarks('');
    setRevokeDate('');
    setRevokeFile(null);
  };

  const isMinistryView = useMemo(() => {
    return !isOrganisationUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  useEffect(() => {
    let isMounted = true;
    const orgId = getSessionOrganisationId();
    
    const apiToCall = isMinistryView 
      ? `${API_BASE_URL}/get-permanent-abolished-post/` 
      : `${API_BASE_URL}/get-permanent-abolished-post-org/${orgId || 1}`;

    axios.get(apiToCall)
      .then(res => {
        if (!isMounted) return;
        const rawData = res.data?.query1Result || res.data || [];
        
        const formatDate = (dateStr) => {
          if (!dateStr) return '--';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '--';
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const formatDatePlus5 = (dateStr) => {
          if (!dateStr) return '--';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '--';
          d.setFullYear(d.getFullYear() + 5);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const getStatus = (stageId) => {
          const id = Number(stageId);
          if (id === 9) return { label: 'Request Approved', color: 'bg-emerald-500' };
          if (id === 8) return { label: 'Request Rejected', color: 'bg-rose-500' };
          if (id >= 5 && id <= 7) return { label: 'Request Pending', color: 'bg-blue-500' };
          return { label: 'Request Yet to be Submitted', color: 'bg-sky-400' };
        };

        const formattedData = rawData.map(row => {
          const statusObj = getStatus(row.revival_stage_id);
          return {
            Organisation: row.organisation_name || '--',
            Department: row.department_name || '--',
            'Post Name': row.post_name || '--',
            'Post code': row.post_code || '--',
            'Date of Vacancy': formatDate(row.date_of_arise_in_vacancy),
            'Post Abolition Date': formatDate(row.date_of_arise_in_vacancy),
            'Date of Expiry': formatDatePlus5(row.date_of_arise_in_vacancy),
            'Updated Date': row.updated_date ? formatDate(row.updated_date) : '--',
            Status: statusObj.label,
            StatusColor: statusObj.color,
            'Revival Status': statusObj.label,
            RevivalStatusColor: statusObj.color,
            RevivalStageId: row.revival_stage_id,
            _raw: row,
          };
        });

        setPosts(formattedData);
      })
      .catch(err => {
        console.error("Error loading abolished posts:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [isMinistryView]);

  const uniqueOrgs = useMemo(() => [...new Set(posts.map(item => item['Organisation']).filter(Boolean))].sort(), [posts]);
  const uniqueDepts = useMemo(() => [...new Set(posts.map(item => item['Department']).filter(Boolean))].sort(), [posts]);
  const uniquePostNames = useMemo(() => [...new Set(posts.map(item => item['Post Name']).filter(Boolean))].sort(), [posts]);

  const activeFiltersCount = (selectedOrg ? 1 : 0) + (selectedDept ? 1 : 0) + (selectedPostName ? 1 : 0);

  const clearFilters = () => {
    setSelectedOrg('');
    setSelectedDept('');
    setSelectedPostName('');
    setSearchTerm('');
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(item => {
      if (selectedOrg && item['Organisation'] !== selectedOrg) return false;
      if (selectedDept && item['Department'] !== selectedDept) return false;
      if (selectedPostName && item['Post Name'] !== selectedPostName) return false;

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          String(item['Organisation']).toLowerCase().includes(s) ||
          String(item['Department']).toLowerCase().includes(s) ||
          String(item['Post Name']).toLowerCase().includes(s) ||
          String(item['Post code']).toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [posts, selectedOrg, selectedDept, selectedPostName, searchTerm]);

  const [visibleCols, setVisibleCols] = useState({});
  const handleToggleColumn = (field) => {
    setVisibleCols(prev => ({ ...prev, [field]: prev[field] === false ? true : false }));
  };

  const columnDefs = useMemo(() => {
    const cols = [
      { 
        headerName: 'S.No', 
        valueGetter: (params) => params.node.rowIndex + 1,
        minWidth: 70, maxWidth: 90,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500 bg-slate-50',
        headerClass: 'text-center'
      }
    ];

    if (isMinistryView) {
      cols.push(
        { field: 'Organisation', headerName: 'Organisation', minWidth: 200, pinned: 'left', wrapText: true, autoHeight: true, cellClass: 'font-extrabold text-slate-900 text-center whitespace-normal break-words', headerClass: 'text-center' }
      );
    }

    cols.push(
      { field: 'Department', headerName: 'Department', minWidth: 150, wrapText: true, autoHeight: true, cellClass: 'text-center whitespace-normal break-words', headerClass: 'text-center' },
      { field: 'Post Name', headerName: 'Post Name', minWidth: 200, wrapText: true, autoHeight: true, cellClass: 'text-center font-semibold text-slate-800 whitespace-normal break-words', headerClass: 'text-center' },
      { field: 'Post code', headerName: 'Post code', minWidth: 150, cellClass: 'text-center text-blue-600 font-bold', headerClass: 'text-center' },
      { field: 'Date of Vacancy', headerName: 'Date of Vacancy', minWidth: 180, cellClass: 'text-center font-medium', headerClass: 'text-center' }
    );

    if (isMinistryView) {
      cols.push({
        field: 'Status',
        headerName: 'Status',
        minWidth: 250,
        cellClass: 'text-center', headerClass: 'text-center',
        cellRenderer: (params) => {
          const color = params.data?.StatusColor || 'bg-sky-400';
          return (
            <div className="flex items-center justify-center h-full py-1">
              <span className={`${color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap`}>
                {params.value}
              </span>
            </div>
          );
        }
      });
    } else {
      cols.push(
        { field: 'Date of Expiry', headerName: 'Date of Expiry (5 yr)', minWidth: 180, cellClass: 'text-center font-medium text-amber-600', headerClass: 'text-center' },
        {
          field: 'Revival Status',
          headerName: 'Revival Status',
          minWidth: 220,
          cellClass: 'text-center', headerClass: 'text-center',
          cellRenderer: (params) => {
            const color = params.data?.RevivalStatusColor || 'bg-sky-400';
            return (
              <div className="flex items-center justify-center h-full py-1">
                <span className={`${color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap`}>
                  {params.value}
                </span>
              </div>
            );
          }
        },
        {
          field: 'Updated Date',
          headerName: 'Updated Date',
          minWidth: 160,
          cellClass: 'text-center font-medium', headerClass: 'text-center',
        },
        {
          field: 'Revive abolition',
          headerName: 'Revive abolition',
          minWidth: 180,
          cellClass: 'text-center', headerClass: 'text-center',
          cellRenderer: (params) => {
            const isApproved = params.data?.RevivalStageId === 9;
            if (isApproved) return null;
            return (
              <div className="flex items-center justify-center h-full py-1">
                <button 
                  onClick={() => {
                    setSelectedRevokePost(params.data);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm transition"
                >
                  <span>⟲</span>
                  <span>Revoke</span>
                </button>
              </div>
            );
          }
        }
      );
    }

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
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 relative">
          
          {/* 1. Left: Collapsible Filter Button */}
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
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* 2. Right: Rows, Total Count, Search, Column Visibility, Copy, Export */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            
            {/* Rows Limit */}
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
              Total: {filteredPosts.length}
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
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
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
                    <label key={col.field} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
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

            <CopyButton text={() => filteredPosts.map(p => Object.values(p).join('\\t')).join('\\n')} />
            <ExportDropdown
              data={filteredPosts}
              filename="Abolished_Posts"
              columns={[
                { header: 'Organisation', key: 'Organisation' },
                { header: 'Department', key: 'Department' },
                { header: 'Post Name', key: 'Post Name' },
                { header: 'Post code', key: 'Post code' },
                { header: 'Post Abolition Date', key: 'Post Abolition Date' },
                { header: 'Status', key: 'Status' }
              ]}
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div className={`border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all duration-300 ease-in-out ${showFilterPanel ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className={`p-5 grid grid-cols-1 md:grid-cols-2 ${isMinistryView ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            {isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">-- Show All --</option>
                  {uniqueOrgs.map(org => <option key={org} value={org}>{org}</option>)}
                </select>
              </div>
            )}
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
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">{isMinistryView ? 'Post Name' : 'Post name'}</label>
              <select
                value={selectedPostName}
                onChange={e => setSelectedPostName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              >
                <option value="">-- Show All --</option>
                {uniquePostNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            {!isMinistryView && (
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Class</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                >
                  <option value="">-- Show All --</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Data Table Area */}
        <div className="p-0 border-t border-slate-200 dark:border-slate-800 flex-1 bg-white dark:bg-slate-900 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f417a] dark:border-blue-400"></div>
            </div>
          ) : (
            <Table
              columnDefs={columnDefs}
              rowData={filteredPosts}
              pagination={true}
              paginationPageSize={pageSize}
              defaultColDef={{
                minWidth: 120,
                flex: 1,
                filter: true,
                sortable: true,
                resizable: true,
              }}
              domLayout="autoHeight"
              className="border-none [&_.ag-header]:bg-blue-900 [&_.ag-header-cell-text]:text-white"
            />
          )}
        </div>
      </div>

      {/* Revoke Modal Overlay */}
      {isModalOpen && selectedRevokePost
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              onClick={closeModal}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-800">Post Revival</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit a revival request for this abolished post.
                  </p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Post Code</label>
                    <div className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {selectedRevokePost['Post code']}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Remarks<span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={revokeRemarks}
                      onChange={(e) => {
                        setRevokeRemarks(e.target.value);
                        setRevokeDate('');
                        setRevokeFile(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      disabled={isBusy}
                    >
                      <option value="">Select Remarks</option>
                      <option value="Erroneous Data entry">Erroneous Data entry</option>
                      <option value="Approved by ministry for revival">Approved by ministry for revival</option>
                    </select>
                  </div>

                  {revokeRemarks === 'Approved by ministry for revival' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Date of arise in vacancy<span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={revokeDate}
                          onChange={(e) => setRevokeDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          disabled={isBusy}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Upload Document<span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setRevokeFile(e.target.files[0] || null)}
                          className="w-full rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          disabled={isBusy}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isBusy}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      if (!revokeRemarks) {
                        alert('Please select remarks first.');
                        return;
                      }
                      if (revokeRemarks === 'Approved by ministry for revival') {
                        if (!revokeDate) { alert('Please enter the date of arise in vacancy.'); return; }
                        if (!revokeFile) { alert('Please upload the required document.'); return; }
                      }
                      setIsBusy(true);
                      // TODO: Call submit API
                      setTimeout(() => {
                        alert('Post Revival request submitted successfully!');
                        setIsBusy(false);
                        closeModal();
                      }, 800);
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isBusy ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
