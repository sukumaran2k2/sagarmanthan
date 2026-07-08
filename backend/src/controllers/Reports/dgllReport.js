import { pool } from "../../db.js";

async function getVTMSIntegrationReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_vtms_integration) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT
                ''No. of Ports’ VTMS system integrated'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_ports_vtms_integrated
                FROM tbl_vtms_integration
            ) AS source
            PIVOT (
                SUM(no_of_ports_vtms_integrated)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
            ';
            -- Execute the dynamic SQL
            EXEC sp_executesql @sql;

        `);

        const rowData = result.recordset;
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns
        const columnDefs = [
            {
                headerName: "Metric",
                field: "Metric",
                minWidth: 300,
                cellStyle: { textAlign: 'center' },
            },
            // Dynamically generate the columns for the financial years
            ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Metric" && key !== "S No").map(year => ({
                headerName: year,
                field: year,
                cellStyle: { textAlign: 'center' }
            }))
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getNAISUptimeReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
                DECLARE @sql AS NVARCHAR(MAX);
                DECLARE @columns AS NVARCHAR(MAX);

                -- Get distinct financial years
                SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
                    FROM (SELECT DISTINCT financial_year FROM tbl_nais_uptime) AS years;

                -- Generate the dynamic SQL query
                SET @sql = '
                SELECT ''National Automatic Information System (NAIS) –Availability/Uptime (%)'' AS Metric, ' + @columns + '
                    FROM (
                        SELECT financial_year, availability_of_nais
                        FROM tbl_nais_uptime
                    ) AS source
                    PIVOT (
                        SUM(availability_of_nais)
                        FOR financial_year IN (' + @columns + ')
                    ) AS pvt
                    ';

                -- Execute the dynamic SQL
                EXEC sp_executesql @sql;
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns
        const columnDefs = [
            {
                headerName: "Metric",
                field: "Metric",
                minWidth: 280,
                cellStyle: { textAlign: 'center' },
            },
            // Dynamically generate the columns for the financial years
            ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Metric" && key !== "S No").map(year => ({
                headerName: year,
                field: year,
                cellStyle: { textAlign: 'center' }
            }))
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getNAISIntegrationReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
               
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_nais_integration) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
            ''NAIS System Integration with NMDA (% Systems Integrated)'' AS Metric, ' + @columns + '
        FROM (
                SELECT financial_year, nais_integrated_with_nmda
                FROM tbl_nais_integration
            ) AS source
        PIVOT (
            SUM(nais_integrated_with_nmda)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''No. of NAIS Systems Upgraded** '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_nais_upgraded
            FROM tbl_nais_integration
        ) AS source
        PIVOT (
            SUM(no_of_nais_upgraded)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
        ';
-- Execute the dynamic SQL
EXEC sp_executesql @sql;
`);

const rowData = result.recordset;

if (rowData.length === 0) {
    return res.status(404).json({ error: 'No data available' });
}

// Define columns
const columnDefs = [
    {
        headerName: "Metric",
        field: "Metric",
        minWidth: 260,
        cellStyle: { textAlign: 'center' },
    },
    // Dynamically generate the columns for the financial years
    ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Metric" && key !== "S No").map(year => ({
        headerName: year,
        field: year,
        cellStyle: { textAlign: 'center' }
    }))
];

res.json({ columnDefs, rowData });

} catch (err) {
console.error(err);
res.status(500).json({ error: 'Internal server error' });
}
}        

