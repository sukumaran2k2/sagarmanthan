import sql from 'mssql';
import { pool } from '../../db.js';
import { getDataScope, MOPSW_ORGANISATION_ID } from '../../middleware/dataScope.js';

// MIV 2030 dashboard. Every row of tbl_initiative is one initiative an organisation reports
// under an MIV initiative number (initiative_id, e.g. 3.3, shared by many organisations) and a
// theme (mmt_theme_initiative). All counts and costs here are of those rows, so every card,
// chart and table adds up to the same total. Costs are in ₹ crore.
// A project's cost is often entered on every activity of the initiative (e.g. Vadhavan: the
// same amount on 3-5 activities). An amount repeated within one organisation's MIV initiative
// is counted once and shared equally across those activities (decided 12-Nov-2026), so totals
// are not multiplied; 2.0 and the MIV reports add the rows as entered.

// Current status, in the order shown; colours are set on the page.
const STATUSES = [
  { key: 'completed', label: 'Completed', value: 'Completed' },
  { key: 'onTime', label: 'Under Implementation - On Time', value: 'Under Implementation - On Time' },
  { key: 'delayed', label: 'Under Implementation - Delayed', value: 'Under Implementation - Delayed' },
  { key: 'yetToStart', label: 'Yet to be Started', value: 'Yet to be Started' },
  { key: 'dropped', label: 'Dropped', value: 'Dropped' },
  { key: 'notApplicable', label: 'Not Applicable', value: 'Not Applicable' },
];
const STATUS_SQL = `CASE LTRIM(RTRIM(t.status_current))
  ${STATUSES.map((s) => `WHEN N'${s.value}' THEN '${s.key}'`).join('\n  ')}
  ELSE 'notRecorded' END`;

// Rounded to 2 decimals (₹ crore)
const crore = (v) => Math.round((Number(v) || 0) * 100) / 100;
const share = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const emptyStatuses = () => Object.fromEntries([...STATUSES.map((s) => s.key), 'notRecorded'].map((k) => [k, { count: 0, value: 0 }]));
// "call of action" -> "Call Of Action" (categories are stored in lower case)
const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

