import { useState, useMemo, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Edit, Eye, Search, X, ChevronDown, Sparkles, FileText, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import GMISDetailView from '../components/GMISDetailView';
import { fetchGmisMouPaginated } from '../api';
import { useGmisStore } from '../store/useGmisStore';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';

const SUMMIT_TABS = [
  { id: '', label: 'All Summits' },
  { id: 'GMIS 2016', label: 'GMIS 2016' },
  { id: 'GMIS 2021', label: 'GMIS 2021' },
  { id: 'GMIS 2023', label: 'GMIS 2023' },
  { id: 'GMIS 2025', label: 'GMIS 2025' },
];

const STATUS_TABS = [
  { id: 'all', label: 'All MoUs', countKey: 'all' },
  { id: 'yet_to_start', label: 'Yet to Start', countKey: 'yetToStart' },
  { id: 'under_implementation', label: 'Under Implementation', countKey: 'underImplementation' },
  { id: 'completed', label: 'Completed', countKey: 'completed' },
  { id: 'dropped', label: 'Dropped', countKey: 'dropped' },
];

const NATURE_OF_SECOND_PARTY_OPTIONS = [
  'National',
  'International',
  'Joint Venture',
  'State Govt / PSU',
  'Central Govt / Ministry',
  'Private / Industry',
  'Academic / Research',
  'Other',
];

const COLUMN_LABELS = {
  sNo: 'S.No',
  org: 'Organisation',
  event: 'Summit Event',
  name: 'MoU Name',
  party2: '2nd Party',
  nature: 'Nature of 2nd Party',
  navic: 'NAVIC / VIBHAS Cell',
  category: 'Category / Industry',
  amount: 'MoU Amount',
  revisedAmount: 'Revised Amount',
  status: 'Status',
  physicalProgress: 'Physical %',
  physicalDate: 'Physical Date',
  financialProgress: 'Financial %',
  financialDate: 'Financial Date',
  mouBrief: 'MoU Brief',
  remarks: 'Remarks / Details',
  nextSteps: 'Next Steps',
  reasonForDropping: 'Reason for Dropping',
  document: 'Document PDF',
};

const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');
const formatAmount = (v) => (v !== undefined && v !== null && v !== '' ? `₹ ${Number(v).toLocaleString()}` : '-');

// Copy / Excel / PDF columns (the page on show)
const EXPORT_COLUMNS = [
  { key: 'org', label: 'Organisation', value: (r) => r.organisation_name || '' },
  { key: 'event', label: 'Summit', value: (r) => r.event_name || '' },
  { key: 'name', label: 'MoU Name', value: (r) => r.name_of_mou || '' },
  { key: 'party2', label: '2nd Party', value: (r) => r.name_of_second_party || '' },
  { key: 'nature', label: 'Nature', value: (r) => r.nature_of_second_party || '' },
  { key: 'navic', label: 'NAVIC Cell', value: (r) => r.navic_name || '' },
  { key: 'amount', label: 'Amount (Cr)', value: (r) => r.amount ?? '' },
  { key: 'revisedAmount', label: 'Revised Amount (Cr)', value: (r) => r.revised_amount ?? '' },
  { key: 'category', label: 'Category', value: (r) => r.mou_category_name || '' },
  { key: 'status', label: 'Status', value: (r) => r.present_status || '' },
];

const textCell = (params) => (
  <span className="truncate block" title={params.value}>{params.value || '-'}</span>
);

function StatusBadge({ value }) {
  const status = value || 'Active';
  const s = status.toLowerCase();
  const badgeClass = s.includes('completed')
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    : s.includes('delayed')
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      : s.includes('dropped')
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        : s.includes('under') || s.includes('implementation')
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${badgeClass}`}>
      {status}
    </span>
  );
}

// MoUs one page at a time from the server, filtered by summit, status tab, filters and search
export default function GMISDataList({ onEdit, notify, organisations, categories, navicCells }) {
  const {
    summit, statusTab, filters, searchTerm, debouncedSearch, showFilterPanel,
    currentPage, pageSize, visibleCols,
  } = useGmisStore(useShallow((state) => ({
    summit: state.summit,
    statusTab: state.statusTab,
    filters: state.filters,
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    showFilterPanel: state.showFilterPanel,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    visibleCols: state.visibleCols,
  })));
  const {
    setSummit, setStatusTab, setFilters, resetFilters, setSearchTerm, setDebouncedSearch,
    setShowFilterPanel, setCurrentPage, setPageSize, setVisibleCols,
  } = useGmisStore(useShallow((state) => ({
    setSummit: state.setSummit,
    setStatusTab: state.setStatusTab,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    setSearchTerm: state.setSearchTerm,
    setDebouncedSearch: state.setDebouncedSearch,
    setShowFilterPanel: state.setShowFilterPanel,
    setCurrentPage: state.setCurrentPage,
    setPageSize: state.setPageSize,
    setVisibleCols: state.setVisibleCols,
  })));

  // Search goes to the server 300 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setDebouncedSearch]);

  // The page of MoUs, tagged with the request it answers; Retry bumps reloadKey
  const [reloadKey, setReloadKey] = useState(0);
  const params = useMemo(() => ({
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    eventName: summit,
    organisationId: filters.organisation,
    category: filters.category,
    natureOfSecondParty: filters.nature,
    navicName: filters.navic,
    status: statusTab === 'all' ? '' : statusTab,
  }), [currentPage, pageSize, debouncedSearch, summit, filters, statusTab]);
  const requestKey = JSON.stringify([params, reloadKey]);
  const [result, setResult] = useState(null); // { key, rows, totalCount, totalPages, failed }
  // Status tab counts stay on show while the next page loads
  const [counts, setCounts] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetchGmisMouPaginated(params)
      .then((res) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          rows: res.data?.data || [],
          totalCount: res.data?.totalCount || 0,
          totalPages: res.data?.totalPages || 1,
        });
        if (res.data?.counts) setCounts(res.data.counts);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load GMIS MoUs:', err);
        setResult({ key: requestKey, rows: [], totalCount: 0, totalPages: 1, failed: true });
        notify(COMMON_TOASTS.loadFailed('The MoU list'));
      });
    return () => { cancelled = true; };
  }, [requestKey, params, notify]);
  const loading = result?.key !== requestKey;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result]);
  const totalCount = loading ? (result?.totalCount ?? 0) : result.totalCount;
  const totalPages = loading ? (result?.totalPages ?? 1) : result.totalPages;

  const activeFiltersCount = Object.values(filters).filter(Boolean).length + (summit ? 1 : 0);

  // MoU opened in the detail view
  const [selectedMou, setSelectedMou] = useState(null);

  // Column visibility dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      colId: 'sNo',
      minWidth: 80,
      pinned: 'left',
      valueGetter: (p) => (currentPage - 1) * pageSize + p.node.rowIndex + 1,
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center',
      hide: !visibleCols.sNo,
    },
    {
      headerName: 'Organisation (1st Party)',
      field: 'organisation_name',
      flex: 1.5,
      minWidth: 150,
      wrapText: true,
      autoHeight: true,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.org,
    },
    {
      headerName: 'Name of MoU / Project',
      field: 'name_of_mou',
      flex: 2.2,
      minWidth: 260,
      wrapText: true,
      autoHeight: true,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-200 text-left',
      headerClass: 'text-left',
      hide: !visibleCols.name,
      cellRenderer: (p) => <span className="truncate block py-1 text-left w-full" title={p.value}>{p.value || '-'}</span>,
    },
    {
      headerName: 'Summit / Event',
      field: 'event_name',
      minWidth: 130,
      cellClass: 'text-xs font-bold text-blue-700 dark:text-blue-300',
      wrapText: true,
      autoHeight: true,
      // Hidden under "All Summits"; for a single summit the Visibility checkbox decides
      hide: summit === '' || !visibleCols.event,
      cellRenderer: (p) => (
        <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800">
          {p.value || '-'}
        </span>
      ),
    },
    {
      headerName: '2nd Party (Partner / Vendor)',
      field: 'name_of_second_party',
      flex: 1.5,
      minWidth: 180,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-600 dark:text-slate-300 text-xs',
      hide: !visibleCols.party2,
      cellRenderer: (p) => <span className="truncate block py-1" title={p.value}>{p.value || '-'}</span>,
    },
    {
      headerName: 'Nature of 2nd Party',
      field: 'nature_of_second_party',
      minWidth: 160,
      cellClass: 'text-xs text-slate-700 dark:text-slate-300',
      hide: !visibleCols.nature,
      cellRenderer: (p) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
          {p.value || '-'}
        </span>
      ),
    },
    {
      headerName: 'VIBHAS / NAVIC Cell',
      field: 'navic_name',
      minWidth: 240,
      cellClass: 'text-xs font-semibold text-indigo-700 dark:text-indigo-300',
      hide: !visibleCols.navic,
      cellRenderer: (p) => (
        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
          {p.value || '-'}
        </span>
      ),
    },
    {
      headerName: 'MoU Category',
      field: 'mou_category_name',
      minWidth: 220,
      cellClass: 'text-slate-600 dark:text-slate-400 text-xs',
      hide: !visibleCols.category,
      cellRenderer: (p) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
          {p.value || 'General'}
        </span>
      ),
    },
    {
      headerName: 'MoU Value (₹ Cr)',
      field: 'amount',
      minWidth: 140,
      cellClass: 'font-bold text-emerald-600 dark:text-emerald-400 text-right',
      headerClass: 'text-right',
      hide: !visibleCols.amount,
      valueFormatter: (p) => formatAmount(p.value),
    },
    {
      headerName: 'Revised Amount (₹ Cr)',
      field: 'revised_amount',
      minWidth: 150,
      cellClass: 'font-bold text-blue-600 dark:text-blue-400 text-right',
      headerClass: 'text-right',
      hide: !visibleCols.revisedAmount,
      valueFormatter: (p) => formatAmount(p.value),
    },
    {
      headerName: 'Present Status',
      field: 'present_status',
      minWidth: 220,
      hide: !visibleCols.status,
      cellRenderer: (p) => <StatusBadge value={p.value} />,
    },
    {
      headerName: 'Physical %',
      field: 'physical_progress_percentage',
      minWidth: 110,
      cellClass: 'font-mono text-center font-bold text-purple-700 dark:text-purple-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.physicalProgress,
      valueFormatter: (p) => `${p.value || 0}%`,
    },
    {
      headerName: 'Physical Date',
      field: 'physical_progress_date',
      minWidth: 130,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center',
      hide: !visibleCols.physicalDate,
      valueFormatter: (p) => formatDate(p.value),
    },
    {
      headerName: 'Financial %',
      field: 'financial_progress_percentage',
      minWidth: 110,
      cellClass: 'font-mono text-center font-bold text-blue-700 dark:text-blue-300 text-xs',
      headerClass: 'text-center',
      hide: !visibleCols.financialProgress,
      valueFormatter: (p) => `${p.value || 0}%`,
    },
    {
      headerName: 'Financial Date',
      field: 'financial_progress_date',
      minWidth: 130,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center',
      hide: !visibleCols.financialDate,
      valueFormatter: (p) => formatDate(p.value),
    },
    {
      headerName: 'MoU Brief',
      field: 'mou_brief',
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.mouBrief,
      cellRenderer: textCell,
    },
    {
      headerName: 'Remarks / Detailed Status',
      field: 'remark_or_detailed_status',
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.remarks,
      cellRenderer: textCell,
    },
    {
      headerName: 'Next Steps',
      field: 'next_steps',
      minWidth: 200,
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.nextSteps,
      cellRenderer: textCell,
    },
    {
      headerName: 'Reason for Dropping',
      field: 'reason_for_dropping',
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-xs text-rose-600 dark:text-rose-400 font-medium',
      hide: !visibleCols.reasonForDropping,
      cellRenderer: textCell,
    },
    {
      headerName: 'MoU Document',
      field: 'document_uploader',
      minWidth: 130,
      cellClass: 'text-center',
      headerClass: 'text-center',
      hide: !visibleCols.document,
      cellRenderer: (p) => (p.value ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
          <FileText className="h-3 w-3" />
          <span>PDF</span>
        </span>
      ) : <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      minWidth: 110,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <div className="flex items-center justify-center space-x-1.5 h-full py-1">
          <button
            type="button"
            onClick={() => setSelectedMou(p.data)}
            title="View Details"
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(p.data)}
              title="Edit / Update MoU"
              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [visibleCols, currentPage, pageSize, summit, onEdit]);

  const handleExport = (type) => {
    if (loading) return notify(COMMON_TOASTS.tableNotReady(type === 'copy' ? 'copy' : 'export'));
    if (!rows.length) return notify(type === 'copy' ? COMMON_TOASTS.nothingToCopy() : COMMON_TOASTS.nothingToExport());
    return exportTableRows(type, {
      columns: EXPORT_COLUMNS,
      rows,
      fileName: `GMIS_IMW_MoUs_Page_${currentPage}`,
      title: 'GMIS & IMW MoUs Registry',
      notify,
    });
  };

  const clearFilters = () => {
    resetFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  if (selectedMou) {
    return (
      <GMISDetailView
        mou={selectedMou}
        onBack={() => setSelectedMou(null)}
        onEdit={onEdit}
        notify={notify}
      />
    );
  }

  const filterSelect = (label, key, allLabel, options) => (
    <div>
      <label className="module-form-label">{label}</label>
      <select value={filters[key]} onChange={(e) => setFilters({ [key]: e.target.value })} className="module-form-select">
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in relative">
      {/* Summit tabs and status tabs */}
      <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 select-none shrink-0">
          {SUMMIT_TABS.map((tab) => {
            const isActive = summit === tab.id;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setSummit(tab.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#0f417a] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="module-subtabs-strip overflow-x-auto" role="tablist" aria-label="MoU status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`module-subtab-btn ${statusTab === tab.id ? 'active' : ''}`}
            >
              {tab.label} ({counts[tab.countKey] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="module-card space-y-4">
        {/* Filter button, search and actions */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel((open) => !open)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
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
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search MoUs, partner, cell..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{totalCount}</span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Toggle Columns</span>
                  {Object.keys(visibleCols).map((col) => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{COLUMN_LABELS[col] || col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => handleExport('copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown
              onExportExcel={() => handleExport('excel')}
              onExportPdf={() => handleExport('pdf')}
              color="#0f417a"
              hoverColor="#134e96"
            />
          </div>
        </div>

        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filterSelect('Lead Organisation', 'organisation', `All Organisations (${organisations.length})`,
                organisations.map((o) => ({ value: String(o.organisation_id ?? o.id), label: o.organisation_name })))}
              {filterSelect('MoU Category / Industry', 'category', 'All Categories',
                categories.map((c) => ({ value: c.mou_category_name, label: c.mou_category_name })))}
              {filterSelect('VIBHAS / NAVIC Cell', 'navic', 'All NAVIC Cells',
                navicCells.map((n) => ({ value: n.navic_name, label: n.navic_name })))}
              {filterSelect('Nature of 2nd Party', 'nature', 'All 2nd Parties',
                NATURE_OF_SECOND_PARTY_OPTIONS.map((n) => ({ value: n, label: n })))}
            </div>
          </div>
        )}

        {!loading && result.failed && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span className="text-xs font-semibold">The MoU list could not be loaded.</span>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="module-datalist-grid">
          <Table
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            domLayout="autoHeight"
          />
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={totalCount}
          pageSize={pageSize}
          onPageChange={(page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); }}
          onPageSizeChange={(size) => setPageSize(Number(size))}
        />
      </div>
    </div>
  );
}
