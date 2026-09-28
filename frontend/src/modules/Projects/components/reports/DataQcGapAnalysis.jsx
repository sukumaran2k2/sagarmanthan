import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  Download,
  Filter,
  Info,
  Search,
  ShieldAlert,
} from 'lucide-react';
import Table from '../../../../components/Table';
import {
  DATA_QC_CHECKS,
  SEVERITY_META,
  getDataQcCheckById,
  getDataQcSummary,
} from '../../utils/dataQcMock';

const GROUP_ORDER = ['Tendering', 'Implementation', 'Overall Project', 'Master Data'];

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

function DataQcOverview({ onOpenCheck }) {
  const summary = getDataQcSummary();
  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      checks: DATA_QC_CHECKS.filter((c) => c.group === group),
    })).filter((g) => g.checks.length > 0);
  }, []);

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
          </div>

          <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-3.5 min-w-0 w-full lg:w-auto lg:min-w-[460px]">
            <div className="rounded-xl bg-white text-[#0f417a] px-4 py-3 shadow-sm sm:min-w-[7.25rem] flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Total
              </div>
              <div className="text-3xl font-black tabular-nums leading-none mt-1 tracking-tight">
                {summary.totalIssues}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-1">
                Flagged issues
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
                  {summary.bySeverity.critical || 0}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1">
                <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">Needs data</span>
                </div>
                <div className="text-2xl font-black tabular-nums text-white leading-none">
                  {summary.bySeverity.warning || 0}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center flex flex-col items-center justify-center gap-1">
                <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-300">
                  <Info className="h-3 w-3 shrink-0" />
                  <span className="truncate">Attention</span>
                </div>
                <div className="text-2xl font-black tabular-nums text-white leading-none">
                  {summary.bySeverity.attention || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {grouped.map(({ group, checks }) => (
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
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug group-hover:text-[#0f417a] dark:group-hover:text-blue-400 transition-colors">
                        {check.shortLabel}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {check.description}
                      </p>
                    </div>
                    <div className={`shrink-0 rounded-xl px-3 py-2 ${meta.soft} text-center min-w-[4.5rem]`}>
                      <div className={`text-2xl font-black tabular-nums leading-none ${meta.icon}`}>
                        {check.count}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                        Issues
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#0f417a] dark:text-blue-400">
                    <span>View issue list</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function DataQcDetail({ checkId, onBack }) {
  const check = getDataQcCheckById(checkId);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const organisations = useMemo(() => {
    if (!check) return [];
    return [...new Set(check.rows.map((r) => r.organisation).filter(Boolean))].sort();
  }, [check]);

  const filteredRows = useMemo(() => {
    if (!check) return [];
    const q = search.trim().toLowerCase();
    return check.rows.filter((row) => {
      if (orgFilter && row.organisation !== orgFilter) return false;
      if (!q) return true;
      return [
        row.organisation,
        row.projectCode,
        row.projectName,
        row.issue,
        row.action,
        row.milestones,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [check, search, orgFilter]);

  if (!check) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm text-slate-500">Check not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-xs font-bold text-[#0f417a] dark:text-blue-400"
        >
          Back to overview
        </button>
      </div>
    );
  }

  const meta = SEVERITY_META[check.severity] || SEVERITY_META.attention;

  const columnDefs = useMemo(
    () =>
      check.columns.map((col) => ({
        ...col,
        wrapText: true,
        autoHeight: true,
        cellStyle: { lineHeight: '1.35', paddingTop: 8, paddingBottom: 8 },
      })),
    [check]
  );

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
            <SeverityBadge severity={check.severity} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {check.group}
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-snug">
            {check.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
            {check.description}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 ${meta.soft}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Flagged projects</div>
          <div className={`text-3xl font-black tabular-nums ${meta.icon}`}>{check.count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Showing {filteredRows.length} sample row{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project, organisation, issue..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f417a]/30"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All organisations</option>
                {organisations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled
              title="Export will connect to live report API"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-3">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No sample rows match the current filters.
            </div>
          ) : (
            <Table
              rowData={filteredRows}
              columnDefs={columnDefs}
              paginationPageSize={10}
              enableExport={false}
              color="#0f417a"
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: false,
              }}
            />
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] text-slate-500 font-medium flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Sample rows for structure preview. Full {check.count} issues will load from the Data QC API.
        </div>
      </div>
    </div>
  );
}

export default function DataQcGapAnalysis() {
  const [activeCheckId, setActiveCheckId] = useState(null);

  if (activeCheckId) {
    return (
      <DataQcDetail
        checkId={activeCheckId}
        onBack={() => setActiveCheckId(null)}
      />
    );
  }

  return (
    <DataQcOverview
      onOpenCheck={(id) => setActiveCheckId(id)}
    />
  );
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
