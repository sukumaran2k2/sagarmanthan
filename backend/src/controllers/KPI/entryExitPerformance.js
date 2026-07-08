import { pool } from "../../db.js";
// import sql from 'mssql';

async function addEntryExitData(req, res) {
  const { financialYear, month, type, grade, noOfCandidatesEntered, noOfCandidatesExited, createdBy } = req.body;
  const conn = await pool;
  const request = conn.request(); 

  request.input('type', type);
  request.input('grade', grade);
  request.input('noOfCandidatesEntered', noOfCandidatesEntered);
  request.input('noOfCandidatesExited', noOfCandidatesExited);
  request.input('createdBy', createdBy);
  request.input('month', month);
  request.input('year', financialYear);

  try {
      const checkResult = await request.query(`
          SELECT COUNT(*) AS count
          FROM tbl_kpi_dgs_entry_exit
          WHERE year = @year AND month = @month AND grade_id = @grade
      `);

      if (checkResult.recordset[0].count > 0) {
          return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
      }

      await request.query(`
          INSERT INTO tbl_kpi_dgs_entry_exit 
          (year, month, type_id, grade_id, no_of_candidates_entered, no_of_candidates_exited, created_date, created_by)
          VALUES (@year, @month, @type, @grade, @noOfCandidatesEntered, @noOfCandidatesExited, GETDATE(), @createdBy)
      `);

      const logCheckResult = await request.query(`
          SELECT total_no_of_candidate_entered, total_no_of_candidate_exited
          FROM tbl_kpi_dgs_entry_exit_log
          WHERE year = @year AND month = @month AND type_id = @type
      `);

      if (logCheckResult.recordset.length === 0) {
          await request.query(`
              INSERT INTO tbl_kpi_dgs_entry_exit_log
              (year, month, type_id, total_no_of_candidate_entered, total_no_of_candidate_exited, created_date, created_by)
              VALUES (@year, @month, @type, @noOfCandidatesEntered, @noOfCandidatesExited, GETDATE(), @createdBy)
          `);
      } else {
          const currentTotalEntered = logCheckResult.recordset[0].total_no_of_candidate_entered || 0;
          const currentTotalExited = logCheckResult.recordset[0].total_no_of_candidate_exited || 0;

          const updatedTotalEntered = currentTotalEntered + parseInt(noOfCandidatesEntered, 10);
          const updatedTotalExited = currentTotalExited + parseInt(noOfCandidatesExited, 10);

          request.input('updatedTotalEntered',updatedTotalEntered);
          request.input('updatedTotalExited',updatedTotalExited);

          await request.query(`
              UPDATE tbl_kpi_dgs_entry_exit_log
              SET total_no_of_candidate_entered = @updatedTotalEntered,
                  total_no_of_candidate_exited = @updatedTotalExited,
                  created_date = GETDATE(),
                  created_by = @createdBy
              WHERE year = @year AND month = @month AND type_id = @type
          `);
      }

      return res.sendStatus(201);
  } catch (error) {
      //console.error('Error adding entry exit data:', error);
      res.sendStatus(500);
  }
}


