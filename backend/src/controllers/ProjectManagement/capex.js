import { pool } from "../../db.js";
import sql from "mssql";
import { applyDataScope } from "../../middleware/dataScope.js";

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bindCapexListFilters(request, query = {}) {
  const parts = [];
  const financialYear = String(query.financialYear || "").trim();
  const organisationId = String(query.organisationId || "").trim();
  const organisationName = String(query.organisationName || "").trim();
  const search = String(query.search || "").trim();

  if (financialYear) {
    request.input("financialYear", sql.NVarChar(50), financialYear);
    parts.push(" AND tbl_capex.capex_financial_year = @financialYear");
  }
  if (organisationId) {
    request.input("organisationId", sql.NVarChar(50), organisationId);
    parts.push(" AND CAST(tbl_capex.capex_organisation_id AS NVARCHAR(50)) = @organisationId");
  }
  if (organisationName) {
    request.input("organisationName", sql.NVarChar(255), organisationName);
    parts.push(" AND org.organisation_name = @organisationName");
  }
  if (search) {
    request.input("search", sql.NVarChar(255), `%${search}%`);
    parts.push(` AND (
      org.organisation_name LIKE @search
      OR tbl_capex.capex_financial_year LIKE @search
      OR CAST(tbl_capex.capex_total_value AS NVARCHAR(50)) LIKE @search
      OR CAST(COALESCE(monthly.total_Capex, 0) AS NVARCHAR(50)) LIKE @search
    )`);
  }
  return parts.join("");
}

const CAPEX_LIST_FROM_SQL = `
  FROM tbl_capex
  LEFT JOIN CapexMonthlyTotals AS monthly ON tbl_capex.capex_id = monthly.capex_id
  LEFT JOIN mmt_organisation AS org ON tbl_capex.capex_organisation_id = org.organisation_id
`;

const MONTH_SHORT = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

const MONTH_FULL = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const MONTHLY_TOTALS_CTE = `
  CapexMonthlyTotals AS (
    SELECT
      capex_id,
      SUM(CASE WHEN funding_type = 'GBS'  THEN ISNULL(amount, 0) ELSE 0 END) AS total_GBS,
      SUM(CASE WHEN funding_type = 'IEBR' THEN ISNULL(amount, 0) ELSE 0 END) AS total_IEBR,
      SUM(CASE WHEN funding_type = 'PPP'  THEN ISNULL(amount, 0) ELSE 0 END) AS total_PPP,
      SUM(ISNULL(amount, 0)) AS total_Capex,
      MAX(updated_date) AS updated_date
    FROM tbl_capex_monthly
    GROUP BY capex_id
  )
`;

function resolveUserId(req, fallback) {
  const raw = req.user?.userId ?? req.user?.user_id ?? fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeMonthlyEntry(row) {
  const monthNumber = Number(row.month_number);
  const weekNumber = Number(row.week_number);
  const fundingType = String(row.funding_type || "").toUpperCase();
  const amount = row.amount == null || row.amount === "" ? null : Number(row.amount);

  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(monthNumber)) return null;
  if (![1, 2, 3, 4].includes(weekNumber)) return null;
  if (!["GBS", "IEBR", "PPP"].includes(fundingType)) return null;
  if (amount == null || Number.isNaN(amount)) return null;

  return {
    month_number: monthNumber,
    week_number: weekNumber,
    funding_type: fundingType,
    amount,
  };
}

