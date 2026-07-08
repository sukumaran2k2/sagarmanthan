import { pool } from "../../db.js";
import moment from 'moment';


async function getReportKpiDgs6_1(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT 
            m.mmd_name AS [Name of MMD],
            -- Previous Financial Year (From April of the previous year to March of the current year)
            --CONCAT(YEAR(GETDATE()) - 1, '-04-01 to ', YEAR(GETDATE()), '-03-31') AS [Previous Financial Year],
            -- Current Financial Year (From April of the current year to March of the next year)
            --CONCAT(YEAR(GETDATE()), '-04-01 to ', YEAR(GETDATE()) + 1, '-03-31') AS [Current Financial Year],
        
            -- Sum of ships inspected for the Previous Financial Year (April of the previous year to March of the current year)
            SUM(CASE 
                WHEN (t.mmd_year = YEAR(GETDATE()) - 1 AND t.mmd_month >= 4) 
                    OR (t.mmd_year = YEAR(GETDATE()) AND t.mmd_month <= 3)
                THEN t.mmd_ship_inspected
                ELSE 0
            END) AS [totalShipsPy],
            
            -- Sum of ships inspected for the Current Financial Year (April of the current fy is (current month subtract 3) )
            SUM(CASE 
                WHEN (t.mmd_year = YEAR(GETDATE()) AND t.mmd_month >= 4 AND (MONTH(GETDATE()) = 4 OR t.mmd_month < MONTH(GETDATE()) - 2))
                THEN t.mmd_ship_inspected
                ELSE 0
            END) AS [totalShipsCurrentYear],
        
            -- Sum of ships inspected in the (current month subtract 2)
            SUM(CASE 
                WHEN t.mmd_year = YEAR(GETDATE()) AND t.mmd_month = MONTH(GETDATE()) - 2
                THEN t.mmd_ship_inspected
                ELSE 0
            END) AS [totalShipsMonth],

            -- total ship - Current FY (April to P.P month - 1) + Current month(Previous Month - 1) 
            SUM(CASE 
                WHEN (t.mmd_year = YEAR(GETDATE()) AND t.mmd_month >= 4 AND t.mmd_month < MONTH(GETDATE())) THEN t.mmd_ship_inspected
                WHEN t.mmd_year = YEAR(GETDATE()) AND t.mmd_month = MONTH(GETDATE()) - 1 THEN t.mmd_ship_inspected
                ELSE 0
            END) AS [totalShipsTotal]
        
        FROM 
            mmt_mmd_name m
        LEFT JOIN 
            tbl_kpi_dgs_2_6_1 t ON m.mmd_id = t.mmd_id
        GROUP BY 
            m.mmd_name;
        `);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // const currentDate = new Date();

        // // Get the year and previous month (we subtract 1 to get the previous month as current month)
        // const previousMonthDate = new Date();
        // previousMonthDate.setMonth(currentDate.getMonth() - 2); // Previous of Previous month as current month
        // const year = previousMonthDate.getFullYear(); // Year for the previous month
        // const currentYear = currentDate.getFullYear();
        // const month = previousMonthDate.toLocaleString('default', { month: 'short' }); // Previous month as short name

        // // last date of the previous month
        // const lastDateOfPreviousMonth = new Date(year, previousMonthDate.getMonth() + 1, 0);
        // const fullLastDate = lastDateOfPreviousMonth.toLocaleDateString('en-GB'); 

        // //previous of previous month
        // const previousOfPreviousMonthDate = new Date();
        // previousOfPreviousMonthDate.setMonth(currentDate.getMonth() - 2); // current month - 3
        // const prevOfPrevMonth = previousOfPreviousMonthDate.toLocaleString('default', { month: 'short' });

        // let previousFinancialYear, currentFinancialYear;
        // if (previousMonthDate.getMonth() + 1 >= 4) {
        //     previousFinancialYear = `${year - 1}-${year}`;
        //     currentFinancialYear = `${year}-${year + 1}`;
        // } else {
        //     previousFinancialYear = `${year - 2}-${year - 1}`;
        //     currentFinancialYear = `${year - 1}-${year}`;
        // }

        // console.log(`Previous Financial Year: ${previousFinancialYear}`);
        // console.log(`Current Financial Year: ${currentFinancialYear}`);
        // console.log(`Previous Month (current month): ${month}`);
        // console.log(`Previous Month (current year): ${year}`);
        // console.log(`Full Last Date of Previous Month: ${fullLastDate}`);
        // console.log(`Previous of Previous Month: ${prevOfPrevMonth}`);
        // children: [
        //     {
        //         headerName: `During the Previous FY (${previousFinancialYear})`,
        //         field: "totalShipsPy",
        //     },
        //     {
        //         headerName: `During the Current FY-upto ${prevOfPrevMonth} ${currentYear}`,
        //         field: "totalShipsCurrentYear",
        //     },
        //     {
        //         headerName: `During the month (${month}-${currentYear})`,
        //         field: "totalShipsMonth",
        //     },                    
        //     {
        //         headerName: `Total for the current FY up to ${fullLastDate}`,
        //         field: "totalShipsTotal",
        //     },
        // ]

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
                headerName: "Name of MMD",
                field: "Name of MMD",

            },
            {
                headerName: "No of Ships Inspected",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: `During the Previous FY (${previousFinancialYear})`,
                        field: "totalShipsPy",
                    },
                    {
                        headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`,
                        field: "totalShipsCurrentYear",
                    },
                    {
                        headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`,
                        field: "totalShipsMonth",
                    },
                    {
                        headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`,
                        field: "totalShipsTotal",
                    },
                ]
            }
        ];

        // res.json({ columnDefs, rowData, fullLastDate, month });
        res.json({ columnDefs, rowData });

    } catch (error) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getReportKpiDgs6_2(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        // console.log(startYear, endYear)

        request.input("startYears", startYear);

        let result = await request.query(` 
            declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

            set @startYear = @startYears

            set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         
			
		    SELECT
                [ship_type] AS shipType,
        
                -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
                --INSPECTION --------------------------------
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_inspection] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_inspection] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_inspection] 
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_inspection] 
                    ELSE 0 
                END) 
                AS allAgesInspectionPy,

        
                --DETENTION-----------------------------
               SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_detentions] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_detentions] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_detentions] 
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_detentions] 
                    ELSE 0 
                END) 
                AS allAgesDetentionsPy,

				--DEFICIENCY ------------------------------------------
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_deficiencies] 
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_deficiencies] 
                    ELSE 0 
                END) 
                AS allAgesDeficiencyPy,

				--NIL DEFICIENCY -------------------------------------------				  
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_nil_deficiencies] 
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_nil_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_nil_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_nil_deficiencies] 
                    ELSE 0 
                END) 
                AS allAgesNilDeficiencyPy,

                --AVERAGE DEFICIENCY-----------------------------------------
                ROUND(
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [upto_5_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_5_years_inspection] 
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_5to15_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_5to15_years_inspection] 
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_16to25_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_16to25_years_inspection] 
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_25_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_25_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS allAgesAvgDefIndexPy,

                -- NIL AVERAGE DEFICIENCY  -------------------------------
                ROUND (
                ( (  CAST(SUM(CASE 
                WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                    ([year] =  @startYear  AND [month] <= 3))
                THEN [upto_5_years_nil_deficiencies] 
                ELSE 0 
                END) AS FLOAT)   /   NULLIF(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [upto_5_years_inspection] 
                    ELSE 0 
                END), 0) ) * 100 )
                +
                ( ( CAST(SUM(CASE 
                WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                    ([year] =  @startYear  AND [month] <= 3))
                THEN [above_5to15_years_nil_deficiencies] 
                ELSE 0 
                END) AS FLOAT)   /   NULLIF(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_5to15_years_inspection] 
                    ELSE 0 
                END), 0) ) * 100 )
                +
                ( ( CAST(SUM(CASE 
                WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                    ([year] =  @startYear  AND [month] <= 3))
                THEN [above_16to25_years_nil_deficiencies] 
                ELSE 0 
                END) AS FLOAT)   /   NULLIF(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_16to25_years_inspection] 
                    ELSE 0 
                END), 0) ) * 100 ) 
                +
                 ( ( CAST(SUM(CASE 
                WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                    ([year] =  @startYear  AND [month] <= 3))
                THEN [above_25_years_nil_deficiencies] 
                ELSE 0 
                END) AS FLOAT)   /   NULLIF(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_25_years_inspection] 
                    ELSE 0 
                END), 0) ) * 100 ), 2)  AS allAgesNilDefRatePy,
              
                
                -- ii) Current Financial Year (FY) up to the current month
                --INSPECTION -----------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                AS allAgesInspectionCurrentYear,

                -- DETENTION ----------------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_5_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_5to15_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_16to25_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +  
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_25_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesDetentionsCurrentYear,

				--DEFICIENCY --------------------------------------
				    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_5_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_5to15_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_16to25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END)
                +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END)
                 AS allAgesDeficiencyCurrentYear,

				--NIL DEFICIENCY ----------------------------------
				    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_5_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_5to15_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_16to25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END)
                +
                    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                -- AVERAGE DEFICIENCY ---------------------------------
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [upto_5_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                         WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_5to15_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                         WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_16to25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) , 2) 
                    AS allAgesAvgDefIndexCurrentYear,

                -- NIL AVERAGE DEFICIENCY -----------------------------------
                ROUND (
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [upto_5_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_5to15_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_16to25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )
                            THEN  [above_25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100 ), 2) AS allAgesNilDefRateCurrentYear,


                -- iii) Current month
                -- INSPECTION ----------------------------------------------------
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_inspection]
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_inspection]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_inspection]
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_inspection]
                    ELSE 0 
                END) AS allAgesInspectionsMonth,


                --DETENTION ----------------------------------------
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_detentions]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_detentions]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_detentions]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_detentions]
                    ELSE 0 
                END)  AS allAgesyDetentionsMonth,

				--DEFICIENCY --------------------------------------
				SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_deficiencies]
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_deficiencies]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_deficiencies]
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_deficiencies]
                    ELSE 0 
                END) AS allAgesDeficiencyMonth,


				-- NIL DEFICIENCY --------------------------------------
				SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_nil_deficiencies]
                    ELSE 0 
                END)
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_nil_deficiencies]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_nil_deficiencies]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_nil_deficiencies]
                    ELSE 0 
                END) AS allAgesNilDeficiencyMonth,


                -- Calculating Average with protection against division by zero
                --AVERAGE DEFICIENCY -----------------------------
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                    END), 0)
                    +
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                    END), 0)
                    + 
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_25_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_25_years_inspection]
                        ELSE 0 
                    END), 0), 2) AS allAgesAvgDefIndexMonth,

                --NIL AVEREGE DEFICIENCY ----------------------------
                ROUND(
                    CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                    END), 0) 
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                    END), 0) ) * 100 )
                    +                
                    ( ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                    END), 0) ) * 100 ) 
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_25_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_25_years_inspection]
                        ELSE 0 
                    END), 0) ) * 100 ), 2) AS allAgesNilDefRateMonth,


                -- iv) Total for the current financial year		
				-- Sum of detention for the current FY up to the previous month
                -- INSPECTION ----------------------	
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                END) +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_inspection]
                        ELSE 0 
                END) AS allAgesInspectionsTotal,

                --DETENTIONS --------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_detentions]
                        ELSE 0 
                END) 
                +                  
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_detentions]
                        ELSE 0 
                END) 
                +                
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_detentions]
                        ELSE 0 
                END) 
                +                
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_detentions]
                        ELSE 0 
                END) AS allAgesDetentionsTotal,


				--DEFICIENCY -------------------------------------
				  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_deficiencies]
                        ELSE 0 
                END) +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_deficiencies]
                        ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_deficiencies]
                        ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_deficiencies]
                        ELSE 0 
                END) AS allAgesDeficiencyTotal,

				--NIL DEFICIENCY ----------------------------------------
				SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_nil_deficiencies]
                        ELSE 0 
                END) +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_nil_deficiencies]
                        ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_nil_deficiencies]
                        ELSE 0 
                END) 
                + 
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_nil_deficiencies]
                        ELSE 0 
                END) AS allAgesNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_inspection]
                            ELSE 0 
                    END), 0), 2) AS allAgesAvgDefIndexTotal,

                --NIL AVERAGE DEFICIENCY
                ROUND (
                    ( ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_inspection]
                            ELSE 0 
                    END), 0) ) * 100 )
                    +
                    CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_inspection]
                            ELSE 0 
                    END), 0) ) * 100 )  
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_inspection]
                            ELSE 0 
                END), 0) ) * 100), 2)  AS allAgesNilDefRateTotal
              
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2]
            GROUP BY
                [ship_type]             
            ;          
        `);

        // console.log(result, 'result')
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
                headerName: 'Type of Vessel',
                field: 'shipType',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "shipType",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'allAgesInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "allAgesInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'allAgesDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "allAgesDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'allAgesDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'allAgesNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'allAgesAvgDefIndexPy',
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "D",
                                field: "allAgesAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'allAgesNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "allAgesNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'allAgesInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "allAgesInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'allAgesDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "allAgesDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'allAgesDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'allAgesNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'allAgesAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "allAgesAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'allAgesNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "allAgesNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'allAgesInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "allAgesInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'allAgesyDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "allAgesyDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'allAgesDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'allAgesNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'allAgesAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "allAgesAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'allAgesNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "allAgesNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'allAgesInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "allAgesInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'allAgesDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "allAgesDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'allAgesDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'allAgesNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'allAgesAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "allAgesAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'allAgesNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "allAgesNilDefRateTotal",
                            }
                        ]
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};


