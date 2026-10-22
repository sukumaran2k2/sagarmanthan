import sql from "mssql";
import { pool } from "../../db.js";
import {
    MONTH_NAMES,
    MONTH_NAME_SQL,
    FISCAL_MONTH_ORDER_SQL,
    sendError,
    toPositiveIntOrNull,
    resolveUserId,
    normaliseFiscalYear,
    parseMonth,
    currentFinancialYear,
    isFuturePeriod,
    describeScope,
    resolveReadOrganisation,
    requireOrganisationWriter,
    requireMinistryWriter,
    requirePermission,
    buildPagination,
    parseListQuery,
    createEntryAccess,
} from "./kpiEntryCommon.js";
import {
    ALL_COLUMNS,
    LIST_VIEW_COLUMNS,
    PORT_PERFORMANCE_SECTIONS,
    SECTION_BY_ID,
} from "./portPerformanceFields.js";

/**
 * KPI Major Ports — Port Performance (the earlier portal's "KPI Time Performance").
 *
 * Who does what (enforced here, not only in the UI):
 *  - Organisation users enter one monthly record for their own organisation, one input step
 *    at a time (tbl_kpi_time_performance). The organisation and user come from the JWT.
 *  - Ministry users see every organisation, maintain the financial-year targets per KPI type
 *    (tbl_kpi_time_performance_target) and grant/revoke late-entry access (module_id 2).
 *  - The entry window and unlock rules are shared with Traffic (kpiEntryCommon.js).
 *  - CRUD flags come from the user's KPI_MAJOR_PORTS permission (route middleware plus
 *    requirePermission for create-vs-update decided at runtime).
 */

const MODULE_CODE = "KPI_MAJOR_PORTS";
const PORT_ORG_CATEGORY_ID = 1;

// module_id used for Port Performance in ministry_access_module_audit_track (1 = Traffic)
const access = createEntryAccess({ moduleId: "2", subject: "port performance" });
const { getEntryAccess, lockedMessage } = access;

// decimal(12,2) columns hold up to 9,999,999,999.99
const MAX_VALUE = 9999999999;

const OVERALL_ROW = "overall";
const TOTAL_SMPA_ROW = "total-smpa";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireOrganisation(req, res) {
    return requireOrganisationWriter(req, res, "Port performance actuals are entered by the port organisation. Ministry users can view them.");
}

function requireAction(req, res, action) {
    return requirePermission(req, res, MODULE_CODE, action);
}

/** Parses one value for a field; returns { value } or { error }. Blank is null. */
function parseFieldValue(field, raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null };
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: "must be a number of zero or more" };
    if (n > MAX_VALUE) return { error: "is too large" };
    if (field.kind === "count" && !Number.isInteger(n)) return { error: "must be a whole number" };
    if (field.kind === "percent" && n > 100) return { error: "cannot be more than 100%" };
    return { value: n };
}

/** SQL that is 1 when any of the section's columns has a value. */
const sectionSavedSql = (section, alias) =>
    `CASE WHEN ${section.fields.map((f) => `${alias}.${f.column} IS NOT NULL`).join(" OR ")} THEN 1 ELSE 0 END`;

const SECTIONS_SAVED_SQL = (alias) => PORT_PERFORMANCE_SECTIONS.map((s) => sectionSavedSql(s, alias)).join(" + ");

function savedSectionIds(row) {
    if (!row) return [];
    return PORT_PERFORMANCE_SECTIONS
        .filter((s) => s.fields.some((f) => row[f.column] !== null && row[f.column] !== undefined))
        .map((s) => s.id);
}

function pickValues(row, columns) {
    return Object.fromEntries(columns.map((c) => [c, row?.[c] ?? null]));
}

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------

// Reference data rarely changes: keep it for a few minutes per organisation scope
const MASTERS_TTL_MS = 5 * 60 * 1000;
const mastersCache = new Map(); // scope key -> { body, at }

