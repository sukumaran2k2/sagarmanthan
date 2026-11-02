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
    logSource,
    runLoggedWrite,
} from "./kpiEntryCommon.js";

/**
 * KPI Major Ports — Renewable Energy (the earlier portal's kpiRenewableEnergy.html).
 *
 * Who does what (enforced here, not only in the UI):
 *  - Organisation users enter one monthly record for their own organisation
 *    (tbl_kpi_renewable_energy). The organisation and user come from the JWT.
 *  - Ministry users see every organisation and maintain one financial-year renewable energy
 *    target per organisation (tbl_kpi_renewable_energy_target). They do not enter actuals.
 *  - As in the earlier portal there is no monthly entry window: any month that has started
 *    can be added, updated or deleted.
 *  - CRUD flags come from the user's KPI_MAJOR_PORTS permission (route middleware).
 *
 * Stored formats kept from the earlier portal: financial_year is "2025-2026", month is the
 * calendar month number (4 = April), energy is in MWh with two decimals.
 * Renewable consumption may exceed the total (ports that generate more solar power than they
 * use have reported so), so it is not capped by the electrical consumption.
 */

const PORT_ORG_CATEGORY_ID = 1;

// decimal(12,2) columns hold up to 9,999,999,999.99
const MAX_VALUE = 9999999999.99;

/**
 * Monthly values entered by the organisation, in form order (MWh).
 * The frontend mirrors this in modules/MajorPorts/pages/RenewableEnergy/renewableEnergyConfig.js.
 */
const ACTUAL_FIELDS = [
    { column: "electrical_energy_consumption", label: "Total Electrical Energy Consumption" },
    { column: "renewable_energy_consumption", label: "Total Renewable Energy Consumption" },
];
const ACTUAL_COLUMNS = ACTUAL_FIELDS.map((f) => f.column);

/** Financial-year target set by the Ministry (MWh). */
const TARGET_FIELDS = [
    { column: "target_renewable_energy_consumption", label: "Target Total Renewable Energy Consumption" },
];
const TARGET_COLUMNS = TARGET_FIELDS.map((f) => f.column);

// Columns are inlined into SQL, so they must be plain identifiers from this file
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
if (![...ACTUAL_COLUMNS, ...TARGET_COLUMNS].every((c) => SAFE_IDENTIFIER.test(c))) {
    throw new Error("renewableEnergyEntry: column lists must hold plain identifiers.");
}

// Every lookup compares the year without spaces, in case a row holds "2025 - 2026"
const FY_SQL = (alias) => `REPLACE(${alias}.financial_year, ' ', '')`;

const ACTUAL_LOG = logSource({
    section: "RENEWABLE_ENERGY", recordType: "ACTUAL", table: "tbl_kpi_renewable_energy",
    fiscalYearSql: FY_SQL("x"), monthSql: "x.month", columns: ACTUAL_COLUMNS,
});
const TARGET_LOG = logSource({
    section: "RENEWABLE_ENERGY", recordType: "TARGET", table: "tbl_kpi_renewable_energy_target",
    fiscalYearSql: FY_SQL("x"), columns: TARGET_COLUMNS,
});

function requireOrganisation(req, res) {
    return requireOrganisationWriter(req, res, "Renewable energy is entered by the port organisation. Ministry users can view it.");
}

/** One energy value in MWh; returns { value } or { error }. Blank is null. */
function parseEnergy(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { error: "must be a number" };
    if (n < 0) return { error: "cannot be negative" };
    if (n > MAX_VALUE) return { error: "is too large" };
    // The columns keep two decimals; refuse more rather than round silently
    if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return { error: "can have at most 2 decimal places" };
    return { value: n };
}

