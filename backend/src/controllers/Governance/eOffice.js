import { pool } from "../../db.js";
import sql from 'mssql';

async function getFilePendenceReport(req, res) {
    try {
        const year = req.params.Year;
        const month = req.params.Month;
        const week = req.params.Week;   

        const conn = await pool;
        const request = conn.request();

        request.input("year", year); 
        request.input("month", month);
        request.input("week", week); 

        const result = await request.query(` SELECT
          Emp_Id as [Emp ID],
          --Emp_Name as [Emp Name],
          --Designation,Wing,Division,
          (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id) AS [Emp Name],
          (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id) AS Designation,
          (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id)) AS [Wing],
          (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id)) AS [Division],
          [>30days] AS [Greater than 30 days],[16-30Days] AS [16-30 Days],
          [7-15Days] AS [7-15 Days],[4-6Days] AS [4-6 Days],[0-3Days] AS [0-3 Days],[Total Pendency],Year,Month,
          CASE
            WHEN week = 1 THEN 'Week 1'
            WHEN week = 2 THEN 'Week 2'
            WHEN week = 3 THEN 'Week 3'
            WHEN week = 4 THEN 'Week 4'
            WHEN week = 5 THEN 'Week 5'
            ELSE 'Unknown Week'
          END AS Week
          FROM tbl_file_pendancy
          WHERE
            tbl_file_pendancy.Year = @year AND tbl_file_pendancy.Month = @month AND tbl_file_pendancy.week = @week
            ORDER BY Wing,Division;
        `); 
             
      
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        
      // Extract data from the result
      // const rowData = result.recordset;  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));
    
      res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } finally {
      await sql.close();
    }
    
}

async function getReceiptPendenceReport(req, res) {
  try {
      const year = req.params.Year;
      const month = req.params.Month; 
      const week = req.params.Week; 

      const conn = await pool;
      const request = conn.request();

      request.input("year", year); 
      request.input("month", month);
      request.input("week", week); 

      const result = await request.query(` SELECT
        Emp_Id as [Emp ID],
        --Emp_Name as [Emp Name],
        (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id) AS [Emp Name],
        (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id) AS Designation,
        (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id)) AS [Wing],
        (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id)) AS [Division],
        --Designation,Wing,Division,
        [>30days] AS [Greater Than 30 days],[16-30Days] AS [16-30 Days],
        [7-15Days] AS [7-15 Days],[4-6Days] AS [4-6 Days],[0-3Days] AS [0-3 Days],[Total Pendency],Year,Month,
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
          FROM tbl_receipt_pendency
        WHERE
          tbl_receipt_pendency.Year = @year AND tbl_receipt_pendency.Month = @month AND tbl_receipt_pendency.week = @week
          ORDER BY Wing,Division;
      `);
      
      const rowData = result.recordset;  
      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }

      
    // Extract data from the result
    // const rowData = result.recordset;  
    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1), 
      field: key,
    }));
  
    res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  } finally {
    await sql.close();
  }
  
}

async function getFileDisposalReport(req, res) {
  try {
      const year = req.params.Year;
      const month = req.params.Month; 
      const week = req.params.Week; 

      const conn = await pool;
      const request = conn.request();

      request.input("month", month);
      request.input("year", year);
      request.input("week", week); 

      const result = await request.query(` SELECT
        [Emp Id],
        --[Emp Name],
        (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS [Emp Name],
        (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS Designation,
        (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Wing],
        (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Division],
        (SELECT TOP 1 level FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS Level,
        --[Designation],[Wing],[Division],
        [Count of Transactions],
        [Counts of Files], [Average Response Time],[Average Response Time] AS [Average Response Days],Year,Month,
          CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
            FROM tbl_file_disposal
            WHERE
            tbl_file_disposal.Year = @year AND tbl_file_disposal.Month = @month AND tbl_file_disposal.week = @week
            ORDER BY Wing,Division;
      `);
      
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }

      
    // Extract data from the result
    // const rowData = result.recordset;  
    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1), 
      field: key,
    }));
  
    res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  } finally {
    await sql.close();
  }
  
}

