import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sql from "mssql";
import { pool } from "../../db.js";
import moment from 'moment';
import { getDataScope } from '../../middleware/dataScope.js';
import { scanFile } from '../../utils/clamav.js';
import { randomUUID } from 'crypto';

// Ministry / master users see every MoU; organisation users only their organisation's.
// Decided from the signed token only (never from query or URL values). Returns the SQL
// condition and the organisation id to bind as @scopeOrgId (null when not needed).
function gmisScope(user, column = 'tbl_gmis_mou.organisation_id') {
    const { isWide, isOrganisation, organisationId } = getDataScope(user);
    if (isWide) return { sql: '1 = 1', orgId: null };
    if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) return { sql: '1 = 0', orgId: null };
    return { sql: `${column} = @scopeOrgId`, orgId: organisationId };
}

// True when the MoU exists and is within the user's scope.
async function canAccessMou(user, mouID) {
    const id = Number(mouID);
    if (!Number.isInteger(id) || id <= 0) return false;
    const scope = gmisScope(user);
    const request = (await pool).request();
    request.input('scopeMouId', id);
    if (scope.orgId) request.input('scopeOrgId', scope.orgId);
    const result = await request.query(`SELECT TOP 1 1 AS ok FROM tbl_gmis_mou WHERE id = @scopeMouId AND ${scope.sql}`);
    return result.recordset.length > 0;
}

// Progress lives in the revision tables (tbl_gmis_mou has no progress columns); an MoU's
// progress is its latest revision, as 2.0 showed it. Join with PROGRESS_JOIN, select PROGRESS_COLUMNS.
const PROGRESS_JOIN = `
    OUTER APPLY (
        SELECT TOP 1 revised_physical_progress_date, revised_physical_progress_percentage
        FROM tbl_gmis_mou_physical_progress
        WHERE mou_id = tbl_gmis_mou.id
        ORDER BY revised_on DESC, id DESC
    ) phy
    OUTER APPLY (
        SELECT TOP 1 revised_financial_progress_date, revised_financial_progress_percentage
        FROM tbl_gmis_mou_financial_progress
        WHERE mou_id = tbl_gmis_mou.id
        ORDER BY revised_on DESC, id DESC
    ) fin`;
const PROGRESS_COLUMNS = `
    phy.revised_physical_progress_date AS physical_progress_date,
    phy.revised_physical_progress_percentage AS physical_progress_percentage,
    fin.revised_financial_progress_date AS financial_progress_date,
    fin.revised_financial_progress_percentage AS financial_progress_percentage`;

// Records the form's progress for MoU @progressMouId as a new revision, only when it differs
// from the latest one (so re-saving an MoU unchanged adds nothing). Needs the inputs bound by
// bindProgress.
const RECORD_PROGRESS_SQL = `
    IF (@physicalProgressDate IS NOT NULL OR @physicalPercentage IS NOT NULL) AND NOT EXISTS (
        SELECT 1 FROM (
            SELECT TOP 1 revised_physical_progress_date AS d, revised_physical_progress_percentage AS pct
            FROM tbl_gmis_mou_physical_progress WHERE mou_id = @progressMouId ORDER BY revised_on DESC, id DESC
        ) latest
        WHERE ISNULL(CONVERT(varchar(10), latest.d, 23), '') = ISNULL(@physicalProgressDate, '')
          AND ISNULL(latest.pct, -1) = ISNULL(@physicalPercentage, -1)
    )
        INSERT INTO tbl_gmis_mou_physical_progress (mou_id, revised_physical_progress_date, revised_physical_progress_percentage, revised_on)
        VALUES (@progressMouId, @physicalProgressDate, @physicalPercentage, GETDATE());

    IF (@financialProgressDate IS NOT NULL OR @financialPercentage IS NOT NULL) AND NOT EXISTS (
        SELECT 1 FROM (
            SELECT TOP 1 revised_financial_progress_date AS d, revised_financial_progress_percentage AS pct
            FROM tbl_gmis_mou_financial_progress WHERE mou_id = @progressMouId ORDER BY revised_on DESC, id DESC
        ) latest
        WHERE ISNULL(CONVERT(varchar(10), latest.d, 23), '') = ISNULL(@financialProgressDate, '')
          AND ISNULL(latest.pct, -1) = ISNULL(@financialPercentage, -1)
    )
        INSERT INTO tbl_gmis_mou_financial_progress (mou_id, revised_financial_progress_date, revised_financial_progress_percentage, revised_on)
        VALUES (@progressMouId, @financialProgressDate, @financialPercentage, GETDATE());`;

// Binds the four progress values from the form ('' = not given; 0% is kept)
function bindProgress(request, body) {
    const date = (v) => (v ? String(v).substring(0, 10) : null);
    const pct = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
    request.input("physicalProgressDate", date(body.physicalProgressDate));
    request.input("physicalPercentage", sql.Decimal(5, 2), pct(body.physicalPercentage));
    request.input("financialProgressDate", date(body.financialProgressDate));
    request.input("financialPercentage", sql.Decimal(5, 2), pct(body.financialPercentage));
}

// "To be started" is how the data records it; older entries may say "Yet to start".
const YET_TO_START_SQL = "(tbl_gmis_mou.present_status LIKE '%Yet to%' OR tbl_gmis_mou.present_status LIKE '%to be started%')";

const uploadDestination = "./fileuploads/gmis_mou_fileupload";
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const MAX_GMIS_FILE_SIZE = 20 * 1024 * 1024;

// Multipart field name the frontend uses for the document. Must match InputForm's FormData key.
const GMIS_UPLOAD_FIELD = "gmisDocument";

const ALLOWED_GMIS_FILES = {
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
};

function generateUniqueFileName(originalName) {
    const extension = path.extname(originalName).toLowerCase();

    const safeBaseName = path
        .basename(originalName, path.extname(originalName))
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 80);

    return `${safeBaseName}_${Date.now()}_${randomUUID()}${extension}`;
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination);
    },

    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);

        req.uniqueFileName = uniqueFileName;

        callback(null, uniqueFileName);
    }
});


function gmisDocumentFileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();

    const allowedMimeTypes = ALLOWED_GMIS_FILES[extension];

    if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
        return callback(
            new GmisFileTypeError("Only PDF, DOC and DOCX documents are allowed.")
        );
    }

    callback(null, true);
}

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_GMIS_FILE_SIZE,
        files: 1
    },
    fileFilter: gmisDocumentFileFilter
});

async function validateGmisFileSignature(filePath, extension) {
    const fileHandle = await fs.promises.open(filePath, "r");

    try {
        const buffer = Buffer.alloc(8);

        const { bytesRead } = await fileHandle.read(
            buffer,
            0,
            8,
            0
        );

        const signature = buffer.subarray(0, bytesRead);

        if (extension === ".pdf") {
            return signature.toString("ascii").startsWith("%PDF-");
        }

        if (extension === ".doc") {
            const docSignature = Buffer.from([
                0xD0, 0xCF, 0x11, 0xE0,
                0xA1, 0xB1, 0x1A, 0xE1
            ]);

            return signature.equals(docSignature);
        }

        if (extension === ".docx") {
            // DOCX is an Office Open XML ZIP container.
            return (
                signature.length >= 4 &&
                signature[0] === 0x50 &&
                signature[1] === 0x4B &&
                signature[2] === 0x03 &&
                signature[3] === 0x04
            );
        }

        return false;
    } finally {
        await fileHandle.close();
    }
}

// Thrown for bad user input so the handler can return the message as a 400.
class GmisValidationError extends Error {}

// Thrown by the multer file filter (wrong type) so it can be told apart from real failures.
class GmisFileTypeError extends Error {}

// A plain stored file name: no folders, no "..", no dot-files.
function isPlainFileName(name) {
    return (
        typeof name === "string" &&
        name.length > 0 &&
        name.length <= 255 &&
        path.basename(name) === name &&
        !name.startsWith(".")
    );
}

