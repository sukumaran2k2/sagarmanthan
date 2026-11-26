import sql from "mssql";
import { pool } from "../../db.js";
import { sendError, resolveUserId } from "./kpiEntryCommon.js";

// KPI DGS K-2.5 - Marine Casualty Serious & Other Incidents (the old portal's tables).
//
//   K-2.5.1 Previous & Current Year  tbl_kpi_incident_prev_curr_year  one row per incident type
//   K-2.5.3 Country (Flag)-wise      tbl_kpi_incident_country_wise    one row per country
//   K-2.5.4 Vessel-wise              tbl_kpi_vessel_incident          one row per vessel type
//      An entry is a calendar year + casualty type (Marine / Other): a sheet of named rows, each
//      with the number of incidents in every month. One entry per year + casualty type.
//   K-2.5.2 Year-wise                tbl_kpi_incident_year_wise       one row per year, 7 counts
//
// Rules (the old portal's, with K-2.4's checks):
//   add  - a year (+ casualty type) that already has an entry is refused (409), checked under lock
//   edit - opened from the Data List; year and casualty type are fixed, the counts change. The
//          sheet's rows are replaced in one transaction (the old portal deleted and re-added them
//          one by one, and dropped the year / casualty type on rows added while editing)
//   every count is a whole number >= 0; months after the current one must be 0; no future year
// The reports compare a year with the one before it by quarter (Jan-Mar ... Oct-Dec), as the old
// portal did; the year can now be chosen (the old portal always used this year and last year).

export const CASUALTY_TYPES = ["Marine Casualty", "Other Casualty"];
export const MONTH_KEYS = ["january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december"];
const MONTH_COLS = MONTH_KEYS.map((m) => `${m}_incidents`);
const monthLabel = (i) => MONTH_KEYS[i][0].toUpperCase() + MONTH_KEYS[i].slice(1);
const sumMonths = (alias, months = MONTH_COLS) => months.map((c) => `ISNULL(${alias}.${c}, 0)`).join(" + ");
const QUARTERS = [[0, 3], [3, 6], [6, 9], [9, 12]].map(([a, b]) => MONTH_COLS.slice(a, b));
const TODAY_SQL = "CAST(GETDATE() AS DATE)";
const MAX_COUNT = 100000;

// The rows each sheet offers, in the old portal's order (the names its saved entries use)
const INCIDENT_TYPES = {
    "Marine Casualty": ["Collision", "Grounding", "Sinking", "Fire and Explosion", "Flooding",
        "Hijacking/Piracy", "Incident Onboard", "Man Overboard", "Loss of Anchor / Propeller",
        "Death ashore due to accident"],
    "Other Casualty": ["Incident Onboard", "Man Overboard", "Missing Onboard", "Suicide", "Desertion",
        "Sickness Onboard/Death Onboard", "Sickness Onboard/Death ashore", "Death ashore due to accident",
        "Sickness", "Injury", "Incident Ashore", "Arrested Ashore"],
};
const COUNTRIES = ["Hong Kong", "Liberia", "India", "Panama", "Marshall Islands", "Gabon", "Japan",
    "Singapore", "Bermuda", "Denmark", "Norway", "Bahamas", "Cook Island", "Malta", "Portugal",
    "Cameroon", "China", "Isle of Man", "Kuwait", "Saint Vincent and the Grenadines",
    "United Republic of Tanzania", "Barbados", "Union of Comoros"];
const VESSEL_TYPES = ["Bulk Carrier", "Container Vessel", "Crude Oil Tanker", "LPG Tanker", "LNG Tanker",
    "Oil Product Tanker", "Passenger", "Chemical Tanker", "General Cargo", "Livestock Carrier", "OSV",
    "Tug", "FPSO", "Car Carrier", "MSV", "VLCC"];

