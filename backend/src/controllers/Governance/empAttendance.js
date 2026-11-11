import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { readPeriod } from './eOfficePeriod.js';
import { spreadsheetFileFilter, singleSpreadsheet } from './eOfficeUpload.js';

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

// Only spreadsheets (extension and type), as for E-Office
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: spreadsheetFileFilter,
});

// upload.single('file') with a 400 for a refused or missing file (QC AT-09)
const uploadSingleFile = singleSpreadsheet(upload);


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
        tbl_employee_attendance
    INNER JOIN
        mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
    INNER JOIN
        mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
    ORDER BY File_Id,ID;
    ;`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// ---------- Reading an uploaded attendance sheet ----------
// One rule for add and replace (QC AT-09), the same column names the upload page accepts.
const COLUMNS = [
    { key: 'Emp Id', names: ['empid', 'employeeid'] },
    { key: 'No. of days Attendance Marked', names: ['noofdaysattendancemarked', 'daysmarked', 'attendancemarked'] },
    { key: 'In Time Avg', names: ['intimeavg', 'intime'] },
    { key: 'Out Time Avg', names: ['outtimeavg', 'outtime'] },
    { key: 'Average Working Hours', names: ['averageworkinghours', 'workinghours'] },
];
const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

// A time from the sheet as HH:MM:SS, or null when it can't be read (QC AT-03: an unreadable time
// used to be saved as 00:00:00). Excel times arrive as a fraction of a day; hours as a number.
function parseTime(value) {
    if (isBlank(value)) return null;
    let seconds;
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) return null;
        seconds = Math.round(value < 1 ? value * 24 * 3600 : value * 3600);
    } else {
        const m = String(value).trim().replace(/\./g, ':').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return null;
        const [h, min, s = 0] = [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
        if (min > 59 || s > 59) return null;
        seconds = h * 3600 + min * 60 + s;
    }
    if (seconds >= 24 * 3600) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

// Row numbers as a short list for a message
const rowList = (rows, max = 8) => (rows.length <= max ? rows.join(', ') : `${rows.slice(0, max).join(', ')} and ${rows.length - max} more`);

// { rows: [{ empId, days, inTime, outTime, hours }] } or { error }
function readAttendanceSheet(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const headerOf = {};
    for (const row of data) {
        for (const header of Object.keys(row)) {
            const col = COLUMNS.find((c) => c.names.includes(normalizeHeader(header)));
            if (col && !headerOf[col.key]) headerOf[col.key] = header;
        }
    }
    const missing = COLUMNS.filter((c) => !headerOf[c.key]).map((c) => c.key);
    if (missing.length) return { error: `Missing or mismatched headers: ${missing.join(', ')}` };

    // Skip rows that are empty (cells left with only spaces or formatting), as the upload page does
    const sheetRows = data.filter((row) => Object.values(row).some((v) => !isBlank(v)));
    if (!sheetRows.length) return { error: 'The sheet has no rows.' };

    const problems = { empId: [], days: [], time: [], order: [] };
    const seen = new Set();
    const duplicates = new Set();
    const rows = sheetRows.map((row) => {
        const excelRow = (row.__rowNum__ ?? 0) + 1;
        const empId = isBlank(row[headerOf['Emp Id']]) ? '' : String(row[headerOf['Emp Id']]).trim();
        if (!empId) problems.empId.push(excelRow);
        else if (seen.has(empId)) duplicates.add(empId);
        else seen.add(empId);

        const daysRaw = row[headerOf['No. of days Attendance Marked']];
        const days = Number(daysRaw);
        if (isBlank(daysRaw) || !Number.isInteger(days) || days < 0 || days > 31) problems.days.push(excelRow);

        const inTime = parseTime(row[headerOf['In Time Avg']]);
        const outTime = parseTime(row[headerOf['Out Time Avg']]);
        const hours = parseTime(row[headerOf['Average Working Hours']]);
        if (!inTime || !outTime || !hours) problems.time.push(excelRow);
        // Someone who attended can't leave before arriving (an absent employee has 00:00:00)
        else if (days > 0 && inTime !== '00:00:00' && outTime !== '00:00:00' && outTime < inTime) problems.order.push(excelRow);

        return { empId, days, inTime, outTime, hours };
    });

    const errors = [];
    if (problems.empId.length) errors.push(`Emp Id is missing in row(s) ${rowList(problems.empId)}.`);
    if (duplicates.size) errors.push(`Emp Id(s) given more than once: ${rowList([...duplicates])}.`);
    if (problems.days.length) errors.push(`No. of days Attendance Marked must be a whole number from 0 to 31 (row(s) ${rowList(problems.days)}).`);
    if (problems.time.length) errors.push(`In Time Avg, Out Time Avg and Average Working Hours must be times such as 09:30:00 (row(s) ${rowList(problems.time)}).`);
    if (problems.order.length) errors.push(`Out Time Avg is before In Time Avg in row(s) ${rowList(problems.order)}.`);
    if (errors.length) return { error: errors.join(' ') };
    return { rows };
}

// The Emp Ids in the sheet that the employee table doesn't have
async function unknownEmployees(request, empIds) {
    const params = empIds.map((id, i) => {
        request.input(`empId${i}`, sql.NVarChar, id);
        return `@empId${i}`;
    });
    const existing = await request.query(`SELECT Emp_Id FROM mmt_employee_info WHERE Emp_Id IN (${params.join(', ')})`);
    const known = new Set(existing.recordset.map((r) => String(r.Emp_Id)));
    return empIds.filter((id) => !known.has(id));
}

// Inserts the sheet's rows for one file and period, in chunks, inside the transaction
async function insertAttendanceRows(transaction, rows, { fileId, period, userID }) {
    const CHUNK = 500;
    for (let start = 0; start < rows.length; start += CHUNK) {
        const chunk = rows.slice(start, start + CHUNK);
        const request = transaction.request();
        request.input('month', sql.NVarChar(20), period.month);
        request.input('year', sql.Int, period.Year);
        request.input('week', sql.Int, period.week);
        request.input('fileId', sql.Int, fileId);
        request.input('createdBy', sql.Int, Number(userID) || null);
        const values = chunk.map((row, i) => {
            request.input(`empId${i}`, sql.NVarChar(sql.MAX), row.empId);
            request.input(`days${i}`, sql.Int, row.days);
            request.input(`in${i}`, sql.VarChar(20), row.inTime);
            request.input(`out${i}`, sql.VarChar(20), row.outTime);
            request.input(`hours${i}`, sql.VarChar(20), row.hours);
            return `(@empId${i}, @days${i}, @in${i}, @out${i}, @hours${i}, @month, @year, @week, @fileId, @createdBy, GETDATE())`;
        });
        await request.query(`
            INSERT INTO tbl_employee_attendance
            (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, week, File_Id, created_by, created_date)
            VALUES ${values.join(', ')}`);
    }
}

// The file already uploaded for a period, or null
async function fileForPeriod(request, period) {
    request.input('pYear', sql.Int, period.Year);
    request.input('pMonth', sql.NVarChar(20), period.month);
    request.input('pWeek', sql.Int, period.week);
    const result = await request.query(`
        SELECT MAX(File_Id) AS File_Id FROM tbl_employee_attendance
        WHERE Year = @pYear AND Month = @pMonth AND week = @pWeek`);
    return result.recordset[0]?.File_Id ?? null;
}

async function createEmpAttendance(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const userID = req.user.userId; // the uploader is the signed-in user, not a form value
        const uniqueFileName = req.uniqueFileName;

        // QC AT-01: a missing or wrong year / month / week is refused
        const period = readPeriod(req.body);
        if (period.error) {
            deleteFile(uniqueFileName);
            return res.status(400).json({ error: period.error });
        }

        const replaceFileID = await fileForPeriod(conn.request(), period);
        if (replaceFileID) {
            deleteFile(uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year and month. Do you want to replace it ?", replaceFileID });
        }

        const sheet = readAttendanceSheet(req.file.path);
        if (sheet.error) {
            deleteFile(uniqueFileName);
            return res.status(400).json({ error: sheet.error });
        }

        // Unknown Emp Ids are not added silently: the page asks for their details
        // (name, designation, wing, division), creates them, then uploads again (as 2.0 did)
        const empIds = sheet.rows.map((r) => r.empId);
        const missingEmpIds = await unknownEmployees(conn.request(), empIds);
        if (missingEmpIds.length) {
            deleteFile(uniqueFileName);
            return res.status(422).json({ error: `Employee ID(s) not found in the employee table: ${missingEmpIds.join(', ')}`, EmpId: missingEmpIds[0], missingEmpIds });
        }

        // The file record and its rows are saved together (one transaction)
        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const fileInsert = transaction.request();
        fileInsert.input("fileName", sql.NVarChar, uniqueFileName);
        fileInsert.input("userID", sql.Int, userID);
        const inserted = await fileInsert.query(`
            INSERT INTO tbl_emp_attendance_file (file_name, uploaded_by, date_of_upload)
            OUTPUT INSERTED.ID
            VALUES (@fileName, @userID, GETDATE())`);
        const fileId = inserted.recordset[0].ID;
        await insertAttendanceRows(transaction, sheet.rows, { fileId, period, userID });
        await transaction.commit();

        res.status(200).json({ message: "Attendance record created successfully" });
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
        res.status(500).json({ error: "The sheet could not be saved. Please try again." });
    }
}

// Replaces the sheet of an uploaded file (QC AT-02): the file must exist, the period must be free
// or already this file's, and the old spreadsheet is removed only after the new rows are saved.
async function updateEmpAttendance(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const userID = req.user.userId; // the uploader is the signed-in user, not a form value
        const uniqueFileName = req.uniqueFileName;

        const period = readPeriod(req.body);
        if (period.error) {
            deleteFile(uniqueFileName);
            return res.status(400).json({ error: period.error });
        }
        const fileId = Number(req.body.fileId);
        if (!Number.isInteger(fileId) || fileId <= 0) {
            deleteFile(uniqueFileName);
            return res.status(400).json({ error: 'The sheet to replace is missing.' });
        }
        const lookup = conn.request();
        lookup.input('fileId', sql.Int, fileId);
        const existing = (await lookup.query(`SELECT file_name FROM tbl_emp_attendance_file WHERE id = @fileId`)).recordset[0];
        if (!existing) {
            deleteFile(uniqueFileName);
            return res.status(404).json({ error: 'The sheet to replace no longer exists.' });
        }
        const periodFile = await fileForPeriod(conn.request(), period);
        if (periodFile && periodFile !== fileId) {
            deleteFile(uniqueFileName);
            return res.status(409).json({ error: `${period.month} ${period.Year} week ${period.week} already has another sheet.`, replaceFileID: periodFile });
        }

        const sheet = readAttendanceSheet(req.file.path);
        if (sheet.error) {
            deleteFile(uniqueFileName);
            return res.status(400).json({ error: sheet.error });
        }
        const empIds = sheet.rows.map((r) => r.empId);
        const missingEmpIds = await unknownEmployees(conn.request(), empIds);
        if (missingEmpIds.length) {
            deleteFile(uniqueFileName);
            return res.status(422).json({ error: `Employee ID(s) not found in the employee table: ${missingEmpIds.join(', ')}`, EmpId: missingEmpIds[0], missingEmpIds });
        }

        // Old rows out, file record updated and new rows in, together (one transaction)
        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const replaceRequest = transaction.request();
        replaceRequest.input("fileId", sql.Int, fileId);
        replaceRequest.input("fileName", sql.NVarChar, uniqueFileName);
        replaceRequest.input("userID", sql.Int, userID);
        await replaceRequest.query(`
            DELETE FROM tbl_employee_attendance WHERE File_Id = @fileId;
            UPDATE tbl_emp_attendance_file
            SET file_name = @fileName, uploaded_by = @userID, date_of_upload = GETDATE()
            WHERE id = @fileId;`);
        await insertAttendanceRows(transaction, sheet.rows, { fileId, period, userID });
        await transaction.commit();

        // Only now is the old spreadsheet no longer needed
        if (existing.file_name && existing.file_name !== uniqueFileName) deleteFile(existing.file_name);

        res.status(200).json({ message: "Attendance sheet replaced successfully" });
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
        res.status(500).json({ error: "The sheet could not be saved. Please try again." });
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

// Removes a stored sheet by its file name (kept inside the upload folder)
function deleteFile(fileName) {
    if (!fileName) return;
    const filePath = path.join(uploadDestination, path.basename(String(fileName)));
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.error('Attendance file could not be removed:', err.message);
    }
}

//Add user function
// Creates an employee that an uploaded sheet refers to (Attendance and E-Office): Emp Id,
// name, designation and the wing / division they work in (one mmt_organization_info unit)
async function addEmpDataAttendance(req, res) {
    const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
    const empId = text(req.body.empId);
    const empName = text(req.body.empName);
    const designation = text(req.body.designation);
    const wingId = Number(req.body.wing);
    const divisionId = Number(req.body.division);

    const missing = [!empId && 'Emp Id', !empName && 'Emp Name', !designation && 'Designation',
        !Number.isInteger(wingId) && 'Wing', !Number.isInteger(divisionId) && 'Division'].filter(Boolean);
    if (missing.length) {
        return res.status(400).json({ error: `Fill in: ${missing.join(', ')}` });
    }

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("empId", sql.NVarChar(255), empId);
        request.input("empName", sql.NVarChar(255), empName);
        request.input("designation", sql.NVarChar(255), designation);
        request.input("wing", sql.Int, wingId);
        request.input("division", sql.Int, divisionId);

        const existing = await request.query(`SELECT TOP 1 Emp_Id FROM mmt_employee_info WHERE Emp_Id = @empId`);
        if (existing.recordset.length) {
            return res.status(409).json({ error: `Emp Id ${empId} already exists` });
        }

        const orgIDResult = await request.query(`
            SELECT organization_id from mmt_organization_info 
            WHERE wing_id = @wing AND division_id = @division
        `);
        if (!orgIDResult.recordset.length) {
            return res.status(400).json({ error: 'That division does not belong to the chosen wing' });
        }
        request.input("organizationID", sql.Int, orgIDResult.recordset[0].organization_id);

        await request.query(`
            INSERT INTO mmt_employee_info (Emp_Id, Emp_Name, Designation, organization_id)
            VALUES (@empId, @empName, @designation, @organizationID)
        `);

        return res.status(201).json({ message: 'Employee created', empId });
    } catch (err) {
        console.error('Create employee error:', err.message);
        return res.sendStatus(500);
    }
}

// The wing / division units an employee can belong to (mmt_organization_info)
async function getEmployeeOrgUnits(req, res) {
    try {
        const result = await (await pool).request().query(`
            SELECT wing_id, LTRIM(RTRIM(wing_name)) AS wing_name, division_id, LTRIM(RTRIM(division_name)) AS division_name
            FROM mmt_organization_info
            ORDER BY wing_name, division_name
        `);
        return res.json(result.recordset);
    } catch (err) {
        console.error('Employee org units error:', err.message);
        return res.sendStatus(500);
    }
}

  async function getEmployeeAttendance(req, res) {
    const conn = await pool;

    try {
        // The id lets the page download or delete a file; a file whose uploader is no longer a
        // user is still listed (LEFT JOIN), newest first
        const result = await conn.query(`SELECT 
                tbl_emp_attendance_file.id,
                file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
                tbl_emp_attendance_file.date_of_upload AS [Date of Upload]
                FROM tbl_emp_attendance_file
                LEFT JOIN tbl_user ON tbl_emp_attendance_file.uploaded_by = tbl_user.user_id
                ORDER BY tbl_emp_attendance_file.id DESC;
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
  


