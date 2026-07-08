import { pool } from '../../db.js';

async function createCargoOperationsData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const nw = req.body.nw;
    const currentYearCargo = req.body.currentYearCargo;

    const conn = await pool;
    const request = conn.request();

    request.input('financialYear', financialYear);
    request.input('month', month);
    request.input('nw', nw);
    request.input('currentYearCargo', currentYearCargo);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_cargo_operations (
                financialYear, month, nw, currentYearCargo
            )
            VALUES (
                @financialYear, @month, @nw, @currentYearCargo
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCargoOperationsData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query('SELECT * FROM tbl_iwai_cargo_operations ORDER BY financialYear DESC;');
        res.json(result.recordset);
    } catch (err) {
        console.log (err);
        return res.sendStatus(500);
    }
}

async function getMonthlyCargoOperationsData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query('SELECT * FROM tbl_iwai_cargo_operations ORDER BY financialYear DESC;');
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyCargoOperationsData(req, res) {
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
                SUM(currentYearCargo) AS currentYearCargo
            FROM tbl_iwai_cargo_operations
            GROUP BY financialYear, quarter_number
            ORDER BY financialYear DESC, quarter_number;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyCargoOperationsData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query('SELECT * FROM tbl_iwai_cargo_operations ORDER BY financialYear DESC;');
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const cargoOperationController = {
    createCargoOperationsData,
    getCargoOperationsData,
    getMonthlyCargoOperationsData,
    getQuarterlyCargoOperationsData,
    getAnnuallyCargoOperationsData,
};

export default cargoOperationController;
