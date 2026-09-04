import { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Edit,
  Filter,
  Info,
  Search,
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

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
  filters,
  onFiltersChange,
  stageOptions = [],
  categoryOptions = [],

  canEdit = false,
  canDropProject = false,
  dropBusyId = null,
  onOpenBasicInfo,
  onDropProject,
  onPageChange,
  onPageSizeChange,
  exportFileName = 'projects_list',
}) {
  const gridRef = useRef(null);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  const setFilter = (key, value) => {
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange?.({ search: '', projectStage: 'All', projectCategory: 'All' });
  };

  const hasActiveFilters =
    (filters?.search || '').trim() ||
    (filters?.projectStage && filters.projectStage !== 'All') ||
    (filters?.projectCategory && filters.projectCategory !== 'All');

  const displayRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.map((item, index) => ({ ...item, sNo: start + index + 1 }));
  }, [rows, page, pageSize]);

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'Sl.No',
        valueGetter: (params) =>
          params.node ? (page - 1) * pageSize + params.node.rowIndex + 1 : 1,
        minWidth: 80,
        pinned: 'left',
        cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
      },
      {
        field: 'projectId',
        headerName: 'Project ID',
        minWidth: 130,
        cellClass: 'font-black text-orange-600 text-center flex items-center justify-center',
      },
      {
        field: 'subProjectId',
        headerName: 'Sub Project ID',
        minWidth: 130,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
      },
      {
        field: 'projectName',
        headerName: 'Project Name',
        flex: 2.2,
        minWidth: 250,
        cellClass: 'font-bold text-slate-800 text-left flex items-center',
      },
      {
        field: 'subProjectName',
        headerName: 'Sub Project Name',
        flex: 1.8,
        minWidth: 220,
        cellClass: 'font-semibold text-slate-700 text-left flex items-center',
      },
      {
        field: 'organisationName',
        headerName: 'Organisation',
        flex: 1.5,
        minWidth: 220,
        cellClass: 'font-semibold text-slate-700 text-left flex items-center',
      },
      {
        field: 'stateName',
        headerName: 'State',
        flex: 1.2,
        minWidth: 180,
        cellClass: 'font-semibold text-slate-700 text-left flex items-center',
      },
      {
        field: 'category',
        headerName: 'Category',
        minWidth: 170,
        flex: 1.2,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
      },
      {
        field: 'stage',
        headerName: 'Current Stage',
        minWidth: 170,
        flex: 1.2,
        cellClass: 'font-semibold text-slate-700 text-center flex items-center justify-center',
      },
      {
        field: 'cost',
        headerName: 'Project Cost (In Cr.)',
        minWidth: 170,
        cellClass: 'font-black text-[#0f417a] text-center flex items-center justify-center',
        valueFormatter: (params) => toAmount(params.value),
      },
      {
        field: 'physicalProgress',
        headerName: 'Physical Progress (%)',
        minWidth: 160,
        valueFormatter: (params) => `${Number(params.value || 0).toFixed(2)}`,
        cellClass: 'font-bold text-slate-700 text-center flex items-center justify-center',
      },
      {
        field: 'financialProgress',
        headerName: 'Financial Progress (%)',
        minWidth: 160,
        valueFormatter: (params) => `${Number(params.value || 0).toFixed(2)}`,
        cellClass: 'font-bold text-slate-700 text-center flex items-center justify-center',
      },
    ];

    if (canEdit) {
      cols.push({
        headerName: 'Update',
        minWidth: 110,
        maxWidth: 120,
        pinned: 'right',
        lockPinned: true,
        sortable: false,
        filter: false,
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          return (
            <button
              type="button"
              onClick={() => onOpenBasicInfo?.(row)}
              className="p-1.5 hover:bg-slate-100 rounded text-[#0f417a] transition cursor-pointer"
              title="Update Project"
            >
              <Edit className="h-4 w-4" />
            </button>
          );
        },
      });
    }

    if (canDropProject) {
      cols.push({
        headerName: 'Drop Project',
        minWidth: 150,
        maxWidth: 170,
        sortable: false,
        filter: false,
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;

          return (
            <button
              type="button"
              onClick={() => onDropProject?.(row)}
              className="px-2.5 py-1 rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 text-[10px] font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Drop Project"
              disabled={dropBusyId === row.id}
            >
              {dropBusyId === row.id ? 'Submitting...' : 'Request Drop'}
            </button>
          );
        },
      });
    }

    return cols;
  }, [canEdit, canDropProject, dropBusyId, onDropProject, onOpenBasicInfo, page, pageSize]);

  const handleCopyData = () => {
    if (!displayRows.length) return;
    const text = displayRows
      .map(
        (r) =>
          `${r.projectId || ''}\t${r.subProjectId || ''}\t${r.projectName || ''}\t${r.organisationName || ''}\t${r.stateName || ''}\t${r.stage || ''}\t${r.cost || 0}`
      )
      .join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleExportExcel = () => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.exportDataAsCsv({ fileName: `${exportFileName}.csv` });
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div
          onClick={() => setIsFilterCollapsed((prev) => !prev)}
          className="p-3.5 bg-slate-100/90 hover:bg-slate-200/80 transition flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-[#0f417a]" />
            <span className="text-xs font-black text-[#0f417a] uppercase tracking-wide">
              Filter Options
            </span>
            {hasActiveFilters ? (
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-extrabold">
                Active Filter
              </span>
            ) : null}
          </div>

          <ChevronDown
            size={18}
            className={`text-slate-600 transition-transform duration-300 ${
              isFilterCollapsed ? '-rotate-90' : 'rotate-0'
            }`}
          />
        </div>

        {!isFilterCollapsed ? (
          <div className="p-4 border-t border-slate-200 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Stage</label>
                <select
                  value={filters?.projectStage || 'All'}
                  onChange={(e) => setFilter('projectStage', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {stageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'Show All' : option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Category</label>
                <select
                  value={filters?.projectCategory || 'All'}
                  onChange={(e) => setFilter('projectCategory', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'Show All' : option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-semibold italic flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center space-x-1.5">
                <Info size={14} className="text-blue-600 flex-shrink-0" />
                <span>Use Update action to open stage-wise project update workflow.</span>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-100"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <CopyButton onCopy={handleCopyData} color="#0f417a" />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color="#0f417a"
            hoverColor="#0b3260"
          />

        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 shadow-xs">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="bg-transparent font-extrabold text-[#0f417a] focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search..."
              value={filters?.search || ''}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-800 shadow-xs"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="relative min-h-[380px] capex-grid border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <Table
          ref={gridRef}
          rowData={displayRows}
          columnDefs={columnDefs}
          pagination={false}
          loading={loading}
          loadingMessage="Loading projects..."
          color="#0f417a"
        />
        {pagination.totalPages > 0 ? (
          <TablePagination
            currentPage={Math.max(0, page - 1)}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            pageSize={pageSize}
            onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
            color="#0f417a"
          />
        ) : null}
      </div>
    </div>
  );
}
