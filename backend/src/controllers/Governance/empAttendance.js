import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
// import moment from 'moment';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Emp_attendance";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Emp_attendance");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

// Server-side gate to match the frontend's Excel-only validation -- checks
// both extension and MIME type, since either alone can be spoofed by a
// client bypassing the UI (e.g. posting directly to the endpoint).
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
];

function excelFileFilter(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extOk = ALLOWED_EXTENSIONS.includes(ext);
    if (extOk && mimeOk) {
        return callback(null, true);
    }
    return callback(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed.'));
}

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: excelFileFilter,
});

// Wraps upload.single('file') so a fileFilter/size rejection returns a
// clean 400 JSON response instead of falling through unhandled -- there's
// no global multer/Express error handler elsewhere in this app.
function uploadSingleFile(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'File upload failed.' });
        }
        next();
    });
}


async function getEmpAttendance(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT 
        tbl_employee_attendance.ID,
        tbl_employee_attendance.Emp_Id,
        tbl_employee_attendance.No_of_days_Attendance_Marked,
        tbl_employee_attendance.In_Time_Avg,
        tbl_employee_attendance.Out_Time_Avg,
        tbl_employee_attendance.Average_Working_Hours,
        tbl_employee_attendance.Month,
        tbl_employee_attendance.Year,
        tbl_employee_attendance.week,
        tbl_employee_attendance.File_Id,
        mmt_employee_info.Emp_Name,
        mmt_employee_info.Designation,
        mmt_organization_info.wing_name,
        mmt_organization_info.division_name
    FROM 
        sagarmanthan_revamp.dbo.tbl_employee_attendance
    INNER JOIN 
        sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
    INNER JOIN 
        sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
    ORDER BY File_Id,ID;
    ;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function createEmpAttendance(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const week = req.body.week;
        const uniqueFileName = req.uniqueFileName;

        const checkRequest = conn.request();
        checkRequest.input("month", sql.NVarChar, month);
        checkRequest.input("financialYear", sql.NVarChar, financialYear);
        checkRequest.input("week", sql.Int, week);
        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_employee_attendance 
            WHERE Month = @month AND Year = @financialYear AND week = @week;
        `);

        const maxIdRequest = conn.request();
        maxIdRequest.input("month", sql.NVarChar, month);
        maxIdRequest.input("financialYear", sql.NVarChar, financialYear);
        maxIdRequest.input("week", sql.Int, week);
        const storedFileID = await maxIdRequest.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_employee_attendance  
            WHERE Month = @month AND Year = @financialYear AND week = @week;
        `);
        const replaceFileID = storedFileID.recordset[0].File_Id;

        if (checkResult.recordset[0].count > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year and month. Do you want to replace it ?", replaceFileID: replaceFileID });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(normalizeHeader(header))));

        const requiredHeaders = [
            { key: 'Emp Id', norm: ['empid', 'emp_id', 'id'] },
            { key: 'No. of days Attendance Marked', norm: ['attendancemarked', 'daysmarked', 'daysattendancemarked', 'noofdaysattendancemarked', 'attendance', 'marked'] },
            { key: 'In Time Avg', norm: ['intimeavg', 'intime', 'in'] },
            { key: 'Out Time Avg', norm: ['outtimeavg', 'outtime', 'out'] },
            { key: 'Average Working Hours', norm: ['workinghours', 'averageworkinghours', 'working'] }
        ];

        const missingHeaders = requiredHeaders.filter(req => !req.norm.some(n => headers.has(n))).map(req => req.key);

        if (missingHeaders.length > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(400).json({ error: `Missing or Mismatched headers: ${missingHeaders.join(', ')}` });
        }

        let rowIndex = 0;

        // Trim and normalize all header names in data
        const trimmedData = data.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                const normKey = normalizeHeader(header);
                let standardKey = header.trim();
                if (['empid', 'emp_id'].includes(normKey) || (normKey === 'id' && !header.toLowerCase().includes('name'))) standardKey = 'Emp Id';
                else if (['attendancemarked', 'daysmarked', 'daysattendancemarked', 'noofdaysattendancemarked', 'attendance', 'marked'].includes(normKey)) standardKey = 'No. of days Attendance Marked';
                else if (['intimeavg', 'intime'].includes(normKey)) standardKey = 'In Time Avg';
                else if (['outtimeavg', 'outtime'].includes(normKey)) standardKey = 'Out Time Avg';
                else if (['workinghours', 'averageworkinghours', 'working'].includes(normKey)) standardKey = 'Average Working Hours';

                trimmedRow[standardKey] = row[header];
            });
            return trimmedRow;
        });

        // Duplicate-EmpId check runs once over the whole dataset, not once
        // per row -- previously this was nested inside the row loop below
        // and re-scanned all rows on every iteration (O(n^2) for no reason,
        // since the result is identical regardless of which row triggered it).
        const empIds = new Set();
        const duplicateEmpIds = [];
        for (const row of trimmedData) {
            const EmpId = row['Emp Id'];
            if (empIds.has(EmpId)) {
                duplicateEmpIds.push(EmpId);
            } else {
                empIds.add(EmpId);
            }
        }
        if (duplicateEmpIds.length > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(410).json({ error: `Duplicate/Empty EmpIds found ${duplicateEmpIds.join(', ')}` });
        }

        // Process each row in trimmedData
        for (const row of trimmedData) {
            rowIndex++;
            const { 'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

            const empIdNum = Number(EmpId);
            if (EmpId === undefined || EmpId === null || isNaN(empIdNum)) {
                deleteFile(req.file, req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid Emp Id format (must be numeric)', row: (rowIndex+1) });
            }

            const markedInt = parseInt(AttendanceMarked, 10);
            if (isNaN(markedInt)) {
                deleteFile(req.file, req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid No. of days Attendance Marked', row: (rowIndex+1) });
            }

            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (!timeRegex.test(formatTime(InTimeAvg)) || !timeRegex.test(formatTime(OutTimeAvg)) || !timeRegex.test(formatTime(WorkingHours))) {
                deleteFile(req.file, req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid time format', row: (rowIndex+1) });
            }
        }

        // Batch employee existence check: one query for all Emp Ids in the
        // file instead of one SELECT per row (previously up to N sequential
        // round-trips for an N-row upload).
        const uniqueEmpRows = new Map(); // EmpId -> { EmpName, Designation }
        for (const row of trimmedData) {
            const EmpId = String(row['Emp Id']);
            if (!uniqueEmpRows.has(EmpId)) {
                uniqueEmpRows.set(EmpId, {
                    EmpName: row['Emp Name'] || row.EmpName || row['EMP Name'] || 'Employee ' + EmpId,
                    Designation: row.Designation || 'Staff',
                });
            }
        }
        const allEmpIds = [...uniqueEmpRows.keys()];

        // From here on, every insert (employee auto-register, file record,
        // attendance rows) happens inside one transaction, so a failure
        // partway through rolls everything back instead of leaving an
        // orphaned file record with no attendance rows (as happened when
        // the bulk-insert type mismatch was failing after the file record
        // had already been committed separately).
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        if (allEmpIds.length > 0) {
            const checkExistingRequest = transaction.request();
            const empIdParams = allEmpIds.map((id, i) => {
                const paramName = `empId${i}`;
                checkExistingRequest.input(paramName, sql.NVarChar, id);
                return `@${paramName}`;
            });
            const existingResult = await checkExistingRequest.query(`
                SELECT Emp_Id FROM mmt_employee_info WHERE Emp_Id IN (${empIdParams.join(', ')})
            `);
            const existingEmpIds = new Set(existingResult.recordset.map(r => String(r.Emp_Id)));
            const missingEmpIds = allEmpIds.filter(id => !existingEmpIds.has(id));

            if (missingEmpIds.length > 0) {
                try {
                    const CHUNK_SIZE = 500;
                    for (let start = 0; start < missingEmpIds.length; start += CHUNK_SIZE) {
                        const chunk = missingEmpIds.slice(start, start + CHUNK_SIZE);
                        const insertRequest = transaction.request();
                        const valueClauses = chunk.map((id, i) => {
                            const info = uniqueEmpRows.get(id);
                            insertRequest.input(`empId${i}`, sql.NVarChar(255), id);
                            insertRequest.input(`empName${i}`, sql.NVarChar(255), String(info.EmpName));
                            insertRequest.input(`designation${i}`, sql.NVarChar(255), String(info.Designation));
                            insertRequest.input(`orgId${i}`, sql.Int, 1);
                            return `(@empId${i}, @empName${i}, @designation${i}, @orgId${i})`;
                        });
                        await insertRequest.query(`
                            INSERT INTO mmt_employee_info (Emp_Id, Emp_Name, Designation, organization_id)
                            VALUES ${valueClauses.join(', ')}
                        `);
                    }
                } catch (autoRegErr) {
                    console.warn("Auto-register employee info notice:", autoRegErr.message);
                }
            }
        }
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        const fileInsertRequest = transaction.request();
        fileInsertRequest.input("fileName", sql.NVarChar, uniqueFileName);
        fileInsertRequest.input("userID", sql.NVarChar, userID);
        fileInsertRequest.input("uploadDate", sql.DateTime, formattedDate);
        await fileInsertRequest.query(`
            INSERT INTO tbl_emp_attendance_file 
            (file_name, uploaded_by ,date_of_upload ) 
            VALUES (@fileName, @userID, @uploadDate)
        `);

        // Retrieve the ID of the inserted record
        const fileIdLookupRequest = transaction.request();
        fileIdLookupRequest.input("fileName", sql.NVarChar, uniqueFileName);
        const fileIdQuery = await fileIdLookupRequest.query(`
            SELECT TOP (1) ID
            FROM tbl_emp_attendance_file
            WHERE file_name = @fileName 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        const ATTENDANCE_CHUNK_SIZE = 500;
        for (let start = 0; start < trimmedData.length; start += ATTENDANCE_CHUNK_SIZE) {
            const chunk = trimmedData.slice(start, start + ATTENDANCE_CHUNK_SIZE);
            const attendanceInsertRequest = transaction.request();
            const valueClauses = chunk.map((row, i) => {
                const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

                const formattedWorkingHours = formatTime(WorkingHours);
                const formattedInTimeAvg = formatTime(InTimeAvg);
                const formattedOutTimeAvg = formatTime(OutTimeAvg);

                attendanceInsertRequest.input(`empId${i}`, sql.NVarChar(sql.MAX), String(EmpId));
                attendanceInsertRequest.input(`daysMarked${i}`, sql.Int, Number(AttendanceMarked) || 0);
                attendanceInsertRequest.input(`inTimeAvg${i}`, sql.VarChar(20), formattedInTimeAvg);
                attendanceInsertRequest.input(`outTimeAvg${i}`, sql.VarChar(20), formattedOutTimeAvg);
                attendanceInsertRequest.input(`avgWorkingHours${i}`, sql.VarChar(20), formattedWorkingHours);
                attendanceInsertRequest.input(`month${i}`, sql.NVarChar(20), month);
                attendanceInsertRequest.input(`year${i}`, sql.Int, Number(financialYear));
                attendanceInsertRequest.input(`week${i}`, sql.Int, Number(week));
                attendanceInsertRequest.input(`fileId${i}`, sql.Int, fileId);

                return `(@empId${i}, @daysMarked${i}, @inTimeAvg${i}, @outTimeAvg${i}, @avgWorkingHours${i}, @month${i}, @year${i}, @week${i}, @fileId${i})`;
            });

            await attendanceInsertRequest.query(`
                INSERT INTO tbl_employee_attendance
                (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, week, File_Id)
                VALUES ${valueClauses.join(', ')}
            `);
        }

        await transaction.commit();

        res.status(200).json({
            message: "Attendance record created successfully",
        });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Transaction rollback failed:", rollbackErr);
            }
        }
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function updateEmpAttendance(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const week = req.body.week;
        const FileId = req.body.fileId;
        const userID = req.body.userID;

        const uniqueFileName = req.uniqueFileName;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const requiredHeaders = ['Emp Id', 'No. of days Attendance Marked', 'In Time Avg', 'Out Time Avg', 'Average Working Hours'];
        // const headers = Object.keys(data[0]);
        // const headers = Object.keys(data[0]).map(header => header.trim());

        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(header.trim())));
        // Check for missing or mismatched headers
        const missingHeaders = requiredHeaders.filter(header => !headers.has(header));

        // Check for missing headers
        // const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            deleteFile(req.uniqueFileName);
            return res.status(400).json({ error: `Missing  or Mismatched headers: ${missingHeaders.join(', ')}` });
        }

        let rowIndex = 0;

        // Trim all header names in data
        const trimmedData = data.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                trimmedRow[header.trim()] = row[header];
            });
            return trimmedRow;
        });

        // Duplicate-EmpId check runs once over the whole dataset (previously
        // nested inside the row loop below, re-scanning all rows on every
        // iteration for an identical result each time).
        const empIds = new Set();
        const duplicateEmpIds = [];
        for (const row of trimmedData) {
            const EmpId = row['Emp Id'];
            if (empIds.has(EmpId)) {
                duplicateEmpIds.push(EmpId);
            } else {
                empIds.add(EmpId);
            }
        }
        if (duplicateEmpIds.length > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(410).json({ error: `Duplicate/Empty Emp-Ids found ${duplicateEmpIds.join(', ')}` });
        }

        for (const row of trimmedData) {
            rowIndex++;
            const { 'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

            // Validate EmpId. Excel numeric-looking cells parse as JS
            // numbers (not strings) unless the cell is explicitly
            // Text-formatted, so this checks numeric validity rather than
            // JS type -- matching createEmpAttendance's check, which this
            // function previously contradicted (it required typeof
            // 'string', silently rejecting perfectly valid numeric Emp Ids
            // that createEmpAttendance would have accepted).
            const empIdNum = Number(EmpId);
            if (EmpId === undefined || EmpId === null || isNaN(empIdNum)) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid Emp Id format (must be numeric)', row: (rowIndex+1) });
            }
        
            // Validate No. of days Attendance Marked. parseInt handles both
            // numeric-string and number forms; Number.isInteger (the old
            // check here) rejected numeric strings outright.
            const markedInt = parseInt(AttendanceMarked, 10);
            if (isNaN(markedInt)) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid No. of days Attendance Marked', row: (rowIndex+1)   });
            }
        
            // Validate time formats
            const timeRegex = /^\d{2}:\d{2}:\d{2}$/ ;
            if (!timeRegex.test(formatTime(InTimeAvg)) || !timeRegex.test(formatTime(OutTimeAvg)) || !timeRegex.test(formatTime(WorkingHours))) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid time format', row: (rowIndex+1) });
            }
        
        }

        // Batch employee existence check: one query for all Emp Ids in the
        // file instead of one SELECT per row (previously up to N sequential
        // round-trips for an N-row upload).
        const allUpdateEmpIds = [...empIds];
        if (allUpdateEmpIds.length > 0) {
            const checkExistingRequest = conn.request();
            const empIdParams = allUpdateEmpIds.map((id, i) => {
                const paramName = `empId${i}`;
                checkExistingRequest.input(paramName, sql.NVarChar, String(id));
                return `@${paramName}`;
            });
            const existingResult = await checkExistingRequest.query(`
                SELECT Emp_Id FROM mmt_employee_info WHERE Emp_Id IN (${empIdParams.join(', ')})
            `);
            const existingEmpIds = new Set(existingResult.recordset.map(r => String(r.Emp_Id)));
            const missingEmpIds = allUpdateEmpIds.filter(id => !existingEmpIds.has(String(id)));

            if (missingEmpIds.length > 0) {
                deleteFile(req.uniqueFileName);
                return res.status(402).json({ error: `Employee ID(s) not found in the employee table: ${missingEmpIds.join(', ')}`, EmpId: missingEmpIds[0] });
            }
        }

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileNameRequest = conn.request();
        fileNameRequest.input("FileId", sql.Int, Number(FileId));
        const fileName = await fileNameRequest.query(`
            SELECT file_name FROM tbl_emp_attendance_file
            WHERE id = @FileId;
        `);

        const deleteFileName = fileName.recordset[0].file_name;
        deleteFile(deleteFileName);

        // From here on, deleting the old attendance rows, updating the file
        // record, and inserting the new rows all happen inside one
        // transaction -- a failure partway through would otherwise be able
        // to leave the old rows deleted with no replacement, or the file
        // record renamed with stale/missing row data.
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        const deleteAttendanceRequest = transaction.request();
        deleteAttendanceRequest.input("FileId", sql.Int, Number(FileId));
        await deleteAttendanceRequest.query(`
            DELETE FROM tbl_employee_attendance
            WHERE File_Id = @FileId;
        `);

        const updateFileRequest = transaction.request();
        updateFileRequest.input("fileName", sql.NVarChar, uniqueFileName);
        updateFileRequest.input("userID", sql.NVarChar, userID);
        updateFileRequest.input("uploadDate", sql.DateTime, formattedDate);
        updateFileRequest.input("FileId", sql.Int, Number(FileId));
        await updateFileRequest.query(`
            UPDATE tbl_emp_attendance_file
            SET file_name = @fileName,
            uploaded_by = @userID,
            date_of_upload = @uploadDate
            WHERE id = @FileId; 
        `);

        // Batch row insert: chunked parameterized multi-row INSERT instead
        // of one INSERT round-trip per row.
        const UPDATE_CHUNK_SIZE = 500;
        for (let start = 0; start < trimmedData.length; start += UPDATE_CHUNK_SIZE) {
            const chunk = trimmedData.slice(start, start + UPDATE_CHUNK_SIZE);
            const attendanceInsertRequest = transaction.request();
            const valueClauses = chunk.map((row, i) => {
                const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

                const formattedWorkingHours = formatTime(WorkingHours);
                const formattedInTimeAvg = formatTime(InTimeAvg);
                const formattedOutTimeAvg = formatTime(OutTimeAvg);

                attendanceInsertRequest.input(`empId${i}`, sql.NVarChar(sql.MAX), String(EmpId));
                attendanceInsertRequest.input(`daysMarked${i}`, sql.Int, Number(AttendanceMarked) || 0);
                attendanceInsertRequest.input(`inTimeAvg${i}`, sql.VarChar(20), formattedInTimeAvg);
                attendanceInsertRequest.input(`outTimeAvg${i}`, sql.VarChar(20), formattedOutTimeAvg);
                attendanceInsertRequest.input(`avgWorkingHours${i}`, sql.VarChar(20), formattedWorkingHours);
                attendanceInsertRequest.input(`month${i}`, sql.NVarChar(20), month);
                attendanceInsertRequest.input(`year${i}`, sql.Int, Number(financialYear));
                attendanceInsertRequest.input(`week${i}`, sql.Int, Number(week));
                attendanceInsertRequest.input(`fileId${i}`, sql.Int, Number(FileId));

                return `(@empId${i}, @daysMarked${i}, @inTimeAvg${i}, @outTimeAvg${i}, @avgWorkingHours${i}, @month${i}, @year${i}, @week${i}, @fileId${i})`;
            });

            await attendanceInsertRequest.query(`
                INSERT INTO tbl_employee_attendance
                (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, week, File_Id)
                VALUES ${valueClauses.join(', ')}
            `);
        }

        await transaction.commit();

        res.status(200).json({
            message: "Attendance record created successfully",
        });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Transaction rollback failed:", rollbackErr);
            }
        }
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

function formatTime(timeValue) {
    if (timeValue === null || timeValue === undefined || timeValue === '') return '00:00:00';
    if (typeof timeValue === 'number' && !isNaN(timeValue)) {
        const absVal = Math.abs(timeValue);
        const totalSeconds = Math.round(absVal < 1 ? absVal * 24 * 3600 : absVal * 3600);

        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }
    let str = String(timeValue).trim().replace(/\./g, ':');
    if (str.length === 5 && str.includes(':')) str += ':00';
    if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;
    if (/^\d{1}:\d{2}:\d{2}$/.test(str)) return '0' + str;
    return '00:00:00';
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

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `fileuploads/Emp_attendance/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}


//Add user function
async function addEmpDataAttendance(req, res) {
    const empId = req.body.empId;
    const empName = req.body.empName;
    const designation = req.body.designation;
    const wing = req.body.wing;
    const division = req.body.division;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("empId", empId);
        request.input("empName", empName);
        request.input("designation", designation);
        request.input("wing", wing);
        request.input("division", division);

        const orgIDResult = await request.query(`
            SELECT organization_id from mmt_organization_info 
            WHERE wing_id = @wing AND division_id = @division
        `);

        const organizationID = orgIDResult.recordset[0].organization_id;

        request.input("organizationID", organizationID);

        const insertQuery = `
            INSERT INTO mmt_employee_info (
                Emp_Id, Emp_Name, Designation, organization_id
            )
            VALUES (
                @empId, @empName, @designation, @organizationID
            )
        `;

        await request.query(insertQuery);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function agSample(req, res) {
    try {
        const conn = await pool;  
      // Query the database
      const result = await conn.query(`SELECT 
                --ROW_NUMBER() OVER (ORDER BY Year DESC, MonthNumber DESC, ID) AS [S No],
                Emp_Id AS [EMP ID],
                (SELECT TOP 1 Emp_Name FROM sagarmanthan_revamp.dbo.mmt_employee_info WHERE Emp_Id = tbl_employee_attendance.Emp_Id) AS [EMP Name],
                (SELECT TOP 1 Designation FROM sagarmanthan_revamp.dbo.mmt_employee_info WHERE Emp_Id = tbl_employee_attendance.Emp_Id) AS Designation,
                (SELECT TOP 1 wing_name FROM sagarmanthan_revamp.dbo.mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM sagarmanthan_revamp.dbo.mmt_employee_info WHERE Emp_Id = tbl_employee_attendance.Emp_Id)) AS [Wing],
                (SELECT TOP 1 division_name FROM sagarmanthan_revamp.dbo.mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM sagarmanthan_revamp.dbo.mmt_employee_info WHERE Emp_Id = tbl_employee_attendance.Emp_Id)) AS [Division],
                No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                Average_Working_Hours AS [Average Working Hours],
                In_Time_Avg AS [In Time Avg],
                Out_Time_Avg AS [Out Time Avg],
                Month,
                Year,
            CASE
                WHEN week = 1 THEN 'Week 1'
                WHEN week = 2 THEN 'Week 2'
                WHEN week = 3 THEN 'Week 3'
                WHEN week = 4 THEN 'Week 4'
                WHEN week = 5 THEN 'Week 5'
                ELSE 'Unknown Week'
              END AS Week
            FROM 
                sagarmanthan_revamp.dbo.tbl_employee_attendance
            CROSS APPLY (
                SELECT 
                    CASE 
                        WHEN tbl_employee_attendance.Month = 'January' THEN 1
                        WHEN tbl_employee_attendance.Month = 'February' THEN 2
                        WHEN tbl_employee_attendance.Month = 'March' THEN 3
                        WHEN tbl_employee_attendance.Month = 'April' THEN 4
                        WHEN tbl_employee_attendance.Month = 'May' THEN 5
                        WHEN tbl_employee_attendance.Month = 'June' THEN 6
                        WHEN tbl_employee_attendance.Month = 'July' THEN 7
                        WHEN tbl_employee_attendance.Month = 'August' THEN 8
                        WHEN tbl_employee_attendance.Month = 'September' THEN 9
                        WHEN tbl_employee_attendance.Month = 'October' THEN 10
                        WHEN tbl_employee_attendance.Month = 'November' THEN 11
                        ELSE 12
                    END AS MonthNumber
            ) AS MonthNumbers
            ORDER BY Year DESC ,MonthNumber DESC, week DESC, ID;`);
   
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

    res.json({ columnDefs, rowData });


    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
    
  }

  async function getEmployeeAttendance(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT 
                --ROW_NUMBER() OVER (ORDER BY tbl_emp_attendance_file.id) AS [S No],
                file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
                tbl_emp_attendance_file.date_of_upload AS [Date of Upload]
                --FORMAT(CONVERT(datetime, tbl_emp_attendance_file.date_of_upload), 'dd-MM-yyyy') AS [Date of Upload]
                FROM tbl_emp_attendance_file
                INNER JOIN tbl_user ON tbl_emp_attendance_file.uploaded_by = tbl_user.user_id;
        `);

        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
        }
    
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });

    
    } catch (error) {
        return res.sendStatus(500);
    }
}
  


const empAttendanceTab = { createEmpAttendance, upload, uploadSingleFile, addEmpDataAttendance,
    getEmployeeAttendance, updateEmpAttendance, getEmpAttendance, agSample };
export default empAttendanceTab;
