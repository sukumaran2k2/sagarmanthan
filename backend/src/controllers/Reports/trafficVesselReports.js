import { pool } from "../../db.js";

async function getVesselTraffic_k_1_10_1_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        const query = `
        WITH LastFiscalYearData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        )
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS lastFiscalZ1,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        )
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS lastFiscalX1,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND month = @prevMonth 
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS lastFiscalY1
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
        ),
        CurrentFiscalYearData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        )
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS currentFiscalZ2,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        )
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS currentFiscalX2,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND month = @prevMonth 
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS currentFiscalY2
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        MonthlyData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN month = @prevMonth AND fiscal_year = @currentFiscalYear 
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS prevMonthData,
        
                NULLIF(SUM(CASE 
                    WHEN month = @prevMonth - 1 AND fiscal_year = @currentFiscalYear 
                    THEN total_cruise_vessel_domestic + total_cruise_vessel_international 
                    ELSE 0 
                END), 0) AS prevPrevMonthData
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        LastFiscalYearTarget AS (
            SELECT 
                organisation_id, 
                NULLIF(target_cruise_vessel_calls, 0) AS lastFiscalYearTarget
            FROM tbl_traffic_vessel_target
            WHERE fiscal_year = @lastFiscalYear
        ),
        CurrentFiscalYearTarget AS (
            SELECT 
                organisation_id, 
                NULLIF(target_cruise_vessel_calls, 0) AS currentFiscalYearTarget
            FROM tbl_traffic_vessel_target
            WHERE fiscal_year = @currentFiscalYear
        ),
        RankedData AS (
            SELECT 
                o.organisation_id,
                o.organisation_name AS port,
                t1.lastFiscalYearTarget,
                t2.currentFiscalYearTarget,
                lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,
                @lastFiscalYear AS lastFiscalYear,
        
                -- MoM Growth Calculation
                CASE 
                    WHEN m.prevPrevMonthData > 0 
                    THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                    ELSE NULL
                END AS momGrowth,
        
                -- YoY Growth Calculation
                CASE 
                    WHEN lfy.lastFiscalZ1 > 0 
                    THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowth,
        
                -- DENSE_RANK for proper ranking with ties
                DENSE_RANK() OVER (
                    ORDER BY 
                        CASE 
                            WHEN lfy.lastFiscalZ1 > 0 
                            THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1)
                            ELSE NULL
                        END DESC
                ) AS ranking
            FROM (
                SELECT DISTINCT organisation_id 
                FROM tbl_traffic_vessel 
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
                UNION
                SELECT DISTINCT organisation_id 
                FROM tbl_traffic_vessel_target 
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
            ) t
            LEFT JOIN LastFiscalYearData lfy ON t.organisation_id = lfy.organisation_id
            LEFT JOIN CurrentFiscalYearData cfy ON t.organisation_id = cfy.organisation_id
            LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
            LEFT JOIN LastFiscalYearTarget t1 ON t.organisation_id = t1.organisation_id
            LEFT JOIN CurrentFiscalYearTarget t2 ON t.organisation_id = t2.organisation_id
            LEFT JOIN mmt_organisation o ON t.organisation_id = o.organisation_id
        )
        SELECT * 
        FROM RankedData
        WHERE 
            lastFiscalZ1 IS NOT NULL
            OR currentFiscalZ2 IS NOT NULL
            OR lastFiscalYearTarget IS NOT NULL
            OR currentFiscalYearTarget IS NOT NULL
        ORDER BY ranking ASC;
        `;
        

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}




