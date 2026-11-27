import sql from "mssql";
import { pool } from "../../db.js";
import { sendError, parseMonth, requirePermission, resolveUserId } from "./kpiEntryCommon.js";

// DGS K-2.3 Exam Performance.
//   K-2.3.1 Exam Monthly Performance          tbl_kpi_dgs_2_3_1 (one entry per year/month)
//   K-2.3.2 Exam Overall Performance Statistics tbl_kpi_dgs_2_3_2 (one row per exam master row,
//           per year/month/type), master rows from mmt_kpi_2_3_data + mmt_kpi_*_2_3
// Queries and responses follow the old portal. Login, KPI_DGS rights and body checks run in
// routes.js (validateKpiBody); this file adds the checks that depend on what is saved.
// Who / when: created_by + created_date on add, updated_by + updated_date on edit, always the
// signed-in user from the JWT (sql/kpi-dgs/01_add_k23_audit_columns.sql adds the columns).

const MODULE_CODE = "KPI_DGS";
const NAUTICAL = 1;
const ENGINEERING = 2;

function parseYear(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

function parseExamType(value) {
    const n = Number(value);
    return n === NAUTICAL || n === ENGINEERING ? n : null;
}

// Year / month / type from the URL, or sends 400 and returns null
function readPeriod(req, res, { withType = false, typeParam = "type" } = {}) {
    const year = parseYear(req.params.year);
    const month = parseMonth(req.params.month);
    const type = withType ? parseExamType(req.params[typeParam]) : null;
    if (!year || !month || (withType && !type)) {
        sendError(res, 400, withType ? "A valid year, month and type are required." : "A valid year and month are required.");
        return null;
    }
    return { year, month, type };
}

const toCount = (v) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(v));

const MONTH_ORDER_SQL = "CAST(month AS INT) DESC";
const TODAY_SQL = "CAST(GETDATE() AS DATE)";

// ---------------------------------------------------------------------------------------------
// K-2.3.2 grid (add / edit): saved rows for the year/month/type, else the blank master rows
// ---------------------------------------------------------------------------------------------

const SAVED_ROWS_SQL = `
    SELECT dgs_2_3_2_id AS dgs_2_3_2_ID, year, month,
        tbl_kpi_dgs_2_3_2.type_id AS typeId, type_name AS typeName,
        tbl_kpi_dgs_2_3_2.grade_id AS gradeId, grade_name AS gradeName,
        tbl_kpi_dgs_2_3_2.code_id AS codeId, code_name AS codeName,
        tbl_kpi_dgs_2_3_2.subject_id AS subjectId, subject_name AS subjectName,
        tbl_kpi_dgs_2_3_2.frequency_id AS frequencyId, frequency_name AS frequencyName,
        candidates_appeared AS candidatesAppeared, candidate_passed AS candidatesPassed, pass_percentage AS passPercentage
    FROM tbl_kpi_dgs_2_3_2
    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = tbl_kpi_dgs_2_3_2.type_id
    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = tbl_kpi_dgs_2_3_2.grade_id
    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = tbl_kpi_dgs_2_3_2.code_id
    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = tbl_kpi_dgs_2_3_2.subject_id
    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = tbl_kpi_dgs_2_3_2.frequency_id
    WHERE year = @year AND month = @month AND tbl_kpi_dgs_2_3_2.type_id = @type
    ORDER BY dgs_2_3_2_id`;

const MASTER_ROWS_SQL = `
    SELECT id, mmt_kpi_2_3_data.type_id AS typeId, type_name AS typeName,
        mmt_kpi_2_3_data.grade_id AS gradeId, grade_name AS gradeName,
        mmt_kpi_2_3_data.code_id AS codeId, code_name AS codeName,
        mmt_kpi_2_3_data.subject_id AS subjectId, subject_name AS subjectName,
        mmt_kpi_2_3_data.frequency_id AS frequencyId, frequency_name AS frequencyName
    FROM mmt_kpi_2_3_data
    INNER JOIN mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = mmt_kpi_2_3_data.code_id
    INNER JOIN mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = mmt_kpi_2_3_data.frequency_id
    INNER JOIN mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = mmt_kpi_2_3_data.grade_id
    INNER JOIN mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = mmt_kpi_2_3_data.subject_id
    INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = mmt_kpi_2_3_data.type_id
    WHERE mmt_kpi_2_3_data.type_id = @type
    ORDER BY mmt_kpi_2_3_data.id`;

