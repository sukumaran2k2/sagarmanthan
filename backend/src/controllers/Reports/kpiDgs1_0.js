import { pool } from "../../db.js";
import moment from 'moment';



async function getKpiDgs1_1 (req, res)
{
     try {
        const conn = await pool;
        const request = conn.request();
        function getFinancialYears(baseDate = new Date()) {
            const currentMonth = baseDate.getMonth(); // 0-indexed
            const currentYear = baseDate.getFullYear();

            const startYear1 = currentMonth >= 3 ? currentYear : currentYear - 1;
            const endYear = startYear1 + 1;

            const currentFinancialYear = `${startYear1}-${endYear}`;
            const previousFinancialYear = `${startYear1 - 1}-${startYear1}`;

            return { startYear1, endYear, currentFinancialYear, previousFinancialYear };
        }

        const { startYear1, endYear, currentFinancialYear, previousFinancialYear } = getFinancialYears();
        console.log(startYear1)

        let result = await request.query(`           
            DECLARE @CurrentMonth INT = MONTH(GETDATE());
            DECLARE @CurrentYear INT = YEAR(GETDATE());
            DECLARE @PreviousMonth INT = CASE WHEN @CurrentMonth = 1 THEN 12 ELSE @CurrentMonth - 1 END;
            DECLARE @PreviousYear INT = CASE WHEN @CurrentMonth = 1 THEN @CurrentYear - 1 ELSE @CurrentYear END;

            DECLARE @startYear INT = CASE WHEN MONTH(GETDATE()) >= 4 THEN YEAR(GETDATE()) ELSE YEAR(GETDATE()) - 1 END;

            -- 2-month lag cutoff calculation
            DECLARE @LagEndMonth INT;
            DECLARE @LagEndYear INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagEndMonth = 2;  -- February of previous FY
                SET @LagEndYear = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagEndMonth = NULL;
                SET @LagEndYear = NULL;
            END
            ELSE IF @CurrentMonth = 6
            BEGIN
                SET @LagEndMonth = 4;  -- April of current FY
                SET @LagEndYear = @startYear;
            END
            ELSE
            BEGIN
                SET @LagEndMonth = @CurrentMonth - 2;
                SET @LagEndYear = @CurrentYear;
            END;

            -- 1-month lag cutoff calculation
            DECLARE @LagMonth INT;
            DECLARE @LagYear INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagMonth = 3;
                SET @LagYear = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagMonth = 4;
                SET @LagYear = @startYear;
            END
            ELSE
            BEGIN
                SET @LagMonth = @PreviousMonth;
                SET @LagYear = @PreviousYear;
            END;

            SELECT 
                a.*,    
                -- Pending calculation formulas:
                (a.applicationsReceivedPrev - a.registeredShipsPrev) AS [applicationsPendingPrev],
                (a.registeredShipsCurrent - a.applicationsReceivedCurrent) AS [applicationsPendingCurrent],
                (a.applicationsReceivedMonth - a.registeredShipsMonth) AS [applicationsPendingMonth],
                ((a.applicationsReceivedCurrent - a.registeredShipsCurrent) + (a.applicationsReceivedMonth - a.registeredShipsMonth)) AS [applicationsPendingTotal],
                ((a.applicationsReceivedPrev + a.registeredShipsCurrent + a.applicationsReceivedMonth) - (a.registeredShipsMonth - a.registeredShipsTotal)) AS [applicationsPendingCurrentFY]

            FROM (
                SELECT
                    [type] AS mmdName,

                    -- Previous FY (April to March)
                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [addition_application_received]
                        ELSE 0
                    END) AS applicationsReceivedPrev,

                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [addition_registered_ship]
                        ELSE 0
                    END) AS registeredShipsPrev,

                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [addition_total_tonnage]
                        ELSE 0
                    END) AS totalTonnagePrev,

                    -- Current FY up to 2-month lag
                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [addition_application_received]
                            ELSE 0
                        END)
                    END AS applicationsReceivedCurrent,

                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [addition_registered_ship]
                            ELSE 0
                        END)
                    END AS registeredShipsCurrent,

                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [addition_total_tonnage]
                            ELSE 0
                        END)
                    END AS totalTonnageCurrent,

                    -- Current Month 1-month lag calculation
                    SUM(CASE
                        WHEN [year] = @LagYear AND [month] = @LagMonth
                        THEN [addition_application_received]
                        ELSE 0
                    END) AS applicationsReceivedMonth,

                    SUM(CASE
                        WHEN [year] = @LagYear AND [month] = @LagMonth
                        THEN [addition_registered_ship]
                        ELSE 0
                    END) AS registeredShipsMonth,

                    SUM(CASE
                        WHEN [year] = @LagYear AND [month] = @LagMonth
                        THEN [addition_total_tonnage]
                        ELSE 0
                    END) AS totalTonnageMonth,

                    -- Current FY totals (up to previous month)
                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [addition_application_received]
                        ELSE 0
                    END) AS applicationsReceivedTotal,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [addition_registered_ship]
                        ELSE 0
                    END) AS registeredShipsTotal,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [addition_total_tonnage]
                        ELSE 0
                    END) AS totalTonnageTotal

                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_1]
                GROUP BY [type]
            ) a;

        `);     
    
                
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); 

        // Calculate month -2 (two months ago) and month -3 (three months ago)
        const monthMinus2 = new Date(currentDate);
        monthMinus2.setMonth(currentDate.getMonth() - 1); 
        const monthMinus2Year = monthMinus2.getFullYear();

        const monthMinus3 = new Date(currentDate);
        monthMinus3.setMonth(currentDate.getMonth() - 2); 
        const monthMinus3Year = monthMinus3.getFullYear();

        // Get full month name for month -2
        const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
        // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;


        // Get the last date of month -2
        const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
        const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');

        // Get the last date of month -3
        const currentMonth = currentDate.getMonth() + 1; // 1-indexed: Jan=1, ..., Dec=12
        const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
        const lastDateOfMonthMinus3Formatted = (currentMonth === 5)
            ? '' : lastDateOfMonthMinus3.toLocaleDateString('en-GB');


        let columnDefs = [
            { 
                headerName: 'MMD Name', 
                field: 'mmdName', 
                headerClass : "headercenter",
                pinned:true,
                children: [
                    {
                        headerName: "A",
                        field: "mmdName",
                        pinned:true,
                    }
                ] 
            },
            { headerName: `During the Previous FY (${previousFinancialYear})`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedPrev',
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "B",
                        field: "applicationsReceivedPrev",
                    }
                ]  },
                { headerName: 'No. of Registered Ships', field: 'registeredShipsPrev',
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "C",
                            field: "registeredShipsPrev",
                        }
                    ]
                 },
                 { headerName: 'No. of Pending Ships', field: 'applicationsPendingPrev',
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "D",
                            field: "applicationsPendingPrev",
                        }
                    ]
                 },
                { headerName: 'Total Tonnage', field: 'totalTonnagePrev', 
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "E",
                            field: "totalTonnagePrev",
                        }
                    ]
                 }, 
            ]},
            { headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedCurrent',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "F",
                            field: "applicationsReceivedCurrent",
                        }
                    ] },
                { headerName: 'No. of Registered Ships', field: 'registeredShipsCurrent',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "G",
                            field: "registeredShipsCurrent",
                        }
                    ] },
                    { headerName: 'No. of Pending Ships', field: 'applicationsPendingCurrent',headerClass : "headercenter",
                        children: [
                            {
                                headerName: "H",
                                field: "applicationsPendingCurrent",
                            }
                        ] },
                { headerName: 'Total Tonnage', field: 'totalTonnageCurrent', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "I",
                            field: "totalTonnageCurrent",
                        }
                    ] }
            ]},
            { headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "J",
                            field: "applicationsReceivedMonth",
                        }
                    ]  },
                { headerName: 'No. of Registered Ships', field: 'registeredShipsMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "K",
                            field: "registeredShipsMonth",
                        }
                    ]  },
                { headerName: 'No. of Pending Ships', field: 'applicationsPendingMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "L",
                            field: "applicationsPendingMonth",
                        }
                    ]  },
                { headerName: 'Total Tonnage', field: 'totalTonnageMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "M",
                            field: "totalTonnageMonth",
                        }
                    ]  }
            ]},
            { headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass : "headercenter", children: [
                // { headerName: 'No. of Applications Received', field: 'applicationsReceivedTotal', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "K = E + H",
                //             field: "applicationsReceivedTotal",
                //         }
                //     ] },
                { headerName: 'No. of Registered Ships', field: 'registeredShipsTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "N = G + K",
                            field: "registeredShipsTotal",
                        }
                    ] },
                    { headerName: 'No. of Pending Ships', field: 'applicationsPendingTotal', headerClass : "headercenter",
                        children: [
                            {
                                headerName: "O = H + L",
                                field: "applicationsPendingTotal",
                            }
                        ] },
                { headerName: 'Total Tonnage', field: 'totalTonnageTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "P = I + M",
                            field: "totalTonnageTotal",
                        }
                    ] },
                // { headerName: 'No. of Applications Pending', field: 'applicationsPendingCurrentFY', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "Q = B+F+ K-N",
                //             field: "applicationsPendingCurrentFY",
                //         }
                //     ] }
            ]}
        ];
        
        res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};


