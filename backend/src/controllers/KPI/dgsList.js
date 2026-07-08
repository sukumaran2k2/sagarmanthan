import { pool } from "../../db.js";
import path from 'path';
import fs from 'fs';


async function createDgsKpi2_1_1Data(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const shipAndTonnageTab = JSON.parse(req.body.shipAndTonnageTab);

    const conn = await pool;
    console.log(year, shipAndTonnageTab)
    try {

        for (let p = 0; p < shipAndTonnageTab.length; p++) {
        const type = shipAndTonnageTab[p].type
        let additionApplicationReceived = Number(shipAndTonnageTab[p].additionApplicationReceived) || 0;
        let additionRegisteredShips = Number(shipAndTonnageTab[p].additionRegisteredShips) || 0;
        let additionApplicationPending = Number(shipAndTonnageTab[p].additionApplicationPending) || 0;
        let additionTotalTonnage = Number(shipAndTonnageTab[p].additionTotalTonnage) || 0;

        let deletionApplicationReceived = Number(shipAndTonnageTab[p].deletionApplicationReceived) || 0;
        let deletionRegisteredShips = Number(shipAndTonnageTab[p].deletionRegisteredShips) || 0;
        let deletionApplicationPending = Number(shipAndTonnageTab[p].deletionApplicationPending) || 0;
        let deletionTotalTonnage = Number(shipAndTonnageTab[p].deletionTotalTonnage) || 0;

        // let networthRegisteredShips = Number(shipAndTonnageTab[p].networthRegisteredShips) || 0;
        // let networthTotalTonnage = Number(shipAndTonnageTab[p].networthTotalTonnage) || 0;

        // let cumulativeRegisteredShips = Number(shipAndTonnageTab[p].cumulativeRegisteredShips) || 0;
        // let cumulativeTotalTonnage = Number(shipAndTonnageTab[p].cumulativeTotalTonnage) || 0;

            // console.log(type, 'type')
            // console.log(additionRegisteredShips, 'additionRegisteredShips')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);

            request.input("type", type);

            request.input("additionApplicationReceived", additionApplicationReceived);
            request.input("additionRegisteredShips", additionRegisteredShips);
            request.input("additionApplicationPending", additionApplicationPending);
            request.input("additionTotalTonnage", additionTotalTonnage);
            request.input("deletionApplicationReceived", deletionApplicationReceived);
            request.input("deletionRegisteredShips", deletionRegisteredShips);
            request.input("deletionApplicationPending", deletionApplicationPending);
            request.input("deletionTotalTonnage", deletionTotalTonnage);
            // request.input("networthRegisteredShips", networthRegisteredShips);
            // request.input("networthTotalTonnage", networthTotalTonnage);
            // request.input("cumulativeRegisteredShips", cumulativeRegisteredShips);
            // request.input("cumulativeTotalTonnage", cumulativeTotalTonnage);


            const query = ` IF NOT EXISTS (SELECT tbl_kpi_dgs_2_1.flagging_ship_2_1_id FROM tbl_kpi_dgs_2_1 
                WHERE year = @year and month =  @month and tbl_kpi_dgs_2_1.type = @type)

                BEGIN
                    INSERT INTO tbl_kpi_dgs_2_1 (year, month, type, 
                    addition_application_received, addition_registered_ship, addition_pending_application, addition_total_tonnage,
                    deletion_application_received, deletion_registered_ship, deletion_pending_application, deletion_total_tonnage) 
                    VALUES (@year, @month, @type, @additionApplicationReceived, @additionRegisteredShips, @additionApplicationPending,
                    @additionTotalTonnage, @deletionApplicationReceived, @deletionRegisteredShips, @deletionApplicationPending,
                    @deletionTotalTonnage)
                End

            ELSE
                BEGIN
                    UPDATE tbl_kpi_dgs_2_1
                        SET addition_application_received = @additionApplicationReceived,
                            addition_registered_ship = @additionRegisteredShips,
                            addition_pending_application = @additionApplicationPending,
                            addition_total_tonnage = @additionTotalTonnage,
                            deletion_application_received = @deletionApplicationReceived,
                            deletion_registered_ship = @deletionRegisteredShips,
                            deletion_pending_application = @deletionApplicationPending,
                            deletion_total_tonnage = @deletionTotalTonnage
                          
                        WHERE year = @year AND month = @month AND type = @type;
                END `;

                const result = await request.query(query);
        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// DECLARE @year INT = @inputYear;
//                 DECLARE @month INT = @inputMonth;

//                 DECLARE @numericMonth INT = @month;
//                 DECLARE @numericYear INT = @year;

//                 DECLARE @fyStartYear INT;
//                 DECLARE @fyEndYear INT;
//                 DECLARE @yearEntered INT;

//                 IF @numericMonth >= 4 AND @numericMonth <= 12
//                 BEGIN
//                     SET @fyStartYear = @numericYear;
//                     SET @fyEndYear = @numericYear + 1;
//                     SET @yearEntered = @numericYear;
//                 END
//                 ELSE
//                 BEGIN
//                     SET @fyStartYear = @numericYear - 1;
//                     SET @fyEndYear = @numericYear;
//                     SET @yearEntered = @numericYear + 1;
//                 END

//                 -- Final result query
//                 SELECT 
//                     type,
//                     SUM(addition_registered_ship - deletion_registered_ship) AS cummulativeRegisteredShips,
//                     SUM(addition_total_tonnage - deletion_total_tonnage) AS cummulativeTonnage
//                 FROM tbl_kpi_dgs_2_1
//                 WHERE 
//                 (
//                     (@numericMonth >= 4 AND month >= 4 AND month < @numericMonth AND year = @fyStartYear)
//                     OR
//                     (@numericMonth < 4 AND (
//                         (month >= 4 AND year = @fyStartYear) OR
//                         (month < @numericMonth AND year = @fyEndYear)
//                     ))
//                 )
//                 GROUP BY type;

async function getPreviousCumulativeData(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    console.log(year)
    if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required" });
    }

    const inputYear = parseInt(year);   
    const inputMonth = parseInt(month); 

    const conn = await pool;

    const request = conn.request();

    request.input("inputYear", inputYear);
    request.input("inputMonth", inputMonth);

    
    try {  

        const query = (`DECLARE @year INT = @inputYear;
            DECLARE @month INT = @inputMonth;

            DECLARE @cutoffYear INT;
            DECLARE @cutoffMonth INT;

            -- Determine cutoff point (month before selected)
            IF @month = 1
            BEGIN
                SET @cutoffMonth = 12;
                SET @cutoffYear = @year - 1;
            END
            ELSE
            BEGIN
                SET @cutoffMonth = @month - 1;
                SET @cutoffYear = @year;
            END

            -- Final result: cumulative data from start up to (but not including) selected month
            SELECT 
                type,
                SUM(addition_registered_ship - deletion_registered_ship) AS cummulativeRegisteredShips,
                SUM(addition_total_tonnage - deletion_total_tonnage) AS cummulativeTonnage
            FROM tbl_kpi_dgs_2_1
            WHERE 
                (year < @cutoffYear)
                OR 
                (year = @cutoffYear AND month <= @cutoffMonth)
            GROUP BY type;

 
                `)
                const result = await request.query(query);
                console.log("END", result, result.recordset);

        const data = {};
        for (let row of result.recordset) {
            data[row.type] = {
                cummulativeRegisteredShips: row.cummulativeRegisteredShips ?? 0,
                cummulativeTonnage: row.cummulativeTonnage ?? 0
            };
        }

        return res.json(data);
    } catch (err) {
        console.error('Error fetching cumulative data:', err);
        return res.status(500).json({ message: "Server error" });
    }
};

async function getKpi2_1_List(req, res) {
    const conn = await pool;
    // const userID = req.params.userID;

    try {
        // const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        // const { role_id } = userResult.recordset[0];

    //     SELECT 
    //     [year],
    //     [month],

    //     -- Sum of Addition of Ships & Tonnage
    //     SUM([addition_application_received]) AS addition_application_received,
    //     SUM([addition_registered_ship]) AS addition_registered_ship,
    //     (SUM([addition_application_received]) - SUM([addition_registered_ship])) AS addition_pending_application,

    //     SUM([addition_total_tonnage]) AS addition_total_tonnage,

    //     -- Sum of Deletion of Ships & Tonnage
    //     SUM([deletion_application_received]) AS deletion_application_received,
    //     SUM([deletion_registered_ship]) AS deletion_registered_ship,
    //     (SUM([deletion_application_received]) - SUM([deletion_registered_ship])) AS deletion_pending_application,
    //     SUM([deletion_total_tonnage]) AS deletion_total_tonnage,

    //     -- Net Worth Calculated Dynamically
    //     (SUM([addition_registered_ship]) - SUM([deletion_registered_ship])) AS networth_registered_ship,
    //     (SUM([addition_total_tonnage]) - SUM([deletion_total_tonnage])) AS networth_total_tonnage,

    //     -- Sum of Cumulative Active Ships & Tonnage
    //     SUM([cumulative_registered_ship]) AS cumulative_registered_ship,
    //     SUM([cumulative_total_tonnage]) AS cumulative_total_tonnage

    // FROM 
    //     [sagarmanthan_revamp].[dbo].[tbl_kpi_dgs_2_1]
    // GROUP BY 
    //     [year], [month]
    // ORDER BY 
    //     [year] DESC, [month] DESC;

        const result = await conn.query(` WITH MonthlyData AS (
            SELECT 
                [year],
                [month],

                -- Monthly sums
                SUM([addition_application_received]) AS addition_application_received,
                SUM([addition_registered_ship]) AS addition_registered_ship,
                SUM([addition_total_tonnage]) AS addition_total_tonnage,
                SUM([deletion_application_received]) AS deletion_application_received,
                SUM([deletion_registered_ship]) AS deletion_registered_ship,
                SUM([deletion_total_tonnage]) AS deletion_total_tonnage
            FROM tbl_kpi_dgs_2_1
            GROUP BY [year], [month]
        )

        SELECT 
            [year],
            [month],

            -- Monthly fields
            addition_application_received,
            addition_registered_ship,
            (addition_application_received - addition_registered_ship) AS addition_pending_application,

            addition_total_tonnage,

            deletion_application_received,
            deletion_registered_ship,
            (deletion_application_received - deletion_registered_ship) AS deletion_pending_application,

            deletion_total_tonnage,

            -- Net values
            (addition_registered_ship - deletion_registered_ship) AS networth_registered_ship,
            (addition_total_tonnage - deletion_total_tonnage) AS networth_total_tonnage,

            -- ✅ Row-wise cumulative totals
            SUM(addition_registered_ship - deletion_registered_ship) OVER (
                ORDER BY year, month
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_registered_ship,

            SUM(addition_total_tonnage - deletion_total_tonnage) OVER (
                ORDER BY year, month
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_total_tonnage

        FROM MonthlyData
        ORDER BY [year] DESC, [month] DESC;


          
        ;`);

        res.json(result.recordset);
        // }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateMmd_2_1Data(req, res) {
    const year = req.params.year;
    const month = req.params.month;


    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    // SELECT * FROM tbl_kpi_dgs_2_1 
    // WHERE year = @year AND month = @month;



    // DECLARE @selectedYear INT = CAST(@year AS INT);
    // DECLARE @selectedMonth INT = CAST(@month AS INT);

    // -- Main data for selected year and month
    // WITH CurrentMonthData AS (
    //     SELECT
    //         flagging_ship_2_1_id,
    //         year,
    //         month,
    //         type,
    //         addition_application_received,
    //         addition_registered_ship,
    //         (addition_application_received - addition_registered_ship) AS addition_pending_application,
    //         addition_total_tonnage,

    //         deletion_application_received,
    //         deletion_registered_ship,
    //         (deletion_application_received - deletion_registered_ship) AS deletion_pending_application,
    //         deletion_total_tonnage,

    //         (addition_registered_ship - deletion_registered_ship) AS networth_registered_ship,
    //         (addition_total_tonnage - deletion_total_tonnage) AS networth_total_tonnage
    //     FROM tbl_kpi_dgs_2_1
    //     WHERE year = @selectedYear AND month = @selectedMonth
    // ),

    // -- Cumulative data up to previous month
    // CumulativeData AS (
    //     SELECT 
    //         type,
    //         SUM(addition_registered_ship - deletion_registered_ship) AS cumulative_registered_ship,
    //         SUM(addition_total_tonnage - deletion_total_tonnage) AS cumulative_total_tonnage
    //     FROM tbl_kpi_dgs_2_1
    //     WHERE 
    //     (year < @selectedYear OR (year = @selectedYear AND month = @selectedMonth))
    //     -- (year < @selectedYear OR (year = @selectedYear AND month < @selectedMonth))
    //     GROUP BY type
    // )

    // -- Join current and cumulative
    // SELECT 
    //     c.flagging_ship_2_1_id,
    //     c.year,
    //     c.month,
    //     c.type,
    //     c.addition_application_received,
    //     c.addition_registered_ship,
    //     c.addition_pending_application,
    //     c.addition_total_tonnage,
    //     c.deletion_application_received,
    //     c.deletion_registered_ship,
    //     c.deletion_pending_application,
    //     c.deletion_total_tonnage,
    //     c.networth_registered_ship,
    //     c.networth_total_tonnage,
    //     ISNULL(cd.cumulative_registered_ship, 0) AS cumulative_registered_ship,
    //     ISNULL(cd.cumulative_total_tonnage, 0) AS cumulative_total_tonnage
    // FROM CurrentMonthData c
    // LEFT JOIN CumulativeData cd ON c.type = cd.type
    // ORDER BY c.flagging_ship_2_1_id;


    try {
        const result = await request.query(`
        DECLARE @selectedYear INT = CAST(@year AS INT);
DECLARE @selectedMonth INT = CAST(@month AS INT);

-- Main data for selected year and month
WITH AllData AS (
    SELECT
        flagging_ship_2_1_id,
        year,
        month,
        type,
        addition_application_received,
        addition_registered_ship,
        (addition_application_received - addition_registered_ship) AS addition_pending_application,
        addition_total_tonnage,

        deletion_application_received,
        deletion_registered_ship,
        (deletion_application_received - deletion_registered_ship) AS deletion_pending_application,
        deletion_total_tonnage,

        (addition_registered_ship - deletion_registered_ship) AS networth_registered_ship,
        (addition_total_tonnage - deletion_total_tonnage) AS networth_total_tonnage
    FROM tbl_kpi_dgs_2_1
),
CumulativeData AS (
    SELECT
        *,
        SUM(addition_registered_ship - deletion_registered_ship) OVER (
            PARTITION BY type
            ORDER BY year, month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_registered_ship,

        SUM(addition_total_tonnage - deletion_total_tonnage) OVER (
            PARTITION BY type
            ORDER BY year, month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_total_tonnage
    FROM AllData
),
FinalData AS (
    SELECT * 
    FROM CumulativeData 
    WHERE year = @selectedYear AND month = @selectedMonth
)
SELECT 
    flagging_ship_2_1_id,
    year,
    month,
    type,
    addition_application_received,
    addition_registered_ship,
    addition_pending_application,
    addition_total_tonnage,
    deletion_application_received,
    deletion_registered_ship,
    deletion_pending_application,
    deletion_total_tonnage,
    networth_registered_ship,
    networth_total_tonnage,
    cumulative_registered_ship,
    cumulative_total_tonnage
FROM FinalData
ORDER BY flagging_ship_2_1_id;

            `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_1Data(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const shipAndTonnageTab = JSON.parse(req.body.shipAndTonnageTab);

    const conn = await pool;
    console.log(year, shipAndTonnageTab)
    try {

        for (let p = 0; p < shipAndTonnageTab.length; p++) {
            const type = shipAndTonnageTab[p].type
            let additionApplicationReceived = shipAndTonnageTab[p].additionApplicationReceived
            let additionRegisteredShips = shipAndTonnageTab[p].additionRegisteredShips
            let additionApplicationPending = shipAndTonnageTab[p].additionApplicationPending
            let additionTotalTonnage = shipAndTonnageTab[p].additionTotalTonnage

            let deletionApplicationReceived = shipAndTonnageTab[p].deletionApplicationReceived
            let deletionRegisteredShips = shipAndTonnageTab[p].deletionRegisteredShips
            let deletionApplicationPending = shipAndTonnageTab[p].deletionApplicationPending
            let deletionTotalTonnage = shipAndTonnageTab[p].deletionTotalTonnage

            let networthRegisteredShips = shipAndTonnageTab[p].networthRegisteredShips
            let networthTotalTonnage = shipAndTonnageTab[p].networthTotalTonnage

            let cumulativeRegisteredShips = shipAndTonnageTab[p].cumulativeRegisteredShips
            let cumulativeTotalTonnage = shipAndTonnageTab[p].cumulativeTotalTonnage

            // console.log(type, 'type')
            // console.log(additionRegisteredShips, 'additionRegisteredShips')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);

            request.input("type", type);

            request.input("additionApplicationReceived", additionApplicationReceived);
            request.input("additionRegisteredShips", additionRegisteredShips);
            request.input("additionApplicationPending", additionApplicationPending);
            request.input("additionTotalTonnage", additionTotalTonnage);
            request.input("deletionApplicationReceived", deletionApplicationReceived);

            request.input("deletionRegisteredShips", deletionRegisteredShips);
            request.input("deletionTotalTonnage", deletionTotalTonnage);
            request.input("deletionApplicationPending", deletionApplicationPending);

            request.input("networthRegisteredShips", networthRegisteredShips);
            request.input("networthTotalTonnage", networthTotalTonnage);
        
            request.input("cumulativeRegisteredShips", cumulativeRegisteredShips);
            request.input("cumulativeTotalTonnage", cumulativeTotalTonnage);


            const result = await request.query(`UPDATE tbl_kpi_dgs_2_1
                SET addition_application_received = @additionApplicationReceived,
                    addition_registered_ship = @additionRegisteredShips,
                    addition_pending_application = @additionApplicationPending,
                    addition_total_tonnage = @additionTotalTonnage,
                    deletion_application_received = @deletionApplicationReceived,
                    deletion_registered_ship = @deletionRegisteredShips,
                    deletion_pending_application = @deletionApplicationPending,
                    deletion_total_tonnage = @deletionTotalTonnage
                   
                WHERE year = @year AND month = @month AND type = @type;`);

            console.log(result, "result")

        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// --------------------------------------------------------- 2.6 ---------------------------------------------------------------

async function getKpi2_6_1_List(req, res) {
    const conn = await pool;  

    try 
    {       
        const result = await conn.query(`SELECT mmd_year, mmd_month, tbl_kpi_dgs_2_6_1.mmd_id, 
                mmt_mmd_name.mmd_name, SUM(mmd_ship_inspected) as mmd_ship_inspected
                FROM tbl_kpi_dgs_2_6_1
                INNER JOIN mmt_mmd_name ON mmt_mmd_name.mmd_id = tbl_kpi_dgs_2_6_1.mmd_id

                GROUP BY mmd_year, mmd_month, tbl_kpi_dgs_2_6_1.mmd_id, mmt_mmd_name.mmd_name
                ORDER BY mmd_year DESC,  
                CASE 
                    WHEN mmd_month = '1' THEN 1
                    WHEN mmd_month = '2' THEN 2
                    WHEN mmd_month = '3' THEN 3
                    WHEN mmd_month = '4' THEN 4
                    WHEN mmd_month = '5' THEN 5
                    WHEN mmd_month = '6' THEN 6
                    WHEN mmd_month = '7' THEN 7
                    WHEN mmd_month = '8' THEN 8
                    WHEN mmd_month = '9' THEN 9
                    WHEN mmd_month = '10' THEN 10
                    WHEN mmd_month = '11' THEN 11
                    WHEN mmd_month = '12' THEN 12
                END DESC;
                `);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateMmd_2_6_1Data(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    const mmdId = req.params.mmdId;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("mmdId", mmdId);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_6_1
            WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdId

         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_6_1Data(req, res) 
{
    const year = req.body.year;
    const month = req.body.month;
    const mmdName = req.body.mmdName;
    const shipsInspected = req.body.shipsInspected;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);
    request.input("shipsInspected", shipsInspected);

    try {
        const result = await request.query(`UPDATE tbl_kpi_dgs_2_6_1 SET mmd_ship_inspected = @shipsInspected     
                WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName        
        `);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteDgsKpi2_6_1Data(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const mmdName = req.params.mmdId;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);

  
    try {
        const result = await request.query(`
            DELETE FROM tbl_kpi_dgs_2_6_1  WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName;
                 
        `);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


// ----------------------------------------------------------- 2.6.2 -----------------------------------------------------------
async function getKpi2_6_2_List(req, res) {
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT year, month, 
               SUM(COALESCE(upto_5_years_inspection, 0) + COALESCE(upto_5_years_detentions, 0) + COALESCE(upto_5_years_deficiencies, 0)
                + COALESCE(upto_5_years_nil_deficiencies, 0) ) AS uptoFiveYears,
               
                SUM(COALESCE(above_5to15_years_inspection, 0) + COALESCE(above_5to15_years_detentions, 0) + COALESCE(above_5to15_years_deficiencies, 0) 
                + COALESCE(above_5to15_years_nil_deficiencies, 0) ) AS fiveToFifteenYears,
              
                SUM(COALESCE(above_16to25_years_inspection, 0) + COALESCE(above_16to25_years_detentions, 0) + COALESCE(above_16to25_years_deficiencies, 0)
                + COALESCE(above_16to25_years_nil_deficiencies, 0) ) AS sixteenToTwentyFiveYears,

                SUM(COALESCE(above_25_years_inspection, 0) + COALESCE(above_25_years_detentions, 0) + COALESCE(above_25_years_deficiencies, 0)
                + COALESCE(above_25_years_nil_deficiencies, 0) ) AS aboveTwentyFiveYears

                FROM tbl_kpi_dgs_2_6_2
                GROUP BY year, month  
                ORDER BY year DESC,  
                CASE 
                    WHEN month = '1' THEN 1
                    WHEN month = '2' THEN 2
                    WHEN month = '3' THEN 3
                    WHEN month = '4' THEN 4
                    WHEN month = '5' THEN 5
                    WHEN month = '6' THEN 6
                    WHEN month = '7' THEN 7
                    WHEN month = '8' THEN 8
                    WHEN month = '9' THEN 9
                    WHEN month = '10' THEN 10
                    WHEN month = '11' THEN 11
                    WHEN month = '12' THEN 12
                END DESC; 
        ;`);

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdate_2_6_2Data(req, res) {
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_6_2 
            WHERE year = @year AND month = @month;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_6_2Data(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const flagStateInspectionTab = JSON.parse(req.body.flagStateInspectionTab);

    const conn = await pool;

    // console.log(year, flagStateInspectionTab)
    try {

        for (let p = 0; p < flagStateInspectionTab.length; p++) {
            // let status	    = flagStateInspectionTab[p]["status"]  
            const shipType = flagStateInspectionTab[p].shipType

            let upto5YrsInspection = flagStateInspectionTab[p].upto5YrsInspection
            let upto5YrsDetentions = flagStateInspectionTab[p].upto5YrsDetentions
            let upto5YrsDeficiencies = flagStateInspectionTab[p].upto5YrsDeficiencies
            let upto5YrsNilDeficiencies = flagStateInspectionTab[p].upto5YrsNilDeficiencies

            let upto5to15YrsInspection = flagStateInspectionTab[p].upto5to15YrsInspection
            let upto5to15YrsDetentions = flagStateInspectionTab[p].upto5to15YrsDetentions
            let upto5to15YrsDeficiencies = flagStateInspectionTab[p].upto5to15YrsDeficiencies
            let upto5to15YrsNilDeficiencies = flagStateInspectionTab[p].upto5to15YrsNilDeficiencies

            let upto16to25YrsInspection = flagStateInspectionTab[p].upto16to25YrsInspection
            let upto16to25YrsDetentions = flagStateInspectionTab[p].upto16to25YrsDetentions
            let upto16to25YrsDeficiencies = flagStateInspectionTab[p].upto16to25YrsDeficiencies
            let upto16to25YrsNilDeficiencies = flagStateInspectionTab[p].upto16to25YrsNilDeficiencies

            let above25YrsInspection = flagStateInspectionTab[p].above25YrsInspection
            let above25YrsDetentions = flagStateInspectionTab[p].above25YrsDetentions
            let above25YrsDeficiencies = flagStateInspectionTab[p].above25YrsDeficiencies
            let above25YrsNilDeficiencies = flagStateInspectionTab[p].above25YrsNilDeficiencies

            // console.log(shipType, 'shipType')
            // console.log(upto5YrsDetentions, 'upto5YrsDetentions')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);

            request.input("shipType", shipType);

            request.input("upto5YrsInspection", upto5YrsInspection);
            request.input("upto5YrsDetentions", upto5YrsDetentions);
            request.input("upto5YrsDeficiencies", upto5YrsDeficiencies);
            request.input("upto5YrsNilDeficiencies", upto5YrsNilDeficiencies);

            request.input("upto5to15YrsInspection", upto5to15YrsInspection);
            request.input("upto5to15YrsDetentions", upto5to15YrsDetentions);
            request.input("upto5to15YrsDeficiencies", upto5to15YrsDeficiencies);
            request.input("upto5to15YrsNilDeficiencies", upto5to15YrsNilDeficiencies);

            request.input("upto16to25YrsInspection", upto16to25YrsInspection);
            request.input("upto16to25YrsDetentions", upto16to25YrsDetentions);
            request.input("upto16to25YrsDeficiencies", upto16to25YrsDeficiencies);
            request.input("upto16to25YrsNilDeficiencies", upto16to25YrsNilDeficiencies);

            request.input("above25YrsInspection", above25YrsInspection);
            request.input("above25YrsDetentions", above25YrsDetentions);
            request.input("above25YrsDeficiencies", above25YrsDeficiencies);
            request.input("above25YrsNilDeficiencies", above25YrsNilDeficiencies);

            const result = await request.query(`
                UPDATE tbl_kpi_dgs_2_6_2
                SET 
                    upto_5_years_inspection = @upto5YrsInspection,
                    upto_5_years_detentions = @upto5YrsDetentions,
                    upto_5_years_deficiencies = @upto5YrsDeficiencies,
                    upto_5_years_nil_deficiencies = @upto5YrsNilDeficiencies,
                    above_5to15_years_inspection = @upto5to15YrsInspection,
                    above_5to15_years_detentions = @upto5to15YrsDetentions,
                    above_5to15_years_deficiencies = @upto5to15YrsDeficiencies,
                    above_5to15_years_nil_deficiencies = @upto5to15YrsNilDeficiencies,
                    above_16to25_years_inspection = @upto16to25YrsInspection,
                    above_16to25_years_detentions = @upto16to25YrsDetentions,
                    above_16to25_years_deficiencies = @upto16to25YrsDeficiencies,
                    above_16to25_years_nil_deficiencies = @upto16to25YrsNilDeficiencies,
                    above_25_years_inspection = @above25YrsInspection,
                    above_25_years_detentions = @above25YrsDetentions,
                    above_25_years_deficiencies = @above25YrsDeficiencies,
                    above_25_years_nil_deficiencies = @above25YrsNilDeficiencies
                WHERE 
                    year = @year AND month = @month
                    AND ship_type = @shipType; 
            `);


        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteDgsKpi2_6_2Data(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
  
    try {
        const result = await request.query(`
            DELETE FROM tbl_kpi_dgs_2_6_2 WHERE year = @year AND month = @month;        
        `);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ----------------------------------------------------------- 2.7.1 -----------------------------------------------------------

async function getKpi2_7_1_List(req, res) {
    const conn = await pool;
    // const userID = req.params.userID;

    try {
        const result = await conn.query(`SELECT mmd_year, mmd_month, tbl_kpi_dgs_2_7_1.mmd_id, 
                mmt_mmd_name.mmd_name, SUM(mmd_ship_inspected) AS mmd_ship_inspected
                FROM tbl_kpi_dgs_2_7_1
                INNER JOIN mmt_mmd_name ON mmt_mmd_name.mmd_id = tbl_kpi_dgs_2_7_1.mmd_id

                GROUP BY mmd_year, mmd_month, tbl_kpi_dgs_2_7_1.mmd_id, mmt_mmd_name.mmd_name
                ORDER BY mmd_year DESC,  
                CASE 
                    WHEN mmd_month = '1' THEN 1
                    WHEN mmd_month = '2' THEN 2
                    WHEN mmd_month = '3' THEN 3
                    WHEN mmd_month = '4' THEN 4
                    WHEN mmd_month = '5' THEN 5
                    WHEN mmd_month = '6' THEN 6
                    WHEN mmd_month = '7' THEN 7
                    WHEN mmd_month = '8' THEN 8
                    WHEN mmd_month = '9' THEN 9
                    WHEN mmd_month = '10' THEN 10
                    WHEN mmd_month = '11' THEN 11
                    WHEN mmd_month = '12' THEN 12
                END DESC;
          
        ;`);

        res.json(result.recordset);
        // }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateMmd_2_7_1Data(req, res)
{  
    const year = req.params.year;
    const month = req.params.month;
    const mmdId = req.params.mmdId;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("mmdId", mmdId);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_7_1
            WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdId

         `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_7_1Data(req, res) 
{   
    const year = req.body.year;
    const month = req.body.month;
    const mmdName = req.body.mmdName;
    const shipsInspected = req.body.shipsInspected;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);
    request.input("shipsInspected", shipsInspected);

    try {
            const result = await request.query(`UPDATE tbl_kpi_dgs_2_7_1 SET mmd_ship_inspected = @shipsInspected     
                WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName        
            `);

        // const kpi_dgs_ports_id = result.recordset[0].kpi_dgs_ports_id;
        // res.json(result.recordset);
        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function deleteMmd_2_7_1Data(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const mmdName = req.params.mmdId;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);

    try {
        const result = await request.query(`DELETE FROM tbl_kpi_dgs_2_7_1 
            WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName;
                 
        `);
        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ----------------------------------------------------------- 2.7.2 -----------------------------------------------------------
async function getKpi2_7_2_List(req, res) {
    const conn = await pool;
    try {
      
        const result = await conn.query(`SELECT year, month, 
            SUM(COALESCE(upto_10_years_inspection, 0) + COALESCE(upto_10_years_detentions, 0) + COALESCE(upto_10_years_deficiencies, 0)
                + COALESCE(upto_10_years_nil_deficiencies, 0) ) AS uptoTenYears,
                SUM(COALESCE(above_10to20_years_inspection, 0) + COALESCE(above_10to20_years_detentions, 0) + COALESCE(above_10to20_years_deficiencies, 0) 
                + COALESCE(above_10to20_years_nil_deficiencies, 0) ) AS belowTwentyYears,
                SUM(COALESCE(above_20_years_inspection, 0) + COALESCE(above_20_years_detentions, 0) + COALESCE(above_20_years_deficiencies, 0)
                + COALESCE(above_20_years_nil_deficiencies, 0) ) AS aboveTwentyYears

                FROM tbl_kpi_dgs_2_7_2
                GROUP BY year, month    
                ORDER BY year DESC,  
                CASE 
                    WHEN month = '1' THEN 1
                    WHEN month = '2' THEN 2
                    WHEN month = '3' THEN 3
                    WHEN month = '4' THEN 4
                    WHEN month = '5' THEN 5
                    WHEN month = '6' THEN 6
                    WHEN month = '7' THEN 7
                    WHEN month = '8' THEN 8
                    WHEN month = '9' THEN 9
                    WHEN month = '10' THEN 10
                    WHEN month = '11' THEN 11
                    WHEN month = '12' THEN 12
                END DESC;

                  
        ;`);

        res.json(result.recordset);
 
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdate_2_7_2Data(req, res) {
    const year = req.params.year;
    const month = req.params.month;


    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_7_2 
            WHERE year = @year AND month = @month;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editDgsKpi2_7_2Data(req, res) {
    const year = req.body.year;
    const month = req.body.month;
    const portStateInspectionTab = JSON.parse(req.body.portStateInspectionTab);

    const conn = await pool;

    console.log(year, portStateInspectionTab)

    try {
        var total10YrsInspection = 0, total10to20YrsInspection = 0, total20YrsInspection = 0;
        var total10YrsDetentions = 0, total10to20YrsDetentions = 0, total20YrsDetentions = 0;

        for (let p = 0; p < portStateInspectionTab.length; p++) {
            // let status	    = portStateInspectionTab[p]["status"]  
            const shipType = portStateInspectionTab[p].shipType

            let upto10YrsInspection = portStateInspectionTab[p].upto10YrsInspection
            let upto10YrsDetentions = portStateInspectionTab[p].upto10YrsDetentions
            let upto10YrsDeficiencies = portStateInspectionTab[p].upto10YrsDeficiencies
            let upto10YrsNilDeficiencies = portStateInspectionTab[p].upto10YrsNilDeficiencies

            let upto10to20YrsInspection = portStateInspectionTab[p].upto10to20YrsInspection
            let upto10to20YrsDetentions = portStateInspectionTab[p].upto10to20YrsDetentions
            let upto10to20YrsDeficiencies = portStateInspectionTab[p].upto10to20YrsDeficiencies
            let upto10to20YrsNilDeficiencies = portStateInspectionTab[p].upto10to20YrsNilDeficiencies

            let above20YrsInspection = portStateInspectionTab[p].above20YrsInspection
            let above20YrsDetentions = portStateInspectionTab[p].above20YrsDetentions
            let above20YrsDeficiencies = portStateInspectionTab[p].above20YrsDeficiencies
            let above20YrsNilDeficiencies = portStateInspectionTab[p].above20YrsNilDeficiencies

            // console.log(shipType, 'shipType')
            // console.log(upto10YrsDetentions, 'upto10YrsDetentions')

            const request = conn.request();
            request.input("year", year);
            request.input("month", month);

            request.input("shipType", shipType);
            request.input("upto10YrsInspection", upto10YrsInspection);
            request.input("upto10YrsDetentions", upto10YrsDetentions);
            request.input("upto10YrsDeficiencies", upto10YrsDeficiencies);
            request.input("upto10YrsNilDeficiencies", upto10YrsNilDeficiencies);

            request.input("upto10to20YrsInspection", upto10to20YrsInspection);
            request.input("upto10to20YrsDetentions", upto10to20YrsDetentions);
            request.input("upto10to20YrsDeficiencies", upto10to20YrsDeficiencies);
            request.input("upto10to20YrsNilDeficiencies", upto10to20YrsNilDeficiencies);

            request.input("above20YrsInspection", above20YrsInspection);
            request.input("above20YrsDetentions", above20YrsDetentions);
            request.input("above20YrsDeficiencies", above20YrsDeficiencies);
            request.input("above20YrsNilDeficiencies", above20YrsNilDeficiencies);

            // console.log(upto10YrsInspection, "upto10YrsInspection", typeof(upto10YrsInspection))
            total10YrsInspection += upto10YrsInspection != null ? parseInt (upto10YrsInspection) : 0;
            total10to20YrsInspection += upto10to20YrsInspection != null ? parseInt (upto10to20YrsInspection) : 0;
            total20YrsInspection += above20YrsInspection != null ? parseInt (above20YrsInspection) : 0;
            total10YrsDetentions += upto10YrsDetentions != null ? parseInt (upto10YrsDetentions) :0;
            total10to20YrsDetentions += upto10to20YrsDetentions != null ? parseInt (upto10to20YrsDetentions) : 0;
            total20YrsDetentions += above20YrsDetentions != null ? parseInt (above20YrsDetentions) : 0;


            const result = await request.query(`UPDATE tbl_kpi_dgs_2_7_2
                SET 
                    upto_10_years_inspection = @upto10YrsInspection,
                    upto_10_years_detentions = @upto10YrsDetentions,
                    upto_10_years_deficiencies = @upto10YrsDeficiencies,
                    upto_10_years_nil_deficiencies = @upto10YrsNilDeficiencies,
                    above_10to20_years_inspection = @upto10to20YrsInspection,
                    above_10to20_years_detentions = @upto10to20YrsDetentions,
                    above_10to20_years_deficiencies = @upto10to20YrsDeficiencies,
                    above_10to20_years_nil_deficiencies = @upto10to20YrsNilDeficiencies,
                    above_20_years_inspection = @above20YrsInspection,
                    above_20_years_detentions = @above20YrsDetentions,
                    above_20_years_deficiencies = @above20YrsDeficiencies,
                    above_20_years_nil_deficiencies = @above20YrsNilDeficiencies
                WHERE 
                    year = @year AND 
                    month = @month AND 
                    ship_type = @shipType;`);

            // console.log(result, "result")
        }
        const totalInspection = ( (total10YrsInspection) + (total10to20YrsInspection) + (total20YrsInspection));
        const totalDetention =  ( (total10YrsDetentions) + (total10to20YrsDetentions) + (total20YrsDetentions));

        const request = conn.request();
        request.input('year', year);
        request.input('month', month);
        request.input('totalInspection',totalInspection );
        request.input('totalDetention',totalDetention );

        const query1 = (`UPDATE tbl_kpi_dgs_2_7_2_total SET total_no_of_inspection = @totalInspection, 
            total_no_of_detention = @totalDetention  
            WHERE  year = @year AND month = @month `);
        const result1 = await request.query(query1);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function deleteDgsKpi2_7_2Data(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
  
    try {
        const result = await request.query(`
            DELETE FROM tbl_kpi_dgs_2_7_2 WHERE year = @year AND month = @month;        
        `);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { createDgsKpi2_1_1Data, getPreviousCumulativeData, getKpi2_1_List, getUpdateMmd_2_1Data, editDgsKpi2_1Data,
    getKpi2_6_1_List, getUpdateMmd_2_6_1Data, editDgsKpi2_6_1Data, deleteDgsKpi2_6_1Data, getKpi2_6_2_List, getUpdate_2_6_2Data,
    editDgsKpi2_6_2Data, deleteDgsKpi2_6_2Data, getKpi2_7_1_List, getUpdateMmd_2_7_1Data, editDgsKpi2_7_1Data, 
    deleteMmd_2_7_1Data, getKpi2_7_2_List, getUpdate_2_7_2Data, editDgsKpi2_7_2Data, deleteDgsKpi2_7_2Data
};