async function getReportKpiDgs6_3(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        console.log(startYear, endYear)

        request.input("startYears", startYear);

        let result = await request.query(` 
           declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

           set @startYear = @startYears;

            set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         			

		    SELECT
                [ship_type] AS shipType,
        
                -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_inspection] 
                    ELSE 0 
                END) AS uptoFiveInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_detentions] 
                    ELSE 0 
                END) AS uptoFiveDetentionsPy,

				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_deficiencies] 
                    ELSE 0 
                END) AS uptoFiveDeficiencyPy,

				
				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_5_years_nil_deficiencies] 
                    ELSE 0 
                END) AS uptoFiveNilDeficiencyPy,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [upto_5_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) 
                    / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_5_years_inspection] 
                        ELSE 0 
                    END), 0), 2) AS uptoFiveAvgDefIndexPy,

                ROUND( 
                    (CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_5_years_nil_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_5_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoFiveNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoFiveInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_5_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoFiveDetentionsCurrentYear,

				   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_5_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoFiveDeficiencyCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_5_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoFiveNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )
                        THEN  [upto_5_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  
                    /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS uptoFiveAvgDefIndexCurrentYear,

                ROUND( 
                       ( CAST( SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))  )

                            THEN  [upto_5_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_5_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoFiveNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_inspection]
                    ELSE 0 
                END) AS uptoFiveInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_detentions]
                    ELSE 0 
                END) AS uptoFiveDetentionsMonth,

				 SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_deficiencies]
                    ELSE 0 
                END) AS uptoFiveDeficiencyMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_5_years_nil_deficiencies]
                    ELSE 0 
                END) AS uptoFiveNilDeficiencyMonth,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                END), 0), 2) AS uptoFiveAvgDefIndexMonth,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoFiveNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_inspection]
                        ELSE 0 
                END) AS uptoFiveInspectionsTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_detentions]
                        ELSE 0 
                END) AS uptoFiveDetentionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_deficiencies]
                        ELSE 0 
                END) AS uptoFiveDeficiencyTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_5_years_nil_deficiencies]
                        ELSE 0 
                END) AS uptoFiveNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_inspection]
                            ELSE 0 
                END), 0), 2) AS uptoFiveAvgDefIndexTotal,

                ROUND ( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_5_years_inspection]
                            ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoFiveNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2]
            GROUP BY
                [ship_type] 
                ;
          
        `);

        // console.log(result, 'result')
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
                headerName: 'Type of Vessel',
                field: 'shipType',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "shipType",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoFiveInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "uptoFiveInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoFiveDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "uptoFiveDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoFiveDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoFiveNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoFiveAvgDefIndexPy',
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "D",
                                field: "uptoFiveAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoFiveNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "uptoFiveNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoFiveInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "uptoFiveInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoFiveDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "uptoFiveDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoFiveDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoFiveNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoFiveAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "uptoFiveAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoFiveNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "uptoFiveNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoFiveInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "uptoFiveInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoFiveDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "uptoFiveDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoFiveDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoFiveNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoFiveAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "uptoFiveAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoFiveNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "uptoFiveNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoFiveInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "uptoFiveInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoFiveDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "uptoFiveDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoFiveDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoFiveNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoFiveAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "uptoFiveAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoFiveNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "uptoFiveNilDefRateTotal",
                            }
                        ]
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};

