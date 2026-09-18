import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/E-Office/Receipt_Pendancy";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/E-Office/Receipt_Pendancy");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});

async function addReceiptPendancy(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const request = conn.request();

        const rawYear = req.body.Year || req.body.financialYear;
        const Year = parseInt(rawYear, 10) || 2026;
        const month = req.body.month;
        const week = parseInt(req.body.week, 10) || 1;
        const userID = parseInt(req.body.userID, 10) || 1;
        const uniqueFileName = req.uniqueFileName;

        const checkRequest = conn.request();
        checkRequest.input("month", sql.NVarChar, month);
        checkRequest.input("Year", sql.Int, Year);
        checkRequest.input("week", sql.Int, week);
        const checkResult = await checkRequest.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_receipt_pendency 
            WHERE Month = @month AND Year = @Year AND week = @week;
        `);

        const maxIdRequest = conn.request();
        maxIdRequest.input("month", sql.NVarChar, month);
        maxIdRequest.input("Year", sql.Int, Year);
        maxIdRequest.input("week", sql.Int, week);
        const storedFileID = await maxIdRequest.query(`
            SELECT MAX(File_ID) AS File_Id 
            FROM tbl_receipt_pendency  
            WHERE Month = @month AND Year = @Year AND week = @week;
        `);
        const replaceFileID = storedFileID.recordset[0]?.File_Id;

        if (checkResult.recordset[0].count > 0) {
            deleteFile(req.uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year and month. Do you want to replace it ?", replaceFileID: replaceFileID });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(400).json({ error: "The uploaded file contains no data rows." });
        }

        const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileKeysNorm = new Set();
        data.forEach(row => Object.keys(row).forEach(k => fileKeysNorm.add(normKey(k))));

        const hasEmpId = fileKeysNorm.has('empid') || fileKeysNorm.has('emp_id') || fileKeysNorm.has('sno') || fileKeysNorm.has('id');
        const has0to3 = Array.from(fileKeysNorm).some(k => k.includes('0') && k.includes('3'));

        if (!hasEmpId || !has0to3) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(400).json({ error: "Missing or mismatched headers in spreadsheet. Required: Emp Id, 0-3 Days, 4-6 Days, 7-15 Days, 16-30 Days, >30 days, Total Pendency" });
        }

        const trimmedData = data.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                trimmedRow[header.trim()] = row[header];
            });
            return trimmedRow;
        });

        const getRowVal = (row, keys, fallback = '') => {
            if (!row) return fallback;
            for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                    return row[key];
                }
            }
            return fallback;
        };

        // Collect data rows (excluding Total/Summary rows) up front so the
        // employee lookup/auto-register/insert steps below can be batched
        // instead of doing one DB round-trip per row.
        const dataRows = trimmedData
            .map(row => {
                const rawEmpId = getRowVal(row, ['Emp Id', 'EmpId', 'EMP ID', 'Emp_Id', 'S.No', 'id']);
                const EmpId = String(rawEmpId || '').trim();
                return { row, EmpId };
            })
            .filter(({ EmpId }) => EmpId && EmpId !== 'Total' && EmpId !== 'Summary' && EmpId !== '—');

        const uniqueEmpRows = new Map();
        dataRows.forEach(({ row, EmpId }) => {
            if (!uniqueEmpRows.has(EmpId)) {
                uniqueEmpRows.set(EmpId, {
                    EmpName: String(getRowVal(row, ['Emp Name', 'EmpName', 'Employee Name', 'Name'], 'Employee ' + EmpId)),
                    Designation: String(getRowVal(row, ['Designation', 'designation', 'Post'], 'Staff')),
                });
            }
        });
        const allEmpIds = [...uniqueEmpRows.keys()];

        // From here on, employee auto-register, the file record, and the
        // data rows all happen inside one transaction, so a failure partway
        // through rolls everything back instead of leaving an orphaned file
        // record with no data rows.
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        if (allEmpIds.length > 0) {
            // Batch employee existence check: one query for all Emp Ids
            // instead of one SELECT per row.
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
                    // Chunked parameterized multi-row INSERT instead of one
                    // INSERT per missing employee.
                    const CHUNK_SIZE = 500;
                    for (let start = 0; start < missingEmpIds.length; start += CHUNK_SIZE) {
                        const chunk = missingEmpIds.slice(start, start + CHUNK_SIZE);
                        const insertRequest = transaction.request();
                        const valueClauses = chunk.map((id, i) => {
                            const info = uniqueEmpRows.get(id);
                            insertRequest.input(`empId${i}`, sql.NVarChar(255), id);
                            insertRequest.input(`empName${i}`, sql.NVarChar(255), info.EmpName);
                            insertRequest.input(`designation${i}`, sql.NVarChar(255), info.Designation);
                            return `(@empId${i}, @empName${i}, @designation${i}, 1)`;
                        });
                        await insertRequest.query(`
                            INSERT INTO mmt_employee_info (Emp_Id, Emp_Name, Designation, organization_id)
                            VALUES ${valueClauses.join(', ')}
                        `);
                    }
                } catch (autoErr) {
                    console.warn("Auto register employee warning:", autoErr.message);
                }
            }
        }

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        const fileInsertRequest = transaction.request();
        fileInsertRequest.input("fileName", sql.NVarChar, uniqueFileName);
        fileInsertRequest.input("userID", sql.Int, userID);
        fileInsertRequest.input("uploadDate", sql.DateTime, formattedDate);
        await fileInsertRequest.query(`
            INSERT INTO tbl_eoffice_receipt_pendency_file 
            (File_name, uploaded_by, date_of_upload) 
            VALUES (@fileName, @userID, @uploadDate)
        `);

        const fileIdLookupRequest = transaction.request();
        fileIdLookupRequest.input("fileName", sql.NVarChar, uniqueFileName);
        const fileIdQuery = await fileIdLookupRequest.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_receipt_pendency_file
            WHERE File_name = @fileName 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        // Batch row insert: chunked parameterized multi-row INSERT instead
        // of one INSERT round-trip per row.
        const ROW_CHUNK_SIZE = 500;
        for (let start = 0; start < dataRows.length; start += ROW_CHUNK_SIZE) {
            const chunk = dataRows.slice(start, start + ROW_CHUNK_SIZE);
            const rowInsertRequest = transaction.request();
            const valueClauses = chunk.map(({ row, EmpId }, i) => {
                const ZeroToThreeDays = parseInt(getRowVal(row, ['0 - 3 Days', '0-3 Days', '0-3', 'ZeroToThreeDays'], 0), 10) || 0;
                const FourToSixDays = parseInt(getRowVal(row, ['4 - 6 Days', '4-6 Days', '4-6', 'FourToSixDays'], 0), 10) || 0;
                const SevenToFifteenDays = parseInt(getRowVal(row, ['7 - 15 Days', '7-15 Days', '7-15', 'SevenToFifteenDays'], 0), 10) || 0;
                const SixteenToThirtyDays = parseInt(getRowVal(row, ['16 - 30 Days', '16-30 Days', '16-30', 'SixteenToThirtyDays'], 0), 10) || 0;
                const MoreThanThirtyDays = parseInt(getRowVal(row, ['> 30 days', '>30 days', '> 30 Days', '>30Days', 'MoreThanThirtyDays'], 0), 10) || 0;
                const TotalPendency = parseInt(getRowVal(row, ['Total Pendency', 'TotalPendency', 'Total'], 0), 10) || (ZeroToThreeDays + FourToSixDays + SevenToFifteenDays + SixteenToThirtyDays + MoreThanThirtyDays);

                rowInsertRequest.input(`empId${i}`, sql.NVarChar, EmpId);
                rowInsertRequest.input(`zeroToThree${i}`, sql.Int, ZeroToThreeDays);
                rowInsertRequest.input(`fourToSix${i}`, sql.Int, FourToSixDays);
                rowInsertRequest.input(`sevenToFifteen${i}`, sql.Int, SevenToFifteenDays);
                rowInsertRequest.input(`sixteenToThirty${i}`, sql.Int, SixteenToThirtyDays);
                rowInsertRequest.input(`moreThanThirty${i}`, sql.Int, MoreThanThirtyDays);
                rowInsertRequest.input(`totalPendency${i}`, sql.Int, TotalPendency);
                rowInsertRequest.input(`month${i}`, sql.NVarChar, month);
                rowInsertRequest.input(`year${i}`, sql.Int, Year);
                rowInsertRequest.input(`week${i}`, sql.Int, week);
                rowInsertRequest.input(`fileId${i}`, sql.Int, fileId);
                rowInsertRequest.input(`createdBy${i}`, sql.Int, userID);

                return `(@empId${i}, @zeroToThree${i}, @fourToSix${i}, @sevenToFifteen${i}, @sixteenToThirty${i}, @moreThanThirty${i}, @totalPendency${i}, @year${i}, @month${i}, @week${i}, @fileId${i}, @createdBy${i}, GETDATE())`;
            });

            await rowInsertRequest.query(`
                INSERT INTO tbl_receipt_pendency 
                ([Emp_Id], [0-3Days], [4-6Days], [7-15Days], [16-30Days], [>30days], [Total Pendency], [Year], [Month], [week], [File_ID], [created_by], [created_date]) 
                VALUES ${valueClauses.join(', ')}
            `);
        }

        await transaction.commit();

        res.status(200).json({
            message: "Data Stored Successfully",
        });
    } catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error("Transaction rollback failed:", rollbackErr);
            }
        }
        deleteFile(req.file, req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
}

async function updateReceiptPendancy(req, res) {
    let transaction;
    try {
        const conn = await pool;
        const request = conn.request();

        const Year = req.body.Year;
        const month = req.body.month;
        const week = req.body.week;
        const FileId = req.body.fileId;
        const userID = req.body.userID;

        const uniqueFileName = req.uniqueFileName;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // 'Emp Name', 'Designation', 'Wing', 'Division', 
        const requiredHeaders = ['Emp Id', '0 - 3 Days', '4 - 6 Days', '7 - 15 Days', '16 - 30 Days', '> 30 days', 'Total Pendency'];

        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(header.trim())));
        const missingHeaders = requiredHeaders.filter(header => !headers.has(header));

        if (missingHeaders.length > 0) {
            deleteFile(req.uniqueFileName);
            return res.status(400).json({ error: `Missing  or Mismatched headers: ${missingHeaders.join(', ')}` });
        }

        let rowIndex = 0;

        const trimmedData = data.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                trimmedRow[header.trim()] = row[header];
            });
            return trimmedRow;
        });

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
        
            const {
                'Emp Id': EmpId,
                '0 - 3 Days': ZeroToThreeDays,
                '4 - 6 Days': FourToSixDays,
                '7 - 15 Days': SevenToFifteenDays,
                '16 - 30 Days': SixteenToThirtyDays,
                '> 30 days': MoreThanThirtyDays,
                'Total Pendency': TotalPendency
            } = row;

            if ( EmpId !== 'Total' && EmpId !== null && EmpId !== undefined) {
                if (typeof EmpId !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Emp Id format' });
                }    
                if (
                    !Number.isInteger(ZeroToThreeDays) || 
                    !Number.isInteger(FourToSixDays) || 
                    !Number.isInteger(SevenToFifteenDays) || 
                    !Number.isInteger(SixteenToThirtyDays) || 
                    !Number.isInteger(MoreThanThirtyDays) || 
                    !Number.isInteger(TotalPendency)
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid/Empty value for one or more fields in number' });
                }        
            }
        }

        // Batch employee existence check: one query for all Emp Ids in the
        // file instead of one SELECT per row (previously up to N sequential
        // round-trips for an N-row upload).
        const allUpdateEmpIds = [...empIds].filter(id => id !== 'Total' && id !== null && id !== undefined && id !== '');
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
            SELECT File_name FROM tbl_eoffice_receipt_pendency_file
            WHERE ID = @FileId;
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        // From here on, deleting the old rows, updating the file record, and
        // inserting the new rows all happen inside one transaction, so a
        // failure partway through can't leave old rows deleted with no
        // replacement, or the file record renamed with stale row data.
        transaction = new sql.Transaction(conn);
        await transaction.begin();

        const deleteRequest = transaction.request();
        deleteRequest.input("FileId", sql.Int, Number(FileId));
        await deleteRequest.query(`
            DELETE FROM tbl_receipt_pendency
            WHERE File_ID = @FileId;
        `);

        const updateFileRequest = transaction.request();
        updateFileRequest.input("fileName", sql.NVarChar, uniqueFileName);
        updateFileRequest.input("userID", sql.Int, Number(userID));
        updateFileRequest.input("uploadDate", sql.DateTime, formattedDate);
        updateFileRequest.input("FileId", sql.Int, Number(FileId));
        await updateFileRequest.query(`
            UPDATE tbl_eoffice_receipt_pendency_file
            SET File_name = @fileName,
            uploaded_by = @userID,
            date_of_upload = @uploadDate
            WHERE ID = @FileId; 
        `);

         // Retrieve the ID of the inserted record
         const fileIdLookupRequest = transaction.request();
         fileIdLookupRequest.input("fileName", sql.NVarChar, uniqueFileName);
         const fileIdQuery = await fileIdLookupRequest.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_receipt_pendency_file
            WHERE File_name = @fileName 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        // Rows with an empty/Total/Summary Emp Id are skipped up front.
        // Previously the per-row loop below returned a premature 200
        // success the moment it hit one of these rows -- silently dropping
        // every remaining row in the file without ever inserting them,
        // while telling the caller the upload had succeeded.
        const insertRows = trimmedData.filter(row => {
            const EmpId = row['Emp Id'];
            return EmpId && EmpId !== 'Total' && EmpId !== null && EmpId !== undefined;
        });

        // Batch row insert: chunked parameterized multi-row INSERT instead
        // of one INSERT round-trip per row.
        const ROW_CHUNK_SIZE = 500;
        for (let start = 0; start < insertRows.length; start += ROW_CHUNK_SIZE) {
            const chunk = insertRows.slice(start, start + ROW_CHUNK_SIZE);
            const rowInsertRequest = transaction.request();
            const valueClauses = chunk.map((row, i) => {
                const { 'Emp Id': EmpId, '0 - 3 Days': ZeroToThreeDays, '4 - 6 Days': FourToSixDays, '7 - 15 Days': SevenToFifteenDays, '16 - 30 Days': SixteenToThirtyDays, '> 30 days': MoreThanThirtyDays, 'Total Pendency': TotalPendency } = row;

                rowInsertRequest.input(`empId${i}`, sql.NVarChar, String(EmpId));
                rowInsertRequest.input(`zeroToThree${i}`, sql.Int, ZeroToThreeDays ?? 0);
                rowInsertRequest.input(`fourToSix${i}`, sql.Int, FourToSixDays ?? 0);
                rowInsertRequest.input(`sevenToFifteen${i}`, sql.Int, SevenToFifteenDays ?? 0);
                rowInsertRequest.input(`sixteenToThirty${i}`, sql.Int, SixteenToThirtyDays ?? 0);
                rowInsertRequest.input(`moreThanThirty${i}`, sql.Int, MoreThanThirtyDays ?? 0);
                rowInsertRequest.input(`totalPendency${i}`, sql.Int, TotalPendency ?? 0);
                rowInsertRequest.input(`month${i}`, sql.NVarChar, month);
                rowInsertRequest.input(`year${i}`, sql.Int, Number(Year));
                rowInsertRequest.input(`week${i}`, sql.Int, Number(week));
                rowInsertRequest.input(`fileId${i}`, sql.Int, fileId);
                rowInsertRequest.input(`createdBy${i}`, sql.Int, Number(userID));

                return `(@empId${i}, @zeroToThree${i}, @fourToSix${i}, @sevenToFifteen${i}, @sixteenToThirty${i}, @moreThanThirty${i}, @totalPendency${i}, @year${i}, @month${i}, @week${i}, @fileId${i}, @createdBy${i}, GETDATE())`;
            });

            await rowInsertRequest.query(`
                INSERT INTO tbl_receipt_pendency 
                ([Emp_Id], [0-3Days], [4-6Days], [7-15Days], [16-30Days], [>30days], [Total Pendency], [Year], [Month], [week], [File_ID], [created_by], [created_date]) 
                VALUES ${valueClauses.join(', ')}
            `);
        }

        await transaction.commit();
                      
        res.status(200).json({
            message: " Data Updated Successfully",
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
        const filePath = `./fileuploads/E-Office/Receipt_Pendancy/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}



const EofficeReceiptPendancyTab = { addReceiptPendancy, upload,
    updateReceiptPendancy };
export default EofficeReceiptPendancyTab;
