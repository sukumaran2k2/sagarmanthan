import { useState, useMemo, useRef } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { STATUS_STEPS, CATEGORIES, getParaStatusText } from '../constants';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataList({
  rowData = [],
  loading = false,
  wings = [],
  divisions = [],
  onEdit,
  onDelete,
  onAddClick,
  canEdit = true,
  canAdd = true,
  canRemove = false,
}) {
  const gridRef = useRef();

  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersExpanded] = useState(true);

  const filteredData = useMemo(() => {
    let result = [...rowData];

    if (selectedWing !== 'All') {
      result = result.filter((p) => (p.wing || '').toLowerCase() === selectedWing.toLowerCase());
    }
    if (selectedDivision !== 'All') {
      result = result.filter((p) => (p.division || '').toLowerCase() === selectedDivision.toLowerCase());
    }
    if (selectedCategory !== 'All') {
      result = result.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedStatus !== 'All') {
      result = result.filter((p) => getParaStatusText(p.statusSteps).toLowerCase() === selectedStatus.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.paraNumber || '').toLowerCase().includes(q) ||
        (p.subject || '').toLowerCase().includes(q) ||
        (p.wing || '').toLowerCase().includes(q) ||
        (p.division || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rowData, selectedWing, selectedDivision, selectedCategory, selectedStatus, searchQuery]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesLimit);

  const onPaginationChanged = () => {
    if (gridRef.current?.api) {
      const gridPage = gridRef.current.api.paginationGetCurrentPage() + 1;
      if (gridPage !== currentPage) setCurrentPage(gridPage);
    }
  };

  const handlePageChange = (page) => {
    if (gridRef.current?.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
      setCurrentPage(page);
    }
  };

  const handleGridWheel = (e) => {
    if (gridRef.current?.api) {
      const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${gridRef.current.api.getGridId()}"]`);
      const gridContainer = gridRoot?.querySelector('.ag-body-viewport');
      if (gridContainer) gridContainer.scrollLeft += e.deltaY;
    }
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit,
      width: 70, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
    },
    {
      headerName: 'Para No.', field: 'paraNumber', width: 110, pinned: 'left',
      cellClass: 'text-center font-bold text-[#0f417a] border-r border-slate-200 flex items-center justify-center'
    },
    {
      headerName: 'Subject', field: 'subject', width: 280, minWidth: 200, pinned: 'left',
      tooltipField: 'subject',
      cellClass: 'text-slate-700 flex items-center py-2 border-r border-slate-100 font-semibold'
    },
    { headerName: 'Wing', field: 'wing', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' },
    { headerName: 'Division', field: 'division', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' },
    { headerName: 'Category', field: 'category', minWidth: 140, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' },
    {
      headerName: 'Status', field: 'statusSteps', minWidth: 180,
      cellClass: 'text-center font-bold text-slate-800 border-r border-slate-100 flex items-center justify-center',
      cellRenderer: (params) => {
        const text = getParaStatusText(params.value);
        let style = 'bg-slate-50 text-slate-700 border-slate-200';
        if (text === 'Dropped' || text === 'Accepted by CAG') style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (text === 'Comments Furnished to CAG' || text === 'Comments Received from organisation') style = 'bg-blue-50 text-blue-700 border-blue-200';
        else if (text === 'Comments Sought from Organisation' || text === 'Under Clarification') style = 'bg-amber-50 text-amber-700 border-amber-200';
        return <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] rounded-full border ${style}`}>{text}</span>;
      }
    },
    {
      headerName: 'Remarks', field: 'remarks', minWidth: 220,
      tooltipValueGetter: (params) => params.value || 'No remarks',
      cellClass: 'text-slate-550 flex items-center py-2 border-r border-slate-100 font-medium',
      valueFormatter: (params) => params.value || '--'
    },
    { headerName: 'Last Updated Date', field: 'lastUpdated', minWidth: 155, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' },
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'id', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEdit && onEdit(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Status Details"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDelete && onDelete(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Audit Para"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [currentPage, entriesLimit, canEdit, canRemove, onEdit, onDelete]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {canAdd && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Register Audit Para</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entries</span>
          </div>
        </div>
      </div>

      {isFiltersExpanded && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-inner">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Wing</label>
            <select
              value={selectedWing}
              onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Wings</option>
              {wings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Divisions</option>
              {divisions.map((d) => <option key={d.division_id} value={d.division_name}>{d.division_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              {Object.values(STATUS_STEPS).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700 dark:text-slate-200"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {loading ? 'Loading...' : `Showing ${totalEntries} entries`}
        </div>
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={filteredData}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={55}
          headerHeight={45}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{ type: 'fitGridWidth', defaultMinWidth: 90 }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs gap-4">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-slate-800 dark:text-slate-100">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{totalEntries}</span> entries
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p ? 'bg-[#0f417a] text-white shadow-sm' : 'border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-660 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