async function getFileDisposalChart(req, res) {
  try {
    const year = req.params.Year;
    const month = req.params.Month;
    let hierarchyParam = req.params.Hierarchy; 
    // console.log("Hierarchy", hierarchyParam);

    const conn = await pool;
    const request = conn.request();

    request.input("month", month);
    request.input("year", year);

    let queryPromises = [];
    let HierarchyData = ["JS", "DSDIR", "US", "SO", "ASO", "YP"];
    
    for (let i = 0; i < HierarchyData.length; i++) {
      let whereCondition = '';
      if (HierarchyData[i] === "DSDIR") {
        const ds = "DS";
        const dir = "DIR";
        whereCondition = `WHERE tbl_file_disposal.Year = @year AND tbl_file_disposal.Month = @month AND (tbl_file_disposal.[Emp Id] LIKE '${ds}%' OR tbl_file_disposal.[Emp Id] LIKE '${dir}%')`;
      } else {
        const hierarchyParamName = `Hierarchy${i}`; 
        request.input(hierarchyParamName, HierarchyData[i]);
        whereCondition = `WHERE tbl_file_disposal.Year = @year AND tbl_file_disposal.Month = @month AND tbl_file_disposal.[Emp Id] LIKE @${hierarchyParamName} + '%'`;
      }

      let query = `
      SELECT
        [Emp Id],
        [Average Response Time],
        [Counts of Files],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_file_disposal
        ${whereCondition}
      ORDER BY 
        Wing, Year, Week, Division
      ;`;
      queryPromises.push(request.query(query));
    }

    const results = await Promise.all(queryPromises);

    let responseData = {};
    HierarchyData.forEach((hierarchy, index) => {
      responseData[hierarchy] = results[index].recordset;
    });

    res.json(responseData);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

//History
async function getFilePendencyHistory(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(`SELECT 
          File_name AS [File Name],  [tbl_user].name AS [Uploaded By],
          tbl_eoffice_file_pendancy_file.date_of_upload AS [Date of Upload]
          FROM tbl_eoffice_file_pendancy_file
          INNER JOIN tbl_user ON tbl_eoffice_file_pendancy_file.uploaded_by = tbl_user.user_id;
      `);

      const rowData = result.recordset;  
      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available' });
      }
  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
          headerName: key.charAt(0).toUpperCase() + key.slice(1), 
          field: key,
      }));

       res.json({ columnDefs, rowData });

  
  } catch (error) {
      return res.sendStatus(500);
  }
}

async function getReceiptPendencyHistory(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(` SELECT
          File_name AS [File Name],  [tbl_user].name AS [Uploaded By],
          tbl_eoffice_receipt_pendency_file.date_of_upload AS [Date of Upload]
          FROM tbl_eoffice_receipt_pendency_file
          INNER JOIN tbl_user ON tbl_eoffice_receipt_pendency_file.uploaded_by = tbl_user.user_id;
      `);

      const rowData = result.recordset;  
      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available' });
      }
  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
          headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
          field: key,
      }));

       res.json({ columnDefs, rowData });

  
  } catch (error) {
      return res.sendStatus(500);
  }
}

async function getFileDisposalHistory(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(` SELECT
          File_name AS [File Name], [tbl_user].name AS [Uploaded By],
          tbl_eoffice_file_disposal_file.date_of_upload AS [Date of Upload]
          FROM tbl_eoffice_file_disposal_file
          INNER JOIN tbl_user ON tbl_eoffice_file_disposal_file.uploaded_by = tbl_user.user_id;
      `);

      const rowData = result.recordset;  
      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available' });
      }
  
      const columnDefs = Object.keys(rowData[0]).map(key => ({
          headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
          field: key,
      }));

       res.json({ columnDefs, rowData });

  
  } catch (error) {
      return res.sendStatus(500);
  }
}

