import { useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import ReportTable from '../../../../../components/ReportTable';
import { fetchTrafficDashboardPart } from '../../../api';
import { useNotifier, COMMON_TOASTS } from '../../../../../utils/notify';
import { useCachedRequest } from '../usePagedList';
import { RefreshBar } from '../components/ListToolbar';
import { describePeriod } from './dashboardConfig';
import {
  DASHBOARD_TABLE_THEME, DRILL_PART, YOY_BG, cargoToggleFor, cargoWiseTitle, drillTitle, drillUnit, splitDrillRows, yoyCellStyle,
} from './drillConfig';

const DEFAULT_COL_DEF = { sortable: true, filter: true, resizable: true, minWidth: 100, cellClass: 'text-center', headerClass: 'text-center' };

const UNIT_COLUMNS = ['target_value', 'achievement_for_last_FY', 'current_fy_ytd', 'last_fy_ytd'];
const isBlank = (v) => v === null || v === undefined || v === '';

/** Value formatting per detail page, as in the earlier portal. */
function valueFormatterFor(type, kpi, field) {
  return (params) => {
    const v = params.value;
    if (isBlank(v)) return '';
    const n = Number(v);
    if (field.includes('yoy')) return Number.isFinite(n) ? `${n.toFixed(2)} %` : `${v} %`;
    if (!Number.isFinite(n)) return v;
    // The commodity-wise page showed every number with two decimals
    if (type === 'cargoWise') return n.toFixed(2);
    if ((type === 'cargo' || type === 'coastal') && kpi.startsWith('osbd') && UNIT_COLUMNS.includes(field)) return String(Math.round(n));
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  };
}

export function YoyLegend() {
  return (
    <div className="ml-auto w-fit flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
      {[['up', 'Positive Value — Above Target'], ['down', 'Negative Value — Below Target']].map(([key, text]) => (
        <span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: YOY_BG[key] }} aria-hidden="true" />
          {text}
        </span>
      ))}
    </div>
  );
}

/** Title bar of a "Detail of KPI" page, in the shared dashboard theme, with a Back button. */
export function DrillHeader({ title, onBack }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#1e1b4b] to-[#6366f1] px-4 py-3 flex items-center gap-3 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:bg-white/10 transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h2 className="flex-1 text-xs md:text-sm font-black text-white uppercase tracking-wider">{title}</h2>
    </div>
  );
}

/**
 * "Detail of KPI" for one card, or the commodity-wise table (type cargoWise).
 * drill = { type, kpi } or { type: 'cargoWise', cargo, from }.
 */