// A document name this controller could have generated: plain name + allowed extension.
function isSafeGmisFileName(name) {
    return (
        isPlainFileName(name) &&
        Object.prototype.hasOwnProperty.call(ALLOWED_GMIS_FILES, path.extname(name).toLowerCase())
    );
}

async function gmisFileExistsOnDisk(name) {
    try {
        await fs.promises.access(path.resolve(uploadDestination, name));
        return true;
    } catch {
        return false;
    }
}

// Returns an error message when the document can't be attached to a MoU, otherwise null.
// mouId = the MoU being edited (null when creating), so its own current file is allowed.
async function checkGmisDocument(conn, name, mouId = null) {
    if (!name) return null;
    if (!isSafeGmisFileName(name)) return "Invalid document filename.";
    if (!(await gmisFileExistsOnDisk(name))) {
        return "Uploaded document not found. Please upload it again.";
    }

    const request = conn.request();
    request.input("fileName", sql.NVarChar(500), name);
    request.input("mouId", sql.Int, mouId);
    const used = await request.query(`
        SELECT TOP 1 1 AS ok
        FROM tbl_gmis_mou
        WHERE document_uploader = @fileName
          AND (@mouId IS NULL OR id <> @mouId);
    `);

    return used.recordset.length ? "This document is already attached to another MoU." : null;
}

// Deletes a stored document from disk, but only when no MoU still points at it.
// Never throws: a missing file or a cleanup problem must not fail the request.
async function removeGmisFileIfUnused(conn, name) {
    if (!isPlainFileName(name)) return;

    try {
        const request = conn.request();
        request.input("fileName", sql.NVarChar(500), name);
        const used = await request.query(`
            SELECT TOP 1 1 AS ok FROM tbl_gmis_mou WHERE document_uploader = @fileName;
        `);
        if (used.recordset.length) return;

        await fs.promises.unlink(path.resolve(uploadDestination, name));
    } catch (err) {
        if (err.code !== "ENOENT") console.error("[GMIS] File cleanup error:", err);
    }
}


