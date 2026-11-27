import sql from "mssql";
import { pool } from "../../db.js";
import { sendError, resolveUserId } from "./kpiEntryCommon.js";

// KPI DGS K-2.4 - Entry and Exit of Candidates (tbl_kpi_dgs_entry_exit).
// One entry per year + month + grade (a grade belongs to one type: Nautical or Engineering),
// holding how many candidates entered the system (assessments done) and exited it (CoC issued).
// Rules (as the old portal, with K-2.3's checks):
//   add  - a year + month + grade that already has an entry is refused (409), checked under lock
//   edit - opened from the Data List; year, month, type and grade are fixed, the two counts change
// Field checks (year, month, ids, counts) are in middleware/kpiValidation.js; the handlers add the
// rules that need the database or today's date. The user comes from the JWT.
//
// The reports are worked out from the entries themselves. The per-month, per-type totals table
// (tbl_kpi_dgs_entry_exit_log) is still kept, rebuilt from the entries after every save, for
// anything else that reads it, but the reports no longer depend on it (its running totals had
// drifted from the entries).

const TABLE = "tbl_kpi_dgs_entry_exit";
const LOG_TABLE = "tbl_kpi_dgs_entry_exit_log";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
// Financial-year order of the months: April first
const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const TODAY_SQL = "CAST(GETDATE() AS DATE)";
const EXITED_TOO_MANY = "No. of candidates exited cannot be more than no. of candidates entered.";
// Candidates exited (CoC issued) can't be more than candidates entered (assessments done)
const exitedTooMany = (body) => Number(body.noOfCandidatesExited) > Number(body.noOfCandidatesEntered);
const DUPLICATE = "An entry for this grade already exists for the selected year and month. Edit it from the Data List instead.";

// A whole number of 0 or more (as a number or digits), else NaN
const wholeNumber = (v) => (/^\s*\d+\s*$/.test(String(v ?? "")) ? Number(v) : NaN);
const fyStartOf = (year, month) => (month >= 4 ? year : year - 1);
const fyLabel = (start) => `${start}-${start + 1}`;
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).toLocaleDateString("en-GB", { timeZone: "UTC" });
const isFutureMonth = (year, month) => {
    const now = new Date();
    return year * 100 + month > now.getFullYear() * 100 + now.getMonth() + 1;
};

