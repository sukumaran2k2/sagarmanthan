import sql from 'mssql';
import { pool } from '../../db.js';
import { getDataScope } from '../../middleware/dataScope.js';

// GMIS & IMW MoUs dashboard: every aggregate in one call, computed in SQL.
//
// present_status holds free-text stages; they are grouped into five dashboard stages.
// (The older GMIS endpoints match '%Yet to%', which never matches the real value
// "To be started", and don't count feasibility / tendering / approval at all.)
export const STAGES = [
  { key: 'completed', label: 'Completed' },
  { key: 'underImplementation', label: 'Under Implementation' },
  { key: 'preImplementation', label: 'Pre-implementation' },
  { key: 'toBeStarted', label: 'To be Started' },
  { key: 'dropped', label: 'Dropped' },
];

const STAGE_SQL = `
  CASE
    WHEN m.present_status LIKE '%complete%' THEN 'completed'
    WHEN m.present_status LIKE '%under implementation%' THEN 'underImplementation'
    WHEN m.present_status LIKE '%feasibility%' OR m.present_status LIKE '%DPR%' OR m.present_status LIKE '%planning%'
      OR m.present_status LIKE '%study%' OR m.present_status LIKE '%tender%' OR m.present_status LIKE '%approval%'
      THEN 'preImplementation'
    WHEN m.present_status LIKE '%to be started%' OR m.present_status LIKE '%yet to%' THEN 'toBeStarted'
    WHEN m.present_status LIKE '%drop%' THEN 'dropped'
    ELSE 'notSpecified'
  END`;

// Rounded to 2 decimals; amounts are in ₹ crore.
const crore = (v) => Math.round((Number(v) || 0) * 100) / 100;

