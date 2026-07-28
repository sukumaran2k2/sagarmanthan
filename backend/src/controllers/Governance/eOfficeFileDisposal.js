import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/E-Office/File_Disposal";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/E-Office/File_Disposal");
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

async function addFileDisposal(req, res) {
    try {
        
        const rawYear = req.body.Year || req.body.financialYear;
        const Year = parseInt(rawYear, 10) || 2026;
        const month = req.body.month;
        const userID = parseInt(req.body.userID, 10) || 1;  
        const week = parseInt(req.body.week, 10) || 1;
        const uniqueFileName = req.uniqueFileName;

        const conn = await pool;
        const request = conn.request();

        request.input("userID", sql.Int, userID);
        request.input("month", sql.NVarChar, month);
        request.input("Year", sql.Int, Year);
        request.input("week", sql.Int, week);
        request.input("uniqueFileName", sql.NVarChar, uniqueFileName);

        const checkResult = await request.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_file_disposal 
            WHERE Month = @month AND Year = @Year AND week = @week;
        `);

        const storedFileID = await request.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_file_disposal  
            WHERE Month = @month AND Year = @Year AND week = @week;
        `);
        const replaceFileID = storedFileID.recordset[0]?.File_Id;

        if (checkResult.recordset[0].count > 0) {
            deleteFile(req.uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year, month and week. Do you want to replace it ?", replaceFileID: replaceFileID });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            deleteFile(req.uniqueFileName);
            return res.status(400).json({ error: "The uploaded file contains no data rows." });
        }

        const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileKeysNorm = new Set();
        data.forEach(row => Object.keys(row).forEach(k => fileKeysNorm.add(normKey(k))));

        const hasEmpId = fileKeysNorm.has('empid') || fileKeysNorm.has('emp_id') || fileKeysNorm.has('sno') || fileKeysNorm.has('id');
        const hasTransactions = Array.from(fileKeysNorm).some(k => k.includes('transaction') || k.includes('count'));
        const hasFiles = Array.from(fileKeysNorm).some(k => k.includes('file') || k.includes('count'));

        if (!hasEmpId || (!hasTransactions && !hasFiles)) {
            deleteFile(req.uniqueFileName);
            return res.status(400).json({ error: "Missing or mismatched headers in spreadsheet. Required: Emp Id, Count of Transactions, Counts of Files, Average Response Time" });
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
        request.input("formattedDate", formattedDate);
        await request.query(`
            INSERT INTO tbl_eoffice_file_disposal_file 
            (File_name, uploaded_by, date_of_upload) 
            VALUES (@uniqueFileName, @userID, @formattedDate)
        `);

        const fileIdQuery = await request.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_file_disposal_file
            WHERE File_name = @uniqueFileName
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const rawEmpId = getRowVal(row, ['Emp Id', 'EmpId', 'EMP ID', 'Emp_Id', 'S.No', 'id']);
            const EmpId = String(rawEmpId || '').trim();

            if (!EmpId || EmpId === 'Total' || EmpId === 'Summary') {
                continue;
            }

            const CountOfTransactions = parseInt(getRowVal(row, ['Count of Transactions', 'CountOfTransactions', 'Transactions', 'Transaction Count'], 0), 10) || 0;
            const CountsOfFiles = parseInt(getRowVal(row, ['Counts of Files', 'Count of Files', 'CountsOfFiles', 'Files Count', 'File Count'], 0), 10) || 0;
            const AverageResponseTime = String(getRowVal(row, ['Average Response Time', 'Avg. Response time', 'Avg Response Time', 'AverageResponseTime'], '00:00:00')).trim();

            const rowRequest = conn.request();
            rowRequest.input("Emp_Id", sql.NVarChar, EmpId);
            rowRequest.input("CountOfTransactions", sql.Int, CountOfTransactions);
            rowRequest.input("CountsOfFiles", sql.Int, CountsOfFiles);
            rowRequest.input("AverageResponseTime", sql.NVarChar, AverageResponseTime);
            rowRequest.input("month", sql.NVarChar, month);
            rowRequest.input("Year", sql.Int, Year);
            rowRequest.input("week", sql.Int, week);
            rowRequest.input("fileId", sql.Int, fileId);

            await rowRequest.query(`
                INSERT INTO tbl_file_disposal 
                ([Emp Id], [Count of Transactions], [Counts of Files], [Average Response Time], [Year], [Month], [week], [File_ID]) 
                VALUES (@Emp_Id, @CountOfTransactions, @CountsOfFiles, @AverageResponseTime, @Year, @month, @week, @fileId)
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

async function updateFileDisposal(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const Year = req.body.Year;
        const month = req.body.month;
        const FileId = req.body.fileId
        const week = req.body.week;

        const userID = req.body.userID;

        const uniqueFileName = req.uniqueFileName;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        //Removed 'Emp Name', 'Designation', 'Wing', 'Division', 

        const requiredHeaders = ['Emp Id', 'Count of Transactions', 'Counts of Files', 'Average Response Time'];
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
                'Count of Transactions': CountOfTransactions,
                'Counts of Files': CountsOfFiles,
                'Average Response Time': AverageResponseTime
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

            // Validate EmpId
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
                !Number.isInteger(CountOfTransactions) || 
                !Number.isInteger(CountsOfFiles)
            ) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid value for one or more fields in number' });
            }   
            
        }

        for (const row of trimmedData) {
            const EmpId = row['Emp Id'];
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
            
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_eoffice_file_disposal_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_file_disposal
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_eoffice_file_disposal_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

         // Retrieve the ID of the inserted record
         const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_file_disposal_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            //Removed 'Emp Name': EmpName, 'Designation': Designation, 'Wing': Wing, 'Division': Division, 
            const { 'Emp Id': EmpId, 'Count of Transactions': CountOfTransactions, 'Counts of Files': CountsOfFiles, 'Average Response Time': AverageResponseTime } = row;
        
            const request = conn.request();
        
            request.input("Emp_Id", EmpId);
            // request.input("Emp_Name", EmpName);
            // request.input("Designation", Designation);
            // request.input("Wing", Wing);
            // request.input("Division", Division);
            request.input("CountOfTransactions", CountOfTransactions);
            request.input("CountsOfFiles", CountsOfFiles);
            request.input("AverageResponseTime", AverageResponseTime);
            request.input("month", month);
            request.input("Year", Year);
            request.input("week", week);
            request.input("fileId", fileId);
        
            await request.query(`
                INSERT INTO tbl_file_disposal 
                ([Emp Id],[Count of Transactions],[Counts of Files],[Average Response Time],[Year],[Month],[week],[File_ID]
                    --[Emp Name],[Designation],[Wing],[Division]
                ) 
                VALUES (@Emp_Id, @CountOfTransactions,@CountsOfFiles, @AverageResponseTime , @Year, @month, @week,@fileId
                    -- @Emp_Name, @Designation, @Wing, @Division
                )
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
        const filePath = `./fileuploads/E-Office/File_Disposal/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

async function deleteEmployee(req, res){
    const empId = req.params.empID;
    const conn = await pool;
    const request = conn.request();

    request.input("empId", empId);

    try {
            await request.query(
                `DELETE FROM mmt_employee_info WHERE Emp_Id = @empId`
            );

        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

const EofficeFileDisposalTab = { addFileDisposal, upload,
    updateFileDisposal, deleteEmployee };
export default EofficeFileDisposalTab;
