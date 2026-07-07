import { pool } from "../../db.js";
async function CslYearWiseReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_csl_vessels_built) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''No. of vessels built'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_vessels_built
            FROM tbl_csl_vessels_built
        ) AS source
        PIVOT (
            SUM(no_of_vessels_built)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Tonnage of vessels built(GT)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, tonnage_of_vessels_built
            FROM tbl_csl_vessels_built
        ) AS source
        PIVOT (
            SUM(tonnage_of_vessels_built)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Value of vessels built(INR Cr.)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, value_of_vessels_built
            FROM tbl_csl_vessels_built
        ) AS source
        PIVOT (
            SUM(value_of_vessels_built)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt;
        ';

        -- Debugging: Print the generated SQL query (remove in production)
        PRINT @sql;

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



const getCurrentFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    return today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};


// async function getCslshipbuildingYearWiseReport(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         // Get financialYear from query or use the current financial year
//         let financialYear = req.query.financialYear || getCurrentFinancialYear();
//         request.input("financialYear", financialYear);

//         // SQL Query
//         let sqlQuery = `
//         DECLARE @current_year NVARCHAR(10);
        
//         -- Determine current financial year dynamically
//         SET @current_year = 
//             CASE 
//                 WHEN MONTH(GETDATE()) >= 4 
//                 THEN CONCAT(YEAR(GETDATE()), '-', YEAR(GETDATE()) + 1) 
//                 ELSE CONCAT(YEAR(GETDATE()) - 1, '-', YEAR(GETDATE()))
//             END;

//         DECLARE @sql AS NVARCHAR(MAX);
//         DECLARE @columns AS NVARCHAR(MAX);

//         -- Get distinct financial quarters dynamically for current financial year
//         SELECT @columns = STRING_AGG(QUOTENAME(financial_quater), ', ')
//         FROM (SELECT DISTINCT financial_quater FROM dbo.tbl_csl_ship_building_orders WHERE financial_year = @current_year) AS quarters;

//         -- Ensure @columns is not NULL
//         SET @columns = COALESCE(@columns, '[No Data]');

//         -- Generate dynamic SQL for pivoting (filtered by current financial year)
//         SET @sql = N'
//         WITH SourceData AS (
//             SELECT 
//                 financial_quater, 
//                 ''Ship Orders Received'' AS Category, 
//                 SUM(ship_orders_received) AS Value
//             FROM dbo.tbl_csl_ship_building_orders
//             WHERE financial_year = @current_year
//             GROUP BY financial_quater
//             UNION ALL
//             SELECT 
//                 financial_quater, 
//                 ''Value of Ship Orders Received'' AS Category, 
//                 SUM(value_of_ship_orders_received) AS Value
//             FROM dbo.tbl_csl_ship_building_orders
//             WHERE financial_year = @current_year
//             GROUP BY financial_quater
//         )
//         SELECT Category, ' + @columns + '
//         FROM SourceData
//         PIVOT (
//             SUM(Value) 
//             FOR financial_quater IN (' + @columns + ')
//         ) AS pvt;';

//         -- Execute the dynamic SQL
//         EXEC sp_executesql @sql, N'@current_year NVARCHAR(10)', @current_year;
//         `;

//         // Execute the SQL query
//         let result = await request.query(sqlQuery);

//         const rowData = result.recordset;

//         if (!rowData || rowData.length === 0) {
//             return res.status(404).json({ error: 'No data available' });
//         }

//         // Define columns dynamically based on result
//         const columnDefs = [
//             { headerName: "Category", field: "Category", flex: 1, cellStyle: { textAlign: 'center' } }
//         ];
        
//         // Dynamically add quarter-based columns with equal width distribution
//         if (rowData.length > 0) {
//             const quarterColumns = Object.keys(rowData[0]).filter(col => col.startsWith('Q'));
        
//             quarterColumns.forEach(col => {
//                 columnDefs.push({
//                     headerName: col,
//                     field: col,
//                     flex: 1, // Ensures all columns take equal space
//                     cellStyle: { textAlign: 'center' }
//                 });
//             });
//         }

//         res.json({ columnDefs, rowData });

//     } catch (err) {
//         console.error("Error fetching data:", err);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

async function getCslshipbuildingYearWiseReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        // SQL Query to reshape the data (No financial year filter)
        let sqlQuery = `
        WITH SourceData AS (
            SELECT 
                financial_year AS [Financial Year],
                financial_quater AS [Quarter],
                SUM(ship_orders_received) AS [Ship Orders Received],
                SUM(value_of_ship_orders_received) AS [Value of Ship Orders Received]
            FROM dbo.tbl_csl_ship_building_orders
            GROUP BY financial_year, financial_quater
        )
        SELECT * FROM SourceData
        ORDER BY [Financial Year] DESC, [Quarter] ASC;
        `;

        // Execute the SQL query
        let result = await request.query(sqlQuery);
        const rowData = result.recordset;

        if (!rowData || rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically based on result
        const columnDefs = [
            { headerName: "Financial Year", field: "Financial Year", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Financial Quarter", field: "Quarter", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Ship Orders Received", field: "Ship Orders Received", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Value of Ship Orders Received(INR Cr.)", field: "Value of Ship Orders Received", flex: 1, cellStyle: { textAlign: 'center' } }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


async function getCslshipdeliveryYearWiseReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        // SQL Query to reshape the data (No financial year filter)
        let sqlQuery = `
        WITH SourceData AS (
            SELECT 
                financial_year AS [Financial Year],
                financial_quater AS [Quarter],
                SUM(total_no_ship_orders_received) AS [Ship Orders Received],
                SUM(no_of_ships_delivered) AS [Number of Ship Delivered on Time]
            FROM dbo.tbl_csl_ship_delivery_performance
            GROUP BY financial_year, financial_quater
        )
        SELECT * FROM SourceData
        ORDER BY [Financial Year] DESC, [Quarter] ASC;
        `;

        // Execute the SQL query
        let result = await request.query(sqlQuery);
        const rowData = result.recordset;

        if (!rowData || rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically based on result
        const columnDefs = [
            { headerName: "Financial Year", field: "Financial Year", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Financial Quarter", field: "Quarter", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Ship Orders Received", field: "Ship Orders Received", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Number of Ship Delivered on Time", field: "Number of Ship Delivered on Time", flex: 1, cellStyle: { textAlign: 'center' } }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}



async function getCslcapacityUtilizationReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_csl_capacity_utilization) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Total Shipbuilding Capacity(GT/year)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_shipbuilding_capacity
            FROM tbl_csl_capacity_utilization
        ) AS source
        PIVOT (
            SUM(total_shipbuilding_capacity)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Tonnage of vessels(GT)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, tonnage_of_vessels
            FROM tbl_csl_capacity_utilization
        ) AS source
        PIVOT (
            SUM(tonnage_of_vessels)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
        ';

        -- Debugging: Print the generated SQL query (remove in production)
        PRINT @sql;

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
async function getCslfabricationofsteelsYearWiseReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        // Corrected SQL Query
        let sqlQuery = `
        WITH SourceData AS (
            SELECT 
                financial_year AS [Financial Year],
                month AS [Month],
                SUM(fabrication_of_steel_targets) AS [Fabrication of steels Target],
                SUM(fabrication_of_steel_actual) AS [Fabrication of steels Actual]
            FROM dbo.tbl_csl_fabrication_of_steels
            GROUP BY financial_year, month  -- Fixed grouping issue
        )
        SELECT * FROM SourceData
        ORDER BY [Financial Year] DESC, [Month] ASC;
        `;

        // Execute the SQL query
        let result = await request.query(sqlQuery);
        const rowData = result.recordset;

        if (!rowData || rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically based on result
        const columnDefs = [
            { headerName: "Financial Year", field: "Financial Year", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Month", field: "Month", flex: 1, cellStyle: { textAlign: 'center' } },  // Fixed field name
            { headerName: "Fabrication of steels Target(in Tons)", field: "Fabrication of steels Target", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Fabrication of steels Actual (in Tons)", field: "Fabrication of steels Actual", flex: 1, cellStyle: { textAlign: 'center' } }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getCslshipRepairedYearWiseReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        // Corrected SQL Query
        let sqlQuery = `
        WITH SourceData AS (
            SELECT 
                financial_year AS [Financial Year],
                financial_quater AS [Financial Quarter],
                SUM(no_of_ships_repaired) AS [Number of ships repaired],
                SUM(value_of_ships_repaired) AS [Value of ship repair completed]
            FROM dbo.tbl_csl_ships_repaired
            GROUP BY financial_year, financial_quater
        )
        SELECT * FROM SourceData
        ORDER BY [Financial Year] DESC, [Financial Quarter] ASC;
        `;

        // Execute the SQL query
        let result = await request.query(sqlQuery);
        const rowData = result.recordset;

        if (!rowData || rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically based on result
        const columnDefs = [
            { headerName: "Financial Year", field: "Financial Year", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Financial Quarter", field: "Financial Quarter", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Number of ships repaired", field: "Number of ships repaired", flex: 1, cellStyle: { textAlign: 'center' } },
            { headerName: "Value of ship repair completed(INR Cr.)", field: "Value of ship repair completed", flex: 1, cellStyle: { textAlign: 'center' } }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}




export default{CslYearWiseReport,getCslshipbuildingYearWiseReport,getCslshipdeliveryYearWiseReport,
getCslcapacityUtilizationReport,getCslfabricationofsteelsYearWiseReport,getCslshipRepairedYearWiseReport}