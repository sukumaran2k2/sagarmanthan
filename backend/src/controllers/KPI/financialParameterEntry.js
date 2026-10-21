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
    resolveReadOrganisation,
    requireOrganisationWriter,
    requireMinistryWriter,
    validateOrganisation,
    buildPagination,
    parseListQuery,
} from "./kpiEntryCommon.js";

/**
 * KPI Major Ports — Financial Parameters (the earlier portal's "Financial Parameters for Major Ports").
 *
 * Who does what (enforced here, not only in the UI):
 *  - Organisation users enter one monthly record for their own organisation
 *    (tbl_financial_parameter). The organisation and user come from the JWT.
 *  - Ministry users see every organisation and maintain one set of financial-year targets
 *    per organisation (tbl_financial_paramaters_mopsw_target). They do not enter actuals.
 *  - Unlike Traffic and Port Performance there is no monthly entry window: as in the earlier
 *    portal, any month that has started can be added, updated or deleted.
 *  - CRUD flags come from the user's KPI_MAJOR_PORTS permission (route middleware).
 *
 * Stored formats kept for the existing reports and dashboard (controllers/Reports/financialReport.js,
 * controllers/KPI/financialParameter.js): month is text ("4"), year is the calendar year of that
 * month and annually_financial_year is "2025-2026". Older rows may hold "2025 - 2026", so every
 * lookup compares the year with spaces removed.
 */

const PORT_ORG_CATEGORY_ID = 1;

// decimal(12,2) columns hold up to 9,999,999,999.99
const MAX_VALUE = 9999999999;

/**
 * Monthly values entered by the organisation, in form order.
 * kind "amount": zero or more; "signed": may be negative (an operating loss).
 * The frontend mirrors this in modules/MajorPorts/pages/FinancialParameters/financialParametersConfig.js.
 */
const ACTUAL_FIELDS = [
    { column: "operating_income", label: "Operating Income", kind: "amount", required: true },
    { column: "operating_expenditure", label: "Operating Expenditure", kind: "amount", required: true },
    { column: "total_income", label: "Total Income", kind: "amount", required: true },
    { column: "total_expenditure", label: "Total Expenditure", kind: "amount", required: true },
    { column: "per_tonne_handling_cost", label: "Per Tonne Handling Cost", kind: "amount", required: true },
    { column: "operating_profit_tonne", label: "Operating Profit / Tonne", kind: "signed", required: true },
    { column: "teu_container", label: "Operating Profit / TEU of Container", kind: "signed", required: false },
    { column: "tonne_dry_bulk", label: "Operating Profit / Tonne of Dry Bulk", kind: "signed", required: false },
    { column: "tonne_break_bulk", label: "Operating Profit / Tonne of Break Bulk", kind: "signed", required: false },
    { column: "tonne_liquid_bulk", label: "Operating Profit / Tonne of Liquid Bulk", kind: "signed", required: false },
];

// Calculated here from the values above, never taken from the request
const DERIVED_COLUMNS = ["operating_surplus", "operating_ratio", "net_surplus"];

const ACTUAL_COLUMNS = [...ACTUAL_FIELDS.map((f) => f.column), ...DERIVED_COLUMNS];

/** Financial-year targets set by the Ministry; key is the API name, column the stored one. */
const TARGET_FIELDS = [
    { key: "target_operating_profit", column: "target_operating_profit", label: "Target Operating Profit / Tonne" },
    { key: "target_teu_container", column: "target_teu_container", label: "Target Operating Profit / TEU of Container" },
    { key: "target_tonof_drybulk", column: "target_tonof_drybulk", label: "Target Operating Profit / Tonne of Dry Bulk" },
    { key: "target_tonof_breakbulk", column: "target_tonof_Breakbulk", label: "Target Operating Profit / Tonne of Break Bulk" },
    { key: "target_tonof_liquidbulk", column: "target_tonof_liquidbulk", label: "Target Operating Profit / Tonne of Liquid Bulk" },
    { key: "target_operating_surplus", column: "target_operating_surplus", label: "Target Operating Surplus" },
];

// Columns are inlined into SQL, so they must be plain identifiers from this file
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
if (![...ACTUAL_COLUMNS, ...TARGET_FIELDS.flatMap((f) => [f.key, f.column])].every((c) => SAFE_IDENTIFIER.test(c))) {
    throw new Error("financialParameterEntry: column lists must hold plain identifiers.");
}

