import { pool } from "../../db.js";
import { getDataScope, applyDataScope } from "../../middleware/dataScope.js";

const MAX_INT = 2147483647;

const MONTHS = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March",
];

const SOCIAL_CHANNELS = ["twitter", "instagram", "facebook", "linkedIn", "youTube"];
const SOCIAL_METRICS = ["posts", "impression", "engagement"];
const CHANNEL_LABELS = { twitter: "Twitter", instagram: "Instagram", facebook: "Facebook", linkedIn: "LinkedIn", youTube: "YouTube" };
const METRIC_LABELS = { posts: "Posts", impression: "Impression", engagement: "Engagement" };

// Entered columns per media type; overall is the sum of the two entered values
const SECTIONS = {
    broadcast: { checked: "broadcast_checked", inputs: ["broadcast_national", "broadcast_regional"], overall: "broadcast_overall" },
    print_media: { checked: "print_media_checked", inputs: ["print_media_national", "print_media_regional"], overall: "print_media_overall" },
    online: { checked: "online_checked", inputs: ["online_english", "online_vernacular"], overall: "online_overall" },
    social_media: {
        checked: "social_media_checked",
        inputs: SOCIAL_CHANNELS.flatMap((channel) => SOCIAL_METRICS.map((metric) => `${channel}_${metric}`)),
    },
};

// Financial-year order: April = 1 ... March = 12
const MONTH_ORDER_SQL = `CASE sm.month ${MONTHS.map((m, i) => `WHEN '${m}' THEN ${i + 1}`).join(" ")} END`;

const QUARTER_SQL = `CASE
    WHEN sm.month IN ('April', 'May', 'June') THEN 'Quarter 1'
    WHEN sm.month IN ('July', 'August', 'September') THEN 'Quarter 2'
    WHEN sm.month IN ('October', 'November', 'December') THEN 'Quarter 3'
    ELSE 'Quarter 4'
END`;

function isValidFinancialYear(value) {
    const match = /^(\d{4})-(\d{4})$/.exec(String(value ?? ""));
    return !!match && Number(match[2]) === Number(match[1]) + 1;
}

// True when the month has not started yet (figures can only be entered for past or current months)
function isFutureMonth(financialYear, month) {
    const index = MONTHS.indexOf(month);
    const year = Number(financialYear.slice(0, 4)) + (index >= 9 ? 1 : 0);
    return new Date(year, (index + 3) % 12, 1) > new Date();
}

// Older records may store '2026-27' instead of '2026-2027'; lookups match both
const shortFinancialYear = (fy) => `${fy.slice(0, 4)}-${fy.slice(7)}`;
const FULL_YEAR_SQL = "LEFT(sm.financial_year, 4) + '-' + CAST(CAST(LEFT(sm.financial_year, 4) AS INT) + 1 AS VARCHAR(4))";

// Missing counts as 0; only whole numbers or digit strings in int range are valid, else null
function readCount(value) {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === "string" && !/^\d+$/.test(value)) return null;
    if (typeof value !== "number" && typeof value !== "string") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= MAX_INT ? n : null;
}

// Returns { column: value } for one media type, or null if any value is invalid
function readSection(body, section) {
    const { inputs, overall } = SECTIONS[section];
    const values = {};
    for (const column of inputs) {
        const n = readCount(body[column]);
        if (n === null) return null;
        values[column] = n;
    }
    if (overall) {
        values[overall] = values[inputs[0]] + values[inputs[1]];
        if (values[overall] > MAX_INT) return null;
    }
    return values;
}

const isDuplicateKey = (err) => [2601, 2627].includes(err?.number);

const currentUserId = (req) => Number(req.user?.userId ?? req.user?.user_id) || null;

// Organisation filter from the user's RBAC data scope, the same rule other modules use
const scopeSql = (req, request) => applyDataScope(request, req.user, { alias: "sm" }).whereSql;

function sendServerError(res, err, action) {
    console.error(`Media outreach ${action} failed:`, err);
    return res.sendStatus(500);
}