async function getMouCategory(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {

        const result = await request.query(`SELECT * FROM mmt_mou_category;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function submitGmisMouData(req, res) {
    let transaction = null;
    let transactionStarted = false;

    try {
        const body = req.body || {};
        const scope = gmisScope(req.user);

        if (scope.sql === "1 = 0") {
            return res.status(403).json({
                message: "You are not allowed to add MoUs."
            });
        }

        const userID = req.user?.user_id ?? req.user?.userId;

        if (!userID) {
            return res.status(401).json({
                message: "Authenticated user ID is missing."
            });
        }

        const organisationId = Number(
            scope.orgId ?? body.organisationName
        );

        const amount = Number(body.amount);
        const revisedAmount =
            body.revisedAmount === "" ||
            body.revisedAmount === null ||
            body.revisedAmount === undefined
                ? null
                : Number(body.revisedAmount);

        const mouCategoryId = Number.parseInt(body.mouCategory, 10);

        const eventName = String(body.eventName || "").trim();
        const nameOfMou = String(body.mouProjectName || "").trim();
        const nameOfSecondParty = String(body.stakeholderName || "").trim();
        const natureOfSecondParty = String(
            body.natureOfSecondParty || ""
        ).trim();

        const presentStatus = String(body.presentStatus || "").trim();

        const navicId =
            body.vibhasNavicID === "" ||
            body.vibhasNavicID === null ||
            body.vibhasNavicID === undefined
                ? null
                : Number(body.vibhasNavicID);

        // Required-field validation
        if (
            !eventName ||
            !nameOfMou ||
            !nameOfSecondParty ||
            !natureOfSecondParty ||
            !presentStatus
        ) {
            return res.status(400).json({
                message: "Please provide all required MoU fields."
            });
        }

        // Organisation validation
        if (
            !Number.isInteger(organisationId) ||
            organisationId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid organisation."
            });
        }

        // Amount validation
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({
                message: "Amount must be a valid non-negative number."
            });
        }

        if (
            revisedAmount !== null &&
            (!Number.isFinite(revisedAmount) || revisedAmount < 0)
        ) {
            return res.status(400).json({
                message: "Revised amount must be a valid non-negative number."
            });
        }

        if (!Number.isInteger(mouCategoryId) || mouCategoryId <= 0) {
            return res.status(400).json({
                message: "Please select a valid MoU category."
            });
        }

        if (
            navicId !== null &&
            (!Number.isInteger(navicId) || navicId <= 0)
        ) {
            return res.status(400).json({
                message: "Invalid NAVIC/VIBHAS selection."
            });
        }

        // Progress percentage validation
        const validatePercentage = (value, fieldName) => {
            if (value === undefined || value === null || value === "") {
                return null;
            }

            const percentage = Number(value);

            if (
                !Number.isFinite(percentage) ||
                percentage < 0 ||
                percentage > 100
            ) {
                throw new GmisValidationError(
                    `${fieldName} must be between 0 and 100.`
                );
            }

            return percentage;
        };

        const physicalPercentage = validatePercentage(
            body.physicalPercentage,
            "Physical progress"
        );

        const financialPercentage = validatePercentage(
            body.financialPercentage,
            "Financial progress"
        );

        const physicalDate = body.physicalProgressDate || null;
        const financialDate = body.financialProgressDate || null;

        const validateDate = (value, fieldName) => {
            if (!value) return null;

            const date = moment(value, "YYYY-MM-DD", true);

            if (!date.isValid()) {
                throw new GmisValidationError(`${fieldName} is invalid.`);
            }

            if (date.isAfter(moment(), "day")) {
                throw new GmisValidationError(`${fieldName} cannot be in the future.`);
            }

            return date.format("YYYY-MM-DD");
        };

        const validPhysicalDate = validateDate(
            physicalDate,
            "Physical progress date"
        );

        const validFinancialDate = validateDate(
            financialDate,
            "Financial progress date"
        );

        const conn = await pool;

        const request = conn.request();

        request.input("organisationId", sql.Int, organisationId);
        request.input("mouCategoryId", sql.Int, mouCategoryId);

        const referenceResult = await request.query(`
            SELECT
                org.organisation_name,
                cat.mou_category_id
            FROM mmt_organisation org
            CROSS JOIN mmt_mou_category cat
            WHERE org.organisation_id = @organisationId
              AND cat.mou_category_id = @mouCategoryId;
        `);

        if (!referenceResult.recordset.length) {
            return res.status(400).json({
                message: "Invalid organisation or MoU category."
            });
        }

        const firstParty =
            referenceResult.recordset[0].organisation_name;

        const uniqueFileName = body.gmisDocumentFileName || null;

        // Must be a real, scanned upload (exists on disk, allowed type, not used by another MoU)
        const documentError = await checkGmisDocument(conn, uniqueFileName);
        if (documentError) {
            return res.status(400).json({ message: documentError });
        }


        transaction = new sql.Transaction(conn);
        await transaction.begin();
        transactionStarted = true;

        const insertRequest = new sql.Request(transaction);

        insertRequest.input("eventName", sql.NVarChar(255), eventName);
        insertRequest.input("organisationId", sql.Int, organisationId);
        insertRequest.input("navicId", sql.Int, navicId);
        insertRequest.input("nameOfMou", sql.NVarChar(500), nameOfMou);
        insertRequest.input("firstParty", sql.NVarChar(255), firstParty);
        insertRequest.input("nameOfSecondParty", sql.NVarChar(500), nameOfSecondParty);
        insertRequest.input("natureOfSecondParty", sql.NVarChar(255), natureOfSecondParty);
        insertRequest.input("amount", sql.Decimal(18, 2), amount);
        insertRequest.input("mouCategoryId", sql.Int, mouCategoryId);
        insertRequest.input("presentStatus", sql.NVarChar(255), presentStatus);

        insertRequest.input(
            "detailedRemarks",
            sql.NVarChar(sql.MAX),
            body.detailedRemarks || null
        );

        insertRequest.input(
            "reasonForDropping",
            sql.NVarChar(sql.MAX),
            body.reasonForDropping || null
        );

        insertRequest.input(
            "mouBrief",
            sql.NVarChar(sql.MAX),
            body.mouBrief || null
        );

        insertRequest.input(
            "revisedAmount",
            sql.Decimal(18, 2),
            revisedAmount
        );

        insertRequest.input(
            "userID",
            sql.Int,
            userID
        );

        insertRequest.input(
            "uniqueFileName",
            sql.NVarChar(500),
            uniqueFileName
        );

        insertRequest.input(
            "nextSteps",
            sql.NVarChar(sql.MAX),
            body.nextSteps || null
        );

        insertRequest.input(
            "physicalProgressDate",
            sql.Date,
            validPhysicalDate
        );

        insertRequest.input(
            "physicalPercentage",
            sql.Decimal(5, 2),
            physicalPercentage
        );

        insertRequest.input(
            "financialProgressDate",
            sql.Date,
            validFinancialDate
        );

        insertRequest.input(
            "financialPercentage",
            sql.Decimal(5, 2),
            financialPercentage
        );

        await insertRequest.query(`
            INSERT INTO tbl_gmis_mou (
                organisation_id,
                event_name,
                navic_vibhas_id,
                name_of_mou,
                name_of_first_party,
                name_of_second_party,
                nature_of_second_party,
                amount,
                mou_category_id,
                present_status,
                reason_for_dropping,
                remark_or_detailed_status,
                mou_brief,
                revised_amount,
                document_uploader,
                next_steps,
                created_on,
                created_by,
                updated_on
            )
            VALUES (
                @organisationId,
                @eventName,
                @navicId,
                @nameOfMou,
                @firstParty,
                @nameOfSecondParty,
                @natureOfSecondParty,
                @amount,
                @mouCategoryId,
                @presentStatus,
                @reasonForDropping,
                @detailedRemarks,
                @mouBrief,
                @revisedAmount,
                @uniqueFileName,
                @nextSteps,
                GETDATE(),
                @userID,
                GETDATE()
            );

            DECLARE @progressMouId INT = SCOPE_IDENTITY();

            ${RECORD_PROGRESS_SQL}
        `);

        await transaction.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "MoU submitted successfully."
        });

    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("GMIS transaction rollback error:", rollbackError);
            }
        }

        console.error("submitGmisMouData error:", err);

        // User-input problems are shown as they are; anything else stays generic.
        if (err instanceof GmisValidationError) {
            return res.status(400).json({ success: false, message: err.message });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to submit MoU."
        });
    }
}

async function addNewgmisFileupload(req, res) {
    let uploadedFilePath = null;

    const removeUploadedFile = async () => {
        if (uploadedFilePath) {
            await fs.promises.unlink(uploadedFilePath).catch(() => {});
        }
    };

    try {
        // Step 1: a file must have been received
        if (!req.file || !req.file.filename) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });
        }

        uploadedFilePath = req.file.path;

        const extension = path.extname(req.file.originalname).toLowerCase();

        // Step 2: the file's real content (magic bytes) must match its extension
        const isValidFile = await validateGmisFileSignature(uploadedFilePath, extension);

        if (!isValidFile) {
            await removeUploadedFile();

            return res.status(400).json({
                success: false,
                message: "The uploaded file content does not match its extension."
            });
        }

        // Step 3: antivirus scan (ClamAV)
        const scanResult = await scanFile(uploadedFilePath);

        // Step 4: infected -> delete and reject (threat name is logged, not sent to the client)
        if (scanResult.status === "infected") {
            console.warn(
                "[GMIS] Malware detected:",
                scanResult.threat,
                "| user:", req.user?.user_id ?? req.user?.userId
            );

            await removeUploadedFile();

            return res.status(422).json({
                success: false,
                status: "infected",
                message: "File rejected: malware or virus detected."
            });
        }

        // Step 5: scanner down or errored -> fail closed (never keep an unscanned file)
        if (scanResult.status !== "clean") {
            await removeUploadedFile();

            return res.status(503).json({
                success: false,
                status: "scanner_error",
                message: "File scanning service is unavailable. Please try again later."
            });
        }

        // Step 6: clean
        return res.status(200).json({
            success: true,
            status: "clean",
            uniqueFileName: req.file.filename,
            message: "File uploaded and scanned successfully."
        });

    } catch (err) {
        console.error("addNewgmisFileupload error:", err);
        await removeUploadedFile();

        return res.status(500).json({
            success: false,
            message: "Failed to upload and scan GMIS document."
        });
    }
}

// Runs multer and turns its errors (wrong type, too large, wrong field) into clean 400s
// instead of a raw 500. Use this on the upload route instead of upload.single(...).
function gmisUploadMiddleware(req, res, next) {
    upload.single(GMIS_UPLOAD_FIELD)(req, res, (err) => {
        if (!err) return next();

        if (err instanceof GmisFileTypeError) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (err instanceof multer.MulterError) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "File is too large. Maximum size is 20 MB."
                    : err.code === "LIMIT_UNEXPECTED_FILE"
                        ? "Unexpected file field. Upload a single document."
                        : "File upload failed.";
            return res.status(400).json({ success: false, message });
        }

        console.error("[GMIS] Upload error:", err);
        return res.status(500).json({ success: false, message: "Failed to upload GMIS document." });
    });
}


async function updateGmisMouData(req, res) {
    try {
        const body = req.body || {};
        const mouID = body.mouID || body.id || body.mou_id;
        const eventName = body.eventName || body.event_name;
        // Organisation users keep the MoU in their own organisation.
        const organisationId = gmisScope(req.user).orgId || body.organisationName || body.organisation_id;
        const navicId = body.vibhasNavicID || body.navic_vibhas_id;
        const nameOfMou = body.mouProjectName || body.name_of_mou;
        const nameOfSecondParty = body.stakeholderName || body.name_of_second_party;
        const natureOfSecondParty = body.natureOfSecondParty || body.nature_of_second_party;
        const amount = body.amount;
        let revisedAmount = body.revisedAmount !== undefined ? body.revisedAmount : body.revised_amount;
        const mouCategoryId = body.mouCategory || body.mou_category_id;
        const presentStatus = body.presentStatus || body.present_status;
        const detailedRemarks = body.detailedRemarks || body.remark_or_detailed_status || null;
        const reasonForDropping = body.reasonForDropping || body.reason_for_dropping || null;
        const mouBrief = body.mouBrief || body.mou_brief || null;
        const userId = req.user?.user_id ?? req.user?.userId ?? null; // updated_by: the signed-in user, not a body value
        let uniqueFileName = body.gmisDocumentFileName || body.uniqueFileName || body.document_uploader || null;
        const nextSteps = body.nextSteps || body.updatenextSteps || body.next_steps || null;

        if (revisedAmount === '' || revisedAmount === undefined) {
            revisedAmount = null;
        }
        if (!uniqueFileName || uniqueFileName === '') {
            uniqueFileName = null;
        }

        if (!(await canAccessMou(req.user, mouID))) {
            return res.status(404).json({ success: false, message: "MoU not found" });
        }

        const conn = await pool;
        const mouIdNumber = Number(mouID);

        // The document this MoU has now (to validate a changed one, and to clean up a replaced one)
        const currentDocResult = await conn.request()
            .input("mouID", sql.Int, mouIdNumber)
            .query(`SELECT document_uploader FROM tbl_gmis_mou WHERE id = @mouID;`);
        const currentDoc = currentDocResult.recordset[0]?.document_uploader || null;

        // A new document must be a real, scanned upload that is not attached elsewhere.
        // (An unchanged existing document is left alone, including older files uploaded
        // before these checks existed.)
        if (uniqueFileName && uniqueFileName !== currentDoc) {
            const documentError = await checkGmisDocument(conn, uniqueFileName, mouIdNumber);
            if (documentError) {
                return res.status(400).json({ success: false, message: documentError });
            }
        }

        const request = conn.request();

        request.input("mouID", mouID);
        request.input("eventName", eventName);
        request.input("organisationId", organisationId);
        request.input("navicId", navicId);
        request.input("nameOfMou", nameOfMou);
        request.input("nameOfSecondParty", nameOfSecondParty);
        request.input("natureOfSecondParty", natureOfSecondParty);
        request.input("amount", amount);
        request.input("revisedAmount", revisedAmount);
        request.input("mouCategoryId", mouCategoryId);
        request.input("presentStatus", presentStatus);
        request.input("detailedRemarks", detailedRemarks);
        request.input("reasonForDropping", reasonForDropping);
        request.input("mouBrief", mouBrief);
        request.input("userId", userId);
        request.input("uniqueFileName", uniqueFileName);
        request.input("nextSteps", nextSteps);
        request.input("progressMouId", mouID);
        bindProgress(request, body);

        const firstPartyResult = await request.query(`
            SELECT organisation_name
            FROM sagarmanthan_revamp.dbo.mmt_organisation
            WHERE organisation_id = @organisationId;
        `);

        if (firstPartyResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Organisation not found" });
        }

        request.input("firstParty", firstPartyResult.recordset[0].organisation_name);

        const updateQuery = `
            UPDATE tbl_gmis_mou 
            SET organisation_id = @organisationId, 
                event_name = @eventName, 
                navic_vibhas_id = @navicId, 
                name_of_mou = @nameOfMou, 
                name_of_first_party = @firstParty,
                name_of_second_party = @nameOfSecondParty, 
                nature_of_second_party = @natureOfSecondParty,
                amount = @amount, 
                revised_amount = @revisedAmount,
                mou_category_id = @mouCategoryId, 
                present_status = @presentStatus, 
                remark_or_detailed_status = @detailedRemarks, 
                reason_for_dropping = @reasonForDropping, 
                mou_brief = @mouBrief, 
                updated_by = @userId, 
                document_uploader = @uniqueFileName,
                next_steps = @nextSteps,
                updated_on = GETDATE()
            WHERE id = @mouID;
        `;

        // A changed progress value is kept as a new revision, with the MoU's other changes
        await request.query(
            `SET XACT_ABORT ON; BEGIN TRANSACTION; ${updateQuery} ${RECORD_PROGRESS_SQL} COMMIT TRANSACTION;`
        );

        // The MoU now points at a different document (or none): remove the old file from disk
        if (currentDoc && currentDoc !== uniqueFileName) {
            await removeGmisFileIfUnused(conn, currentDoc);
        }

        return res.status(200).json({ success: true, message: 'MoU updated successfully' });
    } catch (err) {
        console.error('updateGmisMouData Error:', err);
        return res.status(500).json({ success: false, error: 'Failed to update MoU data' });
    }
}

async function getGmisMouPaginated(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;
        const search = req.query.search ? req.query.search.trim() : "";
        const eventName = req.query.eventName || "";
        const organisationId = req.query.organisationId || "";
        const category = req.query.category || "";
        const natureOfSecondParty = req.query.natureOfSecondParty || "";
        const navicName = req.query.navicName || "";
        const status = req.query.status || "";
        const offset = (page - 1) * pageSize;

        const scope = gmisScope(req.user);

        const conn = await pool;
        const request = conn.request();

        let baseWhereClauses = ["1=1", scope.sql];
        if (scope.orgId) request.input("scopeOrgId", scope.orgId);

        if (eventName && eventName !== "all" && eventName !== "All") {
            baseWhereClauses.push("tbl_gmis_mou.event_name = @eventName");
            request.input("eventName", eventName);
        }

        if (organisationId && organisationId !== "all" && organisationId !== "All") {
            baseWhereClauses.push("tbl_gmis_mou.organisation_id = @organisationId");
            request.input("organisationId", organisationId);
        }

        if (category && category !== "all" && category !== "All") {
            if (!isNaN(Number(category))) {
                baseWhereClauses.push("(tbl_gmis_mou.mou_category_id = @categoryNum OR mmt_mou_category.mou_category_name = @category)");
                request.input("categoryNum", Number(category));
                request.input("category", String(category));
            } else {
                baseWhereClauses.push("mmt_mou_category.mou_category_name = @category");
                request.input("category", String(category));
            }
        }

        if (natureOfSecondParty && natureOfSecondParty !== "all" && natureOfSecondParty !== "All") {
            baseWhereClauses.push("tbl_gmis_mou.nature_of_second_party = @natureOfSecondParty");
            request.input("natureOfSecondParty", natureOfSecondParty);
        }

        if (navicName && navicName !== "all" && navicName !== "All") {
            baseWhereClauses.push("mmt_navic_vibhas.navic_name = @navicName");
            request.input("navicName", navicName);
        }

        if (search) {
            baseWhereClauses.push(`(
                tbl_gmis_mou.name_of_mou LIKE @search OR
                tbl_gmis_mou.name_of_second_party LIKE @search OR
                tbl_gmis_mou.name_of_first_party LIKE @search OR
                mmt_organisation.organisation_name LIKE @search OR
                tbl_gmis_mou.event_name LIKE @search OR
                tbl_gmis_mou.mou_brief LIKE @search OR
                mmt_navic_vibhas.navic_name LIKE @search
            )`);
            request.input("search", `%${search}%`);
        }

        const baseWhereSql = baseWhereClauses.join(" AND ");

        // Data query clauses (includes status tab filter)
        let dataWhereClauses = [...baseWhereClauses];
        if (status && status !== "all" && status !== "All") {
            if (status.toLowerCase().includes("completed")) {
                dataWhereClauses.push("tbl_gmis_mou.present_status LIKE '%Completed%'");
            } else if (status.toLowerCase().includes("under") || status.toLowerCase().includes("implementation") || status.toLowerCase() === "ui") {
                dataWhereClauses.push("tbl_gmis_mou.present_status LIKE '%Under Implementation%'");
            } else if (status.toLowerCase().includes("dropped")) {
                dataWhereClauses.push("tbl_gmis_mou.present_status LIKE '%Dropped%'");
            } else if (status.toLowerCase().includes("yet")) {
                dataWhereClauses.push(YET_TO_START_SQL);
            } else {
                dataWhereClauses.push("tbl_gmis_mou.present_status = @status");
                request.input("status", status);
            }
        }

        const dataWhereSql = dataWhereClauses.join(" AND ");

        request.input("offset", offset);
        request.input("pageSize", pageSize);

        const dataQuery = `
            SELECT 
                tbl_gmis_mou.id,
                tbl_gmis_mou.event_name,
                tbl_gmis_mou.organisation_id,
                mmt_organisation.organisation_name,
                tbl_gmis_mou.name_of_mou,
                tbl_gmis_mou.name_of_first_party,
                tbl_gmis_mou.name_of_second_party,
                tbl_gmis_mou.nature_of_second_party,
                tbl_gmis_mou.amount,
                tbl_gmis_mou.revised_amount,
                tbl_gmis_mou.mou_category_id,
                mmt_mou_category.mou_category_name,
                tbl_gmis_mou.mou_brief,
                tbl_gmis_mou.present_status,
                tbl_gmis_mou.reason_for_dropping,
                tbl_gmis_mou.remark_or_detailed_status,
                tbl_gmis_mou.next_steps,
                tbl_gmis_mou.navic_vibhas_id,
                mmt_navic_vibhas.navic_name,
                tbl_gmis_mou.document_uploader,
                tbl_gmis_mou.created_on,
                tbl_gmis_mou.updated_on,
                ${PROGRESS_COLUMNS},
                COUNT(*) OVER() AS total_count
            FROM tbl_gmis_mou
            ${PROGRESS_JOIN}
            LEFT JOIN mmt_organisation ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id
            LEFT JOIN mmt_navic_vibhas ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id
            LEFT JOIN mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id
            WHERE ${dataWhereSql}
            ORDER BY tbl_gmis_mou.id DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
        `;

        const countRequest = conn.request();
        if (scope.orgId) countRequest.input("scopeOrgId", scope.orgId);
        if (eventName && eventName !== "all" && eventName !== "All") countRequest.input("eventName", eventName);
        if (organisationId && organisationId !== "all" && organisationId !== "All") countRequest.input("organisationId", organisationId);
        if (category && category !== "all" && category !== "All") {
            if (!isNaN(Number(category))) {
                countRequest.input("categoryNum", Number(category));
                countRequest.input("category", String(category));
            } else {
                countRequest.input("category", String(category));
            }
        }
        if (natureOfSecondParty && natureOfSecondParty !== "all" && natureOfSecondParty !== "All") countRequest.input("natureOfSecondParty", natureOfSecondParty);
        if (navicName && navicName !== "all" && navicName !== "All") countRequest.input("navicName", navicName);
        if (search) countRequest.input("search", `%${search}%`);

        const countsQuery = `
            SELECT 
                COUNT(*) AS count_all,
                SUM(CASE WHEN tbl_gmis_mou.present_status LIKE '%Under Implementation%' THEN 1 ELSE 0 END) AS count_ui,
                SUM(CASE WHEN tbl_gmis_mou.present_status LIKE '%Completed%' THEN 1 ELSE 0 END) AS count_completed,
                SUM(CASE WHEN ${YET_TO_START_SQL} THEN 1 ELSE 0 END) AS count_yet_to_start,
                SUM(CASE WHEN tbl_gmis_mou.present_status LIKE '%Dropped%' THEN 1 ELSE 0 END) AS count_dropped,
                SUM(CAST(ISNULL(tbl_gmis_mou.amount, 0) AS FLOAT)) AS total_amount
            FROM tbl_gmis_mou
            LEFT JOIN mmt_organisation ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id
            LEFT JOIN mmt_navic_vibhas ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id
            LEFT JOIN mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id
            WHERE ${baseWhereSql};
        `;

        const [dataResult, countsResult] = await Promise.all([
            request.query(dataQuery),
            countRequest.query(countsQuery)
        ]);

        const recordset = dataResult.recordset || [];
        const totalCount = recordset.length > 0 ? recordset[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const countsRow = countsResult.recordset?.[0] || {};

        res.json({
            data: recordset,
            totalCount,
            totalPages,
            currentPage: page,
            pageSize,
            counts: {
                all: countsRow.count_all || 0,
                underImplementation: countsRow.count_ui || 0,
                completed: countsRow.count_completed || 0,
                yetToStart: countsRow.count_yet_to_start || 0,
                dropped: countsRow.count_dropped || 0,
                totalAmount: countsRow.total_amount || 0,
            }
        });
    } catch (err) {
        console.error("Error in getGmisMouPaginated:", err);
        return res.status(500).json({ error: "Internal server error fetching GMIS MoUs" });
    }
}
// async function getGmisMouDataByID(req, res) {
//     const mouID = req.params.mouID;
//     const conn = await pool;
//     const request = conn.request();
//     const scope = gmisScope(req.user);

//     request.input("mouID", mouID);
//     if (scope.orgId) request.input("scopeOrgId", scope.orgId);

//     try {
//         const result = await request.query(`
//         SELECT 
//             tbl_gmis_mou.id,
//             tbl_gmis_mou.organisation_id,
//             tbl_gmis_mou.navic_vibhas_id,
//             mmt_organisation.organisation_name,
//             tbl_gmis_mou.name_of_mou,
//             tbl_gmis_mou.name_of_second_party,
//             tbl_gmis_mou.nature_of_second_party,
//             tbl_gmis_mou.name_of_first_party,
//             tbl_gmis_mou.amount,
//             tbl_gmis_mou.mou_category_id,
//             mmt_mou_category.mou_category_name,
//             tbl_gmis_mou.mou_brief,
//             tbl_gmis_mou.present_status,
//             tbl_gmis_mou.reason_for_dropping,
//             tbl_gmis_mou.remark_or_detailed_status,
//             tbl_gmis_mou.revised_amount,
//             tbl_gmis_mou.event_name,
//             tbl_gmis_mou.document_uploader,
//             tbl_gmis_mou.next_steps,
//             tbl_gmis_mou.created_on,
//             tbl_gmis_mou.updated_on,
//             ${PROGRESS_COLUMNS}
//         FROM 
//             tbl_gmis_mou
//         ${PROGRESS_JOIN}
//         LEFT JOIN 
//             mmt_organisation ON tbl_gmis_mou.organisation_id = mmt_organisation.organisation_id
//         LEFT JOIN 
//             mmt_navic_vibhas ON mmt_navic_vibhas.id = tbl_gmis_mou.navic_vibhas_id
//         LEFT JOIN 
//             mmt_mou_category ON tbl_gmis_mou.mou_category_id = mmt_mou_category.mou_category_id
//         WHERE 
//             tbl_gmis_mou.id = @mouID AND ${scope.sql};
//         `);

//         res.json(result.recordset);
//     }
//     catch (err) {
//         console.error("Error in getGmisMouDataByID:", err);
//         return res.sendStatus(500);
//     }
// }


// async function getGmisMouStageDetails(req, res) {
//     const conn = await pool;
//     const roleID = req.params.roleID;
//     const organisationID = req.params.organisationID;

//     request.input("roleID", roleID);
//     request.input("organisationID", organisationID);

//     try {
//         const result = await conn.query(` SELECT present_status ,count(*) AS count, SUM(amount)/ 100000 AS amount  FROM tbl_gmis_mou WHERE event_name = 'GMIS 2016'
//         GROUP BY present_status`);

//         res.json(result.recordset);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }


async function getGmisMouVibhasNavicCell(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT DISTINCT mnv.id, mnv.navic_name
            FROM tbl_gmis_mou gmismou
            INNER JOIN mmt_navic_vibhas mnv 
                ON gmismou.navic_vibhas_id = mnv.id
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Database query error:", err);
        res.sendStatus(500);
    }
}

// async function getOrganisationWiseCountAmountStatus(req, res) {
//     const conn = await pool;

//     try {
//         // Query to get status counts for each organization
//         const result = await conn.query(`
//             SELECT mmt.organisation_label, present_status, count(*) AS count
//             FROM sagarmanthan_revamp.dbo.tbl_gmis_mou gm
//             LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
//             GROUP BY organisation_label, present_status ORDER BY count DESC
//         `);

//         // Query to get cost of MOU for each organization
//         const result2 = await conn.query(`
//             SELECT mmt.organisation_label, SUM(amount)/1000 AS 'cost_of_mou'
//             FROM tbl_gmis_mou gm
//             LEFT JOIN mmt_organisation mmt ON gm.organisation_id = mmt.organisation_id
//             GROUP BY mmt.organisation_label
//         `);

//         const resultData = result.recordset;
//         const costData = result2.recordset;

//         const mergedData = resultData.map(item => {
//             const costItem = costData.find(cost => cost.organisation_label === item.organisation_label);
//             return {
//                 organisation_label: item.organisation_label,
//                 present_status: item.present_status,
//                 count: item.count,
//                 cost_of_mou: costItem ? costItem.cost_of_mou : 0
//             };
//         });

//         // Group by organisation_code to sum up the counts for each status
//         const groupedData = mergedData.reduce((acc, item) => {
//             if (!acc[item.organisation_label]) {
//                 acc[item.organisation_label] = {
//                     organisation_label: item.organisation_label,
//                     'Approval phase': 0,
//                     'Dropped': 0,
//                     'Feasibility/ DPR/ Planning/ Study phase': 0,
//                     'Tendering stage': 0,
//                     'To be started': 0,
//                     'Work completed': 0,
//                     'Work under implementation (work awarded and implementation started)': 0,
//                     cost_of_mou: item.cost_of_mou
//                 };
//             }
//             acc[item.organisation_label][item.present_status] += item.count;
//             return acc;
//         }, {});

//         // Convert grouped data into an array
//         const finalData = Object.values(groupedData);
//         res.json(finalData);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }
// async function getMouTotalCountAmount_2023(req, res) {
//  try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         console.log(roleId,"role");
//         console.log(organisationID,"orgId")

//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2023'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2023'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }
// async function getMouTotalAmountAndCount_2023(req, res) {
// try {
//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;

//         console.log(roleId, "role");
//         console.log(organisationID, "orgId");

//         const conn = await pool;
//         const request = conn.request();

//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     COUNT(*) AS count, 
//                     SUM(ISNULL(amount, 0)) AS amount
//                 FROM tbl_gmis_mou
//                 WHERE event_name = 'GMIS 2023'
//             `;

//         } else {
//             query = `
//                 SELECT 
//                     COUNT(*) AS count, 
//                     SUM(ISNULL(amount, 0)) AS amount
//                 FROM tbl_gmis_mou
//                 WHERE event_name = 'GMIS 2023'
//                 AND organisation_id = @organisationID
//             `;
//         }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         return res.sendStatus(500);
//     }
// }
// async function getGmisMouStageDetails_2023(req, res) {
//   try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         console.log(roleId,"role");
//         console.log(organisationID,"orgId")

//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2023'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2023'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }
// async function getMouTotalCountAmount_2025(req, res) {
//     try {

//         const roleId = req.params.roleId;
//         const organisationID = req.params.organisationID;
//         const conn = await pool;
//         const request = conn.request();

//         request.input("roleId", roleId);
//         request.input("organisationID", organisationID);

//         let query = "";
//         if (roleId == 2 || roleId == 3 || roleId == 4 || roleId == 5) {

//             query = `
//                 SELECT 
//                     g.present_status,
//                     g.organisation_id,
//                     o.organisation_name,
//                     COUNT(*) AS count,
//                     SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//                 FROM tbl_gmis_mou g
//                 LEFT JOIN mmt_organisation o
//                     ON g.organisation_id = o.organisation_id
//                 WHERE g.event_name = 'GMIS 2025'
//                 GROUP BY g.present_status, g.organisation_id, o.organisation_name
//                 ORDER BY g.present_status
//             `;

//         } else {

//         query = `
//             SELECT 
//                 g.present_status,
//                 g.organisation_id,
//                 o.organisation_name,
//                 COUNT(*) AS count,
//                 SUM(ISNULL(g.amount, 0)) / 100000 AS amount
//             FROM tbl_gmis_mou g
//             LEFT JOIN mmt_organisation o
//                 ON g.organisation_id = o.organisation_id
//             WHERE g.event_name = 'GMIS 2025'
//             AND g.organisation_id = @organisationID
//             GROUP BY g.present_status, g.organisation_id, o.organisation_name
//             ORDER BY g.present_status
//         `;
//     }

//         const result = await request.query(query);

//         return res.json({ rowData: result.recordset });

//     } catch (err) {
//         console.error(err);
//         res.sendStatus(500);
//     }
// }

    // GET /download-gmismou-pdf-document?fileName=<stored file name>
    // Only a plain stored file name is accepted (no folders or "..", so nothing outside the
    // upload folder can be read), and only for a MoU the user is allowed to see.
    async function gmisPdfFileDownload(req, res)
    {
        try {
            const raw = String(req.query.fileName || req.query.filename || '');
            const fileName = path.basename(raw);
            if (!fileName || fileName !== raw || fileName.startsWith('.')) {
                return res.status(400).send({ error: "Invalid file name" });
            }

            const scope = gmisScope(req.user);
            const request = (await pool).request();
            request.input('fileName', fileName);
            if (scope.orgId) request.input('scopeOrgId', scope.orgId);
            const found = await request.query(`
                SELECT TOP 1 1 AS ok FROM tbl_gmis_mou
                WHERE document_uploader = @fileName AND ${scope.sql}
            `);
            if (!found.recordset.length) {
                return res.status(404).send({ error: "File not found" });
            }

            res.download(path.resolve(uploadDestination, fileName), fileName, (err) => {
                if (err && !res.headersSent) res.status(404).send({ error: "File not found" });
            });
        } catch (err) {
            console.error("gmisPdfFileDownload error:", err);
            res.status(500).send({ error: "Internal Server Error" });
        }
    }

async function gmisfileDelete(req, res) {
    try {
        const fileName = String(req.query.fileName || "");

        if (!fileName) {
            return res.status(400).send({ error: "File name is required" });
        }
        if (!isPlainFileName(fileName)) {
            return res.status(400).send({ error: "Invalid file name" });
        }

        // Only detach the document of a MoU the user is allowed to see.
        const scope = gmisScope(req.user);

        const conn = await pool;
        const request = conn.request();
        request.input('fileName', fileName);
        if (scope.orgId) request.input('scopeOrgId', scope.orgId);

        const result = await request.query(`
            UPDATE tbl_gmis_mou
            SET document_uploader = NULL
            WHERE document_uploader = @fileName AND ${scope.sql}
        `);

        if (result.rowsAffected[0] > 0) {
            // Remove the file from disk too (skipped if another MoU somehow still uses it)
            await removeGmisFileIfUnused(conn, fileName);
            return res.status(200).send({ message: "File deleted successfully and database updated" });
        }

        return res.status(404).send({ error: "No matching database record found" });
    } catch (err) {
        console.error("gmisfileDelete error:", err);
        return res.status(500).send({ error: "Internal Server Error" });
    }
}

        
async function getRevisedfinancialprogressdate(req, res) {
    const mouID = req.params.mouID;
    if (!(await canAccessMou(req.user, mouID))) return res.status(404).json({ message: "MoU not found" });

    try {
        const conn = await pool;
        
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_gmis_mou_financial_progress')
            BEGIN
                CREATE TABLE tbl_gmis_mou_financial_progress (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    mou_id INT,
                    revised_financial_progress_date DATE,
                    revised_financial_progress_percentage DECIMAL(5,2),
                    revised_on DATETIME DEFAULT GETDATE()
                );
            END
        `);

        const request = conn.request();
        request.input("mouID", mouID);

        const result = await request.query(`
            SELECT
                pfp.id,
                pfp.mou_id,
                pfp.revised_financial_progress_date,
                pfp.revised_financial_progress_percentage,
                pfp.revised_on
            FROM tbl_gmis_mou_financial_progress AS pfp
            WHERE pfp.mou_id = @mouID
            ORDER BY pfp.revised_on DESC;
        `);

        return res.json(result.recordset || []);
    } catch (err) {
        console.error("Error in getRevisedfinancialprogressdate:", err);
        return res.json([]);
    }
}

async function getRevisedphysicalprogressdate(req, res) {
    const mouID = req.params.mouID;
    if (!(await canAccessMou(req.user, mouID))) return res.status(404).json({ message: "MoU not found" });

    try {
        const conn = await pool;
        
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_gmis_mou_physical_progress')
            BEGIN
                CREATE TABLE tbl_gmis_mou_physical_progress (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    mou_id INT,
                    revised_physical_progress_date DATE,
                    revised_physical_progress_percentage DECIMAL(5,2),
                    revised_on DATETIME DEFAULT GETDATE()
                );
            END
        `);

        const request = conn.request();
        request.input("mouID", mouID);

        const result = await request.query(`
            SELECT
                pff.id,
                pff.mou_id,
                pff.revised_physical_progress_date,
                pff.revised_physical_progress_percentage,
                pff.revised_on
            FROM tbl_gmis_mou_physical_progress AS pff
            WHERE pff.mou_id = @mouID
            ORDER BY pff.revised_on DESC;
        `);

        return res.json(result.recordset || []);
    } catch (err) {
        console.error("Error in getRevisedphysicalprogressdate:", err);
        return res.json([]);
    }
}

async function addRevisedphysicalprogressdate(req, res) {
    const mouID = req.body.mouID;
    if (!(await canAccessMou(req.user, mouID))) return res.status(404).json({ message: "MoU not found" });
    let targetphysicalProgressDate = req.body.targetphysicalProgressDate || req.body.physicalProgressDate;
    let targetphysicalPercentage = req.body.targetphysicalPercentage !== undefined ? req.body.targetphysicalPercentage : req.body.physicalPercentage;

    if (targetphysicalProgressDate === "") targetphysicalProgressDate = null;
    if (targetphysicalPercentage === "") targetphysicalPercentage = null;

    try {
        const conn = await pool;
        
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_gmis_mou_physical_progress')
            BEGIN
                CREATE TABLE tbl_gmis_mou_physical_progress (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    mou_id INT,
                    revised_physical_progress_date DATE,
                    revised_physical_progress_percentage DECIMAL(5,2),
                    revised_on DATETIME DEFAULT GETDATE()
                );
            END
        `);

        const request = conn.request();
        request.input("mouID", mouID);
        request.input("targetphysicalProgressDate", targetphysicalProgressDate);
        request.input("targetphysicalPercentage", targetphysicalPercentage !== null ? Number(targetphysicalPercentage) : null);

        await request.query(`
            INSERT INTO tbl_gmis_mou_physical_progress (
                mou_id, revised_physical_progress_date, revised_physical_progress_percentage, revised_on
            ) VALUES (
                @mouID, @targetphysicalProgressDate, @targetphysicalPercentage, GETDATE()
            );
        `);

        res.status(201).json({ success: true, message: "Physical progress revised successfully" });
    } catch (err) {
        console.error("Error in addRevisedphysicalprogressdate:", err);
        return res.status(500).json({ error: "Failed to save revised physical progress" });
    }
}

async function addRevisedfinancialprogressdate(req, res) {
    const mouID = req.body.mouID;
    if (!(await canAccessMou(req.user, mouID))) return res.status(404).json({ message: "MoU not found" });
    let targetfinancialProgressDate = req.body.targetfinancialProgressDate || req.body.financialProgressDate;
    let targetfinancialPercentage = req.body.targetfinancialPercentage !== undefined ? req.body.targetfinancialPercentage : req.body.financialPercentage;

    if (targetfinancialProgressDate === "") targetfinancialProgressDate = null;
    if (targetfinancialPercentage === "") targetfinancialPercentage = null;

    try {
        const conn = await pool;
        
        await conn.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_gmis_mou_financial_progress')
            BEGIN
                CREATE TABLE tbl_gmis_mou_financial_progress (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    mou_id INT,
                    revised_financial_progress_date DATE,
                    revised_financial_progress_percentage DECIMAL(5,2),
                    revised_on DATETIME DEFAULT GETDATE()
                );
            END
        `);

        const request = conn.request();
        request.input("mouID", mouID);
        request.input("targetfinancialProgressDate", targetfinancialProgressDate);
        request.input("targetfinancialPercentage", targetfinancialPercentage !== null ? Number(targetfinancialPercentage) : null);

        await request.query(`
            INSERT INTO tbl_gmis_mou_financial_progress (
                mou_id, revised_financial_progress_date, revised_financial_progress_percentage, revised_on
            ) VALUES (
                @mouID, @targetfinancialProgressDate, @targetfinancialPercentage, GETDATE()
            );
        `);

        res.status(201).json({ success: true, message: "Financial progress revised successfully" });
    } catch (err) {
        console.error("Error in addRevisedfinancialprogressdate:", err);
        return res.status(500).json({ error: "Failed to save revised financial progress" });
    }
};

