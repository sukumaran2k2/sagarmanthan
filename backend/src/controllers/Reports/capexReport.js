import { pool } from "../../db.js";
import { applyDataScope } from "../../middleware/dataScope.js";

const MONTHLY_TOTALS_JOIN = `
  LEFT JOIN (
    SELECT
      capex_id,
      SUM(CASE WHEN funding_type = 'GBS'  THEN ISNULL(amount, 0) ELSE 0 END) AS total_GBS,
      SUM(CASE WHEN funding_type = 'IEBR' THEN ISNULL(amount, 0) ELSE 0 END) AS total_IEBR,
      SUM(CASE WHEN funding_type = 'PPP'  THEN ISNULL(amount, 0) ELSE 0 END) AS total_PPP,
      SUM(ISNULL(amount, 0)) AS total_Capex,
      MAX(updated_date) AS updated_date
    FROM sagarmanthan_revamp.dbo.tbl_capex_monthly
    GROUP BY capex_id
  ) AS tbl_capex_monthly ON tbl_capex.capex_id = tbl_capex_monthly.capex_id
`;

const SUMMARY_ORG_CATEGORY_WHERE =
  "mmt_organisation.organisation_category_id IN (1, 3, 5, 6)";

function detailedReportSelectSql(categoryWhere) {
  return `
    SELECT
      mmt_organisation.organisation_id,
      tbl_capex.capex_id,
      tbl_capex.capex_financial_year,
      tbl_capex.capex_organisation_id,
      ISNULL(tbl_capex.capex_gbs_value, 0) AS capex_gbs_value,
      ISNULL(tbl_capex.capex_iebr_value, 0) AS capex_iebr_value,
      ISNULL(tbl_capex.capex_ppp_value, 0) AS capex_ppp_value,
      ISNULL(tbl_capex.capex_total_value, 0) AS capex_total_value,
      tbl_capex.updated_by,
      tbl_capex.updated_date,
      mmt_organisation.organisation_name,
      mmt_organisation.organisation_category_id,
      ISNULL(tbl_capex_monthly.total_GBS, 0) AS total_GBS,
      ISNULL(tbl_capex_monthly.total_IEBR, 0) AS total_IEBR,
      ISNULL(tbl_capex_monthly.total_PPP, 0) AS total_PPP,
      ISNULL(tbl_capex_monthly.total_Capex, 0) AS total_Capex,
      CASE
        WHEN ISNULL(tbl_capex.capex_iebr_value, 0) = 0 THEN 0
        ELSE ROUND(
          (ISNULL(tbl_capex_monthly.total_IEBR, 0) * 100.0)
          / ISNULL(tbl_capex.capex_iebr_value, 0),
          2
        )
      END AS exp_ir,
      CASE
        WHEN ISNULL(tbl_capex.capex_ppp_value, 0) = 0 THEN 0
        ELSE ROUND(
          (ISNULL(tbl_capex_monthly.total_PPP, 0) * 100.0)
          / ISNULL(tbl_capex.capex_ppp_value, 0),
          2
        )
      END AS exp_ppp,
      tbl_capex_monthly.updated_date AS monthly_updated_date
    FROM sagarmanthan_revamp.dbo.mmt_organisation
    LEFT JOIN sagarmanthan_revamp.dbo.tbl_capex
      ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id
     AND tbl_capex.capex_financial_year = @selectedYear
    ${MONTHLY_TOTALS_JOIN}
    WHERE ${categoryWhere}
    ORDER BY mmt_organisation.organisation_id
  `;
}

function summaryReportSelectSql(scopeWhereSql = "") {
  return `
    SELECT
      mmt_organisation.organisation_id,
      mmt_organisation.organisation_name,
      mmt_organisation.organisation_category_id,
      ISNULL(tbl_capex.capex_total_value, 0) AS be,
      ISNULL(tbl_capex_monthly.total_Capex, 0) AS exp,
      CASE
        WHEN ISNULL(tbl_capex.capex_total_value, 0) = 0 THEN 0
        ELSE ROUND(
          (ISNULL(tbl_capex_monthly.total_Capex, 0) * 100.0)
          / ISNULL(tbl_capex.capex_total_value, 0),
          2
        )
      END AS pct
    FROM sagarmanthan_revamp.dbo.mmt_organisation
    LEFT JOIN sagarmanthan_revamp.dbo.tbl_capex
      ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id
     AND tbl_capex.capex_financial_year = @selectedYear
    ${MONTHLY_TOTALS_JOIN}
    WHERE ${SUMMARY_ORG_CATEGORY_WHERE}
    ${scopeWhereSql}
    ORDER BY mmt_organisation.organisation_name
  `;
}