async function loadKpiTypes(conn) {
    const result = await conn.request().query(`
        SELECT kpi_type_id, kpi_name FROM mmt_kpi_time_performance_type ORDER BY kpi_type_id
    `);
    return result.recordset
        .map((row) => ({ kpi_type_id: Number(row.kpi_type_id), kpi_name: String(row.kpi_name || "").trim() }))
        .filter((row) => Number.isInteger(row.kpi_type_id) && row.kpi_type_id > 0);
}

async function getPortPerformanceMasters(req, res) {
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
        // Major ports first, then the other bodies that report port performance (e.g. state maritime boards)
        let orgFilter = `
            WHERE org.organisation_category_id = @portCategoryId
               OR EXISTS (SELECT 1 FROM tbl_kpi_time_performance p WHERE p.organisation_id = org.organisation_id)
               OR EXISTS (SELECT 1 FROM tbl_kpi_time_performance_target t WHERE t.organisation_id = org.organisation_id)
        `;
        if (read.organisationId) {
            orgRequest.input("organisationId", sql.Int, read.organisationId);
            orgFilter = "WHERE org.organisation_id = @organisationId";
        }

        const [organisations, kpiTypes] = await Promise.all([
            orgRequest.query(`
                SELECT org.organisation_id, org.organisation_name,
                       CASE WHEN org.organisation_category_id = @portCategoryId THEN 1 ELSE 0 END AS is_major_port
                FROM mmt_organisation org
                ${orgFilter}
                ORDER BY CASE WHEN org.organisation_category_id = @portCategoryId THEN 0 ELSE 1 END, org.organisation_name
            `),
            loadKpiTypes(conn),
        ]);

        const body = {
            organisations: organisations.recordset.map((o) => ({ ...o, is_major_port: Boolean(o.is_major_port) })),
            kpiTypes,
        };
        mastersCache.set(cacheKey, { body, at: Date.now() });
        return res.status(200).json({ ...body, currentFinancialYear: currentFinancialYear() });
    } catch (error) {
        console.error("Error fetching port performance masters:", error);
        return sendError(res, 500, "Port performance reference data could not be loaded.");
    }
}

// ---------------------------------------------------------------------------
// Actuals — list
// ---------------------------------------------------------------------------

