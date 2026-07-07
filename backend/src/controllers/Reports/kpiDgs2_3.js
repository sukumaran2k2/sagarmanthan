import { pool } from "../../db.js";
import moment from 'moment';

async function getReportKpiDgs2_3_1(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');

        request.input("startYears",startYear);
        console.log(startYear, endYear)
        let result = await request.query(` 
          
       DECLARE @FinancialYearStartDate DATE, @FinancialYearEndDate DATE, @startYear INT;

        -- Assign the passed start year
        SET @startYear = @startYears;

        -- Calculate the start and end date for the financial year
        set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         

        SELECT
            mmt_kpi_2_3_data.type_id AS typeId,  
            mmt_kpi_2_3_data.grade_id AS gradeId,
            mmt_kpi_2_3_data.code_id AS codeId,  
            mmt_kpi_2_3_data.subject_id AS subjectId,
            mmt_kpi_2_3_data.frequency_id AS frequencyId, 
            mmt_kpi_type_2_3.type_name AS typeName, 
            mmt_kpi_grade_2_3.grade_name AS gradeName, 
            mmt_kpi_code_2_3.code_name AS codeName,  
            mmt_kpi_subject_2_3.subject_name AS subjectName,
            mmt_kpi_frequency_2_3.frequency_name AS frequencyName,

            -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
            SUM(CASE 
                WHEN (
                    ([year] = @startYear - 1 AND [month] >= 4) OR 
                    ([year] = @startYear AND [month] <= 3)
                )
                THEN [candidates_appeared] 
                ELSE 0 
            END) AS candidatesAppearedPy,

            SUM(CASE 
                WHEN (
                    ([year] = @startYear - 1 AND [month] >= 4) OR 
                    ([year] = @startYear AND [month] <= 3)
                )
                THEN [candidate_passed] 
                ELSE 0 
            END) AS candidatesPassedPy,

            ROUND( 
                (CAST(SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [candidate_passed] 
                    ELSE 0 
                END) AS FLOAT)  
                / NULLIF(SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [candidates_appeared] 
                    ELSE 0 
                END), 0)) * 100, 2 
            ) AS passPercentagePy,

            -- ii) Current Financial Year (FY) up to the current month
            SUM(CASE 
                WHEN  (
                    ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                    ([year] <= YEAR(@FinancialYearEndDate) AND [month] <= MONTH(@FinancialYearEndDate))
                )
                THEN [candidates_appeared] 
                ELSE 0 
            END) AS candidatesAppearedCurrentYear,

            SUM(CASE 
                WHEN  (
                    ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                    ([year] <= YEAR(@FinancialYearEndDate) AND [month] <= MONTH(@FinancialYearEndDate))
                )
                THEN [candidate_passed] 
                ELSE 0 
            END) AS candidatesPassedCurrentYear,

            ROUND( 
                (CAST(SUM(CASE 
                    WHEN  (
                        ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                        ([year] <= YEAR(@FinancialYearEndDate) AND [month] <= MONTH(@FinancialYearEndDate))
                    )
                    THEN [candidate_passed] 
                    ELSE 0 
                END) AS FLOAT)  
                / NULLIF(SUM(CASE 
                    WHEN  (
                        ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                        ([year] <= YEAR(@FinancialYearEndDate) AND [month] <= MONTH(@FinancialYearEndDate))
                    )
                    THEN [candidates_appeared] 
                    ELSE 0 
                END), 0)) * 100, 2 
            ) AS passPercentageCurrentYear,

            -- iii) Current month
            SUM(CASE 
                WHEN (
                    [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                )
                AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                THEN [candidates_appeared]
                ELSE 0 
            END) AS candidatesAppearedMonth,

            SUM(CASE 
                WHEN (
                    [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                )
                AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                THEN [candidate_passed]
                ELSE 0 
            END) AS candidatesPassedMonth,

            ROUND( 
                (CAST(SUM(CASE 
                    WHEN (
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [candidate_passed]
                    ELSE 0 
                END) AS FLOAT)  
                / NULLIF(SUM(CASE 
                    WHEN (
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [candidates_appeared]
                    ELSE 0 
                END), 0)) * 100, 2 
            ) AS passPercentageMonth,

            -- iv) Total for the current financial year
            SUM(CASE 
                WHEN  (
                    ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                    ([year] <= YEAR(DATEADD(MONTH, 1, @FinancialYearEndDate)) AND [month] <= MONTH(DATEADD(MONTH, 1, @FinancialYearEndDate)))
                )
                THEN [candidates_appeared]
                ELSE 0 
            END) AS candidatesAppearedTotal,

            SUM(CASE 
                WHEN  (
                    ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                    ([year] <= YEAR(DATEADD(MONTH, 1, @FinancialYearEndDate)) AND [month] <= MONTH(DATEADD(MONTH, 1, @FinancialYearEndDate)))
                )
                THEN [candidate_passed]
                ELSE 0 
            END) AS candidatesPassedTotal,

            ROUND( 
                (CAST(SUM(CASE 
                    WHEN  (
                        ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                        ([year] <= YEAR(DATEADD(MONTH, 1, @FinancialYearEndDate)) AND [month] <= MONTH(DATEADD(MONTH, 1, @FinancialYearEndDate)))
                    )
                    THEN [candidate_passed]
                    ELSE 0 
                END) AS FLOAT)  
                / NULLIF(SUM(CASE 
                    WHEN  (
                        ([year] >= YEAR(@FinancialYearStartDate) AND [month] >= MONTH(@FinancialYearStartDate)) AND
                        ([year] <= YEAR(DATEADD(MONTH, 1, @FinancialYearEndDate)) AND [month] <= MONTH(DATEADD(MONTH, 1, @FinancialYearEndDate)))
                    )
                    THEN [candidates_appeared]
                    ELSE 0 
                END), 0)) * 100, 2 
            ) AS passPercentageTotal

        FROM
            [sagarmanthan_revamp].[dbo].[mmt_kpi_2_3_data] AS mmt_kpi_2_3_data
        INNER JOIN mmt_kpi_type_2_3 AS mmt_kpi_type_2_3 ON mmt_kpi_type_2_3.type_id = mmt_kpi_2_3_data.type_id
        INNER JOIN mmt_kpi_grade_2_3 AS mmt_kpi_grade_2_3 ON mmt_kpi_grade_2_3.grade_id = mmt_kpi_2_3_data.grade_id
        INNER JOIN mmt_kpi_code_2_3 AS mmt_kpi_code_2_3 ON mmt_kpi_code_2_3.code_id = mmt_kpi_2_3_data.code_id
        INNER JOIN mmt_kpi_subject_2_3 AS mmt_kpi_subject_2_3 ON mmt_kpi_subject_2_3.subject_id = mmt_kpi_2_3_data.subject_id
        INNER JOIN mmt_kpi_frequency_2_3 AS mmt_kpi_frequency_2_3 ON mmt_kpi_frequency_2_3.frequency_id = mmt_kpi_2_3_data.frequency_id

        -- We assume tbl_kpi_dgs_2_3_2 contains the required data for calculations
        LEFT JOIN tbl_kpi_dgs_2_3_2 ON tbl_kpi_dgs_2_3_2.type_id = mmt_kpi_2_3_data.type_id
                                        AND tbl_kpi_dgs_2_3_2.grade_id = mmt_kpi_2_3_data.grade_id
                                        AND tbl_kpi_dgs_2_3_2.code_id = mmt_kpi_2_3_data.code_id
                                        AND tbl_kpi_dgs_2_3_2.subject_id = mmt_kpi_2_3_data.subject_id
                                        AND tbl_kpi_dgs_2_3_2.frequency_id = mmt_kpi_2_3_data.frequency_id

        GROUP BY
            mmt_kpi_2_3_data.type_id, 
            mmt_kpi_type_2_3.type_name,
            mmt_kpi_2_3_data.grade_id,
            mmt_kpi_grade_2_3.grade_name, 
            mmt_kpi_2_3_data.code_id, 
            mmt_kpi_code_2_3.code_name,
            mmt_kpi_2_3_data.subject_id, 
            mmt_kpi_subject_2_3.subject_name,
            mmt_kpi_2_3_data.frequency_id, 
            mmt_kpi_frequency_2_3.frequency_name;
       
        `);

        // console.log(result.recordset, 'result')
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); // Get the current year

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

        let columnDefs = [
            {
                headerName: 'Type', field: 'typeName', headerClass: "headercenter", pinned: true, width: 120,
                children: [
                    {
                        headerName: "A ", field: "typeName", pinned: true, width: 120,
                        //filter: 'agTextColumnFilter',
                    }
                ]
            },
            {
                headerName: 'Grade', field: 'gradeName', headerClass: "headercenter", pinned: true, width: 250,
                children: [
                    {
                        headerName: "B", field: "gradeName", pinned: true, width: 250,
                        //filter: 'agTextColumnFilter',
                    }
                ]
            },
            {
                headerName: 'Code', field: 'codeName', headerClass: "headercenter", pinned: true, width: 100,
                children: [
                    {
                        headerName: "C", field: "codeName", pinned: true, width: 100,
                        //filter: 'agTextColumnFilter',
                    }
                ]
            },
            {
                headerName: 'Subject', field: 'subjectName', headerClass: "headercenter", pinned: true, width: 250,
                children: [
                    {
                        headerName: "D", field: "subjectName", pinned: true, width: 250,
                        //filter: 'agTextColumnFilter',
                    }
                ]
            },
            {
                headerName: 'Frequeny', field: 'frequencyName', headerClass: "headercenter", pinned: true, width: 130,
                children: [
                    {
                        headerName: "E", field: "frequencyName", pinned: true, width: 130,
                        //filter: 'agTextColumnFilter',
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Candidates Appeared', field: 'candidatesAppearedPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "candidatesAppearedPy",
                                //filter: 'agTextColumnFilter',
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Candidates Passed', field: 'candidatesPassedPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "candidatesPassedPy",
                                //filter: 'agTextColumnFilter',
                            }
                        ]
                    },
                    {
                        headerName: 'Pass Percentage', field: 'passPercentagePy',
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "H",
                                field: "passPercentagePy",
                                //filter: 'agTextColumnFilter',                             
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Candidates Appeared', field: 'candidatesAppearedCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "I",
                                field: "candidatesAppearedCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Candidates Passed', field: 'candidatesPassedCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "candidatesPassedCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Pass Percentage', field: 'passPercentageCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        children: [
                            {
                                headerName: "K",
                                field: "passPercentageCurrentYear",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Candidates Appeared', field: 'candidatesAppearedMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "L",
                                field: "candidatesAppearedMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Candidates Passed', field: 'candidatesPassedMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "M",
                                field: "candidatesPassedMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Pass Percentage', field: 'passPercentageMonth', headerClass: "headercenter",
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        children: [
                            {
                                headerName: "N",
                                field: "passPercentageMonth",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Candidates Appeared', field: 'candidatesAppearedTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "candidatesAppearedTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Candidates Passed', field: 'candidatesPassedTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "P",
                                field: "candidatesPassedTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Pass Percentage', field: 'passPercentageTotal', headerClass: "headercenter",
                        headerTooltip: '((Candidated Passed / Candidate Appeared) * 100)',
                        children: [
                            {
                                headerName: "Q",
                                field: "passPercentageTotal",
                            }
                        ]
                    },
                ]
            }
        ];

        res.json({ columnDefs, rowData });
        // console.log("typeName", rowData)
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};

async function getReportKpiDgs2_3_2(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

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

            -- Retrieve data for the current financial year (April 1st to March 31st)
            SELECT
                'Total Exams Conducted- Nautical' AS Category,
                [April], [May], [June], [July], [August], [September], 
                [October], [November], [December], [January], [February], [March]
            FROM (
                SELECT 
                    DATENAME(month, DATEADD(month, [month] - 1, 0)) AS MonthName, 
					total_exam_nautical AS Count

                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_3_1]
                WHERE
                    -- Filter based on financial year start and end dates
                    CAST(CAST([year] AS VARCHAR(4)) + RIGHT('0' + CAST([month] AS VARCHAR(2)), 2) + '01' AS DATE) 
                    BETWEEN @FinancialYearStartDate AND @FinancialYearEndDate
                
            ) AS SourceTable
            PIVOT (
                MAX(Count) 
                FOR MonthName IN ([April], [May], [June], [July], [August], [September], 
                                [October], [November], [December], [January], [February], [March])
            ) AS PivotTable
            UNION ALL
            SELECT
                'Total Exams Conducted- Engineering',
                [April], [May], [June], [July], [August], [September], 
                [October], [November], [December], [January], [February], [March]
            FROM (
                SELECT 
                    DATENAME(month, DATEADD(month, [month] - 1, 0)) AS MonthName, 
                    total_exam_engineering AS Count
                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_3_1]
                WHERE
                    -- Filter based on financial year start and end dates
                    CAST(CAST([year] AS VARCHAR(4)) + RIGHT('0' + CAST([month] AS VARCHAR(2)), 2) + '01' AS DATE) 
                    BETWEEN @FinancialYearStartDate AND @FinancialYearEndDate
              
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
            { headerName: `April-${startYear.toString().slice(-2)}`, field: "April", width: 100 },
            { headerName: `May-${startYear.toString().slice(-2)}`, field: "May", width: 100 },
            { headerName: `June-${startYear.toString().slice(-2)}`, field: "June", width: 100 },
            { headerName: `July-${startYear.toString().slice(-2)}`, field: "July", width: 100 },
            { headerName: `August-${startYear.toString().slice(-2)}`, field: "August", width: 100 },
            { headerName: `September-${startYear.toString().slice(-2)}`, field: "September", width: 100 },
            { headerName: `October-${startYear.toString().slice(-2)}`, field: "October", width: 100 },
            { headerName: `November-${startYear.toString().slice(-2)}`, field: "November", width: 100 },
            { headerName: `December-${startYear.toString().slice(-2)}`, field: "December", width: 100 },
            { headerName: `January-${endYear.toString().slice(-2)}`, field: "January", width: 100 },
            { headerName: `February-${endYear.toString().slice(-2)}`, field: "February", width: 100 },
            { headerName: `March-${endYear.toString().slice(-2)}`, field: "March", width: 100 }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};


