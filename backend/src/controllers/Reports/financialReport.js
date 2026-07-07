import { pool } from "../../db.js";
import moment from 'moment';

async function getKPIMajorPorts_12_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;
        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        // // Console logs
        // console.log("currentDate:", currentDate);
        // console.log("currentYear:", currentYear);
        // console.log("currentMonth:", currentMonth);
        // console.log("prevMonth:", prevMonth);
        // console.log("currentFiscalYear:", currentFiscalYear);
        // console.log("lastFiscalYear:", lastFiscalYear);

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        // Log all
        // Final logs
        // console.log("quarter:", quarter);
        // console.log("duringTheQuarterMonths:", duringTheQuarterMonths);
        // console.log("lastFyTillBeginningMonth:", lastFyTillBeginningMonth);
        // console.log("duringQuarterYear:", duringQuarterYear);
        // console.log("beginPreviousYear:", beginPreviousYear);
        // console.log("prevMonthQuarter:", prevMonthQuarter);
        // console.log("duringTheQuarterMonthsStr:", duringTheQuarterMonthsStr);
        // console.log("lastFyTillBeginningMonthStr:", lastFyTillBeginningMonthStr);
        // console.log("prevMonthQuarterStr:", prevMonthQuarterStr);


        const query = `
            WITH LastFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(operating_surplus) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN operating_surplus ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_surplus ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(operating_surplus) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN operating_surplus ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_surplus ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_surplus ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN operating_surplus ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_operating_surplus), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_operating_surplus), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            RankedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,
               
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    -- QoQ Growth
                    CASE 
                        WHEN m.prevPrevMonthData > 0 
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    -- YoY Growth
                    CASE 
                        WHEN lfy.lastFiscalZ1 > 0 
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    -- Ranking
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE 
                                WHEN lfy.lastFiscalZ1 > 0 
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id

            )
            SELECT * 
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}




async function getKPIMajorPorts_12_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(operating_surplus) AS operating_surplus
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(operating_surplus) AS quarterly_operating_surplus
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_operating_surplus END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_operating_surplus END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_operating_surplus END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_operating_surplus END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getKPIMajorPorts_12_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.operating_surplus) AS total_operating_surplus
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_operating_surplus
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_operating_surplus)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getKPIMajorPorts_13_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        const query = `
            WITH LastFiscalYearData AS (
                SELECT
                    organisation_id,
                    SUM(operating_profit_tonne) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN operating_profit_tonne ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_profit_tonne ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT
                    organisation_id,
                    SUM(operating_profit_tonne) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN operating_profit_tonne ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_profit_tonne ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN operating_profit_tonne ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN operating_profit_tonne ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_operating_profit), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_operating_profit), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            RankedData AS (
                SELECT
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    CASE
                        WHEN m.prevPrevMonthData > 0
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    CASE
                        WHEN lfy.lastFiscalZ1 > 0
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    ROW_NUMBER() OVER (
                        ORDER BY
                            CASE
                                WHEN lfy.lastFiscalZ1 > 0
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                  
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id
            )
            SELECT *
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getKPIMajorPorts_13_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(operating_profit_tonne) AS operating_profit_tonne
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(operating_profit_tonne) AS quarterly_operating_profit_tonne
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_operating_profit_tonne END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_operating_profit_tonne END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_operating_profit_tonne END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_operating_profit_tonne END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getKPIMajorPorts_13_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.operating_profit_tonne) AS total_operating_profit_tonne
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_operating_profit_tonne
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_operating_profit_tonne)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



