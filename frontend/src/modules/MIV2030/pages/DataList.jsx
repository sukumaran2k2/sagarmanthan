import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Edit, Eye, Search, X, List, BarChart3, Building2, ChevronDown, Filter 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import MIVDetailView from '../components/MIVDetailView';
import { fetchMIVData, fetchOrganisations } from '../api';

const STATUS_COLORS = {
  'Under Implementation': '#0284c7',
  'Completed': '#10b981',
  'Yet to be Started': '#f59e0b',
  'Dropped': '#ef4444',
};

export default function MIVDataList({
  onEdit,
  onAddNew,
  triggerNotification
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, ui: 0, completed: 0, yetToStart: 0, dropped: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('all'); // 'all' | 'under_implementation' | 'completed' | 'yet_to_start' | 'dropped'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'visualisation'
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [organisations, setOrganisations] = useState([]);
  const [gridApi, setGridApi] = useState(null);

  // Dedicated Filter Panel Toggle State
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedOrg) count++;
    if (selectedCategory) count++;
    return count;
  }, [selectedOrg, selectedCategory]);

  // Column visibility checklist
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    org: true,
    name: true,
    cost: true,
    category: true,
    progress: true,
    status: true,
    updatedDate: true,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load organisations list once
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOrgChange = (val) => {
    setSelectedOrg(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handleStatusTabChange = (status) => {
    setActiveStatusTab(status);
    setCurrentPage(1);
  };

  // Fetch paginated initiatives from server
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMIVData({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        organisation: selectedOrg,
        category: selectedCategory,
        status: activeStatusTab === 'all' ? '' : activeStatusTab
      });

      const payload = res.data;
      if (payload && payload.data && payload.pagination) {
        const rows = payload.data || [];
        const pag = payload.pagination;
        setData(rows.map((item, idx) => ({
          ...item,
          sNo: (pag.page - 1) * pag.limit + idx + 1
        })));
        setTotalCount(pag.total || 0);
        setTotalPages(pag.totalPages || 1);
        if (pag.counts) {
          setCounts(pag.counts);
        }
      } else {
        const list = Array.isArray(payload) ? payload : [];
        setData(list.map((item, idx) => ({ ...item, sNo: idx + 1 })));
        setTotalCount(list.length);
        setTotalPages(Math.ceil(list.length / pageSize) || 1);
      }
    } catch (err) {
      console.error("Error fetching MIV data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedOrg, selectedCategory, activeStatusTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Categories list
  const CATEGORIES = [
    'General', 'Infrastructure', 'Digital / IT', 'Policy & Regulatory',
    'Green & Sustainability', 'Port Modernization', 'Operations & Logistics',
    'Capacity Expansion', 'Maritime Security', 'Coastal Shipping'
  ];

  // Format date helper
  const formatDate = (val) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return val;
    }
  };

  // AG Grid column definitions
  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sNo',
      width: 75,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center',
      hide: !visibleCols.sNo
    },
    {
      headerName: 'Organisation Name',
      field: 'organisation_name',
      flex: 1.5,
      minWidth: 200,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.org
    },
    {
      headerName: 'Activity / Initiative Name',
      field: 'initiative_name',
      flex: 2.2,
      minWidth: 260,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-200 text-left',
      headerClass: 'text-left',
      hide: !visibleCols.name,
      cellRenderer: (params) => (
        <span className="truncate block py-1 text-left w-full" title={params.value}>
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: 'Total Cost (₹ Cr)',
      field: 'total_cost',
      width: 140,
      cellClass: 'font-bold text-emerald-600 dark:text-emerald-400 text-right',
      headerClass: 'text-right',
      hide: !visibleCols.cost,
      cellRenderer: (params) => (
        <span>
          {params.value !== undefined && params.value !== null && params.value !== ''
            ? `₹ ${Number(params.value).toLocaleString()}`
            : '-'}
        </span>
      )
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 150,
      cellClass: 'capitalize text-slate-600 dark:text-slate-400 text-xs',
      hide: !visibleCols.category,
      cellRenderer: (params) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
          {params.value || 'General'}
        </span>
      )
    },
    {
      headerName: 'Progress',
      field: 'physical_progress',
      width: 110,
      cellClass: 'font-mono text-center font-bold text-slate-700 dark:text-slate-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.progress,
      cellRenderer: (params) => {
        const val = params.value !== undefined && params.value !== null && params.value !== ''
          ? `${params.value}%`
          : '0%';
        return <span>{val}</span>;
      }
    },
    {
      headerName: 'Status',
      field: 'status_current',
      width: 170,
      hide: !visibleCols.status,
      cellRenderer: (params) => {
        const status = params.value || params.data.status_on || 'Active';
        const isCompleted = status.toLowerCase().includes('completed');
        const isDelayed = status.toLowerCase().includes('delayed');
        const isDropped = status.toLowerCase().includes('dropped');
        const isOnTime = status.toLowerCase().includes('on time');

        const badgeClass = isCompleted 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : isDelayed
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          : isDropped
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          : isOnTime
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';

        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${badgeClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      headerName: 'Updated Date',
      field: 'updated_date',
      width: 120,
      cellClass: 'text-slate-500 dark:text-slate-400 text-xs text-center',
      headerClass: 'text-center',
      hide: !visibleCols.updatedDate,
      valueFormatter: (params) => formatDate(params.value || params.data.actual_date || params.data.completion_date),
    },
    {
      headerName: 'Action',
      width: 110,
      pinned: 'right',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center space-x-1.5 h-full py-1">
          <button
            onClick={() => onEdit(params.data)}
            title="Edit Initiative"
            className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedInitiative(params.data)}
            title="View Details"
            className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
      sortable: false,
      filter: false,
    },
  ], [onEdit, visibleCols]);

  // Analytics Chart Data
  const chartData = useMemo(() => {
    return [
      { name: 'Completed', count: counts.completed, fill: STATUS_COLORS['Completed'] },
      { name: 'Under Implementation', count: counts.ui, fill: STATUS_COLORS['Under Implementation'] },
      { name: 'Yet to be Started', count: counts.yetToStart, fill: STATUS_COLORS['Yet to be Started'] },
      { name: 'Dropped', count: counts.dropped, fill: STATUS_COLORS['Dropped'] },
    ];
  }, [counts]);

  const handleExport = (type) => {
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
              const val = row[col.field] !== undefined ? row[col.field] : '';
              line.push(val);
            }
          });
          tsv += line.join('\t') + '\n';
        });

        const copyText = (text) => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
          }
          return fallbackCopy(text);
        };

        const fallbackCopy = (text) => {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (success) return Promise.resolve();
            return Promise.reject(new Error('execCommand failed'));
          } catch (err) {
            return Promise.reject(err);
          }
        };

        copyText(tsv)
          .then(() => {
            if (triggerNotification) triggerNotification('Current page data copied to clipboard!', 'success');
          })
          .catch((err) => {
            console.error('Clipboard copy error:', err);
            if (triggerNotification) triggerNotification('Failed to copy table data.', 'error');
          });
      } else {
        if (triggerNotification) triggerNotification('No data available to copy.', 'warning');
      }
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `MIV_2030_Initiatives_Page_${currentPage}.csv`
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
      const title = 'Maritime India Vision 2030 - Initiatives';

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
            const val = row[col.field] !== undefined ? row[col.field] : '';
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

  if (selectedInitiative) {
    return (
      <MIVDetailView
        initiative={selectedInitiative}
        onBack={() => setSelectedInitiative(null)}
        onEdit={(init) => {
          setSelectedInitiative(null);
          onEdit?.(init);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Category / Status Tabs matching CSR / YP / CA style (Left Aligned) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none overflow-x-auto scrollbar-none mb-4">
        <div className="flex space-x-1">
          <button
            onClick={() => handleStatusTabChange('all')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeStatusTab === 'all'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            ALL INITIATIVES ({counts.all})
          </button>
          
          <button
            onClick={() => handleStatusTabChange('yet_to_start')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeStatusTab === 'yet_to_start'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            YET TO START ({counts.yetToStart})
          </button>

          <button
            onClick={() => handleStatusTabChange('under_implementation')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeStatusTab === 'under_implementation'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            UNDER IMPLEMENTATION ({counts.ui})
          </button>

          <button
            onClick={() => handleStatusTabChange('completed')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeStatusTab === 'completed'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            COMPLETED ({counts.completed})
          </button>

          <button
            onClick={() => handleStatusTabChange('dropped')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeStatusTab === 'dropped'
                ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            DROPPED ({counts.dropped})
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Search, Filters and Actions Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Dedicated Filter Button */}
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
                  setSelectedOrg('');
                  setSelectedCategory('');
                  setCurrentPage(1);
                  triggerNotification?.('Filters have been reset', 'info');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* 2. Space */}
          <div className="hidden lg:block flex-1" />

          {/* 3. Search Bar, 4. Row Count Selector, 5. Total Badge, 6. View Mode Toggle, 7. Visibility, 8. Copy, 9. Export */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search initiatives, ID, port..."
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
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{totalCount}</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('visualisation')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'visualisation'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analytics</span>
              </button>
            </div>

            {/* Visibility checklist */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Toggle Columns</span>
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>
                        {col === 'sNo' ? 'S.No' :
                         col === 'org' ? 'Organisation Name' :
                         col === 'name' ? 'Activity / Initiative Name' :
                         col === 'cost' ? 'Total Cost (₹ Cr)' :
                         col === 'category' ? 'Category' :
                         col === 'progress' ? 'Progress' :
                         col === 'status' ? 'Status' :
                         col === 'updatedDate' ? 'Updated Date' : col}
                      </span>
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
              hoverColor="#1e5ea8"
              triggerNotification={triggerNotification}
            />

          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Initiatives
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrg('');
                    setSelectedCategory('');
                    setCurrentPage(1);
                    triggerNotification?.('Filters have been reset', 'info');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* 1. Organisation Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Lead Organisation</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Organisations ({organisations.length})</option>
                  {organisations.map((org, i) => (
                    <option key={i} value={org.organisation_name || org}>{org.organisation_name || org}</option>
                  ))}
                </select>
              </div>

              {/* 2. Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer capitalize"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Content */}
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
          /* Visualisation Analytics View matching YP/CA */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            
            {/* Status Breakdown Bar Chart */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-4 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Initiatives by Status</span>
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      angle={-20} 
                      textAnchor="end" 
                      interval={0} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Metrics & Port Distribution Summary */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-4 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Summary Telemetry</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Initiatives</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{totalCount}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Investment</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹ {Math.round(data.reduce((acc, c) => acc + (parseFloat(c.total_cost) || 0), 0)).toLocaleString()} Cr
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Organisations Active</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {organisations.length}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed Rate</span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                    {counts.all > 0 
                      ? Math.round((counts.completed / counts.all) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Click on <strong>Table</strong> view to inspect line-by-line milestones, project documents, and progress tracking.
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
