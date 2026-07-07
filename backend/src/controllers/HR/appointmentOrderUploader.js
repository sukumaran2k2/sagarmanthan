import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import { pool } from "../../db.js";

const uploadDestination = "./fileuploads/Young_Professionals";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');
    const milliseconds = currentDate.getMilliseconds().toString().padStart(3, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}${milliseconds}.${fileExtension}`;
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        const originalFileName = file.originalname;

        const uniqueFileName = generateUniqueFileName(originalFileName);

        callback(null, uniqueFileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20000000 }
});

// async function candidateDocumentUploader(req, res) {
//     const { candidateID } = req.body;
//     console.log("candidateID candidateID", candidateID);

//     try {
//         const conn = await pool;
//         const request = conn.request();

//         if (req.file) {
//             const originalFileName = req.file.originalname ?? null;
//             const uniqueFileName = generateUniqueFileName(originalFileName);

//             request.input("fileName", sql.NVarChar, uniqueFileName ?? null);
//         } else {
//             request.input("fileName", sql.NVarChar, null);
//         }

//         request.input("candidateID", sql.NVarChar, candidateID);

//         const result = await request.query(`
//             INSERT INTO tbl_yp_candidate_document (candidate_id, appointment_order_document) 
//             VALUES (@candidateID, @fileName)
//         `);

//         console.log('result', result);

//         if (req.file) {
//             const destinationPath = `${uploadDestination}/${req.file.filename}`;
//             fs.renameSync(req.file.path, destinationPath);
//         }

//         res.sendStatus(201);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

async function candidateDocumentUploader(req, res) {
    try {
        // console.log('function hitted!');
        const conn = await pool;
        const request = conn.request();

        if (!req.file || req.file.length === 0 || !req.body.candidateID) {
            return res.status(400).json({ error: "No files or IDs uploaded" });
        }

        const { candidateID } = req.body;

        console.log("candidateID",candidateID);
        console.log("req.file.length",req.file.length);

        request.input("candidateID", sql.NVarChar, candidateID);

        if (req.file)
        {
            const file = req.file;
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName);

            request.input("uniqueFileName", sql.NVarChar, uniqueFileName);

            const result = await request.query(`
                INSERT INTO tbl_yp_candidate_document (candidate_id, appointment_order_document)
                OUTPUT INSERTED.candidate_id
                VALUES (@candidateID, @uniqueFileName)
            `);

            console.log('result',result);

            const insertedId = result.recordset[0].candidate_id;

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            fs.renameSync(file.path, destinationPath);
        }

        res.status(201).json({
            message: "Young Professional Documents created successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function candidateDocumentUpdater(req, res) {
    const { candidateID } = req.body;
    // const data = req.body;
    // console.log(data);

    try {
        const conn = await pool;
        const request = conn.request();

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const originalFileName = req.file.originalname;
        const uniqueFileName = generateUniqueFileName(originalFileName);

        request.input("fileName", sql.NVarChar, uniqueFileName);
        request.input("candidateID", sql.NVarChar, candidateID);

        const existingDocument = await request.query(`
            SELECT TOP 1 * FROM tbl_yp_candidate_document
            WHERE candidate_id = @candidateID
        `);

        if (existingDocument.recordset.length > 0) {
            // Document exists, update it
            const result = await request.query(`
                UPDATE tbl_yp_candidate_document
                SET appointment_order_document = @fileName
                WHERE candidate_id = @candidateID
            `);
        } else {
            // Document doesn't exist, insert a new record
            const result = await request.query(`
                INSERT INTO tbl_yp_candidate_document (candidate_id, appointment_order_document)
                VALUES (@candidateID, @fileName)
            `);
        }

        const destinationPath = `${uploadDestination}/${req.file.filename}`;
        fs.renameSync(req.file.path, destinationPath);

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}


const candidateDocumentTab = { candidateDocumentUploader, candidateDocumentUpdater, upload };
export default candidateDocumentTab;
