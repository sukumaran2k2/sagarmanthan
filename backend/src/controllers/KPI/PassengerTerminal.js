import { pool } from "../../db.js";

async function addPassengerTerminalData(req, res) {
  
    const { financialYear, month, passengerData } = req.body;

    const conn = await pool;

    for (const passenger of passengerData) {
      const { terminalName, numberOfPassengers } = passenger;

      const request = conn.request();

      request.input('terminal', terminalName);
      request.input('totalPassengers', numberOfPassengers);
      request.input('month', month);
      request.input('year', financialYear);

try {
      const checkResult = await request.query(`
          SELECT COUNT(*) AS count
          FROM tbl_iwai_nw_passenger_terminal
          WHERE year = @year
          AND month = @month
      `);

      if (checkResult.recordset[0].count > 0) {
          return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
      }

      await request.query(`
        INSERT INTO tbl_iwai_nw_passenger_terminal 
        (terminal, total_passengers, month, year)
        VALUES
        (@terminal, @totalPassengers, @month, @year)
      `);
      return res.sendStatus(201);
    } catch (error) {
      console.error('Error adding passenger terminal data:', error);
      res.sendStatus(500);
    }
  }  
}

async function getPassengerTerminalData(req, res) {
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
              SUM(total_passengers) AS total_passengers
          FROM tbl_iwai_nw_passenger_terminal
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

async function getMonthlyPassengerTerminalData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              month,
              terminal,
              SUM(total_passengers) AS total_passengers
          FROM tbl_iwai_nw_passenger_terminal
          GROUP BY year, month, terminal
          ORDER BY year DESC, month DESC;
      `);
  
      res.json(result.recordset);
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
}

async function getQuarterlyPassengerTerminalData(req, res) {
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
              SUM(total_passengers) AS total_passengers
          FROM tbl_iwai_nw_passenger_terminal
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

async function getAnnuallyPassengerTerminalData(req, res) {
    const conn = await pool;
    try {
      const result = await conn.query(`
          SELECT
              year,
              terminal,
              SUM(total_passengers) AS total_passengers
          FROM tbl_iwai_nw_passenger_terminal
          GROUP BY year, terminal
          ORDER BY year DESC;
      `);
  
      res.json(result.recordset);
    } catch (err) {
      console.log(err);
      return res.sendStatus(500);
    }
}

const passengerTerminalTab = {
  addPassengerTerminalData,
  getPassengerTerminalData,
  getMonthlyPassengerTerminalData,
  getQuarterlyPassengerTerminalData,
  getAnnuallyPassengerTerminalData
};

export default passengerTerminalTab;