//Report

async function getEventWiseSummary(req, res) {
    try {
        const conn = await pool;
        // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();

        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );

            organisationFilter = `
                WHERE organisation_id = @organisation_id
            `;
        }

        const result = await request.query(`
            SELECT
                event_name AS [GMIS Event],
                COUNT(*) AS [Total MoUs],
                SUM(ISNULL(amount, 0)) AS [Total Amount],
                SUM(
                    CASE
                        WHEN (LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%yet%start%' OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%to be started%')
                        THEN 1
                        ELSE 0
                    END
                ) AS [Yet To be Started],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%feasibility%'
                          OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%dpr%'
                          OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%planning%'
                          OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%study%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Feasibility / DPR / Planning / Study Phase],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%approval%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Approval Phase],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%tender%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Tendering Stage],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%implementation%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Work Under Implementation],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%completed%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Work Completed],
                SUM(
                    CASE
                        WHEN LOWER(LTRIM(RTRIM(present_status)))
                             LIKE '%dropped%'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Dropped]
                 
            FROM tbl_gmis_mou
            ${organisationFilter}
            GROUP BY event_name
            ORDER BY event_name;
        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error( "getEventWiseSummary Error:", err );
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

async function getorgWisePerformanceRankingReport(req, res) {
    try {
        const conn = await pool;
        // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();

        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );

            organisationFilter = `
                WHERE gmis.organisation_id = @organisation_id
            `;
        }

        const result = await request.query(`
            WITH OrganisationProgress AS (
                SELECT
                    gmis.organisation_id,
                    org.organisation_name AS [Organisation Name],

                    COUNT(*) AS [Total MoUs],

                    SUM(ISNULL(gmis.amount, 0)) AS [Total Cost],

                    -- Stage counts
                    SUM(CASE
                        WHEN (LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%yet%start%' OR LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%to be started%')
                        THEN 1 ELSE 0
                    END) AS [Yet To be Started],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%feasibility%'
                          OR LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%dpr%'
                          OR LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%planning%'
                          OR LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%study%'
                        THEN 1 ELSE 0
                    END) AS [Feasibility / DPR / Planning / Study Phase],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%approval%'
                        THEN 1 ELSE 0
                    END) AS [Approval Phase],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%tender%'
                        THEN 1 ELSE 0
                    END) AS [Tendering Stage],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%implementation%'
                        THEN 1 ELSE 0
                    END) AS [Work Under Implementation],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%completed%'
                        THEN 1 ELSE 0
                    END) AS [Work Completed],

                    SUM(CASE
                        WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                             LIKE '%dropped%'
                        THEN 1 ELSE 0
                    END) AS [Dropped]

                FROM tbl_gmis_mou gmis

                LEFT JOIN mmt_organisation org
                    ON gmis.organisation_id = org.organisation_id

                ${organisationFilter}

                GROUP BY
                    gmis.organisation_id,
                    org.organisation_name
            ),

            CalculatedProgress AS (
            SELECT
                *,
                
                -- Numeric Implementation Progress
                CAST(
                    CASE
                        WHEN ([Total MoUs] - [Dropped]) > 0
                        THEN
                            (
                                ([Feasibility / DPR / Planning / Study Phase] * 20.0)
                                +
                                ([Approval Phase] * 40.0)
                                +
                                ([Tendering Stage] * 60.0)
                                +
                                ([Work Under Implementation] * 80.0)
                                +
                                ([Work Completed] * 100.0)
                            )
                            / ([Total MoUs] - [Dropped])
                        ELSE 0
                    END
                AS DECIMAL(10, 2)) AS [Implementation Progress Value]

                FROM OrganisationProgress
                )

            SELECT
                [Organisation Name],
                [Total MoUs],
                [Total Cost],
                [Yet To be Started],
                [Feasibility / DPR / Planning / Study Phase],
                [Approval Phase],
                [Tendering Stage],
                [Work Under Implementation],
                [Work Completed],
                [Dropped],

                -- Display value with %
                CONCAT(
                    [Implementation Progress Value],
                    '%'
                ) AS [Implementation Progress],

                -- Rank based on numeric value
                RANK() OVER (
                    ORDER BY [Implementation Progress Value] DESC
                ) AS [Performance Rank]

            FROM CalculatedProgress

            ORDER BY
                [Performance Rank],
                [Organisation Name];
        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error(
            "getorgWisePerformanceRankingReport Error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

async function getVibascellWiseSummary(req, res) {
    try {
        const conn = await pool;
        // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();

        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );

            organisationFilter = `  WHERE gmis.organisation_id = @organisation_id `;
        }

        const result = await request.query(`
            WITH VibhasSummary AS (
                SELECT
                    gmis.navic_vibhas_id,
                    vibhas.navic_name AS [Navic / Vibhas Name],
                    COUNT(*) AS [Total MoUs],
                    SUM(ISNULL(gmis.amount, 0)) AS [Total Cost],
                    SUM(
                        CASE
                            WHEN (LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%yet%start%' OR LOWER(LTRIM(RTRIM(gmis.present_status))) LIKE '%to be started%')
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Yet To be Started],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%feasibility%'
                              OR LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%dpr%'
                              OR LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%planning%'
                              OR LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%study%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Feasibility / DPR / Planning / Study Phase],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%approval%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Approval Phase],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%tender%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Tendering Stage],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%implementation%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Work Under Implementation],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%completed%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Work Completed],

                    SUM(
                        CASE
                            WHEN LOWER(LTRIM(RTRIM(gmis.present_status)))
                                LIKE '%dropped%'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Dropped]

                FROM tbl_gmis_mou gmis
                LEFT JOIN mmt_navic_vibhas vibhas ON gmis.navic_vibhas_id = vibhas.id
                ${organisationFilter}
                GROUP BY
                    gmis.navic_vibhas_id,
                    vibhas.navic_name
            ),

            CalculatedProgress AS (
                SELECT
                    *,

                    CAST(
                        CASE
                            WHEN ([Total MoUs] - [Dropped]) > 0
                            THEN
                                (
                                    ([Yet To be Started] * 0.0)
                                    +
                                    ([Feasibility / DPR / Planning / Study Phase] * 20.0)
                                    +
                                    ([Approval Phase] * 40.0)
                                    +
                                    ([Tendering Stage] * 60.0)
                                    +
                                    ([Work Under Implementation] * 80.0)
                                    +
                                    ([Work Completed] * 100.0)
                                )
                                /
                                ([Total MoUs] - [Dropped])

                            ELSE 0
                        END
                    AS DECIMAL(10, 2))
                    AS [Implementation Progress]

                FROM VibhasSummary
            )
            SELECT
                [Navic / Vibhas Name],
                [Total MoUs],
                [Total Cost],
                [Yet To be Started],
                [Feasibility / DPR / Planning / Study Phase],
                [Approval Phase],
                [Tendering Stage],
                [Work Under Implementation],
                [Work Completed],
                [Dropped],

                CONCAT(
                    [Implementation Progress],
                    '%'
                ) AS [Implementation Progress (%)],

                RANK() OVER (
                    ORDER BY
                        [Implementation Progress] DESC
                ) AS [Performance Rank]

            FROM CalculatedProgress

            ORDER BY
                [Performance Rank],
                [Navic / Vibhas Name];

        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error( "getVibascellWiseSummary Error:", err);
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}
async function getCategoryWiseSummary(req,res) {
    try {
        const conn = await pool;
        // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();

        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );

            organisationFilter = `  WHERE organisation_id = @organisation_id `;
        }

        const result = await request.query(`
           SELECT
            mou.mou_category_name AS [MoU Category],
            COUNT(*) AS [Total MoUs],
            SUM(ISNULL(amount, 0)) AS [Total Amount],
            SUM(CASE
                WHEN (LOWER(LTRIM(RTRIM(present_status))) LIKE '%yet%start%' OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%to be started%')
                THEN 1 ELSE 0
            END) AS [Yet To be Started],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%feasibility%'
                OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%dpr%'
                OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%planning%'
                OR LOWER(LTRIM(RTRIM(present_status))) LIKE '%study%'
                THEN 1 ELSE 0
            END) AS [Feasibility / DPR / Planning / Study Phase],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%approval%'
                THEN 1 ELSE 0
            END) AS [Approval Phase],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%tender%'
                THEN 1 ELSE 0
            END) AS [Tendering Stage],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%implementation%'
                THEN 1 ELSE 0
            END) AS [Work Under Implementation],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%completed%'
                THEN 1 ELSE 0
            END) AS [Work Completed],
            SUM(CASE
                WHEN LOWER(LTRIM(RTRIM(present_status))) LIKE '%dropped%'
                THEN 1 ELSE 0
            END) AS [Dropped]
        FROM tbl_gmis_mou gmis
        LEFT JOIN mmt_mou_category mou ON gmis.navic_vibhas_id = mou.mou_category_id
        ${organisationFilter}
        GROUP BY mou.mou_category_name
        ORDER BY mou.mou_category_name;
        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error("getEventWiseSummary Error:", err );
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

