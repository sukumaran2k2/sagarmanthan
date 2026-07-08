import { pool } from "../../db.js";

// Function to add cargo handling data
async function addCargoHandledData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const terminal = req.body.terminalName;
    const totalCargoHandled = req.body.yearCargoTerminal;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("terminal", terminal);
    request.input("totalCargoHandled", totalCargoHandled);
    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_cargo_handle (
                financialYear, month, terminal, totalCargoHandled
            )
            VALUES (
                @financialYear, @month, @terminal, @totalCargoHandled
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get cargo handling data
async function getCargoHandledData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_cargo_handle ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get monthly cargo handling data
async function getMonthlyCargoHandledData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_cargo_handle ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get quarterly cargo handling data
async function getQuarterlyCargoHandledData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                financialYear,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 1'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 2'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 3'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 4'
                END AS quarter,
                SUM(totalCargoHandled) AS totalQuarterlyCargoHandled
            FROM tbl_iwai_cargo_handle
            GROUP BY financialYear, quarter
            ORDER BY financialYear DESC, quarter DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get annually cargo handling data
async function getAnnuallyCargoHandledData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_cargo_handle ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const CargoHandledController = {
    addCargoHandledData,
    getCargoHandledData,
    getMonthlyCargoHandledData,
    getQuarterlyCargoHandledData,
    getAnnuallyCargoHandledData,
};

export default CargoHandledController;
