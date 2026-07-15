import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';

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

// 2. Get All Young Professionals
async function getYoungProfessional(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
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
                yp.appointment_document
            FROM dbo.tbl_young_professionals yp
            LEFT JOIN mmt_wings w ON w.wing_id = yp.wing_id
            LEFT JOIN mmt_division d ON d.division_id = yp.division_id
            ORDER BY yp.yp_id DESC
        `);
        res.json(result.recordset);
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
const uploadDestination = './demoFiles/yp_candidate_document';
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadDestination),
    filename: (req, file, callback) => {
        const uniqueFileName = `${Date.now()}_${file.originalname}`;
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('file');

/*
async function uploadYPDocument(req, res) {
    upload(req, res, async function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error uploading file' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const ypId = parseInt(req.params.candidateId); // Route has candidateId
            const fileName = req.uniqueFileName;

            const conn = await pool;
            const updateRequest = conn.request();
            updateRequest.input('ypId', ypId);
            updateRequest.input('fileName', fileName);
            await updateRequest.query(`
                UPDATE dbo.tbl_young_professionals
                SET appointment_document = @fileName
                WHERE yp_id = @ypId
            `);

            res.status(201).json({ message: 'Document uploaded successfully', fileName });
        } catch (error) {
            console.error("Error updating yp document in DB:", error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

async function ypFileDownload(req, res) {
    const { fileName } = req.query;
    const filePath = path.join(uploadDestination, fileName);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(555).send("Internal Server Error");
        } else {
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.setHeader('Content-type', 'application/pdf');
            res.send(data);
        }
    });
}
*/

async function uploadYPDocument(req, res) {
    upload(req, res, async function (err) {
        if (err) {
            console.error(err);
            return res.status(550).json({ error: 'Error uploading file' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const ypId = parseInt(req.params.candidateId);
            const fileName = req.uniqueFileName;
            const relativePath = `${uploadDestination}/${fileName}`.replace(/\\/g, '/');

            const conn = await pool;
            const updateRequest = conn.request();
            updateRequest.input('ypId', ypId);
            updateRequest.input('fileName', relativePath);
            await updateRequest.query(`
                UPDATE dbo.tbl_young_professionals
                SET appointment_document = @fileName
                WHERE yp_id = @ypId
            `);

            res.status(201).json({ message: 'Document uploaded successfully', fileName: relativePath });
        } catch (error) {
            console.error("Error updating yp document in DB:", error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

async function ypFileDownload(req, res) {
    const { fileName } = req.query;
    if (!fileName) {
        return res.status(400).send("Bad Request: fileName is required");
    }

    let filePath;
    if (fileName.includes('/') || fileName.includes('\\')) {
        filePath = path.resolve(fileName);
    } else {
        filePath = path.join(uploadDestination, fileName);
    }

    const resolvedBase = path.basename(filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(550).send("File Not Found");
        } else {
            res.setHeader('Content-disposition', 'attachment; filename=' + encodeURIComponent(resolvedBase));
            res.setHeader('Content-type', 'application/octet-stream');
            res.send(data);
        }
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