async function getPhysicalAndFinancialProgressWise(req, res) {
    try {
        const conn = await pool;
        // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();

        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );

            organisationFilter = ` WHERE gmis.organisation_id = @organisation_id`;
        }

        const result = await request.query(`
            SELECT
                ROW_NUMBER() OVER (
                    ORDER BY mmt.organisation_name, gmis.event_name
                ) AS [S.No.],
                mmt.organisation_name AS [Organisation],
                gmis.name_of_mou AS [MoU / Project],
                gmis.present_status AS [Current Status],
                ISNULL(gmis.amount, 0) AS [Original Amount (₹ Cr)],
                ISNULL(gmis.revised_amount, 0) AS [Revised Amount (₹ Cr)],
                ISNULL(
                    gfp.revised_financial_progress_percentage,
                    0
                ) AS [Financial Progress (%)],
                ISNULL(
                    gpp.revised_physical_progress_percentage,
                    0
                ) AS [Physical Progress (%)]

            FROM tbl_gmis_mou AS gmis
            LEFT JOIN mmt_organisation AS mmt ON gmis.organisation_id = mmt.organisation_id
            LEFT JOIN (
                SELECT
                    mou_id,
                    MAX(revised_financial_progress_percentage)
                        AS revised_financial_progress_percentage
                FROM tbl_gmis_mou_financial_progress
                GROUP BY mou_id
            ) AS gfp ON gmis.id = gfp.mou_id

            LEFT JOIN (
                SELECT
                    mou_id,
                    MAX(revised_physical_progress_percentage)
                        AS revised_physical_progress_percentage
                FROM tbl_gmis_mou_physical_progress
                GROUP BY mou_id
            ) AS gpp
                ON gmis.id = gpp.mou_id

            ${organisationFilter}

            ORDER BY
                mmt.organisation_name,
                gmis.event_name;
        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error( "getPhysicalAndFinancialProgressWise Error:", err );
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

async function getDroppedMousReport(req, res) {
    try {
    const conn = await pool;
    // Whose MoUs to report on comes from the signed token (as on the dashboard and data
        // list), not from the userId in the URL.
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        const canViewAllOrganisations = isWide;
        const userOrganisationId = organisationId;

        if (
            !canViewAllOrganisations &&
            (!isOrganisation || !Number.isInteger(userOrganisationId) || userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }
        const request = conn.request();
        let organisationFilter = "";

        if (!canViewAllOrganisations) {
            request.input(  "organisation_id", userOrganisationId );

            organisationFilter = ` WHERE gmis.organisation_id = @organisation_id `;
        }

        const result = await request.query(`
            SELECT
                gmis.name_of_mou AS [MoU / Project],
                gmis.name_of_first_party AS [First Party],
                gmis.nature_of_second_party AS [Second Party],
                mou.mou_category_name AS [Category Name],
                ISNULL(gmis.amount, 0) AS [Amount],
                gmis.remark_or_detailed_status AS [Remark],
                gmis.next_steps AS [Next Steps]

            FROM tbl_gmis_mou AS gmis

            LEFT JOIN mmt_mou_category AS mou ON gmis.navic_vibhas_id = mou.mou_category_id
            ${organisationFilter}
            ORDER BY
                mou.mou_category_name,
                gmis.name_of_mou;
        `);

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {
        console.error( "getDroppedMousReport Error:", err );
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

export default {
    getGmisMouPaginated, getMouCategory, submitGmisMouData, updateGmisMouData, getGmisMouVibhasNavicCell, upload, gmisUploadMiddleware, gmisfileDelete, addRevisedfinancialprogressdate, getRevisedfinancialprogressdate, getRevisedphysicalprogressdate, addNewgmisFileupload, gmisPdfFileDownload, addRevisedphysicalprogressdate, getEventWiseSummary, getorgWisePerformanceRankingReport, getVibascellWiseSummary, getCategoryWiseSummary, getPhysicalAndFinancialProgressWise, getDroppedMousReport
};