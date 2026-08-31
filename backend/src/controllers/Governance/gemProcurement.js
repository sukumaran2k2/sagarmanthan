import { pool } from "../../db.js";
import sql from "mssql";
import { applyDataScope, getDataScope } from "../../middleware/dataScope.js";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function monthCap(month) {
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function throughSumSql(alias = "m") {
  return `ISNULL(SUM(${MONTHS.map((m) => `ISNULL(${alias}.procurement_through_gem_${m}, 0)`).join(" + ")}), 0)`;
}

function outsideSumSql(alias = "m") {
  return `ISNULL(SUM(${MONTHS.map((m) => `ISNULL(${alias}.procurement_outside_gem_${m}, 0)`).join(" + ")}), 0)`;
}

const CATEGORIES = {
  goods: {
    key: "goods",
    table: "tbl_gem_procurement_goods",
    monthlyTable: "tbl_gem_procurement_goods_monthly",
    idCol: "goods_gem_id",
    orgCol: "goods_organisation_id",
    fyCol: "goods_financial_year",
    potentialCol: "goods_procurement_potential",
    idBodyKey: "goodsGemID",
    potentialBodyKey: "goodsProcurementPotential",
    alias: "gpg",
  },
  service: {
    key: "service",
    table: "tbl_gem_procurement_service",
    monthlyTable: "tbl_gem_procurement_service_monthly",
    idCol: "service_gem_id",
    orgCol: "service_organisation_id",
    fyCol: "service_financial_year",
    potentialCol: "service_procurement_potential",
    idBodyKey: "serviceGemID",
    potentialBodyKey: "serviceProcurementPotential",
    alias: "gps",
  },
  works: {
    key: "works",
    table: "tbl_gem_procurement_works",
    monthlyTable: "tbl_gem_procurement_works_monthly",
    idCol: "works_gem_id",
    orgCol: "works_organisation_id",
    fyCol: "works_financial_year",
    potentialCol: "works_procurement_potential",
    idBodyKey: "worksGemID",
    potentialBodyKey: "worksProcurementPotential",
    alias: "gpw",
  },
};

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Writes carry the organisation in the body, so the read-side SQL scope is not
// enough: reject payloads that target an organisation outside the user's scope.
function isOrganisationInScope(req, organisationId) {
  const { isWide, isOrganisation, organisationId: scopeOrgId } = getDataScope(req.user);
  if (isWide) return true;
  if (!isOrganisation) return false;
  return Number(organisationId) === Number(scopeOrgId);
}

async function loadRecordOrganisationId(cfg, gemId) {
  const conn = await pool;
  const request = conn.request();
  request.input("gemId", sql.Int, Number(gemId));
  const result = await request.query(`
    SELECT ${cfg.orgCol} AS organisationId
    FROM ${cfg.table}
    WHERE ${cfg.idCol} = @gemId
  `);
  return result.recordset.length ? result.recordset[0].organisationId : null;
}

function resolveUserId(req, fallback) {
  const raw = req.user?.userId ?? req.user?.user_id ?? fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function monthlyTotalsCte(cfg) {
  return `
    GemMonthlyTotals AS (
      SELECT
        ${cfg.idCol},
        (${throughSumSql("m")}) AS total_procurement_through_gem,
        (${outsideSumSql("m")}) AS total_procurement_outside_gem
      FROM ${cfg.monthlyTable} m
      GROUP BY ${cfg.idCol}
    )
  `;
}

function bindListFilters(request, query = {}, cfg) {
  const parts = [];
  const financialYear = String(query.financialYear || "").trim();
  const organisationId = String(query.organisationId || "").trim();
  const organisationName = String(query.organisationName || "").trim();
  const search = String(query.search || "").trim();

  if (financialYear) {
    request.input("financialYear", sql.NVarChar(50), financialYear);
    parts.push(` AND CAST(${cfg.alias}.${cfg.fyCol} AS NVARCHAR(50)) = @financialYear`);
  }
  if (organisationId) {
    request.input("organisationId", sql.NVarChar(50), organisationId);
    parts.push(` AND CAST(${cfg.alias}.${cfg.orgCol} AS NVARCHAR(50)) = @organisationId`);
  }
  if (organisationName) {
    request.input("organisationName", sql.NVarChar(255), organisationName);
    parts.push(" AND org.organisation_name = @organisationName");
  }
  if (search) {
    request.input("search", sql.NVarChar(255), `%${search}%`);
    parts.push(` AND (
      org.organisation_name LIKE @search
      OR CAST(${cfg.alias}.${cfg.fyCol} AS NVARCHAR(50)) LIKE @search
      OR CAST(${cfg.alias}.${cfg.potentialCol} AS NVARCHAR(50)) LIKE @search
    )`);
  }
  return parts.join("");
}

function listFromSql(cfg) {
  return `
    FROM ${cfg.table} ${cfg.alias}
    LEFT JOIN GemMonthlyTotals monthly ON ${cfg.alias}.${cfg.idCol} = monthly.${cfg.idCol}
    LEFT JOIN mmt_organisation org ON ${cfg.alias}.${cfg.orgCol} = org.organisation_id
  `;
}

async function listCategory(req, res, cfg) {
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
      alias: cfg.alias,
      orgColumn: cfg.orgCol,
    });
    applyDataScope(pageRequest, req.user, {
      strategy: "directOrgColumn",
      alias: cfg.alias,
      orgColumn: cfg.orgCol,
    });

    const filterSql = bindListFilters(countRequest, req.query, cfg);
    bindListFilters(pageRequest, req.query, cfg);

    pageRequest.input("offset", sql.Int, offset);
    pageRequest.input("limit", sql.Int, limit);

    const [countResult, pageResult] = await Promise.all([
      countRequest.query(`
        WITH ${monthlyTotalsCte(cfg)}
        SELECT COUNT(*) AS total
        ${listFromSql(cfg)}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
      `),
      pageRequest.query(`
        WITH ${monthlyTotalsCte(cfg)}
        SELECT
          ${cfg.alias}.*,
          COALESCE(monthly.total_procurement_through_gem, 0) AS total_procurement_through_gem,
          COALESCE(monthly.total_procurement_outside_gem, 0) AS total_procurement_outside_gem,
          org.organisation_name AS organisation_name
        ${listFromSql(cfg)}
        ${joinSql}
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
        ORDER BY ${cfg.alias}.${cfg.fyCol} DESC, ${cfg.alias}.${cfg.idCol} DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `),
    ]);

    const total = Number(countResult.recordset?.[0]?.total) || 0;
    return res.json({
      data: pageResult.recordset || [],
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(`listCategory(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function addCategory(req, res, cfg) {
  const userId = resolveUserId(req, req.body.userID ?? req.body.userId);
  const financialYear = req.body.financialYear;
  const organisationId = req.body.organisationId;
  const potential = Number(
    req.body[cfg.potentialBodyKey] ??
      req.body.workProcurementPotential ??
      req.body.plannedPotential ??
      req.body.procurementPotential
  );
  const eightMonthsProportionalTarget = Number.isFinite(potential)
    ? (potential / 12) * 8
    : null;

  if (!userId || !financialYear || !organisationId || !Number.isFinite(potential)) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (!isOrganisationInScope(req, organisationId)) {
    return res.status(403).json({ error: "Organisation outside your data scope." });
  }

  const conn = await pool;
  const request = conn.request();
  request.input("userId", sql.Int, userId);
  request.input("financialYear", sql.NVarChar(50), financialYear);
  request.input("organisationId", sql.Int, Number(organisationId));
  request.input("potential", sql.Float, potential);
  request.input("eightMonthsProportionalTarget", sql.Float, eightMonthsProportionalTarget);

  try {
    const check = await request.query(`
      SELECT COUNT(*) AS count
      FROM ${cfg.table}
      WHERE ${cfg.fyCol} = @financialYear
        AND ${cfg.orgCol} = @organisationId
    `);
    if (check.recordset[0].count > 0) {
      return res.status(400).json({
        error: "Record already exists for the specified financialYear and organisationId.",
      });
    }

    await request.query(`
      INSERT INTO ${cfg.table} (
        created_by,
        created_date,
        updated_by,
        updated_date,
        ${cfg.fyCol},
        ${cfg.orgCol},
        ${cfg.potentialCol},
        eight_months_proportional_target
      )
      VALUES (
        @userId,
        GETDATE(),
        @userId,
        GETDATE(),
        @financialYear,
        @organisationId,
        @potential,
        @eightMonthsProportionalTarget
      )
    `);
    return res.sendStatus(201);
  } catch (err) {
    console.error(`addCategory(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function updateCategory(req, res, cfg) {
  const userId = resolveUserId(req, req.body.userID ?? req.body.userId);
  const financialYear = req.body.financialYear;
  const organisationId = req.body.organisationId;
  const potential = Number(
    req.body[cfg.potentialBodyKey] ??
      req.body.workProcurementPotential ??
      req.body.plannedPotential ??
      req.body.procurementPotential
  );
  const eightMonthsProportionalTarget = Number.isFinite(potential)
    ? (potential / 12) * 8
    : null;

  if (!userId || !financialYear || !organisationId || !Number.isFinite(potential)) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (!isOrganisationInScope(req, organisationId)) {
    return res.status(403).json({ error: "Organisation outside your data scope." });
  }

  const conn = await pool;
  const request = conn.request();
  request.input("userId", sql.Int, userId);
  request.input("financialYear", sql.NVarChar(50), financialYear);
  request.input("organisationId", sql.Int, Number(organisationId));
  request.input("potential", sql.Float, potential);
  request.input("eightMonthsProportionalTarget", sql.Float, eightMonthsProportionalTarget);

  try {
    const result = await request.query(`
      UPDATE ${cfg.table}
      SET
        ${cfg.potentialCol} = @potential,
        eight_months_proportional_target = @eightMonthsProportionalTarget,
        updated_by = @userId,
        updated_date = GETDATE()
      WHERE ${cfg.fyCol} = @financialYear
        AND ${cfg.orgCol} = @organisationId
    `);
    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({
        error: "Record not found for the specified financialYear and organisationId.",
      });
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error(`updateCategory(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function deleteCategory(req, res, cfg) {
  const financialYear = req.body.financialYear;
  const organisationId = req.body.organisationId;
  if (!financialYear || !organisationId) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (!isOrganisationInScope(req, organisationId)) {
    return res.status(403).json({ error: "Organisation outside your data scope." });
  }

  const conn = await pool;
  const transaction = conn.transaction();
  try {
    await transaction.begin();
    const request = transaction.request();
    request.input("financialYear", sql.NVarChar(50), financialYear);
    request.input("organisationId", sql.Int, Number(organisationId));

    const idResult = await request.query(`
      SELECT ${cfg.idCol} AS id
      FROM ${cfg.table}
      WHERE ${cfg.fyCol} = @financialYear
        AND ${cfg.orgCol} = @organisationId
    `);
    if (!idResult.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        error: "Record not found for the specified financialYear and organisationId.",
      });
    }

    const gemId = idResult.recordset[0].id;
    const delMonthly = transaction.request();
    delMonthly.input("gemId", sql.Int, gemId);
    await delMonthly.query(`
      DELETE FROM ${cfg.monthlyTable} WHERE ${cfg.idCol} = @gemId
    `);

    const delParent = transaction.request();
    delParent.input("financialYear", sql.NVarChar(50), financialYear);
    delParent.input("organisationId", sql.Int, Number(organisationId));
    await delParent.query(`
      DELETE FROM ${cfg.table}
      WHERE ${cfg.fyCol} = @financialYear
        AND ${cfg.orgCol} = @organisationId
    `);

    await transaction.commit();
    return res.sendStatus(200);
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error(`deleteCategory(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

function readMonthlyField(body, month, kind) {
  const cap = monthCap(month);
  if (kind === "through") {
    return (
      body[`procurementThroughGem${cap}`] ??
      body[`procurement_through_gem_${month}`] ??
      null
    );
  }
  if (kind === "outside") {
    return (
      body[`procurementOutsideGem${cap}`] ??
      body[`procurement_outside_gem_${month}`] ??
      null
    );
  }
  return (
    body[`reasonForNonProcurement${cap}`] ??
    body[`reason_for_non_procurement_${month}`] ??
    null
  );
}

async function saveMonthly(req, res, cfg) {
  const userId = resolveUserId(req, req.body.userID ?? req.body.userId);
  const gemId = Number(req.body[cfg.idBodyKey] ?? req.params[cfg.idBodyKey]);
  if (!userId) {
    return res.status(400).json({ error: "Missing authenticated user." });
  }
  if (!Number.isFinite(gemId) || gemId <= 0) {
    return res.status(400).json({ error: `Invalid ${cfg.idBodyKey}.` });
  }

  const recordOrgId = await loadRecordOrganisationId(cfg, gemId);
  if (recordOrgId == null) {
    return res.status(404).json({ error: "GeM record not found." });
  }
  if (!isOrganisationInScope(req, recordOrgId)) {
    return res.status(403).json({ error: "Record outside your data scope." });
  }

  const conn = await pool;
  const transaction = conn.transaction();
  try {
    await transaction.begin();
    const request = transaction.request();
    request.input("gemId", sql.Int, gemId);
    request.input("userId", sql.Int, userId);

    for (const month of MONTHS) {
      const cap = monthCap(month);
      const through = readMonthlyField(req.body, month, "through");
      const outside = readMonthlyField(req.body, month, "outside");
      const reason = readMonthlyField(req.body, month, "reason");
      request.input(`through${cap}`, sql.Float, through == null || through === "" ? null : Number(through));
      request.input(`outside${cap}`, sql.Float, outside == null || outside === "" ? null : Number(outside));
      request.input(`reason${cap}`, sql.NVarChar(sql.MAX), reason == null ? null : String(reason));
    }

    const exists = await request.query(`
      SELECT ${cfg.idCol}
      FROM ${cfg.monthlyTable}
      WHERE ${cfg.idCol} = @gemId
    `);

    const setCols = MONTHS.map((month) => {
      const cap = monthCap(month);
      return `
        procurement_through_gem_${month} = @through${cap},
        procurement_outside_gem_${month} = @outside${cap},
        reason_for_non_procurement_${month} = @reason${cap}`;
    }).join(",");

    const setColsWithAudit = `${setCols}, updated_by = @userId, updated_date = GETDATE()`;

    const insertCols = [
      cfg.idCol,
      "created_by",
      "created_date",
      "updated_by",
      "updated_date",
      ...MONTHS.flatMap((month) => [
        `procurement_through_gem_${month}`,
        `procurement_outside_gem_${month}`,
        `reason_for_non_procurement_${month}`,
      ]),
    ].join(", ");

    const insertVals = [
      "@gemId",
      "@userId",
      "GETDATE()",
      "@userId",
      "GETDATE()",
      ...MONTHS.flatMap((month) => {
        const cap = monthCap(month);
        return [`@through${cap}`, `@outside${cap}`, `@reason${cap}`];
      }),
    ].join(", ");

    if (exists.recordset.length > 0) {
      await request.query(`
        UPDATE ${cfg.monthlyTable}
        SET ${setColsWithAudit}
        WHERE ${cfg.idCol} = @gemId
      `);
    } else {
      await request.query(`
        INSERT INTO ${cfg.monthlyTable} (${insertCols})
        VALUES (${insertVals})
      `);
    }

    const touch = transaction.request();
    touch.input("gemId", sql.Int, gemId);
    touch.input("userId", sql.Int, userId);
    await touch.query(`
      UPDATE ${cfg.table}
      SET updated_by = @userId, updated_date = GETDATE()
      WHERE ${cfg.idCol} = @gemId
    `);

    await transaction.commit();
    return res.sendStatus(201);
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error(`saveMonthly(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function getMonthly(req, res, cfg, paramName) {
  const gemId = Number(req.params[paramName]);
  if (!Number.isFinite(gemId) || gemId <= 0) {
    return res.status(400).json({ error: `Invalid ${paramName}.` });
  }
  const recordOrgId = await loadRecordOrganisationId(cfg, gemId);
  if (recordOrgId != null && !isOrganisationInScope(req, recordOrgId)) {
    return res.status(403).json({ error: "Record outside your data scope." });
  }
  const conn = await pool;
  const request = conn.request();
  request.input("gemId", sql.Int, gemId);
  try {
    const result = await request.query(`
      SELECT * FROM ${cfg.monthlyTable} WHERE ${cfg.idCol} = @gemId
    `);
    return res.json(result.recordset);
  } catch (err) {
    console.error(`getMonthly(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function getPotential(req, res, cfg, paramName) {
  const gemId = Number(req.params[paramName]);
  if (!Number.isFinite(gemId) || gemId <= 0) {
    return res.status(400).json({ error: `Invalid ${paramName}.` });
  }
  const recordOrgId = await loadRecordOrganisationId(cfg, gemId);
  if (recordOrgId != null && !isOrganisationInScope(req, recordOrgId)) {
    return res.status(403).json({ error: "Record outside your data scope." });
  }
  const conn = await pool;
  const request = conn.request();
  request.input("gemId", sql.Int, gemId);
  try {
    const result = await request.query(`
      SELECT ${cfg.potentialCol}
      FROM ${cfg.table}
      WHERE ${cfg.idCol} = @gemId
    `);
    return res.json(result.recordset);
  } catch (err) {
    console.error(`getPotential(${cfg.key}):`, err);
    return res.sendStatus(500);
  }
}

async function addGemProcurementGoods(req, res) {
  return addCategory(req, res, CATEGORIES.goods);
}
async function addGemProcurementService(req, res) {
  return addCategory(req, res, CATEGORIES.service);
}
async function addGemProcurementWork(req, res) {
  return addCategory(req, res, CATEGORIES.works);
}

async function getGemProcurementGoods(req, res) {
  return listCategory(req, res, CATEGORIES.goods);
}
async function getGemProcurementService(req, res) {
  return listCategory(req, res, CATEGORIES.service);
}
async function getGemProcurementWork(req, res) {
  return listCategory(req, res, CATEGORIES.works);
}

async function updateGemProcurementGoods(req, res) {
  return updateCategory(req, res, CATEGORIES.goods);
}
async function updateGemProcurementService(req, res) {
  return updateCategory(req, res, CATEGORIES.service);
}
async function updateGemProcurementWork(req, res) {
  return updateCategory(req, res, CATEGORIES.works);
}

async function deleteGemProcurementGoods(req, res) {
  return deleteCategory(req, res, CATEGORIES.goods);
}
async function deleteGemProcurementService(req, res) {
  return deleteCategory(req, res, CATEGORIES.service);
}
async function deleteGemProcurementWork(req, res) {
  return deleteCategory(req, res, CATEGORIES.works);
}

async function addGemMonthlyGoodsData(req, res) {
  return saveMonthly(req, res, CATEGORIES.goods);
}
async function addGemMonthlyServiceData(req, res) {
  return saveMonthly(req, res, CATEGORIES.service);
}
async function addGemMonthlyWorksData(req, res) {
  return saveMonthly(req, res, CATEGORIES.works);
}

async function getGemMonthlyGoodsData(req, res) {
  return getMonthly(req, res, CATEGORIES.goods, "goodsGemID");
}
async function getGemMonthlyServiceData(req, res) {
  return getMonthly(req, res, CATEGORIES.service, "serviceGemID");
}
async function getGemMonthlyWorksData(req, res) {
  return getMonthly(req, res, CATEGORIES.works, "worksGemID");
}

async function getGoodsProcurementPotential(req, res) {
  return getPotential(req, res, CATEGORIES.goods, "goodsGemID");
}
async function getServiceProcurementPotential(req, res) {
  return getPotential(req, res, CATEGORIES.service, "serviceGemID");
}
async function getWorksProcurementPotential(req, res) {
  return getPotential(req, res, CATEGORIES.works, "worksGemID");
}

async function getGemProcurementTotalData(req, res) {
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

    const { whereSql } = applyDataScope(countRequest, req.user, {
      strategy: "directOrgColumn",
      alias: "t",
      orgColumn: "common_organisation_id",
    });
    applyDataScope(pageRequest, req.user, {
      strategy: "directOrgColumn",
      alias: "t",
      orgColumn: "common_organisation_id",
    });

    const financialYear = String(req.query.financialYear || "").trim();
    const organisationId = String(req.query.organisationId || "").trim();
    const search = String(req.query.search || "").trim();
    let filterSql = "";

    if (financialYear) {
      countRequest.input("financialYear", sql.NVarChar(50), financialYear);
      pageRequest.input("financialYear", sql.NVarChar(50), financialYear);
      filterSql += " AND CAST(t.common_financial_year AS NVARCHAR(50)) = @financialYear";
    }
    if (organisationId) {
      countRequest.input("organisationId", sql.NVarChar(50), organisationId);
      pageRequest.input("organisationId", sql.NVarChar(50), organisationId);
      filterSql += " AND CAST(t.common_organisation_id AS NVARCHAR(50)) = @organisationId";
    }
    if (search) {
      countRequest.input("search", sql.NVarChar(255), `%${search}%`);
      pageRequest.input("search", sql.NVarChar(255), `%${search}%`);
      filterSql += " AND (org.organisation_name LIKE @search OR CAST(t.common_financial_year AS NVARCHAR(50)) LIKE @search)";
    }

    pageRequest.input("offset", sql.Int, offset);
    pageRequest.input("limit", sql.Int, limit);

    const baseCte = `
      GoodsMonthly AS (
        SELECT goods_gem_id,
          (${throughSumSql("m")}) AS total_procurement_through_gem,
          (${outsideSumSql("m")}) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_goods_monthly m
        GROUP BY goods_gem_id
      ),
      ServiceMonthly AS (
        SELECT service_gem_id,
          (${throughSumSql("m")}) AS total_procurement_through_gem,
          (${outsideSumSql("m")}) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_service_monthly m
        GROUP BY service_gem_id
      ),
      WorksMonthly AS (
        SELECT works_gem_id,
          (${throughSumSql("m")}) AS total_procurement_through_gem,
          (${outsideSumSql("m")}) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_works_monthly m
        GROUP BY works_gem_id
      ),
      OrgYears AS (
        SELECT DISTINCT goods_organisation_id AS organisation_id, goods_financial_year AS financial_year
        FROM tbl_gem_procurement_goods
        UNION
        SELECT DISTINCT service_organisation_id, service_financial_year FROM tbl_gem_procurement_service
        UNION
        SELECT DISTINCT works_organisation_id, works_financial_year FROM tbl_gem_procurement_works
      ),
      TotalRows AS (
        SELECT
          COALESCE(g.goods_gem_id, s.service_gem_id, w.works_gem_id) AS common_gem_id,
          oy.financial_year AS common_financial_year,
          oy.organisation_id AS common_organisation_id,
          COALESCE(g.goods_procurement_potential, 0)
            + COALESCE(s.service_procurement_potential, 0)
            + COALESCE(w.works_procurement_potential, 0) AS total_procurement_potential,
          COALESCE(gm.total_procurement_through_gem, 0)
            + COALESCE(sm.total_procurement_through_gem, 0)
            + COALESCE(wm.total_procurement_through_gem, 0) AS total_procurement_through_gem,
          COALESCE(gm.total_procurement_outside_gem, 0)
            + COALESCE(sm.total_procurement_outside_gem, 0)
            + COALESCE(wm.total_procurement_outside_gem, 0) AS total_procurement_outside_gem,
          COALESCE(g.eight_months_proportional_target, 0)
            + COALESCE(s.eight_months_proportional_target, 0)
            + COALESCE(w.eight_months_proportional_target, 0) AS eight_months_proportional_target
        FROM OrgYears oy
        LEFT JOIN tbl_gem_procurement_goods g
          ON oy.organisation_id = g.goods_organisation_id AND oy.financial_year = g.goods_financial_year
        LEFT JOIN tbl_gem_procurement_service s
          ON oy.organisation_id = s.service_organisation_id AND oy.financial_year = s.service_financial_year
        LEFT JOIN tbl_gem_procurement_works w
          ON oy.organisation_id = w.works_organisation_id AND oy.financial_year = w.works_financial_year
        LEFT JOIN GoodsMonthly gm ON g.goods_gem_id = gm.goods_gem_id
        LEFT JOIN ServiceMonthly sm ON s.service_gem_id = sm.service_gem_id
        LEFT JOIN WorksMonthly wm ON w.works_gem_id = wm.works_gem_id
      )
    `;

    const [countResult, pageResult] = await Promise.all([
      countRequest.query(`
        WITH ${baseCte}
        SELECT COUNT(*) AS total
        FROM TotalRows t
        LEFT JOIN mmt_organisation org ON t.common_organisation_id = org.organisation_id
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
      `),
      pageRequest.query(`
        WITH ${baseCte}
        SELECT
          t.*,
          org.organisation_name AS organisation_name
        FROM TotalRows t
        LEFT JOIN mmt_organisation org ON t.common_organisation_id = org.organisation_id
        WHERE 1 = 1
        ${whereSql}
        ${filterSql}
        ORDER BY t.common_financial_year DESC, t.common_organisation_id
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `),
    ]);

    const total = Number(countResult.recordset?.[0]?.total) || 0;
    return res.json({
      data: pageResult.recordset || [],
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getGemProcurementTotalData:", err);
    return res.sendStatus(500);
  }
}

async function getOrganisationName(req, res) {
  const organisationID = Number(req.params.organisationID);
  if (!Number.isFinite(organisationID) || organisationID <= 0) {
    return res.status(400).json({ error: "Invalid organisationID." });
  }
  const conn = await pool;
  const request = conn.request();
  request.input("organisationID", sql.Int, organisationID);
  try {
    const result = await request.query(`
      SELECT organisation_name
      FROM mmt_organisation
      WHERE organisation_id = @organisationID
    `);
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
}

async function getGemProcurementDataEntry(req, res) {
  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() > 3
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;

  const conn = await pool;
  const request = conn.request();
  request.input("financialYear", sql.NVarChar(50), financialYear);

  try {
    const result = await request.query(`
      SELECT TOP (1000)
        g.goods_gem_id,
        mmt.organisation_name,
        [goods_procurement_potential],
        CASE
          WHEN ([goods_procurement_potential] IS NOT NULL) THEN 'TRUE'
          ELSE 'FALSE'
        END AS last_procurement_updated_by_ministry,
        CASE
          WHEN [procurement_through_gem_march] IS NOT NULL OR [procurement_outside_gem_march] IS NOT NULL THEN 'March'
          WHEN [procurement_through_gem_february] IS NOT NULL OR [procurement_outside_gem_february] IS NOT NULL THEN 'February'
          WHEN [procurement_through_gem_january] IS NOT NULL OR [procurement_outside_gem_january] IS NOT NULL THEN 'January'
          WHEN [procurement_through_gem_december] IS NOT NULL OR [procurement_outside_gem_december] IS NOT NULL THEN 'December'
          WHEN [procurement_through_gem_november] IS NOT NULL OR [procurement_outside_gem_november] IS NOT NULL THEN 'November'
          WHEN [procurement_through_gem_october] IS NOT NULL OR [procurement_outside_gem_october] IS NOT NULL THEN 'October'
          WHEN [procurement_through_gem_september] IS NOT NULL OR [procurement_outside_gem_september] IS NOT NULL THEN 'September'
          WHEN [procurement_through_gem_august] IS NOT NULL OR [procurement_outside_gem_august] IS NOT NULL THEN 'August'
          WHEN [procurement_through_gem_july] IS NOT NULL OR [procurement_outside_gem_july] IS NOT NULL THEN 'July'
          WHEN [procurement_through_gem_june] IS NOT NULL OR [procurement_outside_gem_june] IS NOT NULL THEN 'June'
          WHEN [procurement_through_gem_may] IS NOT NULL OR [procurement_outside_gem_may] IS NOT NULL THEN 'May'
          WHEN [procurement_through_gem_april] IS NOT NULL OR [procurement_outside_gem_april] IS NOT NULL THEN 'April'
          ELSE '-'
        END AS updated_month
      FROM mmt_organisation mmt
      LEFT JOIN mmt_organisation_category mmt_oc
        ON mmt.organisation_category_id = mmt_oc.organisation_category_id
      LEFT JOIN tbl_gem_procurement_goods g
        ON mmt.organisation_id = g.goods_organisation_id
       AND g.goods_financial_year = @financialYear
      LEFT JOIN tbl_gem_procurement_goods_monthly gm
        ON g.goods_gem_id = gm.goods_gem_id
      WHERE mmt.organisation_category_id = 1 OR mmt.organisation_id IN (25, 15, 18, 19, 21, 17)
      ORDER BY updated_month
    `);
    return res.json(result.recordset);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
}

export default {
  addGemProcurementGoods,
  addGemProcurementService,
  addGemProcurementWork,
  getGemProcurementGoods,
  getGemProcurementService,
  getGemProcurementWork,
  addGemMonthlyGoodsData,
  getGemMonthlyGoodsData,
  addGemMonthlyServiceData,
  getGemMonthlyServiceData,
  addGemMonthlyWorksData,
  getGemMonthlyWorksData,
  getOrganisationName,
  getGoodsProcurementPotential,
  getServiceProcurementPotential,
  getWorksProcurementPotential,
  getGemProcurementTotalData,
  updateGemProcurementGoods,
  updateGemProcurementService,
  updateGemProcurementWork,
  deleteGemProcurementGoods,
  deleteGemProcurementService,
  deleteGemProcurementWork,
  getGemProcurementDataEntry,
};