async function capexReportData(req, res) {
  const selectedYear = req.params.selectedYear;
  const conn = await pool;
  const request = conn.request();
  request.input("selectedYear", selectedYear);

  const { whereSql } = applyDataScope(request, req.user, {
    strategy: "directOrgColumn",
    alias: "mmt_organisation",
    orgColumn: "organisation_id",
  });

  try {
    const majorPortsQuery = await request.query(
      detailedReportSelectSql(
        `mmt_organisation.organisation_category_id = 1${whereSql}`
      )
    );
    const shippingsectorOrganisationsQuery = await request.query(
      detailedReportSelectSql(
        `mmt_organisation.organisation_category_id = 3${whereSql}`
      )
    );
    const otherOrganisations = await request.query(
      detailedReportSelectSql(
        `mmt_organisation.organisation_category_id IN (3,6,5)${whereSql}`
      )
    );

    res.json({
      majorPorts: majorPortsQuery.recordset,
      otherOrganisations: otherOrganisations.recordset,
      shippingsectorOrganisations: shippingsectorOrganisationsQuery.recordset,
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function capexSummaryReportData(req, res) {
  const selectedYear = req.params.selectedYear;
  const conn = await pool;
  const request = conn.request();
  request.input("selectedYear", selectedYear);

  const { whereSql } = applyDataScope(request, req.user, {
    strategy: "directOrgColumn",
    alias: "mmt_organisation",
    orgColumn: "organisation_id",
  });

  try {
    const result = await request.query(summaryReportSelectSql(whereSql));
    res.json({
      selectedYear,
      data: result.recordset || [],
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

const YOY_FY_START_YEAR = 2022;

function getIndianFinancialYearStart(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return month >= 3 ? year : year - 1;
}

function buildYoYFinancialYears(fromStartYear = YOY_FY_START_YEAR, asOf = new Date()) {
  const currentStart = getIndianFinancialYearStart(asOf);
  const years = [];
  for (let y = fromStartYear; y <= currentStart; y += 1) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}

function yoyFlatSelectSql(fyInClause, scopeWhereSql = "") {
  return `
    SELECT
      mmt_organisation.organisation_id,
      mmt_organisation.organisation_name,
      mmt_organisation.organisation_category_id,
      tbl_capex.capex_financial_year,
      ISNULL(tbl_capex.capex_total_value, 0) AS be,
      ISNULL(tbl_capex_monthly.total_Capex, 0) AS exp,
      CASE
        WHEN ISNULL(tbl_capex.capex_total_value, 0) = 0 THEN 0
        ELSE ROUND(
          (ISNULL(tbl_capex_monthly.total_Capex, 0) * 100.0)
          / ISNULL(tbl_capex.capex_total_value, 0),
          2
        )
      END AS pct
    FROM sagarmanthan_revamp.dbo.mmt_organisation
    LEFT JOIN sagarmanthan_revamp.dbo.tbl_capex
      ON mmt_organisation.organisation_id = tbl_capex.capex_organisation_id
     AND tbl_capex.capex_financial_year IN (${fyInClause})
    LEFT JOIN (
      SELECT
        capex_id,
        SUM(ISNULL(amount, 0)) AS total_Capex
      FROM sagarmanthan_revamp.dbo.tbl_capex_monthly
      GROUP BY capex_id
    ) AS tbl_capex_monthly ON tbl_capex.capex_id = tbl_capex_monthly.capex_id
    WHERE ${SUMMARY_ORG_CATEGORY_WHERE}
    ${scopeWhereSql}
    ORDER BY mmt_organisation.organisation_name, tbl_capex.capex_financial_year
  `;
}

function pivotYoYRows(flatRows, financialYears) {
  const byOrg = new Map();

  (flatRows || []).forEach((row) => {
    const orgId = row.organisation_id;
    const key = String(orgId ?? row.organisation_name);
    if (!byOrg.has(key)) {
      const years = {};
      financialYears.forEach((fy) => {
        years[fy] = { be: 0, exp: 0, pct: 0 };
      });
      byOrg.set(key, {
        organisation_id: orgId,
        organisation_name: row.organisation_name || "—",
        organisation_category_id: row.organisation_category_id,
        years,
      });
    }

    const entry = byOrg.get(key);
    const fy = row.capex_financial_year;
    if (fy && entry.years[fy]) {
      entry.years[fy] = {
        be: Number(row.be) || 0,
        exp: Number(row.exp) || 0,
        pct: Number(row.pct) || 0,
      };
    }
  });

  return Array.from(byOrg.values()).sort((a, b) =>
    String(a.organisation_name).localeCompare(String(b.organisation_name), "en")
  );
}

async function capexYoYReportData(req, res) {
  const financialYears = buildYoYFinancialYears();
  if (!financialYears.length) {
    return res.json({ financialYears: [], data: [] });
  }

  const conn = await pool;
  const request = conn.request();

  const fyParams = financialYears.map((fy, i) => {
    const name = `fy${i}`;
    request.input(name, fy);
    return `@${name}`;
  });

  const { whereSql } = applyDataScope(request, req.user, {
    strategy: "directOrgColumn",
    alias: "mmt_organisation",
    orgColumn: "organisation_id",
  });

  try {
    const result = await request.query(
      yoyFlatSelectSql(fyParams.join(", "), whereSql)
    );
    res.json({
      financialYears,
      data: pivotYoYRows(result.recordset, financialYears),
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

export default {
  capexReportData,
  capexSummaryReportData,
  capexYoYReportData,
};