async function getVesselTraffic_k_1_10_2_Report(req, res) {
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
                fiscal_year,
                month,
                SUM(total_cruise_vessel_domestic + total_cruise_vessel_international) AS total_traffic
            FROM tbl_traffic_vessel
            GROUP BY organisation_id, fiscal_year, month
        ),
        PivotedData AS (
            SELECT 
                o.organisation_id,
                o.organisation_name AS majorPort,
                m.fiscal_year,
                SUM(CASE WHEN m.month = 4 THEN m.total_traffic END) AS April,
                SUM(CASE WHEN m.month = 5 THEN m.total_traffic END) AS May,
                SUM(CASE WHEN m.month = 6 THEN m.total_traffic END) AS June,
                SUM(CASE WHEN m.month = 7 THEN m.total_traffic END) AS July,
                SUM(CASE WHEN m.month = 8 THEN m.total_traffic END) AS August,
                SUM(CASE WHEN m.month = 9 THEN m.total_traffic END) AS September,
                SUM(CASE WHEN m.month = 10 THEN m.total_traffic END) AS October,
                SUM(CASE WHEN m.month = 11 THEN m.total_traffic END) AS November,
                SUM(CASE WHEN m.month = 12 THEN m.total_traffic END) AS December,
                SUM(CASE WHEN m.month = 1 THEN m.total_traffic END) AS January,
                SUM(CASE WHEN m.month = 2 THEN m.total_traffic END) AS February,
                SUM(CASE WHEN m.month = 3 THEN m.total_traffic END) AS March
            FROM MonthlyData m
            JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
            GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year
        )
        SELECT * 
        FROM PivotedData
        WHERE 
            COALESCE(April, 0) 
            + COALESCE(May, 0) 
            + COALESCE(June, 0) 
            + COALESCE(July, 0) 
            + COALESCE(August, 0) 
            + COALESCE(September, 0) 
            + COALESCE(October, 0) 
            + COALESCE(November, 0) 
            + COALESCE(December, 0) 
            + COALESCE(January, 0) 
            + COALESCE(February, 0) 
            + COALESCE(March, 0) > 0
        ORDER BY majorPort, fiscal_year DESC;
    `;
    

        const request = conn.request();
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getVesselTraffic_k_1_10_3_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const startYear = 2014;
        const endYear = currentYear + (currentMonth >= 4 ? 1 : 0);

        const fiscalYears = [];
        for (let year = startYear; year < endYear; year++) {
            fiscalYears.push(`${year}-${year + 1}`);
        }

        const fiscalYearConditions = fiscalYears.map(year => {
            return `MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END), 0)`;
        }).join(' + ');

        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    v.fiscal_year,
                    SUM(v.total_cruise_vessel_domestic + v.total_cruise_vessel_international) AS total_traffic
                FROM tbl_traffic_vessel v
                JOIN mmt_organisation o ON v.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, v.fiscal_year
            )
            SELECT 
                organisation_id,
                majorPort,
                ${fiscalYearConditions}
            FROM YearlyData
            GROUP BY organisation_id, majorPort
            HAVING ${fiscalYearSumCondition} > 0
            ORDER BY majorPort;
        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



async function getVesselTraffic_k_1_11_1_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        const query = `
        WITH LastFiscalYearData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        )
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS lastFiscalZ1,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        )
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS lastFiscalX1,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @lastFiscalYear AND month = @prevMonth 
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS lastFiscalY1
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
        ),
        CurrentFiscalYearData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        )
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS currentFiscalZ2,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        )
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS currentFiscalX2,
        
                NULLIF(SUM(CASE 
                    WHEN fiscal_year = @currentFiscalYear AND month = @prevMonth 
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS currentFiscalY2
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        MonthlyData AS (
            SELECT 
                organisation_id,
                NULLIF(SUM(CASE 
                    WHEN month = @prevMonth AND fiscal_year = @currentFiscalYear 
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS prevMonthData,
        
                NULLIF(SUM(CASE 
                    WHEN month = @prevMonth - 1 AND fiscal_year = @currentFiscalYear 
                    THEN total_ferry_calls 
                    ELSE 0 
                END), 0) AS prevPrevMonthData
            FROM tbl_traffic_vessel
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        LastFiscalYearTarget AS (
            SELECT 
                organisation_id, 
                NULLIF(target_ferry_calls, 0) AS lastFiscalYearTarget
            FROM tbl_traffic_vessel_target
            WHERE fiscal_year = @lastFiscalYear
        ),
        CurrentFiscalYearTarget AS (
            SELECT 
                organisation_id, 
                NULLIF(target_ferry_calls, 0) AS currentFiscalYearTarget
            FROM tbl_traffic_vessel_target
            WHERE fiscal_year = @currentFiscalYear
        ),
        RankedData AS (
            SELECT 
                o.organisation_id,
                o.organisation_name AS port,
                t1.lastFiscalYearTarget,
                t2.currentFiscalYearTarget,
                lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,
                @lastFiscalYear AS lastFiscalYear,
        
                -- MoM Growth Calculation
                CASE 
                    WHEN m.prevPrevMonthData > 0 
                    THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                    ELSE NULL
                END AS momGrowth,
        
                -- YoY Growth Calculation
                CASE 
                    WHEN lfy.lastFiscalZ1 > 0 
                    THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowth,
        
                -- DENSE_RANK for proper ranking with ties
                DENSE_RANK() OVER (
                    ORDER BY 
                        CASE 
                            WHEN lfy.lastFiscalZ1 > 0 
                            THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1)
                            ELSE NULL
                        END DESC
                ) AS ranking
            FROM (
                SELECT DISTINCT organisation_id 
                FROM tbl_traffic_vessel 
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
                UNION
                SELECT DISTINCT organisation_id 
                FROM tbl_traffic_vessel_target 
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
            ) t
            LEFT JOIN LastFiscalYearData lfy ON t.organisation_id = lfy.organisation_id
            LEFT JOIN CurrentFiscalYearData cfy ON t.organisation_id = cfy.organisation_id
            LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
            LEFT JOIN LastFiscalYearTarget t1 ON t.organisation_id = t1.organisation_id
            LEFT JOIN CurrentFiscalYearTarget t2 ON t.organisation_id = t2.organisation_id
            LEFT JOIN mmt_organisation o ON t.organisation_id = o.organisation_id
        )
        SELECT * 
        FROM RankedData
        WHERE 
            lastFiscalZ1 IS NOT NULL
            OR currentFiscalZ2 IS NOT NULL
            OR lastFiscalYearTarget IS NOT NULL
            OR currentFiscalYearTarget IS NOT NULL
        ORDER BY ranking ASC;
        `;
        
        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getVesselTraffic_k_1_11_2_Report(req, res) {
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
                fiscal_year,
                month,
                SUM(total_ferry_calls) AS total_traffic
            FROM tbl_traffic_vessel
            GROUP BY organisation_id, fiscal_year, month
        ),
        PivotedData AS (
            SELECT 
                o.organisation_id,
                o.organisation_name AS majorPort,
                m.fiscal_year,
                SUM(CASE WHEN m.month = 4 THEN m.total_traffic END) AS April,
                SUM(CASE WHEN m.month = 5 THEN m.total_traffic END) AS May,
                SUM(CASE WHEN m.month = 6 THEN m.total_traffic END) AS June,
                SUM(CASE WHEN m.month = 7 THEN m.total_traffic END) AS July,
                SUM(CASE WHEN m.month = 8 THEN m.total_traffic END) AS August,
                SUM(CASE WHEN m.month = 9 THEN m.total_traffic END) AS September,
                SUM(CASE WHEN m.month = 10 THEN m.total_traffic END) AS October,
                SUM(CASE WHEN m.month = 11 THEN m.total_traffic END) AS November,
                SUM(CASE WHEN m.month = 12 THEN m.total_traffic END) AS December,
                SUM(CASE WHEN m.month = 1 THEN m.total_traffic END) AS January,
                SUM(CASE WHEN m.month = 2 THEN m.total_traffic END) AS February,
                SUM(CASE WHEN m.month = 3 THEN m.total_traffic END) AS March
            FROM MonthlyData m
            JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
            GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year
        )
        SELECT * 
        FROM PivotedData
        WHERE 
            COALESCE(April, 0) 
            + COALESCE(May, 0) 
            + COALESCE(June, 0) 
            + COALESCE(July, 0) 
            + COALESCE(August, 0) 
            + COALESCE(September, 0) 
            + COALESCE(October, 0) 
            + COALESCE(November, 0) 
            + COALESCE(December, 0) 
            + COALESCE(January, 0) 
            + COALESCE(February, 0) 
            + COALESCE(March, 0) > 0
        ORDER BY majorPort, fiscal_year DESC;
    `;
    

        const request = conn.request();
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getVesselTraffic_k_1_11_3_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const startYear = 2014;
        const endYear = currentYear + (currentMonth >= 4 ? 1 : 0);

        const fiscalYears = [];
        for (let year = startYear; year < endYear; year++) {
            fiscalYears.push(`${year}-${year + 1}`);
        }

        const fiscalYearConditions = fiscalYears.map(year => {
            return `MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END), 0)`;
        }).join(' + ');

        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    v.fiscal_year,
                    SUM(v.total_ferry_calls) AS total_traffic
                FROM tbl_traffic_vessel v
                JOIN mmt_organisation o ON v.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, v.fiscal_year
            )
            SELECT 
                organisation_id,
                majorPort,
                ${fiscalYearConditions}
            FROM YearlyData
            GROUP BY organisation_id, majorPort
            HAVING ${fiscalYearSumCondition} > 0
            ORDER BY majorPort;
        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



export default { getVesselTraffic_k_1_10_1_Report, getVesselTraffic_k_1_10_2_Report, getVesselTraffic_k_1_10_3_Report, getVesselTraffic_k_1_11_1_Report, getVesselTraffic_k_1_11_2_Report, getVesselTraffic_k_1_11_3_Report
 };
