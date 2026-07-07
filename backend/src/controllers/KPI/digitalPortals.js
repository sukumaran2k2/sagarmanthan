import { pool } from "../../db.js";
async function createDigitalData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const digitalPortalName = req.body.digitalPortalName;
    const totalUserLogins = req.body.totalUserLogins;
    const totalVisits = req.body.totalVisits;
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("digitalPortalName", digitalPortalName);
    request.input("totalUserLogins", totalUserLogins);
    request.input("totalVisits", totalVisits);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_iwai_digitalportal
            WHERE financialYear = @financialYear
            AND month = @month
            AND portal_name = @digitalPortalName
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
        }
        const result = await request.query(`
            INSERT INTO tbl_iwai_digitalportal (
                financialYear, month, portal_name, totalUserLogins, totalVisits
            )
            VALUES (
                @financialYear, @month, @digitalPortalName, @totalUserLogins, @totalVisits
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getDigitalData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query(`
        SELECT
        financialYear,
        portal_name,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END AS quarter_number,
        SUM(totalUserLogins) AS totalUserLogins,
        SUM(totalVisits) AS totalVisits
    FROM tbl_iwai_digitalportal
    GROUP BY financialYear, portal_name, month,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END
    ORDER BY financialYear DESC, portal_name, quarter_number DESC, month DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getMonthlyDigitalData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query(`
        SELECT
            financialYear,
            month,
            portal_name,
            SUM(totalUserLogins) AS totalUserLogins,
            SUM(totalVisits) AS totalVisits
        FROM tbl_iwai_digitalportal
        GROUP BY financialYear, month, portal_name
        ORDER BY financialYear DESC, portal_name, month DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getQuarterlyDigitalData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query(`
        SELECT
        financialYear,
        portal_name,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END AS quarter_number,
        SUM(totalUserLogins) AS totalUserLogins,
        SUM(totalVisits) AS totalVisits
    FROM tbl_iwai_digitalportal
    GROUP BY financialYear, portal_name, month,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END
    ORDER BY financialYear DESC, portal_name, quarter_number DESC, month DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getAnnuallyDigitalData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query(`
        SELECT
            financialYear,
            portal_name,
            SUM(totalUserLogins) AS totalUserLogins,
            SUM(totalVisits) AS totalVisits
        FROM tbl_iwai_digitalportal
        GROUP BY financialYear, portal_name
        ORDER BY financialYear DESC, portal_name;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

  

const digitalPortalTab = {
    createDigitalData,
    getDigitalData,
    getMonthlyDigitalData,
    getQuarterlyDigitalData,
    getAnnuallyDigitalData,
};
export default digitalPortalTab;