/** Validates that every listed field is present and valid; returns { values } or { error }. */
function parseValues(raw, fields, emptyMessage) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: emptyMessage };
    const allowed = new Set(fields.map((f) => f.column));
    const unknown = Object.keys(raw).filter((key) => !allowed.has(key));
    if (unknown.length) return { error: `Unknown field(s): ${unknown.join(", ")}.` };

    const values = {};
    for (const field of fields) {
        const result = parseEnergy(raw[field.column]);
        if (result.error) return { error: `${field.label} ${result.error}.` };
        if (result.value === null) return { error: `${field.label} is required.` };
        values[field.column] = result.value;
    }
    return { values };
}

const parseActualValues = (raw) => parseValues(raw, ACTUAL_FIELDS, "Nothing to save. Enter the energy consumption first.");
const parseTargetValues = (raw) => parseValues(raw, TARGET_FIELDS, "Enter the target first.");

function bindValues(request, columns, values) {
    columns.forEach((column) => request.input(column, sql.Decimal(12, 2), values[column]));
}

// Reference data rarely changes: keep it for a few minutes per organisation scope
const MASTERS_TTL_MS = 5 * 60 * 1000;
const mastersCache = new Map(); // scope key -> { body, at }

async function getRenewableEnergyMasters(req, res) {
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
        // Major ports first, then the other bodies that have reported renewable energy (e.g. state maritime boards)
        let orgFilter = `
            WHERE org.organisation_category_id = @portCategoryId
               OR EXISTS (SELECT 1 FROM tbl_kpi_renewable_energy r WHERE r.organisation_id = org.organisation_id)
               OR EXISTS (SELECT 1 FROM tbl_kpi_renewable_energy_target t WHERE t.organisation_id = org.organisation_id)
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
        console.error("Error fetching renewable energy masters:", error);
        return sendError(res, 500, "Renewable energy reference data could not be loaded.");
    }
}

const ACTUAL_SELECT_SQL = `
    r.id, ${FY_SQL("r")} AS fiscal_year, r.month, r.organisation_id, org.organisation_name,
    ${ACTUAL_COLUMNS.map((c) => `r.${c}`).join(", ")},
    COALESCE(r.updated_date, r.created_date) AS last_updated
`;

async function getRenewableEnergyActuals(req, res) {
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
            parts.push(`${FY_SQL("r")} = @fyFilter`);
        }
        if (month) {
            request.input("monthFilter", sql.Int, month);
            parts.push("r.month = @monthFilter");
        }
        if (read.organisationId) {
            request.input("orgFilter", sql.Int, read.organisationId);
            parts.push("r.organisation_id = @orgFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push(`(org.organisation_name LIKE @search OR r.financial_year LIKE @search
                         OR ${MONTH_NAME_SQL("r.month")} LIKE @search)`);
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_kpi_renewable_energy r
        INNER JOIN mmt_organisation org ON org.organisation_id = r.organisation_id
        WHERE r.financial_year IS NOT NULL AND r.month BETWEEN 1 AND 12 ${where}
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
            ORDER BY ${FY_SQL("r")} DESC, ${FISCAL_MONTH_ORDER_SQL("r.month")} DESC, org.organisation_name, r.id
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
        console.error("Error fetching renewable energy actuals:", error);
        return sendError(res, 500, "Renewable energy could not be loaded.");
    }
}

/** One monthly record; organisation users may only open their own. */
async function getRenewableEnergyActual(req, res) {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");
    const read = resolveReadOrganisation(req);
    if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, id);
        const result = await request.query(`
            SELECT ${ACTUAL_SELECT_SQL}
            FROM tbl_kpi_renewable_energy r
            INNER JOIN mmt_organisation org ON org.organisation_id = r.organisation_id
            WHERE r.id = @id
        `);
        const row = result.recordset[0];
        // Another organisation's record is reported as missing, so ids reveal nothing
        if (!row || (read.organisationId && row.organisation_id !== read.organisationId)) {
            return sendError(res, 404, "This renewable energy record no longer exists.");
        }
        return res.status(200).json({ success: true, data: row });
    } catch (error) {
        console.error("Error fetching renewable energy:", error);
        return sendError(res, 500, "The renewable energy record could not be loaded.");
    }
}

async function createRenewableEnergyActual(req, res) {
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
        const result = await runLoggedWrite(conn, ACTUAL_LOG, { action: "CREATE", userId }, (request) => {
            request.input("organisationId", sql.Int, organisationId);
            request.input("fiscalYear", sql.NVarChar(50), fiscalYear);
            request.input("month", sql.Int, month);
            request.input("userId", sql.Int, userId);
            bindValues(request, ACTUAL_COLUMNS, values);

            // The check and insert run under one lock, so two saves can never create two records
            return request.query(`
                IF EXISTS (
                    SELECT 1 FROM tbl_kpi_renewable_energy r WITH (UPDLOCK, HOLDLOCK)
                    WHERE r.organisation_id = @organisationId
                      AND ${FY_SQL("r")} = @fiscalYear
                      AND r.month = @month
                )
                    SELECT CAST(NULL AS INT) AS id;
                ELSE
                    INSERT INTO tbl_kpi_renewable_energy
                        (financial_year, month, organisation_id, ${ACTUAL_COLUMNS.join(", ")}, created_by, created_date)
                    OUTPUT INSERTED.id AS id
                    VALUES (@fiscalYear, @month, @organisationId, ${ACTUAL_COLUMNS.map((c) => `@${c}`).join(", ")},
                            @userId, GETDATE());
            `);
        });

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `Renewable energy for ${MONTH_NAMES[month - 1]} ${fiscalYear} was entered earlier. Update it instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Renewable energy saved." });
    } catch (err) {
        console.error("Error saving renewable energy:", err);
        return sendError(res, 500, "The renewable energy could not be saved.");
    }
}

