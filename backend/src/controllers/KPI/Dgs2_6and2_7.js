
import { pool } from "../../db.js";




    // console.log(year, shipAndTonnageTab)
    // try {

    //     for (let p = 0; p < shipAndTonnageTab.length; p++) {
    //         const type = shipAndTonnageTab[p].type
    //         let additionApplicationReceived = shipAndTonnageTab[p].additionApplicationReceived
    //         let additionRegisteredShips = shipAndTonnageTab[p].additionRegisteredShips
    //         let additionTotalTonnage = shipAndTonnageTab[p].additionTotalTonnage

    //         let deletionApplicationReceived = shipAndTonnageTab[p].deletionApplicationReceived
    //         let deletionRegisteredShips = shipAndTonnageTab[p].deletionRegisteredShips
    //         let deletionTotalTonnage = shipAndTonnageTab[p].deletionTotalTonnage


    //         let networthRegisteredShips = shipAndTonnageTab[p].networthRegisteredShips
    //         let networthTotalTonnage = shipAndTonnageTab[p].networthTotalTonnage

    //         let cumulativeRegisteredShips = shipAndTonnageTab[p].cumulativeRegisteredShips
    //         let cumulativeTotalTonnage = shipAndTonnageTab[p].cumulativeTotalTonnage

    //         // console.log(type, 'type')
    //         // console.log(additionRegisteredShips, 'additionRegisteredShips')

    //         const request = conn.request();
    //         request.input("year", year);
    //         request.input("month", month);

    //         request.input("type", type);

    //         request.input("additionApplicationReceived", additionApplicationReceived);
    //         request.input("additionRegisteredShips", additionRegisteredShips);
    //         request.input("additionTotalTonnage", additionTotalTonnage);
    //         request.input("deletionApplicationReceived", deletionApplicationReceived);
    //         request.input("deletionRegisteredShips", deletionRegisteredShips);
    //         request.input("deletionTotalTonnage", deletionTotalTonnage);
    //         request.input("networthRegisteredShips", networthRegisteredShips);
    //         request.input("networthTotalTonnage", networthTotalTonnage);
    //         request.input("cumulativeRegisteredShips", cumulativeRegisteredShips);
    //         request.input("cumulativeTotalTonnage", cumulativeTotalTonnage);


    //         const query = ` IF NOT EXISTS (SELECT tbl_kpi_dgs_2_1.flagging_ship_2_1_id FROM tbl_kpi_dgs_2_1 
    //             WHERE year = @year and month =  @month and tbl_kpi_dgs_2_1.type = @type)

    //             BEGIN
    //                 INSERT INTO tbl_kpi_dgs_2_1 (year, month, type, 
    //                 addition_application_received, addition_registered_ship, addition_total_tonnage,
    //                 deletion_application_received, deletion_registered_ship, deletion_total_tonnage, networth_registered_ship,
    //                 networth_total_tonnage, cumulative_registered_ship, cumulative_total_tonnage) 
    //                 VALUES (@year, @month, @type, @additionApplicationReceived, @additionRegisteredShips, @additionTotalTonnage,
    //                 @deletionApplicationReceived, @deletionRegisteredShips, @deletionTotalTonnage,
    //                 @networthRegisteredShips, @networthTotalTonnage,
    //                 @cumulativeRegisteredShips, @cumulativeTotalTonnage)
    //             End

    //         ELSE
    //             BEGIN
    //                 UPDATE tbl_kpi_dgs_2_1
    //                     SET addition_application_received = @additionApplicationReceived,
    //                         addition_registered_ship = @additionRegisteredShips,
    //                         addition_total_tonnage = @additionTotalTonnage,
    //                         deletion_application_received = @deletionApplicationReceived,
    //                         deletion_registered_ship = @deletionRegisteredShips,
    //                         deletion_total_tonnage = @deletionTotalTonnage,
    //                         networth_registered_ship = @networthRegisteredShips,
    //                         networth_total_tonnage = @networthTotalTonnage,                         
    //                         cumulative_registered_ship = @cumulativeRegisteredShips,
    //                         cumulative_total_tonnage = @cumulativeTotalTonnage
    //                     WHERE year = @year AND month = @month AND type = @type;
    //             END `;

    //             const result = await request.query(query);
    //     }
    //     res.sendStatus(201);
    // }
    // catch (err) {
    //     console.log(err);
    //     return res.sendStatus(500);
    // }
// };

