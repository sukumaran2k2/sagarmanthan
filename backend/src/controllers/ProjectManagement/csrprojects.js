import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mssql from "mssql";
import { pool } from "../../db.js";
import mime from 'mime-types';
import { getDataScope } from '../../middleware/dataScope.js';
import { ORG_GROUPS } from './capexDashboard.js';

// Ministry / master users see every organisation's CSR data; organisation users only their own.
// Decided from the signed token only (never from URL, query or body values), as in GMIS and CAPEX.
// orgId is the organisation to restrict to (null = every organisation); blocked is true for an
// organisation user without an organisation, who sees nothing.
function csrScope(user) {
    const { scope, isOrganisation, organisationId } = getDataScope(user);
    // Only MASTER / MINISTRY see every organisation; a token without a scope sees nothing (QC CSR-17)
    if (scope === 'MASTER' || scope === 'MINISTRY') return { orgId: null, blocked: false };
    if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) return { orgId: null, blocked: true };
    return { orgId: organisationId, blocked: false };
}

// True when the row exists and belongs to an organisation within the user's scope.
async function canAccessRow(user, table, idColumn, id) {
    const rowId = Number(id);
    if (!Number.isInteger(rowId) || rowId <= 0) return false;
    const scope = csrScope(user);
    if (scope.blocked) return false;
    const request = (await pool).request();
    request.input('scopeRowId', rowId);
    let orgSql = '';
    if (scope.orgId) {
        request.input('scopeOrgId', scope.orgId);
        orgSql = 'AND organisation_id = @scopeOrgId';
    }
    const result = await request.query(`SELECT TOP 1 1 AS ok FROM ${table} WHERE ${idColumn} = @scopeRowId ${orgSql}`);
    return result.recordset.length > 0;
}
const canAccessProject = (user, csrProjectId) => canAccessRow(user, 'tbl_csr_projects', 'csr_project_id', csrProjectId);
const canAccessFund = (user, csrFundId) => canAccessRow(user, 'tbl_csr_fund', 'csr_fund_id', csrFundId);

// Records are always saved for the user's own organisation; only organisation users can write
// (organisationWriter), so an organisation id sent in the request is never used (QC CSR-18).
const organisationForSave = (user) => csrScope(user).orgId;

// ----- Checks on what is saved (QC CSR-10 / CSR-41 / CSR-43 / CSR-44); the form makes the same ones.
// Each returns an error message for a 400, or null. Amounts arrive in lakh (columns decimal(12,2)).
const CSR_STATUSES = ['Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed'];
const NOT_STARTED = ['Approved by Board', 'Project yet to start'];
const MAX_LAKH = 9999999999.99;
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const isFinancialYear = (v) => /^\d{4}-\d{4}$/.test(String(v || '')) && Number(String(v).slice(5)) === Number(String(v).slice(0, 4)) + 1;
const amountError = (label, v) => {
    const n = Number(v);
    if (isBlank(v) || !Number.isFinite(n) || n < 0) return `${label} must be 0 or more.`;
    if (n > MAX_LAKH) return `${label} is too large. Enter amounts in crore.`;
    return null;
};
const textError = (label, v, max) => {
    if (isBlank(v)) return `${label} is required.`;
    if (String(v).trim().length > max) return `${label} can be at most ${max} characters.`;
    return null;
};
// A YYYY-MM-DD date that exists, or null when blank; 'bad' when it isn't a real date
const dateOrNull = (v) => {
    if (isBlank(v)) return null;
    const d = String(v).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d).toISOString().slice(0, 10) === d ? d : 'bad';
};
const todayInIndia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const REMARKS_MAX = 2000;

// Compare a field as sent with the saved value
const sameText = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
const sameNumber = (a, b) => (isBlank(a) && isBlank(b)) || (!isBlank(a) && !isBlank(b) && Number(a) === Number(b));
const savedDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const sameDate = (a, b) => (dateOrNull(a) || null) === savedDate(b);

// Checks a project before it is saved. `current` is the saved project ({ row, expenditures }) when
// editing, null for a new one. A new project gets every check. On an edit a rule is checked only
// when a field it depends on was changed (QC R-03 / R-11 / CSR-41 / CSR-43): a field left as it was
// saved - even blank or out of range on an old row - doesn't block the save, but anything the user
// enters or changes must be valid, so the CSR-03 wrong-unit amounts can't be entered on edit either.
function projectError(body, { current = null } = {}) {
    const isNew = !current;
    const row = current?.row || {};
    const check = (changed) => isNew || changed;

    if (check(!sameNumber(body.csrfocus, row.csr_focus))) {
        const focus = Number(body.csrfocus);
        if (!Number.isInteger(focus) || focus <= 0) return 'Select the CSR focus / project area.';
    }
    if (check(!sameText(body.financialYear, row.financial_year)) && !isFinancialYear(body.financialYear)) {
        return 'Select a valid financial year.';
    }
    for (const [label, key, column, max] of [
        ['Name of the project', 'nameofproject', 'project_name', 255],
        ['Project received from', 'projectReceived', 'project_received_from', 255],
        ['Impact / possible outcome', 'impactproject', 'impact_possible_outcome', 256],
        ['Target beneficiaries', 'targetbeneficiaries', 'target_beneficiaries', 256],
    ]) {
        if (check(!sameText(body[key], row[column]))) {
            const text = textError(label, body[key], max);
            if (text) return text;
        }
    }
    if (check(!sameText(body.remarksoftheproject, row.remarks)) && String(body.remarksoftheproject || '').trim().length > REMARKS_MAX) {
        return `Remarks can be at most ${REMARKS_MAX} characters.`;
    }
    const valueChanged = !sameNumber(body.projectvalue, row.project_value);
    if (check(valueChanged)) {
        const value = amountError('Project value', body.projectvalue);
        if (value) return value;
    }

    const status = body.projectstatus;
    const statusChanged = !sameText(status, row.project_status);
    if (check(statusChanged) && !CSR_STATUSES.includes(status)) return 'Select a valid project status.';
    const progress = [
        ['Physical progress', body.physicalprogresssofar, row.physical_progress],
        ['Financial progress', body.finiancialprogresssofar, row.financial_progress],
    ];
    const progressChanged = progress.some(([, v, saved]) => !sameNumber(isBlank(v) ? 0 : v, saved ?? 0));
    for (const [label, v, saved] of progress) {
        const n = Number(isBlank(v) ? 0 : v);
        if (check(!sameNumber(isBlank(v) ? 0 : v, saved ?? 0)) && (!Number.isFinite(n) || n < 0 || n > 100)) {
            return `${label} must be between 0 and 100.`;
        }
        if (check(statusChanged || progressChanged) && NOT_STARTED.includes(status) && n > 0) {
            return `${label} must be 0 while the status is "${status}".`;
        }
    }

    const commenced = dateOrNull(body.commencedon);
    const completed = dateOrNull(body.completedon);
    const datesChanged = !sameDate(body.commencedon, row.commenced_on) || !sameDate(body.completedon, row.completed_on);
    if (check(datesChanged)) {
        if (commenced === 'bad' || completed === 'bad') return 'A date is not valid.';
        const today = todayInIndia();
        if ((commenced && commenced > today) || (completed && completed > today)) return 'Dates cannot be in the future.';
        if (commenced && completed && completed < commenced) return 'The completed date cannot be earlier than the commenced date.';
    }
    if (check(statusChanged || datesChanged)) {
        if (completed && completed !== 'bad' && status !== 'Completed') return 'A completed date can be entered only for a completed project.';
        if (!commenced && (status === 'Project Under implementation' || status === 'Completed')) return 'Enter the date the project commenced.';
    }

    // No expenditure sent on an edit: the saved rows stay as they are
    const expenditures = Array.isArray(body.expenditures) ? body.expenditures
        : (current?.expenditures || []).map((e) => ({ expenditureFinancialYear: e.year, expenditureCost: e.csr_expenditure_cost }));
    const savedSpend = new Map((current?.expenditures || []).map((e) => [String(e.year), Number(e.csr_expenditure_cost)]));
    const years = new Set();
    let spent = 0;
    let spendChanged = expenditures.length !== savedSpend.size;
    for (const e of expenditures) {
        const year = e.expenditureFinancialYear;
        const rowChanged = !savedSpend.has(String(year)) || savedSpend.get(String(year)) !== Number(e.expenditureCost);
        if (rowChanged) spendChanged = true;
        if (check(rowChanged) && !isFinancialYear(year)) return 'An expenditure row has no valid financial year.';
        if (years.has(year)) return `${year} appears twice in the expenditure.`;
        years.add(year);
        if (check(rowChanged)) {
            const cost = amountError(`Expenditure for ${year}`, e.expenditureCost);
            if (cost) return cost;
        }
        spent += Number(e.expenditureCost) || 0;
    }
    if (check(valueChanged || spendChanged) && spent > Number(body.projectvalue) + 1e-9) {
        return 'Total expenditure cannot be more than the project value.';
    }
    return null;
}

// The saved project and its expenditure, for comparing an edit with (projectError)
async function savedProject(projectID) {
    const request = (await pool).request().input('projectID', projectID);
    const result = await request.query(`
        SELECT * FROM tbl_csr_projects WHERE csr_project_id = @projectID;
        SELECT [year], csr_expenditure_cost FROM tbl_csr_expenditure WHERE csr_project_id = @projectID;`);
    const row = result.recordsets[0][0];
    return row ? { row, expenditures: result.recordsets[1] } : null;
}

