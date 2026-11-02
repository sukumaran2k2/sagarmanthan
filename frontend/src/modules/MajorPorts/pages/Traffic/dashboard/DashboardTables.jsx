import { useMemo } from 'react';
import ReportTable from '../../../../../components/ReportTable';
import {
  OVERALL_COLUMNS,
  OVERALL_ROWS,
  SUMMARY_GROUPS,
  buildSummaryRows,
  describePeriod,
  formatValue,
  readPath,
  totalMetric,
} from './dashboardConfig';

import { DASHBOARD_TABLE_THEME as REPORT_THEME } from './drillConfig';

const EYEBROW = 'KPI - Major Ports · Traffic';
const DEFAULT_COL_DEF = { sortable: false, filter: false, resizable: true, minWidth: 100, cellClass: 'text-center', headerClass: 'text-center' };
const LABEL_COL = { pinned: 'left', minWidth: 210, cellClass: 'font-bold', cellStyle: { justifyContent: 'flex-start', textAlign: 'left' } };

/** Table YoY: coloured arrow, number in black (green = better, reversed for lower-is-better rows). */
function TableYoy({ value, reverse = false }) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return <span>0%</span>;
  if (n === 0) return <span>0.00%</span>;
  const good = reverse ? n < 0 : n > 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={good ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'} aria-label={n > 0 ? 'up' : 'down'}>
        {n > 0 ? '▲' : '▼'}
      </span>
      {Math.abs(n).toFixed(2)}%
    </span>
  );
}

const yoyText = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '0%';
  return `${n > 0 ? '▲ ' : n < 0 ? '▼ ' : ''}${Math.abs(n).toFixed(2)}%`;
};

/** "Cargo Category Wise KPIs (YoY) – Overall" */
export function OverallKpiTable({ data, fiscalYear, months, labels, triggerNotification }) {
  const period = describePeriod(fiscalYear, months);

  // One flat row per KPI: c<i>_py / c<i>_cy / c<i>_yoy; c<i>_has is false where the KPI has no value for that column
  const rows = useMemo(() => OVERALL_ROWS.map((row) => {
    const out = { label: row.label, reverse: row.reverse, format: row.format };
    row.cells.forEach((c, i) => {
      out[`c${i}_has`] = Boolean(c);
      if (!c) return;
      out[`c${i}_py`] = readPath(data?.[c.source], c.last);
      out[`c${i}_cy`] = readPath(data?.[c.source], c.current);
      out[`c${i}_yoy`] = readPath(data?.[c.source], c.yoy);
    });
    return out;
  }), [data]);

  const columns = useMemo(() => [
    { field: 'label', headerName: 'Traffic / KPI', ...LABEL_COL },
    ...OVERALL_COLUMNS.map((name, i) => {
      const value = (p) => (p.data?.[`c${i}_has`] ? formatValue(p.value, p.data.format) : '');
      return {
        headerName: name,
        marryChildren: true,
        children: [
          { field: `c${i}_py`, headerName: 'PY', headerTooltip: labels.last, valueFormatter: value },
          { field: `c${i}_cy`, headerName: 'CY', headerTooltip: labels.current, valueFormatter: value },
          {
            field: `c${i}_yoy`,
            headerName: 'YoY',
            valueFormatter: (p) => (p.data?.[`c${i}_has`] ? yoyText(p.value) : ''),
            cellRenderer: (p) => (p.data?.[`c${i}_has`] ? <TableYoy value={p.value} reverse={p.data.reverse} /> : null),
          },
        ],
      };
    }),
  ], [labels]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <ReportTable
        title="Cargo Category Wise KPIs (YoY) – Overall"
        eyebrow={EYEBROW}
        subtitle={period}
        rawData={rows}
        viewData={rows}
        columns={columns}
        defaultColDef={DEFAULT_COL_DEF}
        triggerNotification={triggerNotification}
        autoHeaderHeight
        reportExport
        {...REPORT_THEME}
      />
    </div>
  );
}

const SIDES = [['loaded', 'Loaded'], ['unloaded', 'Un-Loaded'], ['total', 'Total']];

/** Metrics of one row for one column group, Total computed from Loaded + Un-Loaded. */
function groupMetrics(org, group) {
  if (!group.split) return { value: org[group.value] || {} };
  const loaded = org[group.loaded] || {};
  const unloaded = org[group.unloaded] || {};
  return { loaded, unloaded, total: totalMetric(loaded, unloaded) };
}

const num2 = (v) => Number(v ?? 0).toFixed(2);

/** One flat grid row per organisation: `<group>_<side>_py|cy|yoy`. */
function toGridRow(org) {
  const out = { organisation_name: org.organisation_name ?? '-' };
  SUMMARY_GROUPS.forEach((g) => {
    Object.entries(groupMetrics(org, g)).forEach(([side, m]) => {
      out[`${g.id}_${side}_py`] = m.last_total;
      out[`${g.id}_${side}_cy`] = m.current_total;
      out[`${g.id}_${side}_yoy`] = m.yoy_percent;
    });
  });
  return out;
}

/** "Traffic KPI Summary (YoY) - <commodity>": organisation-wise EXIM / coastal / transshipment. */
export function TrafficKpiSummaryTable({ summary, title, fiscalYear, months, labels, loading, triggerNotification }) {
  const period = describePeriod(fiscalYear, months);
  const { rows, totals } = useMemo(() => buildSummaryRows(summary?.organisations || []), [summary]);
  const py = `PY (${labels.last})`;
  const cy = `CY (${labels.current})`;

  const gridRows = useMemo(() => rows.map(toGridRow), [rows]);
  // SMPA Total and Grand Total
  const pinnedRows = useMemo(() => totals.map(toGridRow), [totals]);

  const columns = useMemo(() => {
    const leaves = (prefix) => [
      { field: `${prefix}_py`, headerName: py, minWidth: 115, valueFormatter: (p) => num2(p.value) },
      { field: `${prefix}_cy`, headerName: cy, minWidth: 115, valueFormatter: (p) => num2(p.value) },
      {
        field: `${prefix}_yoy`,
        headerName: 'YoY',
        minWidth: 100,
        valueFormatter: (p) => yoyText(p.value),
        cellRenderer: (p) => <TableYoy value={p.value} />,
      },
    ];
    return [
      { field: 'organisation_name', headerName: 'Organisation', ...LABEL_COL },
      ...SUMMARY_GROUPS.map((g) => ({
        headerName: g.label,
        marryChildren: true,
        children: g.split
          ? SIDES.map(([side, label]) => ({ headerName: label, marryChildren: true, children: leaves(`${g.id}_${side}`) }))
          : leaves(`${g.id}_value`),
      })),
    ];
  }, [py, cy]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <ReportTable
        title={title}
        eyebrow={EYEBROW}
        subtitle={period}
        loading={loading && !summary}
        rawData={gridRows}
        viewData={gridRows}
        columns={columns}
        defaultColDef={DEFAULT_COL_DEF}
        pinnedBottomRowData={pinnedRows}
        triggerNotification={triggerNotification}
        autoHeaderHeight
        reportExport
        {...REPORT_THEME}
      />
    </div>
  );
}
