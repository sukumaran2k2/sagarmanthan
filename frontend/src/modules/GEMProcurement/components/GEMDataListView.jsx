import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Info, Filter, ChevronDown, X } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

const FY_OPTIONS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
];

function getColKey(col) {
  return col.field || col.headerName || '';
}

export default function GEMDataListView({
  categoryTitle = 'Goods',
  searchTerm,
  setSearchTerm,
  page = 1,
  pageSize = 10,
  setPageSize,
  onPageChange,
  onPageSizeChange,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 0 },
  rowData = [],
  colDefs = [],
  loading = false,
  showAddButton = false,
  onOpenAddPage,
  handleCopyData,
  handleExportExcel,
  handleExportPdf,
  organisations = [],
  filterYear,
  setFilterYear,
  filterOrg,
  setFilterOrg,
  viewMode = 'ministry',
}) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  const toggleableCols = useMemo(
    () =>
      (colDefs || [])
        .filter((col) => col.headerName && col.headerName !== 'Sl.No' && col.headerName !== 'S.No')
        .map((col) => ({
          key: getColKey(col),
          label: col.headerName,
        }))
        .filter((c) => c.key),
    [colDefs]
  );

  const [visibleCols, setVisibleCols] = useState({});

  useEffect(() => {
    setVisibleCols((prev) => {
      const next = { ...prev };
      let changed = false;
      toggleableCols.forEach(({ key }) => {
        if (next[key] === undefined) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [toggleableCols]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRowsChange = (n) => {
    if (typeof onPageSizeChange === 'function') onPageSizeChange(n);
    else setPageSize?.(n);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterYear) count += 1;
    if (viewMode !== 'org' && filterOrg) count += 1;
    return count;
  }, [filterYear, filterOrg, viewMode]);

  const clearFilters = () => {
    setFilterYear?.('');
    if (viewMode !== 'org') setFilterOrg?.('');
  };

  const displayColDefs = useMemo(
    () =>
      (colDefs || []).map((col) => {
        const key = getColKey(col);
        if (!key || col.headerName === 'Sl.No' || col.headerName === 'S.No') return col;
        return {
          ...col,
          hide: visibleCols[key] === false,
        };
      }),
    [colDefs, visibleCols]
  );

  const filterSelectClass =
    'w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer';

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
            />
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
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search organisation, year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => handleRowsChange(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total:{' '}
            <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">
              {pagination.total || rowData.length}
            </span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Toggle Columns
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const all = {};
                      toggleableCols.forEach(({ key }) => {
                        all[key] = true;
                      });
                      setVisibleCols(all);
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
                {toggleableCols.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[key] !== false}
                      onChange={() =>
                        setVisibleCols((prev) => ({
                          ...prev,
                          [key]: prev[key] === false,
                        }))
                      }
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <CopyButton onCopy={handleCopyData} color="#0f417a" hoverBg="#f1f5f9" />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />

          {showAddButton && (
            <button
              type="button"
              onClick={onOpenAddPage}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-[#1d5594] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Planned
            </button>
          )}
        </div>
      </div>

      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Filter {categoryTitle}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Financial Year
              </label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={filterSelectClass}
              >
                <option value="">Show All</option>
                {FY_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            {viewMode !== 'org' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Organisation
                </label>
                <select
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="">Show All</option>
                  {organisations.map((org) => (
                    <option
                      key={org.organisation_id || org.id}
                      value={String(org.organisation_id || org.id)}
                    >
                      {org.organisation_name || org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold italic flex items-center space-x-1.5 pt-1">
            <Info size={14} className="text-blue-600 flex-shrink-0" />
            <span>Note: Planned target values are entered by the MoPSW Admin team.</span>
          </div>
        </div>
      )}

      <div className="relative min-h-[380px] gem-grid border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <Table
          rowData={rowData}
          columnDefs={displayColDefs}
          pagination={false}
          loading={loading}
          color="#0f417a"
          defaultColDef={{
            minWidth: 90,
            filter: false,
            sortable: true,
            resizable: true,
          }}
        />
        {pagination.totalPages > 0 && (
          <TablePagination
            currentPage={Math.max(0, page - 1)}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            pageSize={pageSize}
            onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
            color="#0f417a"
          />
        )}
      </div>
    </div>
  );
}
