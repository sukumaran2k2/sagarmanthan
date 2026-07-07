import { pool } from "../../db.js";

async function addSurveyVessel(req, res) {

      const { financialYear, month, surveyData } = req.body;

      const conn = await pool;

      for (const surveyVessel of surveyData) {
          const {
              surveyVesselName,
              nationalWaterway,
              numberOfSurveys,
              totalKilometersCovered,
          } = surveyVessel;

          const request = conn.request();

          request.input('surveyVesselName', surveyVesselName);
          request.input('nationalWaterway', nationalWaterway);
          request.input('numberOfSurveys', numberOfSurveys);
          request.input('totalKilometersCovered', totalKilometersCovered);
          request.input('month', month);
          request.input('financialYear', financialYear);
    try {
          const checkResult = await request.query(`
                SELECT COUNT(*) AS count
                FROM tbl_iwai_surveyvessel
                WHERE year = @financialYear
                AND month = @month
                AND nationalWaterways = @nationalWaterway
            `);

            if (checkResult.recordset[0].count > 0) {
                return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
            }

          await request.query(`
              INSERT INTO tbl_iwai_surveyvessel 
              (month, year, surveyVesselName, nationalWaterways, numberOfSurveys, totalKilometersCovered)
              VALUES
              (@month, @financialYear, @surveyVesselName, @nationalWaterway, @numberOfSurveys, @totalKilometersCovered)
          `);
          return res.sendStatus(201);
        } catch (error) {
            console.log('Error adding survey vessel data:', error);
            res.sendStatus(500);
        }
    }
}


async function getSurveyVessel(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                surveyVesselName, nationalWaterways, year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(numberOfSurveys) AS total_numberOfSurveys,
                SUM(totalKilometersCovered) AS total_KilometersCovered
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_surveyvessel]
            GROUP BY surveyVesselName, nationalWaterways, year, 
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

async function getMonthlySurveyVessel(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT 
                month,
                surveyVesselName,
                nationalWaterways, 
                year,
                SUM(numberOfSurveys) AS numberOfSurveys,
                SUM(totalKilometersCovered) AS total_KilometersCovered
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_surveyvessel]
            GROUP BY month, surveyVesselName, nationalWaterways, year
            ORDER BY year DESC, month DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getQuarterlySurveyVessel(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                surveyVesselName, nationalWaterways, year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                SUM(numberOfSurveys) AS total_numberOfSurveys,
                SUM(totalKilometersCovered) AS total_KilometersCovered
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_surveyvessel]
            GROUP BY surveyVesselName, nationalWaterways, year, 
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

async function getAnnuallySurveyVessel(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT 
                surveyVesselName, nationalWaterways, year,
                SUM(numberOfSurveys) AS total_numberOfSurveys,
                SUM(totalKilometersCovered) AS total_KilometersCovered
            FROM [sagarmanthan_revamp].[dbo].[tbl_iwai_surveyvessel]
            GROUP BY surveyVesselName, nationalWaterways, year
            ORDER BY year DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const SurveyVesselTab = {
    addSurveyVessel,
    getSurveyVessel,
    getMonthlySurveyVessel,
    getQuarterlySurveyVessel,
    getAnnuallySurveyVessel
};

export default SurveyVesselTab;
