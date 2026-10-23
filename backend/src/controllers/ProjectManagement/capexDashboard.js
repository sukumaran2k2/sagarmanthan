import sql from 'mssql';
import { pool } from '../../db.js';
import { getDataScope } from '../../middleware/dataScope.js';

// CAPEX dashboard: planned (tbl_capex targets) vs actual (tbl_capex_monthly) expenditure,
// aggregated in SQL. Amounts are in ₹ crore.
//
// Organisation type uses the three groups of the 2.0 dashboard (its mmt_hr_cluster list).
// mmt_organisation no longer has hr_cluster_id, so each group is a set of organisation
// categories instead; every category falls in exactly one group.
export const ORG_GROUPS = [
  { id: 1, name: 'Major Ports', sql: 'o.organisation_category_id = 1' },
  { id: 2, name: 'Other Organisations', sql: 'o.organisation_category_id IN (2, 3)' },
  { id: 3, name: 'Miscellaneous', sql: '(o.organisation_category_id NOT IN (1, 2, 3) OR o.organisation_category_id IS NULL)' },
];
const groupOf = (categoryId) => {
  if (categoryId === 1) return 1;
  if (categoryId === 2 || categoryId === 3) return 2;
  return 3;
};

const crore = (v) => Math.round((Number(v) || 0) * 100) / 100;
const FY_PATTERN = /^\d{4}-\d{4}$/;
// Financial year runs April–March; month_number is the calendar month.
const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Ministry / master users see every organisation; organisation users only their own.
function scopeFilter(req, request, column) {
  const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
  if (isWide) return '';
  if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) return ' AND 1 = 0';
  request.input('scopeOrgId', sql.Int, organisationId);
  return ` AND ${column} = @scopeOrgId`;
}

