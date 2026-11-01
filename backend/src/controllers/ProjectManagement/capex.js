import { pool } from "../../db.js";
import sql from "mssql";
import { applyDataScope, getDataScope } from "../../middleware/dataScope.js";

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Path / body capex IDs: whole numbers only, otherwise null
function parseCapexId(value) {
  const s = String(value ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= 2147483647 ? n : null;
}

// Target amounts (₹ crore): a non-negative number, otherwise null
function parseAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Targets are set by the Ministry, as in the old portal; organisation users only enter actuals
function isMinistryScope(user) {
  return getDataScope(user).isWide;
}

// True when the capex record exists and falls in the caller's data scope
async function isCapexInScope(conn, user, capexID) {
  const request = conn.request();
  request.input("capexID", sql.Int, capexID);
  const { whereSql } = applyDataScope(request, user, {
    strategy: "directOrgColumn",
    alias: "tbl_capex",
    orgColumn: "capex_organisation_id",
  });
  const result = await request.query(`
    SELECT 1 AS found FROM tbl_capex WHERE capex_id = @capexID ${whereSql}
  `);
  return result.recordset.length > 0;
}

// % and _ (and [ in SQL Server) are LIKE wildcards; search for them literally
const escapeLike = (s) => s.replace(/([\\%_[])/g, "\\$1");

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
    request.input("search", sql.NVarChar(255), `%${escapeLike(search)}%`);
    parts.push(` AND (
      org.organisation_name LIKE @search ESCAPE '\\'
      OR tbl_capex.capex_financial_year LIKE @search ESCAPE '\\'
      OR CAST(tbl_capex.capex_total_value AS NVARCHAR(50)) LIKE @search ESCAPE '\\'
      OR CAST(COALESCE(monthly.total_Capex, 0) AS NVARCHAR(50)) LIKE @search ESCAPE '\\'
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
  if (amount == null || !Number.isFinite(amount) || amount < 0) return null;

  return {
    month_number: monthNumber,
    week_number: weekNumber,
    funding_type: fundingType,
    amount,
  };
}

async function addCapex(req, res) {
  const userId = resolveUserId(req, req.body.userID);
    const financialYear = String(req.body.financialYear || "").trim();
    const organisationId = parseCapexId(req.body.organisationId);
    const gbsValue = parseAmount(req.body.gbsValue);
    const iebrValue = parseAmount(req.body.iebrValue);
    const PPPValue = parseAmount(req.body.PPPValue ?? req.body.pppValue);

  if (!isMinistryScope(req.user)) {
    return res.status(403).json({ error: "Capex targets are set by the Ministry." });
  }
  if (!userId || !/^\d{4}-\d{4}$/.test(financialYear) || !organisationId) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (gbsValue == null || iebrValue == null || PPPValue == null) {
    return res.status(400).json({ error: "GBS, IEBR and PPP must be non-negative numbers." });
  }
  // Total is worked out here, not taken from the client
  const totalValue = round2(gbsValue + iebrValue + PPPValue);

    try {
    const conn = await pool;
    const request = conn.request();
    request.input("userId", sql.Int, userId);
    request.input("financialYear", sql.NVarChar(50), financialYear);
    request.input("organisationId", sql.Int, organisationId);
    request.input("gbsValue", sql.Decimal(18, 2), gbsValue);
    request.input("iebrValue", sql.Decimal(18, 2), iebrValue);
    request.input("PPPValue", sql.Decimal(18, 2), PPPValue);
    request.input("totalValue", sql.Decimal(18, 2), totalValue);

    const orgResult = await request.query(`
      SELECT 1 AS found FROM mmt_organisation WHERE organisation_id = @organisationId
    `);
    if (!orgResult.recordset.length) {
      return res.status(400).json({ error: "Unknown organisation." });
    }

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
                created_date,
                updated_by,
                updated_date,
                capex_financial_year,
                capex_organisation_id,
                capex_gbs_value,
                capex_iebr_value,
                capex_ppp_value,
                capex_total_value
            )
            VALUES (
                @userId,
                GETDATE(),
                @userId,
                GETDATE(),
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
  try {
    const conn = await pool;
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
  const capexID = parseCapexId(req.params.capexID);
  if (!capexID) {
    return res.status(400).json({ error: "Invalid capexID." });
  }

  try {
    const conn = await pool;
    if (!(await isCapexInScope(conn, req.user, capexID))) {
      return res.status(404).json({ error: "Capex record not found." });
    }
    const request = conn.request();
    request.input("capexID", sql.Int, capexID);

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
  const capexID = parseCapexId(req.body.capexID);
  const userId = resolveUserId(req, req.body.userID ?? req.body.userId);
  let entries = Array.isArray(req.body.entries) ? req.body.entries : [];

  if (!entries.length && req.body.capexID) {
    entries = legacyBodyToEntries(req.body);
  }

  if (!capexID) {
    return res.status(400).json({ error: "Invalid capexID." });
  }
  if (!userId) {
    return res.status(400).json({ error: "Missing authenticated user." });
  }

  // Reject the whole save if any entry is bad, so a bad payload never clears saved actuals
  const newEntries = entries.map(normalizeMonthlyEntry);
  if (!newEntries.length || newEntries.some((e) => !e)) {
    return res.status(400).json({
      error: "Every entry needs a valid month, week, funding type and a non-negative amount.",
    });
  }
  const keys = new Set(newEntries.map((e) => `${e.month_number}-${e.week_number}-${e.funding_type}`));
  if (keys.size !== newEntries.length) {
    return res.status(400).json({ error: "Duplicate month / week / funding type entries." });
  }

  let transaction;
  try {
    const conn = await pool;
    if (!(await isCapexInScope(conn, req.user, capexID))) {
      return res.status(404).json({ error: "Capex record not found." });
    }

    transaction = conn.transaction();
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

    // Update rows in place (only when the amount changed) and add missing ones, so
    // created_by / created_date keep who first entered each week
    for (const row of newEntries) {
      const upsert = transaction.request();
      upsert.input("capexID", sql.Int, capexID);
      upsert.input("monthNumber", sql.Int, row.month_number);
      upsert.input("weekNumber", sql.Int, row.week_number);
      upsert.input("fundingType", sql.NVarChar(10), row.funding_type);
      upsert.input("amount", sql.Decimal(18, 2), row.amount);
      upsert.input("userId", sql.Int, userId);
      await upsert.query(`
        UPDATE tbl_capex_monthly
        SET amount = @amount, updated_by = @userId, updated_date = GETDATE()
        WHERE capex_id = @capexID AND month_number = @monthNumber
          AND week_number = @weekNumber AND funding_type = @fundingType
          AND (amount IS NULL OR amount <> @amount);

        IF NOT EXISTS (
          SELECT 1 FROM tbl_capex_monthly
          WHERE capex_id = @capexID AND month_number = @monthNumber
            AND week_number = @weekNumber AND funding_type = @fundingType
        )
          INSERT INTO tbl_capex_monthly (
            capex_id, month_number, week_number, funding_type, amount,
            created_by, updated_by, created_date, updated_date
          )
          VALUES (
            @capexID, @monthNumber, @weekNumber, @fundingType, @amount,
            @userId, @userId, GETDATE(), GETDATE()
          );
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
      await transaction?.rollback();
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
    const capexID = parseCapexId(req.params.capexID);
    if (!capexID) {
      return res.status(400).json({ error: "Invalid capexID." });
    }

    try {
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", sql.Int, capexID);
    const { whereSql } = applyDataScope(request, req.user, {
      strategy: "directOrgColumn",
      alias: "tbl_capex",
      orgColumn: "capex_organisation_id",
    });
    const result = await request.query(`
      SELECT capex_total_value FROM tbl_capex WHERE capex_id = @capexID ${whereSql};
    `);
        res.json(result.recordset);
  } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function editCapexExpediture(req, res) {
    const capexID = parseCapexId(req.body.ID);
    const gbsValue = parseAmount(req.body.gbsValue);
    const iebrValue = parseAmount(req.body.iebrValue);
    const pppValue = parseAmount(req.body.pppValue);
  const userID = resolveUserId(req, req.body.userID);

  if (!isMinistryScope(req.user)) {
    return res.status(403).json({ error: "Capex targets are set by the Ministry." });
  }
  if (!capexID || !userID) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (gbsValue == null || iebrValue == null || pppValue == null) {
    return res.status(400).json({ error: "GBS, IEBR and PPP must be non-negative numbers." });
  }
  const totalValue = round2(gbsValue + iebrValue + pppValue);

    try {
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", sql.Int, capexID);
    request.input("gbsValue", sql.Decimal(18, 2), gbsValue);
    request.input("iebrValue", sql.Decimal(18, 2), iebrValue);
    request.input("pppValue", sql.Decimal(18, 2), pppValue);
    request.input("totalValue", sql.Decimal(18, 2), totalValue);
    request.input("userID", sql.Int, userID);

    const result = await request.query(`
      UPDATE tbl_capex
      SET capex_gbs_value = @gbsValue,
          capex_iebr_value = @iebrValue,
          capex_ppp_value = @pppValue,
          updated_by = @userID,
          capex_total_value = @totalValue,
          updated_date = GETDATE()
      WHERE capex_id = @capexID
    `);
    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ error: "Capex record not found." });
    }
        return res.sendStatus(200);
  } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCapexDataEntry(req, res) {
    const currentYear = new Date().getFullYear();
  const financialYear =
    // getMonth() is 0-based: April (3) starts the new financial year
    new Date().getMonth() >= 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;

  try {
    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);
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

export default {
  addCapex,
  getCapexExpediture,
  getCapexMonthlyData,
  addCapexMonthlyData,
  getCapexData,
  editCapexExpediture,
  getCapexDataEntry,
};
