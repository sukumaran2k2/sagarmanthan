import { pool } from "../../db.js";
import moment from 'moment';


async function getReportKpiDgs7_1(req, res) {
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
            
            -- Sum of ships inspected for the Current Financial Year (April of the current year to the (current month subtract 3))
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

            -- total ship - Current FY (April to P.P month) + Current month(Previous Month - 1)
            SUM(CASE 
                WHEN (t.mmd_year = YEAR(GETDATE()) AND t.mmd_month >= 4 AND t.mmd_month < MONTH(GETDATE())) THEN t.mmd_ship_inspected
                WHEN t.mmd_year = YEAR(GETDATE()) AND t.mmd_month = MONTH(GETDATE()) - 1 THEN t.mmd_ship_inspected
                ELSE 0
            END) AS [totalShipsTotal]
        
        FROM 
            mmt_mmd_name m
        LEFT JOIN 
            tbl_kpi_dgs_2_7_1 t ON m.mmd_id = t.mmd_id
        GROUP BY 
            m.mmd_name;
        `);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // const currentDate = new Date();

        // // Get the year and previous month (we subtract 2 to get the previous of previous month as current month)
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
        // previousOfPreviousMonthDate.setMonth(currentDate.getMonth() - 3); //  current month - 3
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
}

async function getReportKpiDgs7_2(req, res) {
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

            
            SET @startYear = @startYears;

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
                    THEN [upto_10_years_inspection] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_inspection] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_20_years_inspection] 
                    ELSE 0 
                END) AS allAgesInspectionPy,

        
                --DETENTION-----------------------------
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_detentions] 
                    ELSE 0 
                END)
                +
                  SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_detentions] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_20_years_detentions] 
                    ELSE 0 
                END) AS allAgesDetentionsPy,

				--DEFICIENCY ------------------------------------------
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_deficiencies] 
                    ELSE 0 
                END)
                +
                  SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_20_years_deficiencies] 
                    ELSE 0 
                END) AS allAgesDeficiencyPy,

				--NIL DEFICIENCY -------------------------------------------				  
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_nil_deficiencies] 
                    ELSE 0 
                END)
                +
                  SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_nil_deficiencies] 
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_20_years_nil_deficiencies] 
                    ELSE 0 
                END) AS allAgesNilDeficiencyPy,

                --AVERAGE DEFICIENCY-----------------------------------------
                ROUND(
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [upto_10_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_inspection] 
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_10to20_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_10to20_years_inspection] 
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_20_years_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_20_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS allAgesAvgDefIndexPy,

                -- NIL AVERAGE DEFICIENCY  -------------------------------
                ROUND(
                    ( (  CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [upto_10_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_inspection] 
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_10to20_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_10to20_years_inspection] 
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_20_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                            ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_20_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100 ), 2) AS allAgesNilDefRatePy,
              
                
                -- ii) Current Financial Year (FY) up to the current month
                --INSPECTION -----------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesInspectionCurrentYear,

                -- DETENTION ----------------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_10_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_10to20_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_20_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesDetentionsCurrentYear,

				--DEFICIENCY --------------------------------------
				    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_10_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_10to20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesDeficiencyCurrentYear,

				--NIL DEFICIENCY ----------------------------------
				    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_10_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_10to20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) 
                +
                   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS allAgesNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                -- AVERAGE DEFICIENCY ---------------------------------
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [upto_10_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                         WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0)
                    +
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_10to20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                         WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0), 2) AS allAgesAvgDefIndexCurrentYear,


                -- NIL AVERAGE DEFICIENCY -----------------------------------
                ROUND(
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [upto_10_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_10to20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END), 0) ) * 100 )
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
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
                    THEN [upto_10_years_inspection]
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
                    THEN [above_10to20_years_inspection]
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
                    THEN [above_20_years_inspection]
                    ELSE 0 
                END) AS allAgesInspectionsMonth,


                --DETENTION ----------------------------------------
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_detentions]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_detentions]
                    ELSE 0 
                END) 
                +
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_detentions]
                    ELSE 0 
                END) AS allAgesDetentionsMonth,

				--DEFICIENCY --------------------------------------
				 SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_deficiencies]
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
                    THEN [above_10to20_years_deficiencies]
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
                    THEN [above_20_years_deficiencies]
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
                    THEN [upto_10_years_nil_deficiencies]
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
                    THEN [above_10to20_years_nil_deficiencies]
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
                    THEN [above_20_years_nil_deficiencies]
                    ELSE 0 
                END) AS allAgesNilDeficiencyMonth,


                -- Calculating Average with protection against division by zero
                --AVERAGE DEFICIENCY -----------------------------
                ROUND(
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                    END), 0)
                    +
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                    END), 0) 
                    +
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_20_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_20_years_inspection]
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
                    THEN [upto_10_years_nil_deficiencies]
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_inspection]
                    ELSE 0 
                END), 0) 
                +
                
                ( ( CAST( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_nil_deficiencies]
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_inspection]
                    ELSE 0 
                END), 0) ) * 100 )
                +                
                ( ( CAST( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_nil_deficiencies]
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_inspection]
                    ELSE 0 
                END), 0) ) * 100 ), 2) AS allAgesNilDefRateMonth,

        
                -- iv) Total for the current financial year		
				-- Sum of detention for the current FY up to the previous month
                -- INSPECTION ----------------------	
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                END) +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_inspection]
                        ELSE 0 
                END) AS allAgesInspectionsTotal,

                --DETENTIONS --------------------------------
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_detentions]
                        ELSE 0 
                END) 
                +                  
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_detentions]
                        ELSE 0 
                END) 
                +                
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_detentions]
                        ELSE 0 
                END) AS allAgesDetentionsTotal,


				--DEFICIENCY -------------------------------------
				  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_deficiencies]
                        ELSE 0 
                END) +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_deficiencies]
                        ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_deficiencies]
                        ELSE 0 
                END) AS allAgesDeficiencyTotal,

				--NIL DEFICIENCY ----------------------------------------
				  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_nil_deficiencies]
                        ELSE 0 
                END) +
                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_nil_deficiencies]
                        ELSE 0 
                END) 
                +
                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_nil_deficiencies]
                        ELSE 0 
                END) AS allAgesNilDeficiencyTotal,


                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_10to20_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_10to20_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_inspection]
                            ELSE 0 
                END), 0), 2 )  AS allAgesAvgDefIndexTotal,

                --NIL AVERAGE DEFICIENCY
                ROUND(
                    ( ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_inspection]
                            ELSE 0 
                    END), 0) ) * 100 )
                    +
                    CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_10to20_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_10to20_years_inspection]
                            ELSE 0 
                    END), 0) 
                    +
                    ( ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_inspection]
                            ELSE 0 
                    END), 0) ) * 100 ), 2)  AS allAgesNilDefRateTotal
                
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2]
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
                        headerName: 'Average Deficiency Index', field: 'allAgesAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
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
                        headerName: 'No. of Detentions', field: 'allAgesDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "allAgesDetentionsMonth",
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

async function getReportKpiDgs7_3(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        // console.log(startYear, endYear)

        request.input("startYears" , startYear);
        let result = await request.query(` 
            declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

            
            SET @startYear = @startYears;

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
                    THEN [upto_10_years_inspection] 
                    ELSE 0 
                END) AS uptoTenYearsInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_detentions] 
                    ELSE 0 
                END) AS uptoTenYearsDetentionsPy,

                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_deficiencies] 
                    ELSE 0 
                END) AS uptoTenYearsDeficiencyPy,

                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [upto_10_years_nil_deficiencies] 
                    ELSE 0 
                END) AS uptoTenYearsNilDeficiencyPy,

                -- Calculating Average with protection against division by zero
                  ROUND(
                    CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT) / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS uptoTenYearsAvgDefIndexPy,

                ROUND(
                    ( CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_nil_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [upto_10_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenYearsNilDefRatePy,

                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenYearsInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_10_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenYearsDetentionsCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [upto_10_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenYearsDeficiencyCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [upto_10_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenYearsNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )
                        THEN  [upto_10_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  
                    /    NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS uptoTenYearsAvgDefIndexCurrentYear,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  ( ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)) )
                        THEN  [upto_10_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [upto_10_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenYearsNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_inspection]
                    ELSE 0 
                END) AS uptoTenYearsInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_detentions]
                    ELSE 0 
                END) AS uptoTenYearsDetentionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_deficiencies]
                    ELSE 0 
                END) AS uptoTenYearsDeficiencyMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [upto_10_years_nil_deficiencies]
                    ELSE 0 
                END) AS uptoTenYearsNilDeficiencyMonth,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        ) AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   ) 
                    /    NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                END), 0), 2) AS uptoTenYearsAvgDefIndexMonth,

                ROUND ( 
                    ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenYearsNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                END) AS uptoTenYearsInspectionsTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_detentions]
                        ELSE 0 
                END) AS uptoTenYearsDetentionsTotal,

                 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_deficiencies]
                        ELSE 0 
                END) AS uptoTenYearsDeficiencyTotal,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_nil_deficiencies]
                        ELSE 0 
                END) AS uptoTenYearsNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                CAST(    SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_deficiencies]
                        ELSE 0 
                END) AS FLOAT   )  /    NULLIF( SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [upto_10_years_inspection]
                        ELSE 0 
                END), 0), 2) AS uptoTenYearsAvgDefIndexTotal,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [upto_10_years_inspection]
                            ELSE 0 
                END), 0)) * 100, 2 ) AS uptoTenYearsNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2]
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
                        headerName: 'No. of Inspections', field: 'uptoTenYearsInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "uptoTenYearsInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenYearsDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "uptoTenYearsDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenYearsDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenYearsNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenYearsAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "uptoTenYearsAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenYearsNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "uptoTenYearsNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenYearsInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "uptoTenYearsInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenYearsDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "uptoTenYearsDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenYearsDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenYearsNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenYearsAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "uptoTenYearsAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenYearsNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "uptoTenYearsNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenYearsInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "uptoTenYearsInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenYearsDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "uptoTenYearsDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenYearsDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenYearsNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenYearsAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "uptoTenYearsAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenYearsNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "uptoTenYearsNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenYearsInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "uptoTenYearsInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenYearsDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "uptoTenYearsDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenYearsDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenYearsNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenYearsAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "uptoTenYearsAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenYearsNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "uptoTenYearsNilDefRateTotal",
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

