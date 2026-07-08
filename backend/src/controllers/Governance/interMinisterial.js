import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Inter_Ministerial";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Inter_Ministerial");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});

async function addInterMinisterialData(req, res) {

    const ministry = req.body.ministry;
    const responsibleDepartment = req.body.responsibleDepartment;
    const briefDescription = req.body.briefDescription;
    const currentStatus = req.body.currentStatus;
    const briefStatus = req.body.briefStatus;
    const concernReg = req.body.concernReg;
    const priority = req.body.priority;
    const expectedCompletion = req.body.expectedCompletion;
    const reasonsForDelay = req.body.reasonsForDelay;
    const remarksDelay = req.body.remarksDelay;

    const userID = req.body.userID;

    const conn = await pool;
    const request = conn.request();

    request.input("ministry", ministry);
    request.input("responsibleDepartment", responsibleDepartment);
    request.input("briefDescription", briefDescription);
    request.input("currentStatus", currentStatus);
    request.input("briefStatus", briefStatus);
    request.input("concernReg", concernReg);
    request.input("priority", priority);
    request.input("reasonsForDelay", reasonsForDelay);
    request.input("remarksDelay", remarksDelay);
    request.input("expectedCompletion", expectedCompletion);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            INSERT INTO tbl_IT_inter_Ministerial (
                ministry_id, responsible_department, brief_description, current_status, brief_status, concern_reg,
                priority, expected_completion, reasons_for_delay, remarks_delay, created_by
            )
            VALUES (
                @ministry, @responsibleDepartment, @briefDescription, @currentStatus, @briefStatus, @concernReg,
                @priority, @expectedCompletion, @reasonsForDelay, @remarksDelay, @userID
            )
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function updateInterMinisterialData(req, res) {
    const ID = req.body.ID;
    const ministry = req.body.ministry;
    const responsibleDepartment = req.body.responsibleDepartment;
    const briefDescription = req.body.briefDescription;
    const currentStatus = req.body.currentStatus;
    const briefStatus = req.body.briefStatus;
    const concernReg = req.body.concernReg;
    const priority = req.body.priority;
    const expectedCompletion = req.body.expectedCompletion;
    const reasonsForDelay = req.body.reasonsForDelay;
    const remarksDelay = req.body.remarksDelay;

    const userID = req.body.userID;

    const conn = await pool;
    const request = conn.request();

    request.input("ID", ID);
    request.input("ministry", ministry);
    request.input("responsibleDepartment", responsibleDepartment);
    request.input("briefDescription", briefDescription);
    request.input("currentStatus", currentStatus);
    request.input("briefStatus", briefStatus);
    request.input("concernReg", concernReg);
    request.input("priority", priority);
    request.input("reasonsForDelay", reasonsForDelay);
    request.input("remarksDelay", remarksDelay);
    request.input("expectedCompletion", expectedCompletion);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_IT_inter_Ministerial
            SET
                ministry_id = @ministry,
                responsible_department = @responsibleDepartment,
                brief_description = @briefDescription,
                current_status = @currentStatus,
                brief_status = @briefStatus,
                concern_reg = @concernReg,
                priority = @priority,
                reasons_for_delay = @reasonsForDelay,
                remarks_delay = @remarksDelay,
                expected_completion = @expectedCompletion,
                updated_by = @userID,
                updated_date = GETDATE()
            WHERE Inter_Ministerial_ID = @ID
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function addInterMinisterialDocument(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const ID = parseInt(req.body.ID);
        request.input("ID", ID);
        request.input("fileName", req.uniqueFileName);
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let sqlQuery;
        if (ID === -1) {
            const lastRecord = await conn.query(`SELECT TOP 1 Inter_Ministerial_ID
                FROM tbl_IT_inter_Ministerial
                ORDER BY Inter_Ministerial_ID DESC`);

            const Inter_ID = lastRecord.recordset[0].Inter_Ministerial_ID;

            request.input("Inter_ID", Inter_ID);

            sqlQuery = `
                INSERT INTO tbl_IT_inter_Ministerial_file (Inter_Ministerial_ID, file_name)
                VALUES (@Inter_ID, @fileName)
            `;
           
        } else {

            const checkRecord = await request.query(`
                SELECT COUNT(*) AS recordCount
                FROM tbl_IT_inter_ministerial_file
                WHERE Inter_Ministerial_ID = @ID
            `);

            const recordCount = checkRecord.recordset[0].recordCount;

            if (recordCount === 1) {
                const docName = await request.query(`
                    SELECT file_name as fileName
                    FROM tbl_IT_inter_ministerial_file
                    WHERE Inter_Ministerial_ID = @ID
                `);

                const name = docName.recordset[0].fileName;

                if (name) {
                    deleteFile(name);
                }

                sqlQuery = `
                    UPDATE tbl_IT_inter_ministerial_file
                    SET file_name = @fileName
                    WHERE Inter_Ministerial_ID = @ID
                `;
                
            } else {
                sqlQuery = `
                    INSERT INTO tbl_IT_inter_Ministerial_file (Inter_Ministerial_ID, file_name)
                    VALUES (@ID, @fileName)
                `;
            }
        }

        // Execute the SQL query
        await request.query(sqlQuery);

        res.status(201).json({ message: "Document uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}


async function getInterMinisterialData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT * from tbl_IT_inter_ministerial
            INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_IT_inter_ministerial.ministry_id
            ORDER BY Inter_Ministerial_ID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateInterMinisterialData(req, res) {
    const interMinisterialID = req.params.ID;
    const conn = await pool;
    const request = conn.request();
    request.input("interMinisterialID", interMinisterialID);

    try {
        const result = await request.query(`
            SELECT * FROM tbl_IT_inter_ministerial
            INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_IT_inter_ministerial.ministry_id
            WHERE tbl_IT_inter_ministerial.Inter_Ministerial_ID = @interMinisterialID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `fileuploads/Inter_Ministerial/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
}

const interMinisterialController = {
    addInterMinisterialData, getInterMinisterialData, getUpdateInterMinisterialData, 
    updateInterMinisterialData, addInterMinisterialDocument, upload
};

export default interMinisterialController;
