import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Inter_state";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Inter_state");
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

async function addInterStateData(req, res) {

    const state = req.body.state;
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

    request.input("state", state);
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
            INSERT INTO tbl_IT_inter_state (
                state_id, responsible_department, brief_description, current_status, brief_status, concern_reg,
                priority, expected_completion, reasons_for_delay, remarks_delay, created_by
            )
            VALUES (
                @state, @responsibleDepartment, @briefDescription, @currentStatus, @briefStatus, @concernReg,
                @priority, @expectedCompletion, @reasonsForDelay, @remarksDelay, @userID
            )
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function updateInterStateData(req, res) {
    const ID = req.body.ID;
    const state = req.body.state;
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
    request.input("state", state);
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
            UPDATE tbl_IT_inter_state
            SET
                state_id = @state,
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
            WHERE Inter_state_ID = @ID
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function addInterStateDocument(req, res) {
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
            const lastRecord = await conn.query(`SELECT TOP 1 Inter_state_ID
                FROM tbl_IT_inter_state
                ORDER BY Inter_state_ID DESC`);

            const Inter_ID = lastRecord.recordset[0].Inter_state_ID;

            request.input("Inter_ID", Inter_ID);

            sqlQuery = `
                INSERT INTO tbl_IT_inter_state_file (Inter_state_ID, file_name)
                VALUES (@Inter_ID, @fileName)
            `;
           
        } else {

            const checkRecord = await conn.query(`
                SELECT COUNT(*) AS recordCount
                FROM tbl_IT_inter_state_file
                WHERE Inter_state_ID = @ID
            `);

            const recordCount = checkRecord.recordset[0].recordCount;

            if (recordCount === 1) {
                const docName = await conn.query(`
                    SELECT file_name as name
                    FROM tbl_IT_inter_state_file
                    WHERE Inter_state_ID = @ID
                `);

                const name = docName.recordset[0].name;
                if (name) {
                    deleteFile(name);
                }

                sqlQuery = `
                    UPDATE tbl_IT_inter_state_file
                    SET file_name = @fileName
                    WHERE Inter_state_ID = @ID
                `;
            } else {
                sqlQuery = `
                    INSERT INTO tbl_IT_inter_state_file (Inter_state_ID, file_name)
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


// async function addInterStateDocument(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         // Extract ID from the request body
//         const ID = parseInt(req.body.ID);

//         const originalFileName = req.file.originalname;
//         const uniqueFileName = generateUniqueFileName(originalFileName);

//         request.input("fileName", uniqueFileName);

//         if (!req.file) {
//             return res.status(400).json({ error: "No file uploaded" });
//         }

//         // If ID is -1, it means add new record, otherwise update existing record
//         let sqlQuery;
//         if (ID === -1) {
//             // For adding new record, find the Inter_state_ID from the last added data
//             const lastRecord = await conn.query(`SELECT TOP 1 Inter_state_ID
//                 FROM tbl_IT_inter_state
//                 ORDER BY Inter_state_ID DESC`);

//             const Inter_ID = lastRecord.recordset[0].Inter_state_ID;

//             request.input("Inter_ID", Inter_ID);

//             sqlQuery = await conn.query(`
//                 INSERT INTO tbl_IT_inter_state_file (Inter_state_ID, file_name)
//                 VALUES (@Inter_ID, @fileName)
//             `);
           
//         } else {
//             // For updating existing record, use the provided ID
//             sqlQuery = await conn.query(`
//                 UPDATE tbl_IT_inter_state_file
//                 SET file_name = @file_name
//                 WHERE Inter_state_ID = @ID
//             `);

//         }

//         // Execute the SQL query
//         await request.input("file_name", params.file_name);
//         if (params.Inter_state_ID) {
//             await request.input("Inter_state_ID", params.Inter_state_ID);
//         } else {
//             await request.input("ID", ID);
//         }
//         await request.query(sqlQuery);

//         // Move the uploaded file to the destination folder
//         const destinationPath = path.join(uploadDestination, req.file.originalname);
//         fs.renameSync(req.file.path, destinationPath);

//         res.status(201).json({ message: "Document uploaded successfully" });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

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


async function getInterStateData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT * from tbl_IT_inter_state
            INNER JOIN mmt_state ON mmt_state.state_id = tbl_IT_inter_state.state_id
            ORDER BY Inter_state_ID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateInterStateData(req, res) {
    const interStateID = req.params.ID;
    const conn = await pool;
    const request = conn.request();
    request.input("interStateID", interStateID);

    try {
        const result = await request.query(`
            SELECT * FROM tbl_IT_inter_state
            INNER JOIN mmt_state ON mmt_state.state_id = tbl_IT_inter_state.state_id
            WHERE tbl_IT_inter_state.Inter_state_ID = @interStateID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `fileuploads/Inter_state/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
}

const interStateController = {
    addInterStateData, getInterStateData, getUpdateInterStateData,
    updateInterStateData, addInterStateDocument, upload
};

export default interStateController;
