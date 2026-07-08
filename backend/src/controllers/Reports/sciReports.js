import { pool } from "../../db.js";

async function getsciVesselAvailabilityReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years dynamically
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_vessel_availability) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
            ''No. of Own Operated Ships'' AS Metric, ' + @columns + '
        FROM (
                SELECT financial_year, total_no_of_own_operated
                FROM tbl_sci_vessel_availability
            ) AS source
        PIVOT (
            SUM(total_no_of_own_operated)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Ship Utilization %'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, ship_utilization
            FROM tbl_sci_vessel_availability
        ) AS source
        PIVOT (
            AVG(ship_utilization)  -- Use AVG or SUM depending on the requirement
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

async function sciVeslAvailUtilTimeandVoyageChartShipsReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years, filtering out years before 2015-2016
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
        FROM (
            SELECT DISTINCT financial_year 
            FROM tbl_sci_vessel_availability 
            WHERE financial_year >= '2015-2016'  -- Ensure only years from 2015-2016 onward are included
        ) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
            ''Total No. of Bulk Carriers in fleet'' AS Metric, ' + @columns + '
        FROM (
                SELECT financial_year, total_bulk_carriers_fleet
                FROM tbl_sci_time_voyage_bulk
                WHERE financial_year >= ''2015-2016''
            ) AS source
        PIVOT (
            SUM(total_bulk_carriers_fleet)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total No. of days of Bulk Carriers on Time Charter'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_bulk_carriers_time_charter
            FROM tbl_sci_time_voyage_bulk
            WHERE financial_year >= ''2015-2016''
        ) AS source
        PIVOT (
            SUM(total_bulk_carriers_time_charter)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total No. of days of Bulk Carriers on Voyage Charter'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_bulk_carriers_voyage_charter
            FROM tbl_sci_time_voyage_bulk
            WHERE financial_year >= ''2015-2016''
        ) AS source
        PIVOT (
            SUM(total_bulk_carriers_voyage_charter)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total Revenue of Bulk Carrier (Rs. in Crs.)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_revenue_bulk_carriers
            FROM tbl_sci_time_voyage_bulk
            WHERE financial_year >= ''2015-2016''
        ) AS source
        PIVOT (
            SUM(total_revenue_bulk_carriers)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Average earnings of Bulk Carriers per day(in US $)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, average_earnings_bulk_carriers
            FROM tbl_sci_time_voyage_bulk
            WHERE financial_year >= ''2015-2016''
        ) AS source
        PIVOT (
            AVG(average_earnings_bulk_carriers)
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
        minWidth: 352,
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

async function sciVeslAvailUtilTimeandVoyageTankerReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

       -- Get distinct financial years, filtering out years before 2015-2016
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
        FROM (
            SELECT DISTINCT financial_year 
            FROM tbl_sci_time_voyage_tanker 
            WHERE financial_year >= '2015-2016'  -- Ensure only years from 2015-2016 onward are included
        ) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
            ''Total No. of Tankers in fleet'' AS Metric, ' + @columns + '
        FROM (
                SELECT financial_year, total_no_of_tankers_in_fleet
                FROM tbl_sci_time_voyage_tanker
            ) AS source
        PIVOT (
            SUM(total_no_of_tankers_in_fleet)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total No. of days of Tankers on Time 
			Charter'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_no_days_on_time_charter
            FROM tbl_sci_time_voyage_tanker
        ) AS source
        PIVOT (
            SUM(total_no_days_on_time_charter)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

		UNION ALL

        SELECT
            ''Total No. of days of tankers on Voyage Charter'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_no_days_on_voyage_charter
            FROM tbl_sci_time_voyage_tanker
        ) AS source
        PIVOT (
            SUM(total_no_days_on_voyage_charter)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

		UNION ALL

        SELECT
            ''Total Revenue of Tanker (Rs. in Crs.)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_revenue_tankers
            FROM tbl_sci_time_voyage_tanker
        ) AS source
        PIVOT (
            SUM(total_revenue_tankers)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
		UNION ALL

        SELECT
            ''Average earnings of Tanker per day(in US $)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, average_earnings_tankers
            FROM tbl_sci_time_voyage_tanker
        ) AS source
        PIVOT (
            AVG(average_earnings_tankers)
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
        minWidth: 350,
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
async function sciVessellAvailabilityLinerReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years in sorted order
        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_vessel_availability) AS years;

        -- Generate the dynamic SQL query
        SET @sql = '
        SELECT 
            ''Total No. of Linear Vessels in fleet (owned + incharted)'' AS Metric, ' + @columns + '
        FROM (
                SELECT financial_year, total_no_of_linear_vessels_in_fleet
                FROM tbl_sci_vessel_availability_linear
            ) AS source
        PIVOT (
            SUM(total_no_of_linear_vessels_in_fleet)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total Revenue of Linear Vessels (Rs. in Crs)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_revenue_of_linear_vessels
            FROM tbl_sci_vessel_availability_linear
        ) AS source
        PIVOT (
            SUM(total_revenue_of_linear_vessels)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Average earnings of Liner Vessel per day (in US $)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, average_earnings_linear_vessels_perday
            FROM tbl_sci_vessel_availability_linear
        ) AS source
        PIVOT (
            AVG(average_earnings_linear_vessels_perday)
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
        minWidth: 368,
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

async function sciVesselAvailabilityOffshoreReport(req,res) 
{
        try {
            const conn = await pool;
            const request = conn.request();
        
            let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years dynamically
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
            FROM (SELECT DISTINCT financial_year FROM tbl_sci_time_voyage_offshore) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT 
                ''Total No. of Offshore in fleet'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, TRY_CONVERT(INT, total_no_of_offshore_in_fleet) AS total_no_of_offshore_in_fleet
                FROM tbl_sci_time_voyage_offshore
            ) AS source
            PIVOT (
                SUM(total_no_of_offshore_in_fleet)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Total No. of days of Offshore Vessel on Time Charter'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, TRY_CONVERT(INT, total_no_days_on_offshore_time_charter) AS total_no_days_on_offshore_time_charter
                FROM tbl_sci_time_voyage_offshore
            ) AS source
            PIVOT (
                SUM(total_no_days_on_offshore_time_charter)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Total No. of days of Offshore Vessel on Voyage Charter'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, TRY_CONVERT(INT, total_no_days_on_offshore_voyage_charter) AS total_no_days_on_offshore_voyage_charter
                FROM tbl_sci_time_voyage_offshore
            ) AS source
            PIVOT (
                SUM(total_no_days_on_offshore_voyage_charter)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Total Revenue of Offshore Vessel (Rs. in Crs.)'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, TRY_CONVERT(DECIMAL(18,2), total_revenue_offshore) AS total_revenue_offshore
                FROM tbl_sci_time_voyage_offshore
            ) AS source
            PIVOT (
                SUM(total_revenue_offshore)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Average earnings of Offshore Vessel per day (in US $)'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, TRY_CONVERT(DECIMAL(18,2), average_earnings_offshore) AS average_earnings_offshore
                FROM tbl_sci_time_voyage_offshore
            ) AS source
            PIVOT (
                AVG(average_earnings_offshore)
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

    res.json({ columnDefs, rowData });

    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
    }
}


async function getsciVesselprocurementReport(req,res) 
{
    try {
            const conn = await pool;
            const request = conn.request();
        
            let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
            FROM (SELECT DISTINCT financial_year FROM tbl_sci_vessel_procurement) AS years;

            -- Ensure @columns is not NULL to prevent errors
            SET @columns = COALESCE(@columns, '[No Data]');

            -- Generate the dynamic SQL query
            SET @sql = N'
            SELECT
                ''Total Number of new built ships procured'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, total_no_of_new_built_ships_procured
                FROM tbl_sci_vessel_procurement
            ) AS source
            PIVOT (
                SUM(total_no_of_new_built_ships_procured)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Value of new built ships procured(USD in millions)'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, value_of_new_built_ships_procured
                FROM tbl_sci_vessel_procurement
            ) AS source
            PIVOT (
                SUM(value_of_new_built_ships_procured)
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
                minWidth: 400,
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



async function getsciVesselprocurementsecondhandReport(req,res) 
{
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_secondhand_vessel_procurement) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Total number of secondhand ships procured '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_no_of_secondhand_ships_procured
            FROM tbl_sci_secondhand_vessel_procurement
        ) AS source
        PIVOT (
            SUM(total_no_of_secondhand_ships_procured)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Average age of secondhand ships procured '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, average_age_of_secondhand_ships_procured
            FROM tbl_sci_secondhand_vessel_procurement
        ) AS source
        PIVOT (
            SUM(average_age_of_secondhand_ships_procured)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Gross value of secondhand ships procured(USD in millions)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, gross_value_of_secondhand_ships_procured
            FROM tbl_sci_secondhand_vessel_procurement
        ) AS source
        PIVOT (
            SUM(gross_value_of_secondhand_ships_procured)
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
            minWidth: 400,
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


async function getsciRepairandMaintanceReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_repair_and_maintanace) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Total repair and maintance cost(in Rs Lakhs)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_repair_and_maintanace_cost
            FROM tbl_sci_repair_and_maintanace
        ) AS source
        PIVOT (
            SUM(total_repair_and_maintanace_cost)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total operational revenue(in Rs Lakhs)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_operational_revenue
            FROM tbl_sci_repair_and_maintanace
        ) AS source
        PIVOT (
            SUM(total_operational_revenue)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Repair & Maintance Costs(%)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, percentage_repair_and_maintanace_cost
            FROM tbl_sci_repair_and_maintanace
        ) AS source
        PIVOT (
            SUM(percentage_repair_and_maintanace_cost)
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
            minWidth: 310,
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


async function getscisaleandRecyclingofvesselsReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_sale_and_recycling_oldvessels) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Number of old vessels sold '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_old_vessels_sold
            FROM tbl_sci_sale_and_recycling_oldvessels
        ) AS source
        PIVOT (
            SUM(no_of_old_vessels_sold)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Value of sale proceeds '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, value_of_sale_proceeds
            FROM tbl_sci_sale_and_recycling_oldvessels
        ) AS source
        PIVOT (
            SUM(value_of_sale_proceeds)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Average age of old vessels sold'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, avg_age_of_old_vessels_sold
            FROM tbl_sci_sale_and_recycling_oldvessels
        ) AS source
        PIVOT (
            SUM(avg_age_of_old_vessels_sold)
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
            minWidth: 310,
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

async function getsciSaleandGreenrecyclingodoldvesselsReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Number of vessels sold for recycling '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_old_vessels_sold_for_recycling
            FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling
        ) AS source
        PIVOT (
            SUM(no_of_old_vessels_sold_for_recycling)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Value of recycled vessels '' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, value_of_recycled_vessels
            FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling
        ) AS source
        PIVOT (
            SUM(value_of_recycled_vessels)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Adherence to green recycling stds(%)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, adherence_green_recycling
            FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling
        ) AS source
        PIVOT (
            SUM(adherence_green_recycling)
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
            minWidth: 310,
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


async function getsciShipmanagementbusinessReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Number of ships managed by SCI'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_ships_managed_by_sci
            FROM tbl_sci_ship_management_business
        ) AS source
        PIVOT (
            SUM(no_of_ships_managed_by_sci)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total management cost (Rs in Crores)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_management_cost
            FROM tbl_sci_ship_management_business
        ) AS source
        PIVOT (
            SUM(total_management_cost)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Revenue from managing ships (Rs in Crores)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, revenue_from_managing_ships
            FROM tbl_sci_ship_management_business
        ) AS source
        PIVOT (
            SUM(revenue_from_managing_ships)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Cost to revenue ratio (%)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, cost_to_revenue_ratio
            FROM tbl_sci_ship_management_business  -- Ensure correct column is referenced
        ) AS source
        PIVOT (
            SUM(cost_to_revenue_ratio)
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
            minWidth: 310,
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


async function getsciShipdrydockingReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        let query = `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_ship_dry_docking) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Total dry docking scheduled for own ships'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_dry_docking_scheduled
            FROM tbl_sci_ship_dry_docking
        ) AS source
        PIVOT (
            SUM(total_dry_docking_scheduled)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL

        SELECT
            ''Total dry docking completed for own ships'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, total_dry_docking_completed
            FROM tbl_sci_ship_dry_docking
        ) AS source
        PIVOT (
            SUM(total_dry_docking_completed)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
        ';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;`;

        let result = await request.query(query);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically
        const columnDefs = [
            {
                headerName: "Metric",
                field: "Metric",
                minWidth: 310,
                cellStyle: { textAlign: 'center' },
            },
            ...rowData[0] && Object.keys(rowData[0])
                .filter(key => key !== "Metric" && key !== "S No")
                .map(year => ({
                    headerName: year,
                    field: year,
                    cellStyle: { textAlign: 'center' }
                }))
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching SCI Ship dry docking report:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}




async function getsciManningofownedshipsReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        let query = `
        DECLARE @sql AS NVARCHAR(MAX);
        DECLARE @columns AS NVARCHAR(MAX);

        -- Get distinct financial years
        SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ')
        FROM (SELECT DISTINCT financial_year FROM tbl_sci_manning_of_owned_ships) AS years;

        -- Ensure @columns is not NULL to prevent errors
        SET @columns = COALESCE(@columns, '[No Data]');

        -- Generate the dynamic SQL query
        SET @sql = N'
        SELECT
            ''Number of vessels audited for compliance'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_old_vessels_audited_compliance
            FROM tbl_sci_manning_of_owned_ships
        ) AS source
        PIVOT (
            SUM(no_of_old_vessels_audited_compliance)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
         UNION ALL
         SELECT
            ''Number of ships fully complaint with STCW and MLC standards'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, no_of_ships_fully_complaint_stwc_and_mlc
            FROM tbl_sci_manning_of_owned_ships
        ) AS source
        PIVOT (
            SUM(no_of_ships_fully_complaint_stwc_and_mlc)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt

        UNION ALL


        SELECT
            ''Compliance(%)'' AS Metric, ' + @columns + '
        FROM (
            SELECT financial_year, compliance
            FROM tbl_sci_manning_of_owned_ships
        ) AS source
        PIVOT (
            SUM(compliance)
            FOR financial_year IN (' + @columns + ')
        ) AS pvt
        ';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;`;

        let result = await request.query(query);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Define columns dynamically
        const columnDefs = [
            {
                headerName: "Metric",
                field: "Metric",
                minWidth: 430,
                cellStyle: { textAlign: 'center' },
            },
            ...rowData[0] && Object.keys(rowData[0])
                .filter(key => key !== "Metric" && key !== "S No")
                .map(year => ({
                    headerName: year,
                    field: year,
                    cellStyle: { textAlign: 'center' }
                }))
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error("Error fetching SCI Ship dry docking report:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


export default{getsciVesselAvailabilityReport, sciVeslAvailUtilTimeandVoyageChartShipsReport, sciVeslAvailUtilTimeandVoyageTankerReport, 
    sciVessellAvailabilityLinerReport, sciVesselAvailabilityOffshoreReport, getsciVesselprocurementReport, 
    getsciVesselprocurementsecondhandReport, getsciRepairandMaintanceReport, getscisaleandRecyclingofvesselsReport, 
    getsciSaleandGreenrecyclingodoldvesselsReport, getsciShipmanagementbusinessReport,getsciShipdrydockingReport, getsciManningofownedshipsReport}