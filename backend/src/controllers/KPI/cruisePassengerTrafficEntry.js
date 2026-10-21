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
 * KPI Major Ports — Cruise and Passenger Traffic (the earlier portal's trafficVessel.html).
 *
 * Who does what (enforced here, not only in the UI):
 *  - Organisation users enter one monthly record for their own organisation
 *    (tbl_traffic_vessel). The organisation and user come from the JWT.
 *  - Ministry users see every organisation and maintain one set of financial-year targets
 *    per organisation (tbl_traffic_vessel_target). They do not enter actuals.
 *  - As in the earlier portal there is no monthly entry window: any month that has started
 *    can be added, updated or deleted.
 *  - CRUD flags come from the user's KPI_MAJOR_PORTS permission (route middleware).
 *
 * Stored formats kept for the existing reports (controllers/Reports/trafficVesselReports.js):
 * fiscal_year is "2025-2026", month is the calendar month number (4 = April).
 * Ferry figures are stored only when the port handles passenger ferries, else NULL.
 */

const PORT_ORG_CATEGORY_ID = 1;

// decimal(12,2) columns hold up to 9,999,999,999.99
const MAX_VALUE = 9999999999;

/**
 * Monthly values entered by the organisation, in form order. All are counts (whole numbers).
 * ferry: only entered when the port handles passenger ferries.
 * The frontend mirrors this in modules/MajorPorts/pages/CruisePassengerTraffic/cruisePassengerConfig.js.
 */
const ACTUAL_FIELDS = [
    { column: "total_cruise_vessel_domestic", label: "Total Cruise Vessel Calls - Domestic", ferry: false },
    { column: "total_cruise_vessel_international", label: "Total Cruise Vessel Calls - International", ferry: false },
    { column: "total_cruise_passengers_domestic", label: "Total Cruise Passengers - Domestic", ferry: false },
    { column: "total_cruise_passengers_international", label: "Total Cruise Passengers - International", ferry: false },
    { column: "total_ferry_calls", label: "Total Ferry Calls", ferry: true },
    { column: "total_ferry_passengers", label: "Total Ferry Passengers", ferry: true },
];
const ACTUAL_COLUMNS = ACTUAL_FIELDS.map((f) => f.column);

/** Financial-year targets set by the Ministry. */
const TARGET_FIELDS = [
    { column: "target_cruise_vessel_calls", label: "Target Cruise Vessel Calls" },
    { column: "target_ferry_calls", label: "Target Ferry Calls" },
];
const TARGET_COLUMNS = TARGET_FIELDS.map((f) => f.column);

// Columns are inlined into SQL, so they must be plain identifiers from this file
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
if (![...ACTUAL_COLUMNS, ...TARGET_COLUMNS].every((c) => SAFE_IDENTIFIER.test(c))) {
    throw new Error("cruisePassengerTrafficEntry: column lists must hold plain identifiers.");
}

// Older rows may hold "2025 - 2026"; every lookup compares the year without spaces
const FY_SQL = (alias) => `REPLACE(${alias}.fiscal_year, ' ', '')`;

function requireOrganisation(req, res) {
    return requireOrganisationWriter(req, res, "Cruise and passenger traffic is entered by the port organisation. Ministry users can view it.");
}

/** One count; returns { value } or { error }. Blank is null. */
function parseCount(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: "must be a number" };
    if (n < 0) return { error: "cannot be negative" };
    if (!Number.isInteger(n)) return { error: "must be a whole number" };
    if (n > MAX_VALUE) return { error: "is too large" };
    return { value: n };
}

/** handlesPassengerFerry: true/false, 1/0 or "1"/"0"; anything else is null. */
function parseFerryFlag(raw) {
    if (raw === true || raw === 1 || raw === "1" || raw === "true") return true;
    if (raw === false || raw === 0 || raw === "0" || raw === "false") return false;
    return null;
}

/**
 * Validates the monthly values; returns { values, handlesFerry } or { error }.
 * Every cruise value is required; the ferry values are required only for ports that handle
 * passenger ferries and are stored as NULL otherwise, as in the earlier portal.
 */