function fundError(body) {
    if (!isFinancialYear(body.financialYear)) return 'Select a valid financial year.';
    return amountError('Net profit', body.netProfit)
        || amountError('Opening balance', body.openingBalanceCSR)
        || amountError('CSR fund allotted', body.csrFundAllotedForYear);
}

// The project a stored file belongs to (a gallery file or a completion document), or null.
async function projectForCsrFile(fileName) {
    const request = (await pool).request();
    request.input('scopeFileName', fileName);
    const result = await request.query(`
        SELECT TOP 1 csr_project_id FROM (
            SELECT csr_project_id FROM tbl_csr_image WHERE document_name = @scopeFileName
            UNION ALL
            SELECT csr_project_id FROM tbl_csr_projects WHERE project_completion_doc = @scopeFileName
        ) AS files`);
    return result.recordset[0]?.csr_project_id ?? null;
}

// Sends a stored CSR file when it belongs to a project the user can see. Only a plain stored
// file name is accepted, so a request can't reach other server files with "../".
async function sendCsrFile(req, res, fileName) {
    if (!fileName || path.basename(String(fileName)) !== fileName) {
        return res.status(400).send({ error: "Invalid file name" });
    }
    const projectId = await projectForCsrFile(fileName);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
        return res.status(404).send({ message: "File not found" });
    }
    const filePath = path.join(uploadDestination, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send({ message: "File not found" });
    }
    // res.attachment writes Content-Disposition safely for any name (filename* for non-Latin
    // characters); a raw header threw for such legacy names, so the download failed (QC R-10)
    res.attachment(fileName);
    res.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath)
        .on('error', (err) => {
            console.error('Error reading CSR file:', err);
            if (!res.headersSent) res.sendStatus(500); else res.destroy();
        })
        .pipe(res);
}


const uploadDestination = "./fileuploads/CSR_Projects";


if (!fs.existsSync(uploadDestination)) 
{
    fs.mkdirSync(uploadDestination, { recursive: true });
}


// Stored names are '<uploader user id>_<random uuid><extension>': never two alike (a name and
// a second-level timestamp could overwrite another upload, QC CSR-20), and a saved project can
// only use a document its own user uploaded (QC CSR-07)
const generateUniqueFileName = (originalName, userId) =>
    `${Number(userId) || 0}_${crypto.randomUUID()}${path.extname(originalName).toLowerCase()}`;
const isOwnUpload = (fileName, userId, extension) =>
    new RegExp(`^${Number(userId)}_[0-9a-f-]{36}\\${extension}$`).test(String(fileName || ''));

// File types accepted, by extension and declared type, then checked against the file's first
// bytes, so an SVG / HTML page can't be stored as an "image" and run in the browser (QC CSR-02)
const PDF_TYPES = { '.pdf': ['application/pdf'] };
const GALLERY_TYPES = {
    '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.webp': ['image/webp'], '.mp4': ['video/mp4'],
};
const acceptsType = (types, file) => (types[path.extname(file.originalname).toLowerCase()] || []).includes(file.mimetype);
function hasSignature(filePath) {
    const head = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    try { fs.readSync(fd, head, 0, 12, 0); } finally { fs.closeSync(fd); }
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') return head.subarray(0, 4).toString('latin1') === '%PDF';
    if (ext === '.jpg' || ext === '.jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (ext === '.png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (ext === '.webp') return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
    if (ext === '.mp4') return head.subarray(4, 8).toString('latin1') === 'ftyp';
    return false;
}
// Removes stored upload files, ignoring ones already gone (QC CSR-28)
const removeUploads = (files) => (files || []).forEach((f) => fs.rmSync(f.path || path.join(uploadDestination, f), { force: true }));

// The completion document a save may refer to: none, the project's current one, or a PDF this
// user has just uploaded that no project uses yet (QC CSR-07). Returns { name, isNew } or { error }.
async function documentForSave(name, userId, currentName = null) {
    if (isBlank(name)) return { name: null, isNew: false };
    if (name === currentName) return { name, isNew: false };
    if (!isOwnUpload(name, userId, '.pdf') || !fs.existsSync(path.join(uploadDestination, name)) || (await projectForCsrFile(name))) {
        return { error: 'The completion document could not be attached. Upload it again.' };
    }
    return { name, isNew: true };
}

// The completion PDF is uploaded before the project is saved. When a save is refused, the PDF
// uploaded for it is removed again - if it is this user's and no project uses it (QC CSR-19).
async function discardUnusedUpload(name, userId) {
    if (isOwnUpload(name, userId, '.pdf') && !(await projectForCsrFile(name))) removeUploads([name]);
}

// Completion PDFs this user uploaded more than a day ago that no project uses (a form left
// after uploading) are removed when they upload the next one (QC CSR-19)
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;
async function removeStaleUploads(userId) {
    const prefix = `${Number(userId)}_`;
    for (const name of fs.readdirSync(uploadDestination).filter((n) => n.startsWith(prefix) && n.endsWith('.pdf'))) {
        const age = Date.now() - fs.statSync(path.join(uploadDestination, name)).mtimeMs;
        if (age > STALE_UPLOAD_MS) await discardUnusedUpload(name, userId);
    }
}

// Define the storage configuration first
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination); // Set the destination folder
    },
    filename: (req, file, callback) => {
        callback(null, generateUniqueFileName(file.originalname, req.user?.userId));
    },
});

 const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },  // 20 MB, as the form says (QC CSR-29)
    fileFilter: (req, file, callback) => {
        if (acceptsType(PDF_TYPES, file)) {
            callback(null, true);
        } else {
            callback(new Error('Only PDF files are allowed for this upload.'));
        }
    }
});

async function createCsrProjects(req, res)
{
    // A refused save removes the PDF uploaded for it (QC CSR-19)
    const refuse = async (status, error) => {
        await discardUnusedUpload(req.body.csrDocumentFileName, req.user.userId);
        return res.status(status).json({ error });
    };
    if (csrScope(req.user).blocked) return refuse(403, "Your account is not linked to an organisation.");
    const invalid = projectError(req.body);
    if (invalid) return refuse(400, invalid);
    const organisationID = organisationForSave(req.user);
    const csrfocus = req.body.csrfocus;
    const nameofproject = req.body.nameofproject;
    const projectReceived = req.body.projectReceived;
    const impactproject = req.body.impactproject;
    const targetbeneficiaries = req.body.targetbeneficiaries;
    const projectvalue = req.body.projectvalue;
    const projectstatus = req.body.projectstatus;
    const financialYear = req.body.financialYear;    
    let commencedon = req.body.commencedon;
    let completedon = req.body.completedon;
    const finiancialprogresssofar = req.body.finiancialprogresssofar;
    const physicalprogresssofar = req.body.physicalprogresssofar;
    const remarksoftheproject = req.body.remarksoftheproject;
    const userID = req.user.userId; // created_by / updated_by: the signed-in user, not a body value
    const document = await documentForSave(req.body.csrDocumentFileName, req.user.userId);
    if (document.error) return res.status(400).json({ error: document.error });
    const uniqueFileName = document.name;
    let focusID = req.body.focusID;
    const csrExpenditureTab = req.body.expenditures || [];
    // Gallery files are attached after the save, by /update-csr-gallery-upload: stored names
    // are never taken from the request body (QC CSR-07)
    // Ensure the default values for optional fields
    if (!commencedon || commencedon === "") {
        commencedon = null;
    }
    if (!completedon || completedon === "") {
        completedon = null;
    }


    const conn = await pool;
    // The project, its expenditure and gallery rows are saved together or not at all (QC CSR-09)
    const transaction = new mssql.Transaction(conn);
    try {
        await transaction.begin();
        const request = transaction.request();

        // Bind input parameters for the main CSR project
        request.input("organisationID", organisationID);
        request.input("csrfocus", csrfocus);
        request.input("nameofproject", nameofproject);
        request.input("projectReceived", projectReceived);
        request.input("impactproject", impactproject);
        request.input("targetbeneficiaries", targetbeneficiaries);
        request.input("projectvalue", projectvalue);
        request.input("projectstatus", projectstatus);
        request.input("financialYear", financialYear);
        request.input("commencedon", commencedon);
        request.input("completedon", completedon);
        request.input("finiancialprogresssofar", finiancialprogresssofar);
        request.input("physicalprogresssofar", physicalprogresssofar);
        request.input("remarksoftheproject", remarksoftheproject);
        request.input("userID", userID);
        request.input("focusID", focusID);
        request.input("uniqueFileName", uniqueFileName);


        // Insert into tbl_csr_projects and get the csr_project_id
        const result = await request.query(`
            INSERT INTO tbl_csr_projects (
                organisation_id, csr_focus, project_name, project_received_from, impact_possible_outcome, target_beneficiaries,
                project_value, project_status, financial_year, commenced_on, completed_on, financial_progress, physical_progress, remarks,        
                created_by, created_date, project_completion_doc
            )
            OUTPUT INSERTED.csr_project_id
            VALUES (
                @organisationID, @csrfocus, @nameofproject, @projectReceived, @impactproject, @targetbeneficiaries,
                @projectvalue, @projectstatus, @financialYear, @commencedon, @completedon, @finiancialprogresssofar, @physicalprogresssofar,
                @remarksoftheproject, @userID, GETDATE(), @uniqueFileName
            );
        `);

        const csrProjectId = result.recordset[0].csr_project_id;


        // Expenditure tab         
        // Check the length of csrExpenditureTab before proceeding
        if (csrExpenditureTab.length > 0) {
            for (let i = 0; i < csrExpenditureTab.length; i++) 
            {
                const expenditureRequest = transaction.request();
                let csrExpenditureId = csrExpenditureTab[i].csrExpenditureId;
                let expenditureFinancialYear = csrExpenditureTab[i].expenditureFinancialYear;
                let expenditureCost = csrExpenditureTab[i].expenditureCost;
        
                expenditureRequest.input("csrProjectId", csrProjectId);
                expenditureRequest.input("csrExpenditureId", csrExpenditureId);
                expenditureRequest.input("expenditureFinancialYear", expenditureFinancialYear);
                expenditureRequest.input("expenditureCost", expenditureCost);
                expenditureRequest.input("userID", userID);
        
                let query = ` 
                    INSERT INTO tbl_csr_expenditure (csr_project_id, year, csr_expenditure_cost, created_by, created_date) 
                    VALUES (@csrProjectId, @expenditureFinancialYear, @expenditureCost, @userID, GETDATE());
                `;
        
                await expenditureRequest.query(query);
            }
        } 
       
        await transaction.commit();
        res.status(200).json({
            message: 'CSR project created',
            csr_project_id: csrProjectId,
            status: 200
        });

    } catch (err) {
        console.error("Error creating CSR project:", err);
        await transaction.rollback().catch(() => {});
        if (document.isNew) removeUploads([document.name]); // the PDF uploaded for this save
        res.status(500).json({ error: "An error occurred while creating the project." });
    }
}

