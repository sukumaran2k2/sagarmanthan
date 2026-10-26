import { MIS_REPORTS } from './catalog';
import { getFinancialYear } from './format';

export function mergeMisPack(payload) {
  const byId = new Map((payload?.reports || []).map((report) => [report.id, report]));
  const financialYear = payload?.financialYear || getFinancialYear().label;
  const audience = payload?.audience || 'ministry';

  return {
    asOnDate: payload?.asOnDate || null,
    financialYear,
    audience,
    reports: MIS_REPORTS.map((meta) => {
      const live = byId.get(meta.id);
      const dataReady = Boolean(live?.dataReady);
      const rows = meta.prepareRows(Array.isArray(live?.rows) ? live.rows : []);
      return {
        ...meta,
        dataReady,
        error: Boolean(live?.error),
        rows,
        stats: dataReady ? meta.deriveStats(rows) : null,
        insights: dataReady ? meta.buildInsights(rows, { audience, financialYear }) : [],
      };
    }),
  };
}

export function applyReport(meta, live, { financialYear, audience }) {
  const dataReady = Boolean(live?.dataReady);
  const rows = meta.prepareRows(Array.isArray(live?.rows) ? live.rows : []);
  return {
    ...meta,
    dataReady,
    error: false,
    rows,
    stats: dataReady ? meta.deriveStats(rows) : null,
    insights: dataReady ? meta.buildInsights(rows, { audience, financialYear }) : [],
  };
}

export function applyMisFilters(report, rows, { search, filterValues }) {
  const query = String(search || '').trim().toLowerCase();
  return rows.filter((row) => {
    const filtersPass = report.filters.every((filter) => {
      const selected = filterValues?.[filter.id];
      if (!selected) return true;
      return String(row[filter.field] || '') === selected;
    });
    if (!filtersPass) return false;
    if (!query) return true;
    return report.searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(query));
  });
}

export function visibleMisFilters(report, audience) {
  if (audience === 'organisation') {
    return report.filters.filter((filter) => filter.id !== 'organisation');
  }
  return report.filters;
}
