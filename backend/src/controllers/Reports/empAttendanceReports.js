import { pool } from "../../db.js";

// Attendance report rules (QC AT-05, decided 11-Nov-2026; 2.0 counted differently):
// - Employees absent the whole week (0 days marked) stay in "Number Of Employees" and get their
//   own column, but are left out of the time columns and the average. So are rows with days
//   marked but no time recorded (00:00:00).
// - An in-time of exactly 09:30:00 is on time ("at or before 9:30"), only later is "after".
// - Working hours are the hours uploaded in the sheet (Average_Working_Hours), for both the
//   average and the "less than 8 1/2 hrs" count, so the two always agree.
const ATTENDED = `(tbl_employee_attendance.No_of_days_Attendance_Marked > 0
    AND CAST(tbl_employee_attendance.In_Time_Avg AS TIME) <> '00:00:00')`;
const ABSENT = `tbl_employee_attendance.No_of_days_Attendance_Marked = 0`;
const IN_TIME = `CAST(tbl_employee_attendance.In_Time_Avg AS TIME)`;
const OUT_TIME = `CAST(tbl_employee_attendance.Out_Time_Avg AS TIME)`;
const HOURS = `CAST(tbl_employee_attendance.Average_Working_Hours AS TIME)`;

const FROM_SQL = `
    FROM tbl_employee_attendance
    INNER JOIN mmt_employee_info ON tbl_employee_attendance.Emp_Id = mmt_employee_info.Emp_Id
    INNER JOIN mmt_organization_info ON mmt_employee_info.organization_id = mmt_organization_info.organization_id`;

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

        const result = await request.query(`
        SELECT
          mmt_organization_info.wing_name AS [Wing],
          Year, Month, week AS Week,
          COUNT(DISTINCT mmt_employee_info.Emp_Id) AS [Number Of Employees],
          SUM(CASE WHEN ${ABSENT} THEN 1 ELSE 0 END) AS [Number Of Employees Absent All Week],
          ROUND(CAST(AVG(CASE WHEN ${ATTENDED} THEN CAST(DATEDIFF(SECOND, '00:00:00', ${HOURS}) AS FLOAT) END) / 3600.0 AS DECIMAL(10, 1)), 1) AS [Average Working Hours],
          SUM(CASE WHEN ${ATTENDED} AND ${HOURS} < '08:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees - Average Working Hours Less Than 8 1/2 hrs],
          SUM(CASE WHEN ${ATTENDED} AND ${IN_TIME} <= '09:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees InTime At or Before 9:30AM],
          SUM(CASE WHEN ${ATTENDED} AND ${IN_TIME} > '09:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees InTime After 9:30AM],
          SUM(CASE WHEN ${ATTENDED} AND ${OUT_TIME} < '17:30:00' THEN 1 ELSE 0 END) AS [Number Of Employees OutTime before 5:30PM],
          mmt_organization_info.wing_id AS [WingID]
        ${FROM_SQL}
        WHERE tbl_employee_attendance.Year = @year AND tbl_employee_attendance.Month = @month AND tbl_employee_attendance.week = @week
        GROUP BY wing_name, Month, Year, week, wing_id
        ORDER BY [Average Working Hours]
      `);

        const rowData = result.recordset;

        // No sheet for that week: an empty report, not an error (QC AT-10)
        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [] });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
        }));

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
}

// The employees behind one report cell: which rows each column counts (the same rules as the
// report) and whether their in / out times are shown
const DETAIL_TYPES = {
    noOfEmp: { where: '1 = 1', times: true },
    absent: { where: ABSENT, times: true },
    beforeIn: { where: `${ATTENDED} AND ${IN_TIME} <= '09:30:00'`, times: true },
    afterIn: { where: `${ATTENDED} AND ${IN_TIME} > '09:30:00'`, times: true },
    beforeOut: { where: `${ATTENDED} AND ${OUT_TIME} < '17:30:00'`, times: true },
    avgWorkHours: { where: ATTENDED, times: false },
    avgWorkCount: { where: `${ATTENDED} AND ${HOURS} < '08:30:00'`, times: false },
};

async function getDetailAttendanceWeekOneReport(req, res) {
    const { Year, Month, Wing, type, week } = req.params;
    const detail = DETAIL_TYPES[type];
    if (!detail) return res.status(400).send('Invalid type parameter');

    const timeColumns = detail.times ? `
                  tbl_employee_attendance.In_Time_Avg AS [In Time Avg],
                  tbl_employee_attendance.Out_Time_Avg AS [Out Time Avg],` : '';

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("Month", Month);
        request.input("Year", Year);
        request.input("WingName", Wing);
        request.input("week", week);

        const result = await request.query(`
                SELECT DISTINCT
                  tbl_employee_attendance.Emp_Id AS [EMP ID],
                  mmt_employee_info.Emp_Name AS [EMP Name],
                  mmt_employee_info.Designation,
                  mmt_organization_info.wing_name AS [Wing],
                  mmt_organization_info.division_name AS [Division],
                  tbl_employee_attendance.No_of_days_Attendance_Marked AS [No of days Attendance Marked],
                  tbl_employee_attendance.Average_Working_Hours AS [Average Working Hours],${timeColumns}
                  tbl_employee_attendance.Month,
                  tbl_employee_attendance.Year,
                  tbl_employee_attendance.week AS Week
                ${FROM_SQL}
                WHERE mmt_organization_info.wing_id = @WingName
                  AND tbl_employee_attendance.Year = @Year
                  AND tbl_employee_attendance.Month = @Month
                  AND tbl_employee_attendance.week = @week
                  AND ${detail.where}
                ORDER BY [Average Working Hours]`);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [] });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
        }));

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
}

async function getEmpAttendanceCheck(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`SELECT Top 1 Month, Year, week as Week
        FROM tbl_employee_attendance
        WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
            SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
            FROM tbl_employee_attendance)
            ORDER BY Year DESC, Month DESC, week DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

export default { empAttendanceWeekOneReport, getDetailAttendanceWeekOneReport, getEmpAttendanceCheck };