//Get latest file year and month
async function getFilePendenceCheck(req,res){
  const conn = await pool;
    try {
        const result = await conn.query(`SELECT Top 1 Month, Year, week as Week
        FROM tbl_file_pendancy
        WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
            SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
            FROM tbl_file_pendancy)
            ORDER BY Year DESC, Month DESC, week DESC;  
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getReceiptPendenceCheck(req,res){
  const conn = await pool;
    try {
        const result = await conn.query(`SELECT Top 1 Month, Year, week as Week
        FROM tbl_receipt_pendency
        WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
            SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
            FROM tbl_receipt_pendency)
            ORDER BY Year DESC, Month DESC, week DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getFileDisposalCheck(req,res){
  const conn = await pool;
    try {
        const result = await conn.query(`SELECT Top 1 Month, Year, week as Week
        FROM tbl_file_disposal
        WHERE CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01') = (
            SELECT MAX(CONVERT(date, CONVERT(varchar, Year) + '-' + CONVERT(varchar, Month) + '-01'))
            FROM tbl_file_disposal)
            ORDER BY Year DESC, Month DESC, week DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// All data

async function getFilePendenceAll(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();
      // console.log("hit");
      
      const result = await request.query(`SELECT
          Emp_Id AS [Emp ID],
          --Emp_Name AS [Emp Name],
          (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id) AS [EMP Name],
          (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id) AS Designation,
          (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id)) AS [Wing],
          (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_pendancy.Emp_Id)) AS [Division],
          [>30days] AS [Greater than 30 days],
          [16-30Days] AS [16-30 Days],
          [7-15Days] AS [7-15 Days],
          [4-6Days] AS [4-6 Days],
          [0-3Days] AS [0-3 Days],
          [Total Pendency],
          Year,
          Month,
            CASE
                WHEN week = 1 THEN 'Week 1'
                WHEN week = 2 THEN 'Week 2'
                WHEN week = 3 THEN 'Week 3'
                WHEN week = 4 THEN 'Week 4'
                WHEN week = 5 THEN 'Week 5'
                ELSE 'Unknown Week'
            END AS WeekName
        FROM tbl_file_pendancy
        CROSS APPLY (
            SELECT 
                CASE 
                    WHEN Month = 'January' THEN 1
                    WHEN Month = 'February' THEN 2
                    WHEN Month = 'March' THEN 3
                    WHEN Month = 'April' THEN 4
                    WHEN Month = 'May' THEN 5
                    WHEN Month = 'June' THEN 6
                    WHEN Month = 'July' THEN 7
                    WHEN Month = 'August' THEN 8
                    WHEN Month = 'September' THEN 9
                    WHEN Month = 'October' THEN 10
                    WHEN Month = 'November' THEN 11
                    ELSE 12
                END AS MonthNumber
        ) AS MonthNumbers
        ORDER BY Year DESC, MonthNumber DESC, week DESC, [Wing], [Division];
    `);

      // const result = await request.query(` SELECT
      //   Emp_Id as [Emp ID],
      //   Emp_Name as [Emp Name],
      //   --Designation,Wing,Division,
      //   (SELECT Designation FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS Designation,
      //   (SELECT wing_name FROM mmt_organization_info WHERE organization_id = (SELECT organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Wing],
      //   (SELECT division_name FROM mmt_organization_info WHERE organization_id = (SELECT organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Division],
      //   [>30days] AS [Greater than 30 days],[16-30Days] AS [16-30 Days],
      //   [7-15Days] AS [7-15 Days],[4-6Days] AS [4-6 Days],[0-3Days] AS [0-3 Days],[Total Pendency],Year,Month,
      //   CASE
      //     WHEN week = 1 THEN 'Week 1'
      //     WHEN week = 2 THEN 'Week 2'
      //     WHEN week = 3 THEN 'Week 3'
      //     WHEN week = 4 THEN 'Week 4'
      //     ELSE 'Unknown Week'
      //   FROM tbl_file_pendancy
      //   CROSS APPLY (
      //     SELECT 
      //         CASE 
      //             WHEN Month = 'January' THEN 1
      //             WHEN Month = 'February' THEN 2
      //             WHEN Month = 'March' THEN 3
      //             WHEN Month = 'April' THEN 4
      //             WHEN Month = 'May' THEN 5
      //             WHEN Month = 'June' THEN 6
      //             WHEN Month = 'July' THEN 7
      //             WHEN Month = 'August' THEN 8
      //             WHEN Month = 'September' THEN 9
      //             WHEN Month = 'October' THEN 10
      //             WHEN Month = 'November' THEN 11
      //             ELSE 12
      //         END AS MonthNumber
      //       ) AS MonthNumbers
      //     ORDER BY Year DESC, MonthNumber DESC, week DESC, [Wing], [Division];
      // `); 
           
    
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }

      
    // Extract data from the result
    // const rowData = result.recordset;  
    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1), 
      field: key,
    }));
  
    res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  } finally {
    await sql.close();
  }
  
}

async function getReceiptPendenceAll(req, res) {
  try {

      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`SELECT
          Emp_Id AS [Emp ID],
          --Emp_Name AS [Emp Name],
          (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id) AS [EMP Name],
          (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id) AS Designation,
          (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id)) AS [Wing],
          (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_receipt_pendency.Emp_Id)) AS [Division],
          [>30days] AS [Greater than 30 days],
          [16-30Days] AS [16-30 Days],
          [7-15Days] AS [7-15 Days],
          [4-6Days] AS [4-6 Days],
          [0-3Days] AS [0-3 Days],
          [Total Pendency],
          Year,
          Month,
            CASE
                WHEN week = 1 THEN 'Week 1'
                WHEN week = 2 THEN 'Week 2'
                WHEN week = 3 THEN 'Week 3'
                WHEN week = 4 THEN 'Week 4'
                WHEN week = 5 THEN 'Week 5'
                ELSE 'Unknown Week'
            END AS WeekName
        FROM tbl_receipt_pendency
        CROSS APPLY (
            SELECT 
                CASE 
                    WHEN Month = 'January' THEN 1
                    WHEN Month = 'February' THEN 2
                    WHEN Month = 'March' THEN 3
                    WHEN Month = 'April' THEN 4
                    WHEN Month = 'May' THEN 5
                    WHEN Month = 'June' THEN 6
                    WHEN Month = 'July' THEN 7
                    WHEN Month = 'August' THEN 8
                    WHEN Month = 'September' THEN 9
                    WHEN Month = 'October' THEN 10
                    WHEN Month = 'November' THEN 11
                    ELSE 12
                END AS MonthNumber
        ) AS MonthNumbers
        ORDER BY Year DESC, MonthNumber DESC, week DESC, [Wing], [Division];
    `);
  
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }

      
    // Extract data from the result
    // const rowData = result.recordset;  
    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1), 
      field: key,
    }));

    res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  } finally {
    await sql.close();
  }

}

