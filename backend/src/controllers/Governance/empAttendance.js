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

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});


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
    try {
        const conn = await pool;
        const request = conn.request();

        const financialYear = req.body.financialYear;
        const month = req.body.month;
        const userID = req.body.userID;
        const week = req.body.week;
        const uniqueFileName = req.uniqueFileName;

        const checkResult = await conn.query(`
            SELECT COUNT(*) AS count 
            FROM tbl_employee_attendance 
            WHERE Month = '${month}' AND Year = ${financialYear} AND week = ${week};
        `);

        const storedFileID = await conn.query(`
            SELECT MAX(File_Id) AS File_Id 
            FROM tbl_employee_attendance  
            WHERE Month = '${month}' AND Year = ${financialYear}  AND week = ${week};
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
            const { 'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

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
                return res.status(410).json({ error: `Duplicate/Empty EmpIds found ${duplicateEmpIds.join(', ')}` });
            }
    
            if (typeof EmpId !== 'string') {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid Emp Id format', row: (rowIndex+1)  });
            }

            if (!Number.isInteger(AttendanceMarked)) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid No. of days Attendance Marked', row: (rowIndex+1)   });
            }

            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (!timeRegex.test(formatTime(InTimeAvg)) || !timeRegex.test(formatTime(OutTimeAvg)) || !timeRegex.test(formatTime(WorkingHours))) {
                deleteFile(req.uniqueFileName);
                return res.status(403).json({ error: 'Invalid time format', row: (rowIndex+1) });
            }
        }

        // for (const row of data) {
        //     rowIndex++;
        //     const { 'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;
        
        //     if (!Number.isInteger(EmpId)) {
        //         deleteFile(req.file, req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid Emp Id format' });
        //     }
        
        //     if (!Number.isInteger(AttendanceMarked) ) {
        //         deleteFile(req.file, req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid No. of days Attendance Marked' });
        //     }
        
        //     const timeRegex = /^\d{2}:\d{2}:\d{2}$/ ;
        //     console.log(formatTime(InTimeAvg),formatTime(OutTimeAvg),formatTime(WorkingHours));
        //     if (!timeRegex.test(formatTime(InTimeAvg)) || !timeRegex.test(formatTime(OutTimeAvg)) || !timeRegex.test(formatTime(WorkingHours))) {
        //         deleteFile(req.file, req.uniqueFileName);
        //         return res.status(403).json({ error: 'Invalid time format', row: rowIndex });
        //     }
        
        // }

        for (const row of trimmedData) {
            const EmpId = row['Emp Id'];
            const employeeCheckResult = await conn.query(`
                SELECT COUNT(*) AS count 
                FROM mmt_employee_info 
                WHERE Emp_Id = '${EmpId}'
            `);

            if (employeeCheckResult.recordset[0].count === 0) {
                deleteFile(req.file, req.uniqueFileName);
                const EmpId = row['Emp Id']; 
                return res.status(402).json({ error: `Employee ID '${EmpId}' not found in the employee table`, EmpId: EmpId });
            }
        }
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await request.query(`
            INSERT INTO tbl_emp_attendance_file 
            (file_name, uploaded_by ,date_of_upload ) 
            VALUES ('${uniqueFileName}', ${userID},'${formattedDate}')
        `);

        // Retrieve the ID of the inserted record
        const fileIdQuery = await conn.query(`
            SELECT TOP (1) ID
            FROM tbl_emp_attendance_file
            WHERE file_name = '${uniqueFileName}' 
            ORDER BY ID DESC
        `);

        const fileId = fileIdQuery.recordset[0].ID;

        for (const row of trimmedData) {
            const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

            const request = conn.request();

            const formattedWorkingHours = formatTime(WorkingHours);
            const formattedInTimeAvg = formatTime(InTimeAvg);
            const formattedOutTimeAvg = formatTime(OutTimeAvg);

            request.input("EmpId", EmpId);
            request.input("AttendanceMarked", AttendanceMarked);
            request.input("month", month);
            request.input("financialYear", financialYear);
            request.input("week", week);
            request.input("formattedInTimeAvg", formattedInTimeAvg);
            request.input("formattedOutTimeAvg", formattedOutTimeAvg);
            request.input("formattedWorkingHours", formattedWorkingHours);
            request.input("fileId", fileId);

            await request.query(`
                INSERT INTO tbl_employee_attendance 
                (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, week, File_Id) 
                VALUES (@EmpId, @AttendanceMarked, @formattedInTimeAvg, @formattedOutTimeAvg, @formattedWorkingHours, @month, @financialYear, @week, @fileId)
            `);
        }
        // for (const row of data) {
        //     const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

        //     const request = conn.request();

        //     const formattedWorkingHours = formatTime(WorkingHours);
        //     const formattedInTimeAvg = formatTime(InTimeAvg);
        //     const formattedOutTimeAvg = formatTime(OutTimeAvg);

        //     request.input("EmpId", EmpId);
        //     request.input("AttendanceMarked", AttendanceMarked);
        //     request.input("month", month);
        //     request.input("financialYear", financialYear);

        //     request.input("formattedInTimeAvg", formattedInTimeAvg);
        //     request.input("formattedOutTimeAvg", formattedOutTimeAvg);
        //     request.input("formattedWorkingHours", formattedWorkingHours);
        //     request.input("fileId", fileId);

        //     await request.query(`
        //         INSERT INTO tbl_employee_attendance 
        //         (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, File_Id) 
        //         VALUES (@EmpId, @AttendanceMarked, @formattedInTimeAvg, @formattedOutTimeAvg, @formattedWorkingHours, @month, @financialYear, @fileId)
        //     `);
        // }
        res.status(200).json({
            message: "Attendance record created successfully",
        });
    } catch (err) {
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function updateEmpAttendance(req, res) {
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

        for (const row of trimmedData) {
            rowIndex++;
            const { 'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;
        
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
                return res.status(403).json({ error: 'Invalid Emp Id format', row: (rowIndex+1) });
            }
        
            // Validate No. of days Attendance Marked            
            if (!Number.isInteger(AttendanceMarked) ) {
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
            SELECT file_name FROM tbl_emp_attendance_file
            WHERE id = '${FileId}';
        `);

        const deleteFileName = fileName.recordset[0].file_name;
        deleteFile(deleteFileName);


        await request.query(`
            DELETE FROM tbl_employee_attendance
            WHERE File_Id = '${FileId}';
        `);

        await request.query(`
            UPDATE tbl_emp_attendance_file
            SET file_name = '${uniqueFileName}',
            uploaded_by = ${userID},
            date_of_upload = '${formattedDate}'
            WHERE id = ${FileId}; 
        `);

        for (const row of trimmedData) {
            const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

            const request = conn.request();

            const formattedWorkingHours = formatTime(WorkingHours);
            const formattedInTimeAvg = formatTime(InTimeAvg);
            const formattedOutTimeAvg = formatTime(OutTimeAvg);

            request.input("EmpId", EmpId);
            request.input("AttendanceMarked", AttendanceMarked);
            request.input("month", month);
            request.input("financialYear", financialYear);
            request.input("week", week);
            request.input("formattedInTimeAvg", formattedInTimeAvg);
            request.input("formattedOutTimeAvg", formattedOutTimeAvg);
            request.input("formattedWorkingHours", formattedWorkingHours);
            request.input("FileId", FileId);

            await request.query(`
                INSERT INTO tbl_employee_attendance 
                (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, week, File_Id) 
                VALUES (@EmpId, @AttendanceMarked, @formattedInTimeAvg, @formattedOutTimeAvg, @formattedWorkingHours, @month, @financialYear, @week, @FileId)
            `);
        }
        // for (const row of data) {
        //     const {'Emp Id': EmpId, 'No. of days Attendance Marked': AttendanceMarked, 'In Time Avg': InTimeAvg, 'Out Time Avg': OutTimeAvg, 'Average Working Hours': WorkingHours } = row;

        //     const request = conn.request();

        //     const formattedWorkingHours = formatTime(WorkingHours);
        //     const formattedInTimeAvg = formatTime(InTimeAvg);
        //     const formattedOutTimeAvg = formatTime(OutTimeAvg);

        //     request.input("EmpId", EmpId);
        //     request.input("AttendanceMarked", AttendanceMarked);
        //     request.input("month", month);
        //     request.input("financialYear", financialYear);

        //     request.input("formattedInTimeAvg", formattedInTimeAvg);
        //     request.input("formattedOutTimeAvg", formattedOutTimeAvg);
        //     request.input("formattedWorkingHours", formattedWorkingHours);
        //     request.input("FileId", FileId);

        //     await request.query(`
        //         INSERT INTO tbl_employee_attendance 
        //         (Emp_Id, No_of_days_Attendance_Marked, In_Time_Avg, Out_Time_Avg, Average_Working_Hours, Month, Year, File_Id) 
        //         VALUES (@EmpId, @AttendanceMarked, @formattedInTimeAvg, @formattedOutTimeAvg, @formattedWorkingHours, @month, @financialYear, @FileId)
        //     `);
        // }
        res.status(200).json({
            message: "Attendance record created successfully",
        });
    } catch (err) {
        deleteFile(req.uniqueFileName);
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

function formatTime(timeValue) {
    if (typeof timeValue === 'number' && !isNaN(timeValue)) {
        //const totalSeconds = Math.floor(timeValue * 24 * 60 * 60);
        //const totalSeconds = timeValue * 24 * 60 * 60;
        const totalSeconds = Math.round(timeValue * 24 * 60 * 60);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Convert the time parts to strings and pad with zeros if needed
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');

        const formattedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        return formattedTime;
    } else {
        return null;
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
            return res.status(404).json({ error: 'No data available' });
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

    res.json({ columnDefs, rowData });


    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } finally {
      await sql.close();
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
            return res.status(404).json({ error: 'No data available for this month and year' });
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
  


const empAttendanceTab = { createEmpAttendance, upload, addEmpDataAttendance,
    getEmployeeAttendance, updateEmpAttendance, getEmpAttendance, agSample };
export default empAttendanceTab;
