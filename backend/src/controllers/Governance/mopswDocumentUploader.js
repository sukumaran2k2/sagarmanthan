import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import { applyDataScope } from "../../middleware/dataScope.js";
import { scanFile } from "../../utils/clamav.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute paths so upload, download and delete always agree, whatever process.cwd() is.
// Files land in the quarantine folder first; only a scanned, clean PDF is moved into the
// served folder (QC MOPSW-BE-02, MOPSW-BE-05). Nothing serves the quarantine folder.
export const MOPSW_UPLOAD_DIR = path.join(__dirname, "../../../fileuploads/cabinet_notes_mopsw");
const QUARANTINE_DIR = path.join(__dirname, "../../../fileuploads/cabinet_notes_mopsw_quarantine");

for (const dir of [MOPSW_UPLOAD_DIR, QUARANTINE_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10000000; // 10 MB, unchanged
// tbl_cabinet_notes_mopsw_document.cabinet_notes_mopsw_document is nvarchar(256)
const MAX_BASE_NAME = 150;

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// The stored name is generated here, so the client-supplied name never reaches the disk.
// Same readable shape as before (<name>_<ddmmyyyy>_<hhmmss>.pdf) plus a short random part,
// so two uploads of the same file in the same second no longer overwrite each other.
function generateStoredFileName(originalFileName) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePart = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const random = crypto.randomBytes(3).toString('hex');

    const base = path.basename(String(originalFileName || ''), path.extname(String(originalFileName || '')))
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/^[._]+/, '')
        .slice(0, MAX_BASE_NAME) || 'document';

    return `${base}_${datePart}_${timePart}_${random}.pdf`;
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, QUARANTINE_DIR),
    filename: (req, file, callback) => callback(null, generateStoredFileName(file.originalname)),
});

// The form offers PDF only (accept=".pdf"); the real content is checked again after upload,
// since both the extension and the browser-supplied MIME type are client-controlled.
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (req, file, callback) => {
        const isPdf =
            file.mimetype === 'application/pdf' ||
            String(file.originalname || '').toLowerCase().endsWith('.pdf');
        if (!isPdf) return callback(new Error('ONLY_PDF'));
        callback(null, true);
    },
});

const removeFile = (p) => fs.promises.unlink(p).catch(() => {});
const removeAll = (paths) => Promise.all(paths.map(removeFile));

async function moveFile(from, to) {
    try {
        await fs.promises.rename(from, to);
    } catch (e) {
        await fs.promises.copyFile(from, to);
        await removeFile(from);
    }
}

async function isRealPdf(filePath) {
    const fh = await fs.promises.open(filePath, 'r');
    try {
        const buf = Buffer.alloc(5);
        await fh.read(buf, 0, 5, 0);
        return buf.toString() === '%PDF-';
    } finally {
        await fh.close();
    }
}

// Route middleware: runs multer and turns its errors into readable 4xx answers
function uploadDocuments(req, res, next) {
    upload.array("files[]", MAX_FILES)(req, res, async (err) => {
        if (!err) return next();
        await removeAll((req.files || []).map((f) => f.path));
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: `You can upload at most ${MAX_FILES} files at a time.` });
        }
        if (err.message === 'ONLY_PDF') {
            return res.status(400).json({ error: 'Only PDF files are allowed.' });
        }
        console.error('[MopswDocumentUploader] upload:', err);
        return res.status(400).json({ error: 'The files could not be uploaded.' });
    });
}

// The note must exist and be inside the caller's data scope
async function isNoteInScope(conn, user, noteId) {
    const request = conn.request();
    request.input("noteId", sql.Int, noteId);
    const { joinSql, whereSql } = applyDataScope(request, user, { strategy: 'viaCreatedBy', alias: 'notes' });
    const result = await request.query(`
        SELECT 1 AS ok
        FROM tbl_cabinet_notes_mopsw AS notes
        ${joinSql}
        WHERE notes.cabinet_notes_mopsw_id = @noteId
        ${whereSql}
    `);
    return result.recordset.length > 0;
}

