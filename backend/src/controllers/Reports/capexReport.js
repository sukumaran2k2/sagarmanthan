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

export default { capexReportData, capexSummaryReportData };
