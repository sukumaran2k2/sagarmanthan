import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { formatDisplayDate, formatKpiValue } from '../../../utils/mis/format';
import { MIS_ACCENTS, MIS_BORDER, MIS_BRAND, MIS_BRAND_SOFT } from '../../../utils/mis/theme';
import { AudienceChip, ErrorBanner, Panel } from './MisChrome';
import MisReportTable from './MisReportTable';
import { ReportIcon } from './reportIcons';

export default function MisReportDetail({
  report,
  pack,
  loading,
  error,
  onBack,
  onOpen,
  onRefresh,
}) {
  const accent = MIS_ACCENTS[report.accent] || MIS_ACCENTS.rose;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pack.reports.map((item) => {
          const selected = item.id === report.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                selected ? 'text-white' : 'bg-white text-slate-600'
              }`}
              style={selected
                ? { background: MIS_BRAND, borderColor: MIS_BRAND }
                : { borderColor: MIS_BORDER }}
            >
              {item.annexure}. {item.shortLabel}
            </button>
          );
        })}
      </div>

      <Panel>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#4b2424]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All annexures
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${accent.pill}`}>
                <ReportIcon reportId={report.id} className="h-3 w-3" />
                Annexure {report.annexure}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {report.group} · {report.code}
              </span>
              <AudienceChip audience={pack.audience} />
            </div>
            <h2 className="text-lg font-black leading-snug sm:text-xl" style={{ color: MIS_BRAND }}>
              {report.title}
            </h2>
            <p className="mt-1.5 max-w-3xl text-xs font-medium leading-relaxed sm:text-sm" style={{ color: MIS_BRAND_SOFT }}>
              {report.rule}
              {' '}
              FY {pack.financialYear}
              {pack.asOnDate ? ` · as on ${formatDisplayDate(pack.asOnDate)}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border bg-white px-3 py-2 text-xs font-bold disabled:opacity-60"
            style={{ borderColor: MIS_BORDER, color: MIS_BRAND }}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {report.kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-xl bg-white px-3 py-3" style={{ border: `1px solid ${MIS_BORDER}` }}>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: MIS_BRAND_SOFT }}>
                {kpi.label}
              </div>
              <div className="mt-1 text-xl font-black tabular-nums" style={{ color: MIS_BRAND }}>
                {loading && !report.dataReady ? '…' : formatKpiValue(kpi.format, report.stats?.[kpi.id])}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {error ? <ErrorBanner message={error} onRetry={onRefresh} /> : null}

      {report.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          This annexure could not be calculated. Refresh to try again.
        </div>
      ) : null}

      {report.dataReady && report.insights.length > 0 ? (
        <div className="rounded-2xl bg-white px-5 py-4" style={{ border: `1px solid ${MIS_BORDER}` }}>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: MIS_BRAND_SOFT }}>
            Briefing
          </div>
          <ul className="space-y-2">
            {report.insights.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.dataReady && report.rows.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm font-semibold text-slate-600">
          No projects currently meet this criterion.
        </div>
      ) : null}

      {!report.dataReady && !report.error && !loading ? (
        <div
          className="rounded-2xl border border-dashed px-5 py-4 text-sm font-medium"
          style={{ borderColor: MIS_BORDER, color: MIS_BRAND_SOFT, background: '#fcf9f7' }}
        >
          This annexure is laid out and ready. Project rows, the briefing, and the totals appear as soon as its query returns data.
        </div>
      ) : null}

      <MisReportTable
        key={report.id}
        report={report}
        rows={report.rows}
        loading={loading && report.rows.length === 0}
        dataReady={report.dataReady}
        audience={pack.audience}
        financialYear={pack.financialYear}
      />
    </div>
  );
}