// GET /get-gmis-mou-dashboard?eventName=GMIS%202025
async function getGmisMouDashboard(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    // Ministry / master users see every MoU; organisation users only their organisation's.
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    const where = ['1 = 1'];
    const orgView = !isWide && isOrganisation && Number.isFinite(organisationId) && organisationId > 0;
    if (!isWide) {
      if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) {
        where.push('1 = 0');
      } else {
        where.push('m.organisation_id = @scopeOrgId');
        request.input('scopeOrgId', sql.Int, organisationId);
      }
    }
    const eventName = String(req.query.eventName || '').trim();
    if (eventName && eventName.toLowerCase() !== 'all') {
      where.push('m.event_name = @eventName');
      request.input('eventName', sql.NVarChar(100), eventName);
    }

    const result = await request.query(`
      -- Filtered MoUs once, then every summary reads from them (a CTE would only
      -- cover the first SELECT).
      IF OBJECT_ID('tempdb..#mou') IS NOT NULL DROP TABLE #mou;
      SELECT m.id, m.organisation_id, ISNULL(o.organisation_name, 'Not specified') AS organisation_name,
               LTRIM(RTRIM(REPLACE(REPLACE(ISNULL(c.mou_category_name, 'Uncategorised'), CHAR(13), ''), CHAR(10), ''))) AS category,
               ISNULL(NULLIF(LTRIM(RTRIM(m.event_name)), ''), 'Not specified') AS event_name,
               ISNULL(NULLIF(LTRIM(RTRIM(m.present_status)), ''), 'Not specified') AS raw_status,
               ${STAGE_SQL} AS stage,
               CAST(ISNULL(m.amount, 0) AS FLOAT) AS amount,
               CASE WHEN o.organisation_category_id = 1 THEN 1 ELSE 0 END AS is_major_port,
               m.updated_on, m.created_on
        INTO #mou
        FROM tbl_gmis_mou m
        LEFT JOIN mmt_organisation o ON o.organisation_id = m.organisation_id
        LEFT JOIN mmt_mou_category c ON c.mou_category_id = m.mou_category_id
        WHERE ${where.join(' AND ')};
      SELECT stage, raw_status, COUNT(*) AS n, SUM(amount) AS amt FROM #mou GROUP BY stage, raw_status;
      SELECT category, COUNT(*) AS n, SUM(amount) AS amt FROM #mou GROUP BY category;
      SELECT event_name, stage, COUNT(*) AS n, SUM(amount) AS amt FROM #mou GROUP BY event_name, stage;
      SELECT organisation_name, is_major_port, stage, COUNT(*) AS n, SUM(amount) AS amt FROM #mou GROUP BY organisation_name, is_major_port, stage;
      SELECT COUNT(DISTINCT organisation_id) AS orgs, COUNT(DISTINCT event_name) AS summits,
             MAX(COALESCE(updated_on, created_on)) AS last_updated
      FROM #mou;
      DROP TABLE #mou;
      ${orgView ? 'SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @scopeOrgId;' : ''}
    `);
    const dashboard = shapeDashboard(result.recordsets);
    // Tells the page which layout to show: organisation users get their own organisation's
    // view (no organisation-wise table), decided here so it always matches the data scope.
    dashboard.view = orgView
      ? { level: 'organisation', organisationId, organisationName: result.recordsets[5]?.[0]?.organisation_name || null }
      : { level: 'all' };
    if (orgView) dashboard.byOrganisation = [];
    res.json(dashboard);
  } catch (err) {
    console.error('getGmisMouDashboard error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

function emptyStages() {
  return Object.fromEntries([...STAGES.map((s) => s.key), 'notSpecified'].map((k) => [k, { count: 0, value: 0 }]));
}

function shapeDashboard([statusRows, categoryRows, summitRows, orgRows, [summary]]) {
  // KPI cards: totals per stage, with the raw statuses that make up each stage.
  const stages = emptyStages();
  const breakdown = Object.fromEntries(Object.keys(stages).map((k) => [k, []]));
  let totalCount = 0;
  let totalValue = 0;
  for (const r of statusRows) {
    stages[r.stage].count += r.n;
    stages[r.stage].value += r.amt;
    breakdown[r.stage].push({ status: r.raw_status, count: r.n, value: crore(r.amt) });
    totalCount += r.n;
    totalValue += r.amt;
  }
  const kpis = {
    total: { count: totalCount, value: crore(totalValue), organisations: summary?.orgs || 0, summits: summary?.summits || 0 },
    stages: [...STAGES, { key: 'notSpecified', label: 'Not specified' }].map((s) => ({
      ...s,
      count: stages[s.key].count,
      value: crore(stages[s.key].value),
      countShare: totalCount ? Math.round((stages[s.key].count / totalCount) * 1000) / 10 : 0,
      valueShare: totalValue ? Math.round((stages[s.key].value / totalValue) * 1000) / 10 : 0,
      breakdown: breakdown[s.key].sort((a, b) => b.count - a.count),
    })),
  };

  const byCategory = categoryRows
    .map((r) => ({ category: r.category, count: r.n, value: crore(r.amt) }))
    .sort((a, b) => b.count - a.count);

  // Summit (event) x stage, oldest summit first.
  const group = (rows, keyField) => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r[keyField])) map.set(r[keyField], { name: r[keyField], stages: emptyStages(), count: 0, value: 0 });
      const g = map.get(r[keyField]);
      g.stages[r.stage].count += r.n;
      g.stages[r.stage].value = crore(g.stages[r.stage].value + r.amt);
      g.count += r.n;
      g.value = crore(g.value + r.amt);
    }
    return [...map.values()];
  };
  const summitYear = (name) => Number((String(name).match(/(\d{4})/) || [])[1]) || 9999;
  const bySummit = group(summitRows, 'event_name').sort((a, b) => summitYear(a.name) - summitYear(b.name) || a.name.localeCompare(b.name));
  // Major ports are organisation category 1 (as in the GMIS reports); everything else,
  // including MoUs without an organisation, counts as "other".
  const majorPorts = new Set(orgRows.filter((r) => r.is_major_port).map((r) => r.organisation_name));
  const byOrganisation = group(orgRows, 'organisation_name').map((o) => ({ ...o, isMajorPort: majorPorts.has(o.name) })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    stages: STAGES,
    kpis,
    byCategory,
    bySummit,
    byOrganisation,
    lastUpdated: summary?.last_updated || null,
  };
}

// GET /get-gmis-mou-summits: summit names for the dashboard filter (within the caller's scope).
async function getGmisMouSummits(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    let scopeSql = '';
    if (!isWide) {
      if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) scopeSql = 'AND 1 = 0';
      else {
        scopeSql = 'AND organisation_id = @scopeOrgId';
        request.input('scopeOrgId', sql.Int, organisationId);
      }
    }
    const rows = (await request.query(`
      SELECT DISTINCT LTRIM(RTRIM(event_name)) AS name FROM tbl_gmis_mou
      WHERE NULLIF(LTRIM(RTRIM(event_name)), '') IS NOT NULL ${scopeSql};
    `)).recordset.map((r) => r.name);
    // Newest summit first; names without a year (e.g. "MoU Signing") go last.
    const year = (n) => Number((String(n).match(/(\d{4})/) || [])[1]) || 0;
    res.json(rows.sort((a, b) => year(b) - year(a) || a.localeCompare(b)));
  } catch (err) {
    console.error('getGmisMouSummits error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default { getGmisMouDashboard, getGmisMouSummits };