async function getReportKpiDgs6_4(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');

        request.input("startYears", startYear);

        console.log(startYear, endYear)
        let result = await request.query(` 
           declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

           set @startYear = @startYears;

            set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         			

		    SELECT
                [ship_type] AS shipType,
        
                -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_inspection] 
                    ELSE 0 
                END) AS aboveFiveToFifteenInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_detentions] 
                    ELSE 0 
                END) AS aboveFiveToFifteenDetentionsPy,

				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_deficiencies] 
                    ELSE 0 
                END) AS aboveFiveToFifteenDeficiencyPy,

				
				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_5to15_years_nil_deficiencies] 
                    ELSE 0 
                END) AS aboveFiveToFifteenNilDeficiencyPy,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_5to15_years_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT) 
                    / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_5to15_years_inspection] 
                        ELSE 0 
                END), 0),2) AS aboveFiveToFifteenAvgDefIndexPy,

                ROUND ( 
                    ( CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_5to15_years_nil_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT)  
                    /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_5to15_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveFiveToFifteenNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveFiveToFifteenInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_5to15_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveFiveToFifteenDetentionsCurrentYear,

				   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_5to15_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveFiveToFifteenDeficiencyCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_5to15_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveFiveToFifteenNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)) )
                        THEN  [above_5to15_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                       WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS aboveFiveToFifteenAvgDefIndexCurrentYear,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )
                            THEN  [above_5to15_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_5to15_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveFiveToFifteenNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2 )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_inspection]
                    ELSE 0 
                END) AS aboveFiveToFifteenInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_detentions]
                    ELSE 0 
                END) AS aboveFiveToFifteenDetentionsMonth,

				 SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_deficiencies]
                    ELSE 0 
                END) AS aboveFiveToFifteenDeficiencyMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_5to15_years_nil_deficiencies]
                    ELSE 0 
                END) AS aboveFiveToFifteenNilDeficiencyMonth,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  
                    /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                END), 0), 2) AS aboveFiveToFifteenAvgDefIndexMonth,

                ROUND ( 
                    ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveFiveToFifteenNilDefRateMonth,

        
                -- iv) Total for the current financial year		
                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                END) AS aboveFiveToFifteenInspectionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_detentions]
                        ELSE 0 
                END) AS aboveFiveToFifteenDetentionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_deficiencies]
                        ELSE 0 
                END) AS aboveFiveToFifteenDeficiencyTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_nil_deficiencies]
                        ELSE 0 
                END) AS aboveFiveToFifteenNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_5to15_years_inspection]
                        ELSE 0 
                END), 0), 2) AS aboveFiveToFifteenAvgDefIndexTotal,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_5to15_years_inspection]
                            ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveFiveToFifteenNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2]
            GROUP BY
                [ship_type]              
                ;
          
        `);

        // console.log(result, 'result')
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
                headerName: 'Type of Vessel',
                field: 'shipType',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "shipType",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveFiveToFifteenInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "aboveFiveToFifteenInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveFiveToFifteenDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "aboveFiveToFifteenDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveFiveToFifteenDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveFiveToFifteenNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveFiveToFifteenAvgDefIndexPy',  headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "aboveFiveToFifteenAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveFiveToFifteenNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "aboveFiveToFifteenNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveFiveToFifteenInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "aboveFiveToFifteenInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveFiveToFifteenDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "aboveFiveToFifteenDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveFiveToFifteenDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",
                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveFiveToFifteenNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",
                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveFiveToFifteenAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "aboveFiveToFifteenAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveFiveToFifteenNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "aboveFiveToFifteenNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveFiveToFifteenInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "aboveFiveToFifteenInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveFiveToFifteenDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "aboveFiveToFifteenDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveFiveToFifteenDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveFiveToFifteenNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveFiveToFifteenAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "aboveFiveToFifteenAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveFiveToFifteenNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "aboveFiveToFifteenNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveFiveToFifteenInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "aboveFiveToFifteenInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveFiveToFifteenDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "aboveFiveToFifteenDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveFiveToFifteenDeficiencyTotal', hide: true,
                        headerClass: "headercenter",
                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveFiveToFifteenNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",
                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveFiveToFifteenAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "aboveFiveToFifteenAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveFiveToFifteenNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "aboveFiveToFifteenNilDefRateTotal",
                            }
                        ]
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};