export const SHEETS = {
    "incident-types": {
        code: "K-2.5.1", table: "tbl_kpi_incident_prev_curr_year", nameCol: "type_of_incident",
        rowLabel: "Type of Incident", names: (casualtyType) => INCIDENT_TYPES[casualtyType] || [],
    },
    countries: {
        code: "K-2.5.3", table: "tbl_kpi_incident_country_wise", nameCol: "country_name",
        rowLabel: "Country (Flag)", names: () => COUNTRIES,
    },
    vessels: {
        code: "K-2.5.4", table: "tbl_kpi_vessel_incident", nameCol: "vessel_name",
        rowLabel: "Vessel Type", names: () => VESSEL_TYPES,
    },
};

// K-2.5.2 counts: body field -> column
export const YEAR_WISE_FIELDS = {
    accidentalDeath: "accidental_death", missingDesertion: "missing_desertion", naturalDeath: "natural_death",
    suicides: "suicides", injuries: "injuries", manOverboard: "man_overboard", missingOnboard: "missing_onboard",
};
const YEAR_WISE_TABLE = "tbl_kpi_incident_year_wise";
const YEAR_WISE_TOTAL = Object.values(YEAR_WISE_FIELDS).map((c) => `ISNULL(${c}, 0)`).join(" + ");

const wholeNumber = (v) => (/^\s*\d+\s*$/.test(String(v ?? "")) ? Number(v) : NaN);
const now = () => new Date();
const validYear = (year) => Number.isInteger(year) && year >= 2000 && year <= now().getFullYear();
// Months (1-12) of the year that haven't started yet; none for a past year
const futureMonths = (year) => (year === now().getFullYear() ? MONTH_KEYS.map((_, i) => i + 1).filter((m) => m > now().getMonth() + 1) : []);
const sheetOf = (req) => SHEETS[req.params.sheet] || null;
const notFound = (res) => sendError(res, 404, "Not a K-2.5 sheet.");

// ---------------------------------------------------------------------------
// Sheets (K-2.5.1 / 2.5.3 / 2.5.4)
// ---------------------------------------------------------------------------

// The body's sheet, checked: { year, casualtyType, rows: [{ name, months: [12 counts] }] }.
// Every listed row must be present once; returns { problem } or { year, casualtyType, rows }.
function readSheetBody(sheet, body = {}) {
    const year = wholeNumber(body.year);
    if (!validYear(year)) return { problem: "Select a year up to the current one." };
    const casualtyType = String(body.casualtyType ?? "").trim();
    if (!CASUALTY_TYPES.includes(casualtyType)) return { problem: "Select Marine Casualty or Other Casualty." };
    const names = sheet.names(casualtyType);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const byName = new Map();
    for (const row of rows) {
        const name = String(row?.name ?? "").trim();
        if (!names.includes(name)) return { problem: `"${name}" is not one of the ${sheet.rowLabel.toLowerCase()} rows.` };
        if (byName.has(name)) return { problem: `"${name}" is listed twice.` };
        const months = Array.isArray(row.months) ? row.months : [];
        if (months.length !== 12) return { problem: `${name}: a count is needed for every month.` };
        const counts = months.map((v) => (v === "" || v == null ? 0 : wholeNumber(v)));
        const bad = counts.findIndex((n) => !Number.isInteger(n) || n < 0 || n > MAX_COUNT);
        if (bad >= 0) return { problem: `${name}, ${monthLabel(bad)}: the count must be a whole number of 0 or more.` };
        const early = futureMonths(year).find((m) => counts[m - 1] > 0);
        if (early) return { problem: `${name}: ${monthLabel(early - 1)} ${year} hasn't started yet, so its count must be 0.` };
        byName.set(name, counts);
    }
    const missing = names.filter((n) => !byName.has(n));
    if (missing.length) return { problem: `Counts are missing for: ${missing.join(", ")}.` };
    return { year, casualtyType, rows: names.map((name) => ({ name, counts: byName.get(name) })) };
}

