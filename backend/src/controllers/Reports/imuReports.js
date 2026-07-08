import { pool } from "../../db.js";

async function getStudentEnrollmentReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_1) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT 
                ''Number of Student Seats/Capacity'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_seats
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_seats)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT 
                ''Number of Students Enrolled'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_students_enrolled
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_students_enrolled)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL

            SELECT 
                ''% of Admission'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, percentage_of_student_admission
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(percentage_of_student_admission)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

             UNION ALL

            SELECT 
                ''Number of students on Roll'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_students_on_roll
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_students_on_roll)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

             UNION ALL

            SELECT 
                ''Total Number of Final Year Students'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_final_year_students
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_final_year_students)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

             UNION ALL

            SELECT 
                ''Total Number of Students Passed out'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_students_passedout
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_students_passedout)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt


            UNION ALL
            SELECT 
                ''Number of Students Placed'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_students_placed
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(no_of_students_placed)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

                UNION ALL
            SELECT 
                ''Placement %'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, placement_percentage
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(placement_percentage)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt;
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

async function getNewCoursesUpgradationReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_2) AS years;

            -- Generate the dynamic SQL query
            SET @sql = N'
            SELECT 
                ''Number of Courses Offered'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_courses_offered
                FROM tbl_imu_k_5_2
            ) AS source
            PIVOT (
                SUM(no_of_courses_offered) 
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT 
                ''Number of New Couses'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_courses_upgraded
                FROM tbl_imu_k_5_2
            ) AS source
            PIVOT (
                SUM(no_of_courses_upgraded) 
                FOR financial_year IN (' + @columns + ')
            ) AS pvt;';

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


async function getFacilitiesClassroomsReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_3) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT
                ''Number of Classrooms'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_classrooms
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_classrooms)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

                SELECT
                ''Number of Labs'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_labs
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_labs)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Simulators'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_simulators
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_simulators)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
               UNION ALL

            SELECT
                ''Number of Workshops'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_workshops
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_workshops)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL
            SELECT
                ''Number of Library Books'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_library_books
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_library_books)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL
            SELECT
                ''Number of E-Books'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_e_books
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_e_books)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL
            SELECT
                ''Number of E-Journals'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_e_journals
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_e_journals)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL
            SELECT
                ''Number of E.Databases'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_e_database
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_e_database)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL
            SELECT
                ''Number of Acadamic Software'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, no_of_acadamic_software
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(no_of_acadamic_software)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt
              UNION ALL
            SELECT
                ''Total E-Resources'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, total_e_resources
                FROM tbl_imu_k_5_3
            ) AS source
            PIVOT (
                SUM(total_e_resources)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt;
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

async function getPartnershipsMoUsAcadamicReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_4) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT
                ''Number of Academic Partnerships/MoUs- Domestic'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, academic_domestic
                FROM tbl_imu_k_5_4
            ) AS source
            PIVOT (
                SUM(academic_domestic)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Academic Partnerships/MoUs- International'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, academic_international
                FROM tbl_imu_k_5_4
            ) AS source
            PIVOT (
                SUM(academic_international)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL
            SELECT
                ''Number of Industry Partnerships/MoUs- Domestic'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, industry_domestic
                FROM tbl_imu_k_5_4
            ) AS source
            PIVOT (
                SUM(industry_domestic)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Industry Partnerships/MoUs- International'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, industry_international
                FROM tbl_imu_k_5_4
            ) AS source
            PIVOT (
                SUM(industry_international)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt;
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

async function getResearchInnovationsReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_5) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
            SELECT
                ''Number of Research Papers Published- Domestic Journals'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, domestic_journals
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(domestic_journals)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Research Papers Published- International Journals'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, international_journals
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(international_journals)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Phds Awarded'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, phd_awarded
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(phd_awarded)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

 SELECT
                ''Number of Patents/IP Filed'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, patents_filed
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(patents_filed)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
                ''Number of Startups Funded/Incubated'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, startups_funded
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(startups_funded)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

            UNION ALL

            SELECT
            ''Number of Research MS Awarded'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, research_ms_awarded
                FROM tbl_imu_k_5_5
            ) AS source
            PIVOT (
                SUM(research_ms_awarded)
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
async function getStudentEnrollmentLinegraphReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
    
        let result =await conn.query( `
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @columns AS NVARCHAR(MAX);

            -- Get distinct financial years
            SELECT @columns = STRING_AGG(QUOTENAME(financial_year), ', ') 
            FROM (SELECT DISTINCT financial_year FROM tbl_imu_k_5_1) AS years;

            -- Generate the dynamic SQL query
            SET @sql = '
    
            SELECT 
                ''% of Admission'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, percentage_of_student_admission
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(percentage_of_student_admission)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt

                UNION ALL
            SELECT 
                ''Placement %'' AS Metric, ' + @columns + '
            FROM (
                SELECT financial_year, placement_percentage
                FROM tbl_imu_k_5_1
            ) AS source
            PIVOT (
                SUM(placement_percentage)
                FOR financial_year IN (' + @columns + ')
            ) AS pvt;
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
async function getfinalYearpassPercentageReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.request().query(`
            SELECT 
                programme,
                batch,
                appeared,
                passed,
                pass_percentage
            FROM tbl_imu_k_5_1_1
            ORDER BY programme, batch;
        `);

        const rowData = result.recordset || [];

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Build columnDefs for ag-Grid
        const columnDefs = [
           
            { headerName: 'Programme', field: 'programme', cellStyle: { textAlign: 'center' } },
            { headerName: 'Batch', field: 'batch', cellStyle: { textAlign: 'center' } },
            { headerName: 'Appeared', field: 'appeared', cellStyle: { textAlign: 'center' } },
            { headerName: 'Passed', field: 'passed', cellStyle: { textAlign: 'center' } },
            { headerName: 'Pass Percentage', field: 'pass_percentage', cellStyle: { textAlign: 'center' } }
        ];

        return res.json({ columnDefs, rowData });

    } catch (err) {
        console.error('getfinalYearpassPercentageReport error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


export default {getStudentEnrollmentReport,getNewCoursesUpgradationReport,getFacilitiesClassroomsReport,getPartnershipsMoUsAcadamicReport,getResearchInnovationsReport,getStudentEnrollmentLinegraphReport,getfinalYearpassPercentageReport}