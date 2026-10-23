import sql from "mssql";
import { pool } from "../../db.js";
import { getDataScope } from "../../middleware/dataScope.js";
import { checkModulePermission } from "../../middleware/modulePermission.js";

/**
 * Shared rules for the KPI Major Ports monthly data entry sections (Traffic, Port Performance).
 *
 *  - Organisation users (data scope ORGANISATION) enter monthly actuals for their own
 *    organisation only. The organisation and user always come from the JWT.
 *  - Ministry users (data scope MINISTRY/MASTER) see every organisation, maintain targets
 *    and grant/revoke late-entry access. They do not enter actuals.
 *  - Actuals can be changed freely on days 1–ENTRY_WINDOW_LAST_DAY of a month. After that,
 *    an organisation needs an active ministry grant for that financial year/month, stored in
 *    ministry_access_module_audit_track under the section's module_id.
 */

export const ENTRY_WINDOW_LAST_DAY = 8;
export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// April first, March last
export const FISCAL_MONTH_ORDER_SQL = (col) => `CASE WHEN ${col} >= 4 THEN ${col} - 3 ELSE ${col} + 9 END`;
export const MONTH_NAME_SQL = (col) => `DATENAME(MONTH, DATEFROMPARTS(2000, ${col}, 1))`;

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

export function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

export function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

