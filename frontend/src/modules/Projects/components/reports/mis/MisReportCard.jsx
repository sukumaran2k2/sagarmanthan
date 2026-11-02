import { ArrowRight } from 'lucide-react';
import { formatKpiValue } from '../../../utils/mis/format';
import { MIS_ACCENTS, MIS_BORDER, MIS_BRAND } from '../../../utils/mis/theme';
import { ReportIcon } from './reportIcons';

export default function MisReportCard({ report, loading, onOpen }) {
  const accent = MIS_ACCENTS[report.accent] || MIS_ACCENTS.rose;
  const status = report.error ? 'Unavailable' : report.dataReady ? 'Live' : 'Awaiting data';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b2424] dark:bg-slate-900 dark:border-slate-800"
      style={{ borderColor: MIS_BORDER }}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accent.bar}`} aria-hidden />
      <span className="absolute right-4 top-3 text-4xl font-black text-slate-100 select-none dark:text-slate-800">
        {String(report.annexure).padStart(2, '0')}
      </span>

      <div className="flex items-center gap-2 pr-12">
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${accent.pill}`}>
          <ReportIcon reportId={report.id} className="h-3 w-3" />
          Annexure {report.annexure}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {report.code}
        </span>
      </div>

      <h3 className="mt-3 pr-8 text-base font-black leading-snug" style={{ color: MIS_BRAND }}>
        {report.title}
      </h3>
      <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        {report.rule}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {report.kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-xl px-2.5 py-2"
            style={{ background: '#fcf9f7', border: `1px solid ${MIS_BORDER}` }}
          >
            <div className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">
              {kpi.label}
            </div>
            <div className="mt-1 text-sm font-black tabular-nums leading-tight" style={{ color: MIS_BRAND }}>
              {loading ? '…' : formatKpiValue(kpi.format, report.stats?.[kpi.id])}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          report.dataReady
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}
        >
          {status}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-black" style={{ color: MIS_BRAND }}>
          Open annexure
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