const ATTENDANCE_FOLDER = path.join(process.cwd(), 'fileuploads/Emp_attendance');

// The stored sheet of an uploaded attendance file (by its id)
async function storedAttendanceFile(conn, id) {
    const request = conn.request();
    request.input('id', sql.Int, id);
    const record = (await request.query(`SELECT file_name FROM tbl_emp_attendance_file WHERE id = @id`)).recordset[0];
    if (!record) return null;
    // path.basename keeps a stored name from pointing outside the folder
    const fileName = path.basename(record.file_name || '');
    return { fileName, filePath: path.join(ATTENDANCE_FOLDER, fileName) };
}

async function downloadEmpAttendanceFile(req, res) {
    try {
        const id = req.params.id;
        if (!/^\d+$/.test(String(id))) return res.status(400).json({ message: 'Invalid id' });
        const file = await storedAttendanceFile(await pool, id);
        if (!file) return res.status(404).json({ message: 'Record not found' });
        if (!file.fileName || !fs.existsSync(file.filePath)) return res.status(404).json({ message: 'The stored sheet is no longer on the server' });
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Length', fs.statSync(file.filePath).size);
        return fs.createReadStream(file.filePath).pipe(res);
    } catch (err) {
        console.error('Attendance file download error:', err.message);
        return res.status(500).send('Internal Server Error');
    }
}

