import { Search, X, ChevronDown, Info } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

const selectClass =
  'appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer min-w-[140px]';

const FY_OPTIONS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
];

export default function CapexDataListView({
  searchTerm,
  setSearchTerm,
  page = 1,
  pageSize = 10,
  setPageSize,
  onPageChange,
  onPageSizeChange,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 0 },
  rowData = [],
  colDefs,
  loading,
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
  const hasActiveFilters = Boolean(filterYear || filterOrg || searchTerm?.trim());

  const clearFilters = () => {
    setFilterYear('');
    setFilterOrg('');
    setSearchTerm('');
  };

  const handleRowsChange = (n) => {
    if (typeof onPageSizeChange === 'function') onPageSizeChange(n);
    else setPageSize?.(n);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={`${selectClass} min-w-[150px]`}
            >
              <option value="">All Financial Years</option>
              {FY_OPTIONS.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {viewMode !== 'org' ? (
            <div className="relative">
              <select
                value={filterOrg}
                onChange={(e) => setFilterOrg(e.target.value)}
                className={`${selectClass} min-w-[200px]`}
              >
                <option value="">All Organisations</option>
                {organisations.map((org) => (
                  <option
                    key={org.organisation_id || org.id}
                    value={String(org.organisation_id || org.id)}
                  >
                    {org.organisation_name || org.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          ) : null}

          <div className="relative min-w-[160px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-slate-500 hover:text-[#0f417a] px-2 py-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Rows
            </span>
            <select
              value={pageSize}
              onChange={(e) => handleRowsChange(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#0f417a]">
            Total: {pagination.total || 0}
          </div>

          <CopyButton onCopy={handleCopyData} color="#0f417a" hoverBg="#f1f5f9" />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color="#0f417a"
            hoverColor="#1d5594"
          />
        </div>
      </div>

      <div className="text-xs text-slate-500 font-semibold italic flex items-center space-x-1.5">
        <Info size={14} className="text-[#0f417a] flex-shrink-0" />
        <span>Note: Planned / target values are entered by the MoPSW Admin team.</span>
      </div>

      <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[380px]">
        <Table
          rowData={rowData}
          columnDefs={colDefs}
          pagination={false}
          loading={loading}
          color="#0f417a"
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