async function getReportKpiDgs2_3_3(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        let result = await request.query(`   
           DECLARE @cols AS NVARCHAR(MAX),@query AS NVARCHAR(MAX);

            -- Step 1: Dynamically get the distinct financial years from FY2014-2015 onwards
            WITH FinancialYearRange AS (
                -- Generate a list of financial years from FY2014-2015 to future years
                SELECT 'FY2014-2015' AS financial_year
                UNION ALL
                SELECT CONCAT('FY', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), '-', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE SUBSTRING(financial_year, 3, 4) < YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END  -- Dynamically add future years based on current date
            )
            SELECT @cols = STRING_AGG(QUOTENAME(financial_year), ',')
            FROM FinancialYearRange;

            -- Step 2: Build the dynamic SQL query
            SET @query = '
            WITH FinancialYearRange AS (
                SELECT ''FY2014-2015'' AS financial_year
                UNION ALL
                SELECT CONCAT(''FY'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), ''-'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE SUBSTRING(financial_year, 3, 4) < YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END  -- Generate future years
            )
            SELECT ''Total Exams Conducted- Nautical'' AS Category, ' + @cols + '
            FROM (
                SELECT f.financial_year,  
					total_exam_nautical AS registered
                FROM FinancialYearRange f
                LEFT JOIN (
                    SELECT 
                        CASE 
                            WHEN [month] IN (4,5,6,7,8,9,10,11,12) THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                            WHEN [month] IN (1,2,3) THEN CONCAT(''FY'', [year]-1, ''-'', [year])
                            ELSE ''FY''
                        END AS financial_year, 
                        total_exam_nautical
                    FROM [tbl_kpi_dgs_2_3_1]
                    WHERE [year] >= 2014  -- Only include data from FY2014-2015 onwards
                ) a ON f.financial_year = a.financial_year
               -- GROUP BY f.financial_year
            ) AS SourceTable
            PIVOT (
                SUM(registered) FOR financial_year IN (' + @cols + ')
            ) AS RegisteredPivot

            UNION ALL

            SELECT ''Total Exams Conducted- Engineering'' AS Category, ' + @cols + '
            FROM (
                SELECT f.financial_year,  total_exam_engineering AS cumulative
                FROM FinancialYearRange f
                LEFT JOIN (
                    SELECT 
                        CASE 
                            WHEN [month] IN (4,5,6,7,8,9,10,11,12) THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                            WHEN [month] IN (1,2,3) THEN CONCAT(''FY'', [year]-1, ''-'', [year])
                            ELSE ''FY''
                        END AS financial_year, 
                       total_exam_engineering
                    FROM [tbl_kpi_dgs_2_3_1]
                    WHERE [year] >= 2014  -- Only include data from FY2014-2015 onwards
                ) a ON f.financial_year = a.financial_year
               -- GROUP BY f.financial_year
            ) AS SourceTable
            PIVOT (
                SUM(cumulative) FOR financial_year IN (' + @cols + ')
            ) AS CumulativePivot;
            ';

            -- Step 3: Execute the dynamic query
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
};

export default {
    getReportKpiDgs2_3_1, getReportKpiDgs2_3_2, getReportKpiDgs2_3_3
};