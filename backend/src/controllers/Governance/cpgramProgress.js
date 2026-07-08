import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Cpgram/Cpgram_Progress";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Cpgram/Cpgram_Progress");
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

async function addCPGRAMProgress(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_progress_cpgram 
            WHERE Month = '${month}' AND Year = ${financialYear}
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_progress_cpgram  
            WHERE Month = '${month}' AND Year = ${financialYear}
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

        const requiredHeaders = ['Grievance Source', 'Brought Forward', 'Receipt During Period', 'Total Receipt', 'Grievances Disposed During Period', 'Closing Balance', 'Yet to Assess', 'At Our Office', 'With Subordinate'];
        // const headers = Object.keys(data[0]);

        // const headers = Object.keys(data[0]).map(header => header.trim());

        const headers = new Set();
        data.forEach(row => Object.keys(row).forEach(header => headers.add(header.trim())));
        // Check for missing or mismatched headers
        const missingHeaders = requiredHeaders.filter(header => !headers.has(header));

        // Check for missing headers
        // const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            deleteFile(req.file, req.uniqueFileName);
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


        // Process each row in trimmedData
        for (const row of trimmedData) {
            rowIndex++;
            const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt,
            'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice,
            'With Subordinate': WithSubordinate } = row;

            // Handle empty or null values by replacing them with placeholders
            const handleNull = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };

            // Replace empty or null values with placeholders
            const processedRow = {
                'BroughtForward': handleNull(BroughtForward),
                'ReceiptDuringPeriod': handleNull(ReceiptDuringPeriod),
                'TotalReceipt': handleNull(TotalReceipt),
                'GrievancesDisposedDuringPeriod': handleNull(GrievancesDisposedDuringPeriod),
                'ClosingBalance': handleNull(ClosingBalance),
                'YetToAssess': handleNull(YetToAssess),
                'AtOurOffice': handleNull(AtOurOffice),
                'WithSubordinate': handleNull(WithSubordinate),
            };
            if(!GrievanceSource || GrievanceSource != 'Total'){
                // Validation for Grievance Source
                if (!GrievanceSource || typeof GrievanceSource !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Grievance Category' });
                }

                // Validation for number fields
                if (
                    (processedRow.BroughtForward === null) ||
                    (processedRow.ReceiptDuringPeriod === null) ||
                    (processedRow.TotalReceipt === null) ||
                    (processedRow.GrievancesDisposedDuringPeriod === null) ||
                    (processedRow.ClosingBalance === null) ||
                    (processedRow.YetToAssess === null) ||
                    (processedRow.AtOurOffice === null) ||
                    (processedRow.WithSubordinate === null)
                ) {
                    continue;
                }
                else if (
                    (!Number.isInteger(processedRow.BroughtForward) && processedRow.BroughtForward !== null) ||
                    (!Number.isInteger(processedRow.ReceiptDuringPeriod) && processedRow.ReceiptDuringPeriod !== null) ||
                    (!Number.isInteger(processedRow.TotalReceipt) && processedRow.TotalReceipt !== null) ||
                    (!Number.isInteger(processedRow.GrievancesDisposedDuringPeriod) && processedRow.GrievancesDisposedDuringPeriod !== null) ||
                    (!Number.isInteger(processedRow.ClosingBalance) && processedRow.ClosingBalance !== null) ||
                    (!Number.isInteger(processedRow.YetToAssess) && processedRow.YetToAssess !== null) ||
                    (!Number.isInteger(processedRow.AtOurOffice) && processedRow.AtOurOffice !== null) ||
                    (!Number.isInteger(processedRow.WithSubordinate) && processedRow.WithSubordinate !== null)
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }
        }

        // for (const row of trimmedData) {
        //     rowIndex++;
        //     const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt, 'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice, 'With Subordinate': WithSubordinate } = row;
        
        //     if (!GrievanceSource || typeof GrievanceSource !== 'string') {
        //         deleteFile(req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid Grievance Source' });
        //     }
        
            // if (!Number.isInteger(BroughtForward) || !Number.isInteger(ReceiptDuringPeriod) || !Number.isInteger(TotalReceipt) || !Number.isInteger(GrievancesDisposedDuringPeriod) || !Number.isInteger(ClosingBalance) || !Number.isInteger(YetToAssess) || !Number.isInteger(AtOurOffice) || !Number.isInteger(WithSubordinate)) {
            //     deleteFile(req.uniqueFileName);
            //     return res.status(403).json({ error: 'Invalid value for one or more fields' });
            // }
        // }
        
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_Cpgram_Progress_file 
            (File_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        // Retrieve the ID of the inserted record
        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_Cpgram_Progress_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt, 'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice, 'With Subordinate': WithSubordinate } = row;
        
            const request = conn.request();
        
            request.input("GrievanceSource", GrievanceSource);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceiptDuringPeriod", ReceiptDuringPeriod);
            request.input("TotalReceipt", TotalReceipt);
            request.input("GrievancesDisposedDuringPeriod", GrievancesDisposedDuringPeriod);
            request.input("ClosingBalance", ClosingBalance);
            request.input("YetToAssess", YetToAssess);
            request.input("AtOurOffice", AtOurOffice);
            request.input("WithSubordinate", WithSubordinate);
            request.input("fileId", fileId);
            request.input("month", month);
            request.input("financialYear", financialYear);
        
            if(!GrievanceSource || GrievanceSource == 'Total'){
                res.status(200).json({
                    message: "Progress record created successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_progress_cpgram 
                ([Grievance Source],[Brought Forward],[Receipt During Period],[Total Receipt],[Grievances Disposed During Period],[Closing Balance],[Yet to Assess],[At Our Office],[With Subordinate],[Year],[Month],[File_ID]) 
                VALUES (@GrievanceSource, @BroughtForward, @ReceiptDuringPeriod, @TotalReceipt, @GrievancesDisposedDuringPeriod, @ClosingBalance, @YetToAssess, @AtOurOffice, @WithSubordinate, @financialYear, @month, @fileId)
            `);
        }        
       
        res.status(200).json({
            message: "Cpgram Progress record created successfully",
        });
    } catch (err) {
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function updateCPGRAMProgress(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const FileId = req.body.fileId;
        const userID = req.body.userID;

        const uniqueFileName = req.uniqueFileName;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);


        const requiredHeaders = ['Grievance Source', 'Brought Forward', 'Receipt During Period', 'Total Receipt', 'Grievances Disposed During Period', 'Closing Balance', 'Yet to Assess', 'At Our Office', 'With Subordinate'];
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

        // Process each row in trimmedData
        for (const row of trimmedData) {
            rowIndex++;
            const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt,
            'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice,
            'With Subordinate': WithSubordinate } = row;

            // Handle empty or null values by replacing them with placeholders
            const handleNull = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };

            // Replace empty or null values with placeholders
            const processedRow = {
                'BroughtForward': handleNull(BroughtForward),
                'ReceiptDuringPeriod': handleNull(ReceiptDuringPeriod),
                'TotalReceipt': handleNull(TotalReceipt),
                'GrievancesDisposedDuringPeriod': handleNull(GrievancesDisposedDuringPeriod),
                'ClosingBalance': handleNull(ClosingBalance),
                'YetToAssess': handleNull(YetToAssess),
                'AtOurOffice': handleNull(AtOurOffice),
                'WithSubordinate': handleNull(WithSubordinate),
            };

            if(!GrievanceSource || GrievanceSource != 'Total'){

                // Validation for Grievance Source
                if (!GrievanceSource || typeof GrievanceSource !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Grievance Category' });
                }

                // Validation for number fields
                if (
                    (processedRow.BroughtForward === null) ||
                    (processedRow.ReceiptDuringPeriod === null) ||
                    (processedRow.TotalReceipt === null) ||
                    (processedRow.GrievancesDisposedDuringPeriod === null) ||
                    (processedRow.ClosingBalance === null) ||
                    (processedRow.YetToAssess === null) ||
                    (processedRow.AtOurOffice === null) ||
                    (processedRow.WithSubordinate === null)
                ) {
                    continue;
                }
                else if (
                    (!Number.isInteger(processedRow.BroughtForward) && processedRow.BroughtForward !== null) ||
                    (!Number.isInteger(processedRow.ReceiptDuringPeriod) && processedRow.ReceiptDuringPeriod !== null) ||
                    (!Number.isInteger(processedRow.TotalReceipt) && processedRow.TotalReceipt !== null) ||
                    (!Number.isInteger(processedRow.GrievancesDisposedDuringPeriod) && processedRow.GrievancesDisposedDuringPeriod !== null) ||
                    (!Number.isInteger(processedRow.ClosingBalance) && processedRow.ClosingBalance !== null) ||
                    (!Number.isInteger(processedRow.YetToAssess) && processedRow.YetToAssess !== null) ||
                    (!Number.isInteger(processedRow.AtOurOffice) && processedRow.AtOurOffice !== null) ||
                    (!Number.isInteger(processedRow.WithSubordinate) && processedRow.WithSubordinate !== null)
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }    
        }
        // for (const row of trimmedData) {
        //     rowIndex++;
        //     const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt, 'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice, 'With Subordinate': WithSubordinate } = row;
        
        //     if (!GrievanceSource || typeof GrievanceSource !== 'string') {
        //         deleteFile(req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid Grievance Source' });
        //     }
        
        //     if (!Number.isInteger(BroughtForward) || !Number.isInteger(ReceiptDuringPeriod) || !Number.isInteger(TotalReceipt) || !Number.isInteger(GrievancesDisposedDuringPeriod) || !Number.isInteger(ClosingBalance) || !Number.isInteger(YetToAssess) || !Number.isInteger(AtOurOffice) || !Number.isInteger(WithSubordinate)) {
        //         deleteFile(req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid integer value for one or more fields' });
        //     }
        // }
        
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_Cpgram_Progress_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_progress_cpgram
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_Cpgram_Progress_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

        for (const row of trimmedData) {
            const { 'Grievance Source': GrievanceSource, 'Brought Forward': BroughtForward, 'Receipt During Period': ReceiptDuringPeriod, 'Total Receipt': TotalReceipt,
             'Grievances Disposed During Period': GrievancesDisposedDuringPeriod, 'Closing Balance': ClosingBalance, 'Yet to Assess': YetToAssess, 'At Our Office': AtOurOffice, 'With Subordinate': WithSubordinate } = row;
        
            const request = conn.request();
        
            request.input("GrievanceSource", GrievanceSource);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceiptDuringPeriod", ReceiptDuringPeriod);
            request.input("TotalReceipt", TotalReceipt);
            request.input("GrievancesDisposedDuringPeriod", GrievancesDisposedDuringPeriod);
            request.input("ClosingBalance", ClosingBalance);
            request.input("YetToAssess", YetToAssess);
            request.input("AtOurOffice", AtOurOffice);
            request.input("WithSubordinate", WithSubordinate);
            request.input("FileId", FileId);
            request.input("month", month);
            request.input("financialYear", financialYear);

            if(!GrievanceSource || GrievanceSource == 'Total'){
                res.status(200).json({
                    message: "Progress record created successfully",
                });
                return;
            }
        
            await request.query(`
                INSERT INTO tbl_progress_cpgram 
                ([Grievance Source],[Brought Forward],[Receipt During Period],[Total Receipt],[Grievances Disposed During Period],[Closing Balance],[Yet to Assess],[At Our Office],[With Subordinate],[Year],[Month],[File_ID]) 
                VALUES (@GrievanceSource, @BroughtForward, @ReceiptDuringPeriod, @TotalReceipt, @GrievancesDisposedDuringPeriod, @ClosingBalance, @YetToAssess, @AtOurOffice, @WithSubordinate, @financialYear, @month, @FileId)
            `);
        }
        
        res.status(200).json({
            message: "Attendance record created successfully",
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
        const filePath = `fileuploads/Cpgram/Cpgram_Progress/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

async function getCPGRAMProgressCheck(req,res){
    const conn = await pool;
      try {
          const result = await conn.query(`SELECT Top 1 Month, Year
          FROM tbl_progress_cpgram
          WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
              SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
              FROM tbl_progress_cpgram);
          `);
          res.json(result.recordset);
      } catch (err) {
          console.log(err);
          return res.sendStatus(500);
      }
  }

  


const cpgramProgressController = { addCPGRAMProgress, upload,
    updateCPGRAMProgress, getCPGRAMProgressCheck };
export default cpgramProgressController;