// Rows of one entry, inserted with one statement (created_* kept from the entry being replaced)
function insertRowsSql(sheet, request, rows) {
    const values = rows.map((row, i) => {
        request.input(`name${i}`, sql.NVarChar(150), row.name);
        row.counts.forEach((n, m) => request.input(`c${i}_${m}`, sql.Int, n));
        return `(@year, @casualtyType, @name${i}, ${row.counts.map((_, m) => `@c${i}_${m}`).join(", ")}, @createdDate, @createdBy, @updatedDate, @updatedBy)`;
    });
    return `INSERT INTO ${sheet.table} (year, casualty_type, ${sheet.nameCol}, ${MONTH_COLS.join(", ")}, created_date, created_by, updated_date, updated_by)
            VALUES ${values.join(",\n")};`;
}

// Data List: one line per year + casualty type
async function listSheet(req, res) {
    const sheet = sheetOf(req);
    if (!sheet) return notFound(res);
    try {
        const result = await (await pool).request().query(`
            SELECT year, casualty_type, COUNT(*) AS row_count,
                   SUM(${sumMonths("t")}) AS total_incidents,
                   MIN(created_date) AS created_date,
                   MAX(COALESCE(updated_date, created_date)) AS updated_date
            FROM ${sheet.table} t
            WHERE year IS NOT NULL AND casualty_type IS NOT NULL
            GROUP BY year, casualty_type
            ORDER BY year DESC, casualty_type`);
        res.json(result.recordset);
    } catch (err) {
        console.error(`K-2.5 ${req.params.sheet} list failed:`, err);
        return sendError(res, 500, "The entries could not be loaded.");
    }
}

// Form: the rows to fill for a year + casualty type, and the saved counts if there is an entry
async function getSheetForm(req, res) {
    const sheet = sheetOf(req);
    if (!sheet) return notFound(res);
    const year = wholeNumber(req.query.year);
    const casualtyType = String(req.query.casualtyType ?? "").trim();
    if (!Number.isInteger(year) || !CASUALTY_TYPES.includes(casualtyType)) {
        return sendError(res, 400, "A valid year and casualty type are required.");
    }
    try {
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        request.input("casualtyType", sql.NVarChar(150), casualtyType);
        const saved = (await request.query(`
            SELECT ${sheet.nameCol} AS name, ${MONTH_COLS.join(", ")}
            FROM ${sheet.table} WHERE year = @year AND casualty_type = @casualtyType
            ORDER BY id`)).recordset;
        const byName = new Map(saved.map((r) => [r.name, MONTH_COLS.map((c) => r[c])]));
        res.json({
            year, casualtyType, rowLabel: sheet.rowLabel,
            exists: saved.length > 0,
            futureMonths: futureMonths(year),
            rows: sheet.names(casualtyType).map((name) => ({ name, months: byName.get(name) || Array(12).fill(null) })),
        });
    } catch (err) {
        console.error(`K-2.5 ${req.params.sheet} form failed:`, err);
        return sendError(res, 500, "The entry could not be loaded.");
    }
}