function parseActualBody(body) {
    const handlesFerry = parseFerryFlag(body?.handlesPassengerFerry);
    if (handlesFerry === null) return { error: "Answer whether the port handles passenger ferries." };

    const raw = body?.values;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { error: "Nothing to save. Enter the cruise and passenger traffic first." };
    }
    const unknown = Object.keys(raw).filter((key) => !ACTUAL_COLUMNS.includes(key));
    if (unknown.length) return { error: `Unknown field(s): ${unknown.join(", ")}.` };

    const values = {};
    for (const field of ACTUAL_FIELDS) {
        if (field.ferry && !handlesFerry) {
            values[field.column] = null;
            continue;
        }
        const result = parseCount(raw[field.column]);
        if (result.error) return { error: `${field.label} ${result.error}.` };
        if (result.value === null) return { error: `${field.label} is required.` };
        values[field.column] = result.value;
    }
    return { values, handlesFerry };
}

/** Both targets are required, as in the earlier portal. */
function parseTargetValues(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Enter the targets first." };
    const values = {};
    for (const field of TARGET_FIELDS) {
        const result = parseCount(raw[field.column]);
        if (result.error) return { error: `${field.label} ${result.error}.` };
        if (result.value === null) return { error: `${field.label} is required.` };
        values[field.column] = result.value;
    }
    return { values };
}

function bindValues(request, columns, values) {
    columns.forEach((column) => request.input(column, sql.Decimal(12, 2), values[column]));
}

// Reference data rarely changes: keep it for a few minutes per organisation scope
const MASTERS_TTL_MS = 5 * 60 * 1000;
const mastersCache = new Map(); // scope key -> { body, at }

async function getCruisePassengerMasters(req, res) {
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
        // Major ports first, then the other bodies that have reported cruise traffic (e.g. PWD Goa)
        let orgFilter = `
            WHERE org.organisation_category_id = @portCategoryId
               OR EXISTS (SELECT 1 FROM tbl_traffic_vessel v WHERE v.organisation_id = org.organisation_id)
               OR EXISTS (SELECT 1 FROM tbl_traffic_vessel_target t WHERE t.organisation_id = org.organisation_id)
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
        console.error("Error fetching cruise and passenger traffic masters:", error);
        return sendError(res, 500, "Cruise and passenger traffic reference data could not be loaded.");
    }
}

// Totals are calculated here, so the list, the form and the exports always agree
const ACTUAL_SELECT_SQL = `
    v.id, ${FY_SQL("v")} AS fiscal_year, v.month, v.organisation_id, org.organisation_name,
    v.handles_passenger_ferry,
    ${ACTUAL_COLUMNS.map((c) => `v.${c}`).join(", ")},
    ISNULL(v.total_cruise_vessel_domestic, 0) + ISNULL(v.total_cruise_vessel_international, 0) AS total_cruise_vessel_calls,
    ISNULL(v.total_cruise_passengers_domestic, 0) + ISNULL(v.total_cruise_passengers_international, 0) AS total_cruise_passengers,
    COALESCE(v.updated_date, v.created_date) AS last_updated
`;

/** decimal columns come back as numbers; the ferry flag as true / false / null. */
function toActualRow(row) {
    return { ...row, handles_passenger_ferry: row.handles_passenger_ferry === null ? null : Boolean(row.handles_passenger_ferry) };
}

async function getCruisePassengerActuals(req, res) {
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
            parts.push(`${FY_SQL("v")} = @fyFilter`);
        }
        if (month) {
            request.input("monthFilter", sql.Int, month);
            parts.push("v.month = @monthFilter");
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("v.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push(`(org.organisation_name LIKE @search OR v.fiscal_year LIKE @search
                         OR ${MONTH_NAME_SQL("v.month")} LIKE @search)`);
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_traffic_vessel v
        INNER JOIN mmt_organisation org ON org.organisation_id = v.organisation_id
        WHERE v.fiscal_year IS NOT NULL AND v.month BETWEEN 1 AND 12 ${where}
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
            ORDER BY ${FY_SQL("v")} DESC, ${FISCAL_MONTH_ORDER_SQL("v.month")} DESC, org.organisation_name, v.id
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        // A page past the end has no rows to carry the total; count separately only then
        let total = recordset[0]?.total_count;
        if (total === undefined && page > 1) {
            const countRequest = conn.request();
            const countWhere = bind(countRequest);
            total = (await countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`)).recordset[0]?.total;
        }
        const rows = recordset.map(({ total_count: _count, ...row }) => toActualRow(row));
        return res.status(200).json({ data: rows, pagination: buildPagination(Number(total) || 0, page, limit) });
    } catch (error) {
        console.error("Error fetching cruise and passenger traffic actuals:", error);
        return sendError(res, 500, "Cruise and passenger traffic could not be loaded.");
    }
}

