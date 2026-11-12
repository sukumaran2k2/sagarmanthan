import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { applyDataScope } from "../../middleware/dataScope.js";
import { getClam } from '../../utils/clamav.js';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Create Young Professional
async function createYoungProfessional(req, res) {
    const {
        wing_id,
        division_id,
        name,
        qualification,
        role,
        appointment_date,
        salary,
        total_experience,
        skills,
        created_by
    } = req.body;

    if (!wing_id || !division_id || !name) {
        return res.status(400).json({ message: "Wing, Division, and Name are required." });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("wing_id", wing_id);
    request.input("division_id", division_id);
    request.input("name", name);
    request.input("qualification", qualification || null);
    request.input("role", role || null);
    request.input("appointment_date", appointment_date || null);
    request.input("salary", salary !== undefined ? salary : null);
    request.input("total_experience", total_experience !== undefined ? total_experience : null);
    request.input("skills", skills || null);
    request.input("created_by", created_by || 1);

    try {
        const result = await request.query(`
            INSERT INTO dbo.tbl_young_professionals (
                wing_id, division_id, name, qualification, role, 
                appointment_date, salary, total_experience, skills, 
                is_active, created_by, created_date, last_updated_date
            )
            OUTPUT INSERTED.yp_id
            VALUES (
                @wing_id, @division_id, @name, @qualification, @role, 
                @appointment_date, @salary, @total_experience, @skills, 
                1, @created_by, GETDATE(), GETDATE()
            )
        `);

        const insertedYPId = result.recordset[0].yp_id;
        res.status(201).json({ insertedYPId });
    } catch (err) {
        console.error("Error creating Young Professional:", err);
        return res.sendStatus(500);
    }
}

// 2. Get All Young Professionals (Server-Side Pagination, Filtering & Search)
async function getYoungProfessional(req, res) {
    const conn = await pool;
    const request = conn.request();

    const {
        page,
        limit,
        search,
        wing,
        division,
        status,
        all
    } = req.query;

    const isFetchAll = all === 'true' || limit === 'all' || (!page && !limit && !search && !wing && !division && !status);
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNum - 1) * pageSize;

    let baseWhereClauses = [];

    // Search filter
    if (search && search.trim() !== '') {
        request.input('searchTerm', `%${search.trim()}%`);
        baseWhereClauses.push(`(
            yp.name LIKE @searchTerm OR 
            yp.qualification LIKE @searchTerm OR 
            yp.role LIKE @searchTerm OR 
            yp.skills LIKE @searchTerm OR 
            w.wing_name LIKE @searchTerm OR 
            d.division_name LIKE @searchTerm
        )`);
    }

    // Wing filter
    if (wing && wing !== 'All' && wing !== 'all' && wing !== '') {
        if (!isNaN(wing)) {
            request.input('wingId', parseInt(wing));
            baseWhereClauses.push(`yp.wing_id = @wingId`);
        } else {
            request.input('wingName', wing.trim());
            baseWhereClauses.push(`w.wing_name = @wingName`);
        }
    }

    // Division filter
    if (division && division !== 'All' && division !== 'all' && division !== '') {
        if (!isNaN(division)) {
            request.input('divisionId', parseInt(division));
            baseWhereClauses.push(`yp.division_id = @divisionId`);
        } else {
            request.input('divisionName', division.trim());
            baseWhereClauses.push(`d.division_name = @divisionName`);
        }
    }

    // Clone baseWhereClauses for status-filtered query
    let filteredWhereClauses = [...baseWhereClauses];

    // Status filter
    if (status && status !== 'All' && status !== 'all' && status !== '') {
        if (status === 'active' || status === '1' || status === 1) {
            filteredWhereClauses.push(`(yp.is_active = 1 OR yp.is_active IS NULL)`);
        } else if (status === 'relieved' || status === '0' || status === 0) {
            filteredWhereClauses.push(`yp.is_active = 0`);
        }
    }

    const filteredWhereSql = filteredWhereClauses.length > 0 ? `WHERE ${filteredWhereClauses.join(' AND ')}` : '';
    const baseWhereSql = baseWhereClauses.length > 0 ? `WHERE ${baseWhereClauses.join(' AND ')}` : '';

    try {
        if (isFetchAll) {
            const query = `
                SELECT 
                    yp.yp_id,
                    yp.wing_id,
                    w.wing_name AS wing,
                    yp.division_id,
                    d.division_name AS division,
                    yp.name,
                    yp.qualification,
                    yp.role,
                    FORMAT(yp.appointment_date, 'yyyy-MM-dd') AS appointment_date,
                    yp.salary,
                    yp.total_experience,
                    yp.skills,
                    yp.is_active,
                    FORMAT(yp.last_working_date, 'yyyy-MM-dd') AS last_working_date,
                    yp.remarks,
                    yp.relieved_at,
                    yp.appointment_document,
                    FORMAT(yp.created_date, 'dd-MM-yyyy HH:mm') AS created_at,
                    FORMAT(yp.created_date, 'yyyy-MM-dd HH:mm') AS created_date,
                    COALESCE(u.name, CAST(yp.created_by AS VARCHAR), 'Admin') AS created_by,
                    FORMAT(yp.last_updated_date, 'dd-MM-yyyy HH:mm') AS last_updated_at,
                    FORMAT(yp.last_updated_date, 'yyyy-MM-dd HH:mm') AS last_updated_date
                FROM dbo.tbl_young_professionals yp
                LEFT JOIN mmt_wings w ON w.wing_id = yp.wing_id
                LEFT JOIN mmt_division d ON d.division_id = yp.division_id
                LEFT JOIN tbl_user u ON u.user_id = yp.created_by
                ${filteredWhereSql}
                ORDER BY yp.yp_id DESC
            `;
            const result = await request.query(query);
            return res.json(result.recordset);
        }

        request.input('offset', offset);
        request.input('pageSize', pageSize);

        // Fetch counts for status tabs
        const countQuery = `
            SELECT 
                COUNT(*) AS total_base_count,
                SUM(CASE WHEN yp.is_active = 1 OR yp.is_active IS NULL THEN 1 ELSE 0 END) AS active_count,
                SUM(CASE WHEN yp.is_active = 0 THEN 1 ELSE 0 END) AS relieved_count
            FROM dbo.tbl_young_professionals yp
            LEFT JOIN mmt_wings w ON w.wing_id = yp.wing_id
            LEFT JOIN mmt_division d ON d.division_id = yp.division_id
            ${baseWhereSql}
        `;
        const countResult = await request.query(countQuery);
        const activeCount = countResult.recordset[0]?.active_count || 0;
        const relievedCount = countResult.recordset[0]?.relieved_count || 0;

        // Fetch paginated rows with total filtered count
        const query = `
            SELECT 
                yp.yp_id,
                yp.wing_id,
                w.wing_name AS wing,
                yp.division_id,
                d.division_name AS division,
                yp.name,
                yp.qualification,
                yp.role,
                FORMAT(yp.appointment_date, 'yyyy-MM-dd') AS appointment_date,
                yp.salary,
                yp.total_experience,
                yp.skills,
                yp.is_active,
                FORMAT(yp.last_working_date, 'yyyy-MM-dd') AS last_working_date,
                yp.remarks,
                yp.relieved_at,
                yp.appointment_document,
                FORMAT(yp.created_date, 'dd-MM-yyyy HH:mm') AS created_at,
                FORMAT(yp.created_date, 'yyyy-MM-dd HH:mm') AS created_date,
                COALESCE(u.name, CAST(yp.created_by AS VARCHAR), 'Admin') AS created_by,
                FORMAT(yp.last_updated_date, 'dd-MM-yyyy HH:mm') AS last_updated_at,
                FORMAT(yp.last_updated_date, 'yyyy-MM-dd HH:mm') AS last_updated_date,
                COUNT(*) OVER() AS total_count
            FROM dbo.tbl_young_professionals yp
            LEFT JOIN mmt_wings w ON w.wing_id = yp.wing_id
            LEFT JOIN mmt_division d ON d.division_id = yp.division_id
            LEFT JOIN tbl_user u ON u.user_id = yp.created_by
            ${filteredWhereSql}
            ORDER BY yp.yp_id DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;
        `;

        const result = await request.query(query);
        const rows = result.recordset || [];
        const total = rows.length > 0 ? rows[0].total_count : 0;

        res.json({
            data: rows,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize) || 1,
                activeCount,
                relievedCount
            }
        });
    } catch (err) {
        console.error("Error fetching young professionals:", err);
        return res.sendStatus(500);
    }
}

