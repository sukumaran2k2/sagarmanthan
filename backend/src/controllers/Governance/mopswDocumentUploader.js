import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/cabinet_notes_mopsw";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/cabinet_notes_mopsw");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function mopswDocumentUploader(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        if (!req.files || req.files.length === 0 || !req.body.cabinetNotesMopswID) {
            return res.status(400).json({ error: "No files or IDs uploaded" });
        }

        const { cabinetNotesMopswID } = req.body;

        console.log(cabinetNotesMopswID);

        request.input("cabinetNotesMopswID", sql.NVarChar, cabinetNotesMopswID);

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName);

            const fileNameParam = `fileName${index}`;

            request.input(fileNameParam, sql.NVarChar, uniqueFileName);

            const result = await request.query(`
                INSERT INTO tbl_cabinet_notes_mopsw_document (mopsw_cabinet_id, cabinet_notes_mopsw_document)
                OUTPUT INSERTED.mopsw_cabinet_id
                VALUES (@cabinetNotesMopswID, @${fileNameParam})
            `);

            const insertedId = result.recordset[0].mopsw_cabinet_id;

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            fs.renameSync(file.path, destinationPath);
        }

        res.status(201).json({
            message: "MOPSW documents created successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadMopswDocument(req, res) {
    try {
        const id = req.params.id;
        const fileName = req.query.file;

        const conn = await pool;
        const request = conn.request();
        request.input("id" ,id);
        request.input('fileName', fileName);
        
        const result = await request.query(`
            SELECT cabinet_notes_mopsw_document 
            FROM tbl_cabinet_notes_mopsw_document 
            WHERE mopsw_cabinet_id = @id AND cabinet_notes_mopsw_document = @fileName
        `);

        if (result.recordsets.length > 0) {
            const file_path = path.join(__dirname, "../../../fileuploads/cabinet_notes_mopsw", fileName);

            if (fs.existsSync(file_path)) {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Length', fs.statSync(file_path).size);

                const fileStream = fs.createReadStream(file_path);
                fileStream.pipe(res);
            } else {
                console.error("File not found on the server.");
                res.status(404).send({ message: "File not found" });
            }
        } else {
            console.error("File not found for the given mopsw_cabinet_id and file name.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

const mopswDocumentTab = { mopswDocumentUploader, upload, downloadMopswDocument };
export default mopswDocumentTab;