async function loadActual(conn, id) {
    const request = conn.request();
    request.input("id", sql.Int, id);
    const result = await request.query(`
        SELECT ${ACTUAL_SELECT_SQL}
        FROM tbl_traffic_vessel v
        INNER JOIN mmt_organisation org ON org.organisation_id = v.organisation_id
        WHERE v.id = @id
    `);
    return result.recordset[0] ? toActualRow(result.recordset[0]) : null;
}

/** One monthly record; organisation users may only open their own. */
async function getCruisePassengerActual(req, res) {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");
    const read = resolveReadOrganisation(req);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    try {
        const conn = await pool;
        const row = await loadActual(conn, id);
        // Another organisation's record is reported as missing, so ids reveal nothing
        if (!row || (read.organisationId && row.organisation_id !== read.organisationId)) {
            return sendError(res, 404, "This cruise and passenger traffic record no longer exists.");
        }
        return res.status(200).json({ success: true, data: row });
    } catch (error) {
        console.error("Error fetching cruise and passenger traffic:", error);
        return sendError(res, 500, "The cruise and passenger traffic could not be loaded.");
    }
}

async function createCruisePassengerActual(req, res) {
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
    const { values, handlesFerry, error } = parseActualBody(req.body);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("organisationId", sql.Int, organisationId);
        request.input("fiscalYear", sql.NVarChar(50), fiscalYear);
        request.input("month", sql.Int, month);
        request.input("handlesFerry", sql.Bit, handlesFerry);
        request.input("userId", sql.Int, userId);
        bindValues(request, ACTUAL_COLUMNS, values);

        // The check and insert run under one lock, so two saves can never create two records
        const result = await request.query(`
            IF EXISTS (
                SELECT 1 FROM tbl_traffic_vessel v WITH (UPDLOCK, HOLDLOCK)
                WHERE v.organisation_id = @organisationId
                  AND ${FY_SQL("v")} = @fiscalYear
                  AND v.month = @month
            )
                SELECT CAST(NULL AS INT) AS id;
            ELSE
                INSERT INTO tbl_traffic_vessel
                    (fiscal_year, month, organisation_id, ${ACTUAL_COLUMNS.join(", ")},
                     handles_passenger_ferry, created_by, created_date)
                OUTPUT INSERTED.id AS id
                VALUES (@fiscalYear, @month, @organisationId, ${ACTUAL_COLUMNS.map((c) => `@${c}`).join(", ")},
                        @handlesFerry, @userId, GETDATE());
        `);

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `Cruise and passenger traffic for ${MONTH_NAMES[month - 1]} ${fiscalYear} was entered earlier. Update it instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Cruise and passenger traffic saved." });
    } catch (err) {
        console.error("Error saving cruise and passenger traffic:", err);
        return sendError(res, 500, "The cruise and passenger traffic could not be saved.");
    }
}

async function updateCruisePassengerActual(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");
    const { values, handlesFerry, error } = parseActualBody(req.body);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        request.input("organisationId", sql.Int, organisationId);
        request.input("handlesFerry", sql.Bit, handlesFerry);
        request.input("userId", sql.Int, userId);
        bindValues(request, ACTUAL_COLUMNS, values);
        const result = await request.query(`
            UPDATE tbl_traffic_vessel
            SET ${ACTUAL_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
                handles_passenger_ferry = @handlesFerry,
                updated_by = @userId, updated_date = GETDATE()
            WHERE id = @id AND organisation_id = @organisationId
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "This cruise and passenger traffic record no longer exists.");
        return res.status(200).json({ success: true, message: "Cruise and passenger traffic updated." });
    } catch (err) {
        console.error("Error updating cruise and passenger traffic:", err);
        return sendError(res, 500, "The cruise and passenger traffic could not be updated.");
    }
}

async function deleteCruisePassengerActual(req, res) {
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
            DELETE FROM tbl_traffic_vessel
            WHERE id = @id AND organisation_id = @organisationId
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "This cruise and passenger traffic record no longer exists.");
        return res.status(200).json({ success: true, message: "Cruise and passenger traffic deleted." });
    } catch (error) {
        console.error("Error deleting cruise and passenger traffic:", error);
        return sendError(res, 500, "The cruise and passenger traffic could not be deleted.");
    }
}

