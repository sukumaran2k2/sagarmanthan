import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Edit, Eye, Search, X, List, BarChart3, Building2, ChevronDown, Filter, 
  Trash2, Plus, Layers, TrendingUp, DollarSign, Calendar, Check
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import ProjectDetailModal from './ProjectDetailModal';

const STATUS_COLORS = {
  'Under Implementation': '#0284c7',
  'Under Tendering': '#f59e0b',
  'Planning & Sanctioning': '#8b5cf6',
  'Completed': '#10b981',
  'Dropped': '#ef4444',
};

function toAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProjectsListTable({
  rows = [],
  loading = false,
  page = 1,
  pageSize = 10,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 0 },
  stageCounts,
  filters,
  onFiltersChange,
  stageOptions = [],
  categoryOptions = [],
  organisations = [],
  states = [],

  canAdd = false,
  canEdit = false,
  canView = false,
  canDropProject = false,
  dropBusyId = null,
  onAddNew,
  onOpenBasicInfo,
  onDropProject,
  onPageChange,
  onPageSizeChange,
  exportFileName = 'projects_module_list',
}) {
  const [gridApi, setGridApi] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [selectedProjectForView, setSelectedProjectForView] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    projectId: true,
    projectName: true,
    organisation: true,
    category: true,
    state: true,
    stage: true,
    cost: true,
    physicalProgress: true,
    financialProgress: true,
    actions: true,
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters?.organisationId) count++;
    if (filters?.projectCategory && filters.projectCategory !== 'All') count++;
    if (filters?.state) count++;
    return count;
  }, [filters]);

  const setFilter = (key, value) => {
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange?.({ 
      ...filters,
      projectCategory: 'All', 
      organisationId: '',
      state: ''
    });
  };

  const counts = useMemo(() => {
    const src = stageCounts || pagination?.counts;
    if (src) {
      return {
        all: Number(src.all) || 0,
        planning: Number(src.planning) || 0,
        tendering: Number(src.tendering) || 0,
        ui: Number(src.ui) || 0,
        completed: Number(src.completed) || 0,
        dropped: Number(src.dropped) || 0,
      };
    }

    const c = {
      all: pagination?.total || rows.length,
      planning: 0,
      tendering: 0,
      ui: 0,
      completed: 0,
      dropped: 0,
    };

    rows.forEach((r) => {
      const s = String(r.stage || r.raw?.stage_name || '').toLowerCase();
      if (s.includes('implementation')) c.ui++;
      else if (s.includes('tender') || s.includes('tendering')) c.tendering++;
      else if (s.includes('complete')) c.completed++;
      else if (s.includes('drop')) c.dropped++;
      else c.planning++;
    });

    return c;
  }, [stageCounts, pagination?.counts, pagination?.total, rows]);

  const chartData = useMemo(() => {
    return [
      { name: 'Completed', count: counts.completed, fill: STATUS_COLORS['Completed'] },
      { name: 'Under Implementation', count: counts.ui, fill: STATUS_COLORS['Under Implementation'] },
      { name: 'Under Tendering', count: counts.tendering, fill: STATUS_COLORS['Under Tendering'] },
      { name: 'Planning & Sanctioning', count: counts.planning, fill: STATUS_COLORS['Planning & Sanctioning'] },
      { name: 'Dropped', count: counts.dropped, fill: STATUS_COLORS['Dropped'] },
    ];
  }, [counts]);

  const STATUS_TABS = [
    { id: 'All', label: 'ALL PROJECTS', count: counts.all },
    { id: 'Project Initiated', label: 'PROJECT INITIATED', count: counts.planning },
    { id: 'Under Tendering', label: 'UNDER TENDERING', count: counts.tendering },
    { id: 'Under Implementation', label: 'UNDER IMPLEMENTATION', count: counts.ui },
    { id: 'Completed', label: 'COMPLETED', count: counts.completed },
  ];

  const displayRows = useMemo(() => {
    return rows.map((row, idx) => ({
      ...row,
      sNo: (page - 1) * pageSize + idx + 1,
    }));
  }, [rows, page, pageSize]);

  const columnDefs = useMemo(() => {
    const cols = [];

    if (visibleCols.sNo) {
      cols.push({
        field: 'sNo',
        headerName: 'S.No',
        width: 75,
        pinned: 'left',
        cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
        headerClass: 'text-center',
      });
    }

    if (visibleCols.projectId) {
      cols.push({
        field: 'projectId',
        headerName: 'Project ID',
        width: 125,
        pinned: 'left',
        cellClass: 'font-mono text-center font-bold text-slate-800 dark:text-slate-200',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const pid = params.data?.projectId || params.value || '-';
          const subId = params.data?.subProjectId;
          const hasSub = subId && subId !== '-1' && subId !== '-' && subId !== '0';
          return (
            <span className="font-extrabold text-[#0f417a] dark:text-blue-300 font-mono tracking-wide text-xs">
              {pid}{hasSub ? ` / ${subId}` : ''}
            </span>
          );
        },
      });
    }

    if (visibleCols.projectName) {
      cols.push({
        field: 'projectName',
        headerName: 'Project Name',
        flex: 2.2,
        minWidth: 260,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-left',
        cellClass: 'text-left flex items-center font-semibold text-slate-800 dark:text-slate-200',
        cellStyle: {
          fontWeight: 600,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.35',
          display: 'flex',
          alignItems: 'center',
        },
        cellRenderer: (params) => (
          <div className="flex flex-col text-left py-1.5 w-full">
            <span 
              className="font-bold text-slate-800 dark:text-slate-100"
              title={params.value}
            >
              {params.value || '-'}
            </span>
            {params.data?.subProjectName && params.data.subProjectName !== '-' && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Sub: {params.data.subProjectName}
              </span>
            )}
          </div>
        ),
      });
    }

    if (visibleCols.organisation) {
      cols.push({
        field: 'organisationName',
        headerName: 'Lead Organisation',
        flex: 1.5,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-left',
        cellClass: 'text-left flex items-center font-semibold text-slate-800 dark:text-slate-200',
        cellStyle: {
          fontWeight: 600,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.35',
          display: 'flex',
          alignItems: 'center',
        },
        cellRenderer: (params) => (
          <div className="w-full flex items-center text-left py-1.5 font-semibold text-slate-800 dark:text-slate-200">
            {params.value || '-'}
          </div>
        ),
      });
    }

    if (visibleCols.category) {
      cols.push({
        field: 'category',
        headerName: 'Category',
        width: 150,
        cellClass: 'text-slate-600 dark:text-slate-400 text-xs text-left',
        headerClass: 'text-left',
        cellRenderer: (params) => (
          <span>{params.value || 'General'}</span>
        ),
      });
    }

    if (visibleCols.state) {
      cols.push({
        field: 'stateName',
        headerName: 'State / Region',
        width: 140,
        cellClass: 'text-slate-600 dark:text-slate-400 text-xs text-left',
        headerClass: 'text-left',
        cellRenderer: (params) => (
          <span>{params.value || '-'}</span>
        ),
      });
    }

    if (visibleCols.cost) {
      cols.push({
        field: 'cost',
        headerName: 'Total Cost (₹ Cr)',
        width: 140,
        cellClass: 'font-bold text-emerald-600 dark:text-emerald-400 text-right font-mono text-xs',
        headerClass: 'text-right',
        cellRenderer: (params) => (
          <span>
            {params.value !== undefined && params.value !== null && params.value !== ''
              ? `₹ ${toAmount(params.value)}`
              : '-'}
          </span>
        ),
      });
    }

    if (visibleCols.physicalProgress) {
      cols.push({
        field: 'physicalProgress',
        headerName: 'Physical Progress',
        width: 130,
        cellClass: 'font-mono text-center font-bold text-slate-700 dark:text-slate-300 text-xs',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const val = params.value !== undefined && params.value !== null && params.value !== ''
            ? `${Number(params.value).toFixed(0)}%`
            : '0%';
          return <span>{val}</span>;
        },
      });
    }

    if (visibleCols.financialProgress) {
      cols.push({
        field: 'financialProgress',
        headerName: 'Financial Progress',
        width: 130,
        cellClass: 'font-mono text-center font-bold text-slate-700 dark:text-slate-300 text-xs',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const val = params.value !== undefined && params.value !== null && params.value !== ''
            ? `${Number(params.value).toFixed(0)}%`
            : '0%';
          return <span>{val}</span>;
        },
      });
    }

    if (visibleCols.stage) {
      cols.push({
        field: 'stage',
        headerName: 'Status / Stage',
        width: 170,
        cellClass: 'text-xs font-semibold text-slate-800 dark:text-slate-200 text-left flex items-center',
        headerClass: 'text-left',
        cellRenderer: (params) => (
          <span>{params.value || 'Project Initiated'}</span>
        ),
      });
    }

    if (visibleCols.actions) {
      cols.push({
        headerName: 'Action',
        width: 115,
        pinned: 'right',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const isBusy = dropBusyId === row.id;

          return (
            <div className="flex items-center justify-center space-x-1.5 h-full py-1">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onOpenBasicInfo?.(row, { readOnly: false })}
                  title="Edit Project"
                  className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : canView ? (
                <button
                  type="button"
                  onClick={() => setSelectedProjectForView(row)}
                  title="View Project"
                  className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                </button>
              ) : null}

              {canDropProject && (
                <button
                  type="button"
                  onClick={() => onDropProject?.(row)}
                  disabled={isBusy}
                  title="Request Drop Project"
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
        sortable: false,
        filter: false,
        cellClass: 'text-center flex items-center justify-center',
        headerClass: 'text-center',
      });
    }

    return cols;
  }, [visibleCols, canEdit, canView, canDropProject, dropBusyId, onOpenBasicInfo, onDropProject]);

  const handleExport = (type) => {
    if (type === 'Copy') {
      if (gridApi) {
        let tsv = '';
        const headers = [];
        columnDefs.forEach((col) => {
          if (col.headerName && col.headerName !== 'Action') {
            headers.push(col.headerName);
          }
        });
        tsv += headers.join('\t') + '\n';

        displayRows.forEach((row) => {
          const line = [];
          columnDefs.forEach((col) => {
            if (col.headerName && col.headerName !== 'Action') {
              const val = row[col.field] !== undefined ? row[col.field] : '';
              line.push(val);
            }
          });
          tsv += line.join('\t') + '\n';
        });

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(tsv);
        }
      }
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `${exportFileName}_Page_${page}.csv`,
        });
      }
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      const title = 'Projects Module List';

      let headersHtml = '';
      columnDefs.forEach((col) => {
        if (col.headerName && col.headerName !== 'Action') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      displayRows.forEach((row) => {
        rowsHtml += '<tr>';
        columnDefs.forEach((col) => {
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

  return (
    <div className="space-y-6 animate-fade-in relative text-slate-800 dark:text-slate-100">
      
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none overflow-x-auto scrollbar-none mb-4">
        <div className="flex space-x-1">
          {STATUS_TABS.map((tab) => {
            const isSelected = (filters?.projectStage || 'All') === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter('projectStage', tab.id)}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">

        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
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
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  showFilterPanel ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">

            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, ID, agency..."
                value={filters?.search || ''}
                onChange={(e) => setFilter('search', e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {filters?.search && (
                <button
                  onClick={() => setFilter('search', '')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{pagination.total || rows.length}</span>
            </div>

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
                  {[
                    { key: 'sNo', label: 'S.No' },
                    { key: 'projectId', label: 'Project ID' },
                    { key: 'projectName', label: 'Project Name' },
                    { key: 'organisation', label: 'Lead Organisation' },
                    { key: 'category', label: 'Category' },
                    { key: 'state', label: 'State / Region' },
                    { key: 'cost', label: 'Total Cost (₹ Cr)' },
                    { key: 'physicalProgress', label: 'Physical Progress' },
                    { key: 'financialProgress', label: 'Financial Progress' },
                    { key: 'stage', label: 'Status / Stage' },
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(visibleCols[col.key])}
                        onChange={(e) =>
                          setVisibleCols((prev) => ({
                            ...prev,
                            [col.key]: e.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
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
              hoverColor="#1e5ea8"
            />

            {canAdd && (
              <button
                type="button"
                onClick={onAddNew}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Project</span>
              </button>
            )}

          </div>
        </div>

        {showFilterPanel && (
          <div className="bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Projects
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Lead Organisation
                </label>
                <select
                  value={filters?.organisationId || ''}
                  onChange={(e) => setFilter('organisationId', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Organisations ({organisations.length})</option>
                  {organisations.map((org) => {
                    const orgId = org.organisation_id || org.id;
                    const orgName = org.organisation_name || org.name;
                    return (
                      <option key={orgId} value={orgId}>
                        {orgName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Project Category
                </label>
                <select
                  value={filters?.projectCategory || 'All'}
                  onChange={(e) => setFilter('projectCategory', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="All">All Categories ({categoryOptions.length})</option>
                  {categoryOptions.map((cat) => {
                    const catName = typeof cat === 'object' ? (cat.project_category_name || cat.name) : cat;
                    const catId = typeof cat === 'object' ? (cat.project_category_id || cat.id || catName) : cat;
                    if (!catName || catName === 'All') return null;
                    return (
                      <option key={catId} value={catName}>
                        {catName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  State / Region
                </label>
                <select
                  value={filters?.state || ''}
                  onChange={(e) => setFilter('state', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All States ({states.length})</option>
                  {states.map((st) => {
                    const stName = st.state_name || st.name || st.state_names;
                    const stId = st.state_id || st.id || stName;
                    return (
                      <option key={stId} value={stName}>
                        {stName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
            <Table
              rowData={displayRows}
              columnDefs={columnDefs}
              loading={loading}
              pagination={false}
              enableExport={false}
              onGridReady={(params) => setGridApi(params.api)}
              defaultColDef={{
                minWidth: 90,
                filter: false,
                sortable: true,
                resizable: true,
              }}
            />
            
            <TablePagination
              currentPage={page - 1}
              totalPages={pagination.totalPages || Math.ceil((pagination.total || rows.length) / pageSize)}
              totalRows={pagination.total || rows.length}
              pageSize={pageSize}
              onPageChange={(zeroIdx) => onPageChange?.(zeroIdx + 1)}
              onPrevPage={() => onPageChange?.(Math.max(1, page - 1))}
              onNextPage={() => onPageChange?.(Math.min(pagination.totalPages || 1, page + 1))}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">

            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-4 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Projects by Stage / Status</span>
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

            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-4 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Summary Telemetry</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Projects</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{pagination.total || rows.length}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Investment</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹ {Math.round(rows.reduce((acc, c) => acc + (parseFloat(c.cost) || 0), 0)).toLocaleString()} Cr
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
                Click on <strong>Table</strong> view to inspect line-by-line stages, physical progress, documents, and cost breakdowns.
              </div>
            </div>

          </div>
        )}

      </div>

      {selectedProjectForView && (
        <ProjectDetailModal
          project={selectedProjectForView}
          onClose={() => setSelectedProjectForView(null)}
          onEdit={
            canEdit
              ? (row) => {
                  setSelectedProjectForView(null);
                  onOpenBasicInfo?.(row, { readOnly: false });
                }
              : undefined
          }
        />
      )}

    </div>
  );
}
