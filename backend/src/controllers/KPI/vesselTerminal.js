import { pool } from "../../db.js";
import sql from 'mssql';

async function addVesselMovementData(req, res) {
  
    const { financialYear, month, VesselData } = req.body;

    const conn = await pool;

    for (const vessel of VesselData) {
      const { terminal, totalVessels } = vessel;

      const request = conn.request();

      request.input('terminal', sql.NVarChar, terminal);
      request.input('totalVessels', sql.Int, totalVessels);
      request.input('month', sql.NVarChar, month);
      request.input('year', sql.NVarChar, financialYear);
  try {

      const checkResult = await request.query(`
          SELECT COUNT(*) AS count
          FROM tbl_iwai_nw_vessel_movement
          WHERE year = @year
          AND month = @month
      `);

      if (checkResult.recordset[0].count > 0) {
          return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
      }

      await request.query(`
        INSERT INTO tbl_iwai_nw_vessel_movement 
        (terminal, total_vessels, month, year)
        VALUES
        (@terminal, @totalVessels, @month, @year)
      `);
      return  res.sendStatus(201);
      } catch (error) {
      console.error('Error adding vessel movement data:', error);
      res.sendStatus(500);
    }  
  }
}

async function getVesselMovementData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              terminal,
              CASE
                  WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                  WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                  WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                  WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
              END AS quarter_number,
              SUM(total_vessels) AS total_vessels
          FROM tbl_iwai_nw_vessel_movement
          GROUP BY year, terminal
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
  

  async function getMonthlyVesselMovementData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              month,
              terminal,
              SUM(total_vessels) AS total_vessels
          FROM tbl_iwai_nw_vessel_movement
          GROUP BY year, month, terminal
          ORDER BY year DESC, month DESC;
      `);
  
      res.json(result.recordset);
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
  
  async function getQuarterlyVesselMovementData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              terminal,
              CASE
                  WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                  WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                  WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                  WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
              END AS quarter_number,
              SUM(total_vessels) AS total_vessels
          FROM tbl_iwai_nw_vessel_movement
          GROUP BY year, terminal,
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
  

  async function getAnnuallyVesselMovementData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              terminal,
              SUM(total_vessels) AS total_vessels
          FROM tbl_iwai_nw_vessel_movement
          GROUP BY year, terminal
          ORDER BY year DESC;
      `);
  
      res.json(result.recordset);
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
  }
  

const vesselMovementTab = {
  addVesselMovementData,
  getVesselMovementData,
  getMonthlyVesselMovementData,
  getQuarterlyVesselMovementData,
  getAnnuallyVesselMovementData
};

export default vesselMovementTab;
