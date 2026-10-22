import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, ChevronDown, Filter, ChevronUp, X } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { useShallow } from 'zustand/react/shallow';
import { STATUS_STEPS, CATEGORIES, getParaStatusText } from '../constants';
import { useAuditParaStore } from '../store/useAuditParaStore';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { getWrapColumnProps, renderWrappedText } from '../../../utils/tableCellWrap';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

ModuleRegistry.registerModules([AllCommunityModule]);

const COLUMN_LABELS = {
  paraNumber: 'Para No.',
  subject: 'Subject',
  wing: 'Wing',
  division: 'Division',
  category: 'Category',
  statusSteps: 'Status',
  remarks: 'Remarks',
  lastUpdated: 'Last Updated Date',
};

const EXPORT_FILE = 'audit_paras.csv';

const sameText = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

export default function DataList({
  rowData = [],
  loading = false,
  wings = [],
  divisions = [],
  onEdit,
  onDelete,
  canEdit = true,
  canRemove = false,
  triggerNotification,
}) {
  const notify = useNotifier(triggerNotification);

  // Filters, search, pagination and column visibility live in the store, so they're
  // kept when the user switches to the Input Form or Report and back
  const {
    searchTerm, setSearchTerm,
    selectedWing, setSelectedWing,
    selectedDivision, setSelectedDivision,
    selectedCategory, setSelectedCategory,
    selectedStatus, setSelectedStatus,
    showFilterPanel, setShowFilterPanel,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    visibleCols, setVisibleCols,
    resetFilters,
  } = useAuditParaStore(useShallow((state) => ({
    searchTerm: state.searchTerm,
    setSearchTerm: state.setSearchTerm,
    selectedWing: state.selectedWing,
    setSelectedWing: state.setSelectedWing,
    selectedDivision: state.selectedDivision,
    setSelectedDivision: state.setSelectedDivision,
    selectedCategory: state.selectedCategory,
    setSelectedCategory: state.setSelectedCategory,
    selectedStatus: state.selectedStatus,
    setSelectedStatus: state.setSelectedStatus,
    showFilterPanel: state.showFilterPanel,
    setShowFilterPanel: state.setShowFilterPanel,
    currentPage: state.currentPage,
    setCurrentPage: state.setCurrentPage,
    pageSize: state.pageSize,
    setPageSize: state.setPageSize,
    visibleCols: state.visibleCols,
    setVisibleCols: state.setVisibleCols,
    resetFilters: state.resetFilters,
  })));

  // Dropdown open/closed is view state, so it stays in the component
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef(null);
  const gridRef = useRef();

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rowData.filter((p) =>
      (!selectedWing || sameText(p.wing, selectedWing))
      && (!selectedDivision || sameText(p.division, selectedDivision))
      && (!selectedCategory || sameText(p.category, selectedCategory))
      && (!selectedStatus || sameText(getParaStatusText(p.statusSteps), selectedStatus))
      && (!q
        || (p.paraNumber || '').toLowerCase().includes(q)
        || (p.subject || '').toLowerCase().includes(q)
        || (p.wing || '').toLowerCase().includes(q)
        || (p.division || '').toLowerCase().includes(q)));
  }, [rowData, selectedWing, selectedDivision, selectedCategory, selectedStatus, searchTerm]);

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  // A stored page can be past the end once the data or filters change
  const page = Math.min(currentPage, totalPages);
  const pageRows = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page, pageSize]
  );
  const activeFiltersCount = [selectedWing, selectedDivision, selectedCategory, selectedStatus].filter(Boolean).length;

  const handleGridWheel = (e) => {
    if (gridRef.current?.api) {
      const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${gridRef.current.api.getGridId()}"]`);
      const gridContainer = gridRoot?.querySelector('.ag-body-viewport');
      if (gridContainer) gridContainer.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target)) {
        setVisibilityOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rows for Copy / Excel: every filtered row (not just the current page), visible columns only
  const exportTable = () => {
    const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
    const header = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])];
    const rows = filteredData.map((row, i) => [
      i + 1,
      ...cols.map((c) => (c === 'statusSteps' ? getParaStatusText(row[c]) : (row[c] ?? ''))),
    ]);
    return { header, rows };
  };

  const handleCopy = async () => {
    const { header, rows } = exportTable();
    try {
      await navigator.clipboard.writeText([header, ...rows].map((r) => r.join('\t')).join('\n'));
      notify(COMMON_TOASTS.copySuccess(rows.length));
    } catch {
      notify(COMMON_TOASTS.copyFailed());
    }
  };

  const handleExcel = () => {
    const { header, rows } = exportTable();
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT_FILE;
    a.click();
    URL.revokeObjectURL(url);
    notify(COMMON_TOASTS.excelExported(EXPORT_FILE));
  };

  const handlePdf = () => {
    notify(COMMON_TOASTS.pdfPreparing());
    window.print();
  };

  const handleResetFilters = () => {
    resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1 + (page - 1) * pageSize,
      width: 70, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
    },
    ...(visibleCols.paraNumber ? [{
      headerName: 'Para No.', field: 'paraNumber', width: 110,
      cellClass: 'text-center font-bold text-[#0f417a] border-r border-slate-200 flex items-center justify-center'
    }] : []),
    ...(visibleCols.subject ? [{
      headerName: 'Subject', field: 'subject', width: 280, minWidth: 200,
      tooltipField: 'subject',
      ...getWrapColumnProps('text-slate-700 border-r border-slate-100 font-semibold'),
      cellRenderer: (params) => renderWrappedText(params.value, 'text-slate-700 font-semibold'),
    }] : []),
    ...(visibleCols.wing ? [{ headerName: 'Wing', field: 'wing', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' }] : []),
    ...(visibleCols.division ? [{ headerName: 'Division', field: 'division', minWidth: 120, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' }] : []),
    ...(visibleCols.category ? [{ headerName: 'Category', field: 'category', minWidth: 140, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium' }] : []),
    ...(visibleCols.statusSteps ? [{
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
    }] : []),
    ...(visibleCols.remarks ? [{
      headerName: 'Remarks', field: 'remarks', minWidth: 220,
      tooltipValueGetter: (params) => params.value || 'No remarks',
      ...getWrapColumnProps('text-slate-550 border-r border-slate-100 font-medium'),
      cellRenderer: (params) => renderWrappedText(params.value, 'text-slate-550 font-medium', '--'),
    }] : []),
    ...(visibleCols.lastUpdated ? [{ headerName: 'Last Updated Date', field: 'lastUpdated', minWidth: 155, cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium',
      valueFormatter: (params) => {
        if (!params.value) return '—';
        const d = new Date(params.value);
        if (isNaN(d.getTime())) return params.value;
        return d.toISOString().split('T')[0];
      },
    }] : []),
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEdit && onEdit(params.data)}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
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
  ], [page, pageSize, canEdit, canRemove, onEdit, onDelete, visibleCols]);

  const filterSelectClass = 'w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200';
  const filterLabelClass = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider';

  return (
    <div className="module-card space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entries</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFilterPanel((v) => !v)}
            className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
            {showFilterPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full module-search-input"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} title="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-555 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            Total: {loading ? '...' : totalEntries}
          </div>
          <CopyButton onCopy={handleCopy} color="#0f417a" hoverBg="#f1f5f9" />
          <ExportDropdown onExportExcel={handleExcel} onExportPdf={handlePdf} color="#0f417a" hoverColor="#1d5594" />
          <div className="relative" ref={visibilityRef}>
            <button
              type="button"
              onClick={() => setVisibilityOpen((v) => !v)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {visibilityOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                {Object.keys(visibleCols).map((col) => (
                  <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleCols[col]}
                      onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{COLUMN_LABELS[col]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-inner space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className={filterLabelClass}>Wing</label>
              <select value={selectedWing} onChange={(e) => setSelectedWing(e.target.value)} className={filterSelectClass}>
                <option value="">All Wings</option>
                {wings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={filterLabelClass}>Division</label>
              <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} className={filterSelectClass}>
                <option value="">All Divisions</option>
                {divisions.map((d) => <option key={d.division_id} value={d.division_name}>{d.division_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={filterLabelClass}>Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={filterSelectClass}>
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={filterLabelClass}>Status</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={filterSelectClass}>
                <option value="">All Statuses</option>
                {Object.values(STATUS_STEPS).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex justify-end">
              <button type="button" onClick={handleResetFilters} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ag-theme-quartz module-datalist-grid rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        {/* The grid shows only the current page, so the stored page is restored on return */}
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={pageRows}
          columnDefs={colDefs}
          domLayout="autoHeight"
          rowHeight={55}
          headerHeight={45}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{ type: 'fitGridWidth', defaultMinWidth: 90 }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs gap-4">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-slate-800 dark:text-slate-100">{totalEntries > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{Math.min(page * pageSize, totalEntries)}</span> of{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{totalEntries}</span> entries
          </span>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              if (totalPages > 6 && Math.abs(page - p) > 1 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                return null;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${page === p ? 'bg-[#0f417a] text-white shadow-sm' : 'border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalEntries === 0}
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