async function updateEntryExitData(req, res) {
  const { Id, year, month, type, grade, noOfCandidatesEntered, noOfCandidatesExited, updatedBy } = req.body;

  const conn = await pool;

  try {
      const request = conn.request();
      request.input('Id', Id);
      request.input('year', year);
      request.input('month', month);
      request.input('type', type);
      request.input('grade', grade);
      request.input('noOfCandidatesEntered', noOfCandidatesEntered);
      request.input('noOfCandidatesExited', noOfCandidatesExited);
      request.input('updatedBy', updatedBy);

    //   const checkResult = await request.query(`
    //     SELECT COUNT(*) AS count
    //     FROM tbl_kpi_dgs_entry_exit
    //     WHERE year = @year AND month = @month AND grade_id = @grade
    // `);

    // if (checkResult.recordset[0].count > 0) {
    //     return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
    // }


      const existingRequest = conn.request();
      existingRequest.input('Id', Id);

      const existingResult = await existingRequest.query(`
          SELECT no_of_candidates_entered, no_of_candidates_exited 
          FROM tbl_kpi_dgs_entry_exit 
          WHERE id = @Id
      `);

      if (existingResult.recordset.length === 0) {
          return res.status(404).json({ message: 'No record found to update.' });
      }

      const previousEntered = parseInt(existingResult.recordset[0].no_of_candidates_entered, 10) || 0;
      const previousExited = parseInt(existingResult.recordset[0].no_of_candidates_exited, 10) || 0;

      const enteredDifference = parseInt(noOfCandidatesEntered, 10) - previousEntered;
      const exitedDifference = parseInt(noOfCandidatesExited, 10) - previousExited;

      const updateResult = await request.query(`
          UPDATE tbl_kpi_dgs_entry_exit 
          SET 
              type_id = @type,
              grade_id = @grade,
              no_of_candidates_entered = @noOfCandidatesEntered,
              no_of_candidates_exited = @noOfCandidatesExited,
              updated_date = GETDATE(),
              updated_by = @updatedBy
          WHERE id = @Id
      `);

      if (updateResult.rowsAffected[0] > 0) {
          const logCheckRequest = conn.request();
          logCheckRequest.input('year', year);
          logCheckRequest.input('month', month);
          logCheckRequest.input('type', type);

          const logCheckResult = await logCheckRequest.query(`
              SELECT log_id, total_no_of_candidate_entered, total_no_of_candidate_exited 
              FROM tbl_kpi_dgs_entry_exit_log 
              WHERE year = @year AND month = @month AND type_id = @type
          `);

          if (logCheckResult.recordset.length > 0) {
              const logId = logCheckResult.recordset[0].log_id;
              const currentTotalEntered = parseInt(logCheckResult.recordset[0].total_no_of_candidate_entered, 10) || 0;
              const currentTotalExited = parseInt(logCheckResult.recordset[0].total_no_of_candidate_exited, 10) || 0;

              const updatedTotalEntered = currentTotalEntered + enteredDifference;
              const updatedTotalExited = currentTotalExited + exitedDifference;

              const updateLogRequest = conn.request();
              updateLogRequest.input('id', logId);
              updateLogRequest.input('updatedTotalEntered', updatedTotalEntered);
              updateLogRequest.input('updatedTotalExited', updatedTotalExited);
              updateLogRequest.input('updatedBy', updatedBy);

              await updateLogRequest.query(`
                  UPDATE tbl_kpi_dgs_entry_exit_log 
                  SET 
                      total_no_of_candidate_entered = @updatedTotalEntered,
                      total_no_of_candidate_exited = @updatedTotalExited,
                      updated_by = @updatedBy,
                      updated_date = GETDATE()
                  WHERE log_id = @id
              `);
          } else {
              const insertLogRequest = conn.request();
              insertLogRequest.input('year', year);
              insertLogRequest.input('month', month);
              insertLogRequest.input('type', type);
              insertLogRequest.input('totalSurveyCarriedEntered', parseInt(noOfCandidatesEntered, 10));
              insertLogRequest.input('totalSurveyCarriedExited', parseInt(noOfCandidatesExited, 10));
              insertLogRequest.input('updatedBy', updatedBy);

              await insertLogRequest.query(`
                  INSERT INTO tbl_kpi_dgs_entry_exit_log 
                  (year, month,type_id, total_no_of_candidate_entered, total_no_of_candidate_exited, created_by, created_date) 
                  VALUES (@year, @month, @type, @totalSurveyCarriedEntered, @totalSurveyCarriedExited, @updatedBy, GETDATE())
              `);
          }

          return res.status(201).json({ message: 'Entry and log data updated successfully.' });
      } else {
          return res.status(404).json({ message: 'No record found to update.' });
      }
  } catch (error) {
      //console.error("Error updating entry exit data:", error);
      return res.status(500).json({ message: 'Error updating entry exit data.' });
  }
}