async function csrProjectDocumentUploader(req, res) 
{
    // const { folderName } = req.body;
    try {
        const conn = await pool; 

        if (!req.file || !req.file.filename) {
            console.error("No file or unique file name provided.");
            return res.status(400).json({ error: "No file uploaded or unique name missing" });
        }

        if (!hasSignature(req.file.path)) {
            removeUploads([req.file]);
            return res.status(400).json({ error: "The file is not a valid PDF." });
        }
        res.status(200).json({ status: 'success', uniqueFileName: req.file.filename });
        await removeStaleUploads(req.user.userId).catch((err) => console.error('CSR: stale upload clean-up failed', err));
    } catch (err) {
        console.error("Error in file upload:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

//file upload 
const fileUploadDestination = './fileuploads/CSR_Projects';

let fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, fileUploadDestination );
    },
    filename: (req, file, callback) => {
        callback(null, generateUniqueFileName(file.originalname, req.user?.userId));
    },
});

const fileUpload= multer({
    storage: fileStorage,
    limits: { fileSize: 10000000, files: 10 },  // 10 MB each, at most 10 files per upload (QC CSR-19)
    fileFilter: (req, file, callback) => {
        if (acceptsType(GALLERY_TYPES, file)) {
            callback(null, true);
        } else {
            callback(new Error('Only JPG, PNG, WebP photos or MP4 videos are allowed for the gallery.'));
        }
    }
});

// Wraps a multer upload middleware so a rejected file (wrong type, too large)
// returns a clean 400 JSON response instead of falling through to Express's
// default error page.
function handleUploadErrors(uploadMiddleware) {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large.'
                    : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Too many files in one upload.'
                    : err instanceof multer.MulterError || /are allowed/.test(err.message) ? err.message
                    : 'The file could not be uploaded.';
                if (!(err instanceof multer.MulterError) && !/are allowed/.test(err.message)) console.error('Upload error:', err);
                return res.status(400).json({ error: message });
            }
            next();
        });
    };
}


async function csrfileDownload(req, res) 
{
    try
    {
        await sendCsrFile(req, res, req.params.fileName);
    } catch (error) {
        console.error("Error sending CSR file:", error)
        res.status(500).send("Internal Server Error");
    }
}

// The completion document and gallery files are replaced through the add / edit form; the
// unused delete endpoints were removed (QC CSR-37), so nothing is removed without a log.

// ----------------------------------------------------- GET DATA  -----------------------------------------------------------

