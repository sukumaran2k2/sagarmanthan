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
    try {
        const conn = await pool;
        const request = conn.request();

        const rawYear = req.body.Year || req.body.financialYear;
        const Year = parseInt(rawYear, 10) || 2026;
        const month = req.body.month;
        const week = parseInt(req.body.week, 10) || 1;
        const userID = parseInt(req.body.userID, 10) || 1;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_receipt_pendency 
            WHERE Month = '${month}' AND Year = ${Year} AND week = ${week};
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_ID) AS File_Id 
            FROM tbl_receipt_pendency  
            WHERE Month = '${month}' AND Year = ${Year} AND week = ${week};
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

        for (const row of trimmedData) {
            const rawEmpId = getRowVal(row, ['Emp Id', 'EmpId', 'EMP ID', 'Emp_Id', 'S.No', 'id']);
            const EmpId = String(rawEmpId || '').trim();

            if (EmpId && EmpId !== 'Total' && EmpId !== 'Summary' && EmpId !== '—') {
                const employeeCheckResult = await conn.query(`
                    SELECT COUNT(*) AS count 
                    FROM mmt_employee_info 
                    WHERE Emp_Id = '${EmpId}'
                `);

                if (employeeCheckResult.recordset[0].count === 0) {
                    try {
                        const empName = String(getRowVal(row, ['Emp Name', 'EmpName', 'Employee Name', 'Name'], 'Employee ' + EmpId)).replace(/'/g, "''");
                        const designation = String(getRowVal(row, ['Designation', 'designation', 'Post'], 'Staff')).replace(/'/g, "''");
                        await conn.query(`
                            INSERT INTO mmt_employee_info (Emp_Id, Emp_Name, Designation, organization_id)
                            VALUES ('${EmpId}', '${empName}', '${designation}', 1)
                        `);
                    } catch (autoErr) {
                        console.warn("Auto register employee warning:", autoErr.message);
                    }
                }
            }
        }

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_eoffice_receipt_pendency_file 
            (File_name, uploaded_by, date_of_upload) 
            VALUES ('${uniqueFileName}', ${userID}, '${formattedDate}')
        `);

        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_receipt_pendency_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const rawEmpId = getRowVal(row, ['Emp Id', 'EmpId', 'EMP ID', 'Emp_Id', 'S.No', 'id']);
            const EmpId = String(rawEmpId || '').trim();

            if (!EmpId || EmpId === 'Total' || EmpId === 'Summary') {
                continue;
            }

            const ZeroToThreeDays = parseInt(getRowVal(row, ['0 - 3 Days', '0-3 Days', '0-3', 'ZeroToThreeDays'], 0), 10) || 0;
            const FourToSixDays = parseInt(getRowVal(row, ['4 - 6 Days', '4-6 Days', '4-6', 'FourToSixDays'], 0), 10) || 0;
            const SevenToFifteenDays = parseInt(getRowVal(row, ['7 - 15 Days', '7-15 Days', '7-15', 'SevenToFifteenDays'], 0), 10) || 0;
            const SixteenToThirtyDays = parseInt(getRowVal(row, ['16 - 30 Days', '16-30 Days', '16-30', 'SixteenToThirtyDays'], 0), 10) || 0;
            const MoreThanThirtyDays = parseInt(getRowVal(row, ['> 30 days', '>30 days', '> 30 Days', '>30Days', 'MoreThanThirtyDays'], 0), 10) || 0;
            const TotalPendency = parseInt(getRowVal(row, ['Total Pendency', 'TotalPendency', 'Total'], 0), 10) || (ZeroToThreeDays + FourToSixDays + SevenToFifteenDays + SixteenToThirtyDays + MoreThanThirtyDays);

            const rowRequest = conn.request();
            rowRequest.input("Emp_Id", sql.NVarChar, EmpId);
            rowRequest.input("ZeroToThreeDays", sql.Int, ZeroToThreeDays);
            rowRequest.input("FourToSixDays", sql.Int, FourToSixDays);
            rowRequest.input("SevenToFifteenDays", sql.Int, SevenToFifteenDays);
            rowRequest.input("SixteenToThirtyDays", sql.Int, SixteenToThirtyDays);
            rowRequest.input("MoreThanThirtyDays", sql.Int, MoreThanThirtyDays);
            rowRequest.input("Total_Pendency", sql.Int, TotalPendency);
            rowRequest.input("month", sql.NVarChar, month);
            rowRequest.input("Year", sql.Int, Year);
            rowRequest.input("week", sql.Int, week);
            rowRequest.input("fileId", sql.Int, fileId);

            await rowRequest.query(`
                INSERT INTO tbl_receipt_pendency 
                ([Emp_Id], [0-3Days], [4-6Days], [7-15Days], [16-30Days], [>30days], [Total Pendency], [Year], [Month], [week], [File_ID]) 
                VALUES (@Emp_Id, @ZeroToThreeDays, @FourToSixDays, @SevenToFifteenDays, @SixteenToThirtyDays, @MoreThanThirtyDays, @Total_Pendency, @Year, @month, @week, @fileId)
            `);
        }

        res.status(200).json({
            message: "Data Stored Successfully",
        });
    } catch (err) {
        deleteFile(req.file, req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
}

async function updateReceiptPendancy(req, res) {
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

         for (const row of trimmedData) {
            rowIndex++;
        
            // Destructure row object properties
            const {
                'Emp Id': EmpId,
                // 'Emp Name': EmpName,
                // 'Designation': Designation,
                // 'Wing': Wing,
                // 'Division': Division,
                '0 - 3 Days': ZeroToThreeDays,
                '4 - 6 Days': FourToSixDays,
                '7 - 15 Days': SevenToFifteenDays,
                '16 - 30 Days': SixteenToThirtyDays,
                '> 30 days': MoreThanThirtyDays,
                'Total Pendency': TotalPendency
            } = row;

            //Validate duplication of EMP ID
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
              
            if ( EmpId !== 'Total' && EmpId !== null && EmpId !== undefined) {
                if (typeof EmpId !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Emp Id format' });
                }    
                // if (!EmpName || typeof EmpName !== 'string') {
                //     deleteFile(req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Emp Name' });
                // }
                // if (!Wing || typeof Wing !== 'string') {
                //     deleteFile(req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Wing' });
                // }
                // if (!Division || typeof Division !== 'string') {
                //     deleteFile(req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Division' });
                // }
                // if (!Designation || typeof Designation !== 'string') {
                //     deleteFile(req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Designation' });
                // }
                if (
                    // !Number.isInteger(EmpId)||
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

        for (const row of trimmedData) {
            const EmpId = row['Emp Id'];
            if ( EmpId !== 'Total' && EmpId !== null && EmpId !== undefined) {
                const employeeCheckResult = await conn.query(`
                    SELECT COUNT(*) AS count 
                    FROM mmt_employee_info 
                    WHERE Emp_Id = '${EmpId}'
                `);

                if (employeeCheckResult.recordset[0].count === 0) {
                    deleteFile(req.uniqueFileName);
                    const EmpId = row['Emp Id']; 
                    return res.status(402).json({ error: `Employee ID '${EmpId}' not found in the employee table`, EmpId: EmpId });
                }
            }
        }
            
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_eoffice_receipt_pendency_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_receipt_pendency
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_eoffice_receipt_pendency_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

         // Retrieve the ID of the inserted record
         const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_receipt_pendency_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            // 'Emp Name': EmpName, 'Designation': Designation, 'Wing': Wing, 'Division': Division, 
            const { 'Emp Id': EmpId, '0 - 3 Days': ZeroToThreeDays, '4 - 6 Days': FourToSixDays, '7 - 15 Days': SevenToFifteenDays, '16 - 30 Days': SixteenToThirtyDays, '> 30 days': MoreThanThirtyDays, 'Total Pendency': TotalPendency } = row;
        
            const request = conn.request();
        
            request.input("Emp_Id", EmpId);
            // request.input("Emp_Name", EmpName);
            // request.input("Designation", Designation);
            // request.input("Wing", Wing);
            // request.input("Division", Division);
            request.input("ZeroToThreeDays", ZeroToThreeDays);
            request.input("FourToSixDays", FourToSixDays);
            request.input("SevenToFifteenDays", SevenToFifteenDays);
            request.input("SixteenToThirtyDays", SixteenToThirtyDays);
            request.input("MoreThanThirtyDays", MoreThanThirtyDays);
            request.input("Total_Pendency", TotalPendency);
            request.input("month", month);
            request.input("Year", Year);
            request.input("week", week);
            request.input("fileId", fileId);

            
            if ( !EmpId || EmpId === 'Total' || EmpId === null || EmpId === undefined) {
                res.status(200).json({
                    message: " Data Updated Successfully",
                });
                return;
            }
        
            await request.query(`
                INSERT INTO tbl_receipt_pendency 
                ([Emp_Id],
                --[Emp_Name],[Designation],[Wing],[Division],
                [0-3Days],[4-6Days],[7-15Days],[16-30Days],[>30days],[Total Pendency],[Year],[Month],[week],[File_ID]) 
                VALUES (@Emp_Id, 
                --@Emp_Name, @Designation, @Wing, @Division, 
                @ZeroToThreeDays, @FourToSixDays, @SevenToFifteenDays, @SixteenToThirtyDays, @MoreThanThirtyDays, @Total_Pendency, @Year, @month, @week, @fileId)
            `);
        }
                      
        res.status(200).json({
            message: " Data Updated Successfully",
        });
    } catch (err) {
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
