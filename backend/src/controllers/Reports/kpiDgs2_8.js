import { pool } from "../../db.js";


async function getKpi2_8_1_report(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() - 1;
        
        let previousMonth, previousYear, nextYear;
        
        if (currentMonth === 1) {
            previousMonth = 12;
        } else {
            previousMonth = currentMonth - 1;
        }
        
        previousYear = currentYear - 1;
        nextYear = currentYear + 1;

        request.input("previousYear", previousYear);
        request.input('nextYear', nextYear);
        request.input("currentMonth", currentMonth);
        request.input("currentYear", currentYear);
        request.input("previousMonth", previousMonth);
        
        const result = await request.query(`
           SELECT 
                m.mmd_name AS [Name of MMD],
                
                -- Fetch the latest number of surveyors posted
                (SELECT TOP 1 vs.no_of_surveyors_posted
                 FROM tbl_vessel_survey vs
                 WHERE vs.mmd_id = m.mmd_id
                 ORDER BY vs.year DESC, vs.month DESC
                ) AS [Surveyors Posted],

                -- Sum of target values for the previous fiscal year
                SUM(CASE 
                    WHEN (vs.year = @previousYear AND vs.month >= 4) 
                    OR (vs.year = @currentYear AND vs.month <= 3) 
                    THEN vs.target_no_of_vessels 
                    ELSE 0 
                END) AS [Target No. of Vessels During Previous FY],

                -- Sum of target values for the current fiscal year
                SUM(CASE 
                    WHEN (vs.year = @currentYear AND vs.month >= 4) 
                    AND (vs.year = @currentYear AND vs.month <= @previousMonth) 
                    THEN vs.target_no_of_vessels 
                    ELSE 0 
                END) AS [Target No. of Vessels During Current FY],

                -- Target for the current month
                SUM(CASE 
                    WHEN vs.year = @currentYear AND vs.month = @currentMonth 
                    THEN vs.target_no_of_vessels 
                    ELSE 0 
                END) AS [Target No. of Vessels During Current Month],

                -- Total target for the current fiscal year
                SUM(CASE 
                    WHEN (vs.year = @currentYear AND vs.month >= 4) 
                    OR (vs.year = @nextYear AND vs.month <= 3) 
                    THEN vs.target_no_of_vessels 
                    ELSE 0 
                END) AS [Target Total for Current FY],

                -- Sum of actual values for the previous fiscal year
                SUM(CASE 
                    WHEN (vs.year = @previousYear AND vs.month >= 4) 
                    OR (vs.year = @currentYear AND vs.month <= 3) 
                    THEN vs.actual_no_of_vessels 
                    ELSE 0 
                END) AS [Actual No. of Vessels During Previous FY],

                -- Sum of actual values for the current fiscal year
                SUM(CASE 
                    WHEN (vs.year = @currentYear AND vs.month >= 4) 
                    AND (vs.year = @currentYear AND vs.month <= @previousMonth) 
                    THEN vs.actual_no_of_vessels 
                    ELSE 0 
                END) AS [Actual No. of Vessels During Current FY],

                -- Actual for the current month
                SUM(CASE 
                    WHEN vs.year = @currentYear AND vs.month = @currentMonth 
                    THEN vs.actual_no_of_vessels 
                    ELSE 0 
                END) AS [Actual No. of Vessels During Current Month],

                -- Total actual for the current fiscal year
                SUM(CASE 
                    WHEN (vs.year = @currentYear AND vs.month >= 4) 
                    OR (vs.year = @nextYear AND vs.month <= 3) 
                    THEN vs.actual_no_of_vessels 
                    ELSE 0 
                END) AS [Actual Total for Current FY]
           FROM 
                tbl_vessel_survey vs
           JOIN 
                mmt_mmd_name m ON vs.mmd_id = m.mmd_id
           GROUP BY 
                m.mmd_name, m.mmd_id;
        `);
        
        const rowData = result.recordset;
        
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        rowData.forEach(row => {
            row.TargetPrevFY = row['Target No. of Vessels During Previous FY'];
            row.TargetCurrentFY = row['Target No. of Vessels During Current FY'];
            row.TargetMonthFY = row['Target No. of Vessels During Current Month'];
            row.TargetTotalFY = row['Target Total for Current FY'];
        
            row.ActualVesselsDuringPreviousFY = row['Actual No. of Vessels During Previous FY'];
            row.ActualVesselsDuringCurrentFY = row['Actual No. of Vessels During Current FY'];
            row.ActualVesselsDuringCurrentMonth = row['Actual No. of Vessels During Current Month'];
            row.ActualTotalFY = row['Actual Total for Current FY'];
        
            row.PercentPrevFY = ((row['Actual No. of Vessels During Previous FY'] / row.TargetPrevFY) * 100).toFixed(2) || 0;
            row.PercentCurrentFY = ((row['Actual No. of Vessels During Current FY'] / row.TargetCurrentFY) * 100).toFixed(2) || 0;
            row.PercentMonthFY = ((row['Actual No. of Vessels During Current Month'] / row.TargetMonthFY) * 100).toFixed(2) || 0;
            row.PercentTotalFY = ((row['Actual Total for Current FY'] / row.TargetTotalFY) * 100).toFixed(2) || 0;
        });
        
     
        // Calculate month -2 (two months ago) and month -3 (three months ago)
        const monthMinus2 = new Date(currentDate);
        monthMinus2.setMonth(currentDate.getMonth() - 2); // Month -2 (two months ago)
        const monthMinus2Year = monthMinus2.getFullYear();
  
        const monthMinus3 = new Date(currentDate);
        monthMinus3.setMonth(currentDate.getMonth() - 3); // Month -3 (three months ago)
        const monthMinus3Year = monthMinus3.getFullYear();
  
        // Get full month name for month -2
        const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
        // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;
  
  
        // Get the last date of month -2
        const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
        const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');
  
        // Get the last date of month -3
        const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
        const lastDateOfMonthMinus3Formatted = lastDateOfMonthMinus3.toLocaleDateString('en-GB');
  
        // Financial year calculation based on the previous month
        let previousFinancialYear, currentFinancialYear;
        if (monthMinus2.getMonth() + 1 >= 4) {
            previousFinancialYear = `${currentYear - 1}-${currentYear}`;
            currentFinancialYear = `${currentYear}-${currentYear + 1}`;
        } else {
            previousFinancialYear = `${currentYear - 2}-${currentYear - 1}`;
            currentFinancialYear = `${currentYear - 1}-${currentYear}`;
        }
  
        // // Output results
        // console.log(`Previous Financial Year: ${previousFinancialYear}`);
        // console.log(`Current Financial Year: ${currentFinancialYear}`);
        // console.log(`Month -2 Full Name: ${monthMinus2Name}-${monthMinus2Year}`);
        // console.log(`Month -2 Last Date: ${lastDateOfMonthMinus2Formatted}`);
        // console.log(`Month -3 Last Date: ${lastDateOfMonthMinus3Formatted}`);
  
      
        
        // Column definitions
        let columnDefs = [
            { headerName: 'Name of MMD', field: 'Name of MMD' },
            { headerName: 'No. of Surveyors Posted', field: 'Surveyors Posted' },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: 'headercenter',
                children: [
                    { headerName: 'Target No. of Vessels to be Surveyed', field: 'TargetPrevFY' },
                    { headerName: 'Actual No. of Vessels to be Surveyed', field: 'ActualVesselsDuringPreviousFY' },
                    { headerName: '% Vessel Surveys Achieved', field: 'PercentPrevFY' }
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: 'headercenter',
                children: [
                    { headerName: 'Target No. of Vessels to be Surveyed', field: 'TargetCurrentFY' },
                    { headerName: 'Actual No. of Vessels to be Surveyed', field: 'ActualVesselsDuringCurrentFY' },
                    { headerName: '% Vessel Surveys Achieved', field: 'PercentCurrentFY' }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: 'headercenter',
                children: [
                    { headerName: 'Target No. of Vessels to be Surveyed', field: 'TargetMonthFY' },
                    { headerName: 'Actual No. of Vessels to be Surveyed', field: 'ActualVesselsDuringCurrentMonth' },
                    { headerName: '% Vessel Surveys Achieved', field: 'PercentMonthFY' }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: 'headercenter',
                children: [
                    { headerName: 'Target No. of Vessels to be Surveyed', field: 'TargetTotalFY' },
                    { headerName: 'Actual No. of Vessels to be Surveyed', field: 'Actual Total for Current FY' },
                    { headerName: '% Vessel Surveys Achieved', field: 'PercentTotalFY' }
                ]
            }
        ];
        
        res.json({ columnDefs, rowData });
        
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
}

async function getKpi2_8_2_report(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 
            ? `${currentYr}-${currentYr + 1}` 
            : `${currentYr - 1}-${currentYr}`;

        const [startYear, endYear] = financialYear.split('-');

        let result = await request.query(`   
            DECLARE @FinancialYearStartDate DATE, @FinancialYearEndDate DATE;
            -- Calculate financial year start date and end date
            SET @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;

            SET @FinancialYearEndDate = CASE 
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) + 1 AS VARCHAR(4)) + '-03-31' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-03-31' AS DATE)
            END;

            -- Retrieve data for the total surveys carried out for the current financial year
            SELECT
                'Total No. of PSC/FSI/Survey/Audits Carried Out' AS Category,
                'Total Surveys Carried Out',
                [April], [May], [June], [July], [August], [September], 
                [October], [November], [December], [January], [February], [March]
            FROM (
                SELECT 
                    DATENAME(month, DATEADD(month, [month] - 1, 0)) AS MonthName, 
                    SUM(total_survey_carried) AS Count
                FROM 
                    tbl_vessel_survey_log
                WHERE
                    -- Filter based on financial year start and end dates
                    CAST(CAST([year] AS VARCHAR(4)) + RIGHT('0' + CAST([month] AS VARCHAR(2)), 2) + '01' AS DATE) 
                    BETWEEN @FinancialYearStartDate AND @FinancialYearEndDate
                GROUP BY 
                    [month]
            ) AS SourceTable
            PIVOT (
                MAX(Count) 
                FOR MonthName IN ([April], [May], [June], [July], [August], [September], 
                                [October], [November], [December], [January], [February], [March])
            ) AS PivotTable;
        `);         

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'Data Not yet entered for the months of Current Financial Year' });
        }

        const columnDefs = [
            { headerName: "Category", field: "Category", pinned: "left", width: 200 },
            { headerName: "April", field: "April", width: 100 },
            { headerName: "May", field: "May", width: 100 },
            { headerName: "June", field: "June", width: 100 },
            { headerName: "July", field: "July", width: 100 },
            { headerName: "August", field: "August", width: 100 },
            { headerName: "September", field: "September", width: 100 },
            { headerName: "October", field: "October", width: 100 },
            { headerName: "November", field: "November", width: 100 },
            { headerName: "December", field: "December", width: 100 },
            { headerName: "January", field: "January", width: 100 },
            { headerName: "February", field: "February", width: 100 },
            { headerName: "March", field: "March", width: 100 }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    } 
}

