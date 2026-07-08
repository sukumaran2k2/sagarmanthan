import { pool } from "../../db.js";
// import sql from 'mssql';

async function addPassengerData(req, res) {
  
    const  financialYear = req.body.financialYear;
    const  month = req.body.month;
    const  passengerData = req.body.passengerData;


    const conn = await pool;

    for (const passenger of passengerData) {
      const {
        nationalWaterway,
        numberOfTrips,
        numberOfDayCruisePassengers,
        numberOfNightCruisePassengers,
        totalPassengers,
      } = passenger;

      const request = conn.request(); 

      request.input('nationalWaterway',nationalWaterway);
      request.input('numberOfTrips', numberOfTrips);
      request.input('numberOfDayCruisePassengers', numberOfDayCruisePassengers);
      request.input('numberOfNightCruisePassengers', numberOfNightCruisePassengers);
      request.input('totalPassengers', totalPassengers);
      request.input('month', month);
      request.input('year', financialYear);

  try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_iwai_nw_passengers
            WHERE year = @year
            AND month = @month
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
        }

        const insertResult = await request.query(`
          INSERT INTO tbl_iwai_nw_passengers 
          (national_waterway, number_of_trips, number_of_day_cruise_passengers, number_of_night_cruise_passengers, total_passengers, month, year)
          VALUES
          (@nationalWaterway, @numberOfTrips, @numberOfDayCruisePassengers, @numberOfNightCruisePassengers, @totalPassengers, @month, @year)
        `);
        return res.sendStatus(201);
      } catch (error) {
          console.error('Error adding passenger data:', error);
          res.sendStatus(500);
      }
  }
}

async function getPassengerData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT
        year,
        national_waterway,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        END AS quarter_number,
        SUM(number_of_trips) AS number_of_trips,
        SUM(number_of_day_cruise_passengers) AS total_day_cruise_passengers,
        SUM(number_of_night_cruise_passengers) AS total_night_cruise_passengers,
        SUM(total_passengers) AS total_passengers
    FROM tbl_iwai_nw_passengers
    GROUP BY year, national_waterway,
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

async function getMonthlyPassengerData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT
            year,
            month,
            national_waterway,
            SUM(number_of_trips) AS number_of_trips,
            SUM(number_of_day_cruise_passengers) AS total_day_cruise_passengers,
            SUM(number_of_night_cruise_passengers) AS total_night_cruise_passengers,
            SUM(total_passengers) AS total_passengers
        FROM tbl_iwai_nw_passengers
        GROUP BY year, month, national_waterway
        ORDER BY year DESC, month DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getQuarterlyPassengerData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT
            year,
            national_waterway,
            CASE
                WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
            END AS quarter_number,
            SUM(number_of_trips) AS number_of_trips,
            SUM(number_of_day_cruise_passengers) AS total_day_cruise_passengers,
            SUM(number_of_night_cruise_passengers) AS total_night_cruise_passengers,
            SUM(total_passengers) AS total_passengers
        FROM tbl_iwai_nw_passengers
        GROUP BY year, national_waterway,
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

async function getAnnuallyPassengerData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT
            year,
            national_waterway,
            SUM(number_of_trips) AS number_of_trips,
            SUM(number_of_day_cruise_passengers) AS total_day_cruise_passengers,
            SUM(number_of_night_cruise_passengers) AS total_night_cruise_passengers,
            SUM(total_passengers) AS total_passengers
        FROM tbl_iwai_nw_passengers
        GROUP BY year, national_waterway
        ORDER BY year DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}



const passengerTab = { addPassengerData, getPassengerData, 
getMonthlyPassengerData, getQuarterlyPassengerData, 
getAnnuallyPassengerData };

export default passengerTab;