async function mopswDocumentUploader(req, res) {
    const files = req.files || [];
    const quarantinePaths = files.map((f) => f.path);

    if (!files.length || !req.body.cabinetNotesMopswID) {
        await removeAll(quarantinePaths);
        return res.status(400).json({ error: "No files or IDs uploaded" });
    }

    const noteId = parseId(req.body.cabinetNotesMopswID);
    if (!noteId) {
        await removeAll(quarantinePaths);
        return res.status(400).json({ error: "Invalid cabinet note." });
    }

    let conn;
    try {
        conn = await pool;
        // Files may only be attached to a note the caller can reach
        if (!(await isNoteInScope(conn, req.user, noteId))) {
            await removeAll(quarantinePaths);
            return res.status(404).json({ error: "Cabinet note not found." });
        }
    } catch (err) {
        console.error('[MopswDocumentUploader] scope check:', err);
        await removeAll(quarantinePaths);
        return res.status(500).json({ error: "Could not upload the documents. Please try again." });
    }

    // ---- 1. Every file must be a real PDF and scan clean; one failure rejects them all ----
    try {
        for (const file of files) {
            if (!(await isRealPdf(file.path))) {
                await removeAll(quarantinePaths);
                return res.status(400).json({ error: `"${path.basename(file.originalname)}" is not a valid PDF file.` });
            }

            const scan = await scanFile(file.path);
            if (scan.status === 'infected') {
                console.warn('[MopswDocumentUploader] infected upload rejected:', file.originalname, scan.threat);
                await removeAll(quarantinePaths);
                return res.status(422).json({ error: 'File rejected: a virus was detected.' });
            }
            if (scan.status !== 'clean') {
                await removeAll(quarantinePaths); // fail closed: never keep an unscanned file
                return res.status(503).json({ error: 'File scanning is unavailable. Please try again later.' });
            }
        }
    } catch (scanErr) {
        console.error('[MopswDocumentUploader] scan:', scanErr);
        await removeAll(quarantinePaths); // fail closed
        return res.status(503).json({ error: 'File scanning is unavailable. Please try again later.' });
    }

    // ---- 2. All clean: move into the served folder, then record them in one transaction ----
    const finalPaths = [];
    const transaction = new sql.Transaction(conn);
    let begun = false;
    try {
        for (const file of files) {
            const finalPath = path.join(MOPSW_UPLOAD_DIR, file.filename);
            await moveFile(file.path, finalPath);
            finalPaths.push(finalPath);
        }

        await transaction.begin();
        begun = true;
        for (const file of files) {
            await new sql.Request(transaction)
                .input("cabinetNotesMopswID", sql.Int, noteId)
                .input("fileName", sql.NVarChar(256), file.filename)
                .query(`
                    INSERT INTO tbl_cabinet_notes_mopsw_document (mopsw_cabinet_id, cabinet_notes_mopsw_document)
                    VALUES (@cabinetNotesMopswID, @fileName)
                `);
        }
        await transaction.commit();

        return res.status(201).json({ message: "MOPSW documents created successfully" });
    } catch (err) {
        console.error('[MopswDocumentUploader] save:', err);
        if (begun) await transaction.rollback().catch(() => {});
        // Nothing half-saved: no database rows without files, no files without rows
        await removeAll(finalPaths);
        await removeAll(quarantinePaths);
        return res.status(500).json({ error: "Could not upload the documents. Please try again." });
    }
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------

async function downloadMopswDocument(req, res) {
    const noteId = parseId(req.params.id);
    const fileName = typeof req.query.file === 'string' ? req.query.file : '';
    const notFound = () => res.status(404).json({ message: "File not found" });

    // A stored name is a bare file name; anything else can never match a document
    if (!noteId || !fileName || path.basename(fileName) !== fileName) return notFound();

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("id", sql.Int, noteId);
        request.input("fileName", sql.NVarChar(256), fileName);
        // The document must belong to this note, and the note must be inside the caller's
        // data scope (QC MOPSW-BE-03). Missing and out-of-scope answer the same 404.
        const { joinSql, whereSql } = applyDataScope(request, req.user, { strategy: 'viaCreatedBy', alias: 'notes' });

        const result = await request.query(`
            SELECT d.cabinet_notes_mopsw_document
            FROM tbl_cabinet_notes_mopsw_document AS d
            INNER JOIN tbl_cabinet_notes_mopsw AS notes
                ON notes.cabinet_notes_mopsw_id = d.mopsw_cabinet_id
            ${joinSql}
            WHERE d.mopsw_cabinet_id = @id
              AND d.cabinet_notes_mopsw_document = @fileName
            ${whereSql}
        `);

        // recordset (one result set), not recordsets: [[]] has length 1 even when nothing matched
        if (!result.recordset.length) {
            return notFound();
        }

        const filePath = path.join(MOPSW_UPLOAD_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            console.error("[MopswDocumentUploader] file missing on disk:", fileName);
            return notFound();
        }

        // res.attachment() quotes and encodes the name safely for the header
        res.attachment(fileName);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Length', fs.statSync(filePath).size);

        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error('[MopswDocumentUploader] download:', err);
        res.status(500).json({ message: "Could not download the document. Please try again." });
    }
}

const mopswDocumentTab = { mopswDocumentUploader, upload, uploadDocuments, downloadMopswDocument };
export default mopswDocumentTab;
