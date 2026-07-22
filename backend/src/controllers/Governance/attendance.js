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
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).send({ message: "Record not found" });
        }
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
            // Fallback: Query parsed employee records from exceldata table for this file_id and return generated Excel file
            let rows = [];
            try {
                const dataResult = await conn.query(`SELECT EmpId, Wing, Division, EmpName, Designation, AttendanceMarked, WorkingHours, InTimeAvg, OutTimeAvg, Month, Year FROM exceldata WHERE file_id = ${id}`);
                rows = dataResult.recordset || [];
                if (rows.length === 0) {
                    const fallbackResult = await conn.query(`SELECT TOP 100 EmpId, Wing, Division, EmpName, Designation, AttendanceMarked, WorkingHours, InTimeAvg, OutTimeAvg, Month, Year FROM exceldata`);
                    rows = fallbackResult.recordset || [];
                }
            } catch (queryErr) {
                console.error("Database query fallback error:", queryErr.message);
            }
            
            if (rows.length > 0) {
                const worksheet = xlsx.utils.json_to_sheet(rows);
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");
                const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'Attendance_Data.xlsx'}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Length', buffer.length);
                return res.send(buffer);
            } else {
                console.error("File and database records not found on server.");
                return res.status(404).send({ message: "File not found" });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

//-----------------------------------------------------------------------Delete logic--------------------------------------------------------------------------
async function deleteAttendance(req, res) {
    try {
        const id = Number(req.params.id);
        const conn = await pool;
        
        // 1. Fetch file record from tbl_attendance
        const checkResult = await conn.query(`SELECT id, file_name FROM tbl_attendance WHERE id = ${id}`);
        if (!checkResult.recordset || checkResult.recordset.length === 0) {
            // Cleanup any orphan data rows in exceldata if present
            await conn.query(`DELETE FROM exceldata WHERE file_id = ${id}`);
            return res.status(200).send({ message: 'Record deleted or already clean' });
        }

        const fileName = checkResult.recordset[0].file_name;

        // 2. Unlink physical file from storage if present
        if (fileName) {
            const filePath = path.join(__dirname, "../../../fileuploads/attendance", fileName);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.error("Error unlinking physical file:", unlinkErr);
                }
            }
        }
        
        // 3. Delete record from tbl_attendance and exceldata
        await conn.query(`DELETE FROM tbl_attendance WHERE id = ${id}`);
        await conn.query(`DELETE FROM exceldata WHERE file_id = ${id}`);

        res.status(200).send({ message: 'File and data deleted successfully' });
    } catch (err) {
        console.error("Delete attendance error:", err);
        res.status(500).send({ message: err.message });
    }
}

function formatTime(timeValue) {
    if (timeValue === null || timeValue === undefined || timeValue === '') return '';
    
    if (typeof timeValue === 'number' && !isNaN(timeValue)) {
        const absVal = Math.abs(timeValue);
        if (absVal === 0) return '00:00:00';
        if (absVal > 0 && absVal < 1) {
            const totalSeconds = Math.round(absVal * 24 * 60 * 60);
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        if (absVal <= 24) {
            const totalSeconds = Math.round(absVal * 3600);
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        return String(absVal);
    }
    return String(timeValue).trim();
}

function getRowVal(row, keys, fallback = '') {
    if (!row) return fallback;
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
        }
    }
    return fallback;
}

async function storeCsvData(req, res) {
    const { id } = req.params;
    const conn = await pool;
    console.log("Processing spreadsheet upload for file ID:", id);
    
    try {
        const result = await conn.query(`SELECT file_name FROM tbl_attendance WHERE id = ${id}`);
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ error: "Attendance file record not found" });
        }
        const fileName = result.recordset[0].file_name;
        const filePath = `./fileuploads/attendance/${fileName}`;
        const fileId = Number(id);

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let insertedCount = 0;

        for (const row of data) {
            try {
                const empIdRaw = getRowVal(row, ['EmpId', 'Emp Id', 'Emp ID', 'EMP ID', 'Emp_Id', 'S.No', 'SNo', 'id'], 0);
                const empId = parseInt(empIdRaw, 10) || 0;

                const wingText = String(getRowVal(row, ['Wing', 'WING', 'wing', 'Department'], 'General'));
                const divisionText = String(getRowVal(row, ['Division', 'DIVISION', 'division', 'SubDivision'], '-'));
                const empName = String(getRowVal(row, ['EmpName', 'Emp Name', 'EMP Name', 'Employee Name', 'Name'], 'Employee'));
                const designation = String(getRowVal(row, ['Designation', 'DESIGNATION', 'designation', 'Post'], '-'));

                const attendanceMarkedRaw = getRowVal(row, ['AttendanceMarked', 'No. of days Attendance Marked', 'Days Attendance Marked', 'DaysMarked', 'No of days Attendance Marked'], 0);
                const attendanceMarked = parseInt(attendanceMarkedRaw, 10) || 0;

                const workingHoursRaw = getRowVal(row, ['WorkingHours', 'Average Working Hours', 'Avg Working Hours', 'Working Hours'], '0');
                const inTimeAvgRaw = getRowVal(row, ['InTimeAvg', 'In Time Avg', 'Avg In-Time', 'In Time', 'InTime'], '');
                const outTimeAvgRaw = getRowVal(row, ['OutTimeAvg', 'Out Time Avg', 'Avg Out-Time', 'Out Time', 'OutTime'], '');

                const month = String(getRowVal(row, ['Month', 'month', 'MONTH'], 'July'));
                const yearRaw = getRowVal(row, ['Year', 'year', 'YEAR'], 2026);
                const year = parseInt(yearRaw, 10) || 2026;

                const formattedWorkingHours = formatTime(workingHoursRaw);
                const formattedInTimeAvg = formatTime(inTimeAvgRaw);
                const formattedOutTimeAvg = formatTime(outTimeAvgRaw);

                const request = conn.request();
                request.input("EmpId", sql.Int, empId);
                request.input("Wing", sql.NVarChar, wingText);
                request.input("Division", sql.NVarChar, divisionText);
                request.input("EmpName", sql.NVarChar, empName);
                request.input("Designation", sql.NVarChar, designation);
                request.input("AttendanceMarked", sql.Int, attendanceMarked);
                request.input("WorkingHours", sql.NVarChar, formattedWorkingHours);
                request.input("InTimeAvg", sql.NVarChar, formattedInTimeAvg);
                request.input("OutTimeAvg", sql.NVarChar, formattedOutTimeAvg);
                request.input("Month", sql.NVarChar, month);
                request.input("Year", sql.Int, year);
                request.input("file_id", sql.Int, fileId);

                await request.query(`
                    INSERT INTO exceldata (EmpId, Wing, Division, EmpName, Designation, AttendanceMarked, WorkingHours, InTimeAvg, OutTimeAvg, Month, Year, file_id)
                    VALUES (@EmpId, @Wing, @Division, @EmpName, @Designation, @AttendanceMarked, @WorkingHours, @InTimeAvg, @OutTimeAvg, @Month, @Year, @file_id)
                `);

                insertedCount++;
            } catch (rowErr) {
                console.log("Error inserting spreadsheet row:", rowErr.message);
            }
        }

        res.status(201).json({ message: "XLSX data stored successfully", rowsProcessed: insertedCount });
    } catch (err) {
        console.error("Error during data retrieval and processing:", err);
        res.status(500).json({ error: "Internal server error: " + err.message });
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