async function getKpiDgs1_2 (req, res)
{
     try {
        const conn = await pool;
        const request = conn.request();
        function getFinancialYears(baseDate = new Date()) {
            const currentMonth = baseDate.getMonth(); // 0-indexed
            const currentYear = baseDate.getFullYear();

            const startYear1 = currentMonth >= 3 ? currentYear : currentYear - 1;
            const endYear = startYear1 + 1;

            const currentFinancialYear = `${startYear1}-${endYear}`;
            const previousFinancialYear = `${startYear1 - 1}-${startYear1}`;

            return { startYear1, endYear, currentFinancialYear, previousFinancialYear };
        }

        const { startYear1, endYear, currentFinancialYear, previousFinancialYear } = getFinancialYears();
        console.log(startYear1)

        let result = await request.query(`           
            DECLARE @CurrentMonth INT = MONTH(GETDATE());
            DECLARE @CurrentYear INT = YEAR(GETDATE());
            DECLARE @PreviousMonth INT = CASE WHEN @CurrentMonth = 1 THEN 12 ELSE @CurrentMonth - 1 END;
            DECLARE @PreviousYear INT = CASE WHEN @CurrentMonth = 1 THEN @CurrentYear - 1 ELSE @CurrentYear END;

            DECLARE @startYear INT = CASE WHEN MONTH(GETDATE()) >= 4 THEN YEAR(GETDATE()) ELSE YEAR(GETDATE()) - 1 END;

            -- 2-month lag cutoff calculation
            DECLARE @LagEndMonth INT;
            DECLARE @LagEndYear INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagEndMonth = 2;  -- February of previous FY
                SET @LagEndYear = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagEndMonth = NULL;
                SET @LagEndYear = NULL;
            END
            ELSE IF @CurrentMonth = 6
            BEGIN
                SET @LagEndMonth = 4;  -- April of current FY
                SET @LagEndYear = @startYear;
            END
            ELSE
            BEGIN
                SET @LagEndMonth = @CurrentMonth - 2;
                SET @LagEndYear = @CurrentYear;
            END;

            -- 1-month lag cutoff calculation for "Current Month" block
            DECLARE @LagMonth1 INT;
            DECLARE @LagYear1 INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagMonth1 = 3;  -- March of previous FY
                SET @LagYear1 = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagMonth1 = 4;  -- April of current FY
                SET @LagYear1 = @startYear;
            END
            ELSE
            BEGIN
                SET @LagMonth1 = @PreviousMonth;
                SET @LagYear1 = @PreviousYear;
            END;

            -- Main query starts here
            SELECT 
                a.*,    
                -- Applied-Ever Registered Ships (Previous FY)
                (a.applicationsReceivedPrev - a.deregisteredShipsPrev) AS [applicationsPendingPrev],

                -- Applied-Ever Registered Ships (Current FY excluding current month with 2 month lag)
                (a.deregisteredShipsCurrent - a.applicationsReceivedCurrent) AS [applicationsPendingCurrent],

                -- Applied-Ever Registered Ships (Current Month with 1 month lag)
                (a.applicationsReceivedMonth - a.deregisteredShipsMonth) AS [applicationsPendingMonth],

                -- O = H + L
                ((a.applicationsReceivedCurrent - a.deregisteredShipsCurrent) + 
                (a.applicationsReceivedMonth - a.deregisteredShipsMonth)) AS [applicationsPendingTotal],

                -- Applied-Ever Registered Ships (Total FY)
                ((a.applicationsReceivedPrev + a.deregisteredShipsCurrent + a.applicationsReceivedMonth) - 
                (a.deregisteredShipsMonth - a.deregisteredShipsTotal)) AS [applicationsPendingCurrentFY]

            FROM (
                SELECT
                    [type] AS mmdName,

                    -- Previous FY: April to March
                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [deletion_application_received]
                        ELSE 0
                    END) AS applicationsReceivedPrev,

                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [deletion_registered_ship]
                        ELSE 0
                    END) AS deregisteredShipsPrev,

                    SUM(CASE
                        WHEN ([year] = @startYear - 1 AND [month] >= 4) OR
                            ([year] = @startYear AND [month] <= 3)
                        THEN [deletion_total_tonnage]
                        ELSE 0
                    END) AS totalTonnagePrev,

                    -- Current FY up to 2-month lag
                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [deletion_application_received]
                            ELSE 0
                        END)
                    END AS applicationsReceivedCurrent,

                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [deletion_registered_ship]
                            ELSE 0
                        END)
                    END AS deregisteredShipsCurrent,

                    CASE 
                        WHEN @LagEndMonth IS NULL THEN NULL
                        ELSE SUM(CASE
                            WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@LagEndYear * 100 + @LagEndMonth)
                            THEN [deletion_total_tonnage]
                            ELSE 0
                        END)
                    END AS totalTonnageCurrent,

                    -- Current Month with 1-month lag logic
                    SUM(CASE
                        WHEN [year] = @LagYear1 AND [month] = @LagMonth1
                        THEN [deletion_application_received]
                        ELSE 0
                    END) AS applicationsReceivedMonth,

                    SUM(CASE
                        WHEN [year] = @LagYear1 AND [month] = @LagMonth1
                        THEN [deletion_registered_ship]
                        ELSE 0
                    END) AS deregisteredShipsMonth,

                    SUM(CASE
                        WHEN [year] = @LagYear1 AND [month] = @LagMonth1
                        THEN [deletion_total_tonnage]
                        ELSE 0
                    END) AS totalTonnageMonth,

                    -- Current FY totals (up to previous month)
                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [deletion_application_received]
                        ELSE 0
                    END) AS applicationsReceivedTotal,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [deletion_registered_ship]
                        ELSE 0
                    END) AS deregisteredShipsTotal,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        THEN [deletion_total_tonnage]
                        ELSE 0
                    END) AS totalTonnageTotal

                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_1]
                GROUP BY [type]
            ) a;

        `);     
    
                
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); 

        // Calculate month -2 (two months ago) and month -3 (three months ago)
        const monthMinus2 = new Date(currentDate);
        monthMinus2.setMonth(currentDate.getMonth() - 1); 
        const monthMinus2Year = monthMinus2.getFullYear();

        const monthMinus3 = new Date(currentDate);
        monthMinus3.setMonth(currentDate.getMonth() - 2); 
        const monthMinus3Year = monthMinus3.getFullYear();

        // Get full month name for month -2
        const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
        // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;


        // Get the last date of month -2
        const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
        const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');

        // Get the last date of month -3
        const currentMonth = currentDate.getMonth() + 1; // 1-indexed: Jan=1, ..., Dec=12
        const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
        const lastDateOfMonthMinus3Formatted = (currentMonth === 5)
            ? '' : lastDateOfMonthMinus3.toLocaleDateString('en-GB');


        let columnDefs = [
            { 
                headerName: 'MMD Name', 
                field: 'mmdName', 
                headerClass : "headercenter",
                pinned:true,
                children: [
                    {
                        headerName: "A",
                        field: "mmdName",
                        pinned:true,
                    }
                ] 
            },
            { headerName: `During the Previous FY (${previousFinancialYear})`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedPrev',
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "B",
                        field: "applicationsReceivedPrev",
                    }
                ]  },
                { headerName: 'No. of Registered Ships', field: 'deregisteredShipsPrev',
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "C",
                            field: "deregisteredShipsPrev",
                        }
                    ]
                 },
                 { headerName: 'No. of Pending Ships', field: 'applicationsPendingPrev',
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "D",
                            field: "applicationsPendingPrev",
                        }
                    ]
                 },
                { headerName: 'Total Tonnage', field: 'totalTonnagePrev', 
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "E",
                            field: "totalTonnagePrev",
                        }
                    ]
                 }, 
            ]},
            { headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedCurrent',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "F",
                            field: "applicationsReceivedCurrent",
                        }
                    ] },
                { headerName: 'No. of Registered Ships', field: 'deregisteredShipsCurrent',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "G",
                            field: "deregisteredShipsCurrent",
                        }
                    ] },
                    { headerName: 'No. of Pending Ships', field: 'applicationsPendingCurrent',headerClass : "headercenter",
                        children: [
                            {
                                headerName: "H",
                                field: "applicationsPendingCurrent",
                            }
                        ] },
                { headerName: 'Total Tonnage', field: 'totalTonnageCurrent', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "I",
                            field: "totalTonnageCurrent",
                        }
                    ] }
            ]},
            { headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass : "headercenter", children: [
                { headerName: 'No. of Applications Received', field: 'applicationsReceivedMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "J",
                            field: "applicationsReceivedMonth",
                        }
                    ]  },
                { headerName: 'No. of Registered Ships', field: 'deregisteredShipsMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "K",
                            field: "deregisteredShipsMonth",
                        }
                    ]  },
                { headerName: 'No. of Pending Ships', field: 'applicationsPendingMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "L",
                            field: "applicationsPendingMonth",
                        }
                    ]  },
                { headerName: 'Total Tonnage', field: 'totalTonnageMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "M",
                            field: "totalTonnageMonth",
                        }
                    ]  }
            ]},
            { headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass : "headercenter", children: [
                // { headerName: 'No. of Applications Received', field: 'applicationsReceivedTotal', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "K = E + H",
                //             field: "applicationsReceivedTotal",
                //         }
                //     ] },
                { headerName: 'No. of Registered Ships', field: 'deregisteredShipsTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "N = G + K",
                            field: "deregisteredShipsTotal",
                        }
                    ] },
                    { headerName: 'No. of Pending Ships', field: 'applicationsPendingTotal', headerClass : "headercenter",
                        children: [
                            {
                                headerName: "O = H + L",
                                field: "applicationsPendingTotal",
                            }
                        ] },
                { headerName: 'Total Tonnage', field: 'totalTonnageTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "P = I + M",
                            field: "totalTonnageTotal",
                        }
                    ] },
                // { headerName: 'No. of Applications Pending', field: 'applicationsPendingCurrentFY', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "Q = B+F+ K-N",
                //             field: "applicationsPendingCurrentFY",
                //         }
                //     ] }
            ]}
        ];
        
        res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};