// Column layout the old portal's ag-grid reads; kept in the response unchanged
function examColumnDefs({ hidePassPercentage }) {
    return [
        { headerName: "dgs_2_3_2 ID", field: "dgs_2_3_2_ID", sortable: true, filter: true, width: 50, hide: true },
        { headerName: "Type ID", field: "typeId", sortable: true, filter: true, width: 100, hide: true },
        { headerName: "Type", field: "typeName", headerClass: "headercenter", pinned: true, sortable: true, filter: true, width: 180, rowGroup: true, hide: true },
        { headerName: "Grade Id", field: "gradeId", sortable: true, filter: true, width: 50, hide: true },
        { headerName: "Grade", field: "gradeName", sortable: true, filter: true, width: 120, rowGroup: true, hide: true, pinned: true },
        { headerName: "Code Id", field: "codeId", sortable: true, filter: true, width: 50, hide: true },
        { headerName: "Code", field: "codeName", sortable: true, filter: true, width: 130 },
        { headerName: "Subject Id", field: "subjectId", sortable: true, filter: true, width: 50, hide: true },
        { headerName: "Subject", field: "subjectName", sortable: true, filter: true, width: 170 },
        { headerName: "Frequency Id", field: "frequencyId", sortable: true, filter: true, width: 50, hide: true },
        { headerName: "Frequency", field: "frequencyName", sortable: true, filter: true, width: 130 },
        {
            headerName: "Input Data", headerClass: "headercenter", children: [
                { headerName: "No. of Candidates Appeared", field: "candidatesAppeared", editable: true, filter: true, width: 270 },
                { headerName: "No. of Candidates Passed", field: "candidatesPassed", editable: true, filter: true, width: 270 },
                {
                    headerName: "Pass Percentage", field: "passPercentage", editable: false,
                    headerTooltip: "((Candidated Passed / Candidate Appeared) * 100)", filter: true, width: 180,
                    ...(hidePassPercentage ? { hide: true } : {}),
                },
            ],
        },
    ];
}

async function sendExamGrid(req, res, typeParam, hidePassPercentage) {
    const period = readPeriod(req, res, { withType: true, typeParam });
    if (!period) return;
    try {
        const conn = await pool;
        const request = conn.request();
        request.input("year", sql.Int, period.year);
        request.input("month", sql.Int, period.month);
        request.input("type", sql.Int, period.type);

        // Saved rows when the year/month/type has data, else the blank master rows (one round trip)
        const result = await request.query(`
            IF EXISTS (SELECT 1 FROM tbl_kpi_dgs_2_3_2 WHERE year = @year AND month = @month AND type_id = @type)
                ${SAVED_ROWS_SQL}
            ELSE
                ${MASTER_ROWS_SQL};`);
        const rowData = result.recordset;
        if (rowData.length === 0) {
            return res.status(404).json({ error: "No data available" });
        }
        return res.json({ columnDefs: examColumnDefs({ hidePassPercentage }), rowData });
    } catch (err) {
        console.error("K-2.3.2 grid load failed:", err);
        return sendError(res, 500, "The exam rows could not be loaded.");
    }
}

async function getAddKpi2_3_Masterdata(req, res) {
    return sendExamGrid(req, res, "type", true);
}

async function getEditKpi2_3_Masterdata(req, res) {
    return sendExamGrid(req, res, "typeId", false);
}

// ---------------------------------------------------------------------------------------------
// K-2.3.1 Exam Monthly Performance
// ---------------------------------------------------------------------------------------------

async function countMonthlyEntries(conn, year, month) {
    const request = conn.request();
    request.input("year", sql.Int, year);
    request.input("month", sql.Int, month);
    const result = await request.query(`
        SELECT COUNT(*) AS count FROM tbl_kpi_dgs_2_3_1 WHERE year = @year AND month = @month;`);
    return result.recordset[0].count;
}

