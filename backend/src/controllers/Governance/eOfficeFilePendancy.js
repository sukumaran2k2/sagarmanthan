import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/E-Office/File_Pendancy";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/E-Office/File_Pendancy");
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

// async function addFilePendancy(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         const Year = req.body.Year;
//         const month = req.body.month;
//         const userID = req.body.userID;
//         const uniqueFileName = req.uniqueFileName;

        // const checkResult = await conn.query(`
        //     SELECT COUNT(*) AS count 
        //     FROM tbl_file_pendancy 
        //     WHERE Month = '${month}' AND Year = ${Year}
        // `);

        // const storedFileID = await conn.query(`
        //     SELECT MAX(File_Id) AS File_Id 
        //     FROM tbl_file_pendancy  
        //     WHERE Month = '${month}' AND Year = ${Year}
        // `);
        // const replaceFileID = storedFileID.recordset[0].File_Id;

        // if (checkResult.recordset[0].count > 0) {
        //     deleteFile(req.file, req.uniqueFileName);
        //     return res.status(409).json({ error: "Record already exists for the specified financial year and month. Do you want to replace it ?", replaceFileID: replaceFileID });
        // }

//         const workbook = xlsx.readFile(req.file.path);
//         const sheetName = workbook.SheetNames[0]; 
//         const sheet = workbook.Sheets[sheetName];
//         const data = xlsx.utils.sheet_to_json(sheet);

//         const requiredHeaders = ['Emp Id', 'Emp Name', 'Designation', 'Wing', 'Division', '0 - 3 Days', '4 - 6 Days', '7 - 15 Days', '16 - 30 Days', '> 30 days', 'Total Pendency'];
//         // const headers = Object.keys(data[0]);

//         const headers = Object.keys(data[0]).map(header => header.trim());

//         // Check for missing headers
//         const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
//         if (missingHeaders.length > 0) {
//             deleteFile(req.file, req.uniqueFileName);
//             return res.status(400).json({ error: `Missing  or Mismatched headers: ${missingHeaders.join(', ')}` });
//         }

//         let rowIndex = 0;

//         // Trim all header names in data
//         const trimmedData = data.map(row => {
//             const trimmedRow = {};
//             Object.keys(row).forEach(header => {
//                 trimmedRow[header.trim()] = row[header];
//             });
//             return trimmedRow;
//         });


//         // Process each row in trimmedData
//         for (const row of trimmedData) {
//             console.log("row",row);
//             rowIndex++;
//             // Destructure row object properties
//             const {
//                 'Emp Id': EmpId,
//                 'Emp Name': EmpName,
//                 'Designation': Designation,
//                 'Wing': Wing,
//                 'Division': Division,
//                 '0 - 3 Days': ZeroToThreeDays,
//                 '4 - 6 Days': FourToSixDays,
//                 '7 - 15 Days': SevenToFifteenDays,
//                 '16 - 30 Days': SixteenToThirtyDays,
//                 '> 30 days': MoreThanThirtyDays,
//                 'Total Pendency': TotalPendency
//             } = row;
        
//             if (!EmpName || typeof EmpName !== 'string') {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid Emp Name' });
//             }
//             if (!Wing || typeof Wing !== 'string') {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid Wing' });
//             }
//             if (!Division || typeof Division !== 'string') {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid Division' });
//             }
//             if (!Designation || typeof Designation !== 'string') {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid Designation' });
//             }
            
//             if (
//                 !Number.isInteger(EmpId)||
//                 !Number.isInteger(ZeroToThreeDays) || 
//                 !Number.isInteger(FourToSixDays) || 
//                 !Number.isInteger(SevenToFifteenDays) || 
//                 !Number.isInteger(SixteenToThirtyDays) || 
//                 !Number.isInteger(MoreThanThirtyDays) || 
//                 !Number.isInteger(TotalPendency)
//             ) {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid value for one or more fields in number' });
//             }   
            
//         }
       
//         const currentDate = new Date();
//         const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//         await request.query(`
//             INSERT INTO tbl_eoffice_file_pendancy_file 
//             (File_name, uploaded_by ,date_of_upload ) 
//             VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
//         `);

//         // Retrieve the ID of the inserted record
//         const fileIdQuery = await conn.query(`
//             SELECT TOP (1) ID
//             FROM tbl_eoffice_file_pendancy_file
//             WHERE File_name = '${uniqueFileName}' 
//             ORDER BY ID DESC
//         `);

//         const fileId = fileIdQuery.recordset[0].ID;

//         for (const row of trimmedData) {
//             console.log("row",row);

//             const { 'Emp Id': EmpId, 'Emp Name': EmpName, 'Designation': Designation, 'Wing': Wing, 'Division': Division, '0 - 3 Days': ZeroToThreeDays, '4 - 6 Days': FourToSixDays, '7 - 15 Days': SevenToFifteenDays, '16 - 30 Days': SixteenToThirtyDays, '> 30 days': MoreThanThirtyDays, 'Total Pendency': TotalPendency } = row;
        
