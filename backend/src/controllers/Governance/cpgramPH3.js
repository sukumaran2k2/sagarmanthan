import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Cpgram/Cpgram_PH3";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Cpgram/Cpgram_PH3");
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

async function addCPGRAMPH3(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_PH3_cpgram 
            WHERE Month = '${month}' AND Year = ${financialYear}
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_PH3_cpgram  
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

        const requiredHeaders = [
            'Name', 'Brought Forward', 'Received During', 'Disposed During', 'Average Disposal Days', 'Total Pending As On ToDate', '<=21 Days', '>21 Days', '0-10 Days', '11-21 Days', '22-30 Days', '31-45 Days', '46-60 Days',  '61-90 Days', '91-180 Days', '181-365 Days', '>1 Year'
        ];
        
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
        
            // Destructure row object properties
            const {
                'Name': Name,
                'Brought Forward': BroughtForward,
                'Received During': ReceivedDuring,
                'Disposed During': DisposedDuring,
                'Average Disposal Days': AverageDisposalDays,
                'Total Pending As On ToDate': TotalPendingToDate,
                '<=21 Days': LessThanOrEqual21Days,
                '>21 Days': Above21Days,
                '0-10 Days': Between0to10Days,
                '11-21 Days': Between11to21Days,
                '22-30 Days': Between22to30Days,
                '31-45 Days': Between31to45Days,
                '46-60 Days': Between46to60Days,
                '61-90 Days': Between61to90Days,
                '91-180 Days': Between91to180Days,
                '181-365 Days': Between181to365Days,
                '>1 Year': MoreThan1Year
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
                'AverageDisposalDays': handleNullOrEmpty(AverageDisposalDays),
                'TotalPendingToDate': handleNullOrEmpty(TotalPendingToDate),
                'LessThanOrEqual21Days': handleNullOrEmpty(LessThanOrEqual21Days),
                'Above21Days': handleNullOrEmpty(Above21Days),
                'Between0to10Days': handleNullOrEmpty(Between0to10Days),
                'Between11to21Days': handleNullOrEmpty(Between11to21Days),
                'Between22to30Days': handleNullOrEmpty(Between22to30Days),
                'Between31to45Days': handleNullOrEmpty(Between31to45Days),
                'Between46to60Days': handleNullOrEmpty(Between46to60Days),
                'Between61to90Days': handleNullOrEmpty(Between61to90Days),
                'Between91to180Days': handleNullOrEmpty(Between91to180Days),
                'Between181to365Days': handleNullOrEmpty(Between181to365Days),
                'MoreThan1Year': handleNullOrEmpty(MoreThan1Year),
            };


            if(!Name || Name != 'Total'){
                if (!Name || typeof Name !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Name' });
                }

                if (
                    processedRow.BroughtForward === null ||
                    processedRow.ReceivedDuring === null ||
                    processedRow.DisposedDuring === null ||
                    processedRow.AverageDisposalDays === null ||
                    processedRow.TotalPendingToDate === null ||
                    processedRow.LessThanOrEqual21Days === null ||
                    processedRow.Above21Days === null ||
                    processedRow.Between0to10Days === null ||
                    processedRow.Between11to21Days === null ||
                    processedRow.Between22to30Days === null ||
                    processedRow.Between31to45Days === null ||
                    processedRow.Between46to60Days === null ||
                    processedRow.Between61to90Days === null ||
                    processedRow.Between91to180Days === null ||
                    processedRow.Between181to365Days === null ||
                    processedRow.MoreThan1Year === null
                ) {
                    continue;
                } else if (
                    (processedRow.BroughtForward !== null && !Number.isInteger(processedRow.BroughtForward)) ||
                    (processedRow.ReceivedDuring !== null && !Number.isInteger(processedRow.ReceivedDuring)) ||
                    (processedRow.DisposedDuring !== null && !Number.isInteger(processedRow.DisposedDuring)) ||
                    (processedRow.AverageDisposalDays !== null && !Number.isInteger(processedRow.AverageDisposalDays)) ||
                    (processedRow.TotalPendingToDate !== null && !Number.isInteger(processedRow.TotalPendingToDate)) ||
                    (processedRow.LessThanOrEqual21Days !== null && !Number.isInteger(processedRow.LessThanOrEqual21Days)) ||
                    (processedRow.Above21Days !== null && !Number.isInteger(processedRow.Above21Days)) ||
                    (processedRow.Between0to10Days !== null && !Number.isInteger(processedRow.Between0to10Days)) ||
                    (processedRow.Between11to21Days !== null && !Number.isInteger(processedRow.Between11to21Days)) ||
                    (processedRow.Between22to30Days !== null && !Number.isInteger(processedRow.Between22to30Days)) ||
                    (processedRow.Between31to45Days !== null && !Number.isInteger(processedRow.Between31to45Days)) ||
                    (processedRow.Between46to60Days !== null && !Number.isInteger(processedRow.Between46to60Days)) ||
                    (processedRow.Between61to90Days !== null && !Number.isInteger(processedRow.Between61to90Days)) ||
                    (processedRow.Between91to180Days !== null && !Number.isInteger(processedRow.Between91to180Days)) ||
                    (processedRow.Between181to365Days !== null && !Number.isInteger(processedRow.Between181to365Days)) ||
                    (processedRow.MoreThan1Year !== null && !Number.isInteger(processedRow.MoreThan1Year))
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }
        }
       
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_Cpgram_PH3_file 
            (File_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        // Retrieve the ID of the inserted record
        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_Cpgram_PH3_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const { 
                'Name': Name, 
                'Brought Forward': BroughtForward, 
                'Received During': ReceivedDuring, 
                'Disposed During': DisposedDuring, 
                'Average Disposal Days': AverageDisposalDays, 
                'Total Pending As On ToDate': TotalPendingToDate, 
                '<=21 Days': LessThanOrEqual21Days, 
                '>21 Days': GreaterThan21Days, 
                '0-10 Days': Between0to10Days, 
                '11-21 Days': Between11to21Days, 
                '22-30 Days': Between22to30Days, 
                '31-45 Days': Between31to45Days, 
                '46-60 Days': Between46to60Days, 
                '61-90 Days': Between61to90Days, 
                '91-180 Days': Between91to180Days, 
                '181-365 Days': Between181to365Days, 
                '>1 Year': MoreThan1Year 
            } = row;
            
            const request = conn.request();
            
            request.input("Name", Name);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceivedDuring", ReceivedDuring);
            request.input("DisposedDuring", DisposedDuring);
            request.input("AverageDisposalDays", AverageDisposalDays);
            request.input("TotalPendingToDate", TotalPendingToDate);
            request.input("LessThanOrEqual21Days", LessThanOrEqual21Days); // Updated variable name
            request.input("GreaterThan21Days", GreaterThan21Days); // Updated variable name
            request.input("Between0to10Days", Between0to10Days);
            request.input("Between11to21Days", Between11to21Days);
            request.input("Between22to30Days", Between22to30Days);
            request.input("Between31to45Days", Between31to45Days);
            request.input("Between46to60Days", Between46to60Days);
            request.input("Between61to90Days", Between61to90Days);
            request.input("Between91to180Days", Between91to180Days);
            request.input("Between181to365Days", Between181to365Days);
            request.input("MoreThan1Year", MoreThan1Year);
            request.input("month", month);
            request.input("financialYear", financialYear);
            request.input("fileId", fileId);
            
            if(!Name || Name == 'Total'){
                res.status(200).json({
                    message: "Cpgram PH3 record created successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_PH3_cpgram 
                ([Name],[Brought Forward],[Received During],[Disposed During],[Average Disposal Days],[Total Pending As On ToDate],[Between 0 to 10Days],[Between 11 to 21Days],[Between 22 to 30Days],[Between 31 to 45Days],[Between 46 to 60Days],[Between 61 to 90Days],[Between 91 to 180Days],[Between 181 to 365Days],[More Than 1 Year],[<=21 Days],[>21 Days],[Year],[Month],[File_ID]) 
                VALUES (@Name, @BroughtForward, @ReceivedDuring, @DisposedDuring, @AverageDisposalDays, @TotalPendingToDate, @Between0to10Days,@Between11to21Days, @Between22to30Days, @Between31to45Days, @Between46to60Days, @Between61to90Days, @Between91to180Days, @Between181to365Days, @MoreThan1Year, @LessThanOrEqual21Days, @GreaterThan21Days, @financialYear, @month, @fileId)
            `);
        }
               
        res.status(200).json({
            message: "Cpgram PH3 record created successfully",
        });
    } catch (err) {
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function updateCPGRAMPH3(req, res) {
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


        const requiredHeaders = [
            'Name', 'Brought Forward', 'Received During', 'Disposed During', 'Average Disposal Days', 'Total Pending As On ToDate', '<=21 Days', '>21 Days', '0-10 Days', '11-21 Days', '22-30 Days', '31-45 Days', '46-60 Days',  '61-90 Days', '91-180 Days', '181-365 Days', '>1 Year'
        ];// const headers = Object.keys(data[0]);
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
                'Name': Name,
                'Brought Forward': BroughtForward,
                'Received During': ReceivedDuring,
                'Disposed During': DisposedDuring,
                'Average Disposal Days': AverageDisposalDays,
                'Total Pending As On ToDate': TotalPendingToDate,
                '<=21 Days': LessThanOrEqual21Days,
                '>21 Days': Above21Days,
                '0-10 Days': Between0to10Days,
                '11-21 Days': Between11to21Days,
                '22-30 Days': Between22to30Days,
                '31-45 Days': Between31to45Days,
                '46-60 Days': Between46to60Days,
                '61-90 Days': Between61to90Days,
                '91-180 Days': Between91to180Days,
                '181-365 Days': Between181to365Days,
                '>1 Year': MoreThan1Year
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
                'AverageDisposalDays': handleNullOrEmpty(AverageDisposalDays),
                'TotalPendingToDate': handleNullOrEmpty(TotalPendingToDate),
                'LessThanOrEqual21Days': handleNullOrEmpty(LessThanOrEqual21Days),
                'Above21Days': handleNullOrEmpty(Above21Days),
                'Between0to10Days': handleNullOrEmpty(Between0to10Days),
                'Between11to21Days': handleNullOrEmpty(Between11to21Days),
                'Between22to30Days': handleNullOrEmpty(Between22to30Days),
                'Between31to45Days': handleNullOrEmpty(Between31to45Days),
                'Between46to60Days': handleNullOrEmpty(Between46to60Days),
                'Between61to90Days': handleNullOrEmpty(Between61to90Days),
                'Between91to180Days': handleNullOrEmpty(Between91to180Days),
                'Between181to365Days': handleNullOrEmpty(Between181to365Days),
                'MoreThan1Year': handleNullOrEmpty(MoreThan1Year),
            };
            
            if(!Name || Name != 'Total'){
                
                if (!Name || typeof Name !== 'string') {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid Name' });
                }

                if (
                    processedRow.BroughtForward === null ||
                    processedRow.ReceivedDuring === null ||
                    processedRow.DisposedDuring === null ||
                    processedRow.AverageDisposalDays === null ||
                    processedRow.TotalPendingToDate === null ||
                    processedRow.LessThanOrEqual21Days === null ||
                    processedRow.Above21Days === null ||
                    processedRow.Between0to10Days === null ||
                    processedRow.Between11to21Days === null ||
                    processedRow.Between22to30Days === null ||
                    processedRow.Between31to45Days === null ||
                    processedRow.Between46to60Days === null ||
                    processedRow.Between61to90Days === null ||
                    processedRow.Between91to180Days === null ||
                    processedRow.Between181to365Days === null ||
                    processedRow.MoreThan1Year === null
                ) {
                    continue;
                } else if (
                    (processedRow.BroughtForward !== null && !Number.isInteger(processedRow.BroughtForward)) ||
                    (processedRow.ReceivedDuring !== null && !Number.isInteger(processedRow.ReceivedDuring)) ||
                    (processedRow.DisposedDuring !== null && !Number.isInteger(processedRow.DisposedDuring)) ||
                    (processedRow.AverageDisposalDays !== null && !Number.isInteger(processedRow.AverageDisposalDays)) ||
                    (processedRow.TotalPendingToDate !== null && !Number.isInteger(processedRow.TotalPendingToDate)) ||
                    (processedRow.LessThanOrEqual21Days !== null && !Number.isInteger(processedRow.LessThanOrEqual21Days)) ||
                    (processedRow.Above21Days !== null && !Number.isInteger(processedRow.Above21Days)) ||
                    (processedRow.Between0to10Days !== null && !Number.isInteger(processedRow.Between0to10Days)) ||
                    (processedRow.Between11to21Days !== null && !Number.isInteger(processedRow.Between11to21Days)) ||
                    (processedRow.Between22to30Days !== null && !Number.isInteger(processedRow.Between22to30Days)) ||
                    (processedRow.Between31to45Days !== null && !Number.isInteger(processedRow.Between31to45Days)) ||
                    (processedRow.Between46to60Days !== null && !Number.isInteger(processedRow.Between46to60Days)) ||
                    (processedRow.Between61to90Days !== null && !Number.isInteger(processedRow.Between61to90Days)) ||
                    (processedRow.Between91to180Days !== null && !Number.isInteger(processedRow.Between91to180Days)) ||
                    (processedRow.Between181to365Days !== null && !Number.isInteger(processedRow.Between181to365Days)) ||
                    (processedRow.MoreThan1Year !== null && !Number.isInteger(processedRow.MoreThan1Year))
                ) {
                    deleteFile(req.uniqueFileName);
                    return res.status(403).json({ error: 'Invalid value for one or more fields' });
                }
            }
        }    

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_Cpgram_PH3_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_PH3_cpgram
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_Cpgram_PH3_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

        for (const row of trimmedData) {

            const { 
                'Name': Name, 
                'Brought Forward': BroughtForward, 
                'Received During': ReceivedDuring, 
                'Disposed During': DisposedDuring, 
                'Average Disposal Days': AverageDisposalDays, 
                'Total Pending As On ToDate': TotalPendingToDate, 
                '<=21 Days': LessThanOrEqual21Days, 
                '>21 Days': GreaterThan21Days, 
                '0-10 Days': Between0to10Days, 
                '11-21 Days': Between11to21Days, 
                '22-30 Days': Between22to30Days, 
                '31-45 Days': Between31to45Days, 
                '46-60 Days': Between46to60Days, 
                '61-90 Days': Between61to90Days, 
                '91-180 Days': Between91to180Days, 
                '181-365 Days': Between181to365Days, 
                '>1 Year': MoreThan1Year 
            } = row;

            const request = conn.request();
        
            request.input("Name", Name);
            request.input("BroughtForward", BroughtForward);
            request.input("ReceivedDuring", ReceivedDuring);
            request.input("DisposedDuring", DisposedDuring);
            request.input("AverageDisposalDays", AverageDisposalDays);
            request.input("TotalPendingToDate", TotalPendingToDate);
            request.input("LessThanOrEqual21Days", LessThanOrEqual21Days); // Updated variable name
            request.input("GreaterThan21Days", GreaterThan21Days); // Updated variable name
            request.input("Between0to10Days", Between0to10Days);
            request.input("Between11to21Days", Between11to21Days);
            request.input("Between22to30Days", Between22to30Days);
            request.input("Between31to45Days", Between31to45Days);
            request.input("Between46to60Days", Between46to60Days);
            request.input("Between61to90Days", Between61to90Days);
            request.input("Between91to180Days", Between91to180Days);
            request.input("Between181to365Days", Between181to365Days);
            request.input("MoreThan1Year", MoreThan1Year);
            request.input("month", month);
            request.input("financialYear", financialYear);
            request.input("FileId", FileId);
        
            if(!Name || Name == 'Total'){
                res.status(200).json({
                    message: "Cpgram PH3 record created successfully",
                });
                return;
            }

            await request.query(`
                INSERT INTO tbl_PH3_cpgram 
                ([Name],[Brought Forward],[Received During],[Disposed During],[Average Disposal Days],[Total Pending As On ToDate],[Between 0 to 10Days],[Between 11 to 21Days],[Between 22 to 30Days],[Between 31 to 45Days],[Between 46 to 60Days],[Between 61 to 90Days],[Between 91 to 180Days],[Between 181 to 365Days],[More Than 1 Year],[<=21 Days],[>21 Days],[Year],[Month],[File_ID]) 
                VALUES (@Name, @BroughtForward, @ReceivedDuring, @DisposedDuring, @AverageDisposalDays, @TotalPendingToDate, @Between0to10Days,@Between11to21Days, @Between22to30Days, @Between31to45Days, @Between46to60Days, @Between61to90Days, @Between91to180Days, @Between181to365Days, @MoreThan1Year, @LessThanOrEqual21Days, @GreaterThan21Days, @financialYear, @month, @FileId)
            `);
        }
        
        res.status(200).json({
            message: "Cpgram PH3 record updated successfully",
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
        const filePath = `fileuploads/Cpgram/Cpgram_PH3/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

async function getCPGRAMPH3Check(req,res){
    const conn = await pool;
      try {
          const result = await conn.query(`SELECT Top 1 Month, Year
          FROM tbl_PH3_cpgram
          WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
              SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
              FROM tbl_PH3_cpgram);
          `);
          res.json(result.recordset);
      } catch (err) {
        console.error("err",err);
        res.status(500).json({ error: "Internal server error" });
      }
  }

  


const cpgramPH3Controller = { addCPGRAMPH3, upload,
    updateCPGRAMPH3, getCPGRAMPH3Check };
export default cpgramPH3Controller;