const FY_SQL = (alias) => `REPLACE(${alias}.annually_financial_year, ' ', '')`;
const MONTH_SQL = (alias) => `TRY_CAST(${alias}.month AS INT)`;

function requireOrganisation(req, res) {
    return requireOrganisationWriter(req, res, "Financial parameters are entered by the port organisation. Ministry users can view them.");
}

/** Parses one value; returns { value } or { error }. Blank is null. */
function parseFieldValue(kind, raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: "must be a number" };
    if (kind === "amount" && n < 0) return { error: "cannot be negative" };
    if (Math.abs(n) > MAX_VALUE) return { error: "is too large" };
    return { value: n };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Validates the monthly values and adds the calculated ones; returns { values } or { error }. */
function parseActualValues(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { error: "Nothing to save. Enter the financial parameters first." };
    }
    const allowed = new Set(ACTUAL_FIELDS.map((f) => f.column));
    const unknown = Object.keys(raw).filter((key) => !allowed.has(key));
    if (unknown.length) return { error: `Unknown field(s): ${unknown.join(", ")}.` };

    const values = {};
    for (const field of ACTUAL_FIELDS) {
        const result = parseFieldValue(field.kind, raw[field.column]);
        if (result.error) return { error: `${field.label} ${result.error}.` };
        if (result.value === null && field.required) return { error: `${field.label} is required.` };
        values[field.column] = result.value;
    }

    const income = values.operating_income;
    values.operating_surplus = round2(income - values.operating_expenditure);
    values.net_surplus = round2(values.total_income - values.total_expenditure);
    // Expenditure as a share of income; undefined when there is no operating income
    values.operating_ratio = income > 0 ? round2((values.operating_expenditure * 100) / income) : null;
    if (values.operating_ratio !== null && values.operating_ratio > MAX_VALUE) {
        return { error: "Operating Ratio is too large. Check the operating income and expenditure." };
    }
    return { values };
}

/** Validates the six targets; every one is required, as in the earlier portal. */
function parseTargetValues(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Enter the targets first." };
    const values = {};
    for (const field of TARGET_FIELDS) {
        const result = parseFieldValue("signed", raw[field.key]);
        if (result.error) return { error: `${field.label} ${result.error}.` };
        if (result.value === null) return { error: `${field.label} is required.` };
        values[field.key] = result.value;
    }
    return { values };
}

function bindValues(request, columns, values) {
    columns.forEach((column) => request.input(column, sql.Decimal(12, 2), values[column]));
}

/** Calendar year of a financial-year month (April–December: first year, January–March: second). */
function calendarYear(fiscalYear, month) {
    const startYear = Number(fiscalYear.slice(0, 4));
    return month >= 4 ? startYear : startYear + 1;
}

// Reference data rarely changes: keep it for a few minutes per organisation scope
const MASTERS_TTL_MS = 5 * 60 * 1000;
const mastersCache = new Map(); // scope key -> { body, at }

async function getFinancialParameterMasters(req, res) {
    const read = resolveReadOrganisation(req);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const cacheKey = read.organisationId ? `org:${read.organisationId}` : "all";
    const cached = mastersCache.get(cacheKey);
    if (cached && Date.now() - cached.at < MASTERS_TTL_MS) {
        return res.status(200).json({ ...cached.body, currentFinancialYear: currentFinancialYear() });
    }

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("portCategoryId", sql.Int, PORT_ORG_CATEGORY_ID);
        // Major ports first, then the other bodies that have reported financial parameters
        let orgFilter = `
            WHERE org.organisation_category_id = @portCategoryId
               OR EXISTS (SELECT 1 FROM tbl_financial_parameter f WHERE f.organisation_id = org.organisation_id)
               OR EXISTS (SELECT 1 FROM tbl_financial_paramaters_mopsw_target t WHERE t.organisation_id = org.organisation_id)
        `;
        if (read.organisationId) {
            request.input("organisationId", sql.Int, read.organisationId);
            orgFilter = "WHERE org.organisation_id = @organisationId";
        }
        const result = await request.query(`
            SELECT org.organisation_id, org.organisation_name,
                   CASE WHEN org.organisation_category_id = @portCategoryId THEN 1 ELSE 0 END AS is_major_port
            FROM mmt_organisation org
            ${orgFilter}
            ORDER BY CASE WHEN org.organisation_category_id = @portCategoryId THEN 0 ELSE 1 END, org.organisation_name
        `);

        const body = {
            organisations: result.recordset.map((o) => ({ ...o, is_major_port: Boolean(o.is_major_port) })),
        };
        mastersCache.set(cacheKey, { body, at: Date.now() });
        return res.status(200).json({ ...body, currentFinancialYear: currentFinancialYear() });
    } catch (error) {
        console.error("Error fetching financial parameter masters:", error);
        return sendError(res, 500, "Financial parameter reference data could not be loaded.");
    }
}

