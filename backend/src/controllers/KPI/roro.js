import { pool } from "../../db.js";

async function addRoroData(req, res) {
    
        const { financialYear, month, vesselData } = req.body;

        const conn = await pool;

        for (const roro of vesselData) {
            const {
                nationalWaterway,
                numberOfVessels,
                numberOfTrips,
                numberOfVehiclesTransported,
            } = roro;

            const request = conn.request();

            request.input('nationalWaterway', nationalWaterway);
            request.input('numberOfVessels', numberOfVessels);
            request.input('numberOfTrips', numberOfTrips);
            request.input('numberOfVehiclesTransported', numberOfVehiclesTransported);
            request.input('month', month);
            request.input('financialYear', financialYear);
    try {
            const checkResult = await request.query(`
                SELECT COUNT(*) AS count
                FROM tbl_iwai_roro
                WHERE year = @financialYear
                AND month = @month
            `);

            if (checkResult.recordset[0].count > 0) {
                return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
            }

            await request.query(`
                INSERT INTO tbl_iwai_roro 
                (month, year, national_waterways, number_of_vessels, number_of_trips, number_of_vehicles)
                VALUES
                (@month, @financialYear, @nationalWaterway, @numberOfVessels, @numberOfTrips, @numberOfVehiclesTransported)
            `);
            return res.sendStatus(201);
        } catch (error) {
            console.log('Error adding RoRo data:', error);
            res.sendStatus(500);
        }
    }
}

async function getRoroData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                national_waterways, year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(number_of_vessels) AS total_numberOfVessels,
                SUM(number_of_trips) AS total_numberOfTrips,
                SUM(number_of_vehicles) AS total_numberOfVehicles
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_roro]
            GROUP BY national_waterways, year, 
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END
            ORDER BY year DESC, quarter_number DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyRoroData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT 
                month,
                national_waterways, 
                year,
                SUM(number_of_vessels) AS numberOfVessels,
                SUM(number_of_trips) AS numberOfTrips,
                SUM(number_of_vehicles) AS numberOfVehicles
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_roro]
            GROUP BY month, national_waterways, year
            ORDER BY year DESC, month DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyRoroData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                national_waterways, year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(number_of_vessels) AS total_numberOfVessels,
                SUM(number_of_trips) AS total_numberOfTrips,
                SUM(number_of_vehicles) AS total_numberOfVehicles
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_roro]
            GROUP BY national_waterways, year, 
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END
            ORDER BY year DESC, quarter_number DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyRoroData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT 
                national_waterways, 
                year,
                SUM(number_of_vessels) AS numberOfVessels,
                SUM(number_of_trips) AS numberOfTrips,
                SUM(number_of_vehicles) AS numberOfVehicles
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_roro]
            GROUP BY national_waterways, year
            ORDER BY year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const roroTab = {
    addRoroData,
    getRoroData,
    getMonthlyRoroData,
    getQuarterlyRoroData,
    getAnnuallyRoroData
};

export default roroTab;