export function toPositiveIntOrNull(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export function resolveUserId(req) {
    const n = Number(req.user?.userId ?? req.user?.user_id);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** "2025-2026", "FY 2025-26" and "2025 - 2026" all become "2025-2026"; anything else is null. */
export function normaliseFiscalYear(value) {
    const match = String(value ?? "").match(/(\d{4})\s*-\s*(\d{2,4})/);
    if (!match) return null;
    const start = Number(match[1]);
    const endRaw = match[2];
    const end = endRaw.length === 2 ? Number(String(start + 1).slice(0, 2) + endRaw) : Number(endRaw);
    return end === start + 1 ? `${start}-${end}` : null;
}

export function parseMonth(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

export function currentFinancialYear(today = new Date()) {
    const start = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
    return `${start}-${start + 1}`;
}

/** True when the month has not started yet, so no actuals can exist for it. */
export function isFuturePeriod(fiscalYear, month, today = new Date()) {
    const startYear = Number(fiscalYear.slice(0, 4));
    const year = month >= 4 ? startYear : startYear + 1;
    return new Date(year, month - 1, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
}

/** Non-negative number, null for blank; undefined marks an invalid value. */
export function parseQuantity(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
}

export function buildPagination(total, page, limit) {
    return { total, page, limit, totalPages: total ? Math.ceil(total / limit) : 0 };
}

/** page / limit / search from the query string, with the limits every list uses. */
export function parseListQuery(query) {
    return {
        page: parsePositiveInt(query.page, 1),
        limit: parsePositiveInt(query.limit, 10, 1, 100),
        search: String(query.search || "").trim().slice(0, 100),
    };
}

// ---------------------------------------------------------------------------
// Scope and permissions
// ---------------------------------------------------------------------------

export function describeScope(req) {
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    return {
        isMinistry: isWide,
        isOrganisation,
        organisationId: Number.isFinite(organisationId) && organisationId > 0 ? organisationId : null,
    };
}

/** Organisation users always read their own organisation; ministry users may filter by one. */
export function resolveReadOrganisation(req, requested) {
    const scope = describeScope(req);
    if (scope.isMinistry) return { ok: true, organisationId: toPositiveIntOrNull(requested) };
    if (scope.isOrganisation && scope.organisationId) return { ok: true, organisationId: scope.organisationId };
    return { ok: false };
}

/** The caller's organisation id when it may write actuals, else sends 403 and returns null. */
export function requireOrganisationWriter(req, res, message) {
    const scope = describeScope(req);
    if (!scope.isOrganisation || !scope.organisationId) {
        sendError(res, 403, message);
        return null;
    }
    return scope.organisationId;
}

export function requireMinistryWriter(req, res, what) {
    if (!describeScope(req).isMinistry) {
        sendError(res, 403, `${what} are maintained by the Ministry.`);
        return false;
    }
    return true;
}

/** Runtime CRUD check, for handlers that decide create vs update from what is saved. */
export function requirePermission(req, res, moduleCode, action) {
    const result = checkModulePermission(req.user, moduleCode, action);
    if (!result.ok) {
        sendError(res, result.status, result.message);
        return false;
    }
    return true;
}

export async function validateOrganisation(conn, organisationId) {
    const request = conn.request();
    request.input("organisationId", sql.Int, organisationId);
    const result = await request.query(`
        SELECT organisation_id, organisation_name FROM mmt_organisation WHERE organisation_id = @organisationId
    `);
    return result.recordset[0] || null;
}

// ---------------------------------------------------------------------------
// Ministry late-entry access (unlock)
// ---------------------------------------------------------------------------

/** month_to_unlock is stored as a JSON array ("[4,5]"); legacy rows may hold "ALL" or one number. */
export function parseUnlockMonths(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return [];
    try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.map(Number).filter((m) => ALL_MONTHS.includes(m));
    } catch {
        return String(raw).trim().toUpperCase() === "ALL" ? [...ALL_MONTHS] : [Number(raw)].filter((m) => ALL_MONTHS.includes(m));
    }
}

// Grants past their expiry date are reported as EXPIRED without writing on reads
export const EFFECTIVE_STATUS_SQL = `
    CASE
        WHEN a.status = 'ACTIVE' AND a.expiry_date IS NOT NULL
             AND CAST(a.expiry_date AS DATE) < CAST(GETDATE() AS DATE) THEN 'EXPIRED'
        ELSE a.status
    END
`;

const ACCESS_STATUSES = ["ACTIVE", "EXPIRED", "REVOKED"];

export function entryWindowOpen(today = new Date()) {
    return today.getDate() <= ENTRY_WINDOW_LAST_DAY;
}

/**
 * Entry window and unlock handlers for one section.
 * moduleId: the section's module_id in ministry_access_module_audit_track
 * subject: lower-case noun used in messages, e.g. "traffic", "port performance data"
 */
export function createEntryAccess({ moduleId, subject }) {
    const logLabel = subject;

    async function loadActiveGrants(conn, organisationId) {
        const request = conn.request();
        request.input("organisationId", sql.NVarChar(20), String(organisationId));
        request.input("moduleId", sql.NVarChar(20), moduleId);
        const result = await request.query(`
            SELECT a.access_id, a.financial_year, a.month_to_unlock, a.expiry_date
            FROM ministry_access_module_audit_track a
            WHERE a.organisation_id = @organisationId
              AND a.module_id = @moduleId
              AND ${EFFECTIVE_STATUS_SQL} = 'ACTIVE'
            ORDER BY a.financial_year, a.access_id
        `);
        return result.recordset.map((row) => ({
            accessId: row.access_id,
            financialYear: String(row.financial_year || "").toUpperCase() === "ALL" ? "ALL" : normaliseFiscalYear(row.financial_year),
            months: parseUnlockMonths(row.month_to_unlock),
            expiryDate: row.expiry_date,
        }));
    }

    /** Whether the organisation may change actuals for this period right now. */
    async function getEntryAccess(conn, organisationId, fiscalYear, month) {
        if (entryWindowOpen()) return { open: true, reason: "window" };
        const grants = await loadActiveGrants(conn, organisationId);
        const grant = grants.find(
            (g) => (g.financialYear === "ALL" || g.financialYear === fiscalYear) && g.months.includes(month)
        );
        return grant
            ? { open: true, reason: "unlocked", expiryDate: grant.expiryDate }
            : { open: false, reason: "locked" };
    }

    function lockedMessage(fiscalYear, month) {
        return `Data entry for ${MONTH_NAMES[month - 1]} ${fiscalYear} is closed after the ${ENTRY_WINDOW_LAST_DAY}th of the month. Ask the Ministry to unlock this period.`;
    }

    /** Entry window and the caller's active ministry grants (organisation users). */
    async function getEntryStatus(req, res) {
        const scope = describeScope(req);
        const base = {
            windowLastDay: ENTRY_WINDOW_LAST_DAY,
            windowOpen: entryWindowOpen(),
            currentFinancialYear: currentFinancialYear(),
        };
        if (!scope.isOrganisation || !scope.organisationId) {
            return res.status(200).json({ ...base, canEnterActuals: false, grants: [] });
        }
        try {
            const conn = await pool;
            const grants = await loadActiveGrants(conn, scope.organisationId);
            return res.status(200).json({ ...base, canEnterActuals: true, grants });
        } catch (error) {
            console.error(`Error fetching ${logLabel} entry status:`, error);
            return sendError(res, 500, "Data entry access could not be checked.");
        }
    }

    async function listGrants(req, res) {
        const read = resolveReadOrganisation(req, req.query.organisationId);
        if (!read.ok) return sendError(res, 403, "Your account is not linked to an organisation.");

        const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
        const status = String(req.query.status || "").toUpperCase();
        const { page, limit, search } = parseListQuery(req.query);

        const bind = (request) => {
            request.input("moduleId", sql.NVarChar(20), moduleId);
            const parts = [];
            if (read.organisationId) {
                request.input("orgFilter", sql.NVarChar(20), String(read.organisationId));
                parts.push("a.organisation_id = @orgFilter");
            }
            if (fiscalYear) {
                request.input("fyFilter", sql.NVarChar(20), fiscalYear);
                parts.push("(a.financial_year = @fyFilter OR UPPER(a.financial_year) = 'ALL')");
            }
            if (ACCESS_STATUSES.includes(status)) {
                request.input("statusFilter", sql.NVarChar(20), status);
                parts.push(`${EFFECTIVE_STATUS_SQL} = @statusFilter`);
            }
            if (search) {
                request.input("search", sql.NVarChar(200), `%${search}%`);
                parts.push("(org.organisation_name LIKE @search OR a.email_or_remarks LIKE @search OR a.financial_year LIKE @search)");
            }
            return parts.length ? `AND ${parts.join(" AND ")}` : "";
        };
        const fromSql = (where) => `
            FROM ministry_access_module_audit_track a
            LEFT JOIN mmt_organisation org ON org.organisation_id = TRY_CAST(a.organisation_id AS INT)
            LEFT JOIN tbl_user granted ON granted.user_id = a.created_by
            LEFT JOIN tbl_user revoked ON revoked.user_id = a.revoked_by
            WHERE a.module_id = @moduleId ${where}
        `;

        try {
            const conn = await pool;
            const countRequest = conn.request();
            const countWhere = bind(countRequest);
            const dataRequest = conn.request();
            const dataWhere = bind(dataRequest);
            dataRequest.input("offset", sql.Int, (page - 1) * limit);
            dataRequest.input("limit", sql.Int, limit);

            const [countResult, dataResult] = await Promise.all([
                countRequest.query(`SELECT COUNT(*) AS total ${fromSql(countWhere)}`),
                dataRequest.query(`
                    SELECT a.access_id, TRY_CAST(a.organisation_id AS INT) AS organisation_id, org.organisation_name,
                           a.financial_year, a.month_to_unlock, a.expiry_date, a.email_or_remarks,
                           ${EFFECTIVE_STATUS_SQL} AS status,
                           a.created_at, granted.name AS granted_by_name,
                           a.revoked_at, revoked.name AS revoked_by_name
                    ${fromSql(dataWhere)}
                    ORDER BY a.created_at DESC, a.access_id DESC
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                `),
            ]);

            const rows = dataResult.recordset.map(({ month_to_unlock: raw, ...row }) => ({
                ...row,
                months: parseUnlockMonths(raw),
            }));
            const total = countResult.recordset[0]?.total || 0;
            return res.status(200).json({ data: rows, pagination: buildPagination(total, page, limit) });
        } catch (error) {
            console.error(`Error fetching ${logLabel} access grants:`, error);
            return sendError(res, 500, "Data entry access records could not be loaded.");
        }
    }

    async function createGrant(req, res) {
        if (!requireMinistryWriter(req, res, "Data entry unlocks")) return undefined;
        const userId = resolveUserId(req);
        if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");

        const organisationIds = [...new Set((req.body?.organisationIds || []).map(toPositiveIntOrNull).filter(Boolean))];
        const financialYears = [...new Set((req.body?.financialYears || []).map(normaliseFiscalYear).filter(Boolean))];
        const rawMonths = req.body?.months;
        const months = rawMonths === "ALL"
            ? [...ALL_MONTHS]
            : [...new Set((Array.isArray(rawMonths) ? rawMonths : []).map(parseMonth).filter(Boolean))].sort((a, b) => a - b);
        const remarks = String(req.body?.remarks || "").trim().slice(0, 500) || null;
        const expiryDate = req.body?.expiryDate ? new Date(`${req.body.expiryDate}T00:00:00`) : null;

        if (!organisationIds.length) return sendError(res, 400, "Select at least one organisation.");
        if (!financialYears.length) return sendError(res, 400, "Select at least one financial year.");
        if (!months.length) return sendError(res, 400, "Select at least one month.");
        if (expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (Number.isNaN(expiryDate.getTime()) || expiryDate < today) {
                return sendError(res, 400, "Valid Until must be today or a later date.");
            }
        }

        const conn = await pool;
        let transaction = null;
        try {
            const orgCheck = conn.request();
            const orgParams = organisationIds.map((id, i) => {
                orgCheck.input(`org${i}`, sql.Int, id);
                return `@org${i}`;
            });
            const orgResult = await orgCheck.query(`
                SELECT organisation_id, organisation_name FROM mmt_organisation
                WHERE organisation_id IN (${orgParams.join(", ")})
            `);
            if (orgResult.recordset.length !== organisationIds.length) {
                return sendError(res, 400, "One or more selected organisations do not exist.");
            }
            const orgNames = new Map(orgResult.recordset.map((r) => [Number(r.organisation_id), r.organisation_name]));

            // Refuse months that are already unlocked so the access log stays unambiguous
            const duplicates = [];
            for (const organisationId of organisationIds) {
                const grants = await loadActiveGrants(conn, organisationId);
                for (const fy of financialYears) {
                    const unlocked = new Set(
                        grants.filter((g) => g.financialYear === fy || g.financialYear === "ALL").flatMap((g) => g.months)
                    );
                    const overlap = months.filter((m) => unlocked.has(m));
                    if (overlap.length) {
                        duplicates.push(`${orgNames.get(organisationId)} ${fy} (${overlap.map((m) => MONTH_NAMES[m - 1]).join(", ")})`);
                    }
                }
            }
            if (duplicates.length) {
                return sendError(res, 409, `Already unlocked: ${duplicates.join("; ")}. Revoke the existing access first or choose other months.`);
            }

            transaction = new sql.Transaction(conn);
            await transaction.begin();
            for (const organisationId of organisationIds) {
                for (const fy of financialYears) {
                    const request = new sql.Request(transaction);
                    request.input("organisationId", sql.NVarChar(20), String(organisationId));
                    request.input("moduleId", sql.NVarChar(20), moduleId);
                    request.input("fiscalYear", sql.NVarChar(20), fy);
                    request.input("months", sql.NVarChar(100), JSON.stringify(months));
                    request.input("expiryDate", sql.DateTime, expiryDate);
                    request.input("remarks", sql.NVarChar(500), remarks);
                    request.input("userId", sql.Int, userId);
                    await request.query(`
                        INSERT INTO ministry_access_module_audit_track
                            (organisation_id, module_id, financial_year, month_to_unlock, expiry_date,
                             email_or_remarks, created_by, created_at, status)
                        VALUES (@organisationId, @moduleId, @fiscalYear, @months, @expiryDate,
                                @remarks, @userId, GETDATE(), 'ACTIVE')
                    `);
                }
            }
            await transaction.commit();
            return res.status(201).json({
                success: true,
                message: "Data entry unlocked.",
                granted: organisationIds.length * financialYears.length,
            });
        } catch (error) {
            if (transaction) await transaction.rollback().catch(() => {});
            console.error(`Error granting ${logLabel} access:`, error);
            return sendError(res, 500, "Data entry could not be unlocked.");
        }
    }

    async function revokeGrant(req, res) {
        if (!requireMinistryWriter(req, res, "Data entry unlocks")) return undefined;
        const userId = resolveUserId(req);
        if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
        const accessId = toPositiveIntOrNull(req.params.accessId);
        if (!accessId) return sendError(res, 400, "Invalid access record.");

        try {
            const conn = await pool;
            const request = conn.request();
            request.input("accessId", sql.Int, accessId);
            request.input("moduleId", sql.NVarChar(20), moduleId);
            request.input("userId", sql.Int, userId);
            const result = await request.query(`
                UPDATE ministry_access_module_audit_track
                SET status = 'REVOKED', revoked_by = @userId, revoked_at = GETDATE(), updated_at = GETDATE()
                WHERE access_id = @accessId AND module_id = @moduleId AND status = 'ACTIVE'
            `);
            if (!result.rowsAffected[0]) return sendError(res, 404, "This access is no longer active.");
            return res.status(200).json({ success: true, message: "Access revoked." });
        } catch (error) {
            console.error(`Error revoking ${logLabel} access:`, error);
            return sendError(res, 500, "The access could not be revoked.");
        }
    }

    return {
        loadActiveGrants,
        getEntryAccess,
        lockedMessage,
        getEntryStatus,
        listGrants,
        createGrant,
        revokeGrant,
    };
}