async function getFileDisposalAll(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(` SELECT
        [Emp Id],
        --[Emp Name],
        (SELECT TOP 1 Emp_Name FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS [EMP Name],
        (SELECT TOP 1 Designation FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id]) AS Designation,
        (SELECT TOP 1 wing_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Wing],
        (SELECT TOP 1 division_name FROM mmt_organization_info WHERE organization_id = (SELECT TOP 1 organization_id FROM mmt_employee_info WHERE Emp_Id = tbl_file_disposal.[Emp Id])) AS [Division],
        --[Designation],[Wing],[Division],
        [Count of Transactions],
        [Counts of Files], [Average Response Time],[Average Response Time] AS [Average Response Days],Year,Month,
          CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
          FROM tbl_file_disposal
          CROSS APPLY (
            SELECT 
                CASE 
                    WHEN Month = 'January' THEN 1
                    WHEN Month = 'February' THEN 2
                    WHEN Month = 'March' THEN 3
                    WHEN Month = 'April' THEN 4
                    WHEN Month = 'May' THEN 5
                    WHEN Month = 'June' THEN 6
                    WHEN Month = 'July' THEN 7
                    WHEN Month = 'August' THEN 8
                    WHEN Month = 'September' THEN 9
                    WHEN Month = 'October' THEN 10
                    WHEN Month = 'November' THEN 11
                    ELSE 12
                 END AS MonthNumber
            ) AS MonthNumbers
          ORDER BY Year DESC, MonthNumber DESC, week DESC, [Wing], [Division];
      `);
      
      const rowData = result.recordset; 
      
      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this selection' });
      }

      
    // Extract data from the result
    // const rowData = result.recordset;  
    const columnDefs = Object.keys(rowData[0]).map(key => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1), 
      field: key,
    }));

    res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  } finally {
    await sql.close();
  }

}

async function getReceiptPendancyChart(req, res) {
  try {
    const { Month, Year } = req.params;
    
    const conn = await pool;
    const request = conn.request();

    // Input parameters for the query
    request.input("month", Month);
    request.input("year", Year);

    let query = `
      SELECT
        SUM([Total Pendency]) AS [Total Pendency],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_receipt_pendency
      WHERE tbl_receipt_pendency.Year = @year AND tbl_receipt_pendency.Month = @month
      GROUP BY 
        [Year], [Month], 
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END
      ORDER BY 
        [Year], [Week];`;

    const results = await request.query(query);

    res.json(results.recordset);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFilePendancyChart(req, res) {
  try {
    const { Month, Year } = req.params;
    
    const conn = await pool;
    const request = conn.request();

    // Input parameters for the query
    request.input("month", Month);
    request.input("year", Year);

    let query = `
      SELECT
        SUM([Total Pendency]) AS [Total Pendency],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_file_pendancy
      WHERE tbl_file_pendancy.Year = @year AND tbl_file_pendancy.Month = @month
      GROUP BY 
        [Year], [Month], 
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END
      ORDER BY 
        [Year], [Week];`;

    const results = await request.query(query);

    res.json(results.recordset);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}


const eOfficeTab = { 
  getFilePendenceReport, getReceiptPendenceReport, getFileDisposalReport,
  getFileDisposalChart, //File Disposal Chart
  getFileDisposalHistory, getReceiptPendencyHistory, getFilePendencyHistory, getFilePendenceCheck, 
  getReceiptPendenceCheck, getFileDisposalCheck, getFilePendenceAll, getReceiptPendenceAll, getFileDisposalAll,
  getReceiptPendancyChart, //Receipt Pendency Chart
  getFilePendancyChart,//Receipt Pendency Chart
};

export default eOfficeTab;