import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import { Search, X, Edit, UserMinus, ChevronDown, Filter, Loader2 } from 'lucide-react';
import api, { fetchYoungProfessionals, relieveYoungProfessional } from '../api';
import { getCurrentUserId } from '../../../utils/authSession';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';

export default function DataList({
  onEdit,
  triggerNotification,
  wings = [],
  divisions = [],
  canEdit = true,
  canAdd = true,
  canRemove = true
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeYpCount, setActiveYpCount] = useState(0);
  const [relievedYpCount, setRelievedYpCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('active'); // 'active' | 'relieved'
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Relieve Modal
  const [relieveModalOpen, setRelieveModalOpen] = useState(false);
  const [selectedYp, setSelectedYp] = useState(null);
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingRelieve, setSubmittingRelieve] = useState(false);
  const [gridApi, setGridApi] = useState(null);

  // Column visibility checklist dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    name: true,
    role: true,
    wing: true,
    division: true
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to page 1 on filter changes
  const handleWingChange = (val) => {
    setSelectedWing(val);
    setSelectedDivision('');
    setCurrentPage(1);
  };

  const handleDivisionChange = (val) => {
    setSelectedDivision(val);
    setCurrentPage(1);
  };

  const handleStatusTabChange = (status) => {
    setActiveStatusTab(status);
    setCurrentPage(1);
  };

  const activeFiltersCount = (selectedWing ? 1 : 0) + (selectedDivision ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch server data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchYoungProfessionals({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        wing: selectedWing,
        division: selectedDivision,
        status: activeStatusTab
      });

      const payload = res.data;
      if (payload && payload.data && payload.pagination) {
        const rows = payload.data || [];
        const pag = payload.pagination;
        setData(rows.map((item, index) => ({
          ...item,
          sNo: (pag.page - 1) * pag.limit + index + 1
        })));
        setTotalCount(pag.total || 0);
        setTotalPages(pag.totalPages || 1);
        setActiveYpCount(pag.activeCount || 0);
        setRelievedYpCount(pag.relievedCount || 0);
      } else {
        const list = Array.isArray(payload) ? payload : [];
        setData(list.map((item, idx) => ({ ...item, sNo: idx + 1 })));
        setTotalCount(list.length);
        setTotalPages(Math.ceil(list.length / pageSize) || 1);
      }
    } catch (err) {
      console.error("Error loading young professionals:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedWing, selectedDivision, activeStatusTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Static fallback lists
  const STATIC_WINGS = [
    'Shipping', 'Vigilance', 'Ports', 'IWT', 'Administration',
    'Coord-I', 'Coord-II', 'DGLL, Parliament & TRW', 'Development',
    'Finance', 'Sagarmala', 'Information Technology',
    'Office of Economic Advisor', 'Special Initiatives & Projects'
  ];

  const STATIC_DIVISIONS = [
    'Shipping-I', 'Shipping-II', 'Shipping-III', 'Vigilance',
    'PD-I', 'PD-II', 'PPP', 'PHRD', 'IWT-I', 'IWT-II', 'Admn.',
    'Coord-I', 'Coord-II', 'DGLL, Parl. & TRW', 'Devlopment',
    'Finance', 'Sagarmala -I', 'Sagarmala -II',
    'Sagarmala-III , ALHW & Media', 'IT', 'PD-III', 'PD- IV',
    'Special Initiatives & Projects'
  ];

  const wingOptions = useMemo(() => {
    if (wings.length > 0) {
      return wings.map(w => ({
        value: w.wing_name ?? w.label ?? w.value ?? String(w),
        label: w.wing_name ?? w.label ?? w.value ?? String(w),
        wing_id: w.wing_id
      }));
    }
    return STATIC_WINGS.map(name => ({ value: name, label: name }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    if (!selectedWing) return [];
    if (divisions.length > 0) {
      const matchingWing = wings.find(w => 
        String(w.wing_name ?? w.label ?? w.value ?? '') === String(selectedWing) || 
        String(w.wing_id ?? '') === String(selectedWing)
      );
      const targetWingId = matchingWing ? matchingWing.wing_id : null;
      let filtered = divisions;
      if (targetWingId !== undefined && targetWingId !== null) {
        filtered = divisions.filter(d => String(d.wing_id) === String(targetWingId));
      } else {
        filtered = divisions.filter(d => 
          String(d.wing_name ?? d.wing ?? '') === String(selectedWing)
        );
      }
      return filtered.map(d => ({
        value: d.division_name ?? d.label ?? d.value ?? String(d),
        label: d.division_name ?? d.label ?? d.value ?? String(d)
      }));
    }
    return STATIC_DIVISIONS.map(name => ({ value: name, label: name }));
  }, [divisions, wings, selectedWing]);

  // Sync division selection if current division is not in filtered list
  useEffect(() => {
    if (selectedDivision) {
      const exists = divisionOptions.some(d => String(d.value) === String(selectedDivision));
      if (!exists) {
        setSelectedDivision('');
      }
    }
  }, [divisionOptions, selectedDivision]);

  const handleOpenRelieve = (yp) => {
    setSelectedYp(yp);
    setLastWorkingDate('');
    setRemarks('');
    setRelieveModalOpen(true);
  };

  const handleRelieveSubmit = async (e) => {
    e.preventDefault();
    if (!lastWorkingDate) {
      if (triggerNotification) triggerNotification("Please select the last working date.", "warning");
      return;
    }
    setSubmittingRelieve(true);

    const activeUserId = getCurrentUserId() || 1;

    try {
      await relieveYoungProfessional({
        candidateId: selectedYp.yp_id,
        lastWorkingDate,
        remarks,
        updated_by: activeUserId
      });
      if (triggerNotification) {
        triggerNotification(`${selectedYp.name} has been relieved successfully.`, 'success');
      }
      setRelieveModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      if (triggerNotification) triggerNotification("Failed to relieve young professional.", "error");
    } finally {
      setSubmittingRelieve(false);
    }
  };

  const handleExport = async (type) => {
    if (type === 'Copy') {
      if (gridApi) {
        let tsv = '';
        const headers = [];
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            headers.push(col.headerName);
          }
        });
        tsv += headers.join('\t') + '\n';
        
        data.forEach((row, rowIndex) => {
          const line = [];
          columnDefs.forEach(col => {
            if (col.headerName && col.headerName !== 'Action') {
              let val = '';
              if (col.field === 'sNo') {
                val = row.sNo || rowIndex + 1;
              } else if (col.field === 'is_active') {
                val = (row[col.field] === 1 || row[col.field] === true) ? 'Active' : 'Relieved';
              } else {
                val = row[col.field] !== undefined ? row[col.field] : '';
              }
              line.push(val);
            }
          });
          tsv += line.join('\t') + '\n';
        });
        
        navigator.clipboard.writeText(tsv)
          .then(() => {
            if (triggerNotification) triggerNotification('Current page data copied to clipboard!', 'success');
          })
          .catch(() => {
            if (triggerNotification) triggerNotification('Failed to copy table data.', 'error');
          });
      } else {
        if (triggerNotification) triggerNotification("Grid is not ready for copy yet.", "warning");
      }
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Young_Professionals_Page_${currentPage}.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Register data exported to Excel (CSV) successfully!`, 'success');
        }
      } else {
        if (triggerNotification) triggerNotification("Grid is not ready for export yet.", "warning");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`, 'info');
      }

      const printWindow = window.open('', '_blank');
      const title = 'Young Professionals - Data List';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && col.headerName !== 'Action') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      data.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            let val = '';
            if (col.field === 'sNo') {
              val = row.sNo || rowIndex + 1;
            } else if (col.field === 'is_active') {
              val = (row[col.field] === 1 || row[col.field] === true) ? 'Active' : 'Relieved';
            } else {
              val = row[col.field] !== undefined ? row[col.field] : '';
            }
            rowsHtml += `<td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 11px;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 5px; color: #0f417a; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headersHtml}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const columnDefs = useMemo(() => {
    return [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 80,
        maxWidth: 80,
        pinned: 'left',
        suppressSizeToFit: true,
        cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center',
        headerClass: 'text-center'
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1.5,
        minWidth: 160,
        pinned: 'left',
        hide: !visibleCols.name,
        cellRenderer: (params) => {
          const val = params.value || '-';
          return (
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
            </div>
          );
        }
      },
      {
        field: 'role',
        headerName: 'Role',
        flex: 1.2,
        minWidth: 140,
        hide: !visibleCols.role,
        cellRenderer: (params) => {
          return (
            <span className="text-slate-600 dark:text-slate-300 font-medium">{params.value || '-'}</span>
          );
        }
      },
      {
        field: 'wing',
        headerName: 'Wing',
        flex: 1.2,
        minWidth: 140,
        hide: !visibleCols.wing,
        cellRenderer: (params) => {
          return (
            <span className="text-slate-600 dark:text-slate-300">{params.value || '-'}</span>
          );
        }
      },
      {
        field: 'division',
        headerName: 'Division',
        flex: 1.2,
        minWidth: 140,
        hide: !visibleCols.division,
        cellRenderer: (params) => {
          return (
            <span className="text-slate-600 dark:text-slate-300">{params.value || '-'}</span>
          );
        }
      },
      {
        headerName: 'Action',
        width: 110,
        pinned: 'right',
        headerClass: 'text-center',
        cellClass: 'text-center flex items-center justify-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const item = params.data;
          if (!item) return null;
          const isActive = item.is_active === 1 || item.is_active === true;

          return (
            <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
              {canEdit && (
                <button
                  onClick={() => onEdit(item)}
                  title="Edit Young Professional"
                  className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canRemove && isActive && (
                <button
                  onClick={() => handleOpenRelieve(item)}
                  title="Relieve Young Professional"
                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      }
    ];
  }, [onEdit, visibleCols, canEdit, canRemove]);

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Category selector tabs (Sub-tabs) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          onClick={() => handleStatusTabChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'active'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          ACTIVE YPS ({activeYpCount})
        </button>
        <button
          onClick={() => handleStatusTabChange('relieved')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeStatusTab === 'relieved'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          RELIEVED YPS ({relievedYpCount})
        </button>
      </div>

      {/* Main Table Card Container matching GMIS style */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 dark:bg-slate-950 dark:border-slate-800">

        {/* Search, Filters and Actions Toolbar matching GMIS format */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Left: Dedicated Filter Button + Reset */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
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
                onClick={() => {
                  setSelectedWing('');
                  setSelectedDivision('');
                  setCurrentPage(1);
                  triggerNotification?.('Filters have been reset', 'info');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* 2. Middle Spacer */}
          <div className="hidden lg:block flex-1" />

          {/* 3. Right: Search Input + Row Count + Total + Visibility + Copy + Export + View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search YP details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows Limit Select Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Total Count Badge */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {totalCount}
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col === 'status' ? 'Status' : col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              onCopy={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1d5594"
            />

          </div>
        </div>

        {/* Collapsible Filter Panel matching GMIS style */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            {/* Wing Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Wing
              </label>
              <div className="relative">
                <select
                  value={selectedWing}
                  onChange={(e) => handleWingChange(e.target.value)}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Wings</option>
                  {wingOptions.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Division Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Division
              </label>
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  disabled={!selectedWing}
                  className={`appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer ${
                    !selectedWing ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''
                  }`}
                >
                  <option value="">
                    {!selectedWing ? 'Select Wing First' : 'All Divisions'}
                  </option>
                  {divisionOptions.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={data}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true
            }}
          />
          
          {/* Server-Side Pagination Bar */}
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={totalCount}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
            onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />

          <style dangerouslySetInnerHTML={{
            __html: `
            .ag-theme-quartz.rounded-xl,
            .ag-theme-quartz.rounded-2xl {
              border-radius: 16px !important;
            }
            .ag-theme-quartz .ag-root-wrapper {
              border-radius: 16px 16px 0 0 !important;
            }
            .ag-theme-quartz .ag-header {
              background-color: #0f417a !important;
              border-bottom: 2px solid #0a2d55 !important;
            }
            .ag-theme-quartz .ag-header-cell {
              color: #ffffff !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              font-size: 11px !important;
              letter-spacing: 0.05em !important;
            }
            .ag-theme-quartz .ag-header-cell .ag-icon {
              color: #ffffff !important;
            }
            .ag-theme-quartz .ag-header-cell-label {
              color: #ffffff !important;
            }
            .ag-theme-quartz .ag-row {
              font-size: 13px !important;
              border-bottom: 1px solid #f1f5f9 !important;
            }
            .ag-theme-quartz .ag-row-hover {
              background-color: #f8fafc !important;
            }
            .dark .ag-theme-quartz .ag-row-hover {
              background-color: #1e293b !important;
            }
            `
          }} />
        </div>

      </div>

      {/* Relieve Modal Dialog */}
      {relieveModalOpen && selectedYp
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              onClick={() => !submittingRelieve && setRelieveModalOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Relieve Candidate</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    You are about to relieve{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedYp.name}
                    </span>{' '}
                    from the organization.
                  </p>
                </div>

                <form onSubmit={handleRelieveSubmit}>
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Last Working Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={lastWorkingDate}
                        onChange={(e) => setLastWorkingDate(e.target.value)}
                        disabled={submittingRelieve}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-2.5 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Remarks / Reason
                      </label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter remarks for relieving..."
                        disabled={submittingRelieve}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs p-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                      />
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRelieveModalOpen(false)}
                      disabled={submittingRelieve}
                      className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRelieve}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition cursor-pointer flex items-center gap-1.5"
                    >
                      {submittingRelieve && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{submittingRelieve ? 'Relieving...' : 'Relieve Candidate'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

    </div>
  );
}
