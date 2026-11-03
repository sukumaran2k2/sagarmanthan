import fs from "fs/promises";
import path from "path";
import multer from "multer";
import sql from "mssql";
import { pool } from "../../db.js";
import {
    MONTH_NAMES,
    MONTH_NAME_SQL,
    FISCAL_MONTH_ORDER_SQL,
    sendError,
    resolveUserId,
    normaliseFiscalYear,
    parseMonth,
    isFuturePeriod,
    requireMinistryWriter,
    requirePermission,
    describeScope,
    buildPagination,
    parseListQuery,
    writeEntryLog,
} from "./kpiEntryCommon.js";
import {
    DWELL_MAX_FILE_BYTES,
    DWELL_VALUE_KEYS,
    OVERALL_ROW_KEY,
    TOTAL_SMPA_ROW_KEY,
    buildDwellTemplate,
    buildRowSlots,
    parseDwellSheet,
    parseRowValues,
} from "./dwellTimeSheet.js";

/**
 * KPI Major Ports — Port Performance: Dwell Time uploaded from Excel.
 *
 * Who does what (enforced here, not only in the UI):
 *  - Ministry users upload one sheet per month for every major port (tbl_kpi_time_performance_dwell),
 *    correct the uploaded values in the edit form, or delete a month's upload.
 *  - The upload is checked twice: mode=preview parses the file and returns the rows (or the
 *    problems) without saving; mode=save parses the same file again and saves it.
 *  - Uploading a month that was uploaded before replaces it, only with replace=true.
 *  - The 14-step form keeps the earlier import / export dwell time (tbl_kpi_time_performance);
 *    vw_kpi_time_performance_dwell gives the uploaded values priority over them.
 */

const MODULE_CODE = "KPI_MAJOR_PORTS";
const PORT_ORG_CATEGORY_ID = 1;
const LOG_NOTE = "Dwell Time";
const UPLOAD_DIR = path.join(process.cwd(), "fileuploads", "KPI", "DwellTime");
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];
const ALLOWED_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream", // some browsers send this for .xlsx
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DWELL_MAX_FILE_BYTES, files: 1 },
    fileFilter: (req, file, callback) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
        return callback(new Error("Only Excel files (.xlsx or .xls) can be uploaded."));
    },
});