// Rebuilds the per-type totals row of each given year + month + type from the entries
async function rebuildLog(periods, userId) {
    const seen = new Set();
    for (const { year, month, type } of periods) {
        const key = `${year}-${month}-${type}`;
        if (year == null || month == null || type == null || seen.has(key)) continue;
        seen.add(key);
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        request.input("month", sql.Int, month);
        request.input("type", sql.Int, type);
        request.input("userId", sql.Int, userId);
        await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            DELETE FROM ${LOG_TABLE} WHERE year = @year AND month = @month AND type_id = @type;
            INSERT INTO ${LOG_TABLE} (year, month, type_id, total_no_of_candidate_entered, total_no_of_candidate_exited, created_date, created_by)
            SELECT @year, @month, @type, SUM(no_of_candidates_entered), SUM(no_of_candidates_exited), ${TODAY_SQL}, @userId
            FROM ${TABLE} WHERE year = @year AND month = @month AND type_id = @type
            HAVING COUNT(*) > 0;
            COMMIT TRANSACTION;`);
    }
}

// Input form: whether the year + month + grade already has an entry (205 yes, 201 no, as K-2.3)
async function checkEntryExitData(req, res) {
    const year = wholeNumber(req.params.year);
    const month = wholeNumber(req.params.month);
    const grade = wholeNumber(req.params.grade);
    if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12) || !(grade > 0)) {
        return sendError(res, 400, "A valid year, month and grade are required.");
    }
    try {
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        request.input("month", sql.Int, month);
        request.input("grade", sql.Int, grade);
        const result = await request.query(`SELECT TOP 1 1 AS taken FROM ${TABLE} WHERE year = @year AND month = @month AND grade_id = @grade`);
        return res.sendStatus(result.recordset.length ? 205 : 201);
    } catch (err) {
        console.error("K-2.4 duplicate check failed:", err);
        return sendError(res, 500, "An error occurred while checking the data.");
    }
}

async function addEntryExitData(req, res) {
    const year = Number(req.body.financialYear);
    const month = Number(req.body.month);
    const type = Number(req.body.type);
    const grade = Number(req.body.grade);
    const userId = resolveUserId(req);
    if (isFutureMonth(year, month)) return sendError(res, 400, "Month cannot be in the future.");
    if (exitedTooMany(req.body)) return sendError(res, 400, EXITED_TOO_MANY);
    try {
        const request = (await pool).request();
        request.input("year", sql.Int, year);
        request.input("month", sql.Int, month);
        request.input("type", sql.Int, type);
        request.input("grade", sql.Int, grade);
        request.input("entered", sql.Int, Number(req.body.noOfCandidatesEntered));
        request.input("exited", sql.Int, Number(req.body.noOfCandidatesExited));
        request.input("userId", sql.Int, userId);
        // The grade must be one of the type's grades; duplicate check and insert in one statement,
        // under lock, so a grade's month is never added twice
        const result = await request.query(`
            SET XACT_ABORT ON;
            IF NOT EXISTS (SELECT 1 FROM mmt_kpi_dgs_grade WHERE grade_id = @grade AND type_id = @type)
            BEGIN
                SELECT CAST(0 AS BIT) AS gradeOk, CAST(0 AS INT) AS added;
                RETURN;
            END
            BEGIN TRANSACTION;
            INSERT INTO ${TABLE} (year, month, type_id, grade_id, no_of_candidates_entered, no_of_candidates_exited, created_date, created_by)
            SELECT @year, @month, @type, @grade, @entered, @exited, ${TODAY_SQL}, @userId
            WHERE NOT EXISTS (
                SELECT 1 FROM ${TABLE} WITH (UPDLOCK, HOLDLOCK) WHERE year = @year AND month = @month AND grade_id = @grade);
            DECLARE @added INT = @@ROWCOUNT;
            COMMIT TRANSACTION;
            SELECT CAST(1 AS BIT) AS gradeOk, @added AS added;`);
        const { gradeOk, added } = result.recordset[0];
        if (!gradeOk) return sendError(res, 400, "Grade is not one of the selected type's grades.");
        if (!added) return sendError(res, 409, DUPLICATE);
        await rebuildLog([{ year, month, type }], userId);
        return res.sendStatus(201);
    } catch (err) {
        console.error("K-2.4 save failed:", err);
        return sendError(res, 500, "The entry could not be saved.");
    }
}

// Edit: only the two counts change (year, month, type and grade identify the entry)
async function updateEntryExitData(req, res) {
    const id = Number(req.body.Id);
    const userId = resolveUserId(req);
    if (exitedTooMany(req.body)) return sendError(res, 400, EXITED_TOO_MANY);
    try {
        const request = (await pool).request();
        request.input("id", sql.Int, id);
        request.input("entered", sql.Int, Number(req.body.noOfCandidatesEntered));
        request.input("exited", sql.Int, Number(req.body.noOfCandidatesExited));
        request.input("userId", sql.Int, userId);
        const result = await request.query(`
            UPDATE ${TABLE}
            SET no_of_candidates_entered = @entered, no_of_candidates_exited = @exited,
                updated_date = ${TODAY_SQL}, updated_by = @userId
            OUTPUT inserted.year, inserted.month, inserted.type_id
            WHERE id = @id`);
        if (!result.recordset.length) {
            return sendError(res, 404, "This entry no longer exists. Refresh the list and try again.");
        }
        const { year, month, type_id: type } = result.recordset[0];
        await rebuildLog([{ year, month, type }], userId);
        return res.status(201).json({ message: "Entry updated." });
    } catch (err) {
        console.error("K-2.4 update failed:", err);
        return sendError(res, 500, "The entry could not be updated.");
    }
}

async function getEntryExitData(req, res) {
    try {
        const result = await (await pool).request().query(`
            SELECT e.id, e.year, e.month, e.type_id, t.type_name, e.grade_id, g.grade_name,
                   e.no_of_candidates_entered, e.no_of_candidates_exited,
                   e.created_date, e.updated_date
            FROM ${TABLE} e
            LEFT JOIN mmt_kpi_dgs_grade g ON e.grade_id = g.grade_id
            LEFT JOIN mmt_kpi_dgs_type t ON e.type_id = t.type_id
            ORDER BY e.year DESC, e.month DESC, e.type_id, e.grade_id`);
        res.json(result.recordset);
    } catch (err) {
        console.error("K-2.4 list failed:", err);
        return sendError(res, 500, "The entries could not be loaded.");
    }
}

async function getEntryExitDataByID(req, res) {
    const id = wholeNumber(req.params.Id);
    if (!(id > 0)) return sendError(res, 400, "Not a valid entry.");
    try {
        const request = (await pool).request();
        request.input("id", sql.Int, id);
        const result = await request.query(`
            SELECT e.*, t.type_name, g.grade_name
            FROM ${TABLE} e
            LEFT JOIN mmt_kpi_dgs_grade g ON e.grade_id = g.grade_id
            LEFT JOIN mmt_kpi_dgs_type t ON e.type_id = t.type_id
            WHERE e.id = @id`);
        res.json(result.recordset);
    } catch (err) {
        console.error("K-2.4 entry load failed:", err);
        return sendError(res, 500, "The entry could not be loaded.");
    }
}

// The latest year + month that has an entry, not after the current month; null when there are none
async function latestPeriod() {
    const now = new Date();
    const request = (await pool).request();
    request.input("upTo", sql.Int, now.getFullYear() * 100 + now.getMonth() + 1);
    const result = await request.query(`SELECT TOP 1 year, month FROM ${TABLE}
        WHERE year IS NOT NULL AND month BETWEEN 1 AND 12 AND year * 100 + month <= @upTo
        ORDER BY year DESC, month DESC`);
    return result.recordset[0] || null;
}

// The financial years that have entries, oldest first
async function financialYears() {
    const result = await (await pool).request().query(`
        SELECT DISTINCT CASE WHEN month >= 4 THEN year ELSE year - 1 END AS fy_start
        FROM ${TABLE} WHERE year IS NOT NULL AND month BETWEEN 1 AND 12 ORDER BY fy_start`);
    return result.recordset.map((r) => r.fy_start);
}

// Form K-2.4.1: each grade's candidates entered / exited during the previous financial year, the
// current financial year up to the month before the chosen one, the chosen month, and the current
// financial year up to the end of the chosen month. ?year=&month= picks the month; without them,
// the latest month that has entries.
async function getAbstractEntryExitReport(req, res) {
    try {
        let year = wholeNumber(req.query.year);
        let month = wholeNumber(req.query.month);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            const latest = await latestPeriod();
            const now = new Date();
            year = latest?.year ?? now.getFullYear();
            month = latest?.month ?? now.getMonth() + 1;
        }
        const fyStart = fyStartOf(year, month);
        const request = (await pool).request();
        request.input("prevFrom", sql.Int, (fyStart - 1) * 100 + 4);
        request.input("prevTo", sql.Int, fyStart * 100 + 3);
        request.input("fyFrom", sql.Int, fyStart * 100 + 4);
        request.input("chosen", sql.Int, year * 100 + month);
        const result = await request.query(`
            WITH e AS (SELECT grade_id, year * 100 + month AS ym, no_of_candidates_entered AS en, no_of_candidates_exited AS ex
                       FROM ${TABLE} WHERE year IS NOT NULL AND month BETWEEN 1 AND 12)
            SELECT g.grade_id, t.type_id, t.type_name, g.grade_name,
                ISNULL(SUM(CASE WHEN e.ym BETWEEN @prevFrom AND @prevTo THEN e.en END), 0) AS prev_entered,
                ISNULL(SUM(CASE WHEN e.ym BETWEEN @prevFrom AND @prevTo THEN e.ex END), 0) AS prev_exited,
                ISNULL(SUM(CASE WHEN e.ym >= @fyFrom AND e.ym < @chosen THEN e.en END), 0) AS upto_entered,
                ISNULL(SUM(CASE WHEN e.ym >= @fyFrom AND e.ym < @chosen THEN e.ex END), 0) AS upto_exited,
                ISNULL(SUM(CASE WHEN e.ym = @chosen THEN e.en END), 0) AS month_entered,
                ISNULL(SUM(CASE WHEN e.ym = @chosen THEN e.ex END), 0) AS month_exited,
                ISNULL(SUM(CASE WHEN e.ym BETWEEN @fyFrom AND @chosen THEN e.en END), 0) AS total_entered,
                ISNULL(SUM(CASE WHEN e.ym BETWEEN @fyFrom AND @chosen THEN e.ex END), 0) AS total_exited
            FROM mmt_kpi_dgs_grade g
            JOIN mmt_kpi_dgs_type t ON g.type_id = t.type_id
            LEFT JOIN e ON e.grade_id = g.grade_id
            GROUP BY g.grade_id, t.type_id, t.type_name, g.grade_name
            ORDER BY t.type_id, g.grade_id`);

        const previousMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
        res.json({
            period: {
                year,
                month,
                monthLabel: `${MONTH_NAMES[month - 1]}-${year}`,
                previousFy: fyLabel(fyStart - 1),
                currentFy: fyLabel(fyStart),
                // Up to the end of the month before the chosen one; nothing when the chosen month is April
                uptoLabel: month === 4 ? null : lastDay(previousMonth.year, previousMonth.month),
                totalLabel: lastDay(year, month),
            },
            rowData: result.recordset,
        });
    } catch (error) {
        console.error("K-2.4.1 report failed:", error);
        sendError(res, 500, "The report could not be built.");
    }
}

// Form K-2.4.2: candidates entered / exited each month (April to March) of one financial year, per
// type. ?fy=2025 (the year the financial year starts) picks it; without it, the financial year of
// the latest month that has entries.
async function getMonthlyEntryExitReport(req, res) {
    try {
        const years = await financialYears();
        let fyStart = wholeNumber(req.query.fy);
        if (!Number.isInteger(fyStart)) {
            const latest = await latestPeriod();
            const now = new Date();
            fyStart = latest ? fyStartOf(latest.year, latest.month) : fyStartOf(now.getFullYear(), now.getMonth() + 1);
        }
        const request = (await pool).request();
        request.input("from", sql.Int, fyStart * 100 + 4);
        request.input("to", sql.Int, (fyStart + 1) * 100 + 3);
        const result = await request.query(`
            SELECT t.type_id, t.type_name, e.month,
                   SUM(e.no_of_candidates_entered) AS entered, SUM(e.no_of_candidates_exited) AS exited
            FROM mmt_kpi_dgs_type t
            LEFT JOIN ${TABLE} e ON e.type_id = t.type_id AND e.year * 100 + e.month BETWEEN @from AND @to
            GROUP BY t.type_id, t.type_name, e.month
            ORDER BY t.type_id`);

        const types = [...new Map(result.recordset.map((r) => [r.type_id, r.type_name])).entries()];
        const months = FY_MONTHS.map((m) => ({ field: `m${m}`, label: `${MONTH_NAMES[m - 1]}-${String(m >= 4 ? fyStart : fyStart + 1).slice(2)}` }));
        const rowData = types.flatMap(([typeId, typeName]) => [["entered", "No. of Candidates Entered"], ["exited", "No. of Candidates Exited"]].map(([key, category]) => {
            const row = { type_id: typeId, type_name: typeName, category, measure: key, total: 0 };
            FY_MONTHS.forEach((m) => {
                const found = result.recordset.find((r) => r.type_id === typeId && r.month === m);
                row[`m${m}`] = found ? found[key] ?? 0 : 0;
                row.total += row[`m${m}`];
            });
            return row;
        }));
        res.json({ period: { fy: fyLabel(fyStart), fyStart, financialYears: years.map((s) => ({ value: s, label: fyLabel(s) })) }, months, rowData });
    } catch (error) {
        console.error("K-2.4.2 report failed:", error);
        sendError(res, 500, "The report could not be built.");
    }
}

// Form K-2.4.3: candidates entered / exited in each financial year that has entries, per type
async function getYearlyEntryExitReport(req, res) {
    try {
        const years = await financialYears();
        const result = await (await pool).request().query(`
            SELECT t.type_id, t.type_name, x.fy_start,
                   SUM(x.en) AS entered, SUM(x.ex) AS exited
            FROM mmt_kpi_dgs_type t
            LEFT JOIN (SELECT type_id, CASE WHEN month >= 4 THEN year ELSE year - 1 END AS fy_start,
                              no_of_candidates_entered AS en, no_of_candidates_exited AS ex
                       FROM ${TABLE} WHERE year IS NOT NULL AND month BETWEEN 1 AND 12) x ON x.type_id = t.type_id
            GROUP BY t.type_id, t.type_name, x.fy_start
            ORDER BY t.type_id`);

        const types = [...new Map(result.recordset.map((r) => [r.type_id, r.type_name])).entries()];
        const columns = years.map((s) => ({ field: `fy${s}`, label: `FY ${fyLabel(s)}` }));
        const rowData = types.flatMap(([typeId, typeName]) => [["entered", "No. of Candidates Entered"], ["exited", "No. of Candidates Exited"]].map(([key, category]) => {
            const row = { type_id: typeId, type_name: typeName, category, measure: key };
            years.forEach((s) => {
                const found = result.recordset.find((r) => r.type_id === typeId && r.fy_start === s);
                row[`fy${s}`] = found ? found[key] ?? 0 : 0;
            });
            return row;
        }));
        res.json({ columns, rowData });
    } catch (error) {
        console.error("K-2.4.3 report failed:", error);
        sendError(res, 500, "The report could not be built.");
    }
}

const entryExitTab = {
    checkEntryExitData, addEntryExitData, getEntryExitData, getEntryExitDataByID, updateEntryExitData,
    getAbstractEntryExitReport, getMonthlyEntryExitReport, getYearlyEntryExitReport,
};

export default entryExitTab;