async function getEntryExitData(req, res) {
  const conn = await pool;
  try {
    const result = await conn.query(`
        SELECT id,year,month,t.type_name,g.grade_name,no_of_candidates_entered,no_of_candidates_exited,created_date
         FROM
        tbl_kpi_dgs_entry_exit 
        LEFT JOIN mmt_kpi_dgs_grade g ON tbl_kpi_dgs_entry_exit.grade_id = g.grade_id
        LEFT JOIN mmt_kpi_dgs_type t ON tbl_kpi_dgs_entry_exit.type_id = t.type_id
    ORDER BY year DESC, month DESC;
    `);

    res.json(result.recordset);
  } catch (err) {
    //console.log(err);
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
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function getEntryExitDataByID(req, res) {
    const Id = req.params.Id;
    const conn = await pool;
    const request = conn.request();

    request.input("Id",Id);
    try {
      const result = await request.query(`
          SELECT
          *
          FROM tbl_kpi_dgs_entry_exit
          WHERE id = @Id
      `);
  
      res.json(result.recordset);
    } catch (err) {
      //console.log(err);
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
    //console.log(err);
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
    //console.log(err);
    return res.sendStatus(500);
  }
}

async function getAbstractEntryExitReport(req,res){
  const currentYear = new Date().getFullYear();
  const previousYear = new Date().getFullYear() - 1;
  const financialYear = `${previousYear}-${currentYear}`;
  const [startYear, endYear] = financialYear.split('-');

  const conn = await pool;
  const request = conn.request();

  try {
      const query = `
          SELECT 
              ty.type_name AS type_name,
              gr.grade_name AS grade_name,
              SUM(CASE WHEN ([year] = ${startYear} AND month >=4) OR ([year] =${endYear} AND month <=3) THEN no_of_candidates_entered ELSE 0 END) AS no_of_candidate_entered_prev,
              SUM(CASE WHEN ([year] = ${startYear} AND month >=4) OR ([year] =${endYear} AND month <=3) THEN no_of_candidates_exited ELSE 0 END) AS no_of_candidate_exited_prev,
              SUM(CASE WHEN ([year] = ${endYear} AND month BETWEEN 4 AND MONTH(GETDATE())-2) THEN no_of_candidates_entered ELSE 0 END) AS no_of_candidate_entered_upto,
              SUM(CASE WHEN ([year] = ${endYear} AND month BETWEEN 4 AND MONTH(GETDATE())-2)  THEN no_of_candidates_exited ELSE 0 END) AS no_of_candidate_exited_upto,
              SUM(CASE WHEN ([year] = ${endYear} AND [month] = MONTH(GETDATE())-1) THEN no_of_candidates_entered ELSE 0 END) AS no_of_candidate_entered_during,
              SUM(CASE WHEN ([year] = ${endYear} AND [month] = MONTH(GETDATE())-1) THEN no_of_candidates_exited ELSE 0 END) AS no_of_candidate_exited_during,
              SUM(CASE WHEN ([year] = ${endYear} AND month BETWEEN 4 AND MONTH(GETDATE())-1) THEN no_of_candidates_entered ELSE 0 END) AS total_no_of_candidates_entered,
              SUM(CASE WHEN ([year] = ${endYear} AND month BETWEEN 4 AND MONTH(GETDATE())-1) THEN no_of_candidates_exited ELSE 0 END) AS total_no_of_candidates_exited
          FROM tbl_kpi_dgs_entry_exit  exi
              LEFT JOIN mmt_kpi_dgs_type ty ON exi.type_id = ty.type_id
              LEFT JOIN mmt_kpi_dgs_grade gr ON exi.grade_id = gr.grade_id
          GROUP BY ty.type_name,gr.grade_name
          ORDER BY ty.type_name`;

      const result = await request.query(query);

      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available' });
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear(); // Get the current year

      // Calculate month -2 (two months ago) and month -3 (three months ago)
      const monthMinus2 = new Date(currentDate);
      monthMinus2.setMonth(currentDate.getMonth() - 2); // Month -2 (two months ago)
      const monthMinus2Year = monthMinus2.getFullYear();

      const monthMinus3 = new Date(currentDate);
      monthMinus3.setMonth(currentDate.getMonth() - 3); // Month -3 (three months ago)
      const monthMinus3Year = monthMinus3.getFullYear();

      // Get full month name for month -2
      const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
      // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;


      // Get the last date of month -2
      const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
      const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');

      // Get the last date of month -3
      const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
      const lastDateOfMonthMinus3Formatted = lastDateOfMonthMinus3.toLocaleDateString('en-GB');

      // Financial year calculation based on the previous month
      let previousFinancialYear, currentFinancialYear;
      if (monthMinus2.getMonth() + 1 >= 4) {
          previousFinancialYear = `${currentYear - 1}-${currentYear}`;
          currentFinancialYear = `${currentYear}-${currentYear + 1}`;
      } else {
          previousFinancialYear = `${currentYear - 2}-${currentYear - 1}`;
          currentFinancialYear = `${currentYear - 1}-${currentYear}`;
      }

      // // Output results
      // console.log(`Previous Financial Year: ${previousFinancialYear}`);
      // console.log(`Current Financial Year: ${currentFinancialYear}`);
      // console.log(`Month -2 Full Name: ${monthMinus2Name}-${monthMinus2Year}`);
      // console.log(`Month -2 Last Date: ${lastDateOfMonthMinus2Formatted}`);
      // console.log(`Month -3 Last Date: ${lastDateOfMonthMinus3Formatted}`);

      
          let columnDefs = [
              {
                  headerName: "Type",
                  field: "type_name",
                  headerClass: "headercenter",
                  cellStyle: {textAlign: 'center'}
              },
              {
                  headerName: `Grade`,
                  field: "grade_name",
                  headerClass: "headercenter"
              },
              {
                headerName:  `During the Previous FY (${previousFinancialYear})`,
                field: "During the Previous FY",
                headerClass : "headercenter",
                children: [
                  {
                    headerName: `No of candidates entered the system (i.e.Assessment done)`,
                    field: "no_of_candidate_entered_prev",
                    headerClass: "headercenter"
                  },
                  {
                      headerName: `No of candidates exited the system (i.e.COC Issued)`,
                      field: "no_of_candidate_exited_prev",
                      headerClass: "headercenter"
                  }
                ]
              },
              {
                headerName: `During the Current FY-upto ${lastDateOfMonthMinus3Formatted}`,
                field: "During the Current Year - Upto the month",
                headerClass : "headercenter",
                children: [
                  {
                    headerName: `No of candidates entered the system (i.e.Assessment done)`,
                    field: "no_of_candidate_entered_upto",
                    headerClass: "headercenter"
                  },
                  {
                      headerName: `No of candidates exited the system (i.e.COC Issued)`,
                      field: "no_of_candidate_exited_upto",
                      headerClass: "headercenter"
                  }
                ]
              },
              {
                headerName: `During the month (${monthMinus2Name}-${monthMinus2Year})`,
                field: "During the month",
                headerClass : "headercenter",
                children: [
                  {
                    headerName: `No of candidates entered the system (i.e.Assessment done)`,
                    field: "no_of_candidate_entered_during",
                    headerClass: "headercenter"
                  },
                  {
                      headerName: `No of candidates exited the system (i.e.COC Issued)`,
                      field: "no_of_candidate_exited_during",
                      headerClass: "headercenter"
                  }
                ]
              },
              {
                // headerName: `Total for the Current FY (${endYear}-${parseInt(endYear)+1})`,
                headerName: `Total for the current FY up to ${lastDateOfMonthMinus2Formatted}`,

                field: "During the month",
                headerClass : "headercenter",
                children: [
                  {
                    headerName: `No of candidates entered the system (i.e.Assessment done)`,
                    field: "total_no_of_candidates_entered",
                    headerClass: "headercenter"
                  },
                  {
                      headerName: `No of candidates exited the system (i.e.COC Issued)`,
                      field: "total_no_of_candidates_exited",
                      headerClass: "headercenter"
                  }
                ]
              }
          ];

      res.json({ columnDefs, rowData });
  }catch(error){
      //console.error('Error fetching marine casualty data:', error);
      //console.log("error ",error.message);
      res.status(500).json({ error});
  }
}

async function getMonthlyEntryExitReport(req,res){
  const currentYear = new Date().getFullYear();
  const previousYear = new Date().getFullYear() - 1;
  const financialYear = `${previousYear}-${currentYear}`;
  const [startYear, endYear] = financialYear.split('-');

  const conn = await pool;
  const request = conn.request();
  request.input('endYear', endYear);
  request.input('nextYear',endYear+1);

  try {
    const query = `
    SELECT
        mmt.type_name AS 'type',
        'Total Candidates Entered' AS category,
        SUM(CASE WHEN year = @endYear   AND  month = 4 THEN total_no_of_candidate_entered ELSE 0 END) AS April,
        SUM(CASE WHEN year = @endYear   AND  month = 5 THEN total_no_of_candidate_entered ELSE 0 END) AS May,
        SUM(CASE WHEN year = @endYear   AND  month = 6 THEN total_no_of_candidate_entered ELSE 0 END) AS June,
        SUM(CASE WHEN year = @endYear   AND  month = 7 THEN total_no_of_candidate_entered ELSE 0 END) AS July,
        SUM(CASE WHEN year = @endYear   AND  month = 8 THEN total_no_of_candidate_entered ELSE 0 END) AS August,
        SUM(CASE WHEN year = @endYear   AND  month = 9 THEN total_no_of_candidate_entered ELSE 0 END) AS September,
        SUM(CASE WHEN year = @endYear   AND  month = 10 THEN total_no_of_candidate_entered ELSE 0 END) AS October,
        SUM(CASE WHEN year = @endYear   AND  month = 11 THEN total_no_of_candidate_entered ELSE 0 END) AS November,
        SUM(CASE WHEN year = @endYear   AND  month = 12 THEN total_no_of_candidate_entered ELSE 0 END) AS December,
        SUM(CASE WHEN year = @nextYear AND  month = 1 THEN total_no_of_candidate_entered ELSE 0 END) AS January,
        SUM(CASE WHEN year = @nextYear AND  month = 2 THEN total_no_of_candidate_entered ELSE 0 END) AS February,
        SUM(CASE WHEN year = @nextYear AND  month = 3 THEN total_no_of_candidate_entered ELSE 0 END) AS March
        FROM tbl_kpi_dgs_entry_exit_log log
        LEFT JOIN mmt_kpi_dgs_type mmt ON log.type_id = mmt.type_id
        GROUP BY mmt.type_name
        UNION ALL
        SELECT
        mmt.type_name AS 'type',
        'Total Candidates Exited' AS category,
        SUM(CASE WHEN year = @endYear AND month = 4 THEN total_no_of_candidate_exited ELSE 0 END) AS April,
        SUM(CASE WHEN year = @endYear AND month = 5 THEN total_no_of_candidate_exited ELSE 0 END) AS May,
        SUM(CASE WHEN year = @endYear AND month = 6 THEN total_no_of_candidate_exited ELSE 0 END) AS June,
        SUM(CASE WHEN year = @endYear AND month = 7 THEN total_no_of_candidate_exited ELSE 0 END) AS July,
        SUM(CASE WHEN year = @endYear AND month = 8 THEN total_no_of_candidate_exited ELSE 0 END) AS August,
        SUM(CASE WHEN year = @endYear AND month = 9 THEN total_no_of_candidate_exited ELSE 0 END) AS September,
        SUM(CASE WHEN year = @endYear AND month = 10 THEN total_no_of_candidate_exited ELSE 0 END) AS October,
        SUM(CASE WHEN year = @endYear AND month = 11 THEN total_no_of_candidate_exited ELSE 0 END) AS November,
        SUM(CASE WHEN year = @endYear AND month = 12 THEN total_no_of_candidate_exited ELSE 0 END) AS December,
        SUM(CASE WHEN year = @nextYear AND month = 1 THEN total_no_of_candidate_exited ELSE 0 END) AS January,
        SUM(CASE WHEN year = @nextYear AND month = 2 THEN total_no_of_candidate_exited ELSE 0 END) AS February,
        SUM(CASE WHEN year = @nextYear AND month = 3 THEN total_no_of_candidate_exited ELSE 0 END) AS March
      FROM tbl_kpi_dgs_entry_exit_log log
      LEFT JOIN mmt_kpi_dgs_type mmt ON log.type_id = mmt.type_id
      GROUP BY mmt.type_name
      ORDER BY mmt.type_name`;

      const result = await request.query(query);

      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available' });
      }
      
      const columnDefs = [
          { headerName: "Type", field: "type", pinned: "left", width: 150 },
          { headerName: "Category", field: "category", pinned: "left", width: 200 },
          { headerName: "April", field: "April", width: 100 },
          { headerName: "May", field: "May", width: 100 },
          { headerName: "June", field: "June", width: 100 },
          { headerName: "July", field: "July", width: 100 },
          { headerName: "August", field: "August", width: 100 },
          { headerName: "September", field: "September", width: 100 },
          { headerName: "October", field: "October", width: 100 },
          { headerName: "November", field: "November", width: 100 },
          { headerName: "December", field: "December", width: 100 },
          { headerName: "January", field: "January", width: 100 },
          { headerName: "February", field: "February", width: 100 },
          { headerName: "March", field: "March", width: 100 }
    ];

      res.json({ columnDefs, rowData });
  }catch(error){
      //console.log("error ",error.message);
      res.status(500).json({ error});
  }
}


async function getYearlyEntryExitReport(req, res) {
  const conn = await pool;
  const request = conn.request();

  try {
    const mainQuery = `
      WITH FinancialYears AS (
          SELECT CONCAT('FY', year, '-', year + 1) AS financial_year
          FROM (VALUES (2014), (2015), (2016), (2017), (2018), (2019), 
                       (2020), (2021), (2022), (2023), (2024), (2025)) AS Years(year)
      ),
      EntryExitData AS (
          SELECT 
              CASE 
                  WHEN log.[month] BETWEEN 4 AND 12 THEN CONCAT('FY', log.[year], '-', log.[year] + 1)
                  ELSE CONCAT('FY', log.[year] - 1, '-', log.[year])
              END AS financial_year,
              type.type_name,
              SUM(log.total_no_of_candidate_entered) AS total_entered,
              SUM(log.total_no_of_candidate_exited) AS total_exited
          FROM tbl_kpi_dgs_entry_exit_log AS log
          JOIN mmt_kpi_dgs_type AS type ON log.type_id = type.type_id
          WHERE log.[year] >= 2014 AND log.[year] <= 2025
          GROUP BY 
              CASE 
                  WHEN log.[month] BETWEEN 4 AND 12 THEN CONCAT('FY', log.[year], '-', log.[year] + 1)
                  ELSE CONCAT('FY', log.[year] - 1, '-', log.[year])
              END,
              type.type_name
      )
      SELECT 
          f.financial_year,
          e.type_name,
          ISNULL(e.total_entered, 0) AS total_entered,
          ISNULL(e.total_exited, 0) AS total_exited
      FROM FinancialYears f
      LEFT JOIN EntryExitData e ON f.financial_year = e.financial_year
      ORDER BY f.financial_year, e.type_name;
    `;

    const result = await request.query(mainQuery);
    const dynamicColumns = [...new Set(result.recordset.map(row => row.financial_year))];

    const columnDefs = [
      { headerName: "Type Name", field: "type_name", pinned: "left", width: 200 },
      { headerName: "Category", field: "Category", pinned: "left", width: 200 },
      ...dynamicColumns.map(col => ({
        headerName: col,
        field: col,
        width: 150
      }))
    ];

    const rowData = [];
    const validRecords = result.recordset.filter(row => row.type_name !== null);

const types = [...new Set(validRecords.map(row => row.type_name))];

types.forEach(typeName => {
  const enteredRow = { Category: 'Total No. of Candidates Entered', type_name: typeName };
  const exitedRow = { Category: 'Total No. of Candidates Exited', type_name: typeName };

  dynamicColumns.forEach(financialYear => {
    const data = validRecords.find(row => row.financial_year === financialYear && row.type_name === typeName);
    enteredRow[financialYear] = data ? data.total_entered : 0;
    exitedRow[financialYear] = data ? data.total_exited : 0;
  });

  rowData.push(enteredRow, exitedRow);
});

    res.json({ columnDefs, rowData });
  } catch (error) {
    console.log("error ", error.message);
    res.status(500).json({ error });
  }
}


const entryExitTab = { addEntryExitData, getEntryExitData, getEntryExitDataByID, updateEntryExitData, getAbstractEntryExitReport,
  getMonthlyEntryExitReport, getYearlyEntryExitReport};

export default entryExitTab;