const ACTUAL_SELECT_SQL = `
    f.financial_parameter_id AS id, ${FY_SQL("f")} AS fiscal_year, ${MONTH_SQL("f")} AS month,
    f.organisation_id, org.organisation_name,
    ${ACTUAL_COLUMNS.map((c) => `f.${c}`).join(", ")},
    COALESCE(f.updated_date, f.created_date) AS last_updated
`;

async function getFinancialParameterActuals(req, res) {
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
            parts.push(`${FY_SQL("f")} = @fyFilter`);
        }
        if (month) {
            request.input("monthFilter", sql.Int, month);
            parts.push(`${MONTH_SQL("f")} = @monthFilter`);
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("f.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push(`(org.organisation_name LIKE @search OR f.annually_financial_year LIKE @search
                         OR ${MONTH_NAME_SQL(MONTH_SQL("f"))} LIKE @search)`);
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_financial_parameter f
        INNER JOIN mmt_organisation org ON org.organisation_id = f.organisation_id
        WHERE f.annually_financial_year IS NOT NULL AND ${MONTH_SQL("f")} BETWEEN 1 AND 12 ${where}
    `;

    try {
        const conn = await pool;
        const dataRequest = conn.request();
        const dataWhere = bind(dataRequest);
        dataRequest.input("offset", sql.Int, (page - 1) * limit);
        dataRequest.input("limit", sql.Int, limit);

        const { recordset } = await dataRequest.query(`
            SELECT ${ACTUAL_SELECT_SQL}, COUNT(*) OVER() AS total_count
            ${fromSql(dataWhere)}
            ORDER BY ${FY_SQL("f")} DESC, ${FISCAL_MONTH_ORDER_SQL(MONTH_SQL("f"))} DESC, org.organisation_name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        // A page past the end has no rows to carry the total; count separately only then
        let total = recordset[0]?.total_count;
        if (total === undefined && page > 1) {
            const countRequest = conn.request();
            const countWhere = bind(countRequest);
            total = (await countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`)).recordset[0]?.total;
        }
        const rows = recordset.map(({ total_count: _count, ...row }) => row);
        return res.status(200).json({ data: rows, pagination: buildPagination(Number(total) || 0, page, limit) });
    } catch (error) {
        console.error("Error fetching financial parameter actuals:", error);
        return sendError(res, 500, "Financial parameters could not be loaded.");
    }
}

async function loadActual(conn, id) {
    const request = conn.request();
    request.input("id", sql.Int, id);
    const result = await request.query(`
        SELECT ${ACTUAL_SELECT_SQL}
        FROM tbl_financial_parameter f
        INNER JOIN mmt_organisation org ON org.organisation_id = f.organisation_id
        WHERE f.financial_parameter_id = @id
    `);
    return result.recordset[0] || null;
}

/** One monthly record; organisation users may only open their own. */
async function getFinancialParameterActual(req, res) {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");
    const read = resolveReadOrganisation(req);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    try {
        const conn = await pool;
        const row = await loadActual(conn, id);
        // Another organisation's record is reported as missing, so ids reveal nothing
        if (!row || (read.organisationId && row.organisation_id !== read.organisationId)) {
            return sendError(res, 404, "These financial parameters no longer exist.");
        }
        return res.status(200).json({ success: true, data: row });
    } catch (error) {
        console.error("Error fetching financial parameters:", error);
        return sendError(res, 500, "The financial parameters could not be loaded.");
    }
}