// GET /get-miv-dashboard?themeId=&organisationId=
async function getMivDashboard(req, res) {
  try {
    const request = (await pool).request();
    const where = ['1 = 1'];

    // Ministry / master users, and MoPSW's own staff with an organisation-level role, see every
    // organisation; other organisations' users only their own.
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    const orgView = !isWide && organisationId !== MOPSW_ORGANISATION_ID;
    if (orgView) {
      if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) {
        where.push('1 = 0');
      } else {
        where.push('t.organisation_id = @scopeOrgId');
        request.input('scopeOrgId', sql.Int, organisationId);
      }
    } else {
      const orgId = parseInt(req.query.organisationId, 10);
      if (orgId > 0) {
        where.push('t.organisation_id = @orgId');
        request.input('orgId', sql.Int, orgId);
      }
    }
    const themeId = parseInt(req.query.themeId, 10);
    if (themeId > 0) {
      where.push('t.theme_Initiative = @themeId');
      request.input('themeId', sql.Int, themeId);
    }
    const meetingOrgWhere = where.filter((w) => w.includes('organisation_id') || w === '1 = 0').join(' AND ') || '1 = 1';

    const result = await request.query(`
      DECLARE @today DATE = CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS DATE);
      IF OBJECT_ID('tempdb..#miv') IS NOT NULL DROP TABLE #miv;
      SELECT t.ID, t.initiative_id, t.organisation_id, t.theme_Initiative AS theme_id,
             LTRIM(RTRIM(t.initiative_name)) AS initiative_name,
             LOWER(LTRIM(RTRIM(ISNULL(NULLIF(t.category, ''), 'not specified')))) AS category,
             ${STATUS_SQL} AS status,
             CAST(ISNULL(t.total_cost, 0) AS FLOAT)
               / COUNT(*) OVER (PARTITION BY t.organisation_id, t.initiative_id, ISNULL(t.total_cost, 0)) AS cost,
             CAST(ISNULL(t.total_cost, 0) AS FLOAT) AS entered_cost,
             COUNT(*) OVER (PARTITION BY t.organisation_id, t.initiative_id, ISNULL(t.total_cost, 0)) AS cost_shared_by,
             TRY_CONVERT(date, t.completion_date) AS target_date,
             TRY_CONVERT(date, t.actual_date) AS actual_date,
             COALESCE(t.updated_date, t.created_date) AS last_change
      INTO #miv
      FROM tbl_initiative t
      WHERE ${where.join(' AND ')};

      -- 0: status totals, with how many are past their target date / completed after it
      SELECT status, COUNT(*) AS n, SUM(cost) AS amt,
             SUM(CASE WHEN status IN ('onTime', 'delayed', 'yetToStart') AND target_date < @today THEN 1 ELSE 0 END) AS target_passed,
             SUM(CASE WHEN status = 'completed' AND actual_date > target_date THEN 1 ELSE 0 END) AS completed_late
      FROM #miv GROUP BY status;
      -- 1: totals
      SELECT COUNT(*) AS n, SUM(cost) AS amt, COUNT(DISTINCT organisation_id) AS orgs,
             COUNT(DISTINCT initiative_id) AS initiative_numbers, MAX(last_change) AS last_change,
             SUM(entered_cost) AS entered_amt,
             SUM(CASE WHEN cost_shared_by > 1 AND entered_cost > 0 THEN 1 ELSE 0 END) AS shared_cost_rows
      FROM #miv;
      -- 2: theme x status
      SELECT m.theme_id, ISNULL(th.initiative_name, 'Theme not set') AS theme_name, m.status, COUNT(*) AS n, SUM(m.cost) AS amt
      FROM #miv m LEFT JOIN mmt_theme_initiative th ON th.theme_initiative_id = m.theme_id
      GROUP BY m.theme_id, th.initiative_name, m.status;
      -- 3: category
      SELECT category, COUNT(*) AS n, SUM(cost) AS amt FROM #miv GROUP BY category;
      -- 4: organisation x status
      SELECT m.organisation_id, o.organisation_name, CASE WHEN o.organisation_category_id = 1 THEN 1 ELSE 0 END AS is_major_port,
             m.status, COUNT(*) AS n, SUM(m.cost) AS amt
      FROM #miv m LEFT JOIN mmt_organisation o ON o.organisation_id = m.organisation_id
      GROUP BY m.organisation_id, o.organisation_name, o.organisation_category_id, m.status;
      -- 5: MVIC meetings per organisation (meetings have no theme)
      SELECT t.organisation_id, COUNT(*) AS n FROM tbl_meeting_document t WHERE ${meetingOrgWhere} GROUP BY t.organisation_id;
      -- 6: overdue: not finished and past the target date, longest first
      SELECT TOP 10 m.ID, m.initiative_id, m.initiative_name, o.organisation_name, th.initiative_name AS theme_name,
             m.status, m.target_date, DATEDIFF(day, m.target_date, @today) AS days_overdue
      FROM #miv m
      LEFT JOIN mmt_organisation o ON o.organisation_id = m.organisation_id
      LEFT JOIN mmt_theme_initiative th ON th.theme_initiative_id = m.theme_id
      WHERE m.status IN ('onTime', 'delayed', 'yetToStart') AND m.target_date < @today
      ORDER BY days_overdue DESC, m.ID;
      SELECT COUNT(*) AS n FROM #miv WHERE status IN ('onTime', 'delayed', 'yetToStart') AND target_date < @today;
      -- 8: filter options (themes; organisations that report MIV initiatives)
      SELECT theme_initiative_id AS id, initiative_name AS name FROM mmt_theme_initiative ORDER BY theme_initiative_id;
      SELECT DISTINCT o.organisation_id AS id, o.organisation_name AS name
      FROM tbl_initiative t JOIN mmt_organisation o ON o.organisation_id = t.organisation_id
      ${orgView ? 'WHERE 1 = 0' : ''} ORDER BY o.organisation_name;
      ${orgView ? 'SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @scopeOrgId;' : ''}
    `);
    const [statusRows, [totals], themeRows, categoryRows, orgRows, meetingRows, overdueRows, [overdueCount], themes, organisations, orgNameRows] = result.recordsets;

    const total = { count: totals.n || 0, value: crore(totals.amt) };
    const statuses = STATUSES.map((s) => {
      const r = statusRows.find((x) => x.status === s.key) || {};
      const count = r.n || 0;
      const value = crore(r.amt);
      return {
        key: s.key, label: s.label, count, value,
        countShare: share(count, total.count), valueShare: share(value, total.value),
        targetPassed: r.target_passed || 0, completedLate: r.completed_late || 0,
      };
    });
    const notRecorded = statusRows.find((x) => x.status === 'notRecorded')?.n || 0;

    const group = (rows, keyOf, init) => {
      const map = new Map();
      rows.forEach((r) => {
        const k = keyOf(r);
        if (!map.has(k)) map.set(k, { ...init(r), count: 0, value: 0, statuses: emptyStatuses() });
        const g = map.get(k);
        g.count += r.n; g.value += r.amt || 0;
        g.statuses[r.status].count += r.n; g.statuses[r.status].value += r.amt || 0;
      });
      return [...map.values()].map((g) => ({
        ...g, value: crore(g.value),
        statuses: Object.fromEntries(Object.entries(g.statuses).map(([k, v]) => [k, { count: v.count, value: crore(v.value) }])),
      }));
    };
    const meetingsByOrg = new Map(meetingRows.map((r) => [r.organisation_id, r.n]));

    res.json({
      view: orgView
        ? { level: 'organisation', organisationName: orgNameRows?.[0]?.organisation_name || null }
        : { level: 'all' },
      statuses: STATUSES.map(({ key, label }) => ({ key, label })),
      kpis: {
        total: {
          ...total,
          organisations: totals.orgs || 0,
          initiativeNumbers: totals.initiative_numbers || 0,
          meetings: meetingRows.reduce((s, r) => s + r.n, 0),
          overdue: overdueCount.n || 0,
          notRecorded,
          // cost as entered (every row added) and how many rows share a repeated amount
          enteredValue: crore(totals.entered_amt),
          sharedCostRows: totals.shared_cost_rows || 0,
        },
        statuses,
      },
      byTheme: group(themeRows, (r) => r.theme_id ?? 0, (r) => ({ id: r.theme_id, name: r.theme_name }))
        .sort((a, b) => (a.id ?? 99) - (b.id ?? 99)),
      byCategory: categoryRows.map((r) => ({ category: titleCase(r.category), count: r.n, value: crore(r.amt) })),
      byOrganisation: group(orgRows, (r) => r.organisation_id, (r) => ({ id: r.organisation_id, name: r.organisation_name || 'Not specified', isMajorPort: !!r.is_major_port }))
        .map((o) => ({ ...o, meetings: meetingsByOrg.get(o.id) || 0 }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      overdue: overdueRows.map((r) => ({
        id: r.ID, number: r.initiative_id, name: r.initiative_name, organisation: r.organisation_name, theme: r.theme_name,
        status: STATUSES.find((s) => s.key === r.status)?.label || r.status, targetDate: r.target_date, daysOverdue: r.days_overdue,
      })),
      filters: { themes, organisations },
      lastUpdated: totals.last_change || null,
    });
  } catch (err) {
    console.error('getMivDashboard error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default { getMivDashboard };
