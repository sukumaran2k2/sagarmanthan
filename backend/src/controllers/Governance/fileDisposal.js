import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/disposal";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/disposal");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});

async function getDisposal(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * from tbl_disposal;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function createDisposal(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const originalFileName = req.file.originalname;
        const uniqueFileName = generateUniqueFileName(originalFileName);

        request.input("fileName", sql.NVarChar, uniqueFileName);
        
        // Automatically set the upload date to the current date and time
        const currentDate = new Date();
        request.input("date_of_upload", sql.DateTime, currentDate);

        // Execute the INSERT operation and get the ID of the newly inserted record
        const result = await request.query(`
            INSERT INTO tbl_disposal (file_name, date_of_upload)
            OUTPUT INSERTED.id
            VALUES (@fileName, @date_of_upload)
        `);

        const insertedId = result.recordset[0].id; // Get the ID from the result

        // Define the destination folder path
        const destinationFolder = './fileuploads/disposal';
        const destinationPath = path.join(destinationFolder, uniqueFileName);

        // Create the destination folder if it doesn't exist
        if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder, { recursive: true });
        }

        // Move the uploaded file to the destination folder with the unique filename
        fs.renameSync(req.file.path, destinationPath);

        // Include the ID in the response
        res.status(201).json({
            message: "Disposal record created successfully",
            id: insertedId,
        });
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
//-------------------------download---------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadDisposal(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;
        
        const result = await conn.query(`SELECT file_name FROM tbl_disposal WHERE id = ${id}`);
        const fileName = result.recordset[0].file_name;
        const file_path = path.join(__dirname, "../../../fileuploads/disposal", fileName);
        
        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(file_path);
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

//-------------------------delete funcion---------------------
async function deleteDisposal(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;

        const result = await conn.query(
            `SELECT file_name FROM tbl_disposal WHERE id = ${id}`
        );
        const fileName = result.recordset[0].file_name;
        const fileResult = await conn.query(`SELECT id FROM tbl_disposal WHERE file_name = '${fileName}'`);
        const fileId = fileResult.recordset[0].id;

        if (fs.existsSync(`./fileuploads/disposal/${fileName}`)) {
        
            fs.unlink(`./fileuploads/disposal/${fileName}`, (err) => {
                if (err) {
                    // Handle the error gracefully
                    console.error("Error deleting file:", err);
                }
            });
        } else {
            console.log("File does not exist, no deletion needed");
        }

        await conn.query(`DELETE FROM filedata WHERE file_id = ${fileId}`);
        await conn.query(`DELETE FROM tbl_disposal WHERE id = ${id}`);
        
        res.status(200).send({ message: 'File and data deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function storeFileData(req, res) {
    const { id } = req.params;
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT file_name FROM tbl_disposal WHERE id = ${id}`);
        const fileName = result.recordset[0].file_name;
        const filePath = `./fileuploads/disposal/${fileName}`;

        // Get the file ID from the tbl_attendance table
        const fileResult = await conn.query(`SELECT id FROM tbl_disposal WHERE file_name = '${fileName}'`);
        const fileId = fileResult.recordset[0].id;

        const errors = [];

        const processRow = async (row) => {
            try {
                const {
                    Wing,
                    Division,
                    'Employee Name': EmployeeName,
                    Designation,
                    'Count of Transactions': CountOfTransactions,
                    'Count of Files': CountOfFiles,
                    'Avg. Response time': AvgResponseTime
                } = row;


                // const formattedWorkingHours = formatTime(WorkingHours);
                // const formattedInTimeAvg = formatTime(InTimeAvg);
                // const formattedOutTimeAvg = formatTime(OutTimeAvg);

                const request = conn.request();
                request.input("Wing", sql.NVarChar, Wing);
                request.input("Division", sql.NVarChar, Division);
                request.input("EmployeeName", sql.NVarChar, EmployeeName);
                request.input("Designation", sql.NVarChar, Designation);
                request.input("CountOfTransactions", sql.Int, CountOfTransactions);
                request.input("CountOfFiles", sql.Int, CountOfFiles);
                request.input("AvgResponseTime", sql.NVarChar, AvgResponseTime);
                request.input("file_id", sql.Int, fileId);

                try {
                    await new Promise((resolve, reject) => {
                        request.query(`
                        INSERT INTO filedata (Wing, Division, EmployeeName, Designation, CountOfTransactions, CountOfFiles, AvgResponseTime, file_id)
                            VALUES (@Wing, @Division, @EmployeeName, @Designation, @CountOfTransactions, @CountOfFiles, @AvgResponseTime, @file_id)
                        `, (err) => {
                            if (err) {
                                console.log("Error inserting row:", err.message);
                                errors.push(err.message);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                } catch (err) {
                    console.log("Error during row insertion:", err.message);
                    errors.push(err.message);
                }
            } catch (err) {
                console.log("Error processing row:", err.message);
                errors.push(err.message);
            }
        };

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
        const sheet = workbook.Sheets[sheetName];

        const data = xlsx.utils.sheet_to_json(sheet);
        for (const row of data) {
            await processRow(row);
        }

        if (errors.length > 0) {
            console.error("Errors during data processing:", errors);
            res.status(500).json({ error: "Error processing the XLSX data" });
        } else {
            res.status(201).json({ message: "XLSX data stored successfully" });
        }
    } catch (err) {
        console.error("Error during data retrieval and processing:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}


const disposalTab = { getDisposal, createDisposal, downloadDisposal, deleteDisposal, upload, storeFileData };
export default disposalTab;