// GET /get-capex-dashboard-filters: financial years, organisation types and organisations
// that have CAPEX targets (within the caller's scope).
async function getCapexDashboardFilters(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const scopeSql = scopeFilter(req, request, 'c.capex_organisation_id');
    const [years, orgs] = (await request.query(`
      SELECT DISTINCT c.capex_financial_year AS fy
      FROM tbl_capex c
      WHERE c.capex_financial_year IS NOT NULL ${scopeSql};
      SELECT DISTINCT o.organisation_id AS id, o.organisation_name AS name, o.organisation_code AS code,
             o.organisation_category_id AS categoryId
      FROM tbl_capex c
      INNER JOIN mmt_organisation o ON o.organisation_id = c.capex_organisation_id
      WHERE 1 = 1 ${scopeSql};
    `)).recordsets;

    const organisations = orgs
      .map(({ categoryId, ...o }) => ({ ...o, groupId: groupOf(categoryId) }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const used = new Set(organisations.map((o) => o.groupId));
    res.json({
      // Newest year first.
      financialYears: years.map((r) => r.fy).filter((fy) => FY_PATTERN.test(fy)).sort().reverse(),
      // Only the groups that have CAPEX targets.
      groups: ORG_GROUPS.filter((g) => used.has(g.id)).map(({ id, name }) => ({ id, name })),
      organisations,
    });
  } catch (err) {
    console.error('getCapexDashboardFilters error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Dashboard filters (financial year, organisation type group, organisation) plus the caller's
// data scope, as WHERE conditions on tbl_capex c / mmt_organisation o. A filter left out
// (or "all") is not applied.
function bindFilters(req, request) {
  const where = ['1 = 1'];
  const financialYear = String(req.query.financialYear || '').trim();
  if (FY_PATTERN.test(financialYear)) {
    where.push('c.capex_financial_year = @financialYear');
    request.input('financialYear', sql.NVarChar(20), financialYear);
  }
  const group = ORG_GROUPS.find((g) => String(g.id) === String(req.query.groupId));
  if (group) where.push(group.sql);
  const organisationId = Number(req.query.organisationId);
  if (Number.isInteger(organisationId) && organisationId > 0) {
    where.push('c.capex_organisation_id = @organisationId');
    request.input('organisationId', sql.Int, organisationId);
  }
  const scope = scopeFilter(req, request, 'c.capex_organisation_id');
  if (scope) where.push(scope.replace(/^ AND /, ''));
  return where;
}

// GET /get-capex-dashboard-summary?financialYear=2026-2027&groupId=1&organisationId=12
// Any filter left out (or "all") is not applied.
async function getCapexDashboardSummary(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const where = bindFilters(req, request);

    // One row per organisation: planned by funding type, actual by funding type.
    const { recordset } = await request.query(`
      WITH Actual AS (
        SELECT capex_id,
               SUM(CASE WHEN funding_type = 'GBS'  THEN ISNULL(amount, 0) ELSE 0 END) AS gbs,
               SUM(CASE WHEN funding_type = 'IEBR' THEN ISNULL(amount, 0) ELSE 0 END) AS iebr,
               SUM(CASE WHEN funding_type = 'PPP'  THEN ISNULL(amount, 0) ELSE 0 END) AS ppp,
               SUM(ISNULL(amount, 0)) AS total,
               COUNT(*) AS entries,
               MAX(updated_date) AS last_updated
        FROM tbl_capex_monthly
        GROUP BY capex_id
      )
      SELECT c.capex_organisation_id AS id,
             MAX(o.organisation_name) AS name,
             MAX(o.organisation_code) AS code,
             CAST(SUM(ISNULL(c.capex_gbs_value, 0)) AS FLOAT) AS planned_gbs,
             CAST(SUM(ISNULL(c.capex_iebr_value, 0)) AS FLOAT) AS planned_iebr,
             CAST(SUM(ISNULL(c.capex_ppp_value, 0)) AS FLOAT) AS planned_ppp,
             CAST(SUM(ISNULL(c.capex_total_value, 0)) AS FLOAT) AS planned_total,
             CAST(SUM(ISNULL(a.gbs, 0)) AS FLOAT) AS actual_gbs,
             CAST(SUM(ISNULL(a.iebr, 0)) AS FLOAT) AS actual_iebr,
             CAST(SUM(ISNULL(a.ppp, 0)) AS FLOAT) AS actual_ppp,
             CAST(SUM(ISNULL(a.total, 0)) AS FLOAT) AS actual_total,
             SUM(ISNULL(a.entries, 0)) AS entries,
             MAX(COALESCE(a.last_updated, c.updated_date)) AS last_updated
      FROM tbl_capex c
      INNER JOIN mmt_organisation o ON o.organisation_id = c.capex_organisation_id
      LEFT JOIN Actual a ON a.capex_id = c.capex_id
      WHERE ${where.join(' AND ')}
      GROUP BY c.capex_organisation_id;
    `);

    res.json(shapeSummary(recordset));
  } catch (err) {
    console.error('getCapexDashboardSummary error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// GET /get-capex-dashboard-fy-summary?financialYear=2026-2027&groupId=1&organisationId=12
// Actual expenditure by funding type for the selection: one row per month (April–March)
// for a single financial year, or one row per financial year when no year is chosen.
// Also returns the planned totals for the same selection.
async function getCapexDashboardFySummary(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const where = bindFilters(req, request).join(' AND ');
    const byMonth = FY_PATTERN.test(String(req.query.financialYear || '').trim());
    const period = byMonth ? 'm.month_number' : 'c.capex_financial_year';
    const [rows, [planned]] = (await request.query(`
      SELECT ${period} AS period,
             CAST(SUM(CASE WHEN m.funding_type = 'GBS'  THEN ISNULL(m.amount, 0) ELSE 0 END) AS FLOAT) AS gbs,
             CAST(SUM(CASE WHEN m.funding_type = 'IEBR' THEN ISNULL(m.amount, 0) ELSE 0 END) AS FLOAT) AS iebr,
             CAST(SUM(CASE WHEN m.funding_type = 'PPP'  THEN ISNULL(m.amount, 0) ELSE 0 END) AS FLOAT) AS ppp,
             CAST(SUM(ISNULL(m.amount, 0)) AS FLOAT) AS total
      FROM tbl_capex c
      INNER JOIN mmt_organisation o ON o.organisation_id = c.capex_organisation_id
      INNER JOIN tbl_capex_monthly m ON m.capex_id = c.capex_id
      WHERE ${where}
      GROUP BY ${period};
      SELECT CAST(SUM(ISNULL(c.capex_gbs_value, 0)) AS FLOAT) AS gbs,
             CAST(SUM(ISNULL(c.capex_iebr_value, 0)) AS FLOAT) AS iebr,
             CAST(SUM(ISNULL(c.capex_ppp_value, 0)) AS FLOAT) AS ppp,
             CAST(SUM(ISNULL(c.capex_total_value, 0)) AS FLOAT) AS total
      FROM tbl_capex c
      INNER JOIN mmt_organisation o ON o.organisation_id = c.capex_organisation_id
      WHERE ${where};
    `)).recordsets;

    const round = (r) => ({ gbs: crore(r?.gbs), iebr: crore(r?.iebr), ppp: crore(r?.ppp), total: crore(r?.total) });
    const found = new Map(rows.map((r) => [String(r.period), r]));
    let periods;
    if (byMonth) {
      // Every month of the year, April first, including months with nothing recorded.
      periods = FY_MONTH_ORDER.map((n) => ({ label: MONTH_LABELS[n - 1], ...round(found.get(String(n))) }));
    } else {
      periods = rows.map((r) => ({ label: r.period, ...round(r) })).sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }
    res.json({ period: byMonth ? 'month' : 'year', rows: periods, planned: round(planned) });
  } catch (err) {
    console.error('getCapexDashboardFySummary error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// GET /get-capex-dashboard-yoy?groupId=1&organisationId=12
// Planned and actual expenditure per financial year (oldest first) for the selection.
async function getCapexDashboardYoy(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    // Every year is shown, so a financial year filter is not applied.
    const where = bindFilters({ ...req, query: { ...req.query, financialYear: '' } }, request);
    const { recordset } = await request.query(`
      WITH Actual AS (
        SELECT capex_id,
               SUM(CASE WHEN funding_type = 'GBS'  THEN ISNULL(amount, 0) ELSE 0 END) AS gbs,
               SUM(CASE WHEN funding_type = 'IEBR' THEN ISNULL(amount, 0) ELSE 0 END) AS iebr,
               SUM(CASE WHEN funding_type = 'PPP'  THEN ISNULL(amount, 0) ELSE 0 END) AS ppp,
               SUM(ISNULL(amount, 0)) AS total
        FROM tbl_capex_monthly
        GROUP BY capex_id
      )
      SELECT c.capex_financial_year AS fy,
             CAST(SUM(ISNULL(c.capex_gbs_value, 0)) AS FLOAT) AS planned_gbs,
             CAST(SUM(ISNULL(c.capex_iebr_value, 0)) AS FLOAT) AS planned_iebr,
             CAST(SUM(ISNULL(c.capex_ppp_value, 0)) AS FLOAT) AS planned_ppp,
             CAST(SUM(ISNULL(c.capex_total_value, 0)) AS FLOAT) AS planned_total,
             CAST(SUM(ISNULL(a.gbs, 0)) AS FLOAT) AS actual_gbs,
             CAST(SUM(ISNULL(a.iebr, 0)) AS FLOAT) AS actual_iebr,
             CAST(SUM(ISNULL(a.ppp, 0)) AS FLOAT) AS actual_ppp,
             CAST(SUM(ISNULL(a.total, 0)) AS FLOAT) AS actual_total
      FROM tbl_capex c
      INNER JOIN mmt_organisation o ON o.organisation_id = c.capex_organisation_id
      LEFT JOIN Actual a ON a.capex_id = c.capex_id
      WHERE ${where.join(' AND ')}
      GROUP BY c.capex_financial_year;
    `);
    const pick = (r, prefix) => ({
      gbs: crore(r[`${prefix}_gbs`]), iebr: crore(r[`${prefix}_iebr`]), ppp: crore(r[`${prefix}_ppp`]), total: crore(r[`${prefix}_total`]),
    });
    res.json(recordset
      .filter((r) => FY_PATTERN.test(r.fy))
      .map((r) => ({ financialYear: r.fy, planned: pick(r, 'planned'), actual: pick(r, 'actual') }))
      .sort((a, b) => a.financialYear.localeCompare(b.financialYear)));
  } catch (err) {
    console.error('getCapexDashboardYoy error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

function shapeSummary(rows) {
  const funding = (prefix, r) => ({
    gbs: r[`${prefix}_gbs`], iebr: r[`${prefix}_iebr`], ppp: r[`${prefix}_ppp`], total: r[`${prefix}_total`],
  });
  const sum = (list) => list.reduce(
    (acc, f) => ({ gbs: acc.gbs + f.gbs, iebr: acc.iebr + f.iebr, ppp: acc.ppp + f.ppp, total: acc.total + f.total }),
    { gbs: 0, iebr: 0, ppp: 0, total: 0 },
  );
  const round = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, crore(v)]));

  const byOrganisation = rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code || r.name,
      planned: round(funding('planned', r)),
      actual: round(funding('actual', r)),
      reporting: r.entries > 0,
    }))
    .sort((a, b) => b.planned.total - a.planned.total || a.name.localeCompare(b.name));

  const lastUpdated = rows.reduce((max, r) => (r.last_updated && (!max || r.last_updated > max) ? r.last_updated : max), null);
  return {
    kpis: {
      planned: round(sum(rows.map((r) => funding('planned', r)))),
      actual: round(sum(rows.map((r) => funding('actual', r)))),
      organisations: rows.length,
      reportingOrganisations: byOrganisation.filter((o) => o.reporting).length,
    },
    byOrganisation,
    lastUpdated,
  };
}

export default { getCapexDashboardFilters, getCapexDashboardSummary, getCapexDashboardFySummary, getCapexDashboardYoy };