// Add (POST) or replace (PUT) a year + casualty type's sheet, in one transaction
async function saveSheet(req, res) {
    const sheet = sheetOf(req);
    if (!sheet) return notFound(res);
    const isEdit = req.method === "PUT";
    const parsed = readSheetBody(sheet, req.body);
    if (parsed.problem) return sendError(res, 400, parsed.problem);
    const { year, casualtyType, rows } = parsed;
    const userId = resolveUserId(req);
    const transaction = new sql.Transaction(await pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);
        request.input("year", sql.Int, year);
        request.input("casualtyType", sql.NVarChar(150), casualtyType);
        const existing = (await request.query(`
            SELECT MIN(created_date) AS created_date, MIN(created_by) AS created_by, COUNT(*) AS n
            FROM ${sheet.table} WITH (UPDLOCK, HOLDLOCK)
            WHERE year = @year AND casualty_type = @casualtyType`)).recordset[0];
        if (!isEdit && existing.n > 0) {
            await transaction.rollback();
            return sendError(res, 409, "An entry for this year and casualty type already exists. Edit it from the Data List instead.");
        }
        if (isEdit && existing.n === 0) {
            await transaction.rollback();
            return sendError(res, 404, "This entry no longer exists. Refresh the list and try again.");
        }
        if (isEdit) await request.query(`DELETE FROM ${sheet.table} WHERE year = @year AND casualty_type = @casualtyType`);
        request.input("createdDate", sql.Date, isEdit ? existing.created_date : now());
        request.input("createdBy", sql.Int, isEdit ? existing.created_by : userId);
        request.input("updatedDate", sql.Date, isEdit ? now() : null);
        request.input("updatedBy", sql.Int, isEdit ? userId : null);
        await request.query(insertRowsSql(sheet, request, rows));
        await transaction.commit();
        return res.status(isEdit ? 200 : 201).json({ message: isEdit ? "Entry updated." : "Entry saved." });
    } catch (err) {
        try { await transaction.rollback(); } catch { /* already rolled back */ }
        console.error(`K-2.5 ${req.params.sheet} save failed:`, err);
        return sendError(res, 500, isEdit ? "The entry could not be updated." : "The entry could not be saved.");
    }
}

// ---------------------------------------------------------------------------
// K-2.5.2 Year-wise
// ---------------------------------------------------------------------------

const yearWiseColumns = Object.values(YEAR_WISE_FIELDS).join(", ");

async function listYearWise(req, res) {
    try {
        const result = await (await pool).request().query(`
            SELECT id, year, ${yearWiseColumns}, ${YEAR_WISE_TOTAL} AS total_incidents,
                   created_date, COALESCE(updated_date, created_date) AS updated_date
            FROM ${YEAR_WISE_TABLE} WHERE year IS NOT NULL ORDER BY year DESC`);
        res.json(result.recordset);
    } catch (err) {
        console.error("K-2.5.2 list failed:", err);
        return sendError(res, 500, "The entries could not be loaded.");
    }
}

async function getYearWiseEntry(req, res) {
    const year = wholeNumber(req.query.year);
    if (!Number.isInteger(year)) return sendError(res, 400, "A valid year is required.");
    try {
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        const row = (await request.query(`SELECT year, ${yearWiseColumns} FROM ${YEAR_WISE_TABLE} WHERE year = @year`)).recordset[0];
        res.json({ year, exists: Boolean(row), counts: row || null });
    } catch (err) {
        console.error("K-2.5.2 entry failed:", err);
        return sendError(res, 500, "The entry could not be loaded.");
    }
}