async function getReportKpiDgs7_4(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        console.log(startYear, endYear);

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
                    THEN [above_10to20_years_inspection] 
                    ELSE 0 
                END) AS uptoTenToTwenInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_detentions] 
                    ELSE 0 
                END) AS uptoTenToTwenDetentionsPy,

				SUM(CASE 
                    -- Check if the record is for the previous financial year
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_deficiencies] 
                    ELSE 0 
                END) AS uptoTenToTwenDeficiencyPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = @startYear - 1 AND [month] >= 4) OR 
                        ([year] = @startYear AND [month] <= 3)
                    )
                    THEN [above_10to20_years_nil_deficiencies] 
                    ELSE 0 
                END) AS uptoTenToTwenNilDeficiencyPy,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_10to20_years_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT) 
                    / NULLIF(SUM(CASE 
                        WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                        THEN [above_10to20_years_inspection] 
                        ELSE 0 
                END), 0), 2) AS uptoTenToTwenAvgDefIndexPy,

                ROUND( 
                ( CAST(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_10to20_years_nil_deficiencies] 
                    ELSE 0 
                END) AS FLOAT)  
                /   NULLIF(SUM(CASE 
                    WHEN (([year] =  @startYear  - 1 AND [month] >= 4) OR 
                        ([year] =  @startYear  AND [month] <= 3))
                    THEN [above_10to20_years_inspection] 
                    ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenToTwenNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenToTwenInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_10to20_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenToTwenDetentionsCurrentYear,

				 SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_10to20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenToTwenDeficiencyCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_10to20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS uptoTenToTwenNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)) )
                            THEN  [above_10to20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  
                    /    NULLIF(SUM(CASE 
                          WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS uptoTenToTwenAvgDefIndexCurrentYear,

                ROUND(
                    ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))  )
                        THEN  [above_10to20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)  
                    /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_10to20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenToTwenNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_inspection]
                    ELSE 0 
                END) AS uptoTenToTwenInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_detentions]
                    ELSE 0 
                END) AS uptoTenToTwenDetentionsMonth,

				SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_deficiencies]
                    ELSE 0 
                END) AS uptoTenToTwenDeficiencyMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_10to20_years_nil_deficiencies]
                    ELSE 0 
                END) AS uptoTenToTwenNilDeficiencyMonth,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT )
                    /  NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                END), 0), 2) AS uptoTenToTwenAvgDefIndexMonth,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = @startYear AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenToTwenNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                END) AS uptoTenToTwenInspectionsTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_detentions]
                        ELSE 0 
                END) AS uptoTenToTwenDetentionsTotal,

				  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_deficiencies]
                        ELSE 0 
                END) AS uptoTenToTwenDeficiencyTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_nil_deficiencies]
                        ELSE 0 
                END) AS uptoTenToTwenNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                        THEN [above_10to20_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT   )  
                    / NULLIF( SUM(CASE 
                            WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                                ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                                )
                            THEN [above_10to20_years_inspection]
                            ELSE 0 
                END), 0), 2) AS uptoTenToTwenAvgDefIndexTotal,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                        THEN [above_10to20_years_nil_deficiencies]
                        ELSE 0 
                    END) AS FLOAT)  
                    /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_10to20_years_inspection]
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS uptoTenToTwenNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2]
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
                        headerName: 'No. of Inspections', field: 'uptoTenToTwenInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "uptoTenToTwenInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenToTwenDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "uptoTenToTwenDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenToTwenDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenToTwenNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenToTwenAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "uptoTenToTwenAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenToTwenNilDefRatePy', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "E",
                                field: "uptoTenToTwenNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenToTwenInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "uptoTenToTwenInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenToTwenDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "uptoTenToTwenDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenToTwenDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenToTwenNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenToTwenAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "uptoTenToTwenAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenToTwenNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "uptoTenToTwenNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenToTwenInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "uptoTenToTwenInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenToTwenDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "uptoTenToTwenDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenToTwenDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenToTwenNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenToTwenAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "uptoTenToTwenAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenToTwenNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "uptoTenToTwenNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'uptoTenToTwenInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "uptoTenToTwenInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'uptoTenToTwenDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "uptoTenToTwenDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'uptoTenToTwenDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'uptoTenToTwenNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'uptoTenToTwenAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "uptoTenToTwenAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'uptoTenToTwenNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "uptoTenToTwenNilDefRateTotal",
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