async function getReportKpiDgs6_5(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        console.log(startYear, endYear)

        request.input("startYears", startYear);

        let result = await request.query(` 
           declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

           set @startYear = @startYears;

            set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         			

		    SELECT
                [ship_type] AS shipType,
        
                -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_inspection] 
                    ELSE 0 
                END) AS aboveSixteenInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_detentions] 
                    ELSE 0 
                END) AS aboveSixteenDetentionsPy,

				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_deficiencies] 
                    ELSE 0 
                END) AS aboveSixteenDeficienciesPy,

				
				   SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_16to25_years_nil_deficiencies] 
                    ELSE 0 
                END) AS aboveSixteenNilDeficienciesPy,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_16to25_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_16to25_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS aboveSixteenAvgDefIndexPy,

                ROUND( 
                ( CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_16to25_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_16to25_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveSixteenNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveSixteenInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_16to25_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveSixteenDetentionsCurrentYear,

				   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_16to25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveSixteenDeficienciesCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_16to25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveSixteenNilDeficienciesCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_16to25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ,2) AS aboveSixteenAvgDefIndexCurrentYear,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_16to25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_16to25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveSixteenNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_inspection]
                    ELSE 0 
                END) AS aboveSixteenInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_detentions]
                    ELSE 0 
                END) AS aboveSixteenDetentionsMonth,

				SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_deficiencies]
                    ELSE 0 
                END) AS aboveSixteenDeficienciesMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_16to25_years_nil_deficiencies]
                    ELSE 0 
                END) AS aboveSixteenNilDeficienciesMonth,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  
                    /  NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                    END), 0), 2) AS aboveSixteenAvgDefIndexMonth,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveSixteenNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                END) AS aboveSixteenInspectionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_detentions]
                        ELSE 0 
                END) AS aboveSixteenDetentionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_deficiencies]
                        ELSE 0 
                END) AS aboveSixteenDeficienciesTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_nil_deficiencies]
                        ELSE 0 
                END) AS aboveSixteenNilDeficienciesTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_16to25_years_inspection]
                            ELSE 0 
                END), 0), 2) AS aboveSixteenAvgDefIndexTotal,

                ROUND( 
                ( CAST( SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_nil_deficiencies]
                        ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_16to25_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveSixteenNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2]
            GROUP BY
                [ship_type] 

                ;
          
        `);

        // console.log(result, 'result')
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
                headerName: 'Type of Vessel',
                field: 'shipType',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "shipType",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveSixteenInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "aboveSixteenInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveSixteenDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "aboveSixteenDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveSixteenDeficienciesPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveSixteenNilDeficienciesPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveSixteenAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "aboveSixteenAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveSixteenNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "aboveSixteenNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveSixteenInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "aboveSixteenInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveSixteenDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "aboveSixteenDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveSixteenDeficienciesCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveSixteenNilDeficienciesCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveSixteenAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "aboveSixteenAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveSixteenNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "aboveSixteenNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveSixteenInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "aboveSixteenInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveSixteenDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "aboveSixteenDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveSixteenDeficienciesMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveSixteenNilDeficienciesMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveSixteenAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "aboveSixteenAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveSixteenNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "aboveSixteenNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveSixteenInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "aboveSixteenInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveSixteenDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "aboveSixteenDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveSixteenDeficienciesTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveSixteenNilDeficienciesTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveSixteenAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "aboveSixteenAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveSixteenNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "aboveSixteenNilDefRateTotal",
                            }
                        ]
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};

