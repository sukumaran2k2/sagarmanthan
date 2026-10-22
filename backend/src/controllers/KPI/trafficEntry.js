import sql from "mssql";
import { pool } from "../../db.js";
import {
    MONTH_NAMES,
    MONTH_NAME_SQL,
    FISCAL_MONTH_ORDER_SQL,
    sendError,
    parsePositiveInt,
    toPositiveIntOrNull,
    resolveUserId,
    normaliseFiscalYear,
    parseMonth,
    currentFinancialYear,
    isFuturePeriod,
    parseQuantity,
    describeScope,
    resolveReadOrganisation,
    requireOrganisationWriter as requireOrganisationScope,
    requireMinistryWriter,
    requirePermission as requireModuleAction,
    validateOrganisation,
    buildPagination,
    createEntryAccess,
} from "./kpiEntryCommon.js";

/**
 * KPI Major Ports — Traffic data entry.
 *
 * Who does what (enforced here, not only in the UI):
 *  - Organisation users (data scope ORGANISATION) enter monthly actuals for their own
 *    organisation only. The organisation and user always come from the JWT.
 *  - Ministry users (data scope MINISTRY/MASTER) see every organisation, maintain the
 *    fiscal-year targets and grant/revoke late-entry access. They do not enter actuals.
 *  - Actuals can be changed freely on days 1–ENTRY_WINDOW_LAST_DAY of a month. After
 *    that, an organisation needs an active ministry grant for that financial year/month.
 *  - CRUD flags come from the user's KPI_MAJOR_PORTS permission (route middleware plus
 *    checkModulePermission for create-vs-update decided at runtime).
 */

const MODULE_CODE = "KPI_MAJOR_PORTS";
const TEU_COMMODITY_ID = 28;
const PORT_ORG_CATEGORY_ID = 1;

const CATEGORY_IDS = [1, 2, 3, 4, 5];
const DIRECTION_IDS = [1, 2];
const FLAG_TYPE_IDS = [1, 2];

// module_id used for Traffic in ministry_access_module_audit_track (2 = Port Performance)
const access = createEntryAccess({ moduleId: "1", subject: "traffic" });
const { getEntryAccess, lockedMessage } = access;

// Commodity rows per MERGE batch (5 parameters each, SQL Server allows 2100)
const UPSERT_BATCH_SIZE = 250;