async function getCruisePassengerTargets(req, res) {
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
            parts.push("(org.organisation_name LIKE @search OR t.fiscal_year LIKE @search)");
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_traffic_vessel_target t
        INNER JOIN mmt_organisation org ON org.organisation_id = t.organisation_id
        WHERE t.fiscal_year IS NOT NULL ${where}
    `;

    try {
        const conn = await pool;
        const dataRequest = conn.request();
        const dataWhere = bind(dataRequest);
        dataRequest.input("offset", sql.Int, (page - 1) * limit);
        dataRequest.input("limit", sql.Int, limit);

        const { recordset } = await dataRequest.query(`
            SELECT t.id, ${FY_SQL("t")} AS financial_year, t.organisation_id, org.organisation_name,
                   ${TARGET_COLUMNS.map((c) => `t.${c}`).join(", ")},
                   COALESCE(t.updated_date, t.created_date) AS last_updated,
                   COUNT(*) OVER() AS total_count
            ${fromSql(dataWhere)}
            ORDER BY ${FY_SQL("t")} DESC, org.organisation_name, t.id
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
        console.error("Error fetching cruise and passenger traffic targets:", error);
        return sendError(res, 500, "Cruise and passenger traffic targets could not be loaded.");
    }
}

async function createCruisePassengerTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Cruise and passenger traffic targets")) return undefined;
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
        request.input("fiscalYear", sql.VarChar(50), fiscalYear);
        request.input("organisationId", sql.Int, organisationId);
        request.input("userId", sql.Int, userId);
        bindValues(request, TARGET_COLUMNS, values);
        const result = await request.query(`
            IF EXISTS (
                SELECT 1 FROM tbl_traffic_vessel_target t WITH (UPDLOCK, HOLDLOCK)
                WHERE t.organisation_id = @organisationId AND ${FY_SQL("t")} = @fiscalYear
            )
                SELECT CAST(NULL AS INT) AS id;
            ELSE
                INSERT INTO tbl_traffic_vessel_target
                    (fiscal_year, organisation_id, ${TARGET_COLUMNS.join(", ")}, created_by, created_date)
                OUTPUT INSERTED.id AS id
                VALUES (@fiscalYear, @organisationId, ${TARGET_COLUMNS.map((c) => `@${c}`).join(", ")}, @userId, GETDATE());
        `);

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `Targets for ${organisation.organisation_name} in ${fiscalYear} already exist. Update them instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Targets added." });
    } catch (error) {
        console.error("Error creating cruise and passenger traffic target:", error);
        return sendError(res, 500, "The targets could not be saved.");
    }
}

async function updateCruisePassengerTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Cruise and passenger traffic targets")) return undefined;
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
        bindValues(request, TARGET_COLUMNS, values);
        const result = await request.query(`
            UPDATE tbl_traffic_vessel_target
            SET ${TARGET_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
                updated_by = @userId, updated_date = GETDATE()
            WHERE id = @id
        `);
        if (!result.rowsAffected[0]) return sendError(res, 404, "These targets no longer exist.");
        return res.status(200).json({ success: true, message: "Targets updated." });
    } catch (error) {
        console.error("Error updating cruise and passenger traffic target:", error);
        return sendError(res, 500, "The targets could not be updated.");
    }
}

async function deleteCruisePassengerTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Cruise and passenger traffic targets")) return undefined;
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        const result = await request.query("DELETE FROM tbl_traffic_vessel_target WHERE id = @id");
        if (!result.rowsAffected[0]) return sendError(res, 404, "These targets no longer exist.");
        return res.status(200).json({ success: true, message: "Targets deleted." });
    } catch (error) {
        console.error("Error deleting cruise and passenger traffic target:", error);
        return sendError(res, 500, "The targets could not be deleted.");
    }
}

const CruisePassengerTrafficEntry = {
    getCruisePassengerMasters,
    getCruisePassengerActuals,
    getCruisePassengerActual,
    createCruisePassengerActual,
    updateCruisePassengerActual,
    deleteCruisePassengerActual,
    getCruisePassengerTargets,
    createCruisePassengerTarget,
    updateCruisePassengerTarget,
    deleteCruisePassengerTarget,
};

export default CruisePassengerTrafficEntry;