// 3. Update Young Professional
async function updateYoungProfessional(req, res) {
    const ypId = req.params.youngProfessionalId;
    const {
        wing_id,
        division_id,
        name,
        qualification,
        role,
        appointment_date,
        salary,
        total_experience,
        skills,
        is_active,
        last_working_date,
        remarks,
        updated_by
    } = req.body;

    const conn = await pool;
    const request = conn.request();
    request.input("ypId", ypId);
    request.input("wing_id", wing_id);
    request.input("division_id", division_id);
    request.input("name", name);
    request.input("qualification", qualification || null);
    request.input("role", role || null);
    request.input("appointment_date", appointment_date || null);
    request.input("salary", salary !== undefined ? salary : null);
    request.input("total_experience", total_experience !== undefined ? total_experience : null);
    request.input("skills", skills || null);
    request.input("is_active", is_active);
    // request.input("is_active", is_active !== undefined ? is_active : 1);
    request.input("last_working_date", last_working_date || null);
    request.input("remarks", remarks || null);
    request.input("updated_by", updated_by || null);

    try {
        await request.query(`
            UPDATE dbo.tbl_young_professionals
            SET 
                wing_id = @wing_id,
                division_id = @division_id,
                name = @name,
                qualification = @qualification,
                role = @role,
                appointment_date = @appointment_date,
                salary = @salary,
                total_experience = @total_experience,
                skills = @skills,
                -- is_active = @is_active,
                last_working_date = @last_working_date,
                remarks = @remarks,
                updated_by = @updated_by,
                last_updated_date = GETDATE()
            WHERE yp_id = @ypId
        `);
        res.sendStatus(200);
    } catch (err) {
        console.error("Error updating Young Professional:", err);
        return res.sendStatus(500);
    }
}

