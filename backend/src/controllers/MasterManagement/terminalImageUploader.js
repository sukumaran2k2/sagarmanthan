import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Terminal_Images";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Terminal_Images");
    },
    filename: (req, file, callback) => {
        const originalFileName = file.originalname;
        const uniqueFileName = generateUniqueFileName(originalFileName);
        callback(null, uniqueFileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function terminalImageUploader(req, res) {
    try {
        const conn = await pool;
        const transaction = new sql.Transaction(conn);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            if (!req.file) {
                await transaction.rollback();
                return res.status(400).json({ error: "No file uploaded" });
            }

            const terminalID = req.body.terminalID;
            request.input("terminalID", sql.NVarChar, terminalID);

            const file = req.file;

            const originalFileName = file.originalname;
            const uniqueFileName = generateUniqueFileName(originalFileName);

            request.input("fileName", sql.NVarChar, uniqueFileName);

            const result = await request.query(`
                INSERT INTO mmt_terminal_jetty_image (terminal_id, image_name)
                OUTPUT INSERTED.id
                VALUES (@terminalID, @fileName)
            `);

            const insertedId = result.recordset[0].id;

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            fs.renameSync(file.path, destinationPath);

            await transaction.commit();

            res.status(201).json({
                message: "Terminal/Jetty image uploaded successfully",
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadImageDocument(req, res) {
    try {
        const id = req.params.id;
        const fileName = req.query.file;
        const conn = await pool;

        const result = await conn.query(`
            SELECT image_name
            FROM tbl_terminal_jetty_image
            WHERE terminal_id = '${id}' AND image_name = '${fileName}'
        `);

        if (result.recordsets.length > 0) {
            const file_path = path.join(__dirname, "../../../fileuploads/Project_Documents/project_images", fileName);

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
            console.error("File not found for the given terminal_id and file name.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}
const terminalImageUploaderTab = { terminalImageUploader, upload, downloadImageDocument };
export default terminalImageUploaderTab;