async function getKpi2_8_3_report(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        let result = await request.query(`
            DECLARE @cols AS NVARCHAR(MAX), @query AS NVARCHAR(MAX);

            -- Generate financial year columns dynamically from FY2014-2015 to the current financial year
            WITH FinancialYearRange AS (
                SELECT 'FY2014-2015' AS financial_year
                UNION ALL
                SELECT CONCAT('FY', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), '-', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE SUBSTRING(financial_year, 3, 4) < YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END
            )
            SELECT @cols = STRING_AGG(QUOTENAME(financial_year), ',')
            FROM FinancialYearRange;

            -- Build the dynamic query to fetch data for each financial year
            SET @query = '
            WITH FinancialYearRange AS (
                SELECT ''FY2014-2015'' AS financial_year
                UNION ALL
                SELECT CONCAT(''FY'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), ''-'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE SUBSTRING(financial_year, 3, 4) < YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END
            )
            SELECT ''Total No. of PSC/FSI/Survey/Audits Targeted'' AS Category, ' + @cols + '
            FROM (
                SELECT f.financial_year, SUM(t.total_survey_carried) AS total
                FROM FinancialYearRange f
                LEFT JOIN (
                    SELECT 
                        CASE 
                            WHEN [month] IN (4,5,6,7,8,9,10,11,12) THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                            WHEN [month] IN (1,2,3) THEN CONCAT(''FY'', [year] - 1, ''-'', [year])
                        END AS financial_year, 
                        total_survey_carried
                    FROM tbl_vessel_survey_log
                    WHERE [year] >= 2014
                ) t ON f.financial_year = t.financial_year
                GROUP BY f.financial_year
            ) AS SourceTable
            PIVOT (
                SUM(total) FOR financial_year IN (' + @cols + ')
            ) AS FyPivot;
            ';

            -- Execute the dynamic query
            EXEC sp_executesql @query;
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
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

export default { getKpi2_8_1_report, getKpi2_8_2_report, getKpi2_8_3_report };
