import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import { Search, X, Edit, UserMinus, BarChart3, List, ChevronDown, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchYoungProfessionals, relieveYoungProfessional } from '../api';

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function DataList({
  onEdit,
  triggerNotification,
  wings = [],
  divisions = []
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
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'

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
    division: true,
    status: true
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
        label: w.wing_name ?? w.label ?? w.value ?? String(w)
      }));
    }
    return STATIC_WINGS.map(name => ({ value: name, label: name }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    if (divisions.length > 0) {
      return divisions.map(d => ({
        value: d.division_name ?? d.label ?? d.value ?? String(d),
        label: d.division_name ?? d.label ?? d.value ?? String(d)
      }));
    }
    return STATIC_DIVISIONS.map(name => ({ value: name, label: name }));
  }, [divisions]);

  // Group data by wing for the chart visualization
  const chartData = useMemo(() => {
    const counts = {};
    data.forEach(item => {
      const w = item.wing || 'Unknown';
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'In Position': counts[key]
    }));
  }, [data]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleOpenRelieve = (yp) => {
    setSelectedYp(yp);
    setLastWorkingDate('');
    setRemarks('');
    setRelieveModalOpen(true);
  };

  const handleRelieveSubmit = async (e) => {
    e.preventDefault();
    if (!lastWorkingDate) {
      alert("Please select the last working date.");
      return;
    }
    setSubmittingRelieve(true);

    const token = localStorage.getItem('accessToken');
    let activeUserId = 1;
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.userId) {
        activeUserId = decoded.userId;
      }
    }

    try {
      await relieveYoungProfessional({
        candidateId: selectedYp.yp_id,
        lastWorkingDate,
        remarks,
        updated_by: activeUserId
      });
      if (triggerNotification) {
        triggerNotification(`${selectedYp.name} has been relieved successfully.`);
      }
      setRelieveModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to relieve young professional.");
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
            if (triggerNotification) triggerNotification('Current page data copied to clipboard!');
          })
          .catch(() => alert('Failed to copy table data.'));
      } else {
        alert("Grid is not ready for copy yet.");
      }
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Young_Professionals_Page_${currentPage}.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Exported to CSV successfully!`);
        }
      } else {
        alert("Grid is not ready for export yet.");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`);
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

  const columnDefs = useMemo(() => [
    {
      field: 'sNo',
      headerName: 'S.No',
      minWidth: 95,
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center'
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.5,
      minWidth: 160,
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.name
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-700 dark:text-slate-350 font-semibold',
      hide: !visibleCols.role
    },
    {
      field: 'wing',
      headerName: 'Wing',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-600 dark:text-slate-400 font-medium',
      hide: !visibleCols.wing
    },
    {
      field: 'division',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-655 dark:text-slate-400 font-medium',
      hide: !visibleCols.division
    },
    {
      field: 'is_active',
      headerName: 'Status',
      minWidth: 120,
      hide: !visibleCols.status,
      cellRenderer: (params) => {
        const isActive = params.value === 1 || params.value === true;
        return (
          <span className={`text-xs font-black uppercase ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isActive ? 'Active' : 'Relieved'}
          </span>
        );
      }
    },
    {
      headerName: 'Action',
      minWidth: 120,
      cellRenderer: (params) => {
        const yp = params.data;
        const isActive = yp.is_active === 1 || yp.is_active === true;
        return (
          <div className="flex items-center w-full h-full py-1">
            <div className="w-1/2 flex justify-end pr-2">
              <button
                onClick={() => onEdit(yp)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
                title="Update"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="w-1/2 flex justify-start pl-2">
              {isActive ? (
                <button
                  onClick={() => handleOpenRelieve(yp)}
                  className="p-1.5 hover:bg-rose-50 rounded text-rose-600 transition cursor-pointer"
                  title="Relieve"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              ) : (
                <div className="w-7 h-7" />
              )}
            </div>
          </div>
        );
      }
    }
  ], [onEdit, visibleCols]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          onClick={() => handleStatusTabChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeStatusTab === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          ACTIVE YPS ({activeYpCount})
        </button>
        <button
          onClick={() => handleStatusTabChange('relieved')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeStatusTab === 'relieved'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          RELIEVED YPS ({relievedYpCount})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">

      {/* Title & View Switcher Row with Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">

        {/* Left cluster: Search + Wing filter + Division filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Wing dropdown filter */}
          <div className="relative">
            <select
              value={selectedWing}
              onChange={(e) => handleWingChange(e.target.value)}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[120px]"
            >
              <option value="">All Wings</option>
              {wingOptions.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Division dropdown filter */}
          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[130px]"
            >
              <option value="">All Divisions</option>
              {divisionOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Search input */}
          <div className="relative min-w-[160px] max-w-xs flex-1">
            <input
              type="text"
              placeholder="Search YP details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Clear filters pill */}
          {(selectedWing || selectedDivision || searchTerm) && (
            <button
              onClick={() => { setSelectedWing(''); setSelectedDivision(''); setSearchTerm(''); setCurrentPage(1); }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Right cluster: Export + Column visibility + View toggle */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {viewMode === 'table' && (
            <>
              {/* Rows Limit Select Dropdown */}
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-bold text-slate-755 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="text-xs font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                Total: {totalCount}
              </div>
              <CopyButton
                onCopy={() => handleExport('Copy')}
                color="#0f417a"
                hoverBg="#f1f5f9"
              />
              <ExportDropdown
                onExportExcel={() => handleExport('Excel')}
                onExportPdf={() => handleExport('PDF')}
                color="#0f417a"
                hoverColor="#1d5594"
              />
            </>
          )}

          {/* Column Visibility Dropdown */}
          {viewMode === 'table' && (
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
          )}

          {/* Toggle Switch Button Pair */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
            <button
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded transition cursor-pointer ${viewMode === 'chart' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Chart View"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
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
          `}} />
        </div>
      ) : (
        <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="In Position" fill="#0f417a" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm font-semibold text-slate-500">No data available for chart representation.</p>
          )}
        </div>
      )}

      {/* Relieve Modal */}
      {relieveModalOpen && selectedYp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up dark:bg-slate-900">
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black font-display uppercase tracking-wider">Relieve Young Professional</h3>
              <button onClick={() => setRelieveModalOpen(false)} className="text-rose-200 hover:text-white transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRelieveSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Name</p>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">{selectedYp.name}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Role</p>
                <p className="text-xs font-semibold text-slate-655 dark:text-slate-400 mt-0.5">{selectedYp.role} ({selectedYp.wing} - {selectedYp.division})</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Last Working Date*</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  placeholder="Reason for relieving, remarks..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRelieveModalOpen(false)}
                  className="px-4.5 py-2 border border-slate-250 dark:border-slate-700 text-slate-655 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRelieve}
                  className="px-5.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {submittingRelieve ? 'Submitting...' : 'Relieve Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