// 205 when the month already has an entry, 201 when it is free (status codes as in the old portal)
async function checkData_2_3_1(req, res) {
    const period = readPeriod(req, res);
    if (!period) return;
    try {
        const conn = await pool;
        const count = await countMonthlyEntries(conn, period.year, period.month);
        return res.sendStatus(count > 0 ? 205 : 201);
    } catch (err) {
        console.error("K-2.3.1 duplicate check failed:", err);
        return sendError(res, 500, "An error occurred while checking the data.");
    }
}

async function createDgsKpi2_3_1Data(req, res) {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const type = Number(req.body.type);
    const totalExamNautical = toCount(req.body.totalExamNautical);
    const totalExamEngineering = toCount(req.body.totalExamEngineering);

    // The chosen type's total is required (the other may be blank), as on the old form
    if (type === NAUTICAL && totalExamNautical === null) {
        return sendError(res, 400, "Total exam conducted - nautical is required.");
    }
    if (type === ENGINEERING && totalExamEngineering === null) {
        return sendError(res, 400, "Total exam conducted - engineering is required.");
    }

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("year", sql.Int, year);
        request.input("month", sql.Int, month);
        request.input("type", sql.Int, type);
        request.input("totalExamNautical", sql.Int, totalExamNautical);
        request.input("totalExamEngineering", sql.Int, totalExamEngineering);
        request.input("userId", sql.Int, resolveUserId(req));
        // Duplicate check and insert in one statement, under lock, so a month is never added twice
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            INSERT INTO tbl_kpi_dgs_2_3_1 (year, month, type, total_exam_nautical, total_exam_engineering, created_by, created_date)
            SELECT @year, @month, @type, @totalExamNautical, @totalExamEngineering, @userId, ${TODAY_SQL}
            WHERE NOT EXISTS (
                SELECT 1 FROM tbl_kpi_dgs_2_3_1 WITH (UPDLOCK, HOLDLOCK) WHERE year = @year AND month = @month);
            DECLARE @added INT = @@ROWCOUNT;
            COMMIT TRANSACTION;
            SELECT @added AS added;`);
        if (!result.recordset[0].added) {
            return sendError(res, 409, "An entry for this year and month already exists. Edit it from the Data List instead.");
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error("K-2.3.1 save failed:", err);
        return sendError(res, 500, "The entry could not be saved.");
    }
}

async function getKpi2_3_1_List(req, res) {
    try {
        const conn = await pool;
        const result = await conn.query(`
            SELECT year, month, SUM(total_exam_nautical) AS total_exam_nautical,
                SUM(total_exam_engineering) AS total_exam_engineering,
                MAX(updated_date) AS updated_date
            FROM tbl_kpi_dgs_2_3_1
            GROUP BY year, month
            ORDER BY year DESC, ${MONTH_ORDER_SQL};`);
        return res.json(result.recordset);
    } catch (err) {
        console.error("K-2.3.1 list failed:", err);
        return sendError(res, 500, "The entries could not be loaded.");
    }
}

async function getUpdateMmd_2_3_1Data(req, res) {
    const period = readPeriod(req, res);
    if (!period) return;
    try {
        const conn = await pool;
        const request = conn.request();
        request.input("year", sql.Int, period.year);
        request.input("month", sql.Int, period.month);
        const result = await request.query(`
            SELECT * FROM tbl_kpi_dgs_2_3_1 WHERE year = @year AND month = @month;`);
        return res.json(result.recordset);
    } catch (err) {
        console.error("K-2.3.1 entry load failed:", err);
        return sendError(res, 500, "The entry could not be loaded.");
    }
}

async function editDgsKpi2_3_1Data(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        request.input("year", sql.Int, Number(req.body.year));
        request.input("month", sql.Int, Number(req.body.month));
        request.input("totalExamNautical", sql.Int, Number(req.body.totalExamNautical));
        request.input("totalExamEngineering", sql.Int, Number(req.body.totalExamEngineering));
        request.input("userId", sql.Int, resolveUserId(req));
        const result = await request.query(`
            UPDATE tbl_kpi_dgs_2_3_1
            SET total_exam_nautical = @totalExamNautical,
                total_exam_engineering = @totalExamEngineering,
                updated_by = @userId,
                updated_date = ${TODAY_SQL}
            WHERE year = @year AND month = @month;`);
        if (!result.rowsAffected[0]) {
            return sendError(res, 404, "No entry exists for this year and month.");
        }
        return res.sendStatus(200);
    } catch (err) {
        console.error("K-2.3.1 update failed:", err);
        return sendError(res, 500, "The entry could not be updated.");
    }
}

// ---------------------------------------------------------------------------------------------
// K-2.3.2 Exam Overall Performance Statistics
// ---------------------------------------------------------------------------------------------

async function countOverallRows(conn, year, month, type) {
    const request = conn.request();
    request.input("year", sql.Int, year);
    request.input("month", sql.Int, month);
    request.input("type", sql.Int, type);
    const result = await request.query(`
        SELECT COUNT(*) AS count FROM tbl_kpi_dgs_2_3_2
        WHERE year = @year AND month = @month AND type_id = @type;`);
    return result.recordset[0].count;
}

// 205 when the year/month/type already has data, 201 when it is free (as in the old portal)
async function checkData_2_3_2(req, res) {
    const period = readPeriod(req, res, { withType: true, typeParam: "onType" });
    if (!period) return;
    try {
        const conn = await pool;
        const count = await countOverallRows(conn, period.year, period.month, period.type);
        return res.sendStatus(count > 0 ? 205 : 201);
    } catch (err) {
        console.error("K-2.3.2 duplicate check failed:", err);
        return sendError(res, 500, "An error occurred while checking the data.");
    }
}

// Saves the whole grid in ONE database round trip (OPENJSON, as the RBAC matrix save does):
// rows without an id are added, saved rows are updated, all inside one transaction.
// Adding needs create rights and updating needs update rights. Nothing is saved when
//   - a fresh grid's year/month/type already has data (checked under lock, so two people saving
//     the same month at once cannot both add it)                                       -> 409
//   - a saved row does not belong to this year/month/type                               -> 409
//   - a new row is not in the exam master list for this type                            -> 400
const SAVE_GRID_SQL = `
    SET XACT_ABORT ON;
    DECLARE @grid TABLE (id INT NULL, grade_id INT, code_id INT, subject_id INT, frequency_id INT,
        appeared INT NULL, passed INT NULL);
    INSERT INTO @grid (id, grade_id, code_id, subject_id, frequency_id, appeared, passed)
    SELECT id, gradeId, codeId, subjectId, frequencyId, appeared, passed
    FROM OPENJSON(@rows) WITH (id INT '$.id', gradeId INT '$.gradeId', codeId INT '$.codeId',
        subjectId INT '$.subjectId', frequencyId INT '$.frequencyId',
        appeared INT '$.appeared', passed INT '$.passed');

    DECLARE @newCount INT = (SELECT COUNT(*) FROM @grid WHERE id IS NULL);
    DECLARE @savedCount INT = (SELECT COUNT(*) FROM @grid WHERE id IS NOT NULL);

    BEGIN TRANSACTION;

    IF @savedCount = 0 AND EXISTS (
        SELECT 1 FROM tbl_kpi_dgs_2_3_2 WITH (UPDLOCK, HOLDLOCK)
        WHERE year = @year AND month = @month AND type_id = @typeId)
    BEGIN
        ROLLBACK TRANSACTION; SELECT 'duplicate' AS outcome; RETURN;
    END

    UPDATE t
    SET candidates_appeared = g.appeared,
        candidate_passed = g.passed,
        pass_percentage = ROUND((g.passed * 100.0) / NULLIF(g.appeared, 0), 2),
        updated_by = @userId,
        updated_date = ${TODAY_SQL}
    FROM tbl_kpi_dgs_2_3_2 t
    INNER JOIN @grid g ON g.id = t.dgs_2_3_2_id
    WHERE t.year = @year AND t.month = @month AND t.type_id = @typeId;
    IF @@ROWCOUNT <> @savedCount
    BEGIN
        ROLLBACK TRANSACTION; SELECT 'mismatch' AS outcome; RETURN;
    END

    INSERT INTO tbl_kpi_dgs_2_3_2 (year, month, type_id, grade_id, code_id, subject_id, frequency_id,
        candidates_appeared, candidate_passed, pass_percentage, created_by, created_date)
    SELECT @year, @month, @typeId, g.grade_id, g.code_id, g.subject_id, g.frequency_id,
        g.appeared, g.passed, ROUND((g.passed * 100.0) / NULLIF(g.appeared, 0), 2),
        @userId, ${TODAY_SQL}
    FROM @grid g
    WHERE g.id IS NULL AND EXISTS (
        SELECT 1 FROM mmt_kpi_2_3_data m
        WHERE m.type_id = @typeId AND m.grade_id = g.grade_id AND m.code_id = g.code_id
            AND m.subject_id = g.subject_id AND m.frequency_id = g.frequency_id);
    IF @@ROWCOUNT <> @newCount
    BEGIN
        ROLLBACK TRANSACTION; SELECT 'not_in_master' AS outcome; RETURN;
    END

    COMMIT TRANSACTION;
    SELECT 'saved' AS outcome;`;

const SAVE_GRID_REFUSALS = {
    duplicate: [409, "Data for this year, month and type already exists. Edit it from the Data List instead."],
    mismatch: [409, "Some rows no longer match the saved data. Reopen the entry and try again."],
    not_in_master: [400, "Some rows are not in the exam master list for this type. Reload the form and try again."],
};

async function createDgsKpi2_3_2Data(req, res) {
    const rows = req.body.rowData;
    const isNew = (r) => r.dgs_2_3_2_ID === null || r.dgs_2_3_2_ID === undefined || r.dgs_2_3_2_ID === "";
    if (rows.some(isNew) && !requirePermission(req, res, MODULE_CODE, "create")) return;
    if (rows.some((r) => !isNew(r)) && !requirePermission(req, res, MODULE_CODE, "update")) return;

    const grid = rows.map((r) => ({
        id: isNew(r) ? null : Number(r.dgs_2_3_2_ID),
        gradeId: Number(r.gradeId),
        codeId: Number(r.codeId),
        subjectId: Number(r.subjectId),
        frequencyId: Number(r.frequencyId),
        appeared: toCount(r.candidatesAppeared),
        passed: toCount(r.candidatesPassed),
    }));

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("year", sql.Int, Number(req.body.year));
        request.input("month", sql.Int, Number(req.body.month));
        request.input("typeId", sql.Int, Number(rows[0].typeId));
        request.input("userId", sql.Int, resolveUserId(req));
        request.input("rows", sql.NVarChar(sql.MAX), JSON.stringify(grid));
        const result = await request.query(SAVE_GRID_SQL);
        const outcome = result.recordset?.[0]?.outcome;
        if (outcome === "saved") return res.sendStatus(201);
        const [status, message] = SAVE_GRID_REFUSALS[outcome] || [500, "The data could not be saved. Nothing was changed."];
        return sendError(res, status, message);
    } catch (err) {
        console.error("K-2.3.2 save failed:", err);
        return sendError(res, 500, "The data could not be saved. Nothing was changed.");
    }
}

async function getKpi2_3_2_List(req, res) {
    try {
        const conn = await pool;
        const result = await conn.query(`
            SELECT year, month, tbl_kpi_dgs_2_3_2.type_id, type_name,
                SUM(candidates_appeared) AS candidatesAppeared,
                SUM(candidate_passed) AS candidatesPassed,
                ROUND((SUM(candidate_passed) * 100.0) / NULLIF(SUM(candidates_appeared), 0), 2) AS passPercentage,
                MAX(updated_date) AS updated_date
            FROM tbl_kpi_dgs_2_3_2
            INNER JOIN mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = tbl_kpi_dgs_2_3_2.type_id
            GROUP BY year, month, tbl_kpi_dgs_2_3_2.type_id, type_name
            ORDER BY year DESC, ${MONTH_ORDER_SQL}, tbl_kpi_dgs_2_3_2.type_id;`);
        return res.json(result.recordset);
    } catch (err) {
        console.error("K-2.3.2 list failed:", err);
        return sendError(res, 500, "The entries could not be loaded.");
    }
}

export default {
    getKpi2_3_1_List, checkData_2_3_1, createDgsKpi2_3_1Data, getUpdateMmd_2_3_1Data,
    editDgsKpi2_3_1Data, getAddKpi2_3_Masterdata, checkData_2_3_2,
    createDgsKpi2_3_2Data, getKpi2_3_2_List, getEditKpi2_3_Masterdata,
};