async function addCapex(req, res) {
  const userId = resolveUserId(req, req.body.userID);
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const gbsValue = req.body.gbsValue; 
    const iebrValue = req.body.iebrValue; 
    const PPPValue = req.body.PPPValue;
    const totalValue = req.body.totalValue; 

  if (!userId || !financialYear || !organisationId) {
    return res.status(400).json({ error: "Missing required fields." });
  }

    const conn = await pool;
    const request = conn.request();
    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("gbsValue", gbsValue);
    request.input("iebrValue", iebrValue);   
    request.input("PPPValue", PPPValue);
    request.input("totalValue", totalValue);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_capex
            WHERE capex_financial_year = @financialYear
            AND capex_organisation_id = @organisationId
        `);

        if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        error: "Record already exists for the specified financialYear and organisationId.",
      });
        }

    await request.query(`
            INSERT INTO tbl_capex (
                created_by,
                capex_financial_year,
                capex_organisation_id,
                capex_gbs_value,
                capex_iebr_value,
                capex_ppp_value,
                capex_total_value
            )
            VALUES (
                @userId,
                @financialYear,
                @organisationId,
                @gbsValue,
                @iebrValue,
                @PPPValue,
                @totalValue
            )
        `);

        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexData(req, res) {
    const conn = await pool;

  try {
    const fetchAll =
      String(req.query.all || "").toLowerCase() === "1" ||
      String(req.query.all || "").toLowerCase() === "true";
    const page = parsePositiveInt(req.query.page, 1, 1);
    const limit = fetchAll
      ? parsePositiveInt(req.query.limit, 2000, 1, 2000)
      : parsePositiveInt(req.query.limit, 10, 1, 100);
    const offset = (page - 1) * limit;

    const countRequest = conn.request();
    const pageRequest = conn.request();

    const { joinSql, whereSql } = applyDataScope(countRequest, req.user, {
      strategy: "directOrgColumn",
      alias: "tbl_capex",
      orgColumn: "capex_organisation_id",
    });
    applyDataScope(pageRequest, req.user, {
      strategy: "directOrgColumn",
      alias: "tbl_capex",
      orgColumn: "capex_organisation_id",
    });

    const filterSql = bindCapexListFilters(countRequest, req.query);
    bindCapexListFilters(pageRequest, req.query);

    pageRequest.input("offset", sql.Int, offset);
    pageRequest.input("limit", sql.Int, limit);

    const [countResult, pageResult] = await Promise.all([
      countRequest.query(`
        WITH ${MONTHLY_TOTALS_CTE}
        SELECT COUNT(*) AS total
        ${CAPEX_LIST_FROM_SQL}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
      `),
      pageRequest.query(`
        WITH ${MONTHLY_TOTALS_CTE}
        SELECT
            tbl_capex.*,
          COALESCE(monthly.total_Capex, 0) AS total_capex_expenditure,
          COALESCE(monthly.total_GBS, 0) AS total_GBS,
          COALESCE(monthly.total_IEBR, 0) AS total_IEBR,
          COALESCE(monthly.total_PPP, 0) AS total_PPP,
          org.organisation_name AS organisation_name
        ${CAPEX_LIST_FROM_SQL}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
        ORDER BY tbl_capex.capex_financial_year DESC, tbl_capex.capex_id DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
      `),
    ]);

    const total = Number(countResult.recordset?.[0]?.total) || 0;
    const rows = pageResult.recordset || [];

    res.json({
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexMonthlyData(req, res) {
  const capexID = req.params.capexID;
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", capexID);

  try {
    const result = await request.query(`
      SELECT
        id,
        capex_id,
        month_number,
        week_number,
        funding_type,
        amount,
        created_by,
        updated_by,
        created_date,
        updated_date
      FROM tbl_capex_monthly
        WHERE capex_id = @capexID
      ORDER BY
        CASE month_number
          WHEN 4 THEN 1 WHEN 5 THEN 2 WHEN 6 THEN 3 WHEN 7 THEN 4
          WHEN 8 THEN 5 WHEN 9 THEN 6 WHEN 10 THEN 7 WHEN 11 THEN 8
          WHEN 12 THEN 9 WHEN 1 THEN 10 WHEN 2 THEN 11 WHEN 3 THEN 12
          ELSE 0
        END,
        week_number,
        funding_type
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
}

