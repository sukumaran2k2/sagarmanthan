import { RefreshCw } from 'lucide-react';
import { formatDisplayDate } from '../../../utils/mis/format';
import { MIS_BORDER, MIS_BRAND, MIS_BRAND_SOFT } from '../../../utils/mis/theme';
import { AudienceChip, ErrorBanner, MetaPill, Panel } from './MisChrome';
import MisReportCard from './MisReportCard';

export default function MisOverview({ pack, loading, error, onOpen, onRefresh }) {
  const readyCount = pack.reports.filter((report) => report.dataReady).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: MIS_BRAND_SOFT }}>
                Projects · MIS
              </span>
              <AudienceChip audience={pack.audience} />
            </div>
            <h2 className="m-0 text-xl font-black tracking-tight sm:text-2xl" style={{ color: MIS_BRAND }}>
              Project summary reports
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs font-semibold leading-relaxed sm:text-sm" style={{ color: MIS_BRAND_SOFT }}>
              Six annexures for stalled projects, progress delay, awards, completions due this year, and the physical–financial gap.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill label="Financial year" value={pack.financialYear} />
            <MetaPill label="As on" value={pack.asOnDate ? formatDisplayDate(pack.asOnDate) : '—'} />
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold disabled:opacity-60"
              style={{ borderColor: MIS_BORDER, color: MIS_BRAND }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-semibold" style={{ color: MIS_BRAND_SOFT }}>
          {loading
            ? 'Loading annexure counts…'
            : `${readyCount} of ${pack.reports.length} annexures are live. Open any card to read the briefing and the project list.`}
        </p>
      </Panel>

      {error ? <ErrorBanner message={error} onRetry={onRefresh} /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {pack.reports.map((report) => (
          <MisReportCard
            key={report.id}
            report={report}
            loading={loading}
            onOpen={() => onOpen(report.id)}
          />
        ))}
      </div>
    </div>
  );
}