// One pivot column per category × direction × flag, e.g. c1_d1_f1
const DIMENSION_COLUMNS = CATEGORY_IDS.flatMap((categoryId) =>
    DIRECTION_IDS.flatMap((directionId) =>
        FLAG_TYPE_IDS.map((flagTypeId) => ({
            key: `c${categoryId}_d${directionId}_f${flagTypeId}`,
            categoryId,
            directionId,
            flagTypeId,
        }))
    )
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireOrganisationWriter(req, res) {
    return requireOrganisationScope(req, res, "Traffic actuals are entered by the port organisation. Ministry users can view them.");
}

function requirePermission(req, res, action) {
    return requireModuleAction(req, res, MODULE_CODE, action);
}

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------

// Reference data rarely changes: keep it for a few minutes per organisation scope
const MASTERS_TTL_MS = 5 * 60 * 1000;
const mastersCache = new Map(); // scope key -> { body, at }

async function getTrafficMasters(req, res) {
    const read = resolveReadOrganisation(req);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const cacheKey = read.organisationId ? `org:${read.organisationId}` : "all";
    const cached = mastersCache.get(cacheKey);
    if (cached && Date.now() - cached.at < MASTERS_TTL_MS) {
        return res.status(200).json({ ...cached.body, currentFinancialYear: currentFinancialYear() });
    }

    try {
        const conn = await pool;
        const orgRequest = conn.request();
        orgRequest.input("portCategoryId", sql.Int, PORT_ORG_CATEGORY_ID);
        let orgFilter = `
            WHERE org.organisation_category_id = @portCategoryId
               OR EXISTS (SELECT 1 FROM tbl_traffic_commodity_data d WHERE d.organisation_id = org.organisation_id)
               OR EXISTS (SELECT 1 FROM tbl_traffic_fiscal_target t WHERE t.organisation_id = org.organisation_id)
        `;
        if (read.organisationId) {
            orgRequest.input("organisationId", sql.Int, read.organisationId);
            orgFilter = "WHERE org.organisation_id = @organisationId";
        }

        const [groups, commodities, organisations] = await Promise.all([
            conn.request().query(`
                SELECT commodity_group_id, commodity_group_name
                FROM mmt_traffic_commodity_group
                ORDER BY commodity_group_id
            `),
            conn.request().query(`
                SELECT commodity_id, commodity_group_id, commodity_name
                FROM mmt_traffic_commodity
                ORDER BY commodity_group_id, commodity_name
            `),
            orgRequest.query(`
                SELECT org.organisation_id, org.organisation_name
                FROM mmt_organisation org
                ${orgFilter}
                ORDER BY org.organisation_name
            `),
        ]);

        const body = {
            commodityGroups: groups.recordset,
            commodities: commodities.recordset,
            organisations: organisations.recordset,
        };
        mastersCache.set(cacheKey, { body, at: Date.now() });
        return res.status(200).json({ ...body, currentFinancialYear: currentFinancialYear() });
    } catch (error) {
        console.error("Error fetching traffic masters:", error);
        return sendError(res, 500, "Traffic reference data could not be loaded.");
    }
}

// ---------------------------------------------------------------------------
// Actuals — list
// ---------------------------------------------------------------------------

/** Binds the shared list filters once and returns a WHERE fragment for a table alias. */
function bindActualFilters(request, filters) {
    if (filters.fiscalYear) request.input("fyFilter", sql.NVarChar(20), filters.fiscalYear);
    if (filters.month) request.input("monthFilter", sql.Int, filters.month);
    if (filters.organisationId) request.input("orgFilter", sql.Int, filters.organisationId);
    if (filters.commodityGroupId) request.input("groupFilter", sql.Int, filters.commodityGroupId);
    if (filters.commodityId) request.input("commodityFilter", sql.Int, filters.commodityId);
    if (filters.search) request.input("search", sql.NVarChar(200), `%${filters.search}%`);

    return (alias, { commodity = false } = {}) => {
        const parts = [];
        if (filters.fiscalYear) parts.push(`${alias}.fiscal_year = @fyFilter`);
        if (filters.month) parts.push(`${alias}.month = @monthFilter`);
        if (filters.organisationId) parts.push(`${alias}.organisation_id = @orgFilter`);
        if (commodity && filters.commodityGroupId) parts.push(`${alias}.commodity_group_id = @groupFilter`);
        if (commodity && filters.commodityId) parts.push(`${alias}.commodity_id = @commodityFilter`);
        return parts.length ? ` AND ${parts.join(" AND ")}` : "";
    };
}

/**
 * Runs a page query that also returns COUNT(*) OVER() AS total_count, so the rows are
 * aggregated once instead of twice. Only a page past the end (no rows) needs the
 * separate count, which runs then and only then.
 */
async function runPagedQuery(dataRequest, dataSql, countQuery, page) {
    const { recordset } = await dataRequest.query(dataSql);
    let total = recordset[0]?.total_count;
    if (total === undefined) total = page > 1 ? await countQuery() : 0;
    const rows = recordset.map((row) => {
        const { total_count: _count, ...rest } = row;
        return rest;
    });
    return { rows, total: Number(total) || 0 };
}

/** Every (year, month, organisation) that has commodity or Ro-Ro / Ro-Pax rows, with its name. */
function periodKeysSql(where, searchSql) {
    return `
        WITH keyed AS (
            SELECT data.fiscal_year, data.month, data.organisation_id
            FROM tbl_traffic_commodity_data data
            WHERE 1 = 1 ${where("data")}
            GROUP BY data.fiscal_year, data.month, data.organisation_id
            UNION
            SELECT ro.fiscal_year, ro.month, ro.organisation_id
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE 1 = 1 ${where("ro")}
        ),
        named AS (
            SELECT k.*, org.organisation_name
            FROM keyed k
            INNER JOIN mmt_organisation org ON org.organisation_id = k.organisation_id
            WHERE 1 = 1 ${searchSql}
        )
    `;
}

async function listPeriods(conn, filters, page, limit) {
    const searchSql = filters.search
        ? `AND (org.organisation_name LIKE @search OR k.fiscal_year LIKE @search OR ${MONTH_NAME_SQL("k.month")} LIKE @search)`
        : "";
    const orderSql = (alias) => `${alias}.fiscal_year DESC, ${FISCAL_MONTH_ORDER_SQL(`${alias}.month`)} DESC, ${alias}.organisation_name`;

    const countRequest = conn.request();
    const countWhere = bindActualFilters(countRequest, filters);
    const dataRequest = conn.request();
    const dataWhere = bindActualFilters(dataRequest, filters);
    dataRequest.input("offset", sql.Int, (page - 1) * limit);
    dataRequest.input("limit", sql.Int, limit);

    const countQuery = async () => (await countRequest.query(
        `${periodKeysSql(countWhere, searchSql)} SELECT COUNT(*) AS total FROM named`
    )).recordset[0]?.total;

    // Page on the keys first; totals are summed only for the periods on this page
    return runPagedQuery(dataRequest, `
            ${periodKeysSql(dataWhere, searchSql)},
            page_keys AS (
                SELECT named.*, COUNT(*) OVER() AS total_count
                FROM named
                ORDER BY ${orderSql("named")}
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            )
            SELECT
                pk.fiscal_year, pk.month, pk.organisation_id, pk.organisation_name,
                c.total_tonnes, c.total_teu, ISNULL(c.commodity_count, 0) AS commodity_count,
                r.ro_ro_traffic, r.ro_pax_traffic,
                CASE WHEN c.last_updated IS NULL OR r.last_updated > c.last_updated
                     THEN r.last_updated ELSE c.last_updated END AS last_updated,
                pk.total_count
            FROM page_keys pk
            OUTER APPLY (
                SELECT
                    SUM(CASE WHEN data.commodity_id <> ${TEU_COMMODITY_ID} THEN data.value END) AS total_tonnes,
                    SUM(CASE WHEN data.commodity_id = ${TEU_COMMODITY_ID} THEN data.value END) AS total_teu,
                    COUNT(DISTINCT CASE WHEN data.value IS NOT NULL THEN data.commodity_id END) AS commodity_count,
                    MAX(COALESCE(data.updated_date, data.created_date)) AS last_updated
                FROM tbl_traffic_commodity_data data
                WHERE data.organisation_id = pk.organisation_id
                  AND data.fiscal_year = pk.fiscal_year
                  AND data.month = pk.month
            ) c
            OUTER APPLY (
                SELECT TOP 1 ro.ro_ro_traffic, ro.ro_pax_traffic,
                       COALESCE(ro.updated_date, ro.created_date) AS last_updated
                FROM tbl_traffic_ro_ro_pax_data ro
                WHERE ro.organisation_id = pk.organisation_id
                  AND ro.fiscal_year = pk.fiscal_year
                  AND ro.month = pk.month
                ORDER BY ro.id DESC
            ) r
            ORDER BY ${orderSql("pk")}
        `, countQuery, page);
}

async function listCommodityRows(conn, filters, page, limit) {
    const pivotSql = DIMENSION_COLUMNS.map(
        (d) => `SUM(CASE WHEN data.category_id = ${d.categoryId} AND data.direction_id = ${d.directionId} AND data.flag_type_id = ${d.flagTypeId} THEN data.value END) AS ${d.key}`
    ).join(",\n                ");
    const searchSql = filters.search
        ? "AND (org.organisation_name LIKE @search OR cg.commodity_group_name LIKE @search OR com.commodity_name LIKE @search)"
        : "";
    const orderSql = (alias) => `${alias}.fiscal_year DESC, ${FISCAL_MONTH_ORDER_SQL(`${alias}.month`)} DESC,
                     ${alias}.organisation_name, ${alias}.commodity_group_id, ${alias}.commodity_name`;

    // Phase 1 groups by keys only (cheap), so paging and the total never compute the pivot
    const keyedSql = (where) => `
        WITH keyed AS (
            SELECT data.fiscal_year, data.month, data.organisation_id, data.commodity_group_id, data.commodity_id
            FROM tbl_traffic_commodity_data data
            WHERE 1 = 1 ${where("data", { commodity: true })}
            GROUP BY data.fiscal_year, data.month, data.organisation_id, data.commodity_group_id, data.commodity_id
            HAVING COUNT(data.value) > 0
        ),
        named AS (
            SELECT k.*, org.organisation_name, cg.commodity_group_name, com.commodity_name
            FROM keyed k
            INNER JOIN mmt_organisation org ON org.organisation_id = k.organisation_id
            INNER JOIN mmt_traffic_commodity_group cg ON cg.commodity_group_id = k.commodity_group_id
            INNER JOIN mmt_traffic_commodity com ON com.commodity_id = k.commodity_id
            WHERE 1 = 1 ${searchSql}
        )
    `;

    const countRequest = conn.request();
    const countWhere = bindActualFilters(countRequest, filters);
    const dataRequest = conn.request();
    const dataWhere = bindActualFilters(dataRequest, filters);
    dataRequest.input("offset", sql.Int, (page - 1) * limit);
    dataRequest.input("limit", sql.Int, limit);

    const countQuery = async () => (await countRequest.query(
        `${keyedSql(countWhere)} SELECT COUNT(*) AS total FROM named`
    )).recordset[0]?.total;

    // Phase 2 computes the 20 pivot cells only for the rows on this page
    return runPagedQuery(dataRequest, `
            ${keyedSql(dataWhere)},
            page_keys AS (
                SELECT named.*, COUNT(*) OVER() AS total_count
                FROM named
                ORDER BY ${orderSql("named")}
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            )
            SELECT
                pk.fiscal_year, pk.month, pk.organisation_id, pk.organisation_name,
                pk.commodity_group_id, pk.commodity_group_name, pk.commodity_id, pk.commodity_name,
                ${pivotSql},
                SUM(data.value) AS row_total,
                pk.total_count
            FROM page_keys pk
            INNER JOIN tbl_traffic_commodity_data data
                ON data.organisation_id = pk.organisation_id
               AND data.fiscal_year = pk.fiscal_year
               AND data.month = pk.month
               AND data.commodity_id = pk.commodity_id
               AND data.commodity_group_id = pk.commodity_group_id
            GROUP BY pk.fiscal_year, pk.month, pk.organisation_id, pk.organisation_name,
                     pk.commodity_group_id, pk.commodity_group_name, pk.commodity_id, pk.commodity_name,
                     pk.total_count
            ORDER BY ${orderSql("pk")}
        `, countQuery, page);
}

async function listRoroRows(conn, filters, page, limit) {
    const searchSql = filters.search
        ? `AND (org.organisation_name LIKE @search OR ro.fiscal_year LIKE @search OR ${MONTH_NAME_SQL("ro.month")} LIKE @search)`
        : "";
    const fromSql = (where) => `
        FROM tbl_traffic_ro_ro_pax_data ro
        INNER JOIN mmt_organisation org ON org.organisation_id = ro.organisation_id
        WHERE (ro.ro_ro_traffic IS NOT NULL OR ro.ro_pax_traffic IS NOT NULL)
        ${where("ro")} ${searchSql}
    `;

    const countRequest = conn.request();
    const countWhere = bindActualFilters(countRequest, filters);
    const dataRequest = conn.request();
    const dataWhere = bindActualFilters(dataRequest, filters);
    dataRequest.input("offset", sql.Int, (page - 1) * limit);
    dataRequest.input("limit", sql.Int, limit);

    const [countResult, dataResult] = await Promise.all([
        countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`),
        dataRequest.query(`
            SELECT ro.fiscal_year, ro.month, ro.organisation_id, org.organisation_name,
                   ro.ro_ro_traffic, ro.ro_pax_traffic,
                   COALESCE(ro.updated_date, ro.created_date) AS last_updated
            ${fromSql(dataWhere)}
            ORDER BY ro.fiscal_year DESC, ${FISCAL_MONTH_ORDER_SQL("ro.month")} DESC, org.organisation_name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `),
    ]);

    return { rows: dataResult.recordset, total: countResult.recordset[0]?.total || 0 };
}

const LIST_VIEWS = {
    period: listPeriods,
    commodity: listCommodityRows,
    roro: listRoroRows,
};

async function getTrafficActuals(req, res) {
    const view = String(req.query.view || "period").toLowerCase();
    const list = LIST_VIEWS[view];
    if (!list) return sendError(res, 400, "Unknown list view.");

    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);
    const filters = {
        fiscalYear: req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null,
        month: parseMonth(req.query.month),
        organisationId: read.organisationId,
        commodityGroupId: toPositiveIntOrNull(req.query.commodityGroupId),
        commodityId: toPositiveIntOrNull(req.query.commodityId),
        search: String(req.query.search || "").trim().slice(0, 100),
    };
    if (req.query.fiscalYear && !filters.fiscalYear) {
        return sendError(res, 400, "Financial year must look like 2025-2026.");
    }

    try {
        const conn = await pool;
        const { rows, total } = await list(conn, filters, page, limit);
        return res.status(200).json({ data: rows, pagination: buildPagination(total, page, limit) });
    } catch (error) {
        console.error(`Error fetching traffic actuals (${view}):`, error);
        return sendError(res, 500, "Traffic data could not be loaded.");
    }
}

// ---------------------------------------------------------------------------
// Actuals — single period
// ---------------------------------------------------------------------------

async function loadPeriod(conn, organisationId, fiscalYear, month) {
    const commodityRequest = conn.request();
    const roroRequest = conn.request();
    [commodityRequest, roroRequest].forEach((r) => {
        r.input("organisationId", sql.Int, organisationId);
        r.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        r.input("month", sql.Int, month);
    });

    const [commodityResult, roroResult] = await Promise.all([
        commodityRequest.query(`
            SELECT commodity_group_id, commodity_id, category_id, direction_id, flag_type_id, value
            FROM tbl_traffic_commodity_data
            WHERE organisation_id = @organisationId AND fiscal_year = @fiscalYear AND month = @month
            ORDER BY commodity_id, category_id, direction_id, flag_type_id
        `),
        roroRequest.query(`
            SELECT ro_ro_traffic, ro_pax_traffic
            FROM tbl_traffic_ro_ro_pax_data
            WHERE organisation_id = @organisationId AND fiscal_year = @fiscalYear AND month = @month
        `),
    ]);

    const commodityData = commodityResult.recordset;
    const trafficData = roroResult.recordset[0] || null;
    const savedGroupIds = [...new Set(
        commodityData.filter((row) => row.value !== null).map((row) => Number(row.commodity_group_id))
    )];
    const roroSaved = Boolean(trafficData && (trafficData.ro_ro_traffic !== null || trafficData.ro_pax_traffic !== null));

    return {
        commodityData,
        trafficData: trafficData || { ro_ro_traffic: null, ro_pax_traffic: null },
        savedGroupIds,
        roroSaved,
        exists: savedGroupIds.length > 0 || roroSaved,
    };
}

async function getTrafficPeriod(req, res) {
    const fiscalYear = normaliseFiscalYear(req.query.fiscalYear);
    const month = parseMonth(req.query.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");

    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");
    if (!read.organisationId) return sendError(res, 400, "Select an organisation.");

    try {
        const conn = await pool;
        const [period, entryAccess] = await Promise.all([
            loadPeriod(conn, read.organisationId, fiscalYear, month),
            describeScope(req).isOrganisation
                ? getEntryAccess(conn, read.organisationId, fiscalYear, month)
                : Promise.resolve({ open: false, reason: "ministry" }),
        ]);
        return res.status(200).json({ success: true, ...period, entryAccess });
    } catch (error) {
        console.error("Error fetching traffic period:", error);
        return sendError(res, 500, "Traffic data for this period could not be loaded.");
    }
}

/** Validates commodity rows against the master and returns { rows, groupIds } or { error }. */
async function normaliseCommodityRows(conn, commodityData) {
    const masterResult = await conn.request().query(`
        SELECT commodity_id, commodity_group_id FROM mmt_traffic_commodity
    `);
    const groupByCommodity = new Map(
        masterResult.recordset.map((row) => [Number(row.commodity_id), Number(row.commodity_group_id)])
    );

    const rows = [];
    const seen = new Set();
    for (const item of commodityData) {
        const commodityId = Number(item?.commodity_id);
        const categoryId = Number(item?.category_id);
        const directionId = Number(item?.direction_id);
        const flagTypeId = Number(item?.flag_type_id);
        const groupId = groupByCommodity.get(commodityId);

        if (!groupId || !CATEGORY_IDS.includes(categoryId) || !DIRECTION_IDS.includes(directionId) || !FLAG_TYPE_IDS.includes(flagTypeId)) {
            return { error: "The traffic sheet contains an unknown commodity, category, direction or flag." };
        }
        const value = parseQuantity(item.value);
        if (value === undefined) {
            return { error: "Traffic values must be numbers of zero or more." };
        }
        const key = `${commodityId}_${categoryId}_${directionId}_${flagTypeId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ commodityId, groupId, categoryId, directionId, flagTypeId, value });
    }
    return { rows, groupIds: [...new Set(rows.map((r) => r.groupId))] };
}

async function upsertCommodityRows(transaction, { organisationId, fiscalYear, month, userId }, rows) {
    for (let start = 0; start < rows.length; start += UPSERT_BATCH_SIZE) {
        const batch = rows.slice(start, start + UPSERT_BATCH_SIZE);
        const request = new sql.Request(transaction);
        request.input("organisationId", sql.Int, organisationId);
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("month", sql.Int, month);
        request.input("userId", sql.Int, userId);

        const valuesSql = batch.map((row, i) => {
            request.input(`cm${i}`, sql.Int, row.commodityId);
            request.input(`cg${i}`, sql.Int, row.groupId);
            request.input(`ca${i}`, sql.Int, row.categoryId);
            request.input(`di${i}`, sql.Int, row.directionId);
            request.input(`fl${i}`, sql.Int, row.flagTypeId);
            request.input(`va${i}`, sql.Float, row.value);
            return `(@cm${i}, @cg${i}, @ca${i}, @di${i}, @fl${i}, @va${i})`;
        }).join(",\n");

        // Blank cells clear an existing value but never create empty rows
        await request.query(`
            MERGE tbl_traffic_commodity_data WITH (HOLDLOCK) AS target
            USING (VALUES ${valuesSql})
                AS src (commodity_id, commodity_group_id, category_id, direction_id, flag_type_id, value)
            ON target.organisation_id = @organisationId
               AND target.fiscal_year = @fiscalYear
               AND target.month = @month
               AND target.commodity_id = src.commodity_id
               AND target.category_id = src.category_id
               AND target.direction_id = src.direction_id
               AND target.flag_type_id = src.flag_type_id
            WHEN MATCHED THEN
                UPDATE SET value = src.value, updated_by = @userId, updated_date = GETDATE()
            WHEN NOT MATCHED BY TARGET AND src.value IS NOT NULL THEN
                INSERT (fiscal_year, month, organisation_id, commodity_group_id, commodity_id,
                        category_id, direction_id, flag_type_id, value, created_by, created_date)
                VALUES (@fiscalYear, @month, @organisationId, src.commodity_group_id, src.commodity_id,
                        src.category_id, src.direction_id, src.flag_type_id, src.value, @userId, GETDATE());
        `);
    }
}

async function upsertRoroRow(transaction, { organisationId, fiscalYear, month, userId }, { roRo, roPax }) {
    const request = new sql.Request(transaction);
    request.input("organisationId", sql.Int, organisationId);
    request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
    request.input("month", sql.Int, month);
    request.input("userId", sql.Int, userId);
    request.input("roRo", sql.Float, roRo);
    request.input("roPax", sql.Float, roPax);
    await request.query(`
        MERGE tbl_traffic_ro_ro_pax_data WITH (HOLDLOCK) AS target
        USING (SELECT @organisationId AS organisation_id, @fiscalYear AS fiscal_year, @month AS month) AS src
        ON target.organisation_id = src.organisation_id
           AND target.fiscal_year = src.fiscal_year
           AND target.month = src.month
        WHEN MATCHED THEN
            UPDATE SET ro_ro_traffic = @roRo, ro_pax_traffic = @roPax, updated_by = @userId, updated_date = GETDATE()
        WHEN NOT MATCHED BY TARGET AND (@roRo IS NOT NULL OR @roPax IS NOT NULL) THEN
            INSERT (fiscal_year, month, organisation_id, ro_ro_traffic, ro_pax_traffic, created_by, created_date)
            VALUES (@fiscalYear, @month, @organisationId, @roRo, @roPax, @userId, GETDATE());
    `);
}

/**
 * Saves one wizard page (a commodity group and/or Ro-Ro / Ro-Pax) for the caller's
 * organisation. A page that has no saved data yet needs Create; a saved page needs Update.
 */
async function saveTrafficPeriod(req, res) {
    const organisationId = requireOrganisationWriter(req, res);
    if (!organisationId) return undefined;

    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const fiscalYear = normaliseFiscalYear(req.body?.fiscalYear);
    const month = parseMonth(req.body?.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");
    if (isFuturePeriod(fiscalYear, month)) {
        return sendError(res, 400, `${MONTH_NAMES[month - 1]} ${fiscalYear} has not started yet.`);
    }

    const { commodityData, trafficData } = req.body || {};
    const hasCommodityPayload = Array.isArray(commodityData) && commodityData.length > 0;
    const hasRoroPayload = trafficData !== null && typeof trafficData === "object";
    if (!hasCommodityPayload && !hasRoroPayload) {
        return sendError(res, 400, "Nothing to save. Enter traffic values first.");
    }

    let roro = null;
    if (hasRoroPayload) {
        roro = { roRo: parseQuantity(trafficData.ro_ro_traffic), roPax: parseQuantity(trafficData.ro_pax_traffic) };
        if (roro.roRo === undefined || roro.roPax === undefined) {
            return sendError(res, 400, "Ro-Ro and Ro-Pax traffic must be numbers of zero or more.");
        }
    }

    const conn = await pool;
    let transaction = null;
    try {
        const access = await getEntryAccess(conn, organisationId, fiscalYear, month);
        if (!access.open) return sendError(res, 403, lockedMessage(fiscalYear, month));

        let commodity = { rows: [], groupIds: [] };
        if (hasCommodityPayload) {
            commodity = await normaliseCommodityRows(conn, commodityData);
            if (commodity.error) return sendError(res, 400, commodity.error);
        }

        // Create vs update is decided per page from what is already saved
        const existing = await loadPeriod(conn, organisationId, fiscalYear, month);
        const touchesSaved =
            commodity.groupIds.some((id) => existing.savedGroupIds.includes(id)) ||
            (hasRoroPayload && existing.roroSaved);
        const touchesNew =
            commodity.groupIds.some((id) => !existing.savedGroupIds.includes(id)) ||
            (hasRoroPayload && !existing.roroSaved);
        if (touchesSaved && !requirePermission(req, res, "update")) return undefined;
        if (touchesNew && !requirePermission(req, res, "create")) return undefined;

        const context = { organisationId, fiscalYear, month, userId };
        transaction = new sql.Transaction(conn);
        await transaction.begin();
        if (commodity.rows.length) await upsertCommodityRows(transaction, context, commodity.rows);
        if (roro) await upsertRoroRow(transaction, context, roro);
        await transaction.commit();

        return res.status(200).json({
            success: true,
            message: touchesSaved ? "Traffic data updated." : "Traffic data saved.",
            action: touchesSaved ? "update" : "create",
        });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error("Error saving traffic period:", error);
        return sendError(res, 500, "Traffic data could not be saved.");
    }
}

async function deleteTrafficPeriod(req, res) {
    const organisationId = requireOrganisationWriter(req, res);
    if (!organisationId) return undefined;

    const fiscalYear = normaliseFiscalYear(req.query.fiscalYear);
    const month = parseMonth(req.query.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");

    const conn = await pool;
    let transaction = null;
    try {
        const access = await getEntryAccess(conn, organisationId, fiscalYear, month);
        if (!access.open) return sendError(res, 403, lockedMessage(fiscalYear, month));

        transaction = new sql.Transaction(conn);
        await transaction.begin();
        // A transaction runs one request at a time, so delete sequentially
        let rowsDeleted = 0;
        for (const table of ["tbl_traffic_commodity_data", "tbl_traffic_ro_ro_pax_data"]) {
            const request = new sql.Request(transaction);
            request.input("organisationId", sql.Int, organisationId);
            request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
            request.input("month", sql.Int, month);
            const result = await request.query(`
                DELETE FROM ${table}
                WHERE organisation_id = @organisationId AND fiscal_year = @fiscalYear AND month = @month
            `);
            rowsDeleted += result.rowsAffected[0] || 0;
        }
        if (!rowsDeleted) {
            await transaction.rollback();
            return sendError(res, 404, "No traffic data was found for this period.");
        }
        await transaction.commit();
        return res.status(200).json({ success: true, message: "Traffic data deleted." });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error("Error deleting traffic period:", error);
        return sendError(res, 500, "Traffic data could not be deleted.");
    }
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

function percent(actual, target) {
    const t = Number(target);
    if (!Number.isFinite(t) || t <= 0) return null;
    return Number(((Number(actual || 0) * 100) / t).toFixed(2));
}

async function getTrafficTargets(req, res) {
    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
    if (req.query.fiscalYear && !fiscalYear) return sendError(res, 400, "Financial year must look like 2025-2026.");
    const search = String(req.query.search || "").trim().slice(0, 100);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const bind = (request) => {
        const parts = [];
        if (fiscalYear) {
            request.input("fyFilter", sql.NVarChar(20), fiscalYear);
            parts.push("t.financial_year = @fyFilter");
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("t.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push("(org.organisation_name LIKE @search OR t.financial_year LIKE @search)");
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };

    try {
        const conn = await pool;
        const countRequest = conn.request();
        const countWhere = bind(countRequest);
        const dataRequest = conn.request();
        const dataWhere = bind(dataRequest);
        dataRequest.input("offset", sql.Int, (page - 1) * limit);
        dataRequest.input("limit", sql.Int, limit);

        const [countResult, dataResult] = await Promise.all([
            countRequest.query(`
                SELECT COUNT(*) AS total
                FROM tbl_traffic_fiscal_target t
                INNER JOIN mmt_organisation org ON org.organisation_id = t.organisation_id
                WHERE 1 = 1 ${countWhere}
            `),
            // Same definitions as the Traffic dashboard: total = cargo tonnes (excl. TEU) + Ro-Ro, in MMT
            dataRequest.query(`
                WITH page_targets AS (
                    SELECT t.*, org.organisation_name
                    FROM tbl_traffic_fiscal_target t
                    INNER JOIN mmt_organisation org ON org.organisation_id = t.organisation_id
                    WHERE 1 = 1 ${dataWhere}
                    ORDER BY t.financial_year DESC, org.organisation_name
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                ),
                commodity_actuals AS (
                    SELECT cd.organisation_id, cd.fiscal_year,
                           SUM(CASE WHEN cd.commodity_id <> ${TEU_COMMODITY_ID} THEN ISNULL(cd.value, 0) ELSE 0 END) AS cargo_tonnes,
                           SUM(CASE WHEN cd.commodity_id = ${TEU_COMMODITY_ID} THEN ISNULL(cd.value, 0) ELSE 0 END) AS container_teu
                    FROM tbl_traffic_commodity_data cd
                    INNER JOIN page_targets pt
                        ON pt.organisation_id = cd.organisation_id AND pt.financial_year = cd.fiscal_year
                    GROUP BY cd.organisation_id, cd.fiscal_year
                ),
                roro_actuals AS (
                    SELECT ro.organisation_id, ro.fiscal_year,
                           SUM(ISNULL(ro.ro_ro_traffic, 0)) AS ro_ro,
                           SUM(ISNULL(ro.ro_pax_traffic, 0)) AS ro_pax
                    FROM tbl_traffic_ro_ro_pax_data ro
                    INNER JOIN page_targets pt
                        ON pt.organisation_id = ro.organisation_id AND pt.financial_year = ro.fiscal_year
                    GROUP BY ro.organisation_id, ro.fiscal_year
                )
                SELECT
                    pt.id, pt.financial_year, pt.organisation_id, pt.organisation_name,
                    pt.fiscal_year_target, pt.ro_ro_target, pt.ro_pax_target, pt.container_target_mteu,
                    -- Same as the earlier portal's Targets table: commodity tonnes (excl. TEU), in '000 tonnes
                    ISNULL(ca.cargo_tonnes, 0) AS fiscal_year_actual,
                    (ISNULL(ca.cargo_tonnes, 0) + ISNULL(ra.ro_ro, 0)) / 1000.0 AS total_actual_mmt,
                    ISNULL(ra.ro_ro, 0) / 1000.0 AS ro_ro_actual_mmt,
                    ISNULL(ra.ro_pax, 0) / 1000.0 AS ro_pax_actual_mmt,
                    ISNULL(ca.container_teu, 0) / 1000.0 AS container_actual_mteu,
                    COALESCE(pt.updated_date, pt.created_date) AS last_updated
                FROM page_targets pt
                LEFT JOIN commodity_actuals ca
                    ON ca.organisation_id = pt.organisation_id AND ca.fiscal_year = pt.financial_year
                LEFT JOIN roro_actuals ra
                    ON ra.organisation_id = pt.organisation_id AND ra.fiscal_year = pt.financial_year
                ORDER BY pt.financial_year DESC, pt.organisation_name
            `),
        ]);

        const rows = dataResult.recordset.map((row) => ({
            ...row,
            total_achievement: percent(row.total_actual_mmt, row.fiscal_year_target),
            ro_ro_achievement: percent(row.ro_ro_actual_mmt, row.ro_ro_target),
            ro_pax_achievement: percent(row.ro_pax_actual_mmt, row.ro_pax_target),
            container_achievement: percent(row.container_actual_mteu, row.container_target_mteu),
        }));
        const total = countResult.recordset[0]?.total || 0;
        return res.status(200).json({ data: rows, pagination: buildPagination(total, page, limit) });
    } catch (error) {
        console.error("Error fetching traffic targets:", error);
        return sendError(res, 500, "Traffic targets could not be loaded.");
    }
}

const TARGET_FIELDS = [
    { key: "fiscalYearTarget", column: "fiscal_year_target", label: "Total Traffic Target" },
    { key: "roRoTarget", column: "ro_ro_target", label: "Ro-Ro Target" },
    { key: "roPaxTarget", column: "ro_pax_target", label: "Ro-Pax Target" },
    { key: "containerTargetMteu", column: "container_target_mteu", label: "Container Target" },
];

function parseTargetValues(body) {
    const values = {};
    for (const field of TARGET_FIELDS) {
        const value = parseQuantity(body?.[field.key]);
        if (value === null) return { error: `${field.label} is required.` };
        if (value === undefined) return { error: `${field.label} must be a number of zero or more.` };
        values[field.column] = value;
    }
    return { values };
}

function bindTargetValues(request, values) {
    TARGET_FIELDS.forEach((field) => request.input(field.column, sql.Float, values[field.column]));
}

async function createTrafficTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Traffic targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const fiscalYear = normaliseFiscalYear(req.body?.financialYear);
    const organisationId = toPositiveIntOrNull(req.body?.organisationId);
    if (!fiscalYear) return sendError(res, 400, "Select a valid financial year.");
    if (!organisationId) return sendError(res, 400, "Select an organisation.");
    const { values, error } = parseTargetValues(req.body);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const organisation = await validateOrganisation(conn, organisationId);
        if (!organisation) return sendError(res, 400, "The selected organisation does not exist.");

        const request = conn.request();
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("organisationId", sql.Int, organisationId);
        request.input("userId", sql.Int, userId);
        bindTargetValues(request, values);
        const result = await request.query(`
            IF EXISTS (
                SELECT 1 FROM tbl_traffic_fiscal_target WITH (UPDLOCK, HOLDLOCK)
                WHERE financial_year = @fiscalYear AND organisation_id = @organisationId
            )
                SELECT CAST(NULL AS INT) AS id;
            ELSE
                INSERT INTO tbl_traffic_fiscal_target
                    (financial_year, organisation_id, fiscal_year_target, ro_ro_target, ro_pax_target,
                     container_target_mteu, created_by, created_date)
                OUTPUT INSERTED.id
                VALUES (@fiscalYear, @organisationId, @fiscal_year_target, @ro_ro_target, @ro_pax_target,
                        @container_target_mteu, @userId, GETDATE());
        `);

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `A target for ${organisation.organisation_name} in ${fiscalYear} already exists. Update it instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Target added." });
    } catch (error) {
        console.error("Error creating traffic target:", error);
        return sendError(res, 500, "The target could not be saved.");
    }
}

async function updateTrafficTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Traffic targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");
    const { values, error } = parseTargetValues(req.body);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        request.input("userId", sql.Int, userId);
        bindTargetValues(request, values);
        const result = await request.query(`
            UPDATE tbl_traffic_fiscal_target
            SET fiscal_year_target = @fiscal_year_target,
                ro_ro_target = @ro_ro_target,
                ro_pax_target = @ro_pax_target,
                container_target_mteu = @container_target_mteu,
                updated_by = @userId,
                updated_date = GETDATE()
            WHERE id = @id
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "This target no longer exists.");
        return res.status(200).json({ success: true, message: "Target updated." });
    } catch (error) {
        console.error("Error updating traffic target:", error);
        return sendError(res, 500, "The target could not be updated.");
    }
}

async function deleteTrafficTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Traffic targets")) return undefined;
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        const result = await request.query("DELETE FROM tbl_traffic_fiscal_target WHERE id = @id");
        if (!result.rowsAffected[0]) return sendError(res, 404, "This target no longer exists.");
        return res.status(200).json({ success: true, message: "Target deleted." });
    } catch (error) {
        console.error("Error deleting traffic target:", error);
        return sendError(res, 500, "The target could not be deleted.");
    }
}

const TrafficEntry = {
    getTrafficMasters,
    getTrafficActuals,
    getTrafficPeriod,
    saveTrafficPeriod,
    deleteTrafficPeriod,
    getTrafficEntryStatus: access.getEntryStatus,
    getTrafficTargets,
    createTrafficTarget,
    updateTrafficTarget,
    deleteTrafficTarget,
    getTrafficAccessGrants: access.listGrants,
    createTrafficAccessGrant: access.createGrant,
    revokeTrafficAccessGrant: access.revokeGrant,
};

export default TrafficEntry;
