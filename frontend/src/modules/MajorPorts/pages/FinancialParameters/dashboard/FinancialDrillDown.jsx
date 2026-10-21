import { useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import ReportTable from '../../../../../components/ReportTable';
import { fetchFinancialDashboardPart } from '../../../api';
import { useNotifier, COMMON_TOASTS } from '../../../../../utils/notify';
import { useCachedRequest } from '../../Traffic/usePagedList';
import { RefreshBar } from '../../Traffic/components/ListToolbar';
import { describePeriod } from '../../Traffic/dashboard/dashboardConfig';
import { YoyLegend } from '../../Traffic/dashboard/KpiDrillDown';
import { yoyCellStyle } from '../../Traffic/dashboard/drillConfig';
import { financialCard, splitFinancialDrillRows } from './financialDashboardConfig';

const DEFAULT_COL_DEF = { sortable: true, filter: true, resizable: true, minWidth: 100, cellClass: 'text-center', headerClass: 'text-center' };

const isBlank = (v) => v === null || v === undefined || v === '';
const numberText = (params) => {
  if (isBlank(params.value)) return '';
  const n = Number(params.value);
  return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : params.value;
};
const yoyText = (params) => {
  if (isBlank(params.value)) return '';
  const n = Number(params.value);
  return Number.isFinite(n) ? `${n.toFixed(2)} %` : `${params.value} %`;
};

/**
 * "Detail of KPI Financial Dashboard" for one card (the earlier detailedKPIFinancialDashboard.html):
 * every organisation with last year's full-year achievement, both years' YTD and YoY.
 */
export default function FinancialDrillDown({ kpi, filters, labels, onBack, triggerNotification }) {
  const notify = useNotifier(triggerNotification);
  const card = financialCard(kpi);
  const params = useMemo(() => ({ ...filters, kpi }), [filters, kpi]);

  const onError = useCallback(() => notify(COMMON_TOASTS.loadFailed('Detail of KPI')), [notify]);
  const { value, loading, refreshing } = useCachedRequest(
    `financial-dashboard-drill:${JSON.stringify(params)}`,
    (signal) => fetchFinancialDashboardPart('drill', params, { signal }).then((res) => (Array.isArray(res.data) ? res.data : [])),
    { onError }
  );

  const { rows, pinned } = useMemo(
    () => splitFinancialDrillRows(value || [], filters.organisationId),
    [value, filters.organisationId]
  );
  // S.No runs on through the pinned rows
  const numbered = useMemo(() => rows.map((r, i) => ({ ...r, sNo: i + 1 })), [rows]);
  const numberedPinned = useMemo(() => pinned.map((r, i) => ({ ...r, sNo: rows.length + i + 1 })), [pinned, rows.length]);

  const period = describePeriod(
    filters.fy === 'all' ? '' : filters.fy,
    filters.months === 'all' ? [] : filters.months.split(',').map(Number)
  );

  const columns = useMemo(() => {
    // The earlier page labelled these three columns "In Cr." for every card
    const unit = ' (In Cr.)';
    return [
      { field: 'sNo', headerName: 'S.No', width: 90, maxWidth: 90, pinned: 'left' },
      { field: 'organisation_name', headerName: 'Organisation', minWidth: 220, pinned: 'left', flex: 1.4 },
      { field: 'last_fy_full', headerName: `Achievement for ${labels.last}${unit}`, minWidth: 170, valueFormatter: numberText },
      { field: 'current_fy_ytd', headerName: `${labels.current} (YTD)${unit}`, minWidth: 160, valueFormatter: numberText },
      { field: 'last_fy_ytd', headerName: `${labels.last} (YTD)${unit}`, minWidth: 160, valueFormatter: numberText },
      { field: 'yoy_ytd', headerName: 'YOY (%)', minWidth: 120, valueFormatter: yoyText, cellStyle: yoyCellStyle },
    ];
  }, [labels]);

  return (
    <div className="module-card relative space-y-4 animate-fade-in overflow-hidden">
      <RefreshBar active={refreshing && !loading} />
      <div className="rounded-lg px-4 py-3 bg-gradient-to-tl from-[#a3d9e8] to-[#bbd0d3] dark:from-slate-800 dark:to-slate-700 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="p-1.5 rounded-lg text-[#0c3c6b] dark:text-slate-100 hover:bg-white/40 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center text-xl md:text-[28px] font-extrabold text-[#0c3c6b] dark:text-slate-50">
          Detail of KPI Financial Dashboard
        </h2>
      </div>

      <YoyLegend />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <ReportTable
          title={card?.heading || 'Financial KPI'}
          eyebrow="KPI - Major Ports · Detail of KPI"
          subtitle={period}
          loading={loading}
          rawData={numbered}
          viewData={numbered}
          columns={columns}
          defaultColDef={DEFAULT_COL_DEF}
          pinnedBottomRowData={numberedPinned}
          triggerNotification={triggerNotification}
          autoHeaderHeight
          reportExport
          themeClass="yp-pro-grid"
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#f8faf6"
        />
      </div>
    </div>
  );
}