async function getKpiDgs1_3 (req, res)
{
     try {
        const conn = await pool;
        const request = conn.request();
        function getFinancialYears(baseDate = new Date()) {
            const currentMonth = baseDate.getMonth(); // 0-indexed
            const currentYear = baseDate.getFullYear();

            const startYear1 = currentMonth >= 3 ? currentYear : currentYear - 1;
            const endYear = startYear1 + 1;

            const currentFinancialYear = `${startYear1}-${endYear}`;
            const previousFinancialYear = `${startYear1 - 1}-${startYear1}`;

            return { startYear1, endYear, currentFinancialYear, previousFinancialYear };
        }

        const { startYear1, endYear, currentFinancialYear, previousFinancialYear } = getFinancialYears();
        console.log(startYear1)

        let result = await request.query(`           
            DECLARE @CurrentMonth INT = MONTH(GETDATE());
            DECLARE @CurrentYear INT = YEAR(GETDATE());
            DECLARE @PreviousMonth INT = CASE WHEN @CurrentMonth = 1 THEN 12 ELSE @CurrentMonth - 1 END;
            DECLARE @PreviousYear INT = CASE WHEN @CurrentMonth = 1 THEN @CurrentYear - 1 ELSE @CurrentYear END;

            DECLARE @startYear INT = CASE WHEN MONTH(GETDATE()) >= 4 THEN YEAR(GETDATE()) ELSE YEAR(GETDATE()) - 1 END;

            -- 2-month lag cutoff calculation for addition
            DECLARE @LagEndMonth INT;
            DECLARE @LagEndYear INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagEndMonth = 2;  -- February of previous FY
                SET @LagEndYear = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagEndMonth = NULL;
                SET @LagEndYear = NULL;
            END
            ELSE IF @CurrentMonth = 6
            BEGIN
                SET @LagEndMonth = 4;  -- April of current FY
                SET @LagEndYear = @startYear;
            END
            ELSE
            BEGIN
                SET @LagEndMonth = @CurrentMonth - 2;
                SET @LagEndYear = @CurrentYear;
            END;

            -- 1-month lag cutoff calculation for current month
            DECLARE @LagMonth1 INT;
            DECLARE @LagYear1 INT;

            IF @CurrentMonth = 4
            BEGIN
                SET @LagMonth1 = 3;  -- March of previous FY
                SET @LagYear1 = @startYear - 1;
            END
            ELSE IF @CurrentMonth = 5
            BEGIN
                SET @LagMonth1 = 4;  -- April of current FY
                SET @LagYear1 = @startYear;
            END
            ELSE
            BEGIN
                SET @LagMonth1 = @PreviousMonth;
                SET @LagYear1 = @PreviousYear;
            END;

            -- Main Query
            SELECT 
                a.*,    
                -- Final Calculated Field
                ((a.registeredShipsCurrent) - 
                (a.registeredShipsMonth - a.registeredShipsTotal)) AS [applicationsPendingCurrentFY]

            FROM (
                SELECT
                    [type] AS mmdName,
                    

                    -- Previous FY cumulative (Apr-Mar) + Current FY March net
                    SUM(CASE
                        WHEN ([year] < @startYear)
                            OR ([year] = @startYear AND [month] <= 3)
                        THEN (addition_registered_ship - deletion_registered_ship)
                        ELSE 0
                    END) AS registeredShipsPrev,

                    SUM(CASE
                        WHEN ([year] < @startYear)
                            OR ([year] = @startYear AND [month] <= 3)
                        THEN (addition_total_tonnage - deletion_total_tonnage)
                        ELSE 0
                    END) AS totalTonnagePrev,

                    
                    -- All previous data till current month - 2 (using lag variables)
                    SUM(CASE
                        WHEN ([year] * 100 + [month]) <= (@LagEndYear * 100 + @LagEndMonth)
                        THEN (addition_registered_ship - deletion_registered_ship)
                        ELSE 0
                    END) AS registeredShipsCurrent,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) <= (@LagEndYear * 100 + @LagEndMonth)
                        THEN (addition_total_tonnage - deletion_total_tonnage)
                        ELSE 0
                    END) AS totalTonnageCurrent,
                  

                    -- Current Month using 1-month lag
                    SUM(CASE
                        WHEN [year] = @LagYear1 AND [month] = @LagMonth1
                        THEN (addition_registered_ship - deletion_registered_ship)
                        ELSE 0
                    END) AS registeredShipsMonth,

                    SUM(CASE
                        WHEN [year] = @LagYear1 AND [month] = @LagMonth1
                        THEN (addition_total_tonnage - deletion_total_tonnage)
                        ELSE 0
                    END) AS totalTonnageMonth,

                    -- Current FY totals (up to previous month)
                    SUM(CASE
                      --  WHEN ([year] * 100 + [month]) BETWEEN (@startYear * 100 + 4) AND (@PreviousYear * 100 + @PreviousMonth)
                        WHEN ([year] * 100 + [month]) <= (@PreviousYear * 100 + @PreviousMonth)
                        THEN (addition_registered_ship - deletion_registered_ship)
                        ELSE 0
                    END) AS registeredShipsTotal,

                    SUM(CASE
                        WHEN ([year] * 100 + [month]) <= (@PreviousYear * 100 + @PreviousMonth)
                        THEN (addition_total_tonnage - deletion_total_tonnage)
                        ELSE 0
                    END) AS totalTonnageTotal

                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_1]
                GROUP BY [type]
            ) a;


        `);     
    
                
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); 

        // Calculate month -2 (two months ago) and month -3 (three months ago)
        const monthMinus2 = new Date(currentDate);
        monthMinus2.setMonth(currentDate.getMonth() - 1); 
        const monthMinus2Year = monthMinus2.getFullYear();

        const monthMinus3 = new Date(currentDate);
        monthMinus3.setMonth(currentDate.getMonth() - 2); 
        const monthMinus3Year = monthMinus3.getFullYear();

        // Get full month name for month -2
        const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
        // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;


        // Get the last date of month -2
        const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
        const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');

        // Get the last date of month -3
        const currentMonth = currentDate.getMonth() + 1; // 1-indexed: Jan=1, ..., Dec=12
        const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
        const lastDateOfMonthMinus3Formatted = (currentMonth === 5)
            ? ''
            : lastDateOfMonthMinus3.toLocaleDateString('en-GB');


        let columnDefs = [
            { 
                headerName: 'MMD Name', 
                field: 'mmdName', 
                headerClass : "headercenter",
                pinned:true,
                children: [
                    {
                        headerName: "A",
                        field: "mmdName",
                        pinned:true,
                    }
                ] 
            },
            { headerName: `Cumulative Active Ships in Previous FY (${previousFinancialYear})`, headerClass : "headercenter", children: [
                
                { headerName: 'No. of Registered Ships', field: 'registeredShipsPrev',
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "B",
                            field: "registeredShipsPrev",
                        }
                    ]
                },
                 
                { headerName: 'Total Tonnage', field: 'totalTonnagePrev', 
                    headerClass : "headercenter",
                    children: [
                        {
                            headerName: "C",
                            field: "totalTonnagePrev",
                        }
                    ]
                 }, 
            ]},
            { headerName: `Cumulative Active Ships during the Current FY-upto ${lastDateOfMonthMinus3Formatted}`, headerClass : "headercenter", children: [
                
                { headerName: 'No. of Registered Ships', field: 'registeredShipsCurrent',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "D",
                            field: "registeredShipsCurrent",
                        }
                    ] },
                   
                { headerName: 'Total Tonnage', field: 'totalTonnageCurrent', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "E",
                            field: "totalTonnageCurrent",
                        }
                    ] }
            ]},
            { headerName: `Cumulative Active Ships during the month (${monthMinus2Name}-${monthMinus2Year})`, headerClass : "headercenter", children: [
                
                { headerName: 'No. of Registered Ships', field: 'registeredShipsMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "F",
                            field: "registeredShipsMonth",
                        }
                    ]  },
              
                { headerName: 'Total Tonnage', field: 'totalTonnageMonth',headerClass : "headercenter",
                    children: [
                        {
                            headerName: "G",
                            field: "totalTonnageMonth",
                        }
                    ]  }
            ]},
            { headerName: `Cumulative Active Ships in the current FY up to ${lastDateOfMonthMinus2Formatted}`, headerClass : "headercenter", children: [
                // { headerName: 'No. of Applications Received', field: 'applicationsReceivedTotal', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "H = E + H",
                //             field: "applicationsReceivedTotal",
                //         }
                //     ] },
                { headerName: 'No. of Registered Ships', field: 'registeredShipsTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "H = D + F",
                            field: "registeredShipsTotal",
                        }
                    ] },
                   
                { headerName: 'Total Tonnage', field: 'totalTonnageTotal', headerClass : "headercenter",
                    children: [
                        {
                            headerName: "I = E + G",
                            field: "totalTonnageTotal",
                        }
                    ] },
                // { headerName: 'No. of Applications Pending', field: 'applicationsPendingCurrentFY', headerClass : "headercenter",
                //     children: [
                //         {
                //             headerName: "J = B+F+ K-N",
                //             field: "applicationsPendingCurrentFY",
                //         }
                //     ] }
            ]}
        ];
        
        res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};