async function updateRenewableEnergyActual(req, res) {
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
        const result = await runLoggedWrite(conn, ACTUAL_LOG, { action: "UPDATE", id, userId }, (request) => {
            request.input("id", sql.Int, id);
            request.input("organisationId", sql.Int, organisationId);
            request.input("userId", sql.Int, userId);
            bindValues(request, ACTUAL_COLUMNS, values);
            return request.query(`
                UPDATE tbl_kpi_renewable_energy
                SET ${ACTUAL_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
                    updated_by = @userId, updated_date = GETDATE()
                WHERE id = @id AND organisation_id = @organisationId
            `);
        });
        if (!result.rowsAffected[0]) return sendError(res, 404, "This renewable energy record no longer exists.");
        return res.status(200).json({ success: true, message: "Renewable energy updated." });
    } catch (err) {
        console.error("Error updating renewable energy:", err);
        return sendError(res, 500, "The renewable energy could not be updated.");
    }
}

async function deleteRenewableEnergyActual(req, res) {
    const organisationId = requireOrganisation(req, res);
    if (!organisationId) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid record.");

    try {
        const conn = await pool;
        const result = await runLoggedWrite(conn, ACTUAL_LOG, { action: "DELETE", id, userId }, (request) => {
            request.input("id", sql.Int, id);
            request.input("organisationId", sql.Int, organisationId);
            return request.query(`
                DELETE FROM tbl_kpi_renewable_energy
                WHERE id = @id AND organisation_id = @organisationId
            `);
        });
        if (!result.rowsAffected[0]) return sendError(res, 404, "This renewable energy record no longer exists.");
        return res.status(200).json({ success: true, message: "Renewable energy deleted." });
    } catch (error) {
        console.error("Error deleting renewable energy:", error);
        return sendError(res, 500, "The renewable energy could not be deleted.");
    }
}

