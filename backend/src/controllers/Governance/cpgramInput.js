import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Cpgram/Cpgram_Category";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Cpgram/Cpgram_Category");
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

async function addCPGRAMCategory(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_category_cpgram 
            WHERE Month = '${month}' AND Year = ${financialYear}
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_category_cpgram  
            WHERE Month = '${month}' AND Year = ${financialYear}
        `);
        const replaceFileID = storedFileID.recordset[0].File_Id;

        if (checkResult.recordset[0].count > 0) {
            deleteFile(req.uniqueFileName);
            return res.status(409).json({ error: "Record already exists for the specified financial year and month. Do you want to replace it ?", replaceFileID: replaceFileID });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const requiredHeaders = ['Grievance Category', 'Brought Forward', 'Received During', 'Disposed During', 'Pending During'];
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

        for (const row of trimmedData) {
            rowIndex++;
            
            // Destructure row object properties
            const {
                'Grievance Category': Category,
                'Brought Forward': BroughtForward,
                'Received During': ReceivedDuring,
                'Disposed During': DisposedDuring,
                'Pending During': PendingDuring
            } = row;
        
            // Function to handle null or empty values
            const handleNullOrEmpty = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };
        
            // Replace null or empty values with placeholders in processedRow object
            const processedRow = {
                'BroughtForward': handleNullOrEmpty(BroughtForward),
                'ReceivedDuring': handleNullOrEmpty(ReceivedDuring),
                'DisposedDuring': handleNullOrEmpty(DisposedDuring),
                'PendingDuring': handleNullOrEmpty(PendingDuring)
            };

            if(!Category || Category != 'Total'){

                if (!Category || typeof Category !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Grievance Category' });
                }
            
                // Validation for null and empty values
                if (
                    processedRow.BroughtForward === null ||
                    processedRow.ReceivedDuring === null ||
                    processedRow.DisposedDuring === null ||
                    processedRow.PendingDuring === null
                ) {
                    continue;
                }
            
                // Validation for integer values
                else if (
                    (processedRow.BroughtForward != null && !Number.isInteger(processedRow.BroughtForward)) ||
                    (processedRow.ReceivedDuring != null && !Number.isInteger(processedRow.ReceivedDuring)) ||
                    (processedRow.DisposedDuring != null && !Number.isInteger(processedRow.DisposedDuring)) ||
                    (processedRow.PendingDuring != null && !Number.isInteger(processedRow.PendingDuring))
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }
        }
        
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_Cpgram_Category_file 
            (File_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        // Retrieve the ID of the inserted record
        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_Cpgram_Category_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const { 'Grievance Category': Category, 'Brought Forward': BroughtForward, 'Received During': ReceivedDuring, 'Disposed During': DisposedDuring, 'Pending During': PendingDuring } = row;

            const request = conn.request();

            request.input("Category", Category);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceivedDuring", ReceivedDuring);
            request.input("DisposedDuring", DisposedDuring);
            request.input("PendingDuring", PendingDuring);
            request.input("fileId", fileId);
            request.input("month", month);
            request.input("financialYear", financialYear);

            if(!Category || Category == 'Total'){
                res.status(200).json({
                    message: "Cpgram PH3 record created successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_category_cpgram 
                ([Grievance Category],[Brought Forward],[Received During],[Disposed During],[Pending During],[Year],[Month],[File_ID]) 
                VALUES (@Category, @BroughtForward, @ReceivedDuring, @DisposedDuring, @PendingDuring, @financialYear, @month,@fileId)
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

async function updateCPGRAMCategory(req, res) {
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

        const requiredHeaders = ['Grievance Category', 'Brought Forward', 'Received During', 'Disposed During', 'Pending During'];
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
                'Grievance Category': Category,
                'Brought Forward': BroughtForward,
                'Received During': ReceivedDuring,
                'Disposed During': DisposedDuring,
                'Pending During': PendingDuring
            } = row;
        
            // Function to handle null or empty values
            const handleNullOrEmpty = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };
        
            // Replace null or empty values with placeholders in processedRow object
            const processedRow = {
                'BroughtForward': handleNullOrEmpty(BroughtForward),
                'ReceivedDuring': handleNullOrEmpty(ReceivedDuring),
                'DisposedDuring': handleNullOrEmpty(DisposedDuring),
                'PendingDuring': handleNullOrEmpty(PendingDuring)
            };

            if(!Category || Category != 'Total'){

                if (!Category || typeof Category !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Grievance Category' });
                }
            
            
                // Validation for null and empty values
                if (
                    processedRow.BroughtForward === null ||
                    processedRow.ReceivedDuring === null ||
                    processedRow.DisposedDuring === null ||
                    processedRow.PendingDuring === null
                ) {
                    continue;
                }
            
                // Validation for integer values
                else if (
                    (processedRow.BroughtForward != null && !Number.isInteger(processedRow.BroughtForward)) ||
                    (processedRow.ReceivedDuring != null && !Number.isInteger(processedRow.ReceivedDuring)) ||
                    (processedRow.DisposedDuring != null && !Number.isInteger(processedRow.DisposedDuring)) ||
                    (processedRow.PendingDuring != null && !Number.isInteger(processedRow.PendingDuring))
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }
        }
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_Cpgram_Category_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_category_cpgram
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_Cpgram_Category_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

        for (const row of trimmedData) {
            const { 'Grievance Category': Category, 'Brought Forward': BroughtForward, 'Received During': ReceivedDuring, 'Disposed During': DisposedDuring, 'Pending During': PendingDuring } = row;

            const request = conn.request();

            request.input("Category", Category);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceivedDuring", ReceivedDuring);
            request.input("DisposedDuring", DisposedDuring);
            request.input("PendingDuring", PendingDuring);
            request.input("FileId", FileId);
            request.input("month", month);
            request.input("financialYear", financialYear);

            if(!Category || Category == 'Total'){
                res.status(200).json({
                    message: "Cpgram PH3 record created successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_category_cpgram 
                ([Grievance Category],[Brought Forward],[Received During],[Disposed During],[Pending During],[Year],[Month],[File_ID]) 
                VALUES (@Category, @BroughtForward, @ReceivedDuring, @DisposedDuring, @PendingDuring, @financialYear, @month,@fileId)
            `);
        }
        res.status(200).json({
            message: "Category record created successfully",
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
        const filePath = `fileuploads/Cpgram/Cpgram_Category/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

async function getCPGRAMCategoryCheck(req,res){
    const conn = await pool;
      try {
          const result = await conn.query(`SELECT Top 1 Month, Year
          FROM tbl_category_cpgram
          WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
              SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
              FROM tbl_category_cpgram);
          `);
          res.json(result.recordset);
      } catch (err) {
          console.log(err);
          return res.sendStatus(500);
      }
  }

  


const cpgramInputController = { addCPGRAMCategory, upload,
    updateCPGRAMCategory, getCPGRAMCategoryCheck };
export default cpgramInputController;