async function createFinancialParameterActual(req, res) {
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
    const { values, error } = parseActualValues(req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("organisationId", sql.Int, organisationId);
        request.input("fiscalYear", sql.NVarChar(30), fiscalYear);
        request.input("month", sql.NVarChar(50), String(month));
        request.input("monthNumber", sql.Int, month);
        request.input("year", sql.Int, calendarYear(fiscalYear, month));
        request.input("userId", sql.Int, userId);
        bindValues(request, ACTUAL_COLUMNS, values);

        // The check and insert run under one lock, so two saves can never create two records
        const result = await request.query(`
            IF EXISTS (
                SELECT 1 FROM tbl_financial_parameter f WITH (UPDLOCK, HOLDLOCK)
                WHERE f.organisation_id = @organisationId
                  AND ${FY_SQL("f")} = @fiscalYear
                  AND ${MONTH_SQL("f")} = @monthNumber
            )
                SELECT CAST(NULL AS INT) AS id;
            ELSE
                INSERT INTO tbl_financial_parameter
                    (organisation_id, year, month, annually_financial_year,
                     ${ACTUAL_COLUMNS.join(", ")}, created_by, created_date)
                OUTPUT INSERTED.financial_parameter_id AS id
                VALUES (@organisationId, @year, @month, @fiscalYear,
                        ${ACTUAL_COLUMNS.map((c) => `@${c}`).join(", ")}, @userId, GETDATE());
        `);

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `Financial parameters for ${MONTH_NAMES[month - 1]} ${fiscalYear} were entered earlier. Update them instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Financial parameters saved." });
    } catch (err) {
        console.error("Error saving financial parameters:", err);
        return sendError(res, 500, "The financial parameters could not be saved.");
    }
}

async function updateFinancialParameterActual(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");
    const { values, error } = parseActualValues(req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        request.input("organisationId", sql.Int, organisationId);
        request.input("userId", sql.Int, userId);
        bindValues(request, ACTUAL_COLUMNS, values);
        const result = await request.query(`
            UPDATE tbl_financial_parameter
            SET ${ACTUAL_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
                updated_by = @userId, updated_date = GETDATE()
            WHERE financial_parameter_id = @id AND organisation_id = @organisationId
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "These financial parameters no longer exist.");
        return res.status(200).json({ success: true, message: "Financial parameters updated." });
    } catch (err) {
        console.error("Error updating financial parameters:", err);
        return sendError(res, 500, "The financial parameters could not be updated.");
    }
}

async function deleteFinancialParameterActual(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        request.input("organisationId", sql.Int, organisationId);
        const result = await request.query(`
            DELETE FROM tbl_financial_parameter
            WHERE financial_parameter_id = @id AND organisation_id = @organisationId
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "These financial parameters no longer exist.");
        return res.status(200).json({ success: true, message: "Financial parameters deleted." });
    } catch (error) {
        console.error("Error deleting financial parameters:", error);
        return sendError(res, 500, "The financial parameters could not be deleted.");
    }
}

async function getFinancialParameterTargets(req, res) {
    const read = resolveReadOrganisation(req, req.query.organisationId);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
    if (req.query.fiscalYear && !fiscalYear) return sendError(res, 400, "Financial year must look like 2025-2026.");
    const { page, limit, search } = parseListQuery(req.query);

    const bind = (request) => {
        const parts = [];
        if (fiscalYear) {
            request.input("fyFilter", sql.NVarChar(20), fiscalYear);
            parts.push(`${FY_SQL("t")} = @fyFilter`);
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("t.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push("(org.organisation_name LIKE @search OR t.annually_financial_year LIKE @search)");
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_financial_paramaters_mopsw_target t
        INNER JOIN mmt_organisation org ON org.organisation_id = t.organisation_id
        WHERE t.annually_financial_year IS NOT NULL ${where}
    `;

    try {
        const conn = await pool;
        const dataRequest = conn.request();
        const dataWhere = bind(dataRequest);
        dataRequest.input("offset", sql.Int, (page - 1) * limit);
        dataRequest.input("limit", sql.Int, limit);

        const { recordset } = await dataRequest.query(`
            SELECT t.target_id AS id, ${FY_SQL("t")} AS financial_year, t.organisation_id, org.organisation_name,
                   ${TARGET_FIELDS.map((f) => `t.${f.column} AS ${f.key}`).join(", ")},
                   COALESCE(t.update_date, t.created_date) AS last_updated,
                   COUNT(*) OVER() AS total_count
            ${fromSql(dataWhere)}
            ORDER BY ${FY_SQL("t")} DESC, org.organisation_name
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        let total = recordset[0]?.total_count;
        if (total === undefined && page > 1) {
            const countRequest = conn.request();
            const countWhere = bind(countRequest);
            total = (await countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`)).recordset[0]?.total;
        }
        const rows = recordset.map(({ total_count: _count, ...row }) => row);
        return res.status(200).json({ data: rows, pagination: buildPagination(Number(total) || 0, page, limit) });
    } catch (error) {
        console.error("Error fetching financial parameter targets:", error);
        return sendError(res, 500, "Financial parameter targets could not be loaded.");
    }
}

