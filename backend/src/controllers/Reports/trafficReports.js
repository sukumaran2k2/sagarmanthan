import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';

async function getTotalTrafficReport_k_1_1_1(req, res) {
  const conn = await pool;
  try {
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = currentDate.getFullYear();

    let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

    let currentFiscalYear = (currentMonth > 3)
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    let lastFiscalYear = (currentMonth > 3)
      ? `${currentYear - 1}-${currentYear}`
      : `${currentYear - 2}-${currentYear - 1}`;

    const selectedFiscalYear = req.query.financialYear;
    const selectedMonth = parseInt(req.query.month);
    if (selectedFiscalYear && !isNaN(selectedMonth)) {
      const [fyStart] = selectedFiscalYear.split('-').map(Number);
      prevMonth = selectedMonth;
      currentFiscalYear = selectedFiscalYear;
      lastFiscalYear = `${fyStart - 1}-${fyStart}`;
    }

    const query = `
      DECLARE @currentFiscalYear NVARCHAR(9) = '${currentFiscalYear}';
      DECLARE @lastFiscalYear NVARCHAR(9) = '${lastFiscalYear}';
      DECLARE @prevMonth INT = ${prevMonth};

      DECLARE @prevPrevMonth INT = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END;

      WITH Base AS (
        SELECT
          cd.organisation_id,
          cd.fiscal_year,
          cd.month,
          SUM(cd.value) / 1000.0 AS qty
        FROM tbl_traffic_commodity_data cd
        WHERE cd.commodity_id <> 28
        GROUP BY cd.organisation_id, cd.fiscal_year, cd.month
      ),
      -- Last FY splits
      LastFY AS (
        SELECT
          organisation_id,
          -- Z1
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month <= @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month >= 4 AND month <= @prevMonth) THEN qty ELSE 0 END),0)
          END AS lastFiscalZ1,
           -- X1
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month < @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month >= 4 AND month < @prevMonth) THEN qty ELSE 0 END),0)
          END AS lastFiscalX1,
          -- Y1
          NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND month = @prevMonth THEN qty ELSE 0 END),0) AS lastFiscalY1,
          
          NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN qty ELSE 0 END),0) AS lastFiscalYearTotal
        FROM Base
        GROUP BY organisation_id
      ),
      -- Current FY splits
      CurrFY AS (
        SELECT
          organisation_id,
          -- Z2
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month <= @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month >= 4 AND month <= @prevMonth) THEN qty ELSE 0 END),0)
          END AS currentFiscalZ2,
          -- X2
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month < @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month >= 4 AND month < @prevMonth) THEN qty ELSE 0 END),0)
          END AS currentFiscalX2,
          -- Y2
          NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND month = @prevMonth THEN qty ELSE 0 END),0) AS currentFiscalY2,
          NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND month = @prevPrevMonth THEN qty ELSE 0 END),0) AS currentFiscalY3
        FROM Base
        GROUP BY organisation_id
      ),
      Targets AS (
        SELECT
          t.organisation_id,
          NULLIF(t.fiscal_year_target,0) AS currentFiscalYearTarget
        FROM tbl_traffic_fiscal_target t
        WHERE t.financial_year = @currentFiscalYear
      ),
      Orgs AS (
        SELECT organisation_id, organisation_name AS port
        FROM mmt_organisation
      ),
      FinalData AS (
        SELECT
          o.organisation_id,
          o.port,
          l.lastFiscalYearTotal AS lastFiscalYear,
          t.currentFiscalYearTarget,
          l.lastFiscalX1, l.lastFiscalY1, l.lastFiscalZ1,
          c.currentFiscalX2, c.currentFiscalY2, c.currentFiscalZ2,
          CASE 
            WHEN c.currentFiscalY3 > 0 AND c.currentFiscalY2 IS NOT NULL
            THEN ((c.currentFiscalY2 * 1.0) / c.currentFiscalY3 - 1) * 100
            ELSE NULL
          END AS momGrowth,
          CASE 
            WHEN l.lastFiscalZ1 > 0 AND c.currentFiscalZ2 IS NOT NULL
            THEN ((c.currentFiscalZ2 * 1.0) / l.lastFiscalZ1 - 1) * 100
            ELSE NULL
          END AS yoyGrowth,
          CASE 
            WHEN t.currentFiscalYearTarget > 0 AND c.currentFiscalZ2 IS NOT NULL
            THEN (c.currentFiscalZ2 * 100.0 / t.currentFiscalYearTarget)
            ELSE NULL
          END AS achievement,
          CASE WHEN o.organisation_id IN (54,55) THEN 1 ELSE 0 END AS is_smpa_port
        FROM Orgs o
        LEFT JOIN LastFY l ON o.organisation_id = l.organisation_id
        LEFT JOIN CurrFY c ON o.organisation_id = c.organisation_id
        LEFT JOIN Targets t ON o.organisation_id = t.organisation_id
        WHERE (l.organisation_id IS NOT NULL OR c.organisation_id IS NOT NULL OR t.organisation_id IS NOT NULL)
      ),
      -- Totals for ALL ports
      TotalData AS (
        SELECT
          'Total' AS port,
          NULLIF(SUM(l.lastFiscalX1),0) AS totalLastFiscalX1,
          NULLIF(SUM(l.lastFiscalY1),0) AS totalLastFiscalY1,
          NULLIF(SUM(l.lastFiscalZ1),0) AS totalLastFiscalZ1,
          NULLIF(SUM(c.currentFiscalX2),0) AS totalCurrentFiscalX2,
          NULLIF(SUM(c.currentFiscalY2),0) AS totalCurrentFiscalY2,
          NULLIF(SUM(c.currentFiscalZ2),0) AS totalCurrentFiscalZ2,
          NULLIF(SUM(l.lastFiscalYearTotal),0) AS totalLastFiscalYear,
          
          NULLIF(SUM(t.currentFiscalYearTarget),0) AS totalCurrentFiscalYearTarget,
          NULLIF(SUM(c.currentFiscalY3),0) AS totalCurrentFiscalY3
        FROM LastFY l
        FULL JOIN CurrFY c ON c.organisation_id = l.organisation_id
        FULL JOIN Targets t ON t.organisation_id = COALESCE(l.organisation_id, c.organisation_id)
      ),
      -- Totals for SMPA ports only (54,55)
      SMPATotalData AS (
        SELECT
          'Total SMPA' AS port,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalX1 END),0) AS smpaLastFiscalX1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalY1 END),0) AS smpaLastFiscalY1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalZ1 END),0) AS smpaLastFiscalZ1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalX2 END),0) AS smpaCurrentFiscalX2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalY2 END),0) AS smpaCurrentFiscalY2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalZ2 END),0) AS smpaCurrentFiscalZ2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalYearTotal END),0) AS smpaLastFiscalYear,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN t.currentFiscalYearTarget END),0) AS smpaCurrentFiscalYearTarget,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalY3 END),0) AS smpaCurrentFiscalY3
        FROM Orgs o
        LEFT JOIN LastFY l ON o.organisation_id = l.organisation_id
        LEFT JOIN CurrFY c ON o.organisation_id = c.organisation_id
        LEFT JOIN Targets t ON o.organisation_id = t.organisation_id
      )

      SELECT * FROM (
        -- per port rows
        SELECT
          f.*,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          -- computed total growths (same expressions as TRT style)
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          0 AS sort_order
        FROM FinalData f
        CROSS JOIN TotalData td
        CROSS JOIN SMPATotalData s

        UNION ALL

        -- SMPA Total row
        SELECT
          NULL AS organisation_id,
          s.port AS port,
          s.smpaLastFiscalYear AS lastFiscalYear,
          s.smpaCurrentFiscalYearTarget AS currentFiscalYearTarget,
          s.smpaLastFiscalX1 AS lastFiscalX1, s.smpaLastFiscalY1 AS lastFiscalY1, s.smpaLastFiscalZ1 AS lastFiscalZ1,
          s.smpaCurrentFiscalX2 AS currentFiscalX2, s.smpaCurrentFiscalY2 AS currentFiscalY2, s.smpaCurrentFiscalZ2 AS currentFiscalZ2,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS achievement,
          2 AS is_smpa_port,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          2 AS sort_order
        FROM TotalData td
        CROSS JOIN SMPATotalData s

        UNION ALL

        -- Main Total row
        SELECT
          NULL AS organisation_id,
          td.port AS port,
          td.totalLastFiscalYear AS lastFiscalYear,
          td.totalCurrentFiscalYearTarget AS currentFiscalYearTarget,
          td.totalLastFiscalX1 AS lastFiscalX1, td.totalLastFiscalY1 AS lastFiscalY1, td.totalLastFiscalZ1 AS lastFiscalZ1,
          td.totalCurrentFiscalX2 AS currentFiscalX2, td.totalCurrentFiscalY2 AS currentFiscalY2, td.totalCurrentFiscalZ2 AS currentFiscalZ2,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowth,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowth,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS achievement,
          3 AS is_smpa_port,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          4 AS sort_order
        FROM TotalData td
        CROSS JOIN SMPATotalData s
      ) x
      ORDER BY
        CASE WHEN sort_order = 0 THEN 0 WHEN sort_order = 2 THEN 1 ELSE 2 END,
        port;
    `;

    const result = await conn.query(query);
    const rowData = result.recordset;

    return res.json({
      rowData,
      totalLastFiscalX1: rowData[0]?.totalLastFiscalX1 ?? null,
      totalLastFiscalY1: rowData[0]?.totalLastFiscalY1 ?? null,
      totalLastFiscalZ1: rowData[0]?.totalLastFiscalZ1 ?? null,
      totalCurrentFiscalX2: rowData[0]?.totalCurrentFiscalX2 ?? null,
      totalCurrentFiscalY2: rowData[0]?.totalCurrentFiscalY2 ?? null,
      totalCurrentFiscalZ2: rowData[0]?.totalCurrentFiscalZ2 ?? null,
      totalLastFiscalYear: rowData[0]?.totalLastFiscalYear ?? null,
      totalCurrentFiscalYearTarget: rowData[0]?.totalCurrentFiscalYearTarget ?? null,
      momGrowthTotal: rowData[0]?.momGrowthTotal ?? null,
      yoyGrowthTotal: rowData[0]?.yoyGrowthTotal ?? null,
      totalAchievement: rowData[0]?.totalAchievement ?? null,
      smpaLastFiscalX1: rowData[0]?.smpaLastFiscalX1 ?? null,
      smpaLastFiscalY1: rowData[0]?.smpaLastFiscalY1 ?? null,
      smpaLastFiscalZ1: rowData[0]?.smpaLastFiscalZ1 ?? null,
      smpaCurrentFiscalX2: rowData[0]?.smpaCurrentFiscalX2 ?? null,
      smpaCurrentFiscalY2: rowData[0]?.smpaCurrentFiscalY2 ?? null,
      smpaCurrentFiscalZ2: rowData[0]?.smpaCurrentFiscalZ2 ?? null,
      smpaLastFiscalYear: rowData[0]?.smpaLastFiscalYear ?? null,
      smpaCurrentFiscalYearTarget: rowData[0]?.smpaCurrentFiscalYearTarget ?? null,
      smpaMomGrowth: rowData[0]?.smpaMomGrowth ?? null,
      smpaYoyGrowth: rowData[0]?.smpaYoyGrowth ?? null,
      smpaAchievement: rowData[0]?.smpaAchievement ?? null
    });

  } catch (error) {
    console.error("Error fetching Traffic Port Performance report:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


async function getContainerTrafficReport_k_1_1_1_a(req, res) {
  const conn = await pool;
  try {
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = currentDate.getFullYear();
    let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

    let currentFiscalYear = (currentMonth > 3)
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    let lastFiscalYear = (currentMonth > 3)
      ? `${currentYear - 1}-${currentYear}`
      : `${currentYear - 2}-${currentYear - 1}`;

    const selectedFiscalYear = req.query.financialYear;
    const selectedMonth = parseInt(req.query.month);
    if (selectedFiscalYear && !isNaN(selectedMonth)) {
      const [fyStart] = selectedFiscalYear.split('-').map(Number);
      prevMonth = selectedMonth;
      currentFiscalYear = selectedFiscalYear;
      lastFiscalYear = `${fyStart - 1}-${fyStart}`;
    }

    const query = `
      DECLARE @currentFiscalYear NVARCHAR(9) = '${currentFiscalYear}';
      DECLARE @lastFiscalYear NVARCHAR(9) = '${lastFiscalYear}';
      DECLARE @prevMonth INT = ${prevMonth};
      DECLARE @prevPrevMonth INT = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END;

      WITH Base AS (
        SELECT
          cd.organisation_id,
          cd.fiscal_year,
          cd.month,
          SUM(cd.value) / 1000.0 AS qty
        FROM tbl_traffic_commodity_data cd
        WHERE cd.commodity_id = 28
        GROUP BY cd.organisation_id, cd.fiscal_year, cd.month
      ),
      -- Last FY splits
      LastFY AS (
        SELECT
          organisation_id,
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month <= @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month >= 4 AND month <= @prevMonth) THEN qty ELSE 0 END),0)
          END AS lastFiscalZ1,
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month < @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND (month >= 4 AND month < @prevMonth) THEN qty ELSE 0 END),0)
          END AS lastFiscalX1,
          NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear AND month = @prevMonth THEN qty ELSE 0 END),0) AS lastFiscalY1,
          NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN qty ELSE 0 END),0) AS lastFiscalYearTotal
        FROM Base
        GROUP BY organisation_id
      ),
      -- Current FY splits
      CurrFY AS (
        SELECT
          organisation_id,
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month <= @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month >= 4 AND month <= @prevMonth) THEN qty ELSE 0 END),0)
          END AS currentFiscalZ2,
          CASE 
            WHEN @prevMonth <= 3 THEN
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month < @prevMonth OR month >= 4) THEN qty ELSE 0 END),0)
            ELSE
              NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND (month >= 4 AND month < @prevMonth) THEN qty ELSE 0 END),0)
          END AS currentFiscalX2,
          NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND month = @prevMonth THEN qty ELSE 0 END),0) AS currentFiscalY2,
          NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear AND month = @prevPrevMonth THEN qty ELSE 0 END),0) AS currentFiscalY3
        FROM Base
        GROUP BY organisation_id
      ),
      Targets AS (
        SELECT
          t.organisation_id,
          NULLIF(t.fiscal_year_target,0) AS currentFiscalYearTarget
        FROM tbl_traffic_fiscal_target t
        WHERE t.financial_year = @currentFiscalYear
          -- If you keep TEU targets in a different table/flag, change here accordingly.
      ),
      Orgs AS (
        SELECT organisation_id, organisation_name AS port
        FROM mmt_organisation
      ),
      FinalData AS (
        SELECT
          o.organisation_id,
          o.port,
          l.lastFiscalYearTotal AS lastFiscalYear,
          t.currentFiscalYearTarget,
          l.lastFiscalX1, l.lastFiscalY1, l.lastFiscalZ1,
          c.currentFiscalX2, c.currentFiscalY2, c.currentFiscalZ2,
          CASE 
            WHEN c.currentFiscalY3 > 0 AND c.currentFiscalY2 IS NOT NULL
            THEN ((c.currentFiscalY2 * 1.0) / c.currentFiscalY3 - 1) * 100
            ELSE NULL
          END AS momGrowth,
          CASE 
            WHEN l.lastFiscalZ1 > 0 AND c.currentFiscalZ2 IS NOT NULL
            THEN ((c.currentFiscalZ2 * 1.0) / l.lastFiscalZ1 - 1) * 100
            ELSE NULL
          END AS yoyGrowth,
          CASE 
            WHEN t.currentFiscalYearTarget > 0 AND c.currentFiscalZ2 IS NOT NULL
            THEN (c.currentFiscalZ2 * 100.0 / t.currentFiscalYearTarget)
            ELSE NULL
          END AS achievement,
          CASE WHEN o.organisation_id IN (54,55) THEN 1 ELSE 0 END AS is_smpa_port
        FROM Orgs o
        LEFT JOIN LastFY l ON o.organisation_id = l.organisation_id
        LEFT JOIN CurrFY c ON o.organisation_id = c.organisation_id
        LEFT JOIN Targets t ON o.organisation_id = t.organisation_id
        WHERE (l.organisation_id IS NOT NULL OR c.organisation_id IS NOT NULL OR t.organisation_id IS NOT NULL)
      ),
      -- Totals for ALL ports (TEUs only)
      TotalData AS (
        SELECT
          'Total' AS port,
          NULLIF(SUM(l.lastFiscalX1),0) AS totalLastFiscalX1,
          NULLIF(SUM(l.lastFiscalY1),0) AS totalLastFiscalY1,
          NULLIF(SUM(l.lastFiscalZ1),0) AS totalLastFiscalZ1,
          NULLIF(SUM(c.currentFiscalX2),0) AS totalCurrentFiscalX2,
          NULLIF(SUM(c.currentFiscalY2),0) AS totalCurrentFiscalY2,
          NULLIF(SUM(c.currentFiscalZ2),0) AS totalCurrentFiscalZ2,
          NULLIF(SUM(l.lastFiscalYearTotal),0) AS totalLastFiscalYear,
          NULLIF(SUM(t.currentFiscalYearTarget),0) AS totalCurrentFiscalYearTarget,
          NULLIF(SUM(c.currentFiscalY3),0) AS totalCurrentFiscalY3
        FROM LastFY l
        FULL JOIN CurrFY c ON c.organisation_id = l.organisation_id
        FULL JOIN Targets t ON t.organisation_id = COALESCE(l.organisation_id, c.organisation_id)
      ),
      -- Totals for SMPA ports only (54,55)
      SMPATotalData AS (
        SELECT
          'Total SMPA' AS port,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalX1 END),0) AS smpaLastFiscalX1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalY1 END),0) AS smpaLastFiscalY1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalZ1 END),0) AS smpaLastFiscalZ1,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalX2 END),0) AS smpaCurrentFiscalX2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalY2 END),0) AS smpaCurrentFiscalY2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalZ2 END),0) AS smpaCurrentFiscalZ2,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN l.lastFiscalYearTotal END),0) AS smpaLastFiscalYear,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN t.currentFiscalYearTarget END),0) AS smpaCurrentFiscalYearTarget,
          NULLIF(SUM(CASE WHEN o.organisation_id IN (54,55) THEN c.currentFiscalY3 END),0) AS smpaCurrentFiscalY3
        FROM Orgs o
        LEFT JOIN LastFY l ON o.organisation_id = l.organisation_id
        LEFT JOIN CurrFY c ON o.organisation_id = c.organisation_id
        LEFT JOIN Targets t ON o.organisation_id = t.organisation_id
      )

      SELECT * FROM (
        SELECT
          f.*,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          0 AS sort_order
        FROM FinalData f
        CROSS JOIN TotalData td
        CROSS JOIN SMPATotalData s

        UNION ALL

        -- SMPA Total row
        SELECT
          NULL AS organisation_id,
          s.port AS port,
          s.smpaLastFiscalYear AS lastFiscalYear,
          s.smpaCurrentFiscalYearTarget AS currentFiscalYearTarget,
          s.smpaLastFiscalX1 AS lastFiscalX1, s.smpaLastFiscalY1 AS lastFiscalY1, s.smpaLastFiscalZ1 AS lastFiscalZ1,
          s.smpaCurrentFiscalX2 AS currentFiscalX2, s.smpaCurrentFiscalY2 AS currentFiscalY2, s.smpaCurrentFiscalZ2 AS currentFiscalZ2,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS achievement,
          2 AS is_smpa_port,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          2 AS sort_order
        FROM TotalData td
        CROSS JOIN SMPATotalData s

        UNION ALL

        -- Main Total row
        SELECT
          NULL AS organisation_id,
          td.port AS port,
          td.totalLastFiscalYear AS lastFiscalYear,
          td.totalCurrentFiscalYearTarget AS currentFiscalYearTarget,
          td.totalLastFiscalX1 AS lastFiscalX1, td.totalLastFiscalY1 AS lastFiscalY1, td.totalLastFiscalZ1 AS lastFiscalZ1,
          td.totalCurrentFiscalX2 AS currentFiscalX2, td.totalCurrentFiscalY2 AS currentFiscalY2, td.totalCurrentFiscalZ2 AS currentFiscalZ2,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowth,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowth,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS achievement,
          3 AS is_smpa_port,
          td.totalLastFiscalX1, td.totalLastFiscalY1, td.totalLastFiscalZ1,
          td.totalCurrentFiscalX2, td.totalCurrentFiscalY2, td.totalCurrentFiscalZ2,
          td.totalLastFiscalYear, td.totalCurrentFiscalYearTarget, td.totalCurrentFiscalY3,
          s.smpaLastFiscalX1, s.smpaLastFiscalY1, s.smpaLastFiscalZ1,
          s.smpaCurrentFiscalX2, s.smpaCurrentFiscalY2, s.smpaCurrentFiscalZ2,
          s.smpaLastFiscalYear, s.smpaCurrentFiscalYearTarget, s.smpaCurrentFiscalY3,
          CASE WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100 ELSE NULL END AS momGrowthTotal,
          CASE WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100 ELSE NULL END AS yoyGrowthTotal,
          CASE WHEN td.totalCurrentFiscalYearTarget > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN (td.totalCurrentFiscalZ2 * 100.0 / td.totalCurrentFiscalYearTarget) ELSE NULL END AS totalAchievement,
          CASE WHEN s.smpaCurrentFiscalY3 > 0 AND s.smpaCurrentFiscalY2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalY2 * 1.0) / s.smpaCurrentFiscalY3 - 1) * 100 ELSE NULL END AS smpaMomGrowth,
          CASE WHEN s.smpaLastFiscalZ1 > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN ((s.smpaCurrentFiscalZ2 * 1.0) / s.smpaLastFiscalZ1 - 1) * 100 ELSE NULL END AS smpaYoyGrowth,
          CASE WHEN s.smpaCurrentFiscalYearTarget > 0 AND s.smpaCurrentFiscalZ2 IS NOT NULL
            THEN (s.smpaCurrentFiscalZ2 * 100.0 / s.smpaCurrentFiscalYearTarget) ELSE NULL END AS smpaAchievement,
          4 AS sort_order
        FROM TotalData td
        CROSS JOIN SMPATotalData s
      ) x
      ORDER BY
        CASE WHEN sort_order = 0 THEN 0 WHEN sort_order = 2 THEN 1 ELSE 2 END,
        port;
    `;

    const result = await conn.query(query);
    const rowData = result.recordset;

    return res.json({
      rowData,
      totalLastFiscalX1: rowData[0]?.totalLastFiscalX1 ?? null,
      totalLastFiscalY1: rowData[0]?.totalLastFiscalY1 ?? null,
      totalLastFiscalZ1: rowData[0]?.totalLastFiscalZ1 ?? null,
      totalCurrentFiscalX2: rowData[0]?.totalCurrentFiscalX2 ?? null,
      totalCurrentFiscalY2: rowData[0]?.totalCurrentFiscalY2 ?? null,
      totalCurrentFiscalZ2: rowData[0]?.totalCurrentFiscalZ2 ?? null,
      totalLastFiscalYear: rowData[0]?.totalLastFiscalYear ?? null,
      totalCurrentFiscalYearTarget: rowData[0]?.totalCurrentFiscalYearTarget ?? null,
      momGrowthTotal: rowData[0]?.momGrowthTotal ?? null,
      yoyGrowthTotal: rowData[0]?.yoyGrowthTotal ?? null,
      totalAchievement: rowData[0]?.totalAchievement ?? null,
      smpaLastFiscalX1: rowData[0]?.smpaLastFiscalX1 ?? null,
      smpaLastFiscalY1: rowData[0]?.smpaLastFiscalY1 ?? null,
      smpaLastFiscalZ1: rowData[0]?.smpaLastFiscalZ1 ?? null,
      smpaCurrentFiscalX2: rowData[0]?.smpaCurrentFiscalX2 ?? null,
      smpaCurrentFiscalY2: rowData[0]?.smpaCurrentFiscalY2 ?? null,
      smpaCurrentFiscalZ2: rowData[0]?.smpaCurrentFiscalZ2 ?? null,
      smpaLastFiscalYear: rowData[0]?.smpaLastFiscalYear ?? null,
      smpaCurrentFiscalYearTarget: rowData[0]?.smpaCurrentFiscalYearTarget ?? null,
      smpaMomGrowth: rowData[0]?.smpaMomGrowth ?? null,
      smpaYoyGrowth: rowData[0]?.smpaYoyGrowth ?? null,
      smpaAchievement: rowData[0]?.smpaAchievement ?? null
    });

  } catch (error) {
    console.error("Error fetching Container Traffic (TEUs) report:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

const TrafficReportTab = {
   getTotalTrafficReport_k_1_1_1, getContainerTrafficReport_k_1_1_1_a
};
export default TrafficReportTab;