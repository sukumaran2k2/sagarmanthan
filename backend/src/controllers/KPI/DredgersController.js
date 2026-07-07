import { pool } from "../../db.js";

async function createDredgersData(req, res) {
    const year = req.body.financialYear;
    const month = req.body.month;
    const dredgingInfrastructure = req.body.dredgingInfrastructure;
    const totalDredgingCubicMeters = req.body.totalDredgingCubicMeters;

    const conn = await pool;
    const request = conn.request();

    request.input("year", year);
    request.input("month", month);
    request.input("dredgingInfrastructure", dredgingInfrastructure);
    request.input("totalDredgingCubicMeters", totalDredgingCubicMeters);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_dredgers (
                year, month, dredging_infrastructure, total_dredging_cubic_meters
            )
            VALUES (
                @year, @month, @dredgingInfrastructure, @totalDredgingCubicMeters
            )
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getDredgersData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT * from tbl_iwai_dredgers ORDER BY year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
async function getMonthlyDredgersData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT year, month, dredging_infrastructure, total_dredging_cubic_meters
            FROM tbl_iwai_dredgers
            ORDER BY year DESC, month;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyDredgersData(req, res) {
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
                SUM(totalUserLogins) AS totalUserLogins
            FROM tbl_iwai_dredgers
            GROUP BY financialYear, quarter_number
            ORDER BY financialYear DESC, quarter_number;
        `);   
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyDredgersData(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT * from tbl_iwai_dredgers ORDER BY year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const DredgersTab = { createDredgersData, getDredgersData, getMonthlyDredgersData, getQuarterlyDredgersData, getAnnuallyDredgersData };
export default DredgersTab;