// Add (POST) or update (PUT) a year's counts (field checks are in middleware/kpiValidation.js)
async function saveYearWise(req, res) {
    const isEdit = req.method === "PUT";
    const year = wholeNumber(req.body.year);
    if (!validYear(year)) return sendError(res, 400, "Select a year up to the current one.");
    const userId = resolveUserId(req);
    try {
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        request.input("userId", sql.Int, userId);
        Object.entries(YEAR_WISE_FIELDS).forEach(([field, col]) => request.input(col, sql.Int, wholeNumber(req.body[field])));
        if (isEdit) {
            const result = await request.query(`
                UPDATE ${YEAR_WISE_TABLE}
                SET ${Object.values(YEAR_WISE_FIELDS).map((c) => `${c} = @${c}`).join(", ")},
                    updated_date = ${TODAY_SQL}, updated_by = @userId
                WHERE year = @year`);
            if (!result.rowsAffected[0]) return sendError(res, 404, "This entry no longer exists. Refresh the list and try again.");
            return res.status(200).json({ message: "Entry updated." });
        }
        const cols = Object.values(YEAR_WISE_FIELDS);
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            INSERT INTO ${YEAR_WISE_TABLE} (year, ${cols.join(", ")}, created_date, created_by)
            SELECT @year, ${cols.map((c) => `@${c}`).join(", ")}, ${TODAY_SQL}, @userId
            WHERE NOT EXISTS (SELECT 1 FROM ${YEAR_WISE_TABLE} WITH (UPDLOCK, HOLDLOCK) WHERE year = @year);
            DECLARE @added INT = @@ROWCOUNT;
            COMMIT TRANSACTION;
            SELECT @added AS added;`);
        if (!result.recordset[0].added) {
            return sendError(res, 409, "An entry for this year already exists. Edit it from the Data List instead.");
        }
        return res.status(201).json({ message: "Entry saved." });
    } catch (err) {
        console.error("K-2.5.2 save failed:", err);
        return sendError(res, 500, isEdit ? "The entry could not be updated." : "The entry could not be saved.");
    }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// K-2.5.1 / 2.5.3 / 2.5.4: a year and the one before it, by quarter, per casualty type and row.
// ?year= picks the year (default: the latest with data, not after this year).
async function sheetReport(req, res) {
    const sheet = sheetOf(req);
    if (!sheet) return notFound(res);
    try {
        const conn = await pool;
        const years = (await conn.request().query(`
            SELECT DISTINCT year FROM ${sheet.table}
            WHERE year IS NOT NULL AND year <= YEAR(GETDATE()) ORDER BY year DESC`)).recordset.map((r) => r.year);
        const asked = wholeNumber(req.query.year);
        const year = Number.isInteger(asked) ? asked : (years[0] ?? now().getFullYear());
        const request = conn.request();
        request.input("year", sql.Int, year);
        request.input("previous", sql.Int, year - 1);
        const quarterSums = (y, tag) => QUARTERS.map((cols, q) =>
            `SUM(CASE WHEN t.year = ${y} THEN ${sumMonths("t", cols)} ELSE 0 END) AS ${tag}_q${q + 1}`).join(",\n");
        const rows = (await request.query(`
            SELECT t.casualty_type, t.${sheet.nameCol} AS name,
                   ${quarterSums("@previous", "prev")},
                   SUM(CASE WHEN t.year = @previous THEN ${sumMonths("t")} ELSE 0 END) AS prev_total,
                   ${quarterSums("@year", "curr")},
                   SUM(CASE WHEN t.year = @year THEN ${sumMonths("t")} ELSE 0 END) AS curr_total
            FROM ${sheet.table} t
            WHERE t.year IN (@year, @previous) AND t.casualty_type IS NOT NULL
            GROUP BY t.casualty_type, t.${sheet.nameCol}`)).recordset;
        // In the form's order: casualty type, then the listed rows, then any others by name
        const order = (r) => {
            const i = sheet.names(r.casualty_type).indexOf(r.name);
            return [CASUALTY_TYPES.indexOf(r.casualty_type), i < 0 ? 1e6 : i, r.name];
        };
        rows.sort((a, b) => {
            const [x, y] = [order(a), order(b)];
            return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(String(y[2]));
        });
        res.json({ year, previousYear: year - 1, years, rowLabel: sheet.rowLabel, rowData: rows });
    } catch (err) {
        console.error(`K-2.5 ${req.params.sheet} report failed:`, err);
        return sendError(res, 500, "The report could not be built.");
    }
}

// K-2.5.2: every year's counts and total, oldest first
async function yearWiseReport(req, res) {
    try {
        const result = await (await pool).request().query(`
            SELECT year, ${yearWiseColumns}, ${YEAR_WISE_TOTAL} AS total_incidents
            FROM ${YEAR_WISE_TABLE} WHERE year IS NOT NULL ORDER BY year`);
        res.json({ rowData: result.recordset });
    } catch (err) {
        console.error("K-2.5.2 report failed:", err);
        return sendError(res, 500, "The report could not be built.");
    }
}

export default {
    listSheet, getSheetForm, saveSheet,
    listYearWise, getYearWiseEntry, saveYearWise,
    sheetReport, yearWiseReport,
};
