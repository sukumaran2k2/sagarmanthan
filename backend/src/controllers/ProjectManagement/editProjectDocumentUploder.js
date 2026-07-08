
import multer from 'multer';
import fs from 'fs';
// import { existsSync, mkdirSync } from 'fs';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import path from 'path';

// const createDirIfNotExists = dir =>
//   !existsSync(dir) ? mkdirSync(dir) : undefined;

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  // Limit file size to 10MB
});


async function clearanceDocumentUploader(req, res) {
    const { projectID } = req.body;
    const { folderName } = req.body;

    try {
        const conn = await pool;

        const originalFileName = req.file.originalname;

        var createDir = `./fileuploads/${folderName}`;
        if (!fs.existsSync(createDir))
        {
            fs.mkdirSync(createDir);
        }
        // else
        // {
        //     console.log("Directory already exist");
        // }

        // // Move the uploaded file to the destination folder with the unique filename
        const destinationPath = `${createDir}/${originalFileName}`;       
        fs.renameSync(req.file.path, destinationPath)
      
        res.status(200).json({ status: 'success', originalFileName  });      
    } 
    catch (err) 
    {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadClearanceDocument(req, res) {
    try {
     
        const documentName = req.params.documentName;


        const conn = await pool;

            const filePath = path.join(__dirname, `../../../fileuploads/Clearance_Document`, documentName);

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${documentName}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Length', fs.statSync(filePath).size);

                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            } else {
                console.error("File not found on the server.");
                res.status(404).send({ message: "File not found" });
            }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}
const clearanceDocumentUploaderTab = { clearanceDocumentUploader, upload, downloadClearanceDocument };
export default clearanceDocumentUploaderTab;