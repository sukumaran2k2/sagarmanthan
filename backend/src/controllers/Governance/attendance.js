import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/attendance";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/attendance");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});

async function getAttendance(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * from tbl_attendance;`);
        console.log('result',result);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function createAttendance(req, res) {
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
            INSERT INTO tbl_attendance (file_name, date_of_upload)
            OUTPUT INSERTED.id
            VALUES (@fileName, @date_of_upload)
        `);

        const insertedId = result.recordset[0].id; // Get the ID from the result

        // Define the destination folder path
        const destinationFolder = './fileuploads/attendance';
        const destinationPath = path.join(destinationFolder, uniqueFileName);

        // Create the destination folder if it doesn't exist
        if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder, { recursive: true });
        }

        // Move the uploaded file to the destination folder with the unique filename
        fs.renameSync(req.file.path, destinationPath);

        // Include the ID in the response
        res.status(201).json({
            message: "Attendance record created successfully",
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


//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadAttendance(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;
        
        const result = await conn.query(`SELECT file_name FROM tbl_attendance WHERE id = ${id}`);
        const fileName = result.recordset[0].file_name;
        const file_path = path.join(__dirname, "../../../fileuploads/attendance", fileName);
        
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

//-----------------------------------------------------------------------Delete logic--------------------------------------------------------------------------
async function deleteAttendance(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;
        const request = conn.request();

        request.input("id", id);
        const result = await conn.query(
            `SELECT id,file_name FROM tbl_attendance WHERE id = @id`
        );
        
        // console.log("result",result);

        const fileName = result.recordset[0].file_name; //to delete the file from storage.
        
        const AttendanceFileId = result.recordset[0].id;
        const excelId = result.recordset[0].id; // to delete the attendance matching excel ID from the table.

        //const fileResult = await conn.query(`SELECT id FROM tbl_attendance WHERE file_name = '${fileName}'`);
        //const fileId = fileResult.recordset[0].id;

        if (fs.existsSync(`./fileuploads/attendance/${fileName}`)) {
        
            fs.unlink(`./fileuploads/attendance/${fileName}`, (err) => {
                if (err) {
                    // Handle the error gracefully
                    console.error("Error deleting file:", err);
                }
            });
        } else {
            console.log("File does not exist, no deletion needed");
        }
        
        request.input("AttendanceFileId", AttendanceFileId);
        request.input("excelId", excelId);

        await request.query(`DELETE FROM tbl_attendance WHERE id = @AttendanceFileId`);
        await request.query(`DELETE FROM exceldata WHERE file_id = @excelId`);

        res.status(200).send({ message: 'File and data deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

function formatTime(timeValue) {
    // Check if the timeValue is a number (float)
    if (typeof timeValue === 'number' && !isNaN(timeValue)) {
        const totalSeconds = timeValue * 24 * 60 * 60;
        
        // Calculate hours, minutes, and seconds
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);
        
        // Format the components as two-digit strings
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
        // If the value is not a valid number, return an empty string or handle it accordingly
        return '';
    }
}

async function storeCsvData(req, res) {
    const { id } = req.params;
    const conn = await pool;
    console.log(id,"id")
    
    try {
        const result = await conn.query(`SELECT file_name FROM tbl_attendance WHERE id = ${id}`);
        const fileName = result.recordset[0].file_name;
        const filePath = `./fileuploads/attendance/${fileName}`;
        // Get the file ID from the tbl_attendance table
        const fileResult = await conn.query(`SELECT id FROM tbl_attendance WHERE file_name = '${fileName}'`);
        const fileId = fileResult.recordset[0].id;

        const errors = [];

        const processRow = async (row) => {
            try {
                const {
                    'Emp Id' : EmpId,
                    Wing,
                    Division,
                    'Emp Name': EmpName,
                    Designation,
                    'No. of days Attendance Marked': AttendanceMarked,
                    'Average Working Hours': WorkingHours,
                    'In Time Avg': InTimeAvg,
                    'Out Time Avg': OutTimeAvg,
                    Month,
                    Year
                } = row;

                const divisionText = Division.toString(); 
                const wingText = Wing.toString();

                console.log(row);

                const formattedWorkingHours = formatTime(WorkingHours);
                const formattedInTimeAvg = formatTime(InTimeAvg);
                const formattedOutTimeAvg = formatTime(OutTimeAvg);

                const request = conn.request();
                request.input("EmpId", sql.Int, EmpId);
                request.input("Wing", sql.NVarChar, wingText);
                request.input("Division", sql.NVarChar, divisionText);
                request.input("EmpName", sql.NVarChar, EmpName);
                request.input("Designation", sql.NVarChar, Designation);
                request.input("AttendanceMarked", sql.Int, AttendanceMarked);
                request.input("WorkingHours", sql.NVarChar, formattedWorkingHours);
                request.input("InTimeAvg", sql.NVarChar, formattedInTimeAvg); // Store as a string
                request.input("OutTimeAvg", sql.NVarChar, formattedOutTimeAvg); // Store as a string
                request.input("Month", sql.NVarChar, Month);
                request.input("Year", sql.Int, Year);
                request.input("file_id", sql.Int, fileId);

                try {
                    await new Promise((resolve, reject) => {
                        request.query(`
                            INSERT INTO exceldata (EmpId, Wing, Division, EmpName, Designation, AttendanceMarked, WorkingHours, InTimeAvg, OutTimeAvg, Month, Year, file_id)
                            VALUES (@EmpId, @Wing, @Division, @EmpName, @Designation, @AttendanceMarked, @WorkingHours, @InTimeAvg, @OutTimeAvg, @Month, @Year, @file_id)
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

async function downloadSampleDocument(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../attendance_document/Attendance_Sample.xlsx");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'Attendance_Sample.xlsx';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("Sample document not found on the server.");
            res.status(404).send({ message: "Sample document not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}





const attendanceTab = { getAttendance, createAttendance, downloadAttendance, 
    deleteAttendance, upload, storeCsvData, downloadSampleDocument };
export default attendanceTab;
