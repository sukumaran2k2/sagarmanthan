import path from 'path';

// E-Office sheet uploads (QC EO-01): only spreadsheets are kept - checked by extension and type,
// as the Attendance upload does - so nothing else is stored or handed to the spreadsheet reader.
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

// upload.single('file') with a clean 400 for a refused or missing file (there is no global
// multer error handler, so a rejection would otherwise surface as a 500)
export function singleSpreadsheet(upload) {
    return (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message || 'File upload failed.' });
            if (!req.file) return res.status(400).json({ error: 'Choose an Excel or CSV file to upload.' });
            return next();
        });
    };
}