//             const request = conn.request();
        
//             request.input("Emp_Id", EmpId);
//             request.input("Emp_Name", EmpName);
//             request.input("Designation", Designation);
//             request.input("Wing", Wing);
//             request.input("Division", Division);
//             request.input("ZeroToThreeDays", ZeroToThreeDays);
//             request.input("FourToSixDays", FourToSixDays);
//             request.input("SevenToFifteenDays", SevenToFifteenDays);
//             request.input("SixteenToThirtyDays", SixteenToThirtyDays);
//             request.input("MoreThanThirtyDays", MoreThanThirtyDays);
//             request.input("Total_Pendency", TotalPendency);
//             request.input("month", month);
//             request.input("Year", Year);
//             request.input("fileId", fileId);

//             if (!EmpId || EmpId === 'Total') {
//                 deleteFile(req.uniqueFileName);
//                 return res.status(403).json({ error: 'Invalid Emp Id' });
//             }
        
//             await request.query(`
//                 INSERT INTO tbl_file_pendancy 
//                 ([Emp_Id],[Emp_Name],[Designation],[Wing],[Division],[0-3Days],[4-6Days],[7-15Days],[16-30Days],[>30days],[Total Pendency],[Year],[Month],[File_ID]) 
//                 VALUES (@Emp_Id, @Emp_Name, @Designation, @Wing, @Division, @ZeroToThreeDays, @FourToSixDays, @SevenToFifteenDays, @SixteenToThirtyDays, @MoreThanThirtyDays, @Total_Pendency, @Year, @month, @fileId)
//             `);
//         }
               
//         res.status(200).json({
//             message: "Data Stored Successfully",
//         });
//     } catch (err) {
//         deleteFile(req.uniqueFileName);
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