async function getCsrProjectslist(req, res)
{
    const scope = csrScope(req.user);
    if (scope.blocked) return res.json([]);
    try {
        const request = (await pool).request();
        // One query for Ministry and organisation users; the same fields for both (QC CSR-26)
        let orgSql = '';
        if (scope.orgId) {
            request.input("organisationID", scope.orgId);
            orgSql = 'WHERE p.organisation_id = @organisationID';
        }
        const result = await request.query(`
            SELECT p.csr_project_id, p.organisation_id, o.organisation_name, p.csr_focus,
                p.project_name, p.project_received_from, p.impact_possible_outcome, p.target_beneficiaries,
                p.project_value, p.project_status, p.financial_year, p.commenced_on, p.completed_on,
                p.financial_progress, p.physical_progress, p.remarks, p.created_by, p.project_completion_doc,
                p.updated_date
            FROM tbl_csr_projects p
            JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
            ${orgSql}
            ORDER BY p.financial_year DESC,
                CASE p.project_status
                    WHEN 'Approved by Board' THEN 1
                    WHEN 'Project yet to start' THEN 2
                    WHEN 'Project Under implementation' THEN 3
                    WHEN 'Completed' THEN 4
                    ELSE 5
                END;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching CSR projects:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getUpdateCsrProjectsData(req, res) 
{
    const csrProjectId = req.params.csrProjectId;
    const conn = await pool;
    const request = conn.request();
    request.input("csrProjectId", csrProjectId);

    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        const result = await request.query(`
            SELECT
                *
            FROM
                tbl_csr_projects
                WHERE csr_project_id  = @csrProjectId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateCsrProjects(req, res) 
{    
    const projectID = req.body.csrProjectId;
    // A refused save removes the PDF uploaded for it, unless a project uses it (QC CSR-19)
    const refuse = async (status, error) => {
        await discardUnusedUpload(req.body.uniqueFileName, req.user.userId);
        return res.status(status).json({ error });
    };
    if (!(await canAccessProject(req.user, projectID))) return refuse(404, "CSR project not found");
    // Checked against the saved project, so a rule applies to what the user changed (QC R-03 / R-11)
    const saved = await savedProject(projectID);
    if (!saved) return refuse(404, "CSR project not found");
    const invalid = projectError(req.body, { current: saved });
    if (invalid) return refuse(400, invalid);
    const csrfocus = req.body.csrfocus;
    const nameofproject = req.body.nameofproject;
    const projectReceived = req.body.projectReceived;
    const impactproject = req.body.impactproject;
    const targetbeneficiaries = req.body.targetbeneficiaries;
    const projectvalue = req.body.projectvalue;
    const projectstatus = req.body.projectstatus;
    const financialYear = req.body.financialYear;
    let commencedon = req.body.commencedon;
    let completedon = req.body.completedon;
    const finiancialprogresssofar = req.body.finiancialprogresssofar;
    const physicalprogresssofar = req.body.physicalprogresssofar;
    const remarksoftheproject = req.body.remarksoftheproject;
    const userID = req.user.userId;
    // Sent by the form on every save, also when empty (then the last row is removed: QC CSR-21)
    const expenditures = Array.isArray(req.body.expenditures) ? req.body.expenditures : null;

    // Handle null or empty values
    if (!commencedon || commencedon === "") {
        commencedon = null;
    }
    if (!completedon || completedon === "") {
        completedon = null;
    }
    const conn = await pool;
    const currentDocument = saved.row.project_completion_doc || null;
    const document = await documentForSave(req.body.uniqueFileName, userID, currentDocument);
    if (document.error) return res.status(400).json({ error: document.error });
    const uniqueFileName = document.name;

    // The project and its expenditure rows are saved together or not at all (QC CSR-08)
    const transaction = new mssql.Transaction(conn);
    const request = transaction.request();

    // Set SQL parameters
    request.input("projectID", projectID);
    request.input("csrfocus", csrfocus);
    request.input("nameofproject", nameofproject);
    request.input("projectReceived", projectReceived);
    request.input("impactproject", impactproject);
    request.input("targetbeneficiaries", targetbeneficiaries);
    request.input("projectvalue", projectvalue);
    request.input("projectstatus", projectstatus);
    request.input("financialYear", financialYear);    
    request.input("commencedon", commencedon);
    request.input("completedon", completedon);
    request.input("finiancialprogresssofar", finiancialprogresssofar);
    request.input("physicalprogresssofar", physicalprogresssofar);
    request.input("remarksoftheproject", remarksoftheproject);
    request.input("userID", userID);
    request.input("uniqueFileName", uniqueFileName);

    try {
        await transaction.begin();
        await request.query(`
            UPDATE tbl_csr_projects
            SET
                csr_focus = @csrfocus,
                project_name = @nameofproject,
                project_received_from = @projectReceived,
                impact_possible_outcome = @impactproject,
                target_beneficiaries = @targetbeneficiaries,
                project_value = @projectvalue,
                project_status = @projectstatus,
                financial_year = @financialYear,
                commenced_on = @commencedon,
                completed_on = @completedon,
                financial_progress = @finiancialprogresssofar,
                physical_progress = @physicalprogresssofar,
                remarks = @remarksoftheproject,
                project_completion_doc = @uniqueFileName,
                updated_by = @userID,
                updated_date = getDate()
            
            WHERE csr_project_id = @projectID
        `);

        // Expenditure is matched by year (QC CSR-11 / CSR-36): a year whose amount changed is
        // updated in place (its creator is kept and updated_by / updated_date are set), a new
        // year is added, and a year no longer on the form is removed and logged in
        // tbl_csr_delete_log (sql/csr/03; skipped until that table exists). An extra row for a
        // year that already has one (old data) is removed the same way.
        if (expenditures) {
            const rows = expenditures.map((e) => ({ year: String(e.expenditureFinancialYear), cost: Number(e.expenditureCost) }));
            const expenditureRequest = transaction.request();
            expenditureRequest.input("projectID", projectID);
            expenditureRequest.input("userID", userID);
            expenditureRequest.input("rows", JSON.stringify(rows));
            await expenditureRequest.query(`
                SELECT [year], cost INTO #wanted
                FROM OPENJSON(@rows) WITH ([year] NVARCHAR(20) '$.year', cost DECIMAL(12,2) '$.cost');

                SELECT e.csr_expenditure_id INTO #gone
                FROM tbl_csr_expenditure e
                WHERE e.csr_project_id = @projectID
                  AND (NOT EXISTS (SELECT 1 FROM #wanted w WHERE w.[year] = e.[year])
                       OR e.csr_expenditure_id <> (SELECT MIN(k.csr_expenditure_id) FROM tbl_csr_expenditure k
                                                   WHERE k.csr_project_id = e.csr_project_id AND k.[year] = e.[year]));

                IF OBJECT_ID('dbo.tbl_csr_delete_log', 'U') IS NOT NULL
                    INSERT INTO tbl_csr_delete_log (entity, record_id, csr_project_id, organisation_id, row_json, deleted_by)
                    SELECT 'expenditure', e.csr_expenditure_id, e.csr_project_id, p.organisation_id,
                           (SELECT e.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES), @userID
                    FROM tbl_csr_expenditure e
                    JOIN #gone g ON g.csr_expenditure_id = e.csr_expenditure_id
                    JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id;

                DELETE e FROM tbl_csr_expenditure e JOIN #gone g ON g.csr_expenditure_id = e.csr_expenditure_id;

                UPDATE e SET csr_expenditure_cost = w.cost, updated_by = @userID, updated_date = GETDATE()
                FROM tbl_csr_expenditure e JOIN #wanted w ON w.[year] = e.[year]
                WHERE e.csr_project_id = @projectID AND ISNULL(e.csr_expenditure_cost, -1) <> w.cost;

                INSERT INTO tbl_csr_expenditure (csr_project_id, [year], csr_expenditure_cost, created_by, created_date)
                SELECT @projectID, w.[year], w.cost, @userID, GETDATE()
                FROM #wanted w
                WHERE NOT EXISTS (SELECT 1 FROM tbl_csr_expenditure e WHERE e.csr_project_id = @projectID AND e.[year] = w.[year]);

                DROP TABLE #wanted; DROP TABLE #gone;
            `);
        }

        // A replaced or removed completion document is logged with the save (QC CSR-36)
        if (currentDocument && currentDocument !== uniqueFileName) {
            await transaction.request()
                .input('projectID', projectID).input('userID', userID)
                .input('rowJson', JSON.stringify({ csr_project_id: Number(projectID), project_completion_doc: currentDocument, replaced_by: uniqueFileName }))
                .query(`IF OBJECT_ID('dbo.tbl_csr_delete_log', 'U') IS NOT NULL
                    INSERT INTO tbl_csr_delete_log (entity, record_id, csr_project_id, organisation_id, row_json, deleted_by)
                    SELECT 'completion_document', csr_project_id, csr_project_id, organisation_id, @rowJson, @userID
                    FROM tbl_csr_projects WHERE csr_project_id = @projectID`);
        }

        await transaction.commit();
    }catch (err) {
        console.error(err);
        await transaction.rollback().catch(() => {});
        if (document.isNew) removeUploads([document.name]); // the PDF uploaded for this save
        return res.status(500).json({ error: "The project could not be saved." });
    }
    res.sendStatus(200);

    // After the reply: the replaced document's file is no longer used, so remove it. Kept apart
    // from the save, so a problem here can't report a saved project as failed (QC R-07 / CSR-19)
    if (currentDocument && currentDocument !== uniqueFileName) {
        try {
            if (!(await projectForCsrFile(currentDocument))) removeUploads([currentDocument]);
        } catch (err) {
            console.error('CSR: could not remove the replaced completion document', err);
        }
    }
}

// ----------------------------------------------------- Edit Expenditure  ------------------------------------------------------
// Expenditure is saved with the project (create/update), where it is validated; the separate
// unvalidated /add-csr-expenditure endpoint was removed (QC CSR-16 follow-up).
async function getCsrExpenditureCost(req, res) 
{
    const csrProjectId = req.params.csrProjectId;
    // const year = req.params.financialYear;

    const conn = await pool;
    const request = conn.request();
    request.input("csrProjectId", csrProjectId);
    // request.input("year",year)

    let result;
    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
            result = await request.query(`SELECT * FROM tbl_csr_expenditure
                WHERE tbl_csr_expenditure.csr_project_id = @csrProjectId ORDER BY year;`);
        
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCsrFileUploadDocument(req,res) {
    const csrProjectId = req.params.csrProjectId;

    if (!csrProjectId || isNaN(csrProjectId)) {
        return res.status(400).json({ error: "Invalid or missing CSR Project ID" });
    }
    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        const conn = await pool;
        const request = conn.request();
        request.input("csrProjectId", csrProjectId);

        let result = await request.query(`
            SELECT * FROM tbl_csr_image WHERE csr_project_id = @csrProjectId ;`);
            if (result.recordset.length === 0) {
                return res.status(200).json([]); 
            } else {
                return res.status(200).json(result.recordset); 
            }
    } catch (error) {
        return res.status(500).json({error: "Internal server error" });
    }    
}


// Gallery upload for a saved project. The route checks the project is the user's (projectAccess)
// before any file is written (QC CSR-19); a file whose content isn't the photo / video its name
// says is refused, and on any failure the files of this upload are removed.
async function uploadMediaGalleryFile(req,res) {
    const csrProjectId = req.params.csrProjectId;
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }
        if (req.files.some((file) => !hasSignature(file.path))) {
            removeUploads(req.files);
            return res.status(400).json({ error: 'A file is not a valid JPG, PNG, WebP photo or MP4 video.' });
        }

        const conn = await pool;
        const transaction = new mssql.Transaction(conn);
        await transaction.begin();
        try {
            for (const file of req.files) {
                await transaction.request()
                    .input('csrProjectId', csrProjectId)
                    .input('documentName', file.filename)
                    .input('documentType', file.mimetype.split('/')[0])
                    .input('userID', req.user.userId)
                    // created_date has a default; created_by is set once sql/csr/03 has added the
                    // column (QC CSR-11) - until then the insert works as before
                    .query(`INSERT INTO tbl_csr_image (csr_project_id, document_name, document_type)
                        VALUES (@csrProjectId, @documentName, @documentType);
                        DECLARE @newId INT = SCOPE_IDENTITY();
                        IF COL_LENGTH('dbo.tbl_csr_image', 'created_by') IS NOT NULL
                            EXEC sp_executesql N'UPDATE tbl_csr_image SET created_by = @u WHERE document_id = @id',
                                N'@u INT, @id INT', @u = @userID, @id = @newId;`);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback().catch(() => {});
            throw err;
        }

        return res.status(200).json({
            message: 'Files uploaded successfully',
            filenames: req.files.map((file) => file.filename),
            status:200
        });
    } catch (err) {
        console.error(err);
        removeUploads(req.files);
        res.status(500).json({ error: 'The files could not be saved.' });
    }
}

// CSR data is entered by the organisations themselves (any organisation login, as in 2.0 and as
// the business owner confirmed on 06-Nov - QC R-14), each for its own organisation, as far as
// their CSR create / update rights allow (checked before this). Ministry users, including
// superadmin, only view (QC CSR-18 / CSR-34 / R-08), so nobody saves data for another organisation.
function organisationWriter(req, res, next) {
    const scope = csrScope(req.user);
    if (String(req.user?.dataScopeCode || '').toUpperCase() === 'ORGANISATION' && scope.orgId) return next();
    return res.status(403).json({ error: 'CSR data is added and changed by the organisations. You can view it.' });
}

// Route check before a gallery upload: the project in the URL must be one the user can see
function projectAccess(req, res, next) {
    canAccessProject(req.user, req.params.csrProjectId)
        .then((ok) => (ok ? next() : res.status(404).json({ error: 'CSR project not found' })))
        .catch((err) => { console.error(err); res.sendStatus(500); });
}

// ----------------------------------------------------- CSR Fund detail ---------------------------------------------------------
async function addCsrFundDetails(req, res)
{
    if (csrScope(req.user).blocked) {
        return res.status(403).json({ error: "Your account is not linked to an organisation." });
    }
    const invalid = fundError(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const organisationID = organisationForSave(req.user);
    const financialYear = req.body.financialYear;
    const netProfit = req.body.netProfit;
    const csrFundAllotedForYear = req.body.csrFundAllotedForYear;
    const openingBalanceCSR = req.body.openingBalanceCSR;   
    const userID = req.user.userId;
   
    const conn = await pool;
    try {
        const request = conn.request();

        // Bind input parameters for the main CSR project
        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("netProfit", netProfit);
        request.input("csrFundAllotedForYear", csrFundAllotedForYear);
        request.input("openingBalanceCSR", openingBalanceCSR);
        request.input("userID", userID);

        // One fund entry per organisation and year (QC CSR-12 / CSR-42)
        const duplicate = await request.query(`SELECT 1 AS found FROM tbl_csr_fund
            WHERE organisation_id = @organisationID AND financial_year = @financialYear`);
        if (duplicate.recordset.length) {
            return res.status(409).json({ error: `Fund details for ${financialYear} already exist. Edit that entry instead.` });
        }

        const result = await request.query(`
            INSERT INTO tbl_csr_fund (
                organisation_id, financial_year, net_profit, csr_fund_alloted_year, opening_balance_csr, created_by, created_date
            )
            OUTPUT INSERTED.csr_fund_id
            VALUES (
                @organisationID, @financialYear, @netProfit, @csrFundAllotedForYear, @openingBalanceCSR, @userID, GETDATE()
            );
        `);

        const csrFundId = result.recordset[0].csr_fund_id;

        // Send success response
        res.status(200).json({
            message: 'CSR fund details added',
            csr_fund_id: csrFundId,
            status: 200
        });

    } catch (err) {
        console.error("Error adding CSR fund details:", err);
        res.status(500).json({ error: "The fund details could not be saved." });
    }
}

async function getCsrFundList(req, res) {
    const scope = csrScope(req.user);
    if (scope.blocked) return res.json([]);
    try {
        const request = (await pool).request();
        // One query for Ministry and organisation users; the same fields for both (QC CSR-26)
        let orgSql = '';
        if (scope.orgId) {
            request.input("organisationID", scope.orgId);
            orgSql = 'WHERE f.organisation_id = @organisationID';
        }
        // Spending is totalled once per organisation and year, then joined to the fund rows,
        // instead of joining every fund row to every expenditure row of that year (QC CSR-25)
        const result = await request.query(`
            WITH spent AS (
                SELECT p.organisation_id, e.[year] AS financial_year, SUM(e.csr_expenditure_cost) AS amount
                FROM tbl_csr_expenditure e
                JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
                ${scope.orgId ? 'WHERE p.organisation_id = @organisationID' : ''}
                GROUP BY p.organisation_id, e.[year]
            )
            SELECT
                f.csr_fund_id, f.organisation_id, o.organisation_name, f.financial_year,
                f.net_profit, f.opening_balance_csr, f.csr_fund_alloted_year,
                ROUND(ISNULL(s.amount, 0), 2) AS project_expenditure,
                f.updated_date,
                -- closing balance of the year: opening + allotted - spent
                ROUND(f.opening_balance_csr + f.csr_fund_alloted_year - ISNULL(s.amount, 0), 2) AS csr_fund_balance
            FROM tbl_csr_fund f
            JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
            LEFT JOIN spent s ON s.organisation_id = f.organisation_id AND s.financial_year = f.financial_year
            ${orgSql}
            ORDER BY f.financial_year DESC, o.organisation_name;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching CSR Fund:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getUpdateFundData(req, res) 
{

    const csrFundId = req.params.csrFundId;
    const conn = await pool;
    const request = conn.request();
    request.input("csrFundId", csrFundId);

    try {
        if (!(await canAccessFund(req.user, csrFundId))) {
            return res.status(404).json({ error: "CSR fund record not found" });
        }
        const result = await request.query(`
        SELECT csr_fund_id, organisation_id, financial_year, net_profit, csr_fund_alloted_year,
        opening_balance_csr 
        FROM tbl_csr_fund
        WHERE csr_fund_id  = @csrFundId
            
    `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editCsrFund(req,res)
{
const invalid = fundError(req.body);
if (invalid) return res.status(400).json({ error: invalid });

const csrFundId = req.body.csrFundId;
const financialYear = req.body.financialYear;
const netProfit = req.body.netProfit;
const csrFundAllotedForYear = req.body.csrFundAllotedForYear;
const openingBalanceCSR = req.body.openingBalanceCSR;   
const userID = req.user.userId;

const conn = await pool;
const request = conn.request();
request.input("csrFundId", csrFundId);
request.input("financialYear", financialYear);
request.input("netProfit", netProfit);
request.input("csrFundAllotedForYear", csrFundAllotedForYear);
request.input("openingBalanceCSR", openingBalanceCSR);
request.input("userID", userID);

try {
    if (!(await canAccessFund(req.user, csrFundId))) {
        return res.status(404).json({ error: "CSR fund record not found" });
    }
    // Moving an entry to a year its organisation already has would duplicate that year
    const duplicate = await request.query(`SELECT 1 AS found FROM tbl_csr_fund other
        JOIN tbl_csr_fund this ON this.csr_fund_id = @csrFundId AND other.organisation_id = this.organisation_id
        WHERE other.financial_year = @financialYear AND other.csr_fund_id <> @csrFundId`);
    if (duplicate.recordset.length) {
        return res.status(409).json({ error: `Fund details for ${financialYear} already exist. Edit that entry instead.` });
    }
    await request.query(`
        UPDATE tbl_csr_fund  SET financial_year = @financialYear, net_profit = @netProfit, csr_fund_alloted_year = @csrFundAllotedForYear,
            opening_balance_csr = @openingBalanceCSR, updated_by = @userID, updated_date = GETDATE()
            WHERE csr_fund_id = @csrFundId

    `);
    
        
        res.sendStatus(200);
}catch (err) {
    console.error(err);
    return res.status(500).json({ error: "The fund details could not be saved." });
}
}


async function csrProjectsAbstractReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const scope = csrScope(req.user);
        const organisation_id = scope.orgId; // null for a blocked user, which matches no organisation

        let result;

        if (!scope.orgId && !scope.blocked) {
        result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
            org.organisation_id AS [organisationID],
            org.organisation_name AS [Organisation Name],
            SUM(CASE WHEN ac.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS [Approved by Board],
            SUM(CASE WHEN ac.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS [Project yet to Start],
            SUM(CASE WHEN ac.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS [Project Under implementation],
            SUM(CASE WHEN ac.project_status = 'Completed' THEN 1 ELSE 0 END) AS [Completed],
            SUM(CASE WHEN ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed') THEN 1 ELSE 0 END) AS [Total Number of CSR Projects till date]
        FROM
            mmt_organisation org
        LEFT JOIN
            tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
        GROUP BY
            org.organisation_id, org.organisation_name
        ORDER BY
            org.organisation_id;
        `);
        }else{
            request.input("organisation_id", organisation_id);
            result = await request.query(`
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisationID],
                    org.organisation_name AS [Organisation Name],
                    SUM(CASE WHEN ac.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS [Approved by Board],
                    SUM(CASE WHEN ac.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS [Project yet to Start],
                    SUM(CASE WHEN ac.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS [Project Under implementation],
                    SUM(CASE WHEN ac.project_status = 'Completed' THEN 1 ELSE 0 END) AS [Completed],
                    SUM(CASE WHEN ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed') THEN 1 ELSE 0 END) AS [Total Number of CSR Projects till date]
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
                WHERE
                    org.organisation_id = @organisation_id
                GROUP BY
                    org.organisation_id, org.organisation_name
                ORDER BY
                    org.organisation_id;
                `);
        }

        const rowData = result.recordset || [];

        let columnDefs = [
            {
                headerName: "S.No",
                field: "S No",
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 455,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Total Number of CSR Projects till date",
                field: "Total Number of CSR Projects till date",
                width: 490,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Current Stage",
                headerClass: "headercenter",
                cellStyle: { textAlign: 'center' },
                children: [
                    {
                        headerName: "Approved by Board",
                        field: "Approved by Board",
                        width: 260,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Project yet to Start",
                        field: "Project yet to Start",
                        width: 280,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Project Under implementation",
                        field: "Project Under implementation",
                        width: 280,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Completed",
                        field: "Completed",
                        width: 260,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    }
                ]
            }
        ];
        return res.json({ columnDefs, rowData });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function csrProjectsDetailedReport(req,res) {
    try {

        const organisationID = req.params.organisationID;
        const OrganisationName = req.params.OrganisationName;
        const statusText = req.query.status;

        const conn = await pool;
        const request = conn.request();

        // Organisation users only get their own organisation, whatever the URL names
        const scope = csrScope(req.user);
        request.input("organisationID", scope.orgId || scope.blocked ? scope.orgId : organisationID);
        request.input("OrganisationName", OrganisationName);

        let statusCondition = '';
        if (statusText) {
            switch (statusText) {
                case 'ApprovedbyBoard':
                    statusCondition = ` AND ac.project_status = 'Approved by Board'`;
                    break;
                case 'ProjectyettoStart':
                    statusCondition = ` AND ac.project_status = 'Project yet to Start'`;
                    break;
                case 'ProjectUnderImplementation':
                    statusCondition = ` AND ac.project_status = 'Project Under implementation'`;
                    break;
                case 'Completed':
                    statusCondition = ` AND ac.project_status = 'Completed'`;
                    break;
                default:
                    break;
            }
        }

        const query = `
            SELECT
                ROW_NUMBER() OVER (ORDER BY ac.csr_project_id) AS [S No],
                org.organisation_id AS [Organisation ID],
                org.organisation_name AS [Organisation Name],
                ac.csr_focus AS [CSR Focus],
                ac.project_name AS [Project Name],
                ac.project_received_from AS [Project Received From],
                ac.impact_possible_outcome AS [Impact Possible Outcome],
                ac.target_beneficiaries AS [Target Beneficiaries],
                ac.project_value AS [Project Value],
                ac.financial_year AS [Financial Year],
                ac.commenced_on AS [Commenced On],
                ac.completed_on AS [Completed On],
                ac.financial_progress AS [Financial Progress],
                ac.physical_progress AS [Physical Progress]
            FROM
                mmt_organisation org
            LEFT JOIN
                tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
            WHERE
                org.organisation_id = @organisationID ${statusCondition}
            ORDER BY
                ac.csr_project_id;
        `;

        const result = await request.query(query);
        const rowData = result.recordset || [];

        let columnDefs = [
            {
                headerName: "S. No",
                field: "S No",
                width:180,
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 280,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR Focus",
                field: "CSR Focus",
                width:180,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Name",
                field: "Project Name",
                width:350,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Received From",
                field: "Project Received From",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Impact Possible Outcome",
                field: "Impact Possible Outcome",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Target Beneficiaries",
                field: "Target Beneficiaries",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Value",
                field: "Project Value",
                width:180,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Year",
                field: "Financial Year",
                width:200,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Commenced On",
                field: "Commenced On",
                width:245,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Completed On",
                field: "Completed On",
                width:240,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Progress",
                field: "Financial Progress",
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Physical Progress",
                field: "Physical Progress",
                cellStyle: { textAlign: 'center' },
            },
        ];
        return res.json({ columnDefs, rowData });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getCurrentFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    return today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};


async function csrExpenditureReport(req,res) {
    try {

        const conn = await pool;
        const request = conn.request();

        let financialYear = req.query.financialYear;
        if (financialYear && financialYear !== 'all') {
            request.input("financialYear", financialYear);
        } else {
            financialYear = null;
            request.input("financialYear", null);
        }

        const scope = csrScope(req.user);
        const organisation_id = scope.orgId; // null for a blocked user, which matches no organisation

        let result;
        if (!scope.orgId && !scope.blocked) {
        result = await request.query(`
          WITH ProjectExpenditure AS (
            SELECT 
                p.organisation_id,
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [tbl_csr_expenditure] e
            JOIN 
                [tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],
                ROUND(COALESCE(SUM(pe.total_expenditure), 0), 2) AS [Project Expenditure],
                ROUND(
                    (fund.opening_balance_csr + fund.csr_fund_alloted_year) - 
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [CSR Fund Balance],
                ROW_NUMBER() OVER (PARTITION BY org.organisation_id ORDER BY fund.financial_year DESC) AS rn
            FROM
                mmt_organisation org
            JOIN
                [tbl_csr_fund] fund
                ON org.organisation_id = fund.organisation_id
            LEFT JOIN 
                ProjectExpenditure pe
                ON pe.organisation_id = fund.organisation_id  
                AND pe.financial_year = fund.financial_year  
            WHERE 
                (@financialYear IS NULL OR fund.financial_year = @financialYear)
            GROUP BY
                org.organisation_id,
                org.organisation_name,
                fund.financial_year,
                fund.csr_fund_alloted_year,
                fund.opening_balance_csr
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY organisationID) AS [S No], 
            organisationID, 
            [Organisation Name], 
            [Financial Year], 
            [CSR Fund Allotted Year], 
            [Project Expenditure], 
            [CSR Fund Balance]
        FROM CTE
        ORDER BY organisationID;
         `);
     
        }else {
            request.input("organisationID", organisation_id);
            result = await request.query(
                `WITH ProjectExpenditure AS (
            SELECT 
                p.organisation_id,
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [tbl_csr_expenditure] e
            JOIN 
                [tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],
                ROUND(COALESCE(SUM(pe.total_expenditure), 0), 2) AS [Project Expenditure],
                ROUND(
                    (fund.opening_balance_csr + fund.csr_fund_alloted_year) - 
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [CSR Fund Balance],
                ROW_NUMBER() OVER (PARTITION BY org.organisation_id ORDER BY fund.financial_year DESC) AS rn
            FROM
                mmt_organisation org
            JOIN
                [tbl_csr_fund] fund
                ON org.organisation_id = fund.organisation_id
            LEFT JOIN 
                ProjectExpenditure pe
                ON pe.organisation_id = fund.organisation_id  
                AND pe.financial_year = fund.financial_year  
            WHERE 
                (@financialYear IS NULL OR fund.financial_year = @financialYear) AND org.organisation_id = @organisationID
            GROUP BY
                org.organisation_id,
                org.organisation_name,
                fund.financial_year,
                fund.csr_fund_alloted_year,
                fund.opening_balance_csr
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY organisationID) AS [S No], 
            organisationID, 
            [Organisation Name], 
            [Financial Year], 
            [CSR Fund Allotted Year], 
            [Project Expenditure], 
            [CSR Fund Balance]
        FROM CTE
        ORDER BY organisationID;
                   `);
        };

        const rowData = result.recordset || [];
        
        let columnDefs = [
            {
                headerName: "S. No",
                field: "S No",
                width:200,
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 280,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Year",
                field: "Financial Year",
                width:200,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR fund Allotted for the year (Rs.In lakhs)",
                field: "CSR Fund Allotted Year",
                width:400,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Expenditure (Rs.In lakhs) ",
                field: "Project Expenditure",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR Fund Balance (Rs.In lakhs)",
                field: "CSR Fund Balance",
                width:400,
                cellStyle: { textAlign: 'center' },
            },
            
        ];
        return res.json({ columnDefs, rowData });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}





// Dashboard: everything in one call, for the filters (cluster, organisation, financial year,
// focus area). Amounts are lakh, as stored; the page shows crore.
// - Projects (KPIs, status table, organisation-wise table, focus area chart) follow all four filters; the year is the
//   project's financial year.
// - Funds have no focus area, so the fund figures follow cluster, organisation and year only.
//   Expenditure is what the organisation's projects booked in a year it has a fund entry for (as
//   Fund Details and the fund reports); spending in a year with no fund entry is returned apart
//   as unfundedExpenditure. Balance is each organisation's latest year in the filter:
//   opening + allotted - expenditure (QC CSR-13 / CSR-14). For all years the opening balance is
//   each organisation's first year.
// - Expenditure (KPI) is the expenditure booked in the selected year on the filtered projects.
// - The year-on-year trend ignores the year filter (it compares years).
// A cluster is a group of organisation categories, as on the CAPEX dashboard.
// One entry per organisation: its projects and value, in total and per status (most projects first)
function organisationsByStatus(rows, n) {
  const byOrg = new Map();
  rows.forEach((r) => {
    if (!byOrg.has(r.organisation_id)) {
      byOrg.set(r.organisation_id, { organisationId: r.organisation_id, organisationName: r.organisation_name,
        isMajorPort: r.organisation_category_id === 1, projects: 0, projectValue: 0, statuses: {} });
    }
    const org = byOrg.get(r.organisation_id);
    org.statuses[r.status] = { projects: n(r.projects), projectValue: n(r.project_value) };
    org.projects += n(r.projects);
    org.projectValue += n(r.project_value);
  });
  return [...byOrg.values()].sort((a, b) => b.projects - a.projects || a.organisationName.localeCompare(b.organisationName));
}

// One entry per focus area (0 when the project has none): its projects and value, in total and
// per status (most projects first)
function focusAreasByStatus(rows, n) {
  const byFocus = new Map();
  rows.forEach((r) => {
    if (!byFocus.has(r.focus_id)) {
      byFocus.set(r.focus_id, { focusId: r.focus_id, focusName: r.focus_name, projects: 0, projectValue: 0, statuses: {} });
    }
    const focus = byFocus.get(r.focus_id);
    focus.statuses[r.status] = { projects: n(r.projects), projectValue: n(r.project_value) };
    focus.projects += n(r.projects);
    focus.projectValue += n(r.project_value);
  });
  return [...byFocus.values()].sort((a, b) => b.projects - a.projects || a.focusName.localeCompare(b.focusName));
}

async function getCsrDashboard(req, res) {
  try {
    const scope = csrScope(req.user);
    const orgId = scope.orgId || (scope.blocked ? -1 : (parseInt(req.query.organisationId, 10) || 0));
    const group = ORG_GROUPS.find((g) => g.id === (parseInt(req.query.clusterId, 10) || 0));
    const clusterSql = scope.orgId || !group ? '1 = 1' : group.sql;
    const fy = req.query.fy && req.query.fy !== 'all' ? String(req.query.fy) : null;
    const focusId = parseInt(req.query.focusId, 10) || 0;

    const request = (await pool).request();
    request.input('orgId', orgId);
    request.input('fy', fy);
    request.input('focusId', focusId);

    // Organisations in the filter: o is mmt_organisation, X the row's organisation column
    const inOrgs = (col) => `(@orgId = 0 OR ${col} = @orgId) AND ${clusterSql}`;
    const result = await request.query(`
      ;WITH Projects AS (
        SELECT p.csr_project_id, p.organisation_id, p.project_value, p.project_status
        FROM tbl_csr_projects p
        INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
        WHERE ${inOrgs('p.organisation_id')}
          AND (@fy IS NULL OR p.financial_year = @fy)
          AND (@focusId = 0 OR p.csr_focus = @focusId)
      )
      SELECT
        COUNT(*) AS projects,
        SUM(project_value) AS project_value,
        SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS under_implementation,
        SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM Projects;

      -- Expenditure booked in the year on the filtered projects (any project year)
      SELECT SUM(e.csr_expenditure_cost) AS expenditure
      FROM tbl_csr_expenditure e
      INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      WHERE ${inOrgs('p.organisation_id')}
        AND (@focusId = 0 OR p.csr_focus = @focusId)
        AND (@fy IS NULL OR e.year = @fy);

      -- Fund summary (no focus filter: funds have no focus area)
      ;WITH Funds AS (
        SELECT f.organisation_id, f.financial_year, f.net_profit, f.opening_balance_csr, f.csr_fund_alloted_year,
          ISNULL(spent.expenditure, 0) AS expenditure,
          ROW_NUMBER() OVER (PARTITION BY f.organisation_id ORDER BY f.financial_year) AS year_order,
          ROW_NUMBER() OVER (PARTITION BY f.organisation_id ORDER BY f.financial_year DESC) AS latest_order
        FROM tbl_csr_fund f
        INNER JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
        OUTER APPLY (SELECT SUM(e.csr_expenditure_cost) AS expenditure
          FROM tbl_csr_expenditure e
          INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
          WHERE p.organisation_id = f.organisation_id AND e.year = f.financial_year) spent
        WHERE ${inOrgs('f.organisation_id')}
          AND (@fy IS NULL OR f.financial_year = @fy)
      )
      SELECT
        SUM(net_profit) AS net_profit,
        SUM(CASE WHEN year_order = 1 THEN opening_balance_csr ELSE 0 END) AS opening_balance,
        SUM(csr_fund_alloted_year) AS allotted,
        SUM(expenditure) AS expenditure,
        SUM(CASE WHEN latest_order = 1 THEN ISNULL(opening_balance_csr, 0) + ISNULL(csr_fund_alloted_year, 0) - expenditure ELSE 0 END) AS balance,
        (SELECT SUM(e.csr_expenditure_cost)
           FROM tbl_csr_expenditure e
           INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
           INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
           WHERE ${inOrgs('p.organisation_id')}
             AND (@fy IS NULL OR e.year = @fy)
             AND NOT EXISTS (SELECT 1 FROM tbl_csr_fund f2
               WHERE f2.organisation_id = p.organisation_id AND f2.financial_year = e.year)) AS unfunded_expenditure,
        (SELECT SUM(p.project_value)
           FROM tbl_csr_projects p
           INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
           WHERE ${inOrgs('p.organisation_id')}
             AND (@fy IS NULL OR p.financial_year = @fy)) AS project_value
      FROM Funds;

      -- Projects by status
      SELECT ISNULL(p.project_status, 'Not set') AS status, COUNT(*) AS projects, SUM(p.project_value) AS project_value
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      WHERE ${inOrgs('p.organisation_id')}
        AND (@fy IS NULL OR p.financial_year = @fy)
        AND (@focusId = 0 OR p.csr_focus = @focusId)
      GROUP BY p.project_status;

      -- Projects by organisation and status (count and value), for the stage-wise table
      SELECT o.organisation_id, o.organisation_name, o.organisation_category_id,
        ISNULL(p.project_status, 'Not set') AS status, COUNT(*) AS projects, SUM(p.project_value) AS project_value
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      WHERE ${inOrgs('p.organisation_id')}
        AND (@fy IS NULL OR p.financial_year = @fy)
        AND (@focusId = 0 OR p.csr_focus = @focusId)
      GROUP BY o.organisation_id, o.organisation_name, o.organisation_category_id, p.project_status;

      -- Projects by focus area and status (count and value), for the focus area chart
      SELECT ISNULL(p.csr_focus, 0) AS focus_id, ISNULL(fa.focus_name, 'Focus area not set') AS focus_name,
        ISNULL(p.project_status, 'Not set') AS status, COUNT(*) AS projects, SUM(p.project_value) AS project_value
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      LEFT JOIN mmt_csr_focusarea fa ON fa.focus_id = p.csr_focus
      WHERE ${inOrgs('p.organisation_id')}
        AND (@fy IS NULL OR p.financial_year = @fy)
        AND (@focusId = 0 OR p.csr_focus = @focusId)
      GROUP BY ISNULL(p.csr_focus, 0), ISNULL(fa.focus_name, 'Focus area not set'), p.project_status;

      -- Year-on-year: fund allotted and expenditure booked per financial year (every year)
      ;WITH Allotted AS (
        SELECT f.financial_year, SUM(f.csr_fund_alloted_year) AS allotted
        FROM tbl_csr_fund f
        INNER JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
        WHERE ${inOrgs('f.organisation_id')}
        GROUP BY f.financial_year
      ),
      Spent AS (
        SELECT e.year AS financial_year, SUM(e.csr_expenditure_cost) AS expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
        INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
        WHERE ${inOrgs('p.organisation_id')}
          AND (@focusId = 0 OR p.csr_focus = @focusId)
        GROUP BY e.year
      )
      SELECT COALESCE(a.financial_year, s.financial_year) AS financial_year,
        ISNULL(a.allotted, 0) AS allotted, ISNULL(s.expenditure, 0) AS expenditure
      FROM Allotted a
      FULL OUTER JOIN Spent s ON s.financial_year = a.financial_year
      WHERE COALESCE(a.financial_year, s.financial_year) IS NOT NULL
      ORDER BY 1;

      -- Organisation name (organisation view) and the last time any of this data changed
      SELECT
        (SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @orgId) AS organisation_name,
        -- Only the organisations in view (QC CSR-27)
        (SELECT MAX(d) FROM (
           SELECT MAX(ISNULL(p.updated_date, p.created_date)) AS d FROM tbl_csr_projects p
             INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id WHERE ${inOrgs('p.organisation_id')}
           UNION ALL SELECT MAX(ISNULL(f.updated_date, f.created_date)) FROM tbl_csr_fund f
             INNER JOIN mmt_organisation o ON o.organisation_id = f.organisation_id WHERE ${inOrgs('f.organisation_id')}
           UNION ALL SELECT MAX(ISNULL(e.updated_date, e.created_date)) FROM tbl_csr_expenditure e
             INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
             INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id WHERE ${inOrgs('p.organisation_id')}) t) AS last_updated;
    `);

    const [kpi, spent, fund, statuses, byOrganisation, byFocus, trend, meta] = result.recordsets;
    const n = (v) => Number(v) || 0;
    const f = fund[0] || {};
    const fundSummary = {
      netProfit: n(f.net_profit),
      openingBalance: n(f.opening_balance),
      allotted: n(f.allotted),
      projectValue: n(f.project_value),
      expenditure: n(f.expenditure),
      balance: n(f.balance),
      unfundedExpenditure: n(f.unfunded_expenditure),
    };

    return res.json({
      view: scope.orgId ? { level: 'organisation', organisationName: meta[0]?.organisation_name || null } : { level: 'ministry' },
      kpi: {
        fundAllotted: fundSummary.allotted,
        projects: n(kpi[0]?.projects),
        projectValue: n(kpi[0]?.project_value),
        expenditure: n(spent[0]?.expenditure),
        underImplementation: n(kpi[0]?.under_implementation),
        completed: n(kpi[0]?.completed),
      },
      fundSummary,
      statuses: statuses.map((r) => ({ status: r.status, projects: n(r.projects), projectValue: n(r.project_value) })),
      byOrganisation: scope.orgId ? [] : organisationsByStatus(byOrganisation, n),
      byFocusArea: focusAreasByStatus(byFocus, n),
      trend: trend.map((r) => ({ financialYear: r.financial_year, allotted: n(r.allotted), expenditure: n(r.expenditure) })),
      lastUpdated: meta[0]?.last_updated || null,
    });
  } catch (err) {
    console.error('CSR dashboard error:', err);
    return res.sendStatus(500);
  }
}


async function getCsrProjectsFocusWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // organisationId is optional (NULL = all-org MOPSW view). An
    // organisation user must never get that all-org view -- force their
    // own organisation_id instead, same reasoning as Report 1.4.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.6 - CSR Focus/Project Area-wise CSR Projects Summary.
    // "CSR Fund Allotted" doesn't have a direct source here: fund
    // allotment is tracked per organisation+year (tbl_csr_fund), not per
    // focus area -- csr_focus only exists as a field on tbl_csr_projects
    // itself. Using SUM(project_value) per focus area as the closest
    // available match ("value of projects allotted to this focus area"),
    // since there's no other fund figure that can be grouped by focus
    // area at all. Flagging this assumption for confirmation.
    // organisationId scopes the query when provided (for the
    // Organisation-sheet's auto-scoped version of this same report).
    const sqlQuery = `
      SELECT
        csr_focus AS CSR_Focus,
        COUNT(*) AS Total_CSR_Projects,
        SUM(project_value) AS CSR_Fund_Allotted_Lakh,
        SUM(CASE WHEN project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS Approved_By_Board,
        SUM(CASE WHEN project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS Yet_to_Start,
        SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS Under_Implementation,
        SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS Completed
      FROM tbl_csr_projects
      WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
      GROUP BY csr_focus
      ORDER BY csr_focus;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectsOrgWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    const conn = await pool;
    const request = conn.request();

    // Report 1.5 is a cross-organisation summary (one row per org) --
    // MOPSW/ministry-only by design, same reasoning as Reports 1.1/1.2.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.5 - Organisation-wise CSR Projects Summary.
    // One row per organisation with a total project count and the 4
    // stage-wise counts. No fund figures in this report per spec (unlike
    // 1.4 and 1.6, which both include CSR Fund Allotted).
    const sqlQuery = `
      SELECT
        o.organisation_name AS Organisation_Name,
        COUNT(p.csr_project_id) AS Total_CSR_Projects,
        SUM(CASE WHEN p.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS Approved_By_Board,
        SUM(CASE WHEN p.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS Yet_to_Start,
        SUM(CASE WHEN p.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS Under_Implementation,
        SUM(CASE WHEN p.project_status = 'Completed' THEN 1 ELSE 0 END) AS Completed
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
      GROUP BY o.organisation_name
      ORDER BY o.organisation_name;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectsYearWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // organisationId is optional (NULL = all-org MOPSW view). An
    // organisation user must never get that all-org view, even if they
    // pass 'all' or omit orgId -- force their own organisation_id instead.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.4 - Financial Year-wise CSR Projects Summary.
    // Total_CSR_Projects and the 4 stage-wise counts come from
    // tbl_csr_projects grouped by the project's own financial_year.
    // CSR_Fund_Allotted_Lakh is a separate aggregate from tbl_csr_fund
    // for that same year -- the two tables are combined by UNIONing
    // their distinct years, since a year could have fund records with
    // no projects yet, or vice versa.
    // organisationId scopes both sides when provided (used for the
    // Organisation-sheet's auto-scoped version of this same report).
    const sqlQuery = `
      WITH AllYears AS (
        SELECT DISTINCT financial_year FROM tbl_csr_projects
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        UNION
        SELECT DISTINCT financial_year FROM tbl_csr_fund
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
      ),
      ProjectCounts AS (
        SELECT
          financial_year,
          COUNT(*) AS total_projects,
          SUM(CASE WHEN project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS yet_to_start_count,
          SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS under_implementation_count,
          SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
        FROM tbl_csr_projects
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        GROUP BY financial_year
      ),
      FundByYear AS (
        SELECT financial_year, SUM(csr_fund_alloted_year) AS total_allotted
        FROM tbl_csr_fund
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        GROUP BY financial_year
      )
      SELECT
        ay.financial_year AS Financial_Year,
        COALESCE(pc.total_projects, 0) AS Total_CSR_Projects,
        COALESCE(fby.total_allotted, 0) AS CSR_Fund_Allotted_Lakh,
        COALESCE(pc.approved_count, 0) AS Approved_By_Board,
        COALESCE(pc.yet_to_start_count, 0) AS Yet_to_Start,
        COALESCE(pc.under_implementation_count, 0) AS Under_Implementation,
        COALESCE(pc.completed_count, 0) AS Completed
      FROM AllYears ay
      LEFT JOIN ProjectCounts pc ON pc.financial_year = ay.financial_year
      LEFT JOIN FundByYear fby ON fby.financial_year = ay.financial_year
      ORDER BY ay.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundOrgTrendReport(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // Report 1.3 is org-facing (matches Organisation-sheet report 1.1) --
    // an organisation user can request any org via the URL param, so we
    // override whatever was requested with their own organisation_id.
    // MOPSW/ministry roles keep whatever org they explicitly asked for.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    if (!organisationId) {
      // Report 1.3 explicitly requires an organisation to be selected first
      // ("only if the select organisation - report will be generated").
      return res.status(200).json([]);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.3 - Organisation-wise CSR Fund Trend.
    // Same aggregation as Report 1.1, filtered to a single organisation
    // across all its financial years instead of all organisations within
    // one year.
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        WHERE p.organisation_id = @organisationId
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        f.financial_year AS Financial_Year,
        f.opening_balance_csr AS Opening_CSR_Balance_Lakh,
        f.csr_fund_alloted_year AS CSR_Fund_Allotted_Lakh,
        COALESCE(eby.total_expenditure, 0) AS Project_Expenditure_Lakh,
        (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) - COALESCE(eby.total_expenditure, 0)) AS CSR_Fund_Balance_Lakh,
        -- Utilisation of the funds available that year: opening balance + allotted (QC CSR-45)
        CASE
          WHEN COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) = 0 THEN NULL
          ELSE ROUND((COALESCE(eby.total_expenditure, 0) / (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0))) * 100, 2)
        END AS Utilisation_Percent
      FROM tbl_csr_fund f
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      WHERE f.organisation_id = @organisationId
      ORDER BY f.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundOrgWiseReport(req, res) {
  try {
    const scope = csrScope(req.user);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy : null;

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);

    // Report 1.2 is a cross-organisation summary (one row per org) --
    // MOPSW/ministry-only by design, same reasoning as Report 1.1.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.2 - CSR Fund Organisation Wise Report.
    // One row per organisation, for the selected financial year (the UI
    // defaults this to the current FY, matching the platform's own
    // convention elsewhere). Same expenditure-aggregation logic as
    // Report 1.1, just grouped by organisation instead of by year.
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        o.organisation_name AS Organisation_Name,
        f.organisation_id AS Organisation_Id,
        f.financial_year AS Financial_Year,
        -- 1 on each organisation's latest year in the filter: the total balance adds only these
        CASE WHEN f.latest_order = 1 THEN 1 ELSE 0 END AS Is_Latest_Year,
        f.opening_balance_csr AS Opening_CSR_Balance_Lakh,
        f.csr_fund_alloted_year AS CSR_Fund_Allotted_Lakh,
        COALESCE(eby.total_expenditure, 0) AS Project_Expenditure_Lakh,
        (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) - COALESCE(eby.total_expenditure, 0)) AS CSR_Fund_Balance_Lakh,
        -- Utilisation of the funds available that year: opening balance + allotted (QC CSR-45)
        CASE
          WHEN COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) = 0 THEN NULL
          ELSE ROUND((COALESCE(eby.total_expenditure, 0) / (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0))) * 100, 2)
        END AS Utilisation_Percent
      FROM (SELECT tbl_csr_fund.*,
              ROW_NUMBER() OVER (PARTITION BY organisation_id ORDER BY financial_year DESC) AS latest_order
            FROM tbl_csr_fund
            WHERE (@financialYear IS NULL OR financial_year = @financialYear)) f
      LEFT JOIN mmt_organisation o ON f.organisation_id = o.organisation_id
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      ORDER BY o.organisation_name;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundYearWiseReport(req, res) {
  try {
    const scope = csrScope(req.user);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy : null;

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);

    // Report 1.1 is a cross-organisation summary (No_of_Organisations, sums
    // across every org) -- MOPSW/ministry-only by design, matching the
    // Organisation-sheet numbering where org users only see Reports 1.3/1.4/1.6.
    // Server-side check (not just a frontend restriction) since this report
    // has no organisation filter to scope by at all.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.1 - CSR Fund Year Wise Report.
    // No. of Organisations counts distinct orgs that have a fund record for
    // that year. Project Expenditure sums every project's expenditure rows
    // recorded IN that year (not filtered by when the underlying project was
    // originally approved -- a multi-year project's later-year spending still
    // counts toward that later year's fund utilisation).
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        f.financial_year AS Financial_Year,
        COUNT(DISTINCT f.organisation_id) AS No_of_Organisations,
        SUM(f.csr_fund_alloted_year) AS CSR_Fund_Allotted_Lakh,
        SUM(COALESCE(eby.total_expenditure, 0)) AS Project_Expenditure_Lakh,
        (SUM(f.opening_balance_csr) + SUM(f.csr_fund_alloted_year) - SUM(COALESCE(eby.total_expenditure, 0))) AS CSR_Fund_Balance_Lakh,
        -- Balances of the organisations whose latest year (in the filter) is this one: the report's
        -- total balance adds these, not every year's balance (that counted carried money twice)
        SUM(CASE WHEN f.latest_order = 1
          THEN COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) - COALESCE(eby.total_expenditure, 0)
          ELSE 0 END) AS Latest_Balance_Lakh,
        -- Utilisation of the funds available that year: opening balance + allotted (QC CSR-45)
        CASE
          WHEN SUM(COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0)) = 0 THEN NULL
          ELSE ROUND((SUM(COALESCE(eby.total_expenditure, 0)) / SUM(COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0))) * 100, 2)
        END AS Utilisation_Percent
      FROM (SELECT tbl_csr_fund.*,
              ROW_NUMBER() OVER (PARTITION BY organisation_id ORDER BY financial_year DESC) AS latest_order
            FROM tbl_csr_fund
            WHERE (@financialYear IS NULL OR financial_year = @financialYear)) f
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      GROUP BY f.financial_year
      ORDER BY f.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// A handler that throws outside its own try (e.g. while the database is unreachable) still answers
// with a 500 instead of leaving the request open (QC CSR-06). Only the async request handlers are
// wrapped: upload / fileUpload are multer instances and handleUploadErrors is an error handler.
const answerOnError = (handler) => async (req, res, next) => {
    try {
        await handler(req, res, next);
    } catch (err) {
        console.log(err);
        if (!res.headersSent) res.sendStatus(500);
    }
};
const exported = {organisationWriter, projectAccess, createCsrProjects, upload, fileUpload, handleUploadErrors, getCsrProjectslist,
        getUpdateCsrProjectsData, updateCsrProjects, csrProjectDocumentUploader, csrfileDownload,
        getCsrExpenditureCost,  getCsrFileUploadDocument, uploadMediaGalleryFile, addCsrFundDetails, getCsrFundList, getUpdateFundData,  editCsrFund,csrProjectsAbstractReport,csrProjectsDetailedReport,csrExpenditureReport,getCsrFundYearWiseReport, getCsrFundOrgWiseReport, getCsrFundOrgTrendReport, getCsrProjectsYearWiseSummary, getCsrProjectsOrgWiseSummary, getCsrProjectsFocusWiseSummary,
        getCsrDashboard};
export default Object.fromEntries(Object.entries(exported).map(([name, value]) => [name,
    typeof value === 'function' && value.constructor.name === 'AsyncFunction' ? answerOnError(value) : value]));