async function createSocialMedia(req, res) {
    try {
        const { isWide, isOrganisation, organisationId: scopeOrgId } = getDataScope(req.user);
        if (!isWide && !isOrganisation) return res.sendStatus(403);

        const { financial_year: financialYear, month } = req.body;
        if (!isValidFinancialYear(financialYear) || !MONTHS.includes(month)) {
            return res.status(400).json({ message: "Invalid financial year or month" });
        }
        if (isFutureMonth(financialYear, month)) {
            return res.status(400).json({ message: "Month has not started yet" });
        }

        const organisationId = isWide ? Number(req.body.organisation_id) : scopeOrgId;
        if (!Number.isInteger(organisationId) || organisationId <= 0) {
            return res.status(400).json({ message: "Invalid organisation" });
        }

        const values = {};
        for (const section of Object.keys(SECTIONS)) {
            const sectionValues = readSection(req.body, section);
            if (!sectionValues) return res.status(400).json({ message: "Invalid count values" });
            Object.assign(values, sectionValues, { [SECTIONS[section].checked]: 1 });
        }

        const conn = await pool;
        const request = conn.request()
            .input("organisationId", organisationId)
            .input("financialYear", financialYear)
            .input("shortFinancialYear", shortFinancialYear(financialYear))
            .input("month", month)
            .input("createdBy", currentUserId(req));

        const orgCheck = await request.query("SELECT COUNT(1) AS count FROM mmt_organisation WHERE organisation_id = @organisationId");
        if (orgCheck.recordset[0].count === 0) return res.status(400).json({ message: "Invalid organisation" });

        const columns = Object.keys(values);
        columns.forEach((column) => request.input(column, values[column]));

        // Check and insert inside one locked transaction so two saves cannot both insert
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            IF EXISTS (
                SELECT 1 FROM tbl_social_media WITH (UPDLOCK, HOLDLOCK)
                WHERE organisation_id = @organisationId AND month = @month
                  AND financial_year IN (@financialYear, @shortFinancialYear)
            )
            BEGIN
                COMMIT TRANSACTION;
                SELECT 1 AS duplicate;
            END
            ELSE
            BEGIN
                INSERT INTO tbl_social_media
                    (organisation_id, financial_year, month, ${columns.join(", ")}, created_by, created_date)
                VALUES
                    (@organisationId, @financialYear, @month, ${columns.map((c) => `@${c}`).join(", ")}, @createdBy, GETDATE());
                COMMIT TRANSACTION;
                SELECT 0 AS duplicate;
            END
        `);
        return res.sendStatus(result.recordset[0].duplicate ? 409 : 201);
    } catch (err) {
        if (isDuplicateKey(err)) return res.sendStatus(409);
        return sendServerError(res, err, "create");
    }
}

async function getSocialMediaList(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        let searchSql = "";
        const search = String(req.query.search ?? "").trim();
        if (search) {
            // Escape LIKE wildcards so the text is matched as typed
            request.input("search", `%${search.replace(/[\\%_[]/g, "\\$&")}%`);
            searchSql = `AND (o.organisation_name LIKE @search ESCAPE '\\'
                OR sm.month LIKE @search ESCAPE '\\'
                OR sm.financial_year LIKE @search ESCAPE '\\')`;
        }

        const fromSql = `
            FROM tbl_social_media sm
            LEFT JOIN mmt_organisation o ON sm.organisation_id = o.organisation_id
            LEFT JOIN mmt_organisation_category c ON o.organisation_category_id = c.organisation_category_id
            WHERE 1 = 1 ${scopeSql(req, request)} ${searchSql}
        `;
        const selectSql = `
            SELECT sm.*, o.organisation_name, c.organisation_category_name
            ${fromSql}
            ORDER BY LEFT(sm.financial_year, 4) DESC, ${MONTH_ORDER_SQL} DESC, sm.media_outreach_id DESC
        `;

        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        if (!(page > 0 && limit > 0)) {
            const result = await request.query(selectSql);
            return res.json(result.recordset);
        }

        const pageSize = Math.min(limit, 500);
        request.input("offset", (page - 1) * pageSize).input("limit", pageSize);
        const countResult = await request.query(`SELECT COUNT(1) AS total ${fromSql}`);
        const total = countResult.recordset[0].total;
        const result = await request.query(`${selectSql} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);

        return res.json({
            data: result.recordset,
            pagination: { total, page, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (err) {
        return sendServerError(res, err, "list");
    }
}

async function updateSocialMedia(req, res) {
    try {
        const id = Number(req.body.media_outreach_id);
        const section = req.body.type;
        if (!Number.isInteger(id) || id <= 0 || !SECTIONS[section]) {
            return res.status(400).json({ message: "Invalid record or media type" });
        }

        const values = readSection(req.body, section);
        if (!values) return res.status(400).json({ message: "Invalid count values" });

        const conn = await pool;
        const request = conn.request().input("id", id).input("updatedBy", currentUserId(req));
        const columns = Object.keys(values);
        columns.forEach((column) => request.input(column, values[column]));

        const result = await request.query(`
            UPDATE sm
            SET ${columns.map((c) => `${c} = @${c}`).join(", ")}, updated_by = @updatedBy, updated_date = GETDATE()
            FROM tbl_social_media sm
            WHERE sm.media_outreach_id = @id ${scopeSql(req, request)}
        `);
        if (result.rowsAffected[0] === 0) return res.sendStatus(404);
        return res.sendStatus(200);
    } catch (err) {
        return sendServerError(res, err, "update");
    }
}

async function deleteSocialMedia(req, res) {
    try {
        const id = Number(req.params.mediaOutreachId);
        const mediaType = req.query.type;
        if (!Number.isInteger(id) || id <= 0 || !SECTIONS[mediaType]) {
            return res.status(400).json({ message: "Invalid record or media type" });
        }
        const deletedBy = currentUserId(req);
        if (!deletedBy) return res.sendStatus(403);

        const conn = await pool;
        const request = conn.request().input("id", id).input("mediaType", mediaType).input("deletedBy", deletedBy);
        // The delete and its log row are written by one statement, so both happen or neither does
        const result = await request.query(`
            DELETE sm
            OUTPUT deleted.media_outreach_id, deleted.organisation_id, @mediaType,
                   deleted.financial_year, deleted.month, @deletedBy, GETDATE()
            INTO tbl_social_media_delete_log
                (media_outreach_id, organisation_id, media_type, financial_year, month, deleted_by, deleted_date)
            FROM tbl_social_media sm
            WHERE sm.media_outreach_id = @id ${scopeSql(req, request)}
        `);
        if (result.rowsAffected[0] === 0) return res.sendStatus(404);
        return res.sendStatus(200);
    } catch (err) {
        return sendServerError(res, err, "delete");
    }
}

// SUM columns for a summary, e.g. broadcast_national -> total_national, twitter_posts -> twitter_posts
function summaryColumns(platform) {
    const { inputs, overall } = SECTIONS[platform];
    if (platform === "social_media") {
        return inputs.map((c) => `SUM(ISNULL(sm.${c}, 0)) AS ${c}`).join(", ");
    }
    return [...inputs, overall]
        .map((c) => `SUM(ISNULL(sm.${c}, 0)) AS ${c.replace(`${platform}_`, "total_")}`)
        .join(", ");
}

async function sendSummary(req, res, byQuarter) {
    const { platform } = req.params;
    if (!SECTIONS[platform]) return res.status(400).json({ message: "Invalid platform" });

    try {
        const conn = await pool;
        const request = conn.request();
        const result = await request.query(`
            SELECT sm.organisation_id, ${FULL_YEAR_SQL} AS financial_year,
                ${byQuarter ? `${QUARTER_SQL} AS quarter_number,` : ""}
                ${summaryColumns(platform)}
            FROM tbl_social_media sm
            WHERE sm.financial_year IS NOT NULL ${scopeSql(req, request)}
            GROUP BY sm.organisation_id, ${FULL_YEAR_SQL}${byQuarter ? `, ${QUARTER_SQL}` : ""}
            ORDER BY financial_year DESC${byQuarter ? ", quarter_number" : ""}
        `);
        return res.json(result.recordset);
    } catch (err) {
        return sendServerError(res, err, byQuarter ? "quarterly summary" : "annual summary");
    }
}

const getQuarterlySummary = (req, res) => sendSummary(req, res, true);
const getAnnualSummary = (req, res) => sendSummary(req, res, false);

// Report SELECT columns and matching grid column definitions
function reportLayout(platform) {
    const baseDefs = ["S No", "Organisation Name", "Month", "Financial Year"].map((field) => ({ headerName: field, field }));

    if (platform === "social_media") {
        return {
            columns: SECTIONS.social_media.inputs.map((c) => `sm.${c} AS ${c}`).join(", "),
            columnDefs: [
                ...baseDefs,
                ...SOCIAL_CHANNELS.map((channel) => ({
                    headerName: CHANNEL_LABELS[channel],
                    children: SOCIAL_METRICS.map((metric) => ({ headerName: METRIC_LABELS[metric], field: `${channel}_${metric}` })),
                })),
            ],
        };
    }

    const { inputs, overall } = SECTIONS[platform];
    const labels = platform === "online"
        ? ["Online English", "Online Vernacular", "Online Overall"]
        : ["National", "Regional", "Overall"];
    return {
        columns: [...inputs, overall].map((c, i) => `sm.${c} AS [${labels[i]}]`).join(", "),
        columnDefs: [...baseDefs, ...labels.map((label) => ({ headerName: label, field: label }))],
    };
}

async function sendMonthlyReport(req, res, platform) {
    const { currentMonth, currentFinYear } = req.params;
    if (!SECTIONS[platform]) return res.status(400).json({ message: "Invalid platform" });
    if (currentMonth !== "ALL" && !MONTHS.includes(currentMonth)) {
        return res.status(400).json({ message: "Invalid month" });
    }
    if (currentFinYear !== "ALL" && !isValidFinancialYear(currentFinYear)) {
        return res.status(400).json({ message: "Invalid financial year" });
    }

    try {
        const conn = await pool;
        const request = conn.request();
        const conditions = [`sm.${SECTIONS[platform].checked} = 1 ${scopeSql(req, request)}`];
        if (currentFinYear !== "ALL") {
            request.input("financialYear", currentFinYear);
            request.input("shortFinancialYear", shortFinancialYear(currentFinYear));
            conditions.push("sm.financial_year IN (@financialYear, @shortFinancialYear)");
        }
        if (currentMonth !== "ALL") {
            request.input("month", currentMonth);
            conditions.push("sm.month = @month");
        }

        const { columns, columnDefs } = reportLayout(platform);
        const result = await request.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY o.organisation_name, sm.financial_year, ${MONTH_ORDER_SQL}) AS [S No],
                o.organisation_name AS [Organisation Name],
                sm.month AS [Month],
                ${FULL_YEAR_SQL} AS [Financial Year],
                ${columns}
            FROM tbl_social_media sm
            INNER JOIN mmt_organisation o ON o.organisation_id = sm.organisation_id
            WHERE ${conditions.join(" AND ")}
            ORDER BY [S No]
        `);
        return res.json({ columnDefs, rowData: result.recordset });
    } catch (err) {
        return sendServerError(res, err, `${platform} report`);
    }
}

const getMonthlyOnlineReport = (req, res) => sendMonthlyReport(req, res, "online");
const getMonthlySocialReport = (req, res) => sendMonthlyReport(req, res, "social_media");

function getMonthlyBroadPrintReport(req, res) {
    const { platform } = req.params;
    if (platform !== "broadcast" && platform !== "print_media") {
        return res.status(400).json({ message: "Invalid platform" });
    }
    return sendMonthlyReport(req, res, platform);
}

export default {
    createSocialMedia,
    getSocialMediaList,
    updateSocialMedia,
    deleteSocialMedia,
    getQuarterlySummary,
    getAnnualSummary,
    getMonthlyOnlineReport,
    getMonthlySocialReport,
    getMonthlyBroadPrintReport,
};
