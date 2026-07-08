import { pool } from "../../db.js";


async function addiwaiVesselMovementData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const nw = req.body.nw;
    const prevYearVesselMovement = req.body.prevYearRoRo;

    const conn = await pool;
    const request = conn.request();

    request.input('financialYear', financialYear);
    request.input('month', month);
    request.input('nw', nw);
    request.input('prevYearVesselMovement', prevYearVesselMovement);

    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_IWAIvessel_movement (
                financialYear, month, nw, prevYearVesselMovement
            )
            VALUES (
                @financialYear, @month, @nw, @prevYearVesselMovement
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getiwaiVesselMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIvessel_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyiwaiVesselMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIvessel_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlyiwaiVesselMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIvessel_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallyiwaiVesselMovementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_IWAIvessel_movement ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const iwaiVesselMovementController = {
    addiwaiVesselMovementData,
    getiwaiVesselMovementData,
    getMonthlyiwaiVesselMovementData,
    getQuarterlyiwaiVesselMovementData,
    getAnnuallyiwaiVesselMovementData,
};

export default iwaiVesselMovementController;
