import { pool } from "../../db.js";
import sql from 'mssql';
// import moment from 'moment';

async function empAttendanceWeekOneReport(req, res) {
    try {
        const month = req.params.attendanceMonth;  
        const year = req.params.attendanceYear;
        const week = req.params.week;

        const conn = await pool;
        const request = conn.request();

        request.input("month", month);
        request.input("year", year); 
        request.input("week", week);

        const result = await request.query(` SELECT
          --ROW_NUMBER() OVER (ORDER BY wing_name,division_name) AS [S No],
          mmt_organization_info.wing_name AS [Wing],
          --mmt_organization_info.division_name AS [Division],
          Year,Month,week AS Week,
          COUNT(DISTINCT mmt_employee_info.Emp_Id) AS [Number Of Employees],
          ROUND(CAST(AVG(DATEDIFF(SECOND, [In_Time_Avg], [Out_Time_Avg])) / 3600.0 AS DECIMAL(10, 1)), 1) AS [Average Working Hours],
          SUM(CASE WHEN CAST([Average_Working_Hours] AS TIME) < '08:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees - Average Working Hours Less Than 8 1/2 hrs],
          SUM(CASE WHEN CAST([In_Time_Avg] AS TIME) < '09:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees InTime Before 9:30AM],
          SUM(CASE WHEN CAST([In_Time_Avg] AS TIME) > '09:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees InTime After 9:30AM],
          SUM(CASE WHEN CAST([Out_Time_Avg] AS TIME) < '17:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees OutTime before 5:30PM],
          mmt_organization_info.wing_id AS [WingID]
          --mmt_organization_info.division_id AS [DivisionID]
          FROM [sagarmanthan_revamp].[dbo].[tbl_employee_attendance]
        INNER JOIN 
          sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
        INNER JOIN 
          sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
        WHERE
          tbl_employee_attendance.Year = @year AND tbl_employee_attendance.Month = @month AND tbl_employee_attendance.week = @week
        GROUP BY [wing_name], 
        --[division_name],division_id,
        Month,Year,week,wing_id order by [Average Working Hours]
      `);
        
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }
 
      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
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

async function getDetailAttendanceWeekOneReport(req, res) {
  
  const Year = req.params.Year;
  const Month = req.params.Month;
  const Wing = req.params.Wing;  
  // const Division = req.params.Division;
  const type = req.params.type;  
  const week = req.params.week;

  let query = ''; 

  switch (type) {
    case 'beforeIn':
      query = `SELECT 
                  --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                  DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                  tbl_employee_attendance.In_Time_Avg AS [In Time Avg],
                  tbl_employee_attendance.Out_Time_Avg AS [Out Time Avg],
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                FROM 
                  sagarmanthan_revamp.dbo.tbl_employee_attendance
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
                WHERE 
                  mmt_organization_info.wing_id = @WingName
                  --AND mmt_organization_info.division_id = @DivisionName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                  AND CAST(tbl_employee_attendance.In_Time_Avg AS TIME) < '09:30:00'
                ORDER BY Average_Working_Hours`;
      break;
      
    case 'afterIn':
      query = `SELECT 
                --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                mmt_employee_info.Emp_Name AS [EMP Name],
                mmt_employee_info.Designation,
                mmt_organization_info.wing_name AS [Wing],
                mmt_organization_info.division_name AS [Division],
                tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                --tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                tbl_employee_attendance.In_Time_Avg AS [In Time Avg],
                tbl_employee_attendance.Out_Time_Avg AS [Out Time Avg],
                tbl_employee_attendance.Month,
                tbl_employee_attendance.Year,
                tbl_employee_attendance.week AS Week
              FROM 
                sagarmanthan_revamp.dbo.tbl_employee_attendance
              INNER JOIN 
                sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
              INNER JOIN 
                sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
              WHERE 
                mmt_organization_info.wing_id = @WingName
                --AND mmt_organization_info.division_id = @DivisionName
                AND tbl_employee_attendance.Year = @Year
                AND tbl_employee_attendance.Month = @Month
                AND tbl_employee_attendance.week = @week
                AND CAST(tbl_employee_attendance.In_Time_Avg AS TIME) > '09:30:00'
              ORDER BY Average_Working_Hours`;
      break;
      
    case 'beforeOut':
      query = `SELECT 
                  --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                  DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                  tbl_employee_attendance.In_Time_Avg AS [In Time Avg],
                  tbl_employee_attendance.Out_Time_Avg AS [Out Time Avg],
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                FROM 
                  sagarmanthan_revamp.dbo.tbl_employee_attendance
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
                WHERE 
                  mmt_organization_info.wing_id = @WingName
                  --AND mmt_organization_info.division_id = @DivisionName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                  AND CAST(tbl_employee_attendance.Out_Time_Avg AS TIME) < '17:30:00'
                ORDER BY Average_Working_Hours`;
      break;

      case 'noOfEmp':
      query = `SELECT 
                  --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                  DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                  tbl_employee_attendance.In_Time_Avg AS [In Time Avg],
                  tbl_employee_attendance.Out_Time_Avg AS [Out Time Avg],
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                FROM 
                  sagarmanthan_revamp.dbo.tbl_employee_attendance
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
                WHERE 
                  mmt_organization_info.wing_id = @WingName
                  --AND mmt_organization_info.division_id = @DivisionName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                ORDER BY Average_Working_Hours`;
      break;

      case 'avgWorkHours':
      query = `SELECT 
                  --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                  DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                FROM 
                  sagarmanthan_revamp.dbo.tbl_employee_attendance
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
                WHERE 
                  mmt_organization_info.wing_id = @WingName
                  --AND mmt_organization_info.division_id = @DivisionName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                ORDER BY Average_Working_Hours`;
      break;
      case 'avgWorkCount':
      query = `SELECT 
                  --ROW_NUMBER() OVER (ORDER BY tbl_employee_attendance.ID) AS [S No],
                  DISTINCT tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                FROM 
                  sagarmanthan_revamp.dbo.tbl_employee_attendance
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
                INNER JOIN 
                  sagarmanthan_revamp.dbo.mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id
                WHERE 
                  mmt_organization_info.wing_id = @WingName
                  --AND mmt_organization_info.division_id = @DivisionName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                  AND tbl_employee_attendance.Average_Working_Hours < '08:30:00'
                ORDER BY Average_Working_Hours`;
      break;

    default:
      res.status(400).send('Invalid type parameter');
      return;
  }

  try {
    const conn = await pool;
    const request = conn.request();

    request.input("Month", Month);
    request.input("Year", Year); 
    request.input("WingName", Wing);  
    // request.input("DivisionName", Division);
    request.input("type", type);
    request.input("week", week);
    
    const result = await request.query(query);
    
    const rowData = result.recordset;

    if (rowData.length === 0) {
        return res.status(404).json({ error: 'No data available for this.' });
    }

    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
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

async function getEmpAttendanceCheck(req,res){
  const conn = await pool;
    try {
        const result = await conn.query(`SELECT Top 1 Month, Year, week as Week
        FROM tbl_employee_attendance
        WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
            SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
            FROM tbl_employee_attendance)
            ORDER BY Year DESC, Month DESC, week DESC;;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



export default { empAttendanceWeekOneReport, getDetailAttendanceWeekOneReport, getEmpAttendanceCheck };