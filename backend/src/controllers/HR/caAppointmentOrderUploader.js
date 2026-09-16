import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";

const uploadDestination = "./fileuploads/Consultant_Appointment";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

function findMaxCounter(files) {
    let maxCounter = 0;

    files.forEach((file) => {
        const fileName = file.split('_');
        if (fileName.length === 2) {
            const counter = parseInt(fileName[0]);
            if (!isNaN(counter) && counter > maxCounter) {
                maxCounter = counter;
            }
        }
    });

    return maxCounter;
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

async function candidateDocumentUploader(req, res) {
    const { candidateID } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileName = req.file.filename || generateUniqueFileName(req.file.originalname);

        request.input("fileName", sql.NVarChar, fileName);
        request.input("candidateID", sql.NVarChar, candidateID);

        const checkResult = await request.query(`
            SELECT id FROM tbl_ca_candidate_document WHERE candidate_id = @candidateID
        `);

        if (checkResult.recordset.length > 0) {
            await request.query(`
                UPDATE tbl_ca_candidate_document
                SET appointment_order_document = @fileName
                WHERE candidate_id = @candidateID
            `);
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
        res.status(500).json({ error: "Internal server error" });
    }
}

async function downloadCandidateDocument(req, res) {
    const fileName = req.params.fileName;
    const filePath = path.resolve(uploadDestination, fileName);
    if (fs.existsSync(filePath)) {
        return res.download(filePath, fileName);
    } else {
        return res.status(404).json({ error: "File not found" });
    }
}

const candidateDocumentTab = { candidateDocumentUploader, downloadCandidateDocument, upload };
export default candidateDocumentTab;
