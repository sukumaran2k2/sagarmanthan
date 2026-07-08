
import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import { pool } from "../../db.js";

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

async function projectDocumentUploader(req, res) {
    const { projectID } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const originalFileName = req.file.originalname;
        // const uniqueFileName = generateUniqueFileName(originalFileName); // Generate a unique filename

        request.input("fileName", sql.NVarChar, originalFileName);
        request.input("projectID", sql.NVarChar, projectID);

        // Execute the INSERT operation and get the ID of the newly inserted record
        const result = await request.query(`INSERT INTO tbl_project_document ( project_id, document_name) 
        VALUES (@projectID, @fileName ) `);

        // const insertedId = result.recordset[0].document_id; // Get the ID from the result
        // console.log(insertedId)

        // Move the uploaded file to the destination folder with the unique filename
        const destinationPath = `./fileuploads/${originalFileName}`;
        fs.renameSync(req.file.path, destinationPath);

        
        res.sendStatus(200);    

        // Include the ID in the response
        // res.status(200).json({
        //     message: "Attendance record created successfully",
        //     // id: insertedId,
        // });
    } 
    catch (err) 
    {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}




// Function to generate a unique filename by appending a timestamp
// function generateUniqueFileName(originalFileName) {
//     const timestamp = Date.now();
//     const filenameParts = originalFileName.split('.');
//     const fileExtension = filenameParts.pop();
//     const baseFileName = filenameParts.join('.');
//     return `${baseFileName}_${timestamp}.${fileExtension}`;
// }

// export default { projectDocumentUploader };

const documentUploaderTab = { projectDocumentUploader, upload };
export default documentUploaderTab;