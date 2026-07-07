import { pool } from "../../db.js";

async function createSurveyVesselData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const nameOfInfra = req.body.dredgingInfrastructure;
    const totalSurveyKms = req.body.totalDredgingCubicMeters;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("nameOfInfra", nameOfInfra);
    request.input("totalSurveyKms", totalSurveyKms);
    try {
        const result = await request.query(`
            INSERT INTO tbl_iwai_survey_vessels (
                financialYear, month, nameOfInfra, totalSurveyKms
            )
            VALUES (
                @financialYear, @month, @nameOfInfra, @totalSurveyKms
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getSurveyVesselData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_survey_vessels ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlySurveyVesselData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_survey_vessels ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlySurveyVesselData(req, res) {
    const conn = await pool;

    try  {
        const result = await conn.query(`SELECT * FROM tbl_iwai_survey_vessels ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    }  catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getAnnuallySurveyVesselData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM tbl_iwai_survey_vessels ORDER BY financialYear DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const SurveyVesselController = {
    createSurveyVesselData,
    getSurveyVesselData,
    getMonthlySurveyVesselData,
    getQuarterlySurveyVesselData,
    getAnnuallySurveyVesselData,
};

export default SurveyVesselController;
