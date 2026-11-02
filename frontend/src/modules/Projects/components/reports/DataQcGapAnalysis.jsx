import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ClipboardCheck,
  Filter,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import Table from '../../../../components/Table';
import TablePagination from '../../../../components/TablePagination';
import CopyButton from '../../../../components/CopyButton';
import ExportDropdown from '../../../../components/ExportDropdown';
import { fetchProjectsDataQcCheck, fetchProjectsDataQcSummary } from '../../api';
import {
  SEVERITY_META,
  buildDataQcColumnDefs,
  getCheckMetaById,
  mergeSummaryWithMeta,
} from '../../utils/dataQcConfig';

const GROUP_ORDER = ['Tendering', 'Implementation', 'Overall Project', 'Master Data'];

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#eadede';

function getColKey(col) {
  return col.field || col.headerName || '';
}

function splitReportTitle(title) {
  const text = String(title || '').trim();
  const match = text.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (!match) return { main: text, note: '' };
  return {
    main: match[1].trim(),
    note: match[2].trim(),
  };
}

function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.attention;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function CountDisplay({ count, available }) {
  if (!available) {
    return (
      <div className="text-lg font-black tabular-nums leading-none text-slate-400">—</div>
    );
  }
  return (
    <div className="text-2xl font-black tabular-nums leading-none">
      {typeof count === 'number' ? count : '—'}
    </div>
  );
}

