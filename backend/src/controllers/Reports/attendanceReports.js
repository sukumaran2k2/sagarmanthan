import { pool } from "../../db.js";


async function attendanceWeekOneReport(req, res) 
{
    const month = req.params.attendanceMonth;  
    const year = req.params.attendanceYear;

    const conn = await pool;
    const request = conn.request();

    request.input("month", month);
    request.input("year", year);

    try {
        // console.log("for this month ",month,"this is the year - ",year )
        const result = await request.query(` SELECT Year, Month, Wing, Division,
            COUNT(*) AS NumberOfEmployees,
            --CONVERT(TIME, DATEADD(SECOND, AVG(DATEDIFF(SECOND, '00:00:00', [In Time Avg])), '00:00:00'))  AS AverageTimeIn,
            -- CONVERT(TIME, DATEADD(SECOND, AVG(DATEDIFF(SECOND, '00:00:00', [Out Time Avg])), '00:00:00')) AS AverageTimeOut,
            ROUND(CAST(AVG(DATEDIFF(SECOND, [InTimeAvg], [OutTimeAvg])) / 3600.0 AS DECIMAL(10, 1)), 1) AS AverageWorkingHours,
            SUM(CASE WHEN CAST([InTimeAvg] AS TIME) < '09:10:00' THEN 1 ELSE 0 END) AS [NumberOfEmployeesInTimeBefore_9_10],
            SUM(CASE WHEN CAST([InTimeAvg] AS TIME) between '09:10:00' and '09:45:00' THEN 1 ELSE 0 END) AS [NumberOfEmployees_InTime_9_45AM],
            SUM(CASE WHEN CAST([InTimeAvg] AS TIME) > '09:45:00' THEN 1 ELSE 0 END) AS [NumberOfEmployeesInTimeAfter_9_45AM],
            SUM(CASE WHEN CAST([OutTimeAvg] AS TIME) < '17:45:00' THEN 1 ELSE 0 END) AS [NumberOfEmployeesOutTimebefore545PM]
            FROM [sagarmanthan_revamp].[dbo].[exceldata]
            
            GROUP BY Wing, Division,Month,Year order by Wing,Division

        `);

        const totalDataResult = await request.query(`select * from exceldata where Month = @month AND Year = @year`);

        const response = {
            AttendanceRecord: result.recordset,
            totalData: totalDataResult.recordset
        };

        res.json(response);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


export default { attendanceWeekOneReport};