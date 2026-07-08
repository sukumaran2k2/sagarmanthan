import { pool } from "../../db.js";

async function createCruisePassengerData(req, res) {
    const year = req.body.financialYear;
    const month = req.body.month;
    const yearPassengerVehicle = req.body.yearPassengerVehicle;
    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("yearPassengerVehicle", yearPassengerVehicle);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_cruise (
                year, month, yearPassengerVehicle
            )
            VALUES (
                @year, @month, @yearPassengerVehicle
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCruisePassengerData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT
        year,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END AS quarter_number,
        SUM(yearPassengerVehicle) AS yearPassengerVehicle
        FROM tbl_iwai_cruise
        GROUP BY year, 
            CASE
                WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
            END
        ORDER BY year DESC, quarter_number;
    `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyCruiseData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_cruise ORDER BY year DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyCruiseData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT
        year,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END AS quarter_number,
        SUM(yearPassengerVehicle) AS yearPassengerVehicle
        FROM tbl_iwai_cruise
        GROUP BY year, 
            CASE
                WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
            END
        ORDER BY year DESC, quarter_number;
    
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getAnnuallyCruiseData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_cruise ORDER BY year DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


const cruiseTab = {
    createCruisePassengerData,
    getCruisePassengerData,
    getMonthlyCruiseData,
    getQuarterlyCruiseData,
    getAnnuallyCruiseData,
};
export default cruiseTab;