async function getReportKpiDgs7_5(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 3 ? `${currentYr}-${currentYr + 1}` : `${currentYr - 1}-${currentYr}`;

        // console.log(currentYr, financialYear, "financialYearfinancialYear")
        const [startYear, endYear] = financialYear.split('-');
        console.log(startYear, endYear)
        let result = await request.query(` 
           declare  @FinancialYearStartDate date, @FinancialYearEndDate date, @startYear int

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
                        ([year] = ${startYear} - 1 AND [month] >= 4) OR 
                        ([year] = ${startYear} AND [month] <= 3)
                    )
                    THEN [above_20_years_inspection] 
                    ELSE 0 
                END) AS aboveTwentyInspectionPy,
        
                SUM(CASE 
                    WHEN (
                        ([year] = ${startYear} - 1 AND [month] >= 4) OR 
                        ([year] = ${startYear} AND [month] <= 3)
                    )
                    THEN [above_20_years_detentions] 
                    ELSE 0 
                END) AS aboveTwentyDetentionsPy,

				   SUM(CASE 
                    WHEN (
                        ([year] = ${startYear} - 1 AND [month] >= 4) OR 
                        ([year] = ${startYear} AND [month] <= 3)
                    )
                    THEN [above_20_years_deficiencies] 
                    ELSE 0 
                END) AS aboveTwentyDeficiencyPy,

				
				SUM(CASE 
                    WHEN (
                        ([year] = ${startYear} - 1 AND [month] >= 4) OR 
                        ([year] = ${startYear} AND [month] <= 3)
                    )
                    THEN [above_20_years_nil_deficiencies] 
                    ELSE 0 
                END) AS aboveTwentyNilDeficiencyPy,

                -- Calculating Average with protection against division by zero
                ROUND (
                        CAST(SUM(CASE 
                        WHEN (([year] =  ${startYear}  - 1 AND [month] >= 4) OR 
                            ([year] =  ${startYear}  AND [month] <= 3))
                        THEN [above_20_years_deficiencies] 
                        ELSE 0 
                    END) AS FLOAT) 
                    / NULLIF(SUM(CASE 
                        WHEN (([year] =  ${startYear}  - 1 AND [month] >= 4) OR 
                            ([year] =  ${startYear}  AND [month] <= 3))
                        THEN [above_20_years_inspection] 
                        ELSE 0 
                    END), 0), 2) AS aboveTwentyAvgDefIndexPy,

                ROUND (
                    (CAST(SUM(CASE 
                    WHEN (([year] =  ${startYear}  - 1 AND [month] >= 4) OR 
                        ([year] =  ${startYear}  AND [month] <= 3))
                    THEN [above_20_years_nil_deficiencies] 
                    ELSE 0 
                    END) AS FLOAT)   /   NULLIF(SUM(CASE 
                        WHEN (([year] =  ${startYear}  - 1 AND [month] >= 4) OR 
                            ([year] =  ${startYear}  AND [month] <= 3))
                        THEN [above_20_years_inspection] 
                        ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveTwentyNilDefRatePy,

                
                -- ii) Current Financial Year (FY) up to the current month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyInspectionCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_20_years_detentions]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyDetentionsCurrentYear,

				   SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                    THEN [above_20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyDeficiencyCurrentYear,

                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
						THEN  [above_20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                    ELSE 0 
                END) AS aboveTwentyNilDeficiencyCurrentYear,

                -- Calculating Average with protection against division by zero
                ROUND(
                    CAST(   SUM(CASE 
                        WHEN  (  ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )

                            THEN  [above_20_years_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT   )  
                    /   NULLIF(SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                        THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                END), 0), 2) AS aboveTwentyAvgDefIndexCurrentYear,

                ROUND ( 
                    ( CAST( SUM(CASE 
                        WHEN  (     ([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate) ) and
                        ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate))    )
                        THEN  [above_20_years_nil_deficiencies]  -- Replace this with the relevant field you want to sum
                        ELSE 0 
                    END) AS FLOAT)   
                    /   NULLIF(SUM(CASE 
                            WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR(@FinancialYearEndDate) and [month] <=  MONTH(@FinancialYearEndDate)))
                            THEN [above_20_years_inspection]  -- Replace this with the relevant field you want to sum
                            ELSE 0 
                END), 0) ) * 100 , 2) AS aboveTwentyNilDefRateCurrentYear,


                -- iii) Current month
                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_inspection]
                    ELSE 0 
                END) AS aboveTwentyInspectionsMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_detentions]
                    ELSE 0 
                END) AS aboveTwentyDetentionsMonth,

				SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_deficiencies]
                    ELSE 0 
                END) AS aboveTwentyDeficiencyMonth,

                SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_nil_deficiencies]
                    ELSE 0 
                END) AS aboveTwentyNilDeficiencyMonth,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(   SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                        )
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_20_years_deficiencies]
                        ELSE 0 
                    END) AS FLOAT) 
                    / NULLIF( SUM(CASE 
                        WHEN (
                            -- Retrieve data for the previous month within the current financial year (April to March)
                            [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                        )
                        -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                        AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                        THEN [above_20_years_inspection]
                        ELSE 0 
                END), 0), 2) AS aboveTwentyAvgDefIndexMonth,

                ROUND( 
                ( CAST( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_nil_deficiencies]
                    ELSE 0 
                END) AS FLOAT)   /   NULLIF( SUM(CASE 
                    WHEN (
                        -- Retrieve data for the previous month within the current financial year (April to March)
                        [year] = ${startYear} AND [month] = MONTH(GETDATE()) - 2
                    )
                    -- Exclude the case where the current month is April (because there's no previous month in the current FY)
                    AND NOT (MONTH(GETDATE()) = 4 AND [month] = 3) -- Ensure March is not considered in April of new FY
                    THEN [above_20_years_inspection]
                    ELSE 0 
                END), 0) ) * 100, 2 ) AS aboveTwentyNilDefRateMonth,

        
                -- iv) Total for the current financial year				
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_inspection]
                        ELSE 0 
                END) AS aboveTwentyInspectionsTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_detentions]
                        ELSE 0 
                END) AS aboveTwentyDetentionsTotal,

                  SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
					([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_deficiencies]
                        ELSE 0 
                END) AS aboveTwentyDeficiencyTotal,

                -- Sum of detention for the current FY up to the previous month
                SUM(CASE 
                    WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                    ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                        )
                        THEN [above_20_years_nil_deficiencies]
                        ELSE 0 
                END) AS aboveTwentyNilDeficiencyTotal,

                -- Calculating Average with protection against division by zero
                ROUND (
                    CAST(    SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_deficiencies]
                            ELSE 0 
                    END) AS FLOAT   )  
                    /  NULLIF( SUM(CASE 
                            WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                            ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                                )
                            THEN [above_20_years_inspection]
                            ELSE 0 
                END), 0), 2) AS aboveTwentyAvgDefIndexTotal,

                ROUND( 
                    ( CAST( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_nil_deficiencies]
                            ELSE 0 
                    END) AS FLOAT)   /   NULLIF( SUM(CASE 
                        WHEN  (([year] >= YEAR(@FinancialYearStartDate) and [month] >=  MONTH(@FinancialYearStartDate)) and
                        ([year] <= YEAR( DATEADD(MONTH, 1,@FinancialYearEndDate)) and [month] <=  MONTH(DATEADD(MONTH, 1,@FinancialYearEndDate)))
                            )
                            THEN [above_20_years_inspection]
                            ELSE 0 
                END), 0) ) * 100,2 ) AS aboveTwentyNilDefRateTotal

      
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2]
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
                        headerName: 'No. of Inspections', field: 'aboveTwentyInspectionPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "B",
                                field: "aboveTwentyInspectionPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyDetentionsPy',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "C",
                                field: "aboveTwentyDetentionsPy",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyNilDeficiencyPy', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyAvgDefIndexPy', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "D",
                                field: "aboveTwentyAvgDefIndexPy",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyNilDefRatePy',
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: "E",
                                field: "aboveTwentyNilDefRatePy",
                            }
                        ]
                    },
                ]
            },
            {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyInspectionCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "F",
                                field: "aboveTwentyInspectionCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyDetentionsCurrentYear', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "G",
                                field: "aboveTwentyDetentionsCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyNilDeficiencyCurrentYear', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyAvgDefIndexCurrentYear', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "H",
                                field: "aboveTwentyAvgDefIndexCurrentYear",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyNilDefRateCurrentYear', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "I",
                                field: "aboveTwentyNilDefRateCurrentYear",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyInspectionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "J",
                                field: "aboveTwentyInspectionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyDetentionsMonth', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "K",
                                field: "aboveTwentyDetentionsMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyNilDeficiencyMonth', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyAvgDefIndexMonth', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "L",
                                field: "aboveTwentyAvgDefIndexMonth",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyNilDefRateMonth', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "M",
                                field: "aboveTwentyNilDefRateMonth",
                            }
                        ]
                    }
                ]
            },
            {
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass: "headercenter", children: [
                    {
                        headerName: 'No. of Inspections', field: 'aboveTwentyInspectionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "N",
                                field: "aboveTwentyInspectionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Detentions', field: 'aboveTwentyDetentionsTotal', headerClass: "headercenter",
                        children: [
                            {
                                headerName: "O",
                                field: "aboveTwentyDetentionsTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'No. of Deficiency', field: 'aboveTwentyDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'No. of NIL-Deficiency', field: 'aboveTwentyNilDeficiencyTotal', hide: true,
                        headerClass: "headercenter",

                    },
                    {
                        headerName: 'Average Deficiency Index', field: 'aboveTwentyAvgDefIndexTotal', headerClass: "headercenter",
                        headerTooltip: '(No. of Deficiency / No. of Inspections)',
                        children: [
                            {
                                headerName: "P",
                                field: "aboveTwentyAvgDefIndexTotal",
                            }
                        ]
                    },
                    {
                        headerName: 'Nil-Deficiency Rate', field: 'aboveTwentyNilDefRateTotal', headerClass: "headercenter",
                        headerTooltip: '((No. of NIL-Deficiency / No. of Inspections) * 100 )',
                        children: [
                            {
                                headerName: "Q",
                                field: "aboveTwentyNilDefRateTotal",
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


async function getReportKpiDgs7_6(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const currentYr = new Date().getFullYear();
        const financialYear = new Date().getMonth() > 4
            ? `${currentYr}-${currentYr + 1}`
            : `${currentYr - 1}-${currentYr}`;

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
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2_total]
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
                    [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_7_2_total]
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
            return res.status(404).json({ error: 'Data Not yet entered for the months of Current Financial Yeare' });
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

async function getReportKpiDgs7_7(req, res) {
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
                    FROM [tbl_kpi_dgs_2_7_2_total]
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
                    FROM [tbl_kpi_dgs_2_7_2_total]
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
    getReportKpiDgs7_1, getReportKpiDgs7_2, getReportKpiDgs7_3, getReportKpiDgs7_4, getReportKpiDgs7_5,
    getReportKpiDgs7_6, getReportKpiDgs7_7
};