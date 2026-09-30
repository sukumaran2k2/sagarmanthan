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

function getColKey(col) {
  return col.field || col.headerName || '';
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
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-[#0f417a] via-[#143d6b] to-[#0b2d54] text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/90 mb-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              Ministry · Data QC
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Projects Gap Analysis
            </h2>
            <p className="mt-1.5 text-sm text-blue-100/85 max-w-2xl font-medium">
              Ministry review of missing and overdue project data for follow-up with ports.
            </p>
            {summary.availableCheckCount < summary.checkCount ? (
              <p className="mt-2 text-[11px] text-blue-100/70 font-semibold">
                Live: {summary.availableCheckCount} of {summary.checkCount} checks · remaining
                checks will activate as each report is wired.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-3.5 min-w-0 w-full lg:w-auto lg:min-w-[460px]">
            <div className="rounded-xl bg-white text-[#0f417a] px-4 py-3 shadow-sm sm:min-w-[7.25rem] flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Total
              </div>
              <div className="text-3xl font-black tabular-nums leading-none mt-1 tracking-tight">
                {loading ? '…' : summary.totalIssues}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-1">
                Flagged issues (live)
              </div>
            </div>

            <div className="hidden sm:block w-px self-stretch bg-white/30 mx-0.5" aria-hidden />
            <div className="sm:hidden h-px w-full bg-white/25" aria-hidden />

            <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1">
                <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-300">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span className="truncate">Critical</span>
                </div>
                <div className="text-2xl font-black tabular-nums text-white leading-none">
                  {loading ? '…' : summary.bySeverity.critical || 0}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1">
                <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">Needs data</span>
                </div>
                <div className="text-2xl font-black tabular-nums text-white leading-none">
                  {loading ? '…' : summary.bySeverity.warning || 0}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1">
                <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-300">
                  <Info className="h-3 w-3 shrink-0" />
                  <span className="truncate">Attention</span>
                </div>
                <div className="text-2xl font-black tabular-nums text-white leading-none">
                  {loading ? '…' : summary.bySeverity.attention || 0}
                </div>
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
              <h3 className="shrink-0 text-[11px] font-black uppercase tracking-[0.14em] text-[#0f417a] dark:text-blue-400 px-2.5 py-1 rounded-md bg-[#0f417a]/8 dark:bg-blue-500/10 border border-[#0f417a]/15 dark:border-blue-500/20">
                {group}
              </h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {checks.length} check{checks.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {checks.map((check) => {
                const meta = SEVERITY_META[check.severity] || SEVERITY_META.attention;
                return (
                  <button
                    key={check.id}
                    type="button"
                    onClick={() => onOpenCheck(check.id)}
                    className={`group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ${meta.ring} hover:shadow-md hover:border-[#0f417a]/40 dark:hover:border-blue-500/40 transition-all cursor-pointer`}
                  >
                    <div className={`-mx-4 -mt-4 mb-3 h-1 rounded-t-2xl ${meta.bar}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <SeverityBadge severity={check.severity} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {check.group}
                          </span>
                          {!check.available ? (
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Coming next
                            </span>
                          ) : null}
                        </div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug group-hover:text-[#0f417a] dark:group-hover:text-blue-400 transition-colors">
                          {check.shortLabel}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {check.description}
                        </p>
                      </div>
                      <div
                        className={`shrink-0 rounded-xl px-3 py-2 ${meta.soft} text-center min-w-[4.5rem]`}
                      >
                        <div className={check.available ? meta.icon : ''}>
                          <CountDisplay count={check.count} available={check.available} />
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                          Issues
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#0f417a] dark:text-blue-400">
                      <span>{check.available ? 'View issue list' : 'Preview check'}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
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
              placeholder="Search project, organisation, issue..."
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
              onChange={(e) => setPageSize(Number(e.target.value))}
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
              {filteredRows.length}
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
              <div className="absolute right-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
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
        </div>
      </div>

      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Filter Data QC
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
                Port/Organisation
              </label>
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className={filterSelectClass}
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
      )}

      <div className="relative min-h-[380px] capex-grid border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <Table
          rowData={pagedRows}
          columnDefs={displayColDefs}
          pagination={false}
          loading={loading}
          color="#0f417a"
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
            color="#0f417a"
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
          className="mt-3 text-xs font-bold text-[#0f417a] dark:text-blue-400 cursor-pointer"
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0f417a] dark:hover:text-blue-400 transition-colors mb-2 cursor-pointer"
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
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-snug">
            {active.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
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
            Report 1 (Tendering – Missing Dates) is live. Remaining checks will be wired one by
            one against the same Data QC API.
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