function DataQcOverview({ onOpenCheck }) {
  const [summary, setSummary] = useState(() => mergeSummaryWithMeta(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchProjectsDataQcSummary();
        if (cancelled) return;
        setSummary(mergeSummaryWithMeta(res.data));
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err?.response?.data?.message ||
            'Failed to load Data QC summary. Please try again.'
        );
        setSummary(mergeSummaryWithMeta(null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      checks: summary.checks.filter((c) => c.group === group),
    })).filter((g) => g.checks.length > 0);
  }, [summary.checks]);

  return (
    <div className="space-y-6">
      <div
        className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5 rounded-2xl shadow-sm"
        style={{
          border: `1px solid ${BORDER}`,
          background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={14} style={{ color: BRAND_SOFT }} strokeWidth={2.5} />
              <span
                className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold"
                style={{ color: BRAND_SOFT }}
              >
                Ministry · Data QC
              </span>
            </div>
            <h2 className="m-0 text-xl font-bold tracking-wide" style={{ color: BRAND }}>
              Projects Gap Analysis
            </h2>
            <p className="mt-1.5 text-xs font-semibold max-w-2xl" style={{ color: BRAND_SOFT }}>
              Ministry review of missing and overdue project data for follow-up with ports.
            </p>
            {summary.availableCheckCount < summary.checkCount ? (
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: BRAND_SOFT }}>
                Live: {summary.availableCheckCount} of {summary.checkCount} checks · remaining
                checks will activate as each report is wired.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-3.5 min-w-0 w-full lg:w-auto lg:min-w-[460px]">
          <div
            className="rounded-xl px-4 py-3 shadow-sm sm:min-w-[7.25rem] flex flex-col justify-center bg-white"
            style={{ border: `1px solid ${BORDER}`, color: BRAND }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND_SOFT }}>
              Total
            </div>
            <div className="text-3xl font-black tabular-nums leading-none mt-1 tracking-tight">
              {loading ? '…' : summary.totalIssues}
            </div>
            <div className="text-[10px] font-semibold mt-1" style={{ color: BRAND_SOFT }}>
              Flagged issues (live)
            </div>
          </div>

          <div className="hidden sm:block w-px self-stretch mx-0.5" style={{ background: BORDER }} aria-hidden />
          <div className="sm:hidden h-px w-full" style={{ background: BORDER }} aria-hidden />

          <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
            <div
              className="rounded-xl px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1 bg-white"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-700">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">Critical</span>
              </div>
              <div className="text-2xl font-black tabular-nums leading-none" style={{ color: BRAND }}>
                {loading ? '…' : summary.bySeverity.critical || 0}
              </div>
            </div>
            <div
              className="rounded-xl px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1 bg-white"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">Needs data</span>
              </div>
              <div className="text-2xl font-black tabular-nums leading-none" style={{ color: BRAND }}>
                {loading ? '…' : summary.bySeverity.warning || 0}
              </div>
            </div>
            <div
              className="rounded-xl px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1 bg-white"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700">
                <Info className="h-3 w-3 shrink-0" />
                <span className="truncate">Attention</span>
              </div>
              <div className="text-2xl font-black tabular-nums leading-none" style={{ color: BRAND }}>
                {loading ? '…' : summary.bySeverity.attention || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Data QC checks…
        </div>
      ) : (
        grouped.map(({ group, checks }) => (
          <section key={group} className="space-y-3">
            <div className="flex items-center gap-3 pt-1">
              <h3
                className="shrink-0 text-[11px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-md"
                style={{
                  color: BRAND,
                  background: ACCENT,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {group}
              </h3>
              <div className="h-px flex-1" style={{ background: BORDER }} />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {checks.length} check{checks.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
              {checks.map((check) => {
                const meta = SEVERITY_META[check.severity] || SEVERITY_META.attention;
                return (
                  <button
                    key={check.id}
                    type="button"
                    onClick={() => onOpenCheck(check.id)}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-sm hover:shadow-md transition-all cursor-pointer"
                    style={{ border: `1px solid ${BORDER}` }}
                  >
                    <div className={`h-1 w-full shrink-0 ${meta.bar}`} />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <SeverityBadge severity={check.severity} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {check.group}
                          </span>
                          {!check.available ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                              style={{ color: BRAND_SOFT, background: ACCENT }}
                            >
                              Coming next
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`w-14 shrink-0 rounded-xl px-2 py-1.5 text-center ${meta.soft}`}
                        >
                          <div className={check.available ? meta.icon : ''}>
                            <CountDisplay count={check.count} available={check.available} />
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Issues
                          </div>
                        </div>
                      </div>
                      <h4 className="mt-2 text-sm font-black leading-snug text-slate-800 transition-colors group-hover:text-[#4b2424] dark:text-slate-100 dark:group-hover:text-[#eadede]">
                        {check.shortLabel}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {check.description}
                      </p>
                      <div
                        className="mt-auto flex items-center justify-between pt-3 text-[11px] font-bold"
                        style={{ color: BRAND }}
                      >
                        <span>{check.available ? 'View issue list' : 'Preview check'}</span>
                        <span className="opacity-0 transition-opacity group-hover:opacity-100">
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function DataQcCheckGrid({
  checkId,
  rows,
  loading,
  searchTerm,
  setSearchTerm,
  orgFilter,
  setOrgFilter,
  organisations,
}) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCols, setVisibleCols] = useState({});
  const colDropdownRef = useRef(null);

  useEffect(() => {
    setPage(1);
  }, [checkId, searchTerm, orgFilter, pageSize]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (orgFilter && row.organisation !== orgFilter) return false;
      if (!q) return true;
      return [
        row.organisation,
        row.projectCode,
        row.projectName,
        row.issue,
        row.action,
        row.milestones,
        row.stage,
        row.targetDate,
        row.actualDate,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, searchTerm, orgFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const colDefs = useMemo(
    () => buildDataQcColumnDefs(checkId, { page: safePage, pageSize }),
    [checkId, safePage, pageSize]
  );

  const toggleableCols = useMemo(
    () =>
      (colDefs || [])
        .filter((col) => col.headerName && col.headerName !== 'Sl. No.')
        .map((col) => ({
          key: getColKey(col),
          label: col.headerName,
        }))
        .filter((c) => c.key),
    [colDefs]
  );

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

  const displayColDefs = useMemo(
    () =>
      (colDefs || []).map((col) => {
        const key = getColKey(col);
        if (!key || col.headerName === 'Sl. No.') return col;
        return {
          ...col,
          hide: visibleCols[key] === false,
        };
      }),
    [colDefs, visibleCols]
  );

  const activeFiltersCount = orgFilter ? 1 : 0;

  const clearFilters = () => {
    setOrgFilter('');
    setSearchTerm('');
  };

  const exportHeaders = useMemo(
    () =>
      displayColDefs
        .filter((c) => !c.hide && c.headerName && c.headerName !== 'Sl. No.')
        .map((c) => c.headerName),
    [displayColDefs]
  );

  const exportFields = useMemo(
    () =>
      displayColDefs
        .filter((c) => !c.hide && c.field)
        .map((c) => c.field),
    [displayColDefs]
  );

  const handleCopyData = () => {
    if (!filteredRows.length) return;
    const headerLine = exportHeaders.join('\t');
    const body = filteredRows
      .map((row) => exportFields.map((field) => row[field] ?? '').join('\t'))
      .join('\n');
    navigator.clipboard.writeText(`${headerLine}\n${body}`);
  };

  const handleExportExcel = () => {
    if (!filteredRows.length) return;
    const sheetRows = [
      exportHeaders,
      ...filteredRows.map((row) => exportFields.map((field) => row[field] ?? '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data QC');
    XLSX.writeFile(wb, `Projects_DataQC_${checkId}.xlsx`);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const filterSelectClass =
    'w-full px-3 py-2 text-xs font-semibold rounded-[10px] outline-none cursor-pointer';

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-xs font-bold border transition cursor-pointer"
            style={
              showFilterPanel || activeFiltersCount > 0
                ? { background: ACCENT, borderColor: '#d7c4b7', color: BRAND }
                : { background: '#fff', borderColor: BORDER, color: BRAND }
            }
          >
            <Filter size={14} style={{ color: BRAND }} />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span
                className="text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none"
                style={{ background: BRAND }}
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
              style={{ background: ACCENT, borderColor: BORDER, color: BRAND }}
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-2.5 h-3.5 w-3.5 pointer-events-none"
              style={{ color: BRAND_SOFT }}
            />
            <input
              type="text"
              placeholder="Search project, organisation, issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[13px] font-medium rounded-[9px] outline-none bg-white"
              style={{ border: `1px solid ${BORDER}`, color: BRAND }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0.5"
                style={{ color: BRAND_SOFT }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div
            className="flex items-center space-x-1.5 text-xs font-semibold bg-white rounded-[9px] px-2.5 py-1.5 select-none"
            style={{ border: `1px solid ${BORDER}`, color: BRAND }}
          >
            <span className="text-[10px] uppercase font-bold" style={{ color: BRAND_SOFT }}>
              Rows:
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
              style={{ color: BRAND }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div
            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-[9px]"
            style={{ background: '#fcf9f7', border: `1px solid ${BORDER}`, color: BRAND_SOFT }}
          >
            Total:{' '}
            <span className="font-extrabold" style={{ color: BRAND }}>
              {filteredRows.length}
            </span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="px-3 py-2 rounded-[9px] text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 bg-white"
              style={{ border: `1px solid ${BORDER}`, color: BRAND }}
            >
              <span>Visibility</span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: BRAND_SOFT }} />
            </button>
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <div
                  className="flex items-center justify-between px-2 py-1"
                  style={{ borderBottom: `1px solid ${BORDER}` }}
                >
                  <span className="text-[10px] uppercase font-bold" style={{ color: BRAND_SOFT }}>
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
                    style={{ color: BRAND }}
                  >
                    Show All
                  </button>
                </div>
                {toggleableCols.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#f7f3f3] rounded-lg text-xs font-semibold cursor-pointer select-none"
                    style={{ color: BRAND }}
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
                      className="h-3.5 w-3.5 rounded cursor-pointer accent-[#4b2424]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <CopyButton onCopy={handleCopyData} color={BRAND} hoverBg="#f7f3f3" />
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            color={BRAND}
            hoverColor={BRAND_HOVER}
          />
        </div>
      </div>

      {showFilterPanel && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${BORDER}`, background: '#fcf9f7' }}
        >
          <div
            className="px-[18px] py-3 flex items-center justify-between text-xs font-extrabold"
            style={{ background: ACCENT, color: BRAND }}
          >
            <div className="flex items-center gap-2">
              <Filter size={15} color={BRAND} />
              <span>Filter Report Parameters</span>
              {activeFiltersCount > 0 ? (
                <span className="px-2 py-0.5 text-white text-[10px] rounded-full font-bold" style={{ background: BRAND }}>
                  Active
                </span>
              ) : null}
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold flex items-center space-x-1 cursor-pointer bg-transparent border-0"
                style={{ color: BRAND }}
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="p-4 space-y-3 bg-white" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11.5px] font-extrabold mb-1.5"
                  style={{ color: BRAND }}
                >
                  Port/Organisation
                </label>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className={filterSelectClass}
                  style={{
                    background: '#fcf9f7',
                    border: '1px solid #d7c4b7',
                    color: BRAND,
                  }}
                >
                  <option value="">Show All</option>
                  {organisations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="relative min-h-[380px] capex-grid rounded-2xl overflow-hidden shadow-sm bg-white"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <Table
          rowData={pagedRows}
          columnDefs={displayColDefs}
          pagination={false}
          loading={loading}
          color={BRAND}
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
            color={BRAND}
          />
        )}
      </div>
    </div>
  );
}

function DataQcDetail({ checkId, onBack }) {
  const meta = getCheckMetaById(checkId);
  const [check, setCheck] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkMeta = getCheckMetaById(checkId);

    async function load() {
      if (!checkMeta) {
        setLoading(false);
        setAvailable(false);
        setCheck(null);
        setRows([]);
        setError('Check not found.');
        return;
      }

      setLoading(true);
      setError('');
      setSearchTerm('');
      setOrgFilter('');
      try {
        const res = await fetchProjectsDataQcCheck(checkId);
        if (cancelled) return;
        const payload = res.data?.check || null;
        setAvailable(true);
        setCheck({
          ...checkMeta,
          ...payload,
        });
        setRows(Array.isArray(payload?.rows) ? payload.rows : []);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 501) {
          setAvailable(false);
          setCheck(checkMeta);
          setRows([]);
          setError('');
        } else {
          console.error(err);
          setAvailable(false);
          setCheck(checkMeta);
          setRows([]);
          setError(
            err?.response?.data?.message ||
              'Failed to load this Data QC check. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [checkId]);

  const organisations = useMemo(() => {
    return [...new Set(rows.map((r) => r.organisation).filter(Boolean))].sort();
  }, [rows]);

  const active = check || meta;

  if (!meta && !loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm text-slate-500">Check not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-xs font-bold cursor-pointer"
          style={{ color: BRAND }}
        >
          Back to overview
        </button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const severityMeta = SEVERITY_META[active.severity] || SEVERITY_META.attention;
  const titleParts = splitReportTitle(active.title);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors mb-2 cursor-pointer hover:text-[#4b2424]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Data QC checks
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={active.severity} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {active.group}
            </span>
          </div>
          <h2
            className="text-lg font-black leading-snug break-words max-w-4xl"
            style={{ color: BRAND }}
          >
            {titleParts.main}
          </h2>
          {titleParts.note ? (
            <p
              className="mt-1 text-[11px] font-semibold leading-relaxed max-w-3xl"
              style={{ color: BRAND_SOFT }}
            >
              {titleParts.note}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs max-w-3xl" style={{ color: BRAND_SOFT }}>
            {active.description}
          </p>
        </div>
        <div
          className={`shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 ${severityMeta.soft}`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Flagged projects
          </div>
          <div className={`text-3xl font-black tabular-nums ${severityMeta.icon}`}>
            {loading ? '…' : available ? rows.length : '—'}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!available && !loading && !error ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-8 text-center">
          <ClipboardCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Live data for this check is next
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            This Data QC check is not available yet. Live checks are shown on the overview
            cards.
          </p>
        </div>
      ) : null}

      {available ? (
        <DataQcCheckGrid
          checkId={checkId}
          rows={rows}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          orgFilter={orgFilter}
          setOrgFilter={setOrgFilter}
          organisations={organisations}
        />
      ) : null}
    </div>
  );
}

export default function DataQcGapAnalysis() {
  const [activeCheckId, setActiveCheckId] = useState(null);

  if (activeCheckId) {
    return (
      <DataQcDetail checkId={activeCheckId} onBack={() => setActiveCheckId(null)} />
    );
  }

  return <DataQcOverview onOpenCheck={(id) => setActiveCheckId(id)} />;
}

export function DataQcMinistryOnlyNotice() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
      <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
        Ministry view only
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Data QC (Gap Analysis) reports are available exclusively for Ministry users to review
        data-quality gaps across organisations.
      </p>
    </div>
  );
}
