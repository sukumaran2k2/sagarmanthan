import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { scanFile } from '../../utils/clamScan.js';

const uploadDestination = "./fileuploads/Consultant_Appointment";
// Absolute form of the upload folder, used to prove a resolved path stays inside it
const uploadRoot = path.resolve(uploadDestination);

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

// The browser controls the uploaded file's name, so it may contain path separators
// ("../../x.pdf") or be empty. Keep only the last path segment and drop anything
// that could still walk the tree, so the stored file cannot escape uploadDestination.
function safeBaseName(originalFileName) {
    const base = path.basename(String(originalFileName || '')).replace(/[\\/]/g, '');
    const cleaned = base.replace(/^\.+/, '').trim();
    return cleaned || 'document.pdf';
}

function generateUniqueFileName(originalFileName) {
    const safeName = safeBaseName(originalFileName);

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');
    const milliseconds = currentDate.getMilliseconds().toString().padStart(3, '0');

    const dotIndex = safeName.lastIndexOf('.');
    const hasExt = dotIndex > 0;
    const fileExtension = hasExt ? safeName.slice(dotIndex + 1) : 'pdf';
    const baseFileName = hasExt ? safeName.slice(0, dotIndex) : safeName;

    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}${milliseconds}.${fileExtension}`;
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        callback(null, generateUniqueFileName(file.originalname));
    },
});

// The appointment order is always a PDF. Without this the endpoint stores whatever
// is posted, and the matching check in the browser is trivially bypassed.
function pdfOnly(req, file, callback) {
    const isPdf = file.mimetype === 'application/pdf' &&
        path.extname(safeBaseName(file.originalname)).toLowerCase() === '.pdf';
    if (!isPdf) {
        // Skip the file rather than throw, so the handler can answer with a clear
        // message instead of falling through to the generic error page
        req.rejectedFileReason = 'Only PDF files are accepted for the appointment order.';
        return callback(null, false);
    }
    callback(null, true);
}

const upload = multer({
    storage: storage,
    fileFilter: pdfOnly,
    limits: { fileSize: 20000000, files: 1 }
});

// Resolve a stored document name to a path, or null when it would leave the folder
function resolveUploadPath(fileName) {
    if (!fileName) return null;
    const resolved = path.resolve(uploadRoot, safeBaseName(fileName));
    if (resolved !== uploadRoot && !resolved.startsWith(uploadRoot + path.sep)) return null;
    return resolved;
}

// Returns true when a file was actually removed from disk.
function removeUploadedFile(fileName) {
    const filePath = resolveUploadPath(fileName);
    if (!filePath) return false;
    try {
        if (!fs.existsSync(filePath)) return false;
        fs.unlinkSync(filePath);
        return true;
    } catch (err) {
        console.error('Error removing appointment order file:', err);
        return false;
    }
}

async function candidateDocumentUploader(req, res) {
    const candidateID = parseInt(req.body.candidateID, 10);

    try {
        if (req.rejectedFileReason) {
            return res.status(400).json({ error: req.rejectedFileReason });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // A document with no valid owner would be unreachable and undeletable
        if (!Number.isInteger(candidateID) || candidateID <= 0) {
            removeUploadedFile(req.file.filename);
            return res.status(400).json({ error: "A valid candidate ID is required" });
        }

        // ClamAV security scan
        try {
            const scanResult = await scanFile(req.file.path);
            if (!scanResult.clean) {
                removeUploadedFile(req.file.filename);
                return res.status(422).json({ error: 'File rejected: malware or threat detected.', threat: scanResult.threat });
            }
        } catch (scanErr) {
            console.warn('[ClamAV] Scanner unavailable, skipping scan:', scanErr.message);
        }

        const conn = await pool;
        const request = conn.request();

        const fileName = req.file.filename;

        request.input("fileName", fileName);
        request.input("candidateID", candidateID);

        const checkResult = await request.query(`
            SELECT id, appointment_order_document FROM tbl_ca_candidate_document WHERE candidate_id = @candidateID
        `);

        if (checkResult.recordset.length > 0) {
            const previousFile = checkResult.recordset[0].appointment_order_document;
            await request.query(`
                UPDATE tbl_ca_candidate_document
                SET appointment_order_document = @fileName
                WHERE candidate_id = @candidateID
            `);
            // The row no longer points at the old file, so drop it rather than leak it on disk
            if (previousFile && previousFile !== fileName) {
                removeUploadedFile(previousFile);
            }
        } else {
            await request.query(`
                INSERT INTO tbl_ca_candidate_document (candidate_id, appointment_order_document)
                VALUES (@candidateID, @fileName)
            `);
        }

        res.status(201).json({
            message: "Candidate document uploaded successfully",
            fileName: fileName
        });
    } catch (err) {
        console.error("Error uploading candidate document:", err);
        // Nothing references the file once the write failed
        if (req.file?.filename) removeUploadedFile(req.file.filename);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function downloadCandidateDocument(req, res) {
    const fileName = req.params.fileName;
    const filePath = resolveUploadPath(fileName);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }
    return res.download(filePath, path.basename(filePath));
}

const candidateDocumentTab = { candidateDocumentUploader, downloadCandidateDocument, upload, removeUploadedFile, resolveUploadPath };
export default candidateDocumentTab;
