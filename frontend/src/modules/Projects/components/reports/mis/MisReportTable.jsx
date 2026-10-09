import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import Table from '../../../../../components/Table';
import TablePagination from '../../../../../components/TablePagination';
import CopyButton from '../../../../../components/CopyButton';
import ExportDropdown from '../../../../../components/ExportDropdown';
import { buildMisColumnDefs } from '../../../utils/mis/columns';
import { formatCrore } from '../../../utils/mis/format';
import { applyMisFilters, visibleMisFilters } from '../../../utils/mis/pack';
import {
  MIS_ACCENT,
  MIS_BORDER,
  MIS_BRAND,
  MIS_BRAND_HOVER,
  MIS_BRAND_SOFT,
} from '../../../utils/mis/theme';

function getColKey(col) {
  return col.field || col.headerName || '';
}

export default function MisReportTable({
  report,
  rows,
  loading,
  dataReady,
  audience,
  financialYear,
}) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [visibleCols, setVisibleCols] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const colDropdownRef = useRef(null);

  const filters = useMemo(
    () => visibleMisFilters(report, audience),
    [report, audience]
  );

  const resetPage = () => setPage(1);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRows = useMemo(
    () => applyMisFilters(report, rows, { search: searchTerm, filterValues }),
    [report, rows, searchTerm, filterValues]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const filterOptions = useMemo(() => {
    const options = {};
    filters.forEach((filter) => {
      options[filter.id] = [...new Set(rows.map((row) => row[filter.field]).filter(Boolean))]
        .map(String)
        .sort((a, b) => a.localeCompare(b));
    });
    return options;
  }, [filters, rows]);

  const activeFiltersCount = filters.reduce(
    (count, filter) => count + (filterValues[filter.id] ? 1 : 0),
    0
  );

  const colDefs = useMemo(
    () => buildMisColumnDefs(report, safePage, pageSize),
    [report, safePage, pageSize]
  );

  const toggleableCols = useMemo(
    () => colDefs
      .filter((col) => col.headerName && col.headerName !== 'Sl. No.')
      .map((col) => ({ key: getColKey(col), label: col.headerName }))
      .filter((col) => col.key),
    [colDefs]
  );

  const displayColDefs = useMemo(
    () => colDefs.map((col) => {
      const key = getColKey(col);
      if (!key || col.headerName === 'Sl. No.') return col;
      return { ...col, hide: visibleCols[key] === false };
    }),
    [colDefs, visibleCols]
  );

  const exportHeaders = useMemo(
    () => displayColDefs
      .filter((col) => !col.hide && col.headerName && col.headerName !== 'Sl. No.')
      .map((col) => col.headerName),
    [displayColDefs]
  );

  const exportFields = useMemo(
    () => displayColDefs.filter((col) => !col.hide && col.field).map((col) => col.field),
    [displayColDefs]
  );

  const filteredTotal = report.totalField
    ? filteredRows.reduce((total, row) => {
      const value = Number(row[report.totalField.field]);
      return Number.isFinite(value) ? total + value : total;
    }, 0)
    : null;

  const clearFilters = () => {
    setFilterValues({});
    setSearchTerm('');
    resetPage();
  };

  const handleCopyData = () => {
    if (!filteredRows.length) return;
    const headerLine = exportHeaders.join('\t');
    const body = filteredRows
      .map((row, index) => [index + 1, ...exportFields.map((field) => row[field] ?? '')].join('\t'))
      .join('\n');
    navigator.clipboard.writeText(`Sl. No.\t${headerLine}\n${body}`);
  };

  const handleExportExcel = () => {
    if (!filteredRows.length) return;
    const sheetRows = [
      ['Sl. No.', ...exportHeaders],
      ...filteredRows.map((row, index) => [
        index + 1,
        ...exportFields.map((field) => row[field] ?? ''),
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, report.code);
    XLSX.writeFile(book, `Projects_${report.code}_FY_${financialYear || 'current'}.xlsx`);
  };

  const emptyMessage = rows.length === 0
    ? (dataReady
      ? 'No projects currently meet this criterion.'
      : 'Rows will appear when this annexure is connected to project data.')
    : 'No projects match the current search or filters.';

  const filterSelectClass = 'w-full px-3 py-2 text-xs font-semibold rounded-[10px] outline-none cursor-pointer';

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col lg:flex-row gap-3 items-center justify-between pb-4"
        style={{ borderBottom: `1px solid ${MIS_BORDER}` }}
      >
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-xs font-bold border transition cursor-pointer"
            style={
              showFilterPanel || activeFiltersCount > 0
                ? { background: MIS_ACCENT, borderColor: '#d7c4b7', color: MIS_BRAND }
                : { background: '#fff', borderColor: MIS_BORDER, color: MIS_BRAND }
            }
          >
            <Filter size={14} style={{ color: MIS_BRAND }} />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span
                className="text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none"
                style={{ background: MIS_BRAND }}
              >
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
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-2 rounded-[9px] border transition cursor-pointer"
              style={{ background: MIS_ACCENT, borderColor: MIS_BORDER, color: MIS_BRAND }}
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-2.5 h-3.5 w-3.5 pointer-events-none"
              style={{ color: MIS_BRAND_SOFT }}
            />
            <input
              type="search"
              placeholder="Search project, organisation, stage..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                resetPage();
              }}
              className="w-full pl-9 pr-8 py-2 text-[13px] font-medium rounded-[9px] outline-none bg-white"
              style={{ border: `1px solid ${MIS_BORDER}`, color: MIS_BRAND }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  resetPage();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0.5"
                style={{ color: MIS_BRAND_SOFT }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <label
            className="flex items-center space-x-1.5 text-xs font-semibold bg-white rounded-[9px] px-2.5 py-1.5 select-none"
            style={{ border: `1px solid ${MIS_BORDER}`, color: MIS_BRAND }}
          >
            <span className="text-[10px] uppercase font-bold" style={{ color: MIS_BRAND_SOFT }}>
              Rows:
            </span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                resetPage();
              }}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
              style={{ color: MIS_BRAND }}
              aria-label="Rows per page"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <div
            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-[9px]"
            style={{ background: '#fcf9f7', border: `1px solid ${MIS_BORDER}`, color: MIS_BRAND_SOFT }}
          >
            Total:{' '}
            <span className="font-extrabold" style={{ color: MIS_BRAND }}>
              {filteredRows.length}
            </span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              className="px-3 py-2 rounded-[9px] text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 bg-white"
              style={{ border: `1px solid ${MIS_BORDER}`, color: MIS_BRAND }}
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: MIS_BRAND_SOFT }} />
            </button>
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5"
                style={{ border: `1px solid ${MIS_BORDER}` }}
              >
                <div
                  className="flex items-center justify-between px-2 py-1"
                  style={{ borderBottom: `1px solid ${MIS_BORDER}` }}
                >
                  <span className="text-[10px] uppercase font-bold" style={{ color: MIS_BRAND_SOFT }}>
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
                    className="text-[10px] font-bold hover:underline cursor-pointer"
                    style={{ color: MIS_BRAND }}
                  >
                    Show All
                  </button>
                </div>
                {toggleableCols.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#f7f3f3] rounded-lg text-xs font-semibold cursor-pointer select-none"
                    style={{ color: MIS_BRAND }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[key] !== false}
                      onChange={() => setVisibleCols((prev) => ({
                        ...prev,
                        [key]: prev[key] === false,
                      }))}
                      className="h-3.5 w-3.5 rounded cursor-pointer accent-[#4b2424]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <CopyButton onCopy={handleCopyData} color={MIS_BRAND} hoverBg="#f7f3f3" />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={() => window.print()}
            color={MIS_BRAND}
            hoverColor={MIS_BRAND_HOVER}
          />
        </div>
      </div>

      {showFilterPanel && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${MIS_BORDER}`, background: '#fcf9f7' }}>
          <div
            className="px-[18px] py-3 flex items-center justify-between text-xs font-extrabold"
            style={{ background: MIS_ACCENT, color: MIS_BRAND }}
          >
            <div className="flex items-center gap-2">
              <Filter size={15} color={MIS_BRAND} />
              <span>Filter this annexure</span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterValues({});
                  resetPage();
                }}
                className="text-xs font-bold flex items-center space-x-1 cursor-pointer bg-transparent border-0"
                style={{ color: MIS_BRAND }}
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
          <div className="p-4 bg-white" style={{ borderTop: `1px solid ${MIS_BORDER}` }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filters.map((filter) => (
                <div key={filter.id}>
                  <label className="block text-[11.5px] font-extrabold mb-1.5" style={{ color: MIS_BRAND }}>
                    {filter.label}
                  </label>
                  <select
                    value={filterValues[filter.id] || ''}
                    onChange={(event) => {
                      setFilterValues((prev) => ({
                        ...prev,
                        [filter.id]: event.target.value,
                      }));
                      resetPage();
                    }}
                    className={filterSelectClass}
                    style={{ background: '#fcf9f7', border: '1px solid #d7c4b7', color: MIS_BRAND }}
                  >
                    <option value="">Show all</option>
                    {(filterOptions[filter.id] || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {report.totalField && dataReady && filteredRows.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3"
          style={{ background: '#fcf9f7', border: `1px solid ${MIS_BORDER}` }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MIS_BRAND_SOFT }}>
            {activeFiltersCount || searchTerm ? 'Filtered total' : 'Annexure total'}
            {' · '}
            {filteredRows.length} {filteredRows.length === 1 ? 'project' : 'projects'}
          </span>
          <span className="text-sm font-black tabular-nums" style={{ color: MIS_BRAND }}>
            {report.totalField.label}: ₹ {formatCrore(filteredTotal, { fixed: true })} Cr
          </span>
        </div>
      )}

      <div
        className="relative min-h-[380px] capex-grid rounded-2xl overflow-hidden shadow-sm bg-white"
        style={{ border: `1px solid ${MIS_BORDER}` }}
      >
        <Table
          rowData={pagedRows}
          columnDefs={displayColDefs}
          pagination={false}
          loading={loading}
          loadingMessage="Loading annexure..."
          color={MIS_BRAND}
          overlayNoRowsTemplate={`<span style="color:#8c4242;font-size:13px;font-weight:600;">${emptyMessage}</span>`}
          defaultColDef={{
            minWidth: 90,
            filter: false,
            sortable: true,
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
          }}
        />
        {filteredRows.length > 0 && (
          <TablePagination
            currentPage={Math.max(0, safePage - 1)}
            totalPages={totalPages}
            totalRows={filteredRows.length}
            pageSize={pageSize}
            onPageChange={(pageIndex) => setPage(pageIndex + 1)}
            color={MIS_BRAND}
          />
        )}
      </div>
    </div>
  );
}