async function getPortPerformanceActuals(req, res) {
    const view = String(req.query.view || "turnaround");
    const viewColumns = LIST_VIEW_COLUMNS[view];
    if (!viewColumns) return sendError(res, 400, "Unknown list view.");

    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
    if (req.query.fiscalYear && !fiscalYear) return sendError(res, 400, "Financial year must look like 2025-2026.");
    const month = parseMonth(req.query.month);
    const { page, limit, search } = parseListQuery(req.query);

    const bind = (request) => {
        const parts = [];
        if (fiscalYear) {
            request.input("fyFilter", sql.NVarChar(20), fiscalYear);
            parts.push("p.fiscal_year = @fyFilter");
        }
        if (month) {
            request.input("monthFilter", sql.Int, month);
            parts.push("p.month = @monthFilter");
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("p.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push(`(org.organisation_name LIKE @search OR p.fiscal_year LIKE @search OR ${MONTH_NAME_SQL("p.month")} LIKE @search)`);
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_kpi_time_performance p
        INNER JOIN mmt_organisation org ON org.organisation_id = p.organisation_id
        WHERE p.fiscal_year IS NOT NULL AND p.month BETWEEN 1 AND 12 ${where}
    `;

    try {
        const conn = await pool;
        const dataRequest = conn.request();
        const dataWhere = bind(dataRequest);
        dataRequest.input("offset", sql.Int, (page - 1) * limit);
        dataRequest.input("limit", sql.Int, limit);

        const { recordset } = await dataRequest.query(`
            SELECT p.fiscal_year, p.month, p.organisation_id, org.organisation_name,
                   ${viewColumns.map((c) => `p.${c}`).join(", ")},
                   ${SECTIONS_SAVED_SQL("p")} AS sections_saved,
                   COALESCE(p.updated_date, p.created_date) AS last_updated,
                   COUNT(*) OVER() AS total_count
            ${fromSql(dataWhere)}
            ORDER BY p.fiscal_year DESC, ${FISCAL_MONTH_ORDER_SQL("p.month")} DESC, org.organisation_name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        // A page past the end has no rows to carry the total; count separately only then
        let total = recordset[0]?.total_count;
        if (total === undefined && page > 1) {
            const countRequest = conn.request();
            const countWhere = bind(countRequest);
            total = (await countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`)).recordset[0]?.total;
        }
        const rows = recordset.map(({ total_count: _count, ...row }) => ({
            ...row,
            sections_total: PORT_PERFORMANCE_SECTIONS.length,
        }));
        return res.status(200).json({ data: rows, pagination: buildPagination(Number(total) || 0, page, limit) });
    } catch (error) {
        console.error(`Error fetching port performance actuals (${view}):`, error);
        return sendError(res, 500, "Port performance data could not be loaded.");
    }
}

// ---------------------------------------------------------------------------
// Actuals — single period
// ---------------------------------------------------------------------------

async function loadPeriodRow(conn, organisationId, fiscalYear, month) {
    const request = conn.request();
    request.input("organisationId", sql.Int, organisationId);
    request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
    request.input("month", sql.Int, month);
    const result = await request.query(`
        SELECT ${ALL_COLUMNS.join(", ")}
        FROM tbl_kpi_time_performance
        WHERE organisation_id = @organisationId AND fiscal_year = @fiscalYear AND month = @month
    `);
    return result.recordset[0] || null;
}

async function getPortPerformancePeriod(req, res) {
    const fiscalYear = normaliseFiscalYear(req.query.fiscalYear);
    const month = parseMonth(req.query.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");

    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");
    if (!read.organisationId) return sendError(res, 400, "Select an organisation.");

    try {
        const conn = await pool;
        const [row, entryAccess] = await Promise.all([
            loadPeriodRow(conn, read.organisationId, fiscalYear, month),
            describeScope(req).isOrganisation
                ? getEntryAccess(conn, read.organisationId, fiscalYear, month)
                : Promise.resolve({ open: false, reason: "ministry" }),
        ]);
        return res.status(200).json({
            success: true,
            exists: Boolean(row),
            values: pickValues(row, ALL_COLUMNS),
            savedSections: savedSectionIds(row),
            entryAccess,
        });
    } catch (error) {
        console.error("Error fetching port performance period:", error);
        return sendError(res, 500, "Port performance data for this period could not be loaded.");
    }
}

/** Validates a step's values; every field of the step is required, as in the earlier portal. */
function parseSectionValues(section, values) {
    if (!values || typeof values !== "object" || Array.isArray(values)) {
        return { error: "Nothing to save. Enter the values of this step first." };
    }
    const allowed = new Set(section.fields.map((f) => f.column));
    const unknown = Object.keys(values).filter((key) => !allowed.has(key));
    if (unknown.length) return { error: `${section.label} does not have the field(s): ${unknown.join(", ")}.` };

    const parsed = {};
    const missing = [];
    for (const field of section.fields) {
        const result = parseFieldValue(field, values[field.column]);
        if (result.error) return { error: `${section.label}: ${field.column.replace(/_/g, " ")} ${result.error}.` };
        if (result.value === null) missing.push(field.column);
        parsed[field.column] = result.value;
    }
    if (missing.length) {
        return { error: `${section.label}: enter all ${section.fields.length} values (${missing.length} missing).` };
    }
    return { values: parsed };
}

/**
 * Saves one input step for the caller's organisation and period. A step that has no
 * saved values yet needs Create; a step that was saved before needs Update.
 */
async function savePortPerformancePeriod(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;

    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const fiscalYear = normaliseFiscalYear(req.body?.fiscalYear);
    const month = parseMonth(req.body?.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");
    if (isFuturePeriod(fiscalYear, month)) {
        return sendError(res, 400, `${MONTH_NAMES[month - 1]} ${fiscalYear} has not started yet.`);
    }

    const section = SECTION_BY_ID.get(String(req.body?.section || ""));
    if (!section) return sendError(res, 400, "Unknown input step.");
    const { values, error } = parseSectionValues(section, req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const accessResult = await getEntryAccess(conn, organisationId, fiscalYear, month);
        if (!accessResult.open) return sendError(res, 403, lockedMessage(fiscalYear, month));

        const existing = await loadPeriodRow(conn, organisationId, fiscalYear, month);
        const isUpdate = savedSectionIds(existing).includes(section.id);
        if (!requireAction(req, res, isUpdate ? "update" : "create")) return undefined;

        const request = conn.request();
        request.input("organisationId", sql.Int, organisationId);
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("month", sql.Int, month);
        request.input("userId", sql.Int, userId);
        const columns = section.fields.map((f) => f.column);
        columns.forEach((column, i) => request.input(`v${i}`, sql.Decimal(18, 2), values[column]));

        // One statement, so a first save of two steps at once can never create two records
        await request.query(`
            MERGE tbl_kpi_time_performance WITH (HOLDLOCK) AS target
            USING (SELECT @organisationId AS organisation_id, @fiscalYear AS fiscal_year, @month AS month) AS src
            ON target.organisation_id = src.organisation_id
               AND target.fiscal_year = src.fiscal_year
               AND target.month = src.month
            WHEN MATCHED THEN
                UPDATE SET ${columns.map((c, i) => `${c} = @v${i}`).join(", ")},
                           updated_by = @userId, updated_date = GETDATE()
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (fiscal_year, month, organisation_id, ${columns.join(", ")}, created_by, created_date)
                VALUES (@fiscalYear, @month, @organisationId, ${columns.map((_, i) => `@v${i}`).join(", ")}, @userId, GETDATE());
        `);

        return res.status(200).json({
            success: true,
            action: isUpdate ? "update" : "create",
            message: isUpdate ? `${section.label} updated.` : `${section.label} saved.`,
        });
    } catch (err) {
        console.error("Error saving port performance period:", err);
        return sendError(res, 500, "Port performance data could not be saved.");
    }
}

async function deletePortPerformancePeriod(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;

    const fiscalYear = normaliseFiscalYear(req.query.fiscalYear);
    const month = parseMonth(req.query.month);
    if (!fiscalYear || !month) return sendError(res, 400, "Select a valid financial year and month.");

    try {
        const conn = await pool;
        const accessResult = await getEntryAccess(conn, organisationId, fiscalYear, month);
        if (!accessResult.open) return sendError(res, 403, lockedMessage(fiscalYear, month));

        const request = conn.request();
        request.input("organisationId", sql.Int, organisationId);
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("month", sql.Int, month);
        const result = await request.query(`
            DELETE FROM tbl_kpi_time_performance
            WHERE organisation_id = @organisationId AND fiscal_year = @fiscalYear AND month = @month
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "No port performance data was found for this period.");
        return res.status(200).json({ success: true, message: "Port performance data deleted." });
    } catch (error) {
        console.error("Error deleting port performance period:", error);
        return sendError(res, 500, "Port performance data could not be deleted.");
    }
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/** "org-9" | "overall" | "total-smpa" → { key, organisationId?, isOverall, isTotalSmpa } or null. */
function parseRowKey(raw) {
    const key = String(raw || "").toLowerCase();
    if (key === OVERALL_ROW) return { key, organisationId: null, isOverall: true, isTotalSmpa: false };
    if (key === TOTAL_SMPA_ROW) return { key, organisationId: null, isOverall: false, isTotalSmpa: true };
    const match = key.match(/^org-(\d+)$/);
    const organisationId = match ? toPositiveIntOrNull(match[1]) : null;
    return organisationId ? { key, organisationId, isOverall: false, isTotalSmpa: false } : null;
}

/** WHERE fragment that selects one target row's cells (binds @rowOrgId when needed). */
function bindRowCondition(request, row, alias = "t") {
    if (row.isOverall) return `${alias}.organisation_id IS NULL AND ${alias}.is_overall = 1`;
    if (row.isTotalSmpa) return `${alias}.organisation_id IS NULL AND ${alias}.is_totalSmpa = 1`;
    request.input("rowOrgId", sql.Int, row.organisationId);
    return `${alias}.organisation_id = @rowOrgId AND ISNULL(${alias}.is_overall, 0) = 0 AND ISNULL(${alias}.is_totalSmpa, 0) = 0`;
}

// Each stored cell with the key of the row it belongs to; cells of deleted organisations are skipped
const TARGET_CELLS_SQL = `
    SELECT t.financial_year, t.kpi_type_id, t.target_value, t.organisation_id,
           CASE WHEN t.organisation_id IS NULL AND t.is_overall = 1 THEN '${OVERALL_ROW}'
                WHEN t.organisation_id IS NULL AND t.is_totalSmpa = 1 THEN '${TOTAL_SMPA_ROW}'
                ELSE CONCAT('org-', t.organisation_id) END AS row_key,
           COALESCE(t.updated_date, t.created_date) AS changed_on
    FROM tbl_kpi_time_performance_target t
    WHERE t.financial_year IS NOT NULL
      AND (
            (t.organisation_id IS NULL AND (t.is_overall = 1 OR t.is_totalSmpa = 1))
         OR (t.organisation_id IS NOT NULL AND ISNULL(t.is_overall, 0) = 0 AND ISNULL(t.is_totalSmpa, 0) = 0
             AND EXISTS (SELECT 1 FROM mmt_organisation o WHERE o.organisation_id = t.organisation_id))
          )
`;

async function getPortPerformanceTargets(req, res) {
    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");
    const scope = describeScope(req);

    const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
    if (req.query.fiscalYear && !fiscalYear) return sendError(res, 400, "Financial year must look like 2025-2026.");
    const aggregateFilter = scope.isMinistry && [OVERALL_ROW, TOTAL_SMPA_ROW].includes(String(req.query.organisationId))
        ? String(req.query.organisationId)
        : null;
    const { page, limit, search } = parseListQuery(req.query);

    try {
        const conn = await pool;
        const kpiTypes = await loadKpiTypes(conn);
        const pivotSql = kpiTypes
            .map(({ kpi_type_id: id }) => `MAX(CASE WHEN c.kpi_type_id = ${id} THEN c.target_value END) AS kpi_${id}`)
            .join(",\n");

        const request = conn.request();
        const parts = [];
        if (fiscalYear) {
            request.input("fyFilter", sql.NVarChar(20), fiscalYear);
            parts.push("g.financial_year = @fyFilter");
        }
        if (aggregateFilter) {
            request.input("rowFilter", sql.NVarChar(20), aggregateFilter);
            parts.push("g.row_key = @rowFilter");
        } else if (read.organisationId) {
            request.input("rowFilter", sql.NVarChar(20), `org-${read.organisationId}`);
            parts.push("g.row_key = @rowFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push("(g.organisation_name LIKE @search OR g.financial_year LIKE @search)");
        }
        request.input("offset", sql.Int, (page - 1) * limit);
        request.input("limit", sql.Int, limit);

        const { recordset } = await request.query(`
            WITH cells AS (${TARGET_CELLS_SQL}),
            grouped AS (
                SELECT c.financial_year, c.row_key, MAX(c.organisation_id) AS organisation_id,
                       COALESCE(MAX(org.organisation_name),
                                CASE c.row_key WHEN '${OVERALL_ROW}' THEN 'Overall' ELSE 'Total SMPA' END) AS organisation_name,
                       ${pivotSql ? `${pivotSql},` : ""}
                       COUNT(c.target_value) AS targets_set,
                       MAX(c.changed_on) AS last_updated
                FROM cells c
                LEFT JOIN mmt_organisation org ON org.organisation_id = c.organisation_id
                GROUP BY c.financial_year, c.row_key
            )
            SELECT g.*, COUNT(*) OVER() AS total_count
            FROM grouped g
            WHERE 1 = 1 ${parts.length ? `AND ${parts.join(" AND ")}` : ""}
            ORDER BY g.financial_year DESC,
                     CASE g.row_key WHEN '${TOTAL_SMPA_ROW}' THEN 1 WHEN '${OVERALL_ROW}' THEN 2 ELSE 0 END,
                     g.organisation_name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        const total = Number(recordset[0]?.total_count) || 0;
        const rows = recordset.map(({ total_count: _count, ...row }) => row);
        return res.status(200).json({ data: rows, pagination: buildPagination(total, page, limit) });
    } catch (error) {
        console.error("Error fetching port performance targets:", error);
        return sendError(res, 500, "Port performance targets could not be loaded.");
    }
}

/** Organisation users may read their own row only. */
function resolveTargetRow(req, res, rawKey) {
    const row = parseRowKey(rawKey);
    if (!row) {
        sendError(res, 400, "Select an organisation, Total SMPA or Overall.");
        return null;
    }
    const scope = describeScope(req);
    if (!scope.isMinistry && row.organisationId !== scope.organisationId) {
        sendError(res, 403, "You can only view the targets of your organisation.");
        return null;
    }
    return row;
}

async function loadTargetRecord(conn, fiscalYear, row) {
    const request = conn.request();
    request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
    const rowSql = bindRowCondition(request, row);
    const result = await request.query(`
        SELECT t.kpi_type_id, t.target_value
        FROM tbl_kpi_time_performance_target t
        WHERE t.financial_year = @fiscalYear AND ${rowSql}
    `);
    return Object.fromEntries(result.recordset.map((r) => [r.kpi_type_id, r.target_value]));
}

async function getPortPerformanceTargetRecord(req, res) {
    const fiscalYear = normaliseFiscalYear(req.query.financialYear);
    if (!fiscalYear) return sendError(res, 400, "Select a valid financial year.");
    const row = resolveTargetRow(req, res, req.query.rowKey);
    if (!row) return undefined;

    try {
        const conn = await pool;
        const values = await loadTargetRecord(conn, fiscalYear, row);
        return res.status(200).json({ success: true, exists: Object.keys(values).length > 0, values });
    } catch (error) {
        console.error("Error fetching port performance target:", error);
        return sendError(res, 500, "The target could not be loaded.");
    }
}

/**
 * Saves the targets of one row (organisation, Total SMPA or Overall) for a financial year.
 * values: { [kpiTypeId]: number | null }; null clears that KPI's target.
 * A row with no targets yet needs Create; changing an existing row needs Update.
 */
async function savePortPerformanceTargetRecord(req, res) {
    if (!requireMinistryWriter(req, res, "Port performance targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const fiscalYear = normaliseFiscalYear(req.body?.financialYear);
    if (!fiscalYear) return sendError(res, 400, "Select a valid financial year.");
    const row = parseRowKey(req.body?.rowKey);
    if (!row) return sendError(res, 400, "Select an organisation, Total SMPA or Overall.");
    const rawValues = req.body?.values;
    if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
        return sendError(res, 400, "Enter at least one target.");
    }

    try {
        const conn = await pool;
        const kpiTypes = await loadKpiTypes(conn);
        const typeById = new Map(kpiTypes.map((t) => [t.kpi_type_id, t]));

        const cells = [];
        for (const [rawId, rawValue] of Object.entries(rawValues)) {
            const type = typeById.get(Number(rawId));
            if (!type) return sendError(res, 400, `Unknown KPI type: ${rawId}.`);
            const kind = /%/.test(type.kpi_name) ? "percent" : "decimal";
            const result = parseFieldValue({ kind }, rawValue);
            if (result.error) return sendError(res, 400, `${type.kpi_name} ${result.error}.`);
            cells.push({ kpiTypeId: type.kpi_type_id, value: result.value });
        }
        if (!cells.some((c) => c.value !== null)) return sendError(res, 400, "Enter at least one target.");

        if (row.organisationId) {
            const orgRequest = conn.request();
            orgRequest.input("organisationId", sql.Int, row.organisationId);
            const org = await orgRequest.query("SELECT 1 AS ok FROM mmt_organisation WHERE organisation_id = @organisationId");
            if (!org.recordset.length) return sendError(res, 400, "The selected organisation does not exist.");
        }

        const existing = await loadTargetRecord(conn, fiscalYear, row);
        const isUpdate = Object.keys(existing).length > 0;
        if (!requireAction(req, res, isUpdate ? "update" : "create")) return undefined;

        const request = conn.request();
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("organisationId", sql.Int, row.organisationId);
        request.input("isOverall", sql.Bit, row.isOverall);
        request.input("isTotalSmpa", sql.Bit, row.isTotalSmpa);
        request.input("userId", sql.Int, userId);
        const valuesSql = cells.map((cell, i) => {
            request.input(`k${i}`, sql.Int, cell.kpiTypeId);
            request.input(`v${i}`, sql.Decimal(18, 2), cell.value);
            return `(@k${i}, @v${i})`;
        }).join(", ");
        const rowSql = bindRowCondition(request, row, "target");

        // Blank cells clear an existing target but never create empty rows
        await request.query(`
            MERGE tbl_kpi_time_performance_target WITH (HOLDLOCK) AS target
            USING (VALUES ${valuesSql}) AS src (kpi_type_id, target_value)
            ON target.financial_year = @fiscalYear AND target.kpi_type_id = src.kpi_type_id AND ${rowSql}
            WHEN MATCHED AND src.target_value IS NULL THEN DELETE
            WHEN MATCHED THEN
                UPDATE SET target_value = src.target_value, updated_by = @userId, updated_date = GETDATE()
            WHEN NOT MATCHED BY TARGET AND src.target_value IS NOT NULL THEN
                INSERT (financial_year, kpi_type_id, organisation_id, target_value, is_overall, is_totalSmpa, created_by, created_date)
                VALUES (@fiscalYear, src.kpi_type_id, @organisationId, src.target_value, @isOverall, @isTotalSmpa, @userId, GETDATE());
        `);

        return res.status(isUpdate ? 200 : 201).json({
            success: true,
            action: isUpdate ? "update" : "create",
            message: isUpdate ? "Targets updated." : "Targets added.",
        });
    } catch (error) {
        console.error("Error saving port performance targets:", error);
        return sendError(res, 500, "The targets could not be saved.");
    }
}

async function deletePortPerformanceTargetRecord(req, res) {
    if (!requireMinistryWriter(req, res, "Port performance targets")) return undefined;
    const fiscalYear = normaliseFiscalYear(req.query.financialYear);
    if (!fiscalYear) return sendError(res, 400, "Select a valid financial year.");
    const row = parseRowKey(req.query.rowKey);
    if (!row) return sendError(res, 400, "Select an organisation, Total SMPA or Overall.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        const rowSql = bindRowCondition(request, row);
        const result = await request.query(`
            DELETE t FROM tbl_kpi_time_performance_target t
            WHERE t.financial_year = @fiscalYear AND ${rowSql}
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "These targets no longer exist.");
        return res.status(200).json({ success: true, message: "Targets deleted." });
    } catch (error) {
        console.error("Error deleting port performance targets:", error);
        return sendError(res, 500, "The targets could not be deleted.");
    }
}

const PortPerformanceEntry = {
    getPortPerformanceMasters,
    getPortPerformanceEntryStatus: access.getEntryStatus,
    getPortPerformanceActuals,
    getPortPerformancePeriod,
    savePortPerformancePeriod,
    deletePortPerformancePeriod,
    getPortPerformanceTargets,
    getPortPerformanceTargetRecord,
    savePortPerformanceTargetRecord,
    deletePortPerformanceTargetRecord,
    getPortPerformanceAccessGrants: access.listGrants,
    createPortPerformanceAccessGrant: access.createGrant,
    revokePortPerformanceAccessGrant: access.revokeGrant,
};

export default PortPerformanceEntry;
