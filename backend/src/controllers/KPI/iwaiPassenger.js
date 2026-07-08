import { pool } from "../../db.js";

// Add iwai passenger movement data
async function addiwaiPassengerMovementData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const nw = req.body.nw;
    const totalPassengers = req.body.prevYearPassenger;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("nw", nw);
    request.input("totalPassengers", totalPassengers);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_IWAIpassenger_movement (
                financialYear, month, nw, totalPassengers
            )
            VALUES (
                @financialYear, @month, @nw, @totalPassengers
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Get iwai passenger movement data
async function getiwaiPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIpassenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Get monthly iwai passenger movement data
async function getMonthlyiwaiPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIpassenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Get quarterly iwai passenger movement data
async function getQuarterlyiwaiPassengerMovementData(req, res) {
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
            FROM tbl_iwai_IWAIpassenger_movement
            GROUP BY financialYear, quarter_number
            ORDER BY financialYear DESC, quarter_number;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Get annually iwai passenger movement data
async function getAnnuallyiwaiPassengerMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIpassenger_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const iwaiPassengerController = {
    addiwaiPassengerMovementData,
    getiwaiPassengerMovementData,
    getMonthlyiwaiPassengerMovementData,
    getQuarterlyiwaiPassengerMovementData,
    getAnnuallyiwaiPassengerMovementData,
};

export default iwaiPassengerController;