async function getKpiDgs1_4 (req, res) 
{
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

            -- Set Financial Year Dates
            SET @FinancialYearStartDate = 
                CASE WHEN MONTH(GETDATE()) >= 4 
                    THEN CAST(CAST(YEAR(GETDATE()) AS VARCHAR) + '-04-01' AS DATE)
                    ELSE CAST(CAST(YEAR(GETDATE()) - 1 AS VARCHAR) + '-04-01' AS DATE)
                END;

            SET @FinancialYearEndDate = 
                DATEADD(DAY, -1, DATEADD(YEAR, 1, @FinancialYearStartDate)); -- FY end date

            ;WITH RawData AS (
                SELECT
                    [year],
                    [month],
                    addition_registered_ship,
                    addition_total_tonnage,
                    deletion_registered_ship,
                    deletion_total_tonnage
                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_1]
            ),
            BaseData AS (
                SELECT
                    FORMAT(DATEFROMPARTS([year], [month], 1), 'MMMM') AS MonthName,
                    [year],
                    [month],
                    SUM(addition_registered_ship) AS AddShip,
                    SUM(addition_total_tonnage) AS AddTonnage,
                    SUM(deletion_registered_ship) AS DelShip,
                    SUM(deletion_total_tonnage) AS DelTonnage,
                    SUM(addition_registered_ship) - SUM(deletion_registered_ship) AS NetShip,
                    SUM(addition_total_tonnage) - SUM(deletion_total_tonnage) AS NetTonnage
                FROM RawData
                GROUP BY [year], [month]
            ),
           CumulativeData AS (
                SELECT 
                    BD.year, 
                    BD.month, 
                    BD.MonthName, 
                    BD.AddShip, 
                    BD.AddTonnage, 
                    BD.DelShip, 
                    BD.DelTonnage, 
                    BD.NetShip, 
                    BD.NetTonnage,
                    
                    -- calculate cumulative only within current FY
                    (
                        SELECT SUM(AddShip - DelShip) 
                        FROM BaseData BD2
                        WHERE 
                            DATEFROMPARTS(BD2.year, BD2.month, 1) >= @FinancialYearStartDate
                            AND (
                                BD2.year < BD.year 
                                OR (BD2.year = BD.year AND BD2.month <= BD.month)
                            )
                    ) AS CumShip,

                    (
                        SELECT SUM(AddTonnage - DelTonnage) 
                        FROM BaseData BD2
                        WHERE 
                            DATEFROMPARTS(BD2.year, BD2.month, 1) >= @FinancialYearStartDate
                            AND (
                                BD2.year < BD.year 
                                OR (BD2.year = BD.year AND BD2.month <= BD.month)
                            )
                    ) AS CumTonnage

                FROM BaseData BD
            ),

            FilteredData AS (
                -- only take data inside current financial year
                SELECT *
                FROM CumulativeData
                WHERE DATEFROMPARTS(year, month, 1) BETWEEN @FinancialYearStartDate AND @FinancialYearEndDate
            ),
            Unpivoted AS (
                SELECT 'No of Registered Ships' AS Category, MonthName + '_Ship' AS Col, AddShip AS Val FROM FilteredData
                UNION ALL SELECT 'No of Registered Ships', MonthName + '_Tonnage', AddTonnage FROM FilteredData
                UNION ALL SELECT 'No of Deregistered Ships', MonthName + '_Ship', DelShip FROM FilteredData
                UNION ALL SELECT 'No of Deregistered Ships', MonthName + '_Tonnage', DelTonnage FROM FilteredData
                UNION ALL SELECT 'No of Net Ships Added', MonthName + '_Ship', NetShip FROM FilteredData
                UNION ALL SELECT 'No of Net Ships Added', MonthName + '_Tonnage', NetTonnage FROM FilteredData
                UNION ALL SELECT 'Cumulative Registered Ships', MonthName + '_Ship', CumShip FROM FilteredData
                UNION ALL SELECT 'Cumulative Registered Ships', MonthName + '_Tonnage', CumTonnage FROM FilteredData
            )
            SELECT *
            FROM Unpivoted
            PIVOT (
                MAX(Val) FOR Col IN (
                    [April_Ship], [April_Tonnage],
                    [May_Ship], [May_Tonnage],
                    [June_Ship], [June_Tonnage],
                    [July_Ship], [July_Tonnage],
                    [August_Ship], [August_Tonnage],
                    [September_Ship], [September_Tonnage],
                    [October_Ship], [October_Tonnage],
                    [November_Ship], [November_Tonnage],
                    [December_Ship], [December_Tonnage],
                    [January_Ship], [January_Tonnage],
                    [February_Ship], [February_Tonnage],
                    [March_Ship], [March_Tonnage]
                )
            ) AS Pivoted
            ORDER BY 
                CASE [Category]
                    WHEN 'No of Registered Ships' THEN 1
                    WHEN 'No of Deregistered Ships' THEN 2
                    WHEN 'No of Net Ships Added' THEN 3
                    WHEN 'Cumulative Registered Ships' THEN 4
                    ELSE 5
                END;
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