async function addFilePendancy(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const Year = req.body.Year;
        const month = req.body.month;
        const week = req.body.week;
        const userID = req.body.userID;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_file_pendancy 
            WHERE Month = '${month}' AND Year = ${Year} AND week = ${week};
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_file_pendancy  
            WHERE Month = '${month}' AND Year = ${Year} AND week = ${week};
        `);
        const replaceFileID = storedFileID.recordset[0].File_Id;

        if (checkResult.recordset[0].count > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year, month and week. Do you want to replace it ?", replaceFileID: replaceFileID });
        }


        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        //  'Designation', 'Wing', 'Division',
        const requiredHeaders = ['Emp Id', 'Emp Name', '0 - 3 Days', '4 - 6 Days', '7 - 15 Days', '16 - 30 Days', '> 30 days', 'Total Pendency'];

        // const headers = Object.keys(data[0]).map(header => header.trim());

        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(header.trim())));
        // Check for missing or mismatched headers
        const missingHeaders = requiredHeaders.filter(header => !headers.has(header));

        // const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            deleteFile(req.file, req.uniqueFileName);
            return res.status(400).json({ error: `Missing or mismatched headers: ${missingHeaders.join(', ')}` });
        }

        const trimmedData = data.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(header => {
                trimmedRow[header.trim()] = row[header];
            });
            return trimmedRow;
        });


        for (const row of trimmedData) {
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
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Emp Name' });
                // }
                // if (!Wing || typeof Wing !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Wing' });
                // }
                // if (!Division || typeof Division !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Division' });
                // }
                // if (!Designation || typeof Designation !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Designation' });
                // }

                if (
                    // (EmpId !== null && !Number.isInteger(EmpId)) ||
                    (ZeroToThreeDays !== null && !Number.isInteger(ZeroToThreeDays)) ||
                    (FourToSixDays !== null && !Number.isInteger(FourToSixDays)) ||
                    (SevenToFifteenDays !== null && !Number.isInteger(SevenToFifteenDays)) ||
                    (SixteenToThirtyDays !== null && !Number.isInteger(SixteenToThirtyDays)) ||
                    (MoreThanThirtyDays !== null && !Number.isInteger(MoreThanThirtyDays)) ||
                    (TotalPendency !== null && !Number.isInteger(TotalPendency))
                ) {
                    deleteFile(req.file, req.uniqueFileName);
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
        await request.query(`
            INSERT INTO tbl_eoffice_file_pendancy_file 
            (File_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_file_pendancy_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            //  'Emp Name': EmpName, 'Designation': Designation, 'Wing': Wing, 'Division': Division,
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
                    message: "Data Stored Successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_file_pendancy 
                ([Emp_Id],
                --[Emp_Name],[Designation],[Wing],[Division],
                [0-3Days],[4-6Days],[7-15Days],[16-30Days],[>30days],[Total Pendency],[Year],[Month],[week],[File_ID]) 
                VALUES (@Emp_Id, 
                -- @Emp_Name,@Designation, @Wing, @Division, 
                @ZeroToThreeDays, @FourToSixDays, @SevenToFifteenDays, @SixteenToThirtyDays, @MoreThanThirtyDays, @Total_Pendency, @Year, @month, @week, @fileId)
	        `);
        }
        res.status(200).json({
            message: "Data Stored Successfully",
        });
    } catch (err) {
        deleteFile(req.file, req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

// async function addFilePendancy(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         const Year = req.body.Year;
//         const month = req.body.month;
//         const userID = req.body.userID;
//         const uniqueFileName = req.uniqueFileName;

//         const workbook = xlsx.readFile(req.file.path);
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const data = xlsx.utils.sheet_to_json(sheet);

//         const requiredHeaders = ['Emp Id', 'Emp Name', 'Designation', 'Wing', 'Division', '0 - 3 Days', '4 - 6 Days', '7 - 15 Days', '16 - 30 Days', '> 30 days', 'Total Pendency'];

//         const headers = Object.keys(data[0]).map(header => header.trim());

//         const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
//         if (missingHeaders.length > 0) {
//             deleteFile(req.file, req.uniqueFileName);
//             return res.status(400).json({ error: `Missing or mismatched headers: ${missingHeaders.join(', ')}` });
//         }

//         // Trim all header names in data
//         const trimmedData = data.map(row => {
//             const trimmedRow = {};
//             Object.keys(row).forEach(header => {
//                 trimmedRow[header.trim()] = row[header];
//             });
//             return trimmedRow;
//         });

//         for (const row of trimmedData) {
//             const {
//                 'Emp Id': EmpId,
//                 'Emp Name': EmpName,
//                 'Designation': Designation,
//                 'Wing': Wing,
//                 'Division': Division,
//                 '0 - 3 Days': ZeroToThreeDays,
//                 '4 - 6 Days': FourToSixDays,
//                 '7 - 15 Days': SevenToFifteenDays,
//                 '16 - 30 Days': SixteenToThirtyDays,
//                 '> 30 days': MoreThanThirtyDays,
//                 'Total Pendency': TotalPendency
//             } = row;

//             const handleNullOrEmpty = (value) => {
//                 return value === null || value === undefined || value === '' ? value : null;
//             };

//             const processedRow = {
//                 'Emp Id': handleNullOrEmpty(EmpId),
//                 'Emp Name': handleNullOrEmpty(EmpName),
//                 'Designation': handleNullOrEmpty(Designation),
//                 'Wing': handleNullOrEmpty(Wing),
//                 'Division': handleNullOrEmpty(Division),
//                 '0 - 3 Days': handleNullOrEmpty(ZeroToThreeDays),
//                 '4 - 6 Days': handleNullOrEmpty(FourToSixDays),
//                 '7 - 15 Days': handleNullOrEmpty(SevenToFifteenDays),
//                 '16 - 30 Days': handleNullOrEmpty(SixteenToThirtyDays),
//                 '> 30 days': handleNullOrEmpty(MoreThanThirtyDays),
//                 'Total Pendency': handleNullOrEmpty(TotalPendency)
//             };

//             if (!EmpId || EmpId !== 'Total' || EmpId != null) {
//                 console.log(row);
//                 if (!EmpName || typeof EmpName !== 'string') {
//                     deleteFile(req.file, req.uniqueFileName);
//                     return res.status(403).json({ error: 'Invalid Emp Name' });
//                 }
//                 if (!Wing || typeof Wing !== 'string') {
//                     deleteFile(req.file, req.uniqueFileName);
//                     return res.status(403).json({ error: 'Invalid Wing' });
//                 }
//                 if (!Division || typeof Division !== 'string') {
//                     deleteFile(req.file, req.uniqueFileName);
//                     return res.status(403).json({ error: 'Invalid Division' });
//                 }
//                 if (!Designation || typeof Designation !== 'string') {
//                     deleteFile(req.file, req.uniqueFileName);
//                     return res.status(403).json({ error: 'Invalid Designation' });
//                 }

//                 if (
//                     (EmpId !== null && !Number.isInteger(EmpId)) ||
//                     (ZeroToThreeDays !== null && !Number.isInteger(ZeroToThreeDays)) ||
//                     (FourToSixDays !== null && !Number.isInteger(FourToSixDays)) ||
//                     (SevenToFifteenDays !== null && !Number.isInteger(SevenToFifteenDays)) ||
//                     (SixteenToThirtyDays !== null && !Number.isInteger(SixteenToThirtyDays)) ||
//                     (MoreThanThirtyDays !== null && !Number.isInteger(MoreThanThirtyDays)) ||
//                     (TotalPendency !== null && !Number.isInteger(TotalPendency))
//                 ) {
//                     deleteFile(req.file, req.uniqueFileName);
//                     return res.status(403).json({ error: 'Invalid value for one or more fields in number' });
//                 }
//             }
//         }

//         const currentDate = new Date();
//         const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//         await request.query(`
//             INSERT INTO tbl_eoffice_file_pendancy_file 
//             (File_name, uploaded_by ,date_of_upload ) 
//             VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
//         `);

//         const fileIdQuery = await conn.query(`
//             SELECT TOP (1) ID
//             FROM tbl_eoffice_file_pendancy_file
//             WHERE File_name = '${uniqueFileName}' 
//             ORDER BY ID DESC
//         `);

//         const fileId = fileIdQuery.recordset[0].ID;

//         for (const row of trimmedData) {
//             const { 'Emp Id': EmpId, 'Emp Name': EmpName, 'Designation': Designation, 'Wing': Wing, 'Division': Division, '0 - 3 Days': ZeroToThreeDays, '4 - 6 Days': FourToSixDays, '7 - 15 Days': SevenToFifteenDays, '16 - 30 Days': SixteenToThirtyDays, '> 30 days': MoreThanThirtyDays, 'Total Pendency': TotalPendency } = row;

//             const request = conn.request();

//             request.input("Emp_Id", EmpId);
//             request.input("Emp_Name", EmpName);
//             request.input("Designation", Designation);
//             request.input("Wing", Wing);
//             request.input("Division", Division);
//             request.input("ZeroToThreeDays", ZeroToThreeDays);
//             request.input("FourToSixDays", FourToSixDays);
//             request.input("SevenToFifteenDays", SevenToFifteenDays);
//             request.input("SixteenToThirtyDays", SixteenToThirtyDays);
//             request.input("MoreThanThirtyDays", MoreThanThirtyDays);
//             request.input("Total_Pendency", TotalPendency);
//             request.input("month", month);
//             request.input("Year", Year);
//             request.input("fileId", fileId);

//             if (!EmpId || EmpId === 'Total') {
//                 res.status(200).json({
//                     message: "Data Stored Successfully",
//                 });

//                 return;
//             }

//             await request.query(`
//                 INSERT INTO tbl_file_pendancy 
//                 ([Emp_Id],[Emp_Name],[Designation],[Wing],[Division],[0-3Days],[4-6Days],[7-15Days],[16-30Days],[>30days],[Total Pendency],[Year],[Month],[File_ID]) 
//                 VALUES (@Emp_Id, @Emp_Name, @Designation, @Wing, @Division, @ZeroToThreeDays, @FourToSixDays, @SevenToFifteenDays, @SixteenToThirtyDays, @MoreThanThirtyDays, @Total_Pendency, @Year, @month, @fileId)
//             `);
//         }

//         res.status(200).json({
//             message: "Data Stored Successfully",
//         });
//     } catch (err) {
//         deleteFile(req.file, req.uniqueFileName);
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

async function updateFilePendancy(req, res) {
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
        const requiredHeaders = ['Emp Id','0 - 3 Days', '4 - 6 Days', '7 - 15 Days', '16 - 30 Days', '> 30 days', 'Total Pendency'];
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
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Emp Name' });
                // }
                // if (!Wing || typeof Wing !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Wing' });
                // }
                // if (!Division || typeof Division !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Division' });
                // }
                // if (!Designation || typeof Designation !== 'string') {
                //     deleteFile(req.file, req.uniqueFileName);
                //     return res.status(403).json({ error: 'Invalid Designation' });
                // }

                if (
                    // (EmpId !== null && !Number.isInteger(EmpId)) ||
                    (ZeroToThreeDays !== null && !Number.isInteger(ZeroToThreeDays)) ||
                    (FourToSixDays !== null && !Number.isInteger(FourToSixDays)) ||
                    (SevenToFifteenDays !== null && !Number.isInteger(SevenToFifteenDays)) ||
                    (SixteenToThirtyDays !== null && !Number.isInteger(SixteenToThirtyDays)) ||
                    (MoreThanThirtyDays !== null && !Number.isInteger(MoreThanThirtyDays)) ||
                    (TotalPendency !== null && !Number.isInteger(TotalPendency))
                ) {
                    deleteFile(req.file, req.uniqueFileName);
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
            SELECT File_name FROM tbl_eoffice_file_pendancy_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_file_pendancy
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_eoffice_file_pendancy_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

         // Retrieve the ID of the inserted record
         const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_eoffice_file_pendancy_file
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
                INSERT INTO tbl_file_pendancy 
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
        const filePath = `./fileuploads/E-Office/File_Pendancy/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}



const EofficeFilePendancyTab = { addFilePendancy, upload,
    updateFilePendancy };
export default EofficeFilePendancyTab;