function bindTargetValues(request, values) {
    TARGET_FIELDS.forEach((f) => request.input(f.key, sql.Decimal(12, 2), values[f.key]));
}

async function createFinancialParameterTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Financial parameter targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const fiscalYear = normaliseFiscalYear(req.body?.financialYear);
    const organisationId = toPositiveIntOrNull(req.body?.organisationId);
    if (!fiscalYear) return sendError(res, 400, "Select a valid financial year.");
    if (!organisationId) return sendError(res, 400, "Select an organisation.");
    const { values, error } = parseTargetValues(req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const organisation = await validateOrganisation(conn, organisationId);
        if (!organisation) return sendError(res, 400, "The selected organisation does not exist.");

        const request = conn.request();
        request.input("fiscalYear", sql.NVarChar(50), fiscalYear);
        request.input("organisationId", sql.Int, organisationId);
        request.input("userId", sql.Int, userId);
        bindTargetValues(request, values);
        const result = await request.query(`
            IF EXISTS (
                SELECT 1 FROM tbl_financial_paramaters_mopsw_target t WITH (UPDLOCK, HOLDLOCK)
                WHERE t.organisation_id = @organisationId AND ${FY_SQL("t")} = @fiscalYear
            )
                SELECT CAST(NULL AS INT) AS id;
            ELSE
                INSERT INTO tbl_financial_paramaters_mopsw_target
                    (organisation_id, annually_financial_year,
                     ${TARGET_FIELDS.map((f) => f.column).join(", ")}, created_by, created_date)
                OUTPUT INSERTED.target_id AS id
                VALUES (@organisationId, @fiscalYear,
                        ${TARGET_FIELDS.map((f) => `@${f.key}`).join(", ")}, @userId, GETDATE());
        `);

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `Targets for ${organisation.organisation_name} in ${fiscalYear} already exist. Update them instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Targets added." });
    } catch (error) {
        console.error("Error creating financial parameter target:", error);
        return sendError(res, 500, "The targets could not be saved.");
    }
}

async function updateFinancialParameterTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Financial parameter targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");
    const { values, error } = parseTargetValues(req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        request.input("userId", sql.Int, userId);
        bindTargetValues(request, values);
        const result = await request.query(`
            UPDATE tbl_financial_paramaters_mopsw_target
            SET ${TARGET_FIELDS.map((f) => `${f.column} = @${f.key}`).join(", ")},
                updated_by = @userId, update_date = GETDATE()
            WHERE target_id = @id
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "These targets no longer exist.");
        return res.status(200).json({ success: true, message: "Targets updated." });
    } catch (error) {
        console.error("Error updating financial parameter target:", error);
        return sendError(res, 500, "The targets could not be updated.");
    }
}

async function deleteFinancialParameterTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Financial parameter targets")) return undefined;
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        const result = await request.query("DELETE FROM tbl_financial_paramaters_mopsw_target WHERE target_id = @id");
        if (!result.rowsAffected[0]) return sendError(res, 404, "These targets no longer exist.");
        return res.status(200).json({ success: true, message: "Targets deleted." });
    } catch (error) {
        console.error("Error deleting financial parameter target:", error);
        return sendError(res, 500, "The targets could not be deleted.");
    }
}

const FinancialParameterEntry = {
    getFinancialParameterMasters,
    getFinancialParameterActuals,
    getFinancialParameterActual,
    createFinancialParameterActual,
    updateFinancialParameterActual,
    deleteFinancialParameterActual,
    getFinancialParameterTargets,
    createFinancialParameterTarget,
    updateFinancialParameterTarget,
    deleteFinancialParameterTarget,
};

export default FinancialParameterEntry;
