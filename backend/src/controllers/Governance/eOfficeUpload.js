import fs from 'fs';
import path from 'path';
import { scanFile } from '../../utils/clamav.js';

// E-Office and Attendance sheet uploads (QC EO-01): only spreadsheets are kept - checked by
// extension and type - so nothing else is stored or handed to the spreadsheet reader.
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls (and .csv on some systems)
    'text/csv',
    'application/csv',
];

export function spreadsheetFileFilter(req, file, callback) {
    const extOk = ALLOWED_EXTENSIONS.includes(path.extname(file.originalname || '').toLowerCase());
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    if (extOk && mimeOk) return callback(null, true);
    return callback(new Error('Only Excel (.xlsx, .xls) or CSV files can be uploaded.'));
}

const pad = (n) => String(n).padStart(2, '0');

// Name a sheet is stored under: the uploaded file's own name plus the upload date and time
// (name_DDMMYYYY_HHMMSS.ext). Any folder part of the name ("../", "C:\...") is dropped first,
// so the file is always written inside its upload folder (QC EOF-BE-02 / ATT-BE-02).
export function uniqueUploadName(originalName, now = new Date()) {
    const name = String(originalName || '').split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, '').trim();
    const dot = name.lastIndexOf('.');
    const base = (dot > 0 ? name.slice(0, dot) : name) || 'sheet';
    const ext = dot > 0 ? name.slice(dot + 1) : '';
    const stamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${base}_${stamp}${ext ? `.${ext}` : ''}`;
}

// Full path of a stored sheet inside its upload folder (a stored name can't point outside it)
export function storedUploadPath(folder, fileName) {
    return path.join(folder, path.basename(String(fileName)));
}

// Removes a stored sheet by its name, or by multer's file object
export function removeStoredUpload(folder, file) {
    if (!file) return;
    const filePath = typeof file === 'object' ? file.path : storedUploadPath(folder, file);
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.error('Uploaded sheet could not be removed:', err.message);
    }
}

// The id of a stored sheet from a form value: a positive whole number, else null
export function uploadedFileId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// upload.single('file') with a clean 400 for a refused or missing file (there is no global
// multer error handler, so a rejection would otherwise surface as a 500), then a virus scan
// before the sheet is read or kept (QC EOF-BE-01 / ATT-BE-01). Like the other uploads in the
// portal it fails closed: an infected file, or one that could not be scanned, is deleted.
export function singleSpreadsheet(upload) {
    return (req, res, next) => {
        upload.single('file')(req, res, async (err) => {
            if (err) return res.status(400).json({ error: err.message || 'File upload failed.' });
            if (!req.file) return res.status(400).json({ error: 'Choose an Excel or CSV file to upload.' });

            const scan = await scanFile(req.file.path);
            if (scan.status === 'clean') return next();

            removeStoredUpload(null, req.file);
            if (scan.status === 'infected') {
                console.warn('Infected sheet upload rejected:', req.file.originalname, scan.threat, '| user:', req.user?.userId);
                return res.status(422).json({ error: 'File rejected: a virus was detected.' });
            }
            return res.status(503).json({ error: 'File scanning is unavailable. Please try again later.' });
        });
    };
}