export default function KpiDrillDown({ drill, filters, labels, onBack, onOpenCargoWise, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const isCargoWise = drill.type === 'cargoWise';
  const params = useMemo(() => ({
    ...filters,
    ...(isCargoWise ? { cargo: drill.cargo } : { kpi: drill.kpi }),
  }), [filters, isCargoWise, drill]);

  const onError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Detail of KPI')), [notify]);
  const part = DRILL_PART[drill.type];
  const { value, loading, refreshing } = useCachedRequest(
    `dashboard-${part}:${JSON.stringify(params)}`,
    (signal) => fetchTrafficDashboardPart(part, params, { signal }).then((res) => (Array.isArray(res.data) ? res.data : [])),
    { onError }
  );

  const { rows, pinned } = useMemo(
    () => splitDrillRows(value || [], { type: drill.type, kpi: drill.kpi, organisationId: filters.organisationId }),
    [value, drill, filters.organisationId]
  );
  // S.No runs on through the pinned rows
  const numbered = useMemo(() => rows.map((r, i) => ({ ...r, sNo: i + 1 })), [rows]);
  const numberedPinned = useMemo(() => pinned.map((r, i) => ({ ...r, sNo: rows.length + i + 1 })), [pinned, rows.length]);

  const heading = isCargoWise ? cargoWiseTitle(drill.cargo) : drillTitle(drill.type, drill.kpi);
  const unit = isCargoWise ? '' : drillUnit(drill.type, drill.kpi);
  const period = describePeriod(filters.fy === 'all' ? '' : filters.fy, filters.months === 'all' ? [] : filters.months.split(',').map(Number));

  const columns = useMemo(() => {
    const first = rows[0] || pinned[0];
    if (!first) return [];
    const serial = { field: 'sNo', headerName: 'S.No', width: 90, maxWidth: 90, pinned: 'left' };
    const organisation = { field: 'organisation_name', headerName: 'Organisation', minWidth: 200, pinned: 'left', flex: 1.4 };

    if (isCargoWise) {
      // "<Commodity> - Current FY YTD" / "- Last FY YTD" / "- YoY (%)" → one group per commodity
      const groups = new Map();
      Object.keys(first).forEach((key) => {
        const match = key.match(/^(.*) - (Current FY YTD|Last FY YTD|YoY \(%\))$/);
        if (!match) return;
        if (!groups.has(match[1])) groups.set(match[1], []);
        groups.get(match[1]).push({ key, kind: match[2] });
      });
      // The "Total" commodity group always comes last, as on the earlier page
      const ordered = [...groups.entries()].sort(([a], [b]) => Number(/^total$/i.test(a)) - Number(/^total$/i.test(b)));
      return [serial, organisation, ...ordered.map(([name, leaves]) => ({
        headerName: name,
        marryChildren: true,
        children: leaves.map(({ key, kind }) => ({
          field: key,
          headerName: kind === 'Current FY YTD' ? `${labels.current} (YTD)` : kind === 'Last FY YTD' ? `${labels.last} (YTD)` : 'YoY (%)',
          minWidth: 130,
          valueFormatter: valueFormatterFor('cargoWise', '', kind.startsWith('YoY') ? 'yoy' : key),
          ...(kind.startsWith('YoY') ? { cellStyle: yoyCellStyle } : {}),
        })),
      }))];
    }

    const headerMap = {
      target_value: `Target for ${labels.current}`,
      achievement_for_last_FY: `Achievement for ${labels.last}`,
      current_fy_ytd: `${labels.current} (YTD)`,
      last_fy_ytd: `${labels.last} (YTD)`,
      yoy: 'YOY (%)',
    };
    const rest = Object.keys(first)
      .filter((key) => !['organisation_id', 'organisation_name', 'sNo'].includes(key))
      .map((key) => {
        const base = headerMap[key] || key.replace(/_/g, ' ').toUpperCase();
        return {
          field: key,
          headerName: unit && UNIT_COLUMNS.includes(key) ? `${base} (${unit})` : base,
          minWidth: 150,
          valueFormatter: valueFormatterFor(drill.type, drill.kpi || '', key),
          ...(key.toLowerCase().includes('yoy') ? { cellStyle: yoyCellStyle } : {}),
        };
      });
    return [serial, organisation, ...rest];
  }, [rows, pinned, isCargoWise, labels, unit, drill]);

  const toggle = !isCargoWise ? cargoToggleFor(drill.type, drill.kpi) : null;

  return (
    <div className="relative space-y-4 animate-fade-in">
      <RefreshBar active={refreshing && !loading} />
      <DrillHeader title="Detail of KPI Traffic & Port Performance" onBack={onBack} />

      {!isCargoWise ? <YoyLegend /> : null}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <ReportTable
          title={heading}
          eyebrow="KPI - Major Ports · Detail of KPI"
          subtitle={!isCargoWise ? period : null}
          loading={loading}
          rawData={numbered}
          viewData={numbered}
          columns={columns}
          defaultColDef={DEFAULT_COL_DEF}
          pinnedBottomRowData={numberedPinned}
          triggerNotification={triggerNotification}
          autoHeaderHeight
          reportExport
          toolbarExtra={toggle ? (
            <button
              type="button"
              onClick={() => onOpenCargoWise(toggle.cargo)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-[#4f46e5] dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
            >
              {toggle.label}
            </button>
          ) : null}
          {...DASHBOARD_TABLE_THEME}
        />
      </div>
    </div>
  );
}