async function getLightHouseMasterReport(req, res) {
    try {
      const conn = await pool;
      const request = conn.request();
  
      // Construct dynamic SQL query correctly with financial years
      const sqlQuery = `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @years NVARCHAR(MAX);

        -- Generate sequential financial years from 2014-2015 to the latest financial year
        WITH Tally AS (
            SELECT TOP (YEAR(GETDATE()) - 2014 + 2) -- Ensure we cover future years dynamically
                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS n
            FROM master.dbo.spt_values
        )
        , FinancialYears AS (
            SELECT CONCAT(2014 + n, '-', 2015 + n) AS financial_year
            FROM Tally
            WHERE 2014 + n <= (SELECT YEAR(MAX(commisioned_date)) FROM dbo.tbl_light_house_master)
        )
        -- Store financial years in a variable for dynamic SQL
        SELECT @years = STRING_AGG(QUOTENAME(financial_year), ', ') FROM FinancialYears;

        -- Construct dynamic SQL with FinancialYears inside
        SET @sql = N'
        WITH FinancialYears AS (
            SELECT DISTINCT 
                CASE 
                    WHEN commisioned_date < ''2014-04-01'' THEN ''2014-2015''
                    WHEN MONTH(commisioned_date) >= 4 THEN CONCAT(YEAR(commisioned_date), ''-'', YEAR(commisioned_date) + 1)
                    ELSE CONCAT(YEAR(commisioned_date) - 1, ''-'', YEAR(commisioned_date))
                END AS financial_year
            FROM dbo.tbl_light_house_master

            UNION

            -- Ensure all years from 2014-2015 onward exist
            SELECT CONCAT(2014 + n, ''-'', 2015 + n)
            FROM (SELECT TOP (YEAR(GETDATE()) - 2014 + 2) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS n 
                FROM master.dbo.spt_values) AS Tally
            WHERE 2014 + n <= (SELECT YEAR(GETDATE()))
        ),
        LighthouseData AS (
            SELECT 
                CASE 
                    WHEN commisioned_date < ''2014-04-01'' THEN ''2014-2015''
                    WHEN MONTH(commisioned_date) >= 4 THEN CONCAT(YEAR(commisioned_date), ''-'', YEAR(commisioned_date) + 1)
                    ELSE CONCAT(YEAR(commisioned_date) - 1, ''-'', YEAR(commisioned_date))
                END AS financial_year,
                COUNT(*) AS total_count,
                COUNT(CASE WHEN light_status = 1 THEN 1 END) AS active_count
            FROM dbo.tbl_light_house_master
            WHERE commisioned_date IS NOT NULL
            GROUP BY 
                CASE 
                    WHEN commisioned_date < ''2014-04-01'' THEN ''2014-2015''
                    WHEN MONTH(commisioned_date) >= 4 THEN CONCAT(YEAR(commisioned_date), ''-'', YEAR(commisioned_date) + 1)
                    ELSE CONCAT(YEAR(commisioned_date) - 1, ''-'', YEAR(commisioned_date))
                END
        ),
        AllYears AS (
            -- Ensure all financial years are present
            SELECT financial_year FROM FinancialYears
        ),
        MergedData AS (
            -- Left join to ensure all financial years are included
            SELECT ay.financial_year, 
                COALESCE(ld.total_count, 0) AS total_count,
                COALESCE(ld.active_count, 0) AS active_count
            FROM AllYears ay
            LEFT JOIN LighthouseData ld ON ay.financial_year = ld.financial_year
        ),
        CumulativeData AS (
            -- Ensure missing years carry forward the last known cumulative value
            SELECT financial_year, 
                SUM(total_count) OVER (ORDER BY CAST(LEFT(financial_year, 4) AS INT) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_total,
                SUM(active_count) OVER (ORDER BY CAST(LEFT(financial_year, 4) AS INT) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_active
            FROM MergedData
        )
        SELECT 
            ''Total No. of Lighthouses'' AS Metric, 
            ' + @years + '
        FROM (
            SELECT financial_year, cumulative_total FROM CumulativeData
        ) AS source
        PIVOT (
            MAX(cumulative_total) 
            FOR financial_year IN (' + @years + ')
        ) AS pvt

        UNION ALL

        SELECT 
            ''Total No. of Active/Available Lighthouses'' AS Metric, 
            ' + @years + '
        FROM (
            SELECT financial_year, cumulative_active FROM CumulativeData
        ) AS source
        PIVOT (
            MAX(cumulative_active)
            FOR financial_year IN (' + @years + ')
        ) AS pvt;';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;

      `;
  
      // Execute the dynamic query
      let result = await request.query(sqlQuery);
      const rowData = result.recordset;
  
      if (rowData.length === 0) {
        return res.status(404).json({ error: 'No data available' });
      }
  
      // Generate dynamic columns based on the financial years fetched dynamically
      const columnDefs = [
        {
            headerName: "Metric",
            field: "Metric",
            minWidth: 370,
            cellStyle: { textAlign: 'center' },
        },
        // Dynamically generate the columns for the financial years
        ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Metric" && key !== "S No").map(year => ({
            headerName: year,
            field: year,
            cellStyle: { textAlign: 'center' }
        }))
    ];
      // Respond with the column definitions and row data
      res.json({ columnDefs, rowData });
  
    } catch (err) {
      console.error("Database Error:", err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}
  
async function getLighthouseTouristDestinationReport(req, res) {

    console.log("welcome to report");
    try {
      const conn = await pool;
      const request = conn.request();
  
      // Construct dynamic SQL query correctly with financial years
      const sqlQuery=(  `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @columns NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(finacial_year), ', ') 
            FROM (SELECT DISTINCT finacial_year FROM tbl_kpi_dgll_3_5_1) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
         ''No. of Lighthouses developed as Tourist Destination'' AS Metric, ' + @columns + '
        FROM (
                SELECT finacial_year, no_lighthouses_developed_tourist_destination
                FROM tbl_kpi_dgll_3_5_1
            ) AS source
        PIVOT (
            MAX(no_lighthouses_developed_tourist_destination)
            FOR finacial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Annual Tourist Footfall'' AS Metric, ' + @columns + '
        FROM (
            SELECT finacial_year, annual_tourist_footfall
            FROM tbl_kpi_dgll_3_5_1
        ) AS source
        PIVOT (
            MAX(annual_tourist_footfall)
            FOR finacial_year IN (' + @columns + ')
        ) AS pvt
        ';
-- Execute the dynamic SQL
EXEC sp_executesql @sql;
      `);

  // Execute the dynamic query
  let result = await request.query(sqlQuery);
  const rowData = result.recordset;
  console.log("sunrowdata",result);

  if (!rowData || rowData.length == 0) {
    return res.status(404).json({ error: 'No data available' });
  }

  // Generate dynamic columns based on the financial years fetched dynamically
  const columnDefs = [
    {
        headerName: "Metric",
        field: "Metric",
        minWidth: 370,
        cellStyle: { textAlign: 'center' },
    },
    // Dynamically generate the columns for the financial years
    ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Metric" && key !== "S No").map(year => ({
        headerName: year,
        field: year,
        cellStyle: { textAlign: 'center' }
    }))
];
  // Respond with the column definitions and row data
  res.json({ columnDefs, rowData });

} catch (err) {
  console.error("Database Error:", err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
}
   
}