async function getReportKpiDgs6_6(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');

        request.input("startYears", startYear);

        console.log(startYear, endYear)
        let result = await request.query(` 
           declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

           set @startYear = @startYears;

            set @FinancialYearStartDate = CASE
                WHEN MONTH(GETDATE()) >= 4 THEN 
                    CAST(CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;
            set @FinancialYearEndDate = DATEADD(MONTH, -3, GETDATE())         			

		    SELECT
                [ship_type] AS shipType,
        
                -- i) Previous Financial Year (FY) and Current Financial Year (FY) up to March
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_inspection] 
                    ELSE 0 
                END) AS aboveTwentyFiveInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_detentions] 
                    ELSE 0 
                END) AS aboveTwentyFiveDetentionsPy,

				SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_deficiencies] 
                    ELSE 0 
                END) AS aboveTwentyFiveDeficiencyPy,
				
				SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_25_years_nil_deficiencies] 
                    ELSE 0 
                END) AS aboveTwentyFiveNilDeficienciesPy,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_25_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_25_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS aboveTwentyFiveAvgDefIndexPy,

                ROUND( 
                    ( CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_25_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_25_years_inspection] 
                        ELSE 0 
                    END), 0) ) * 100, 2 ) AS aboveTwentyFiveNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyFiveInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_25_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyFiveDetentionsCurrentYear,

				SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyFiveDeficienciesCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyFiveNilDeficienciesCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_25_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS aboveTwentyFiveAvgDefIndexCurrentYear,

                ROUND( 
                ( CAST( SUM(CASE 
                    WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

						THEN  [above_25_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF(SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_25_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveTwentyFiveNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_inspection]
                    ELSE 0 
                END) AS aboveTwentyFiveInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_detentions]
                    ELSE 0 
                END) AS aboveTwentyFiveDetentionsMonth,
                
               SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_deficiencies]
                    ELSE 0 
                END) AS aboveTwentyFiveDeficienciesMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_nil_deficiencies]
                    ELSE 0 
                END) AS aboveTwentyFiveNilDeficienciesMonth,

                -- Calculating Average with protection against division by zero
                ROUND (
                CAST(   SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_deficiencies]
                    ELSE 0 
                END) AS FLOAT )  
                /    NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_inspection]
                    ELSE 0 
                END), 0), 2) AS aboveTwentyFiveAvgDefIndexMonth,

                ROUND( 
                ( CAST( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_nil_deficiencies]
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_25_years_inspection]
                    ELSE 0 
                END), 0) ) * 100 , 2) AS aboveTwentyFiveNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_inspection]
                        ELSE 0 
                END) AS aboveTwentyFiveInspectionsTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_detentions]
                        ELSE 0 
                END) AS aboveTwentyFiveDetentionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_deficiencies]
                        ELSE 0 
                END) AS aboveTwentyFiveDeficienciesTotal,

                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_25_years_nil_deficiencies]
                        ELSE 0 
                END) AS aboveTwentyFiveNilDeficienciesTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_inspection]
                            ELSE 0 
                END), 0), 2) AS aboveTwentyFiveAvgDefIndexTotal,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_25_years_inspection]
                            ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveTwentyFiveNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2]
            GROUP BY
                [ship_type] 

                ;
          
        `);

        // console.log(result, 'result')
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
                headerName: 'Type of Vessel',
                field: 'shipType',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    {
                        headerName: "A",
                        field: "shipType",
                        pinned: true,
                    }
                ]
            },
            {
                headerName: `During the Previous FY (${previousFinancialYear})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyFiveInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "aboveTwentyFiveInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyFiveDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "aboveTwentyFiveDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyFiveDeficiencyPy', hide: true,
                        headerClass: "headercenter",
                        // children: [
                        //     {
                        //         // headerName: "C",
                        //         field: "aboveTwentyFiveDeficiencyPy",
                        //     }
                        // ]
                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyFiveNilDeficienciesPy', hide: true,
                        headerClass: "headercenter",
                        // children: [
                        //     {
                        //         // headerName: "C",
                        //         field: "aboveTwentyFiveNilDeficienciesPy",
                        //     }
                        // ]
                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyFiveAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "aboveTwentyFiveAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyFiveNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "aboveTwentyFiveNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyFiveInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "aboveTwentyFiveInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyFiveDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "aboveTwentyFiveDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyFiveDeficienciesCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyFiveNilDeficienciesCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyFiveAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "aboveTwentyFiveAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyFiveNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "aboveTwentyFiveNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyFiveInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "aboveTwentyFiveInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyFiveDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "aboveTwentyFiveDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyFiveDeficienciesMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyFiveNilDeficienciesMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyFiveAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "aboveTwentyFiveAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyFiveNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "aboveTwentyFiveNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyFiveInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "aboveTwentyFiveInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyFiveDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "aboveTwentyFiveDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyFiveDeficienciesTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyFiveNilDeficienciesTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyFiveAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "aboveTwentyFiveAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyFiveNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "aboveTwentyFiveNilDefRateTotal",
                            }
                        ]
                    }
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};

async function getReportKpiDgs6_7(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 4 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        const [startYear, endYear] = financialYear.split('-');

        let result = await request.query(`   
           DECLARE @ReferenceDate DATE = DATEADD(MONTH, -3, GETDATE());
            DECLARE @FinancialYearStartDate DATE, @FinancialYearEndDate DATE;

            -- Use the year from the @ReferenceDate to calculate the FY dates
            SET @FinancialYearStartDate = CASE
                WHEN MONTH(@ReferenceDate) >= 4 THEN 
                    CAST(CAST(YEAR(@ReferenceDate) AS VARCHAR(4)) + '-04-01' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(@ReferenceDate) - 1 AS VARCHAR(4)) + '-04-01' AS DATE)
            END;

            SET @FinancialYearEndDate = CASE 
                WHEN MONTH(@ReferenceDate) >= 4 THEN 
                    CAST(CAST(YEAR(@ReferenceDate) + 1 AS VARCHAR(4)) + '-03-31' AS DATE)
                ELSE 
                    CAST(CAST(YEAR(@ReferenceDate) AS VARCHAR(4)) + '-03-31' AS DATE)
            END;

            -- Retrieve data for the current financial year (April 1st to March 31st)
            SELECT
                'Total Vessels Inspected (All Ages)' AS Category,
                [April], [May], [June], [July], [August], [September], 
                [October], [November], [December], [January], [February], [March]
            FROM (
                SELECT 
                    DATENAME(month, DATEADD(month, [month] - 1, 0)) AS MonthName, 
					total_no_of_inspection AS Count

                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2_total]
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
                'Total Number of Detentions of Vessels (All Ages)',
                [April], [May], [June], [July], [August], [September], 
                [October], [November], [December], [January], [February], [March]
            FROM (
                SELECT 
                    DATENAME(month, DATEADD(month, [month] - 1, 0)) AS MonthName, 
                    total_no_of_detention AS Count
                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_6_2_total]
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
            { headerName: `April-${startYear.toString().slice(-2)}`, field: "April", width: 250 },
            { headerName: `May-${startYear.toString().slice(-2)}`, field: "May", width: 250 },
            { headerName: `June-${startYear.toString().slice(-2)}`, field: "June", width: 250 },
            { headerName: `July-${startYear.toString().slice(-2)}`, field: "July", width: 250 },
            { headerName: `August-${startYear.toString().slice(-2)}`, field: "August", width: 250 },
            { headerName: `September-${startYear.toString().slice(-2)}`, field: "September", width: 250 },
            { headerName: `October-${startYear.toString().slice(-2)}`, field: "October", width: 250 },
            { headerName: `November-${startYear.toString().slice(-2)}`, field: "November", width: 250 },
            { headerName: `December-${startYear.toString().slice(-2)}`, field: "December", width: 250 },
            { headerName: `January-${endYear.toString().slice(-2)}`, field: "January", width: 250 },
            { headerName: `February-${endYear.toString().slice(-2)}`, field: "February", width: 250 },
            { headerName: `March-${endYear.toString().slice(-2)}`, field: "March", width: 250 }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
};