async function addCapexMonthlyData(req, res) {
  const capexID = Number(req.body.capexID);
  const userId = resolveUserId(req, req.body.userID ?? req.body.userId);
  let entries = Array.isArray(req.body.entries) ? req.body.entries : [];

  if (!entries.length && req.body.capexID) {
    entries = legacyBodyToEntries(req.body);
  }

  if (!Number.isFinite(capexID) || capexID <= 0) {
    return res.status(400).json({ error: "Invalid capexID." });
  }
  if (!userId) {
    return res.status(400).json({ error: "Missing authenticated user." });
  }

  const newEntries = entries.map(normalizeMonthlyEntry).filter(Boolean);

  const conn = await pool;
  const transaction = conn.transaction();

  try {
    await transaction.begin();

    const prevReq = transaction.request();
    prevReq.input("capexID", sql.Int, capexID);
    const prevResult = await prevReq.query(`
      SELECT month_number, week_number, funding_type, amount
      FROM tbl_capex_monthly
      WHERE capex_id = @capexID
      ORDER BY month_number, week_number, funding_type
    `);
    const previousEntries = (prevResult.recordset || []).map((row) => ({
      month_number: Number(row.month_number),
      week_number: Number(row.week_number),
      funding_type: String(row.funding_type || "").toUpperCase(),
      amount: row.amount == null ? null : Number(row.amount),
    }));

    const targetSummary = `Capex #${capexID} — monthly save (${previousEntries.length} → ${newEntries.length} rows)`;
    const payloadJson = JSON.stringify({
      previous_entries: previousEntries,
      new_entries: newEntries,
    });

    const logReq = transaction.request();
    logReq.input("capexID", sql.Int, capexID);
    logReq.input("action", sql.NVarChar(50), "SAVE");
    logReq.input("createdBy", sql.Int, userId);
    logReq.input("targetSummary", sql.NVarChar(500), targetSummary);
    logReq.input("payloadJson", sql.NVarChar(sql.MAX), payloadJson);
    await logReq.query(`
      INSERT INTO dbo.tbl_capex_monthly_log
        (capex_id, action, created_by, target_summary, payload_json, created_date)
      VALUES
        (@capexID, @action, @createdBy, @targetSummary, @payloadJson, GETDATE())
    `);

    const delReq = transaction.request();
    delReq.input("capexID", sql.Int, capexID);
    await delReq.query(`DELETE FROM tbl_capex_monthly WHERE capex_id = @capexID`);

    for (const row of newEntries) {
      const ins = transaction.request();
      ins.input("capexID", sql.Int, capexID);
      ins.input("monthNumber", sql.Int, row.month_number);
      ins.input("weekNumber", sql.Int, row.week_number);
      ins.input("fundingType", sql.NVarChar(10), row.funding_type);
      ins.input("amount", sql.Decimal(18, 2), row.amount);
      ins.input("createdBy", sql.Int, userId);
      ins.input("updatedBy", sql.Int, userId);
      await ins.query(`
        INSERT INTO tbl_capex_monthly (
          capex_id, month_number, week_number, funding_type, amount,
          created_by, updated_by, created_date, updated_date
        )
        VALUES (
          @capexID, @monthNumber, @weekNumber, @fundingType, @amount,
          @createdBy, @updatedBy, GETDATE(), GETDATE()
        )
      `);
    }

    const touch = transaction.request();
    touch.input("capexID", sql.Int, capexID);
    touch.input("updatedBy", sql.Int, userId);
    await touch.query(`
      UPDATE tbl_capex
      SET updated_by = @updatedBy, updated_date = GETDATE()
      WHERE capex_id = @capexID
    `);

    await transaction.commit();
    return res.sendStatus(201);
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error(err);
    return res.sendStatus(500);
  }
}

function legacyBodyToEntries(body) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthNum = Object.fromEntries(
    Object.entries(MONTH_FULL).map(([n, name]) => [name, Number(n)])
  );
  const entries = [];
  months.forEach((m) => {
    for (let w = 1; w <= 4; w++) {
      ["GBS", "IEBR", "PPP"].forEach((ft) => {
        const key = `capex${ft}Week${w}${m}`;
        if (body[key] == null) return;
        entries.push({
          month_number: monthNum[m],
          week_number: w,
          funding_type: ft,
          amount: body[key],
        });
      });
    }
  });
  return entries;
}