async function getFinancialPerformanceReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);
            DECLARE @blankRow AS NVARCHAR(MAX);

            -- Get distinct financial years as pivot columns
            SELECT @columns = STRING_AGG(QUOTENAME(financialyear), ', ')
            FROM (SELECT DISTINCT financialyear FROM tbl_dgll_k_3_6) AS years;

            -- Create NULLs for each year column for blank row
            SELECT @blankRow = STRING_AGG('NULL AS ' + QUOTENAME(financialyear), ', ')
            FROM (SELECT DISTINCT financialyear FROM tbl_dgll_k_3_6) AS years;

            -- Generate dynamic SQL
            SET @sql = '

            SELECT
                ''Revenue'' AS Description, ' + @blankRow + '

            UNION ALL

            SELECT
                ''Revenue from Light Dues Collection'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, revenue_light_dues_collection
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(revenue_light_dues_collection)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Revenue from Tourism/Heritage Sites'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, revenue_from_tourism
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(revenue_from_tourism)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Grants/Subsidies from Government'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, subsidies_from_govt
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(subsidies_from_govt)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Total Revenue'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear,
                    revenue_light_dues_collection + revenue_from_tourism + subsidies_from_govt AS total_revenue
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(total_revenue)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            -- Blank row before Total Revenue
            SELECT '' '' AS Description, ' + @blankRow + '

            UNION ALL

            -- Section Title for Expenses
            SELECT ''Expenses'' AS Description, ' + @blankRow + '

            UNION ALL

            SELECT
                ''Operating Costs '' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, operating_costs
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(operating_costs)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Capital Expenditure'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, capital_expenditure
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(capital_expenditure)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Tourism Development Costs'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear, tourism_develop_cost
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(tourism_develop_cost)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Total Expenses'' AS Description, ' + @columns + '
            FROM (
                SELECT financialyear,
                    operating_costs + capital_expenditure + tourism_develop_cost AS total_expenses
                FROM tbl_dgll_k_3_6
            ) AS source
            PIVOT (
                SUM(total_expenses)
                FOR financialyear IN (' + @columns + ')
            ) AS pvt
            ';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
      
    `);

    const rowData = result.recordset;

    if (!rowData || rowData.length === 0) {
        return res.status(404).json({ error: 'No data available' });
    }

    // Define columns
    const columnDefs = [
        {
            headerName: "Description",
            field: "Description",
            minWidth: 330,
            cellStyle: { textAlign: 'center' },
        },
        // Dynamically generate the columns for the financial years
        ...rowData[0] && Object.keys(rowData[0]).filter(key => key !== "Description" && key !== "S No").map(year => ({
            headerName: `${year} (In Cr.)`,
            field: year,
            cellStyle: { textAlign: 'center' }
        }))
    ];

    res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
        }
    }        

  

export default {getVTMSIntegrationReport,getNAISUptimeReport,getNAISIntegrationReport,getLightHouseMasterReport, getLighthouseTouristDestinationReport,getFinancialPerformanceReport}