async function getKPIMajorPorts_14_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        const query = `
            WITH LastFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(teu_container) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN teu_container ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN teu_container ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(teu_container) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN teu_container ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN teu_container ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN teu_container ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN teu_container ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_teu_container), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_teu_container), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            RankedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,                
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    -- QoQ Growth
                    CASE 
                        WHEN m.prevPrevMonthData > 0 
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    -- YoY Growth
                    CASE 
                        WHEN lfy.lastFiscalZ1 > 0 
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    -- Ranking
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE 
                                WHEN lfy.lastFiscalZ1 > 0 
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id
            )
            SELECT * 
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getKPIMajorPorts_14_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(teu_container) AS teu_container
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(teu_container) AS quarterly_teu_container
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_teu_container END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_teu_container END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_teu_container END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_teu_container END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getKPIMajorPorts_14_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.teu_container) AS total_teu_container
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_teu_container
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_teu_container)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getKPIMajorPorts_15_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        const query = `
            WITH LastFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_dry_bulk) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_dry_bulk ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_dry_bulk ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_dry_bulk) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_dry_bulk ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_dry_bulk ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_dry_bulk ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN tonne_dry_bulk ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_drybulk), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_drybulk), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            RankedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,                
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    -- QoQ Growth
                    CASE 
                        WHEN m.prevPrevMonthData > 0 
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    -- YoY Growth
                    CASE 
                        WHEN lfy.lastFiscalZ1 > 0 
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    -- Ranking
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE 
                                WHEN lfy.lastFiscalZ1 > 0 
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id
            )
            SELECT * 
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getKPIMajorPorts_15_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(tonne_dry_bulk) AS tonne_dry_bulk
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(tonne_dry_bulk) AS quarterly_tonne_dry_bulk
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_tonne_dry_bulk END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_tonne_dry_bulk END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_tonne_dry_bulk END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_tonne_dry_bulk END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_15_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.tonne_dry_bulk) AS total_tonne_dry_bulk
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_tonne_dry_bulk
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_tonne_dry_bulk)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_16_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        const query = `
            WITH LastFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_break_bulk) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_break_bulk ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_break_bulk ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_break_bulk) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_break_bulk ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_break_bulk ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_break_bulk ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN tonne_break_bulk ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_Breakbulk), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_Breakbulk), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            RankedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    -- QoQ Growth
                    CASE 
                        WHEN m.prevPrevMonthData > 0 
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    -- YoY Growth
                    CASE 
                        WHEN lfy.lastFiscalZ1 > 0 
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    -- Ranking
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE 
                                WHEN lfy.lastFiscalZ1 > 0 
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id
            )
            SELECT * 
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_16_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(tonne_break_bulk) AS tonne_break_bulk
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(tonne_break_bulk) AS quarterly_tonne_break_bulk
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_tonne_break_bulk END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_tonne_break_bulk END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_tonne_break_bulk END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_tonne_break_bulk END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_16_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.tonne_break_bulk) AS total_tonne_break_bulk
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_tonne_break_bulk
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_tonne_break_bulk)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_17_1(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        let quarter, duringTheQuarterMonths = [], lastFyTillBeginningMonth = [], duringQuarterYear, beginPreviousYear, prevMonthQuarter;
        
        if(prevMonth >= 4 && prevMonth <= 6) {
            quarter = 1;
            duringTheQuarterMonths = [4,5,6]
            lastFyTillBeginningMonth = []
            duringQuarterYear = currentYear;
            beginPreviousYear = null;
            prevMonthQuarter = [1,2,3];
        }
        else if(prevMonth >= 7 && prevMonth <= 9) {
            quarter = 2;
            duringTheQuarterMonths = [7,8,9]
            lastFyTillBeginningMonth = [4, 5, 6]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [4,5,6];

        }
        else if(prevMonth >= 10 && prevMonth <= 12) {
            quarter = 3;
            duringTheQuarterMonths = [10,11,12]
            lastFyTillBeginningMonth = [4,5,6,7,8,9]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear;
            prevMonthQuarter = [7,8,9];

        }
        else if(prevMonth >= 1 && prevMonth <= 3) {
            quarter = 4;
            duringTheQuarterMonths = [1,2,3]
            lastFyTillBeginningMonth = [4,5,6,7,8,9,10,11,12]
            duringQuarterYear = currentYear;
            beginPreviousYear = currentYear - 1;
            prevMonthQuarter = [10,11,12];

        }

        // Safely stringify month lists
        function safeList(arr) {
            return arr.length > 0 ? `(${arr.join(",")})` : '(NULL)';
        }
        const duringTheQuarterMonthsStr = safeList(duringTheQuarterMonths);
        const lastFyTillBeginningMonthStr = safeList(lastFyTillBeginningMonth);
        const prevMonthQuarterStr = safeList(prevMonthQuarter);
        
        const query = `
            WITH LastFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_liquid_bulk) AS lastFiscalZ1,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_liquid_bulk ELSE 0 END) AS lastFiscalX1,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_liquid_bulk ELSE 0 END) AS lastFiscalY1
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearData AS (
                SELECT 
                    organisation_id,
                    SUM(tonne_liquid_bulk) AS currentFiscalZ2,
                    SUM(CASE WHEN month IN ${lastFyTillBeginningMonthStr} THEN tonne_liquid_bulk ELSE 0 END) AS currentFiscalX2,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_liquid_bulk ELSE 0 END) AS currentFiscalY2
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    SUM(CASE WHEN month IN ${duringTheQuarterMonthsStr} THEN tonne_liquid_bulk ELSE 0 END) AS prevMonthData,
                    SUM(CASE WHEN month IN ${prevMonthQuarterStr} THEN tonne_liquid_bulk ELSE 0 END) AS prevPrevMonthData
                FROM tbl_financial_parameter
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id
            ),
            LastFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_liquidbulk), 0) AS lastFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @lastFiscalYear
                GROUP BY organisation_id
            ),
            CurrentFiscalYearTarget AS (
                SELECT
                    organisation_id,
                    COALESCE(SUM(target_tonof_liquidbulk), 0) AS currentFiscalYearTarget
                FROM tbl_financial_paramaters_mopsw_target
                WHERE annually_financial_year = @currentFiscalYear
                GROUP BY organisation_id  
            ),            
            RankedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS port,
                    COALESCE(t1.lastFiscalYearTarget, 0) AS lastFiscalYearTarget,
                    COALESCE(t2.currentFiscalYearTarget, 0) AS currentFiscalYearTarget,
                    lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                    cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,

                    -- QoQ Growth
                    CASE 
                        WHEN m.prevPrevMonthData > 0 
                        THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                        ELSE NULL
                    END AS momGrowth,

                    -- YoY Growth
                    CASE 
                        WHEN lfy.lastFiscalZ1 > 0 
                        THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END AS yoyGrowth,

                    -- Ranking
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE 
                                WHEN lfy.lastFiscalZ1 > 0 
                                THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                                ELSE NULL
                            END DESC
                    ) AS ranking
                FROM mmt_organisation o
                INNER JOIN (
                    SELECT DISTINCT organisation_id FROM tbl_financial_parameter
                ) t ON o.organisation_id = t.organisation_id
                LEFT JOIN LastFiscalYearData lfy ON o.organisation_id = lfy.organisation_id
                LEFT JOIN CurrentFiscalYearData cfy ON o.organisation_id = cfy.organisation_id
                LEFT JOIN QuarterlyData m ON o.organisation_id = m.organisation_id
                LEFT JOIN LastFiscalYearTarget t1 ON o.organisation_id = t1.organisation_id
                LEFT JOIN CurrentFiscalYearTarget t2 ON o.organisation_id = t2.organisation_id
            )
            SELECT * 
            FROM RankedData
            ORDER BY ranking;
        `;

        // console.log("Generated SQL Query:", query);

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getKPIMajorPorts_17_2(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    month,
                    SUM(tonne_liquid_bulk) AS tonne_liquid_bulk
                FROM tbl_financial_parameter
                GROUP BY organisation_id, annually_financial_year, month
            ),
            QuarterlyData AS (
                SELECT 
                    organisation_id,
                    annually_financial_year,
                    CASE 
                        WHEN month IN (4, 5, 6) THEN 'Q1'
                        WHEN month IN (7, 8, 9) THEN 'Q2'
                        WHEN month IN (10, 11, 12) THEN 'Q3'
                        WHEN month IN (1, 2, 3) THEN 'Q4'
                    END AS quarter,
                    SUM(tonne_liquid_bulk) AS quarterly_tonne_liquid_bulk
                FROM MonthlyData
                GROUP BY organisation_id, annually_financial_year,
                        CASE 
                            WHEN month IN (4, 5, 6) THEN 'Q1'
                            WHEN month IN (7, 8, 9) THEN 'Q2'
                            WHEN month IN (10, 11, 12) THEN 'Q3'
                            WHEN month IN (1, 2, 3) THEN 'Q4'
                        END
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    q.annually_financial_year,
                    SUM(CASE WHEN q.quarter = 'Q1' THEN q.quarterly_tonne_liquid_bulk END) AS 'April-May-June',
                    SUM(CASE WHEN q.quarter = 'Q2' THEN q.quarterly_tonne_liquid_bulk END) AS 'July-August-Sept',
                    SUM(CASE WHEN q.quarter = 'Q3' THEN q.quarterly_tonne_liquid_bulk END) AS 'Oct-Nov-Dec',
                    SUM(CASE WHEN q.quarter = 'Q4' THEN q.quarterly_tonne_liquid_bulk END) AS 'Jan-Feb-March'
                FROM QuarterlyData q
                JOIN mmt_organisation o ON q.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, q.annually_financial_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, annually_financial_year DESC;

        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);
        
        console.log(prevMonth, "prevMonth")

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching RoRo Pax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getKPIMajorPorts_17_3(req, res) {
    const conn = await pool;
    try {
        const query = `
            DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

            -- Set the base year
            DECLARE @startYear INT = 2014;

            -- Dynamically determine the latest year in data (right side of '2014-2015')
            SELECT @columns = MAX(CAST(LEFT(annually_financial_year, 4) AS INT))
            FROM tbl_financial_parameter;

            -- Fallback in case no data exists
            IF @columns IS NULL SET @columns = YEAR(GETDATE());

            -- Build full year range (from 2014-2015 to max detected year)
            WITH YearList AS (
                SELECT @startYear AS fromYear, @startYear + 1 AS toYear
                UNION ALL
                SELECT fromYear + 1, toYear + 1 FROM YearList WHERE fromYear + 1 <= @columns
            )
            SELECT @columns = STRING_AGG(QUOTENAME('FY' + CAST(fromYear AS VARCHAR) + '-' + CAST(toYear AS VARCHAR)), ', ')
            FROM YearList;

            -- Build and execute dynamic pivot query
            SET @sql = '
                WITH YearlyData AS (
                    SELECT 
                        o.organisation_id,
                        o.organisation_name AS majorPort,
                        tbl.annually_financial_year,
                        SUM(tbl.tonne_liquid_bulk) AS total_tonne_liquid_bulk
                    FROM tbl_financial_parameter tbl
                    JOIN mmt_organisation o ON tbl.organisation_id = o.organisation_id
                    GROUP BY o.organisation_id, o.organisation_name, tbl.annually_financial_year
                ),
                PreparedData AS (
                    SELECT 
                        organisation_id,
                        majorPort,
                        ''FY'' + annually_financial_year AS financial_year,
                        total_tonne_liquid_bulk
                    FROM YearlyData
                )
                SELECT organisation_id, majorPort, ' + @columns + '
                FROM PreparedData
                PIVOT (
                    MAX(total_tonne_liquid_bulk)
                    FOR financial_year IN (' + @columns + ')
                ) AS pvt
                ORDER BY majorPort;
            ';

            EXEC sp_executesql @sql;

        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise RoRoPax traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



export default {
    getKPIMajorPorts_12_1, getKPIMajorPorts_12_2, getKPIMajorPorts_12_3,getKPIMajorPorts_13_1, getKPIMajorPorts_13_2,
    getKPIMajorPorts_13_3,getKPIMajorPorts_14_1,getKPIMajorPorts_14_2, getKPIMajorPorts_14_3,getKPIMajorPorts_15_1, 
    getKPIMajorPorts_15_2, getKPIMajorPorts_15_3,getKPIMajorPorts_16_1, getKPIMajorPorts_16_2, getKPIMajorPorts_16_3,
    getKPIMajorPorts_17_1, getKPIMajorPorts_17_2, getKPIMajorPorts_17_3,

};
