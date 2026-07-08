import { pool } from "../../db.js";

async function addCargoVessel(req, res) {
    
        const { financialYear, month, cargoData } = req.body;
        const conn = await pool;
        
        for (const cargoVessel of cargoData) {
            const {
                cargoType,
                nationalWaterway,
                totalVolume,
                percentHandled
            } = cargoVessel;

            const request = conn.request();

            request.input('cargoType', cargoType);
            request.input('nationalWaterway', nationalWaterway);
            request.input('totalVolume', totalVolume);
            request.input('percentHandled', percentHandled);
            request.input('month', month);
            request.input('financialYear', financialYear);
        try {
            const checkResult = await request.query(`
                SELECT COUNT(*) AS count
                FROM tbl_iwai_Cargovessel
                WHERE year = @financialYear
                AND month = @month
                AND cargo_type = @cargoType
                AND national_waterways = @nationalWaterway
            `);

            if (checkResult.recordset[0].count > 0) {
                return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
            }

            await request.query(`
                INSERT INTO tbl_iwai_Cargovessel 
                (month, year, cargo_type, national_waterways, total_volume, percent_handled)
                VALUES
                (@month, @financialYear, @cargoType, @nationalWaterway, @totalVolume, @percentHandled)
            `);
            return res.sendStatus(201);
        } catch (error) {
            console.log('Error adding Cargo vessel data:', error);
            res.sendStatus(500);
        }
    }
}



async function getCargoVessel(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT
                cargo_type AS cargoType,
                national_waterways AS nationalWaterway,
                year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(total_volume) AS totalVolume,
                SUM(percent_handled) AS percentHandled
            FROM tbl_iwai_Cargovessel
            GROUP BY cargo_type, national_waterways, year,
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

async function getMonthlyCargoVessel(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT 
                month,
                cargo_type AS cargoType,
                national_waterways AS nationalWaterway,
                year,
                SUM(total_volume) AS totalVolume,
                SUM(percent_handled) AS percentHandled
            FROM tbl_iwai_Cargovessel
            GROUP BY month, cargo_type, national_waterways, year
            ORDER BY year DESC, month DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyCargoVessel(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT
                cargo_type AS cargoType,
                national_waterways AS nationalWaterway,
                year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(total_volume) AS totalVolume,
                SUM(percent_handled) AS percentHandled
            FROM tbl_iwai_Cargovessel
            GROUP BY cargo_type, national_waterways, year,
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

async function getAnnuallyCargoVessel(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT 
                cargo_type AS cargoType,
                national_waterways AS nationalWaterway,
                year,
                SUM(total_volume) AS totalVolume,
                SUM(percent_handled) AS percentHandled
            FROM tbl_iwai_Cargovessel
            GROUP BY cargo_type, national_waterways, year
            ORDER BY year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



const CargoVesselTab = {
    addCargoVessel,
    getCargoVessel,
    getMonthlyCargoVessel,
    getQuarterlyCargoVessel,
    getAnnuallyCargoVessel
};

export default CargoVesselTab;
