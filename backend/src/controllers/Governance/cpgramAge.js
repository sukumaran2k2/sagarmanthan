import multer from 'multer';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const uploadDestination = "./fileuploads/Cpgram/Cpgram_Age";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Cpgram/Cpgram_Age");
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


async function addCPGRAMAge(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_age_cpgram 
            WHERE Month = '${month}' AND Year = ${financialYear}
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_age_cpgram  
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

        const requiredHeaders = ['Brought Forwarded', 'Grievance(s) Received', 'Grievance(s) Disposed', 'Average Disposal Time(Days)','Pending as of now','Pending <=21 Days', 'Pending >21 Days','Pending 0-10 Days', 'Pending 11-21 Days', 'Pending 22-30 Days', 'Pending 31-45 Days', 'Pending 46-60 Days', 'Pending 61-90 Days','Pending 91-180 Days', 'Pending 181-365 Days', 'Pending from more than a year'];
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
            const { 'Brought Forward': BroughtForward, 'Received During': ReceivedDuring, 'Disposed During': DisposedDuring, 'Average Disposal Time(Days)': AverageDisposalDays,'Pending as of now':PendingOfNow,
            'Pending <=21 Days': PendingLess21, 'Pending >21 Days':PendingGreater21,
            'Total Pending As On ToDate': TotalPendingToDate, 'Between 0-10 Days': Between0to10Days, 
            'Between 11-21 Days': Between11to21Days,'Between 22-30 Days': Between22to30Days, 'Between 31 to 45Days': Between31to45Days, 'Between 46 to 60Days': Between46to60Days,
            'Between 61 to 90Days': Between61to90Days, 'Between 91 to 180Days': Between91to180Days, 'Between 181 to 365Days': Between181to365Days, 
            'More Than 1 Year': MoreThan1Year } = row;

            // Handle empty or null values by replacing them with placeholders
            const handleNull = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };
            // Replace empty or null values with placeholders
            const processedRow = {
                'BroughtForward': handleNull(BroughtForward),
                'ReceivedDuring': handleNull(ReceivedDuring),
                'DisposedDuring': handleNull(DisposedDuring),
                'AverageDisposalDays': handleNull(AverageDisposalDays),
                'TotalPendingToDate': handleNull(TotalPendingToDate),
                'PendingOfNow':handleNull(PendingOfNow),
                'PendingLess21':handleNull(PendingLess21),
                'PendingGreater21':handleNull(PendingGreater21),
                'Between0to10Days': handleNull(Between0to10Days),
                'Between11to21Days': handleNull(Between11to21Days),
                'Between22to30Days': handleNull(Between22to30Days),
                'Between31to45Days': handleNull(Between31to45Days),
                'Between46to60Days': handleNull(Between46to60Days),
                'Between61to90Days': handleNull(Between61to90Days),
                'Between91to180Days': handleNull(Between91to180Days),
                'Between181to365Days': handleNull(Between181to365Days),
                'MoreThan1Year': handleNull(MoreThan1Year),
            };

            // Validation for null and empty values
            if (
                processedRow.BroughtForward === null ||
                processedRow.ReceivedDuring === null ||
                processedRow.DisposedDuring === null ||
                processedRow.AverageDisposalDays === null ||
                processedRow.TotalPendingToDate === null ||
                processedRow.PendingOfNow === null||
                processedRow.PendingLess21 === null||
                processedRow.PendingGreater21 === null||
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
                continue; // Skip processing this row
            }

            // Validation for integer values
            else if (
                (!Number.isInteger(processedRow.BroughtForward) && processedRow.BroughtForward !== null) ||
                (!Number.isInteger(processedRow.ReceivedDuring) && processedRow.ReceivedDuring !== null) ||
                (typeof processedRow.DisposedDuring !== 'string' && processedRow.DisposedDuring !== null) ||
                (!Number.isInteger(processedRow.AverageDisposalDays) && processedRow.AverageDisposalDays !== null) ||
                (!Number.isInteger(processedRow.TotalPendingToDate) && processedRow.TotalPendingToDate !== null) ||
                (!Number.isInteger(processedRow.PendingOfNow) && processedRow.PendingOfNow !== null) ||
                (!Number.isInteger(processedRow.PendingLess21) && processedRow.PendingLess21 !== null) ||
                (!Number.isInteger(processedRow.PendingGreater21) && processedRow.PendingGreater21 !== null) ||
                (!Number.isInteger(processedRow.Between0to10Days) && processedRow.Between0to10Days !== null) ||
                (!Number.isInteger(processedRow.Between11to21Days) && processedRow.Between11to21Days !== null) ||
                (!Number.isInteger(processedRow.Between22to30Days) && processedRow.Between22to30Days !== null) ||
                (!Number.isInteger(processedRow.Between31to45Days) && processedRow.Between31to45Days !== null) ||
                (!Number.isInteger(processedRow.Between46to60Days) && processedRow.Between46to60Days !== null) ||
                (!Number.isInteger(processedRow.Between61to90Days) && processedRow.Between61to90Days !== null) ||
                (!Number.isInteger(processedRow.Between91to180Days) && processedRow.Between91to180Days !== null) ||
                (!Number.isInteger(processedRow.Between181to365Days) && processedRow.Between181to365Days !== null) ||
                (!Number.isInteger(processedRow.MoreThan1Year) && processedRow.MoreThan1Year !== null)
            ) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid value for one or more fields' });
            }
        }

        for (const row of trimmedData) {
            rowIndex++;
            const { 'Brought Forwarded': BroughtForwarded, 
                'Grievance(s) Received': GrievancesReceived, 
                'Grievance(s) Disposed': GrievancesDisposed, 
                'Average Disposal Time(Days)': AverageDisposalTimeDays,
                'Pending as of now':PendingOfNow,
                'Pending <=21 Days':PendingLess21,
                'Pending >21 Days':PendingGreater21 ,
                'Pending 0-10 Days': Pending0to10Days,
                'Pending 11-21 Days': Pending11to21Days,
                'Pending 22-30 Days': Pending22to30Days,
                'Pending 31-45 Days': Pending31to45Days, 
                'Pending 46-60 Days': Pending46to60Days, 
                'Pending 61-90 Days': Pending61to90Days, 
                'Pending 91-180 Days': Pending91to180Days, 
                'Pending 181-365 Days': Pending181to365Days, 'Pending from more than a year': PendingMoreThan1Year } = row;
                 // Log for debugging
                 const cleanedGrievancesDisposed = parseInt(GrievancesDisposed.replace(/[^\d.-]/g, ''), 10);
    
            if (!Number.isInteger(BroughtForwarded) || !Number.isInteger(GrievancesReceived) ||  !Number.isInteger(cleanedGrievancesDisposed) || typeof AverageDisposalTimeDays !== 'number'  || !Number.isInteger(AverageDisposalTimeDays)||!Number.isInteger(PendingOfNow) ||!Number.isInteger(PendingLess21) || !Number.isInteger(PendingGreater21) || !Number.isInteger(Pending0to10Days) || !Number.isInteger(Pending11to21Days) || !Number.isInteger(Pending22to30Days)|| !Number.isInteger(Pending31to45Days) || !Number.isInteger(Pending46to60Days) || !Number.isInteger(Pending61to90Days) || !Number.isInteger(Pending91to180Days) || !Number.isInteger(Pending181to365Days) || !Number.isInteger(PendingMoreThan1Year)) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid value for one or more fields' });
            }
        }
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_Cpgram_Age_file 
            (File_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        // Retrieve the ID of the inserted record
        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_Cpgram_Age_file
            WHERE File_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const { 'Brought Forwarded': BroughtForwarded, 'Grievance(s) Received': GrievancesReceived, 
                'Grievance(s) Disposed': GrievancesDisposed, 'Average Disposal Time(Days)': AverageDisposalTimeDays,
                'Pending as of now':PendingOfNow,'Pending <=21 Days':PendingLess21,'Pending >21 Days':PendingGreater21 ,
                'Pending 0-10 Days': Pending0to10Days, 'Pending 11-21 Days': Pending11to21Days,
                'Pending 22-30 Days': Pending22to30Days, 
                'Pending 31-45 Days': Pending31to45Days, 'Pending 46-60 Days': Pending46to60Days, 
                'Pending 61-90 Days': Pending61to90Days, 'Pending 91-180 Days': Pending91to180Days, 
                'Pending 181-365 Days': Pending181to365Days, 'Pending from more than a year': PendingMoreThan1Year } = row;
        
            const request = conn.request();
        
            request.input("BroughtForwarded", BroughtForwarded);
            request.input("GrievancesReceived", GrievancesReceived);
            request.input("GrievancesDisposed", GrievancesDisposed);
            request.input("AverageDisposalTimeDays", AverageDisposalTimeDays);
            request.input('PendingOfNow',PendingOfNow);
            request.input('PendingLess21',PendingLess21);
            request.input('PendingGreater21',PendingGreater21);
            request.input("Pending0to10Days", Pending0to10Days);
            request.input("Pending11to21Days", Pending11to21Days);
            request.input("Pending22to30Days", Pending22to30Days);
            request.input("Pending31to45Days", Pending31to45Days);
            request.input("Pending46to60Days", Pending46to60Days);
            request.input("Pending61to90Days", Pending61to90Days);
            request.input("Pending91to180Days", Pending91to180Days);
            request.input("Pending181to365Days", Pending181to365Days);
            request.input("PendingMoreThan1Year", PendingMoreThan1Year);
            request.input("fileId", fileId);
            request.input("month", month);
            request.input("financialYear", financialYear);
        
            await request.query(`
                INSERT INTO tbl_age_cpgram 
                ([Brought Forwarded],[Grievance(s) Received],[Grievance(s) Disposed],[Average Disposal Time(Days)],[Pending as of now],[Pending <=21 Days],[Pending >21 Days],[Pending 0-10 Days],[Pending 11-21 Days],[Pending 22-30 Days],[Pending 31-45 Days],[Pending 46-60 Days],[Pending 61-90 Days],[Pending 91-180 Days],[Pending 181-365 Days],[Pending from more than a year],[Year],[Month],[File_ID]) 
                VALUES (@BroughtForwarded, @GrievancesReceived, @GrievancesDisposed, @AverageDisposalTimeDays ,@PendingOfNow,@PendingLess21 ,@PendingGreater21 ,@Pending0to10Days, @Pending11to21Days, @Pending22to30Days, @Pending31to45Days, @Pending46to60Days, @Pending61to90Days, @Pending91to180Days, @Pending181to365Days, @PendingMoreThan1Year, @financialYear, @month, @fileId)
            `);
        }
              
       
        res.status(200).json({
            message: "Cpgram Age record created successfully",
        });
    } catch (err) {
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function updateCPGRAMAge(req, res) {
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


        const requiredHeaders = ['Brought Forwarded', 'Grievance(s) Received', 'Grievance(s) Disposed', 'Average Disposal Time(Days)','Pending as of now','Pending <=21 Days', 'Pending >21 Days', 'Pending 0-10 Days','Pending 11-21 Days', 'Pending 22-30 Days', 'Pending 31-45 Days', 'Pending 46-60 Days', 'Pending 61-90 Days', 'Pending 91-180 Days', 'Pending 181-365 Days', 'Pending from more than a year'];
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
            const { 'Brought Forward': BroughtForward, 'Received During': ReceivedDuring, 'Disposed During': DisposedDuring, 'Average Disposal Time(Days)': AverageDisposalDays, 'Pending as of now': PendingOfNow,
            'Pending <=21 Days': PendingLess21, 'Pending >21 Days':PendingGreater21, 'Between 0 to 10Days': Between0to10Days, 'Total Pending As On ToDate': TotalPendingToDate,
            'Between 11 to 21Days': Between11to21Days,'Between 22 to 30Days': Between22to30Days, 'Between 31 to 45Days': Between31to45Days, 'Between 46 to 60Days': Between46to60Days, 'Between 61 to 90Days': Between61to90Days, 
            'Between 91 to 180Days': Between91to180Days, 'Between 181 to 365Days': Between181to365Days, 
            'More Than 1 Year': MoreThan1Year } = row;

            // Handle empty or null values by replacing them with placeholders
            const handleNull = (value) => {
                return value !== null && value !== undefined && value !== '' ? value : null;
            };

            // Replace empty or null values with placeholders
            const processedRow = {
                'BroughtForward': handleNull(BroughtForward),
                'ReceivedDuring': handleNull(ReceivedDuring),
                'DisposedDuring': handleNull(DisposedDuring),
                'AverageDisposalDays': handleNull(AverageDisposalDays),
                'TotalPendingToDate': handleNull(TotalPendingToDate),
                'PendingOfNow':handleNull(PendingOfNow),
                'PendingLess21':handleNull(PendingLess21),
                'PendingGreater21':handleNull(PendingGreater21),
                'Between0to10Days': handleNull(Between0to10Days),
                'Between11to21Days': handleNull(Between11to21Days),
                'Between22to30Days': handleNull(Between22to30Days),
                'Between31to45Days': handleNull(Between31to45Days),
                'Between46to60Days': handleNull(Between46to60Days),
                'Between61to90Days': handleNull(Between61to90Days),
                'Between91to180Days': handleNull(Between91to180Days),
                'Between181to365Days': handleNull(Between181to365Days),
                'MoreThan1Year': handleNull(MoreThan1Year),
            };

            // Validation for null and empty values
            if (
                processedRow.BroughtForward === null ||
                processedRow.ReceivedDuring === null ||
                processedRow.DisposedDuring === null ||
                processedRow.AverageDisposalDays === null ||
                processedRow.TotalPendingToDate === null ||
                processedRow.PendingOfNow === null||
                processedRow.PendingLess21 === null||
                processedRow.PendingGreater21 === null||
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
                continue; // Skip processing this row
            }

            // Validation for integer values
            else if (
                (!Number.isInteger(processedRow.BroughtForward) && processedRow.BroughtForward !== null) ||
                (!Number.isInteger(processedRow.ReceivedDuring) && processedRow.ReceivedDuring !== null) ||
                (typeof processedRow.DisposedDuring !== 'string' && processedRow.DisposedDuring !== null) ||
                (!Number.isInteger(processedRow.AverageDisposalDays) && processedRow.AverageDisposalDays !== null) ||
                (!Number.isInteger(processedRow.TotalPendingToDate) && processedRow.TotalPendingToDate !== null) ||
                (!Number.isInteger(processedRow.PendingOfNow) && processedRow.PendingOfNow !== null) ||
                (!Number.isInteger(processedRow.PendingLess21) && processedRow.PendingLess21 !== null) ||
                (!Number.isInteger(processedRow.PendingGreater21) && processedRow.PendingGreater21 !== null) ||
                (!Number.isInteger(processedRow.Between0to10Days) && processedRow.Between0to10Days !== null) ||
                (!Number.isInteger(processedRow.Between11to21Days) && processedRow.Between11to21Days !== null) ||
                (!Number.isInteger(processedRow.Between22to30Days) && processedRow.Between22to30Days !== null) ||
                (!Number.isInteger(processedRow.Between31to45Days) && processedRow.Between31to45Days !== null) ||
                (!Number.isInteger(processedRow.Between46to60Days) && processedRow.Between46to60Days !== null) ||
                (!Number.isInteger(processedRow.Between61to90Days) && processedRow.Between61to90Days !== null) ||
                (!Number.isInteger(processedRow.Between91to180Days) && processedRow.Between91to180Days !== null) ||
                (!Number.isInteger(processedRow.Between181to365Days) && processedRow.Between181to365Days !== null) ||
                (!Number.isInteger(processedRow.MoreThan1Year) && processedRow.MoreThan1Year !== null)
            ) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid value for one or more fields' });
            }
        }


        for (const row of trimmedData) {
            rowIndex++;
            const { 'Brought Forwarded': BroughtForwarded, 
                'Grievance(s) Received': GrievancesReceived, 
                'Grievance(s) Disposed': GrievancesDisposed, 
                'Average Disposal Time(Days)': AverageDisposalTimeDays,'Pending as of now':PendingOfNow,
                'Pending <=21 Days':PendingLess21,'Pending >21 Days':PendingGreater21 , 
                'Pending 0-10 Days': Pending0to10Days,'Pending 11-21 Days': Pending11to21Days, 'Pending 22-30 Days': Pending22to30Days, 
                'Pending 31-45 Days': Pending31to45Days, 'Pending 46-60 Days': Pending46to60Days,
                'Pending 61-90 Days': Pending61to90Days, 'Pending 91-180 Days': Pending91to180Days, 
                'Pending 181-365 Days': Pending181to365Days, 
                'Pending from more than a year': PendingMoreThan1Year } = row;
        
            if (!Number.isInteger(BroughtForwarded) || !Number.isInteger(GrievancesReceived) || typeof GrievancesDisposed !== 'string' || !Number.isInteger(AverageDisposalTimeDays) ||!Number.isInteger(PendingOfNow) || !Number.isInteger(PendingLess21) || !Number.isInteger(PendingGreater21) || !Number.isInteger(Pending0to10Days) || !Number.isInteger(Pending11to21Days) || !Number.isInteger(Pending22to30Days) ||!Number.isInteger(Pending31to45Days) || !Number.isInteger(Pending46to60Days) || !Number.isInteger(Pending61to90Days) || !Number.isInteger(Pending91to180Days) || !Number.isInteger(Pending181to365Days) || !Number.isInteger(PendingMoreThan1Year)) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid value for one or more fields' });
            }
        }    
        
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const fileName =  await request.query(`
            SELECT File_name FROM tbl_Cpgram_Age_file
            WHERE ID = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].File_name;
        deleteFile(deleteFileName);

        await request.query(`
            DELETE FROM tbl_age_cpgram
            WHERE File_ID = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_Cpgram_Age_file
            SET File_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE ID = ${FileId}; 
        `);

        for (const row of trimmedData) {
            const { 'Brought Forwarded': BroughtForwarded, 'Grievance(s) Received': GrievancesReceived, 'Grievance(s) Disposed': GrievancesDisposed, 'Average Disposal Time(Days)': AverageDisposalTimeDays,'Pending as of now':PendingOfNow,'Pending <=21 Days':PendingLess21,'Pending >21 Days':PendingGreater21 , 'Pending 0-10 Days': Pending0to10Days,'Pending 11-21 Days': Pending11to21Days, 'Pending 22-30 Days': Pending22to30Days, 'Pending 31-45 Days': Pending31to45Days, 'Pending 46-60 Days': Pending46to60Days, 'Pending 61-90 Days': Pending61to90Days, 'Pending 91-180 Days': Pending91to180Days, 'Pending 181-365 Days': Pending181to365Days, 'Pending from more than a year': PendingMoreThan1Year } = row;
        
            const request = conn.request();
        
            request.input("BroughtForwarded", BroughtForwarded);
            request.input("GrievancesReceived", GrievancesReceived);
            request.input("GrievancesDisposed", GrievancesDisposed);
            request.input("AverageDisposalTimeDays", AverageDisposalTimeDays);
            request.input('PendingOfNow',PendingOfNow);
            request.input('PendingLess21',PendingLess21);
            request.input('PendingGreater21',PendingGreater21);
            request.input("Pending0to10Days", Pending0to10Days);
            request.input("Pending11to21Days", Pending11to21Days);
            request.input("Pending22to30Days", Pending22to30Days);
            request.input("Pending31to45Days", Pending31to45Days);
            request.input("Pending46to60Days", Pending46to60Days);
            request.input("Pending61to90Days", Pending61to90Days);
            request.input("Pending91to180Days", Pending91to180Days);
            request.input("Pending181to365Days", Pending181to365Days);
            request.input("PendingMoreThan1Year", PendingMoreThan1Year);
            request.input("FileId", FileId);
            request.input("month", month);
            request.input("financialYear", financialYear);
        
            await request.query(`
                INSERT INTO tbl_age_cpgram 
                ([Brought Forwarded],[Grievance(s) Received],[Grievance(s) Disposed],[Average Disposal Time(Days)],[Pending as of now],[Pending <=21 Days],[Pending >21 Days],[Pending 0-10 Days],[Pending 11-21 Days],[Pending 22-30 Days],[Pending 31-45 Days],[Pending 46-60 Days],[Pending 61-90 Days],[Pending 91-180 Days],[Pending 181-365 Days],[Pending from more than a year],[Year],[Month],[File_ID]) 
                VALUES (@BroughtForwarded, @GrievancesReceived, @GrievancesDisposed, @AverageDisposalTimeDays,@PendingOfNow,@PendingLess21 ,@PendingGreater21 , @Pending0to10Days, @Pending11to21Days, @Pending22to30Days, @Pending31to45Days, @Pending46to60Days, @Pending61to90Days, @Pending91to180Days, @Pending181to365Days, @PendingMoreThan1Year, @financialYear, @month, @FileId)
            `);
        }
        
        
        res.status(200).json({
            message: "Cpgram Age record updated successfully",
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
        const filePath = `fileuploads/Cpgram/Cpgram_Age/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
    if (fileName && fs.existsSync(fileName.path)) {
        fs.unlinkSync(fileName.path); 
    }
}

async function getCPGRAMAgeCheck(req,res){
    const conn = await pool;
      try {
          const result = await conn.query(`SELECT Top 1 Month, Year
          FROM tbl_age_cpgram
          WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
              SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
              FROM tbl_age_cpgram);
          `);
          res.json(result.recordset);
      } catch (err) {
          console.log(err);
          return res.sendStatus(500);
      }
  }

  


const cpgramAgeController = { addCPGRAMAge, upload,
    updateCPGRAMAge, getCPGRAMAgeCheck };
export default cpgramAgeController;