// Deletes an uploaded attendance sheet: its rows and its file record together (one
// transaction), then the stored spreadsheet, so nothing is left behind. Who deleted which week
// and a copy of every row go to tbl_eoffice_delete_log (sheet 'employeeAttendance') in the same
// transaction (QC AT-06); until sql/governance/01 has created that table, to a text file.
async function deleteEmpAttendanceFile(req, res) {
    let transaction;
    try {
        const id = req.params.id;
        if (!/^\d+$/.test(String(id))) return res.status(400).json({ message: 'Invalid id' });
        const conn = await pool;
        const file = await storedAttendanceFile(conn, id);
        if (!file) return res.status(404).json({ message: 'Record not found' });

        transaction = new sql.Transaction(conn);
        await transaction.begin();
        const request = transaction.request();
        request.input('id', sql.Int, id);
        request.input('fileName', sql.NVarChar(500), file.fileName || null);
        request.input('userId', sql.Int, req.user.userId); // the signed-in user
        const result = await request.query(`
            DECLARE @rows NVARCHAR(MAX) = (SELECT * FROM tbl_employee_attendance WHERE File_Id = @id FOR JSON PATH, INCLUDE_NULL_VALUES);
            DECLARE @rowCount INT = (SELECT COUNT(*) FROM tbl_employee_attendance WHERE File_Id = @id);
            DECLARE @year INT, @month VARCHAR(20), @week INT;
            SELECT TOP 1 @year = [Year], @month = [Month], @week = [week] FROM tbl_employee_attendance WHERE File_Id = @id;
            DECLARE @logged BIT = 0;
            IF OBJECT_ID('dbo.tbl_eoffice_delete_log', 'U') IS NOT NULL
            BEGIN
                INSERT INTO dbo.tbl_eoffice_delete_log (sheet, file_id, file_name, period_year, period_month, period_week, row_count, rows_json, deleted_by)
                VALUES ('employeeAttendance', @id, @fileName, @year, @month, @week, @rowCount, @rows, @userId);
                SET @logged = 1;
            END
            DELETE FROM tbl_employee_attendance WHERE File_Id = @id;
            DELETE FROM tbl_emp_attendance_file WHERE id = @id;
            SELECT @logged AS logged, @rowCount AS row_count, @year AS y, @month AS m, @week AS w, @rows AS rows_json;`);
        await transaction.commit();

        const deleted = result.recordset[0];
        if (!deleted.logged) {
            const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
            const folder = './delete_log/Attendance';
            const text = `User '${req.user.userId}' deleted attendance file ${id} (${file.fileName}), ${deleted.m} ${deleted.y} week ${deleted.w}, ${deleted.row_count} rows: ${deleted.rows_json}\n`;
            fs.mkdir(folder, { recursive: true }, (mkdirErr) => {
                if (mkdirErr) return console.error('Attendance delete log folder error:', mkdirErr);
                fs.appendFile(`${folder}/deleted_attendance_log_${stamp}.txt`, text, (err) => { if (err) console.error('Attendance delete log error:', err); });
            });
        }

        if (file.fileName && fs.existsSync(file.filePath)) {
            try {
                fs.unlinkSync(file.filePath);
            } catch (unlinkErr) {
                console.error('Attendance stored file could not be removed:', unlinkErr.message);
            }
        }
        return res.json({ message: 'File and related records deleted successfully' });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch { /* already rolled back */ }
        }
        console.error('Attendance file delete error:', err.message);
        return res.status(500).send('Internal Server Error');
    }
}

const empAttendanceTab = { createEmpAttendance, upload, uploadSingleFile, addEmpDataAttendance,
    getEmployeeAttendance, updateEmpAttendance, getEmpAttendance,
    downloadEmpAttendanceFile, deleteEmpAttendanceFile, getEmployeeOrgUnits };
export default empAttendanceTab;
