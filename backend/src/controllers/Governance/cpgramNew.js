import { pool } from "../../db.js";
import sql from 'mssql';

// Report fetch
async function getCategoryReport(req, res) {
    try {
        const month = req.params.Month;  
        const year = req.params.Year;

        const conn = await pool;
        const request = conn.request();

        request.input("month", month);
        request.input("year", year); 

        const result = await request.query(` SELECT
        [Grievance Category],[Brought Forward],[Received During],[Disposed During],
        [Pending During],Month,Year
          FROM tbl_category_cpgram
          WHERE
          tbl_category_cpgram.Year = @year AND tbl_category_cpgram.Month = @month;
        `);
        
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this month and year' });
        } 

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

async function getProgressReport(req, res) {
  try {
      const month = req.params.Month;  
      const year = req.params.Year;

      const conn = await pool;
      const request = conn.request();

      request.input("month", month);
      request.input("year", year); 

      const result = await request.query(` SELECT
        [Grievance Source],[Brought Forward],[Receipt During Period],[Total Receipt],[Grievances Disposed During Period],
        [Closing Balance],[Yet to Assess],[At Our Office],[With Subordinate]
        FROM tbl_progress_cpgram
        WHERE
        tbl_progress_cpgram.Year = @year AND tbl_progress_cpgram.Month = @month;
      `);
      
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this month and year' });
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

async function getPH3Report(req, res) {
  try {
      const month = req.params.Month;  
      const year = req.params.Year;

      const conn = await pool;
      const request = conn.request();

      request.input("month", month);
      request.input("year", year); 

      const result = await request.query(` SELECT
        [Name],[Brought Forward],[Received During],[Disposed During],
        [Average Disposal Days],[Total Pending As On ToDate],[More Than 1 Year] AS [>1 Year],[>21 Days],[<=21 Days],
        [Between 181 to 365Days] AS [181-365 Days],[Between 91 to 180Days] AS [91-180 Days],[Between 61 to 90Days] AS [61-90 Days],
        [Between 46 to 60Days] AS [46-60 Days],[Between 31 to 45Days] AS [31-45 Days],[Between 22 to 30Days] AS [22-30 Days],[Between 11 to 21Days] AS [11-21 Days],
        [Between 0 to 10Days] AS [0-10 Days] 
        FROM tbl_PH3_cpgram
        WHERE
        tbl_PH3_cpgram.Year = @year AND tbl_PH3_cpgram.Month = @month;
      `);
      
      const rowData = result.recordset;  

      if (rowData.length === 0) {
          return res.status(404).json({ error: 'No data available for this month and year' });
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

async function getAgeReport(req, res) {
    try {
        const month = req.params.Month;  
        const year = req.params.Year;
  
        const conn = await pool;
        const request = conn.request();
  
        request.input("month", month);
        request.input("year", year); 
  
        const result = await request.query(` SELECT
        [Brought Forwarded],[Grievance(s) Received],[Grievance(s) Disposed],[Average Disposal Time(Days)],[Pending as of now],
        [Pending <=21 Days],[Pending >21 Days],[Pending 0-10 Days],[Pending 11-21 Days],[Pending 22-30 Days],
        [Pending 31-45 Days],[Pending 46-60 Days],[Pending 61-90 Days],
        [Pending 91-180 Days],[Pending 181-365 Days],[Pending from more than a year],
        [Year],[Month]
        FROM tbl_age_cpgram
        WHERE
        tbl_age_cpgram.Year = @year AND tbl_age_cpgram.Month = @month;  
        `);
        
        const rowData = result.recordset;  
  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this month and year' });
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


  // For file history
  async function getCPGRAMHistory(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT 
                file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
                tbl_Cpgram_Category_file.date_of_upload AS [Date of Upload]
                --FORMAT(CONVERT(datetime, tbl_Cpgram_Category_file.date_of_upload), 'dd-MM-yyyy') AS [Date of Upload]
                FROM tbl_Cpgram_Category_file
                INNER JOIN tbl_user ON tbl_Cpgram_Category_file.uploaded_by = tbl_user.user_id;
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

async function getCPGRAMProgressHistory(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(`SELECT
              file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
              tbl_Cpgram_Progress_file.date_of_upload AS [Date of Upload]
              FROM tbl_Cpgram_Progress_file
              INNER JOIN tbl_user ON tbl_Cpgram_Progress_file.uploaded_by = tbl_user.user_id;
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

async function getCPGRAMPH3History(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(`SELECT
              file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
              tbl_Cpgram_PH3_file.date_of_upload AS [Date of Upload]
              FROM tbl_Cpgram_PH3_file
              INNER JOIN tbl_user ON tbl_Cpgram_PH3_file.uploaded_by = tbl_user.user_id;
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

async function getCPGRAMAgeHistory(req, res) {
  const conn = await pool;

  try {
      const result = await conn.query(`SELECT
              file_name AS [File Name],  [tbl_user].name AS [Uploaded By],
              tbl_Cpgram_Age_file.date_of_upload AS [Date of Upload]
              FROM tbl_Cpgram_Age_file
              INNER JOIN tbl_user ON tbl_Cpgram_Age_file.uploaded_by = tbl_user.user_id;
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

//All data
    async function getCategoryAllReport(req, res) {
      try {
            const conn = await pool;
            const request = conn.request();

            const result = await request.query(` SELECT
            [Grievance Category],[Brought Forward],[Received During],[Disposed During],
            [Pending During],Month,Year
            FROM tbl_category_cpgram
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
              ORDER BY Year DESC, MonthNumber DESC, ID;
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

          } catch (err) {
            console.error(err.message);
            res.status(500).send('Internal Server Error');
          } finally {
            await sql.close();
          }
      
    }

    async function getProgressAllReport(req, res) {
      try {
          const conn = await pool;
          const request = conn.request();

          const result = await request.query(` SELECT
            [Grievance Source],[Brought Forward],[Receipt During Period],[Total Receipt],[Grievances Disposed During Period],
            [Closing Balance],[Yet to Assess],[At Our Office],[With Subordinate],Month,Year
            FROM tbl_progress_cpgram
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
              ORDER BY Year DESC, MonthNumber DESC, ID;
          `);
          
          const rowData = result.recordset;  

          if (rowData.length === 0) {
              return res.status(404).json({ error: 'No data available' });
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

    async function getPH3AllReport(req, res) {
      try {
          const conn = await pool;
          const request = conn.request();

          const result = await request.query(` SELECT
            [Name],[Brought Forward],[Received During],[Disposed During],
            [Average Disposal Days],[Total Pending As On ToDate],[More Than 1 Year] AS [>1 Year],[>21 Days],[<=21 Days],
            [Between 181 to 365Days] AS [181-365 Days],[Between 91 to 180Days] AS [91-180 Days],[Between 61 to 90Days] AS [61-90 Days],
            [Between 46 to 60Days] AS [46-60 Days],[Between 31 to 45Days] AS [31-45 Days],[Between 22 to 30Days] AS [22-30 Days],[Between 11 to 21Days] AS [11-21 Days],
            [Between 0 to 10Days] AS [0-10 Days] 
            FROM tbl_PH3_cpgram
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
              ORDER BY Year DESC, MonthNumber DESC, ID;
          `);
          
          const rowData = result.recordset;  

          if (rowData.length === 0) {
              return res.status(404).json({ error: 'No data available' });
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

    async function getAgeAllReport(req, res) {
      try {
          const conn = await pool;
          const request = conn.request();

          const result = await request.query(` SELECT
          [Brought Forwarded],[Grievance(s) Received],[Grievance(s) Disposed],[Average Disposal Time(Days)],[Pending as of now],
          [Pending <=21 Days],[Pending >21 Days],[Pending 0-10 Days],[Pending 11-21 Days],[Pending 22-30 Days],
          [Pending 31-45 Days],[Pending 46-60 Days],[Pending 61-90 Days],
          [Pending 91-180 Days],[Pending 181-365 Days],[Pending from more than a year],[Year],[Month]
          FROM tbl_age_cpgram
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
            ORDER BY Year DESC, MonthNumber DESC, ID;
          `);
          
          const rowData = result.recordset;  

          if (rowData.length === 0) {
              return res.status(404).json({ error: 'No data available' });
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

const cpgramController = { getCategoryReport, getProgressReport, getPH3Report,
   getAgeReport, getCPGRAMHistory, getCPGRAMProgressHistory, getCPGRAMPH3History, 
   getCPGRAMAgeHistory, getCategoryAllReport, getProgressAllReport, getPH3AllReport,
   getAgeAllReport };
export default cpgramController;