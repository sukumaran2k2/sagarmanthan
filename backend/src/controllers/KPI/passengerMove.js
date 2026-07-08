import { pool } from "../../db.js";

async function createPassengerMovementData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const terminal = req.body.terminal;
    const totalPassengers = req.body.totalPassengers;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("terminal", terminal);
    request.input("totalPassengers", totalPassengers);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_passenger_movement (
                financialYear, month, terminal, totalPassengers
            )
            VALUES (
                @financialYear, @month, @terminal, @totalPassengers
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_passenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_passenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                financialYear,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(totalPassengers) AS totalPassengers
            FROM tbl_iwai_passenger_movement
            GROUP BY financialYear, quarter_number
            ORDER BY financialYear DESC, quarter_number;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_passenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const PassengerMovementController = {
    createPassengerMovementData,
    getPassengerMovementData,
    getMonthlyPassengerMovementData,
    getQuarterlyPassengerMovementData,
    getAnnuallyPassengerMovementData,
};

export default PassengerMovementController;