async function getKpiDgs1_5 (req, res) 
{
    try {
        const conn = await pool;
        const request = conn.request();

        let result = await request.query(`   
            DECLARE @cols NVARCHAR(MAX), @query NVARCHAR(MAX);
            DECLARE @CurrentMonth INT = MONTH(GETDATE());
            DECLARE @PreviousMonthName NVARCHAR(20) = DATENAME(MONTH, DATEADD(MONTH, -1, GETDATE()));
            DECLARE @LatestFinancialYear NVARCHAR(20);

            -- Step 1: Generate Financial Year Range
            WITH FinancialYearRange AS (
                SELECT 'FY2022-2023' AS financial_year
                UNION ALL
                SELECT CONCAT('FY', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), '-', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE CAST(SUBSTRING(financial_year, 3, 4) AS INT) < (YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END) - 1
            )
            SELECT TOP 1 @LatestFinancialYear = financial_year 
            FROM FinancialYearRange 
            ORDER BY financial_year DESC;

            -- Step 2: Generate column list dynamically
            WITH FinancialYearRange AS (
                SELECT 'FY2022-2023' AS financial_year
                UNION ALL
                SELECT CONCAT('FY', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), '-', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE CAST(SUBSTRING(financial_year, 3, 4) AS INT) < (YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END) - 1
            )
            SELECT @cols = STRING_AGG(
                CASE 
                    WHEN financial_year = @LatestFinancialYear 
                    THEN 
                        QUOTENAME(financial_year + ' (upto ' + @PreviousMonthName + ')_Ships') + ',' + 
                        QUOTENAME(financial_year + ' (upto ' + @PreviousMonthName + ')_Tonnage')
                    ELSE 
                        QUOTENAME(financial_year + '_Ships') + ',' + 
                        QUOTENAME(financial_year + '_Tonnage')
                END
            , ',')
            FROM FinancialYearRange;

            -- Step 3: Build dynamic query
            SET @query = '
            WITH FinancialYearRange AS (
                SELECT ''FY2022-2023'' AS financial_year
                UNION ALL
                SELECT CONCAT(''FY'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 1 AS VARCHAR(4)), ''-'', CAST(CAST(SUBSTRING(financial_year, 3, 4) AS INT) + 2 AS VARCHAR(4)))
                FROM FinancialYearRange
                WHERE CAST(SUBSTRING(financial_year, 3, 4) AS INT) < YEAR(GETDATE()) + CASE WHEN MONTH(GETDATE()) >= 4 THEN 1 ELSE 0 END
            ),

            RegisteredData AS (
                SELECT 
                    CASE 
                        WHEN [month] >= 4 THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                        ELSE CONCAT(''FY'', [year] - 1, ''-'', [year])
                    END AS financial_year,
                    addition_registered_ship AS ships,
                    addition_total_tonnage / 1000 AS tonnage
                FROM [tbl_kpi_dgs_2_1]
                WHERE [year] >= 2022
            ),
            DeregisteredData AS (
                SELECT 
                    CASE 
                        WHEN [month] >= 4 THEN CONCAT(''FY'', [year], ''-'', [year] + 1)
                        ELSE CONCAT(''FY'', [year] - 1, ''-'', [year])
                    END AS financial_year,
                    deletion_registered_ship AS ships,
                    deletion_total_tonnage / 1000 AS tonnage
                FROM [tbl_kpi_dgs_2_1]
                WHERE [year] >= 2022
            ),

            RegisteredSummary AS (
                SELECT financial_year, SUM(ships) AS ships, SUM(tonnage) AS tonnage
                FROM RegisteredData
                GROUP BY financial_year
            ),
            DeregisteredSummary AS (
                SELECT financial_year, SUM(ships) AS ships, SUM(tonnage) AS tonnage
                FROM DeregisteredData
                GROUP BY financial_year
            ),
            NetSummary AS (
                SELECT 
                    ISNULL(r.financial_year, d.financial_year) AS financial_year,
                    ISNULL(r.ships, 0) - ISNULL(d.ships, 0) AS net_ships,
                    ISNULL(r.tonnage, 0) - ISNULL(d.tonnage, 0) AS net_tonnage
                FROM RegisteredSummary r
                FULL OUTER JOIN DeregisteredSummary d ON r.financial_year = d.financial_year
            ),
            CumulativeSummary AS (
                SELECT 
                    fy.financial_year,
                    1491 + SUM(ISNULL(ns.net_ships, 0)) OVER (ORDER BY fy.financial_year ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_ships,
                    12995 + SUM(ISNULL(ns.net_tonnage, 0)) OVER (ORDER BY fy.financial_year ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_tonnage
                FROM FinancialYearRange fy
                LEFT JOIN NetSummary ns ON fy.financial_year = ns.financial_year
            ),

            CombinedData AS (
                SELECT financial_year, ''No of Registered Ships & Tonnage'' AS Metric, ships, tonnage FROM RegisteredSummary
                UNION ALL
                SELECT financial_year, ''No of Deregistered Ships & Tonnage'', ships, tonnage FROM DeregisteredSummary
                UNION ALL
                SELECT financial_year, ''Net Registered Ships & Tonnage'', net_ships, net_tonnage FROM NetSummary
                UNION ALL
                SELECT financial_year, ''No of Cumulative Ships & Tonnage'', cumulative_ships, cumulative_tonnage FROM CumulativeSummary
            ),

            -- Apply alias for latest financial year
            RenamedData AS (
                SELECT 
                    CASE WHEN financial_year = ''' + @LatestFinancialYear + ''' 
                        THEN financial_year + '' (upto ' + @PreviousMonthName + ')'' 
                        ELSE financial_year END AS financial_year,
                    Metric, ships, tonnage
                FROM CombinedData
            )

            SELECT Metric, ' + @cols + '
            FROM (
                SELECT Metric, financial_year + ''_Ships'' AS ColumnName, ships AS Value FROM RenamedData
                UNION ALL
                SELECT Metric, financial_year + ''_Tonnage'' AS ColumnName, tonnage AS Value FROM RenamedData
            ) AS SourceTable
            PIVOT (
                SUM(Value) FOR ColumnName IN (' + @cols + ')
            ) AS FinalPivot
            ORDER BY 
                CASE 
                    WHEN Metric = ''No of Registered Ships & Tonnage'' THEN 1
                    WHEN Metric = ''No of Deregistered Ships & Tonnage'' THEN 2
                    WHEN Metric = ''Net Registered Ships & Tonnage'' THEN 3
                    ELSE 4
                END;
            ';

            EXEC sp_executesql @query;

        `);         
        
        const rowData = result.recordset;  
        console.log(rowData, "rowData")

        const data =   [
            {
                Metric: "No of Registered Ships & Tonnage",
                "FY2013-2014_Ships": 0,
                "FY2013-2014_Tonnage": 0,
                "FY2014-2015_Ships": 0,
                "FY2014-2015_Tonnage": 0,
                "FY2015-2016_Ships": 0,
                "FY2015-2016_Tonnage": 0,
                "FY2016-2017_Ships": 0,
                "FY2016-2017_Tonnage": 0,
                "FY2017-2018_Ships": 0,
                "FY2017-2018_Tonnage": 0,
                "FY2018-2019_Ships": 0,
                "FY2018-2019_Tonnage": 0,
                "FY2019-2020_Ships": 0,
                "FY2019-2020_Tonnage": 0,
                "FY2020-2021_Ships": 0,
                "FY2020-2021_Tonnage": 0,
                "FY2021-2022_Ships": 0,
                "FY2021-2022_Tonnage": 0,
            },
            {
                Metric: "No of Deregistered Ships & Tonnage",
                "FY2013-2014_Ships": 0,
                "FY2013-2014_Tonnage": 0,
                "FY2014-2015_Ships": 0,
                "FY2014-2015_Tonnage": 0,
                "FY2015-2016_Ships": 0,
                "FY2015-2016_Tonnage": 0,
                "FY2016-2017_Ships": 0,
                "FY2016-2017_Tonnage": 0,
                "FY2017-2018_Ships": 0,
                "FY2017-2018_Tonnage": 0,
                "FY2018-2019_Ships": 0,
                "FY2018-2019_Tonnage": 0,
                "FY2019-2020_Ships": 0,
                "FY2019-2020_Tonnage": 0,
                "FY2020-2021_Ships": 0,
                "FY2020-2021_Tonnage": 0,
                "FY2021-2022_Ships": 0,
                "FY2021-2022_Tonnage": 0,
            },
            {
                Metric: "Net Registered Ships & Tonnage",
                "FY2013-2014_Ships": 0,
                "FY2013-2014_Tonnage": 0,
                "FY2014-2015_Ships": 0,
                "FY2014-2015_Tonnage": 0,
                "FY2015-2016_Ships": 0,
                "FY2015-2016_Tonnage": 0,
                "FY2016-2017_Ships": 0,
                "FY2016-2017_Tonnage": 0,
                "FY2017-2018_Ships": 0,
                "FY2017-2018_Tonnage": 0,
                "FY2018-2019_Ships": 0,
                "FY2018-2019_Tonnage": 0,
                "FY2019-2020_Ships": 0,
                "FY2019-2020_Tonnage": 0,
                "FY2020-2021_Ships": 0,
                "FY2020-2021_Tonnage": 0,
                "FY2021-2022_Ships": 0,
                "FY2021-2022_Tonnage": 0,
            },
            {
                Metric: "No of Cumulative Ships & Tonnage",
                "FY2013-2014_Ships": 1199,
                "FY2013-2014_Tonnage": 10383,
                "FY2014-2015_Ships": 1204,
                "FY2014-2015_Tonnage": 10309,
                "FY2015-2016_Ships": 1246,
                "FY2015-2016_Tonnage": 10508,
                "FY2016-2017_Ships": 1301,
                "FY2016-2017_Tonnage": 11425,
                "FY2017-2018_Ships": 1371,
                "FY2017-2018_Tonnage":12352,
                "FY2018-2019_Ships": 1400,
                "FY2018-2019_Tonnage": 12683,
                "FY2019-2020_Ships": 1429,
                "FY2019-2020_Tonnage": 12746,
                "FY2020-2021_Ships": 1463,
                "FY2020-2021_Tonnage": 13011,
                "FY2021-2022_Ships": 1491,
                "FY2021-2022_Tonnage": 12995,
            }
          ];

        //   let previousShips = 1491;
        //   let previousTonnage = 12995;
        //   for(let i =0; i<rowData.length; i++) {
        //     for(let key of rowData[i].keys()) {
        //         if(key == "Metric") continue;

        //         data[i][key] = rowData[i][key];

        //     }
        //   }
          for (let i = 0; i < rowData.length; i++) {
            for (let key of Object.keys(rowData[i])) {
                if (key === "Metric") continue;
                data[i][key] = rowData[i][key];
            }
        }

        
        if (data.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const columnDefs = Object.keys(data[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));
 
        res.json({ columnDefs, data });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};

export default { getKpiDgs1_1,getKpiDgs1_2,getKpiDgs1_3,getKpiDgs1_4, getKpiDgs1_5 };