async function getReportKpiDgs6_8(req, res) {
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
            SELECT ''Total Vessels Inspected (All Ages)'' AS Category, ' + @cols + '
            FROM (
                SELECT f.financial_year,  
					total_no_of_inspection AS registered
                FROM FinancialYearRange f
                LEFT JOIN (
                    SELECT 
                        CASE 
                            WHEN [month] IN (4,5,6,7,8,9,10,11,12) THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                            WHEN [month] IN (1,2,3) THEN CONCAT(''FY'', [year]-1, ''-'', [year])
                            ELSE ''FY''
                        END AS financial_year, 
                        total_no_of_inspection
                    FROM [tbl_kpi_dgs_2_6_2_total]
                    WHERE [year] >= 2014  -- Only include data from FY2014-2015 onwards
                ) a ON f.financial_year = a.financial_year
               -- GROUP BY f.financial_year
            ) AS SourceTable
            PIVOT (
                SUM(registered) FOR financial_year IN (' + @cols + ')
            ) AS RegisteredPivot

            UNION ALL

            SELECT ''Total Number of Detentions of Vessels (All Ages)'' AS Category, ' + @cols + '
            FROM (
                SELECT f.financial_year,  total_no_of_detention AS cumulative
                FROM FinancialYearRange f
                LEFT JOIN (
                    SELECT 
                        CASE 
                            WHEN [month] IN (4,5,6,7,8,9,10,11,12) THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                            WHEN [month] IN (1,2,3) THEN CONCAT(''FY'', [year]-1, ''-'', [year])
                            ELSE ''FY''
                        END AS financial_year, 
                       total_no_of_detention
                    FROM [tbl_kpi_dgs_2_6_2_total]
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
    getReportKpiDgs6_1, getReportKpiDgs6_2, getReportKpiDgs6_3, getReportKpiDgs6_4, getReportKpiDgs6_5,
    getReportKpiDgs6_6, getReportKpiDgs6_7, getReportKpiDgs6_8
};