//-------------------------------------------------------- 2.6 ----------------------------------------------------------------
async function checkData_2_6_1(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const mmdName = req.params.mmdName;

    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);

    // Check if year, month and mmdName are provided
    if (!year || !month || !mmdName) {
        return res.status(400).json({ message: "Year, month and MMD name are required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_6_1 
            WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName
        `); 
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};

async function createDgsKpi2_6_1Data(req, res) 
{
    const year = req.body.year;
    const month = req.body.month
    const mmdName = req.body.mmdName;
    const shipsInspected = req.body.shipsInspected;

    const conn = await pool;
    const request = conn.request();
    
    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);
    request.input("shipsInspected", shipsInspected);

    try {

        const result = await request.query(`INSERT INTO tbl_kpi_dgs_2_6_1 (mmd_year, mmd_month, mmd_id, mmd_ship_inspected )
            OUTPUT INSERTED.kpi_dgs_flag_id
            VALUES ( @year, @month, @mmdName, @shipsInspected )`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function checkData_2_6_2(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    
    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    
    // Check if year and month are provided
    if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_6_2 
            WHERE year = @year AND month = @month
        `);
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};


async function createDgsKpi2_6_2Data(req, res) 
{
    const year = req.body.year;
    const month = req.body.month;
    const flagStateInspectionTab = JSON.parse(req.body.flagStateInspectionTab);

    const conn = await pool;

    // console.log(year, flagStateInspectionTab)
    try {

        for (let p = 0; p < flagStateInspectionTab.length; p++) 
        {
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

            const query = `   INSERT INTO tbl_kpi_dgs_2_6_2 (year, month, ship_type, 
                        upto_5_years_inspection, upto_5_years_detentions, upto_5_years_deficiencies, upto_5_years_nil_deficiencies,
                        above_5to15_years_inspection, above_5to15_years_detentions, above_5to15_years_deficiencies, above_5to15_years_nil_deficiencies,
                        above_16to25_years_inspection, above_16to25_years_detentions, above_16to25_years_deficiencies, above_16to25_years_nil_deficiencies,
                        above_25_years_inspection, above_25_years_detentions, above_25_years_deficiencies, above_25_years_nil_deficiencies) 
                    VALUES (@year, @month, @shipType, @upto5YrsInspection, @upto5YrsDetentions, @upto5YrsDeficiencies, @upto5YrsNilDeficiencies, 
                        @upto5to15YrsInspection, @upto5to15YrsDetentions, @upto5to15YrsDeficiencies, @upto5to15YrsNilDeficiencies,
                        @upto16to25YrsInspection, @upto16to25YrsDetentions, @upto16to25YrsDeficiencies, @upto16to25YrsNilDeficiencies,
                        @above25YrsInspection, @above25YrsDetentions, @above25YrsDeficiencies, @above25YrsNilDeficiencies)
             `;

            const result = await request.query(query);
        }
        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// async function createDgsKpi2_6_2Data(req, res) 
// {
//     const year = req.body.year;
//     const month = req.body.month;
//     const flagStateInspectionTab = JSON.parse(req.body.flagStateInspectionTab);

//     const conn = await pool;

//     console.log(year, flagStateInspectionTab)
//     try {

//         for (let p = 0; p < flagStateInspectionTab.length; p++) {
//             // let status	    = flagStateInspectionTab[p]["status"]  
//             const shipType = flagStateInspectionTab[p].shipType

//             let upto5YrsInspection = flagStateInspectionTab[p].upto5YrsInspection
//             let upto5YrsDetentions = flagStateInspectionTab[p].upto5YrsDetentions
//             let upto5YrsDeficiencies = flagStateInspectionTab[p].upto5YrsDeficiencies
//             let upto5YrsNilDeficiencies = flagStateInspectionTab[p].upto5YrsNilDeficiencies

//             let upto5to15YrsInspection = flagStateInspectionTab[p].upto5to15YrsInspection
//             let upto5to15YrsDetentions = flagStateInspectionTab[p].upto5to15YrsDetentions
//             let upto5to15YrsDeficiencies = flagStateInspectionTab[p].upto5to15YrsDeficiencies
//             let upto5to15YrsNilDeficiencies = flagStateInspectionTab[p].upto5to15YrsNilDeficiencies

//             let upto16to25YrsInspection = flagStateInspectionTab[p].upto16to25YrsInspection
//             let upto16to25YrsDetentions = flagStateInspectionTab[p].upto16to25YrsDetentions
//             let upto16to25YrsDeficiencies = flagStateInspectionTab[p].upto16to25YrsDeficiencies
//             let upto16to25YrsNilDeficiencies = flagStateInspectionTab[p].upto16to25YrsNilDeficiencies

//             let above25YrsInspection = flagStateInspectionTab[p].above25YrsInspection
//             let above25YrsDetentions = flagStateInspectionTab[p].above25YrsDetentions
//             let above25YrsDeficiencies = flagStateInspectionTab[p].above25YrsDeficiencies
//             let above25YrsNilDeficiencies = flagStateInspectionTab[p].above25YrsNilDeficiencies

//             const request = conn.request();
//             request.input("year", year);
//             request.input("month", month);

//             request.input("shipType", shipType);

//             request.input("upto5YrsInspection", upto5YrsInspection);
//             request.input("upto5YrsDetentions", upto5YrsDetentions);
//             request.input("upto5YrsDeficiencies", upto5YrsDeficiencies);
//             request.input("upto5YrsNilDeficiencies", upto5YrsNilDeficiencies);

//             request.input("upto5to15YrsInspection", upto5to15YrsInspection);
//             request.input("upto5to15YrsDetentions", upto5to15YrsDetentions);
//             request.input("upto5to15YrsDeficiencies", upto5to15YrsDeficiencies);
//             request.input("upto5to15YrsNilDeficiencies", upto5to15YrsNilDeficiencies);

//             request.input("upto16to25YrsInspection", upto16to25YrsInspection);
//             request.input("upto16to25YrsDetentions", upto16to25YrsDetentions);
//             request.input("upto16to25YrsDeficiencies", upto16to25YrsDeficiencies);
//             request.input("upto16to25YrsNilDeficiencies", upto16to25YrsNilDeficiencies);

//             request.input("above25YrsInspection", above25YrsInspection);
//             request.input("above25YrsDetentions", above25YrsDetentions);
//             request.input("above25YrsDeficiencies", above25YrsDeficiencies);
//             request.input("above25YrsNilDeficiencies", above25YrsNilDeficiencies);

//             const query = ` IF NOT EXISTS (SELECT tbl_kpi_dgs_2_6_2.gi_performance_id FROM tbl_kpi_dgs_2_6_2 
//                 WHERE year = @year AND month = @month AND ship_type = @shipType)
                
//                 BEGIN
//                     INSERT INTO tbl_kpi_dgs_2_6_2 (year, month, ship_type, 
//                         upto_5_years_inspection, upto_5_years_detentions, upto_5_years_deficiencies, upto_5_years_nil_deficiencies,
//                         above_5to15_years_inspection, above_5to15_years_detentions, above_5to15_years_deficiencies, above_5to15_years_nil_deficiencies,
//                         above_16to25_years_inspection, above_16to25_years_detentions, above_16to25_years_deficiencies, above_16to25_years_nil_deficiencies,
//                         above_25_years_inspection, above_25_years_detentions, above_25_years_deficiencies, above_25_years_nil_deficiencies) 
//                     VALUES (@year, @month, @shipType, @upto5YrsInspection, @upto5YrsDetentions, @upto5YrsDeficiencies, @upto5YrsNilDeficiencies, 
//                         @upto5to15YrsInspection, @upto5to15YrsDetentions, @upto5to15YrsDeficiencies, @upto5to15YrsNilDeficiencies,
//                         @upto16to25YrsInspection, @upto16to25YrsDetentions, @upto16to25YrsDeficiencies, @upto16to25YrsNilDeficiencies,
//                         @above25YrsInspection, @above25YrsDetentions, @above25YrsDeficiencies, @above25YrsNilDeficiencies)
//                 END

//                 Else
//                 BEGIN
//                     UPDATE tbl_kpi_dgs_2_6_2
//                         SET 
//                             upto_5_years_inspection = @upto5YrsInspection,
//                             upto_5_years_detentions = @upto5YrsDetentions,
//                             upto_5_years_deficiencies = @upto5YrsDeficiencies,
//                             upto_5_years_nil_deficiencies = @upto5YrsNilDeficiencies,
//                             above_5to15_years_inspection = @upto5to15YrsInspection,
//                             above_5to15_years_detentions = @upto5to15YrsDetentions,
//                             above_5to15_years_deficiencies = @upto5to15YrsDeficiencies,
//                             above_5to15_years_nil_deficiencies = @upto5to15YrsNilDeficiencies,
//                             above_16to25_years_inspection = @upto16to25YrsInspection,
//                             above_16to25_years_detentions = @upto16to25YrsDetentions,
//                             above_16to25_years_deficiencies = @upto16to25YrsDeficiencies,
//                             above_16to25_years_nil_deficiencies = @upto16to25YrsNilDeficiencies,
//                             above_25_years_inspection = @above25YrsInspection,
//                             above_25_years_detentions = @above25YrsDetentions,
//                             above_25_years_deficiencies = @above25YrsDeficiencies,
//                             above_25_years_nil_deficiencies = @above25YrsNilDeficiencies
//                         WHERE 
//                             year = @year AND month = @month
//                             AND ship_type = @shipType
//                 END `;

//             const result = await request.query(query);
//             // console.log(result, "result")

//         }
//         res.sendStatus(201);
//     }
//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// };

//-------------------------------------------------------------- 2.7 ----------------------------------------------------------------


async function checkData_2_7_1(req, res) 
{
    const year = req.params.year;
    const month = req.params.month;
    const mmdName = req.params.mmdName;
    
    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);

    // Check if year, month and mmdName are provided
    if (!year || !month || !mmdName) {
        return res.status(400).json({ message: "Year and month are required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_7_1 
            WHERE mmd_year = @year AND mmd_month = @month AND mmd_id = @mmdName
        `); 
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};


async function createDgsKpi2_7_1Data(req, res) {
    const year = req.body.year;
    const month = req.body.month
    const mmdName = req.body.mmdName;
    const shipsInspected = req.body.shipsInspected;


    // const userID = req.body.userID;
    // const organisationID = req.body.organisationID;
    // const wingID = req.body.wingID;

    const conn = await pool;
    const request = conn.request();
    // request.input("projectID", projectID);
    request.input("year", year);
    request.input("month", month);
    request.input("mmdName", mmdName);
    request.input("shipsInspected", shipsInspected);

    // request.input("userID", userID);
    // request.input("organisationID", organisationID);
    // request.input("wingID", wingID);

    try {

        const result = await request.query(`INSERT INTO tbl_kpi_dgs_2_7_1 (mmd_year, mmd_month, mmd_id, mmd_ship_inspected )
            OUTPUT INSERTED.kpi_dgs_ports_id
            VALUES ( @year, @month, @mmdName, @shipsInspected )`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function checkData_2_7_2(req, res) {
    const year = req.params.year;
    const month = req.params.month;
    
    const conn = await pool;
    const request = conn.request();
    request.input("year", year);
    request.input("month", month);
    
    // Check if year and month are provided
    if (!year || !month) {
        return res.status(400).json({ message: "Year and month are required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_7_2 
            WHERE year = @year AND month = @month
        `);
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};

async function createDgsKpi2_7_2Data(req, res) 
{
    const year = req.body.year;
    const month = req.body.month;
    const portStateInspectionTab = JSON.parse(req.body.portStateInspectionTab);

    const conn = await pool;

    // console.log(year, portStateInspectionTab)

    try {
        var total10YrsInspection = 0, total10to20YrsInspection = 0, total20YrsInspection = 0;
        var total10YrsDetentions = 0, total10to20YrsDetentions = 0, total20YrsDetentions = 0;

        for (let p = 0; p < portStateInspectionTab.length; p++) 
        {
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

            const query = ` INSERT INTO tbl_kpi_dgs_2_7_2 (year, month, ship_type, 
                    upto_10_years_inspection, upto_10_years_detentions, upto_10_years_deficiencies, upto_10_years_nil_deficiencies,
                    above_10to20_years_inspection, above_10to20_years_detentions, above_10to20_years_deficiencies, above_10to20_years_nil_deficiencies,
                    above_20_years_inspection, above_20_years_detentions, above_20_years_deficiencies, above_20_years_nil_deficiencies) 
                    VALUES (@year, @month, @shipType, @upto10YrsInspection, @upto10YrsDetentions, @upto10YrsDeficiencies, @upto10YrsNilDeficiencies, 
                    @upto10to20YrsInspection, @upto10to20YrsDetentions, @upto10to20YrsDeficiencies, @upto10to20YrsNilDeficiencies,
                    @above20YrsInspection, @above20YrsDetentions, @above20YrsDeficiencies, @above20YrsNilDeficiencies)            
            ` ;
            
                const result = await request.query(query);
        }

        const totalInspection = ( (total10YrsInspection) + (total10to20YrsInspection) + (total20YrsInspection));
        const totalDetention =  ( (total10YrsDetentions) + (total10to20YrsDetentions) + (total20YrsDetentions));

        const request = conn.request();
        request.input("year", year);
        request.input("month", month);
        request.input("totalInspection",totalInspection);
        request.input("totalDetention", totalDetention);

        const query1 = `INSERT INTO tbl_kpi_dgs_2_7_2_total (year, month, total_no_of_inspection, total_no_of_detention )
        VALUES (@year, @month, @totalInspection, @totalDetention )`
        const result1 = await request.query(query1);


        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { checkData_2_6_1, createDgsKpi2_6_1Data, checkData_2_6_2, createDgsKpi2_6_2Data, checkData_2_7_1,
    createDgsKpi2_7_1Data, checkData_2_7_2, createDgsKpi2_7_2Data };