import { pool } from '../../db.js';

async function addJettiesVesselsData(req, res) {
    const financialYear = req.body.financialYear;
    const month = req.body.month;
    const terminal = req.body.terminalName;
    const totalVessels = req.body.prevFortnightVessels;
  
    const conn = await pool;
    const request = conn.request();
  
    request.input('financialYear', financialYear);
    request.input('month', month);
    request.input("terminal", terminal);
    request.input('totalVessels', totalVessels);
  
    try {
      const result = await request.query(`
        INSERT INTO tbl_iwai_jetties_vessels (
          financialYear, month, terminal, totalVessels
        )
        VALUES (
          @financialYear, @month, @terminal, @totalVessels
        )
      `);
      res.sendStatus(201);
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
  

async function getJettiesVesselsData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query('SELECT * FROM tbl_iwai_jetties_vessels ORDER BY financialYear DESC;');
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getMonthlyJettiesVesselsData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query('SELECT * FROM tbl_iwai_jetties_vessels ORDER BY financialYear DESC;');
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getQuarterlyJettiesVesselsData(req, res) {
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
        SUM(jetties) AS totalJetties,
        SUM(vessels) AS totalVessels
      FROM tbl_iwai_jetties_vessels
      GROUP BY financialYear, quarter_number
      ORDER BY financialYear DESC, quarter_number;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getAnnuallyJettiesVesselsData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query('SELECT * FROM tbl_iwai_jetties_vessels ORDER BY financialYear DESC;');
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

const JettiesVesselsController = {
  addJettiesVesselsData,
  getJettiesVesselsData,
  getMonthlyJettiesVesselsData,
  getQuarterlyJettiesVesselsData,
  getAnnuallyJettiesVesselsData,
};

export default JettiesVesselsController;