async function getCapexExpediture(req, res) {
    const capexID = req.params.capexID;
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", capexID);

    try {
    const result = await request.query(`
      SELECT capex_total_value FROM tbl_capex WHERE capex_id = @capexID;
    `);
        res.json(result.recordset);
  } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function editCapexExpediture(req, res) {
    const capexID = req.body.ID;
    const gbsValue = req.body.gbsValue;
    const iebrValue = req.body.iebrValue;
    const pppValue = req.body.pppValue;
    const totalValue = req.body.totalValue;
  const userID = resolveUserId(req, req.body.userID);
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", capexID);
    request.input("gbsValue", gbsValue);
    request.input("iebrValue", iebrValue);
    request.input("pppValue", pppValue);
    request.input("totalValue", totalValue);
    request.input("userID", userID);

    try {
    await request.query(`
      UPDATE tbl_capex
      SET capex_gbs_value = @gbsValue,
          capex_iebr_value = @iebrValue,
          capex_ppp_value = @pppValue,
          updated_by = @userID,
          capex_total_value = @totalValue,
          updated_date = GETDATE()
      WHERE capex_id = @capexID
    `);
        return res.sendStatus(200);
  } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCapexDataEntry(req, res) {
    const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;

    const conn = await pool;
    const request = conn.request();
  request.input("financialYear", financialYear);

  try {
    const { joinSql, whereSql } = applyDataScope(request, req.user, {
      strategy: "directOrgColumn",
      alias: "mmt",
      orgColumn: "organisation_id",
    });

        const result = await request.query(`
      WITH LatestWeek AS (
        SELECT
          capex_id,
          month_number,
          week_number,
          ROW_NUMBER() OVER (
            PARTITION BY capex_id
            ORDER BY
              CASE month_number
                WHEN 4 THEN 1 WHEN 5 THEN 2 WHEN 6 THEN 3 WHEN 7 THEN 4
                WHEN 8 THEN 5 WHEN 9 THEN 6 WHEN 10 THEN 7 WHEN 11 THEN 8
                WHEN 12 THEN 9 WHEN 1 THEN 10 WHEN 2 THEN 11 WHEN 3 THEN 12
                ELSE 0
              END DESC,
              week_number DESC
          ) AS rn
        FROM tbl_capex_monthly
        WHERE ISNULL(amount, 0) <> 0
      )
            SELECT 
                mmt.organisation_id,
                mmt.organisation_name,
				c.capex_total_value,
				CASE 
          WHEN c.capex_total_value IS NOT NULL THEN 'TRUE'
				   ELSE 'FALSE'
        END AS last_procurement_updated_by_ministry,
        CASE
          WHEN lw.week_number IS NOT NULL THEN
            CONCAT(
              'Week ', lw.week_number, ' - ',
              CASE lw.month_number
                WHEN 1 THEN 'January' WHEN 2 THEN 'February' WHEN 3 THEN 'March'
                WHEN 4 THEN 'April' WHEN 5 THEN 'May' WHEN 6 THEN 'June'
                WHEN 7 THEN 'July' WHEN 8 THEN 'August' WHEN 9 THEN 'September'
                WHEN 10 THEN 'October' WHEN 11 THEN 'November' WHEN 12 THEN 'December'
              END
            )
          ELSE NULL
        END AS latest_week_updated
      FROM mmt_organisation mmt
      LEFT JOIN mmt_organisation_category mmt_oc
        ON mmt.organisation_category_id = mmt_oc.organisation_category_id
      LEFT JOIN tbl_capex c
        ON mmt.organisation_id = c.capex_organisation_id
       AND c.capex_financial_year = @financialYear
      LEFT JOIN LatestWeek lw
        ON c.capex_id = lw.capex_id AND lw.rn = 1
      ${joinSql}
      WHERE 1 = 1
      ${whereSql}
      ORDER BY mmt.organisation_name
    `);

    res.json({
      organisations: result.recordset,
      financialYear,
    });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexDashboard(req, res) {
    try {
        const clusterID = parseInt(req.params.clusterID, 10) || 0;
        const financialYear = req.params.financialYear || null;
        const conn = await pool;
        const request = conn.request();
        request.input("clusterID", clusterID);
        request.input("financialYear", financialYear);

    const combinedResult = await request.query(`
      WITH ${MONTHLY_TOTALS_CTE}
            SELECT
            SUM(tc.capex_total_value) AS totalPlannedExpenditure,
        SUM(ISNULL(tcm.total_Capex, 0)) AS totalActualExpenditure,
            CASE 
                WHEN SUM(tc.capex_total_value) = 0 THEN 0
          ELSE (SUM(ISNULL(tcm.total_Capex, 0)) / SUM(tc.capex_total_value)) * 100
            END AS expenditurePercentage
        FROM tbl_capex tc
      LEFT JOIN CapexMonthlyTotals tcm ON tc.capex_id = tcm.capex_id
        INNER JOIN mmt_organisation o ON tc.capex_organisation_id = o.organisation_id
        INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
        WHERE
            (@financialYear IS NULL OR tc.capex_financial_year = @financialYear)
        AND (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
    `);

        return res.json({
            combinedTotals: combinedResult.recordset[0],
      message: "Filtered by financial year only",
        });
    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCapexDashboardBarGraph(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const financialYear = req.params.financialYear || null;
    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("financialYear", financialYear);

    const { recordset } = await request.query(`
      WITH ${MONTHLY_TOTALS_CTE}
      SELECT
        o.organisation_code,
        tc.capex_total_value AS planned,
        ISNULL(SUM(tcm.total_Capex), 0) AS actual
      FROM tbl_capex tc
      INNER JOIN mmt_organisation o ON tc.capex_organisation_id = o.organisation_id
      INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
      LEFT JOIN CapexMonthlyTotals tcm ON tc.capex_id = tcm.capex_id
      WHERE
        (@financialYear IS NULL OR tc.capex_financial_year = @financialYear)
        AND (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
      GROUP BY o.organisation_code, tc.capex_total_value
      ORDER BY o.organisation_code
    `);

    if (!recordset.length) {
      return res.status(404).json({ error: "No data available" });
    }

    res.json({
      labels: recordset.map((r) => r.organisation_code),
      datasets: [
        { label: "Planned Expenditure", data: recordset.map((r) => r.planned) },
        { label: "Actual Expenditure", data: recordset.map((r) => r.actual) },
      ],
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCapexDashboardorg(req, res) {
    try {
        const financialYear = req.params.financialYear || null;
    const organisationID = req.params.organisationID
      ? parseInt(req.params.organisationID, 10)
      : 0;
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("organisationID", organisationID);

    const combinedResult = await request.query(`
            WITH Planned AS (
                SELECT
                    capex_organisation_id,
                    capex_financial_year,
                    SUM(capex_total_value) AS totalPlannedExpenditure
                FROM tbl_capex
                GROUP BY capex_organisation_id, capex_financial_year
            ),
            Actual AS (
                SELECT
                    tc.capex_organisation_id,
                    tc.capex_financial_year,
          SUM(ISNULL(tcm.amount, 0)) AS totalActualExpenditure
                FROM tbl_capex tc
        LEFT JOIN tbl_capex_monthly tcm ON tc.capex_id = tcm.capex_id
                GROUP BY tc.capex_organisation_id, tc.capex_financial_year
            )
            SELECT
                o.organisation_id,
                o.organisation_name,
                p.capex_financial_year,
                p.totalPlannedExpenditure,
                COALESCE(a.totalActualExpenditure, 0) AS totalActualExpenditure,
                CASE 
                    WHEN p.totalPlannedExpenditure = 0 THEN 0
          ELSE (COALESCE(a.totalActualExpenditure, 0) / p.totalPlannedExpenditure) * 100
                END AS expenditurePercentage
            FROM Planned p
            LEFT JOIN Actual a
                ON p.capex_organisation_id = a.capex_organisation_id
               AND p.capex_financial_year = a.capex_financial_year
      INNER JOIN mmt_organisation o ON p.capex_organisation_id = o.organisation_id
      INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@financialYear IS NULL OR p.capex_financial_year = @financialYear)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)
    `);

        return res.json({
            combinedTotals: combinedResult.recordset[0] || {
                totalPlannedExpenditure: 0,
                totalActualExpenditure: 0,
        expenditurePercentage: 0,
            },
      message: "Filtered by financial year, cluster, and organisation",
        });
    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getfinancialYearDataOrgwise(req, res) {
    try {
        const organisationID = req.params.organisationID;
          const financialYear = req.params.financialYear || null;
        const conn = await pool;
        const request = conn.request();
        request.input("organisationID", organisationID);
              request.input("financialYear", financialYear);

    const combinedResult = await request.query(`
           SELECT 
            c.capex_organisation_id AS organisation_id,
            c.capex_financial_year AS financial_year,
        CASE m.month_number
          WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
          WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
          WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep'
          WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
        END AS month,
        SUM(CASE WHEN m.funding_type = 'GBS'  THEN ISNULL(m.amount, 0) ELSE 0 END) AS GBS,
        SUM(CASE WHEN m.funding_type = 'IEBR' THEN ISNULL(m.amount, 0) ELSE 0 END) AS IEBR,
        SUM(CASE WHEN m.funding_type = 'PPP'  THEN ISNULL(m.amount, 0) ELSE 0 END) AS PPP
        FROM tbl_capex c
      JOIN tbl_capex_monthly m ON c.capex_id = m.capex_id
        WHERE 
        c.capex_organisation_id = @organisationID
        AND (@financialYear IS NULL OR c.capex_financial_year = @financialYear)
        GROUP BY 
            c.capex_organisation_id,
            c.capex_financial_year,
        m.month_number
        ORDER BY 
            c.capex_organisation_id,
            c.capex_financial_year,
        CASE m.month_number
          WHEN 4 THEN 1 WHEN 5 THEN 2 WHEN 6 THEN 3 WHEN 7 THEN 4
          WHEN 8 THEN 5 WHEN 9 THEN 6 WHEN 10 THEN 7 WHEN 11 THEN 8
          WHEN 12 THEN 9 WHEN 1 THEN 10 WHEN 2 THEN 11 WHEN 3 THEN 12
          ELSE 0
        END
    `);

        return res.json(combinedResult.recordset);
    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCapexDashboardBarGraphorg(req, res) {
  try {
    const organisationID = req.params.organisationID
      ? parseInt(req.params.organisationID, 10)
      : 0;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);

    const { recordset } = await request.query(`
      SELECT
        tc.capex_financial_year,
        SUM(tc.capex_total_value) AS planned,
        ISNULL(SUM(tcm.totalActual), 0) AS actual
    FROM tbl_capex tc
    LEFT JOIN (
        SELECT capex_id, SUM(ISNULL(amount, 0)) AS totalActual
        FROM tbl_capex_monthly
        GROUP BY capex_id
      ) tcm ON tc.capex_id = tcm.capex_id
      WHERE (@organisationID = 0 OR tc.capex_organisation_id = @organisationID)
      GROUP BY tc.capex_financial_year
      ORDER BY tc.capex_financial_year
    `);

    if (!recordset.length) {
      return res.status(404).json({ error: "No data available" });
    }

    res.json({
      labels: recordset.map((r) => r.capex_financial_year),
      datasets: [
        { label: "Planned Expenditure", data: recordset.map((r) => r.planned) },
        { label: "Actual Expenditure", data: recordset.map((r) => r.actual) },
      ],
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default {
  addCapex,
  getCapexExpediture,
  getCapexMonthlyData,
  addCapexMonthlyData,
  getCapexData,
  editCapexExpediture,
  getCapexDataEntry,
  getCapexDashboard,
  getCapexDashboardBarGraph,
  getfinancialYearDataOrgwise,
  getCapexDashboardorg,
  getCapexDashboardBarGraphorg,
};