/** upload.single('file') with a clean 400 for a wrong type or a file that is too large. */
function receiveDwellFile(req, res, next) {
    upload.single("file")(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE"
            ? `The file is larger than ${DWELL_MAX_FILE_BYTES / (1024 * 1024)} MB.`
            : err.message || "The file could not be uploaded.";
        return sendError(res, 400, message);
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireMinistry(req, res) {
    return requireMinistryWriter(req, res, "Dwell time uploads");
}

/** Major ports, in the order of the sheet. */
async function loadMajorPorts(conn) {
    const request = conn.request();
    request.input("portCategoryId", sql.Int, PORT_ORG_CATEGORY_ID);
    const result = await request.query(`
        SELECT organisation_id, organisation_name
        FROM mmt_organisation
        WHERE organisation_category_id = @portCategoryId
        ORDER BY organisation_id
    `);
    return result.recordset;
}

const rowKeyOf = (r) => {
    if (r.is_overall) return OVERALL_ROW_KEY;
    if (r.is_total_smpa) return TOTAL_SMPA_ROW_KEY;
    return `org-${r.organisation_id}`;
};

/** Saved rows of a period keyed by row key ("org-1" | "total-smpa" | "overall"). */
async function loadPeriodRows(conn, fiscalYear, month, { lock = false } = {}) {
    const request = conn.request();
    request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
    request.input("month", sql.Int, month);
    const result = await request.query(`
        SELECT organisation_id, is_overall, is_total_smpa, ${DWELL_VALUE_KEYS.join(", ")}
        FROM tbl_kpi_time_performance_dwell${lock ? " WITH (UPDLOCK, HOLDLOCK)" : ""}
        WHERE fiscal_year = @fiscalYear AND month = @month
    `);
    return new Map(result.recordset.map((r) => [
        rowKeyOf(r),
        Object.fromEntries(DWELL_VALUE_KEYS.map((k) => [k, r[k] === null ? null : Number(r[k])])),
    ]));
}

/** Latest upload of a period, or null. */
async function loadLatestUpload(conn, fiscalYear, month) {
    const request = conn.request();
    request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
    request.input("month", sql.Int, month);
    const result = await request.query(`
        SELECT TOP 1 u.upload_id, u.file_name, u.row_count, u.uploaded_date, usr.name AS uploaded_by_name
        FROM tbl_kpi_time_performance_dwell_upload u
        LEFT JOIN tbl_user usr ON usr.user_id = u.uploaded_by
        WHERE u.fiscal_year = @fiscalYear AND u.month = @month
        ORDER BY u.uploaded_date DESC, u.upload_id DESC
    `);
    return result.recordset[0] || null;
}

/** { fiscalYear, month } from the request, or sends 400 and returns null. */
function readPeriod(source, res, { allowFuture = true } = {}) {
    const fiscalYear = normaliseFiscalYear(source?.fiscalYear);
    const month = parseMonth(source?.month);
    if (!fiscalYear || !month) {
        sendError(res, 400, "Select a valid financial year and month.");
        return null;
    }
    if (!allowFuture && isFuturePeriod(fiscalYear, month)) {
        sendError(res, 400, `${MONTH_NAMES[month - 1]} ${fiscalYear} has not started yet.`);
        return null;
    }
    return { fiscalYear, month };
}

const periodLabel = ({ fiscalYear, month }) => `${MONTH_NAMES[month - 1]} ${fiscalYear}`;

/**
 * Writes the rows of a period (insert or update per row) and one log row per changed row.
 * rows: [{ rowKey, organisationId, label, values }]
 * uploadId: the upload the values come from; null keeps each row's upload (edit form), and a
 * row that does not exist yet is then linked to insertUploadId (the month's latest upload).
 */
async function writePeriodRows(transaction, {
    fiscalYear, month, rows, before, uploadId, insertUploadId = uploadId, userId, action, note,
}) {
    for (const row of rows) {
        const request = transaction.request();
        request.input("fiscalYear", sql.NVarChar(20), fiscalYear);
        request.input("month", sql.Int, month);
        request.input("organisationId", sql.Int, row.organisationId);
        request.input("isOverall", sql.Bit, row.rowKey === OVERALL_ROW_KEY);
        request.input("isTotalSmpa", sql.Bit, row.rowKey === TOTAL_SMPA_ROW_KEY);
        request.input("uploadId", sql.Int, uploadId);
        request.input("insertUploadId", sql.Int, insertUploadId);
        request.input("userId", sql.Int, userId);
        DWELL_VALUE_KEYS.forEach((key) => request.input(key, sql.Decimal(12, 2), row.values[key]));
        const match = {
            [OVERALL_ROW_KEY]: "target.is_overall = 1",
            [TOTAL_SMPA_ROW_KEY]: "target.is_total_smpa = 1",
        }[row.rowKey] || "target.organisation_id = src.organisation_id";

        await request.query(`
            MERGE tbl_kpi_time_performance_dwell WITH (HOLDLOCK) AS target
            USING (SELECT @organisationId AS organisation_id) AS src
            ON target.fiscal_year = @fiscalYear AND target.month = @month AND ${match}
            WHEN MATCHED THEN
                UPDATE SET ${DWELL_VALUE_KEYS.map((k) => `${k} = @${k}`).join(", ")},
                           upload_id = COALESCE(@uploadId, target.upload_id),
                           updated_by = @userId, updated_date = GETDATE()
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (upload_id, fiscal_year, month, organisation_id, is_overall, is_total_smpa,
                        ${DWELL_VALUE_KEYS.join(", ")}, created_by, created_date)
                VALUES (@insertUploadId, @fiscalYear, @month, @organisationId, @isOverall, @isTotalSmpa,
                        ${DWELL_VALUE_KEYS.map((k) => `@${k}`).join(", ")}, @userId, GETDATE());
        `);

        const previous = before.get(row.rowKey) || null;
        await writeEntryLog(transaction, {
            section: "PORT_PERFORMANCE",
            recordType: "ACTUAL",
            action: previous ? action : "CREATE",
            organisationId: row.organisationId,
            fiscalYear,
            month,
            userId,
            note: row.organisationId ? note : `${note} · ${row.label}`,
            before: previous,
            after: row.values,
        });
    }
}

// ---------------------------------------------------------------------------
// List of uploaded months
// ---------------------------------------------------------------------------

async function getDwellPeriods(req, res) {
    if (!describeScope(req).isMinistry) return sendError(res, 403, "Dwell time uploads are managed by the Ministry.");

    const fiscalYear = req.query.fiscalYear ? normaliseFiscalYear(req.query.fiscalYear) : null;
    if (req.query.fiscalYear && !fiscalYear) return sendError(res, 400, "Financial year must look like 2025-2026.");
    const { page, limit, search } = parseListQuery(req.query);

    try {
        const conn = await pool;
        const request = conn.request();
        const parts = [];
        if (fiscalYear) {
            request.input("fyFilter", sql.NVarChar(20), fiscalYear);
            parts.push("d.fiscal_year = @fyFilter");
        }
        if (search) {
            request.input("search", sql.NVarChar(200), `%${search}%`);
            parts.push(`(d.fiscal_year LIKE @search OR ${MONTH_NAME_SQL("d.month")} LIKE @search)`);
        }
        const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
        request.input("offset", sql.Int, (page - 1) * limit);
        request.input("limit", sql.Int, limit);

        const { recordset } = await request.query(`
            WITH periods AS (
                SELECT d.fiscal_year, d.month,
                       SUM(CASE WHEN d.organisation_id IS NOT NULL
                                 AND (${DWELL_VALUE_KEYS.map((k) => `d.${k} IS NOT NULL`).join(" OR ")})
                                THEN 1 ELSE 0 END) AS ports_with_data,
                       MAX(CASE WHEN d.is_overall = 1 THEN d.monthly_import END) AS monthly_import,
                       MAX(CASE WHEN d.is_overall = 1 THEN d.monthly_export END) AS monthly_export,
                       MAX(CASE WHEN d.is_overall = 1 THEN d.monthly_overall END) AS monthly_overall,
                       MAX(CASE WHEN d.is_overall = 1 THEN d.ytd_overall END) AS ytd_overall,
                       MAX(COALESCE(d.updated_date, d.created_date)) AS last_updated
                FROM tbl_kpi_time_performance_dwell d
                ${where}
                GROUP BY d.fiscal_year, d.month
            )
            SELECT p.*, u.file_name, u.uploaded_date, usr.name AS uploaded_by_name,
                   COUNT(*) OVER() AS total_count
            FROM periods p
            OUTER APPLY (
                SELECT TOP 1 x.file_name, x.uploaded_date, x.uploaded_by
                FROM tbl_kpi_time_performance_dwell_upload x
                WHERE x.fiscal_year = p.fiscal_year AND x.month = p.month
                ORDER BY x.uploaded_date DESC, x.upload_id DESC
            ) u
            LEFT JOIN tbl_user usr ON usr.user_id = u.uploaded_by
            ORDER BY p.fiscal_year DESC, ${FISCAL_MONTH_ORDER_SQL("p.month")} DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        const total = Number(recordset[0]?.total_count) || 0;
        const rows = recordset.map(({ total_count: _count, ...row }) => row);
        return res.status(200).json({ data: rows, pagination: buildPagination(total, page, limit) });
    } catch (error) {
        console.error("Error fetching dwell time uploads:", error);
        return sendError(res, 500, "Dwell time uploads could not be loaded.");
    }
}

// ---------------------------------------------------------------------------
// One month (edit form)
// ---------------------------------------------------------------------------

async function getDwellPeriod(req, res) {
    if (!describeScope(req).isMinistry) return sendError(res, 403, "Dwell time uploads are managed by the Ministry.");
    const period = readPeriod(req.query, res);
    if (!period) return undefined;

    try {
        const conn = await pool;
        const [ports, saved, latestUpload] = await Promise.all([
            loadMajorPorts(conn),
            loadPeriodRows(conn, period.fiscalYear, period.month),
            loadLatestUpload(conn, period.fiscalYear, period.month),
        ]);
        const rows = buildRowSlots(ports).map((slot) => ({
            rowKey: slot.rowKey,
            organisationId: slot.organisationId,
            label: slot.label,
            values: saved.get(slot.rowKey) || Object.fromEntries(DWELL_VALUE_KEYS.map((k) => [k, null])),
        }));
        return res.status(200).json({ success: true, exists: saved.size > 0, rows, latestUpload });
    } catch (error) {
        console.error("Error fetching dwell time period:", error);
        return sendError(res, 500, "Dwell time for this month could not be loaded.");
    }
}

/** Saves the edit form of an uploaded month: rows = [{ rowKey, values }]. */
async function saveDwellPeriod(req, res) {
    if (!requireMinistry(req, res)) return undefined;
    if (!requirePermission(req, res, MODULE_CODE, "update")) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
    const period = readPeriod(req.body, res);
    if (!period) return undefined;

    const input = req.body?.rows;
    if (!Array.isArray(input) || !input.length) return sendError(res, 400, "Nothing to save.");

    let transaction = null;
    try {
        const conn = await pool;
        const slots = new Map(buildRowSlots(await loadMajorPorts(conn)).map((s) => [s.rowKey, s]));
        const rows = [];
        const problems = [];
        for (const item of input) {
            const slot = slots.get(String(item?.rowKey || ""));
            if (!slot) return sendError(res, 400, `Unknown row: ${item?.rowKey}.`);
            if (rows.some((r) => r.rowKey === slot.rowKey)) return sendError(res, 400, `${slot.label} is listed twice.`);
            const { values, errors } = parseRowValues(item.values || {});
            errors.forEach((e) => problems.push({ rowKey: slot.rowKey, column: e.column, message: `${slot.label}: ${e.message}.` }));
            rows.push({ ...slot, values });
        }
        if (problems.length) {
            return res.status(400).json({ success: false, message: "Some values need correcting.", errors: problems });
        }

        const latestUpload = await loadLatestUpload(conn, period.fiscalYear, period.month);
        if (!latestUpload) {
            return sendError(res, 404, `Dwell time for ${periodLabel(period)} has not been uploaded. Upload the Excel sheet first.`);
        }

        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const before = await loadPeriodRows(transaction, period.fiscalYear, period.month, { lock: true });
        if (!before.size) {
            await transaction.rollback();
            return sendError(res, 404, `Uploaded dwell time for ${periodLabel(period)} was deleted. Upload the Excel sheet again.`);
        }
        await writePeriodRows(transaction, {
            ...period,
            rows,
            before,
            uploadId: null,
            insertUploadId: latestUpload.upload_id,
            userId,
            action: "UPDATE",
            note: LOG_NOTE,
        });
        await transaction.commit();
        return res.status(200).json({ success: true, message: `Dwell time for ${periodLabel(period)} updated.` });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error("Error saving dwell time period:", error);
        return sendError(res, 500, "Dwell time could not be saved.");
    }
}

async function deleteDwellPeriod(req, res) {
    if (!requireMinistry(req, res)) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
    const period = readPeriod(req.query, res);
    if (!period) return undefined;

    let transaction = null;
    try {
        const conn = await pool;
        const ports = await loadMajorPorts(conn);
        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const before = await loadPeriodRows(transaction, period.fiscalYear, period.month, { lock: true });
        if (!before.size) {
            await transaction.rollback();
            return sendError(res, 404, `No uploaded dwell time was found for ${periodLabel(period)}.`);
        }
        const request = transaction.request();
        request.input("fiscalYear", sql.NVarChar(20), period.fiscalYear);
        request.input("month", sql.Int, period.month);
        // The upload history stays; only the values are removed
        await request.query(`
            DELETE FROM tbl_kpi_time_performance_dwell WHERE fiscal_year = @fiscalYear AND month = @month
        `);
        for (const slot of buildRowSlots(ports).filter((s) => before.has(s.rowKey))) {
            await writeEntryLog(transaction, {
                section: "PORT_PERFORMANCE", recordType: "ACTUAL", action: "DELETE",
                organisationId: slot.organisationId, ...period, userId,
                note: slot.organisationId ? LOG_NOTE : `${LOG_NOTE} · ${slot.label}`,
                before: before.get(slot.rowKey),
            });
        }
        await transaction.commit();
        return res.status(200).json({ success: true, message: `Uploaded dwell time for ${periodLabel(period)} deleted.` });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        console.error("Error deleting dwell time period:", error);
        return sendError(res, 500, "Dwell time could not be deleted.");
    }
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/** Original file name, reduced to safe characters for the stored copy. */
function storedFileName({ fiscalYear, month }, originalName) {
    const ext = path.extname(originalName || "").toLowerCase() || ".xlsx";
    return `dwell_time_${fiscalYear}_${String(month).padStart(2, "0")}_${Date.now()}${ext}`;
}

/**
 * multipart/form-data: file, fiscalYear, month, mode = preview | save, replace = true (save only).
 * preview → { rows, existing }; save → saves every row in one transaction.
 * Problems with the sheet → 400 { errors: [{ row, column, message }] } and nothing is saved.
 */
async function uploadDwellSheet(req, res) {
    if (!requireMinistry(req, res)) return undefined;
    const userId = resolveUserId(req);
    if (!userId) return sendError(res, 401, "Your session has expired. Please sign in again.");
    const period = readPeriod(req.body, res, { allowFuture: false });
    if (!period) return undefined;
    const mode = String(req.body?.mode || "preview");
    if (!["preview", "save"].includes(mode)) return sendError(res, 400, "Unknown upload mode.");
    if (!req.file?.buffer?.length) return sendError(res, 400, "Choose the Excel file to upload.");

    let transaction = null;
    let savedPath = null;
    try {
        const conn = await pool;
        const [ports, latestUpload, existing] = await Promise.all([
            loadMajorPorts(conn),
            loadLatestUpload(conn, period.fiscalYear, period.month),
            loadPeriodRows(conn, period.fiscalYear, period.month),
        ]);
        const isReplace = existing.size > 0;
        if (!requirePermission(req, res, MODULE_CODE, isReplace ? "update" : "create")) return undefined;

        const { rows, errors } = parseDwellSheet(req.file.buffer, { ...period, ports });
        if (errors.length) {
            return res.status(400).json({
                success: false,
                message: `The file has ${errors.length} problem${errors.length === 1 ? "" : "s"}. Nothing was saved.`,
                errors,
            });
        }
        const preview = rows.map(({ rowKey, organisationId, label, sheetRow, values }) => ({
            rowKey, organisationId, label, sheetRow, values,
        }));
        if (mode === "preview") {
            return res.status(200).json({ success: true, rows: preview, existing: isReplace ? (latestUpload || {}) : null });
        }
        if (isReplace && String(req.body?.replace) !== "true") {
            return sendError(res, 409, `Dwell time for ${periodLabel(period)} was uploaded before. Confirm to replace it.`);
        }

        // Keep the original file next to the record; removed again if the save fails
        const fileName = storedFileName(period, req.file.originalname);
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        savedPath = path.join(UPLOAD_DIR, fileName);
        await fs.writeFile(savedPath, req.file.buffer);

        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const before = await loadPeriodRows(transaction, period.fiscalYear, period.month, { lock: true });
        const uploadRequest = transaction.request();
        uploadRequest.input("fiscalYear", sql.NVarChar(20), period.fiscalYear);
        uploadRequest.input("month", sql.Int, period.month);
        uploadRequest.input("fileName", sql.NVarChar(255), path.basename(req.file.originalname || fileName).slice(0, 255));
        uploadRequest.input("storedFileName", sql.NVarChar(255), fileName);
        uploadRequest.input("rowCount", sql.Int, rows.length);
        uploadRequest.input("userId", sql.Int, userId);
        const inserted = await uploadRequest.query(`
            INSERT INTO tbl_kpi_time_performance_dwell_upload
                (fiscal_year, month, file_name, stored_file_name, row_count, uploaded_by, uploaded_date)
            OUTPUT INSERTED.upload_id
            VALUES (@fiscalYear, @month, @fileName, @storedFileName, @rowCount, @userId, GETDATE())
        `);
        await writePeriodRows(transaction, {
            ...period,
            rows,
            before,
            uploadId: inserted.recordset[0].upload_id,
            userId,
            action: "UPDATE",
            note: `${LOG_NOTE} (Excel upload)`,
        });
        await transaction.commit();
        savedPath = null;

        return res.status(isReplace ? 200 : 201).json({
            success: true,
            action: isReplace ? "update" : "create",
            message: `Dwell time for ${periodLabel(period)} ${isReplace ? "replaced" : "uploaded"} (${rows.length} rows).`,
        });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => {});
        if (savedPath) await fs.unlink(savedPath).catch(() => {});
        console.error("Error uploading dwell time sheet:", error);
        return sendError(res, 500, "The dwell time sheet could not be saved.");
    }
}

/** Blank sheet for the selected month, in the layout the upload reads. */
async function downloadDwellTemplate(req, res) {
    if (!describeScope(req).isMinistry) return sendError(res, 403, "Dwell time uploads are managed by the Ministry.");
    const period = readPeriod(req.query, res);
    if (!period) return undefined;

    try {
        const conn = await pool;
        const buffer = buildDwellTemplate({ ...period, ports: await loadMajorPorts(conn) });
        const name = `Dwell_Time_${MONTH_NAMES[period.month - 1]}_${period.fiscalYear}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
        return res.status(200).send(buffer);
    } catch (error) {
        console.error("Error building dwell time template:", error);
        return sendError(res, 500, "The template could not be created.");
    }
}

const PortPerformanceDwell = {
    receiveDwellFile,
    getDwellPeriods,
    getDwellPeriod,
    saveDwellPeriod,
    deleteDwellPeriod,
    uploadDwellSheet,
    downloadDwellTemplate,
};

export default PortPerformanceDwell;