async function getRenewableEnergyTargets(req, res) {
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
            parts.push("(org.organisation_name LIKE @search OR t.financial_year LIKE @search)");
        }
        return parts.length ? `AND ${parts.join(" AND ")}` : "";
    };
    const fromSql = (where) => `
        FROM tbl_kpi_renewable_energy_target t
        INNER JOIN mmt_organisation org ON org.organisation_id = t.organisation_id
        WHERE t.financial_year IS NOT NULL ${where}
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
        console.error("Error fetching renewable energy targets:", error);
        return sendError(res, 500, "Renewable energy targets could not be loaded.");
    }
}

async function createRenewableEnergyTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Renewable energy targets")) return undefined;
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

        const result = await runLoggedWrite(conn, TARGET_LOG, { action: "CREATE", userId }, (request) => {
            request.input("fiscalYear", sql.NVarChar(50), fiscalYear);
            request.input("organisationId", sql.Int, organisationId);
            request.input("userId", sql.Int, userId);
            bindValues(request, TARGET_COLUMNS, values);
            return request.query(`
                IF EXISTS (
                    SELECT 1 FROM tbl_kpi_renewable_energy_target t WITH (UPDLOCK, HOLDLOCK)
                    WHERE t.organisation_id = @organisationId AND ${FY_SQL("t")} = @fiscalYear
                )
                    SELECT CAST(NULL AS INT) AS id;
                ELSE
                    INSERT INTO tbl_kpi_renewable_energy_target
                        (financial_year, organisation_id, ${TARGET_COLUMNS.join(", ")}, created_by, created_date)
                    OUTPUT INSERTED.id AS id
                    VALUES (@fiscalYear, @organisationId, ${TARGET_COLUMNS.map((c) => `@${c}`).join(", ")}, @userId, GETDATE());
            `);
        });

        const id = result.recordset[0]?.id;
        if (!id) {
            return sendError(res, 409, `A target for ${organisation.organisation_name} in ${fiscalYear} already exists. Update it instead.`);
        }
        return res.status(201).json({ success: true, id, message: "Target added." });
    } catch (error) {
        console.error("Error creating renewable energy target:", error);
        return sendError(res, 500, "The target could not be saved.");
    }
}

async function updateRenewableEnergyTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Renewable energy targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");
    const { values, error } = parseTargetValues(req.body?.values);
    if (error) return sendError(res, 400, error);

    try {
        const conn = await pool;
        const result = await runLoggedWrite(conn, TARGET_LOG, { action: "UPDATE", id, userId }, (request) => {
            request.input("id", sql.Int, id);
            request.input("userId", sql.Int, userId);
            bindValues(request, TARGET_COLUMNS, values);
            return request.query(`
                UPDATE tbl_kpi_renewable_energy_target
                SET ${TARGET_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
                    updated_by = @userId, updated_date = GETDATE()
                WHERE id = @id
            `);
        });
        if (!result.rowsAffected[0]) return sendError(res, 404, "This target no longer exists.");
        return res.status(200).json({ success: true, message: "Target updated." });
    } catch (error) {
        console.error("Error updating renewable energy target:", error);
        return sendError(res, 500, "The target could not be updated.");
    }
}

async function deleteRenewableEnergyTarget(req, res) {
    if (!requireMinistryWriter(req, res, "Renewable energy targets")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return sendError(res, 400, "Invalid target.");

    try {
        const conn = await pool;
        const result = await runLoggedWrite(conn, TARGET_LOG, { action: "DELETE", id, userId }, (request) => {
            request.input("id", sql.Int, id);
            return request.query("DELETE FROM tbl_kpi_renewable_energy_target WHERE id = @id");
        });
        if (!result.rowsAffected[0]) return sendError(res, 404, "This target no longer exists.");
        return res.status(200).json({ success: true, message: "Target deleted." });
    } catch (error) {
        console.error("Error deleting renewable energy target:", error);
        return sendError(res, 500, "The target could not be deleted.");
    }
}

const RenewableEnergyEntry = {
    getRenewableEnergyMasters,
    getRenewableEnergyActuals,
    getRenewableEnergyActual,
    createRenewableEnergyActual,
    updateRenewableEnergyActual,
    deleteRenewableEnergyActual,
    getRenewableEnergyTargets,
    createRenewableEnergyTarget,
    updateRenewableEnergyTarget,
    deleteRenewableEnergyTarget,
};

export default RenewableEnergyEntry;