// 4. Delete Young Professional
async function deleteYoungProfessionalData(req, res) {
    const ypId = req.params.youngProfessionalId;
    const conn = await pool;
    const request = conn.request();
    request.input("ypId", ypId);

    try {
        await request.query(`
            DELETE FROM dbo.tbl_young_professionals 
            WHERE yp_id = @ypId
        `);
        res.sendStatus(200);
    } catch (err) {
        console.error("Error deleting Young Professional:", err);
        return res.sendStatus(500);
    }
}

// 5. Get Young Professional Wing Data
async function getYoungProfessionalWingData(req, res) {
    let wingId = req.params.wingId;
    let divisionId = req.params.divisionId;

    if (wingId === 'null' || wingId === 'undefined') wingId = null;
    if (divisionId === 'null' || divisionId === 'undefined') divisionId = null;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const conn = await pool;
    const request = conn.request();
    request.input('wingId', wingId);
    request.input('divisionId', divisionId);
    request.input('offset', offset);
    request.input('limit', limit);

    try {
        const query = `
            SELECT
                yp.yp_id,
                yp.name,
                yp.qualification,
                yp.total_experience AS experience,
                yp.skills AS skill,
                yp.role,
                yp.salary,
                FORMAT(yp.appointment_date, 'dd-MM-yyyy') AS candidate_date_of_appointment,
                yp.appointment_document AS appointment_order_document,
                yp.is_active,
                COUNT(*) OVER() AS total_count
            FROM dbo.tbl_young_professionals yp
            WHERE (@wingId IS NULL OR yp.wing_id = @wingId)
            AND (@divisionId IS NULL OR yp.division_id = @divisionId)
            ORDER BY yp.wing_id, yp.division_id, yp.yp_id DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `;

        const result = await request.query(query);
        const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;

        res.json({
            data: result.recordset,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error fetching young professional wing data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

// 6. Relieve Young Professional
async function relieveYoungProfessional(req, res) {
    const ypId = req.body.candidateId;
    const lastWorkingDate = req.body.lastWorkingDate;
    const remarks = req.body.remarks;
    const updated_by = req.body.updated_by;

    const conn = await pool;
    const request = conn.request();
    request.input("ypId", ypId);
    request.input("lastWorkingDate", lastWorkingDate);
    request.input("remarks", remarks);
    request.input("updated_by", updated_by || null);

    try {
        await request.query(`
            UPDATE dbo.tbl_young_professionals
            SET
                is_active = 0,
                last_working_date = @lastWorkingDate,
                remarks = @remarks,
                relieved_at = GETDATE(),
                updated_by = @updated_by,
                last_updated_date = GETDATE()
            WHERE yp_id = @ypId
        `);
        res.status(200).json({
            success: true,
            message: "Young Professional relieved successfully"
        });
    } catch (err) {
        console.error("Error relieving Young Professional:", err);
        res.sendStatus(500);
    }
}

// 7. Multer Upload & Document File Download
// Absolute paths so the server works regardless of process.cwd() (e.g. PM2, workspace scripts)
const uploadDestination = path.join(__dirname, '../../../fileuploads/Young_Professionals/yp_candidate_document');
const quarantineDestination = path.join(__dirname, '../../../fileuploads/Young_Professionals/yp_quarantine');

for (const dir of [uploadDestination, quarantineDestination]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, quarantineDestination),
    filename: (req, file, callback) => {
        const safeOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueFileName = `${Date.now()}_${safeOriginal}`;
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, callback) => {
        const isPdf =
            file.mimetype === 'application/pdf' ||
            file.originalname.toLowerCase().endsWith('.pdf');
        if (!isPdf) return callback(new Error('ONLY_PDF'));
        callback(null, true);
    }
}).single('file');

const removeFile = (p) => fs.promises.unlink(p).catch(() => {});

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
async function moveFile(from, to) {
    try {
        await fs.promises.rename(from, to);
    } catch (e) {
        await fs.promises.copyFile(from, to);
        await removeFile(from);
    }
}

async function uploadYPDocument(req, res) {
    upload(req, res, async function (err) {
        if (err) {
            console.error(err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
            }
            if (err.message === 'ONLY_PDF') {
                return res.status(400).json({ error: 'Only PDF files are allowed.' });
            }
            return res.status(400).json({ error: 'Error uploading file' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const quarantinePath = req.file.path;

        const ypId = parseInt(
            req.params.candidateId ?? req.params.youngProfessionalId ?? req.params.ypId,
            10
        );
        if (Number.isNaN(ypId)) {
            await removeFile(quarantinePath);
            return res.status(400).json({ error: 'Invalid young professional id' });
        }

        // ---- 1. Validate content and scan for viruses BEFORE touching the DB ----
        try {
            if (!(await isRealPdf(quarantinePath))) {
                await removeFile(quarantinePath);
                return res.status(400).json({ error: 'Invalid file. Only genuine PDF files are allowed.' });
            }

            const clam = await getClam();
            const { isInfected, viruses } = await clam.isInfected(quarantinePath);

            if (isInfected === true) {
                await removeFile(quarantinePath);
                console.warn('Infected upload rejected:', req.file.originalname, viruses);
                return res.status(422).json({
                    error: 'The uploaded file was rejected because a virus was detected.'
                });
            }

            // isInfected can be null when the scan could not complete -> fail closed
            if (isInfected !== false) {
                await removeFile(quarantinePath);
                return res.status(503).json({
                    error: 'File scanning could not be completed. Please try again later.'
                });
            }
        } catch (scanErr) {
            console.error('ClamAV scan error:', scanErr);
            await removeFile(quarantinePath); // fail closed: never keep an unscanned file
            return res.status(503).json({
                error: 'File scanning service is unavailable. Please try again later.'
            });
        }

        // ---- 2. File is clean: move to final folder, then update the DB ----
        const fileName = req.uniqueFileName;
        const finalPath = path.join(uploadDestination, fileName);

        try {
            await moveFile(quarantinePath, finalPath);

            const conn = await pool;
            const updateRequest = conn.request();
            updateRequest.input('ypId', ypId);
            // Store only the bare filename; the download handler joins it with uploadDestination
            updateRequest.input('fileName', fileName);
            const result = await updateRequest.query(`
                UPDATE dbo.tbl_young_professionals
                SET appointment_document = @fileName
                WHERE yp_id = @ypId
            `);

            if (!result.rowsAffected || result.rowsAffected[0] === 0) {
                await removeFile(finalPath);
                return res.status(404).json({ error: 'Young professional not found' });
            }

            res.status(201).json({ message: 'Document uploaded successfully', fileName });
        } catch (error) {
            console.error("Error saving yp document:", error);
            await removeFile(finalPath);
            await removeFile(quarantinePath);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

async function ypFileDownload(req, res) {
    const { fileName } = req.query;
    if (!fileName || typeof fileName !== 'string') {
        return res.status(400).send("Bad Request: fileName is required");
    }

    // Security: only use the base name and always read from the upload folder.
    // The old code allowed any path (e.g. ../../.env) to be downloaded.
    const safeName = path.basename(fileName.replace(/\\/g, '/'));
    const filePath = path.join(uploadDestination, safeName);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(404).send("File Not Found");
        }
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(safeName));
        res.setHeader('Content-Type', 'application/pdf');
        res.send(data);
    });
}

// Dummy placeholders to prevent crash on old route matches
async function addCandidateDetail(req, res) { res.sendStatus(200); }
async function getCandidateDetail(req, res) { res.json([]); }
async function getCandidateDetailDocument(req, res) { res.json([]); }
async function updateCandidateDocument(req, res) { res.json([]); }
async function updateCandidateDetail(req, res) { res.sendStatus(200); }
async function deleteYpCandidateData(req, res) { res.sendStatus(200); }

export default {
    createYoungProfessional, getYoungProfessional, addCandidateDetail, updateYoungProfessional,
    deleteYoungProfessionalData, getCandidateDetail, getCandidateDetailDocument, updateCandidateDocument,
    updateCandidateDetail, deleteYpCandidateData, getYoungProfessionalWingData, uploadYPDocument, upload, ypFileDownload,
    relieveYoungProfessional
};
