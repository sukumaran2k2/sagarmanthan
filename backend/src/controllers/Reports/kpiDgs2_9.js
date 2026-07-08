import { pool } from "../../db.js";

async function getKpi2_9_1_report(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT 
            m.mti_name AS [Name of MTI],
            m.mti_number AS [MTI No],
            m.status AS [Active/Suspended/ Permanent Withdrawal / Cancellation / Approved In-Principle],
            CONVERT(VARCHAR(10), m.approval_date, 120) AS [Date of Approval],
            CONVERT(VARCHAR(10), COALESCE(m.suspended_date, m.permanent_withdrawal_date, m.closed_date, m.approved_in_principle_date), 120) AS [Date of Status Update],
            s.state_name AS [State],
            m.jurisdictional_mmd AS [Jurisdictional MMD],
            c.course_category AS [Type (Course Category)],
            c.course_discipline AS [Grade Discipline],
            c.course_name AS [Name of Course],
            c.course_id AS [Course ID],
            c.course_duration AS [Course Duration],
            c.affiliation AS [Affiliation],
            c.approved_intake_capacity AS [Approved Intake Capacity],
            c.admission_count_2024 AS [Total Admission Count (Previous FY)],
            c.admission_count_2025 AS [Total Admission Count (Current FY)],

            ROUND(
                CASE 
                    WHEN c.approved_intake_capacity > 0 THEN (c.admission_count_2024 / c.approved_intake_capacity) * 100 
                    ELSE NULL 
                END, 2) AS [% Capacity Utilisation (Previous FY)],

            ROUND(
                CASE 
                    WHEN c.approved_intake_capacity > 0 THEN (c.admission_count_2025 / c.approved_intake_capacity) * 100 
                    ELSE NULL 
                END, 2) AS [% Capacity Utilisation (Current FY)]
        FROM mmt_mti m
        LEFT JOIN mmt_state s ON m.state_id = s.state_id
        RIGHT JOIN mmt_mti_course c ON m.mti_id = c.mti_id
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const columnDefs = [
            { headerName: 'Name of MTI', field: 'Name of MTI', width: 250 },
            { headerName: 'MTI No.', field: 'MTI No', width: 120 },
            { headerName: 'Active/Suspended/ Permanent Withdrawal / Cancellation / Approved In-Principle', field: 'Active/Suspended/ Permanent Withdrawal / Cancellation / Approved In-Principle', width: 300 },
            { headerName: 'Date of Approval', field: 'Date of Approval', width: 150 },
            { headerName: 'State', field: 'State', width: 150 },
            { headerName: 'Jurisdictional MMD', field: 'Jurisdictional MMD', width: 200 },
            { headerName: 'Type (Course Category)', field: 'Type (Course Category)', width: 200 },
            { headerName: 'Grade Discipline', field: 'Grade Discipline', width: 200 },
            { headerName: 'Name of Course', field: 'Name of Course', width: 300 },
            { headerName: 'Course ID', field: 'Course ID', width: 150 },
            { headerName: 'Course Duration', field: 'Course Duration', width: 150 },
            { headerName: 'Affiliation', field: 'Affiliation', width: 200 },
            { headerName: 'Approved Intake Capacity', field: 'Approved Intake Capacity', width: 200 },
            { headerName: 'Total Admission Count (Previous FY)', field: 'Total Admission Count (Previous FY)', width: 200 },
            { headerName: 'Total Admission Count (Current FY)', field: 'Total Admission Count (Current FY)', width: 200 },

        ];

        res.json({ columnDefs, rowData });

    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
}
async function getKpi2_9_2_report(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
     SELECT
        course_discipline AS Stream,
        SUM(CASE WHEN course_category = 'Presea' THEN 1 ELSE 0 END) AS [Pre Sea],
        SUM(CASE WHEN course_category = 'Postsea' THEN 1 ELSE 0 END) AS [Post Sea Competency],
        SUM(CASE WHEN course_category = 'Modular' THEN 1 ELSE 0 END) AS [Post Sea Modular],
        COUNT(*) AS Total
    FROM (
        SELECT DISTINCT
            course_id,
            course_discipline,
            course_category
        FROM mmt_mti_course
        WHERE course_category IS NOT NULL
        AND course_discipline IS NOT NULL 
    ) AS unique_courses
    GROUP BY course_discipline
    WITH ROLLUP
    HAVING course_discipline IS NOT NULL OR GROUPING(course_discipline) = 1;
        `);

        const rowData = result.recordset.map((row) => {
            if (!row.Stream) {
                row.Stream = 'Total';
                row.isTotalRow = true;
            }
            return row;
        });

        const columnDefs = [
            { headerName: 'Streams', field: 'Stream', width: 150 },
            {
                headerName: 'No. of Courses',
                children: [
                    { headerName: 'Pre Sea', field: 'Pre Sea', width: 150 },
                    { headerName: 'Post Sea Competency', field: 'Post Sea Competency', width: 150 },
                    { headerName: 'Post Sea Modular', field: 'Post Sea Modular', width: 150 }
                ]
            }
            ,
            { headerName: 'Total', field: 'Total', width: 150 }
        ];


        res.json({ columnDefs, rowData });

    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
}


async function getKpi2_9_3_report(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                mti_name AS [Name of MTI],
                course_name AS [Course Name],
                approved_intake AS [Intake Capacity]
            FROM 
                tbl_mti_imu_data
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            { headerName: 'Name of MTI', field: 'Name of MTI' },
            { headerName: 'Course Name', field: 'Course Name' },
            { headerName: 'Intake Capacity', field: 'Intake Capacity' }
        ];

        res.json({ columnDefs, rowData });

    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
}

async function getKpi2_9_1_capacity_utilisation(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const result = await request.query(`
          SELECT 
            mti.mti_id,
            mti.mti_name,
            mti.state_id AS state,
            mti.jurisdictional_mmd,
            course.course_name,
            course.course_id,
            course.course_category,
            course.status,
            course.approved_intake_capacity
        FROM 
            mmt_mti mti
        LEFT JOIN 
            mmt_mti_course course
        ON 
            mti.mti_id = course.mti_id
        WHERE 
            mti.status = 'Active' 
            AND course.status = 'Active';
        `);

        const formattedData = result.recordset.map(row => ({
            mti_id: row.mti_id,
            mti_name: row.mti_name,
            course_name: row.course_name || "",
            course_id: row.course_id || "",
            course_category: row.course_category || "",
            intake_capacity_id: row.intake_capacity_id || null,
            approved_intake_capacity: row.approved_intake_capacity || null,
            total_admission_count: row.total_admission_count || null,
            capacity_utilisation: row.approved_intake_capacity
                ? ((row.total_admission_count / row.approved_intake_capacity) * 100).toFixed(2) + "%"
                : "",
        }));


        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    }
}

async function addKpi2_9_1_capacity_utilisation(req, res) {
    const conn = await pool;
    const { year, month, rowData, userId } = req.body;

    if (!year || !month || !rowData || !Array.isArray(rowData)) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    try {
        const validRows = rowData.filter(row => row.total_admission_count !== null);

        if (validRows.length === 0) {
            return res.status(409).json({ error: "Please enter at least one Admission Count" });
        }

        const checkRequest = conn.request();
        checkRequest.input("year", year);
        checkRequest.input("month", month);

        const checkResult = await checkRequest.query(`
            SELECT 1 
            FROM tbl_kpi_dgs_2_9_capacity_utilisation
            WHERE year = @year AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({ error: "Data already exists for the specified Year and Month" });
        }

        for (const row of validRows) {
            const insertRequest = conn.request();
            insertRequest.input("year", year);
            insertRequest.input("month", month);
            insertRequest.input("userId", userId);
            insertRequest.input("mti_id", row.mti_id);
            insertRequest.input("course_id", row.course_id);
            insertRequest.input("total_admission_count", row.total_admission_count);

            await insertRequest.query(`
                INSERT INTO tbl_kpi_dgs_2_9_capacity_utilisation 
                (year, month, mti_id, course_id, total_admission_count, created_by, created_date) 
                VALUES (@year, @month, @mti_id, @course_id, @total_admission_count, @userId, GETDATE())
            `);
        }

        res.status(201).json({ message: "Data inserted successfully" });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "An error occurred while inserting data." });
    }
}


async function getCapacityUtilisationList(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT DISTINCT 
                year,
                month
            FROM 
                tbl_kpi_dgs_2_9_capacity_utilisation
            ORDER BY 
                year DESC,month ASC
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching capacity utilisation data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
};

async function getCapacityUtilisationDetails(req, res) {
    const { year, month } = req.params;

    if (!year || !month) {
        return res.status(400).json({ error: "Year and Month are required" });
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("year", year);
        request.input("month", month);

        const result = await request.query(`
           SELECT 
            mti.mti_id,
            mti.mti_name,
            mti.state_id AS state,
            mti.jurisdictional_mmd,
            course.course_name,
            course.course_id,
            course.course_category,
            course.status,
            course.approved_intake_capacity,
            util.total_admission_count
        FROM 
            mmt_mti mti
        LEFT JOIN 
            mmt_mti_course course
        ON 
            mti.mti_id = course.mti_id
        LEFT JOIN 
            tbl_kpi_dgs_2_9_capacity_utilisation util
        ON 
            mti.mti_id = util.mti_id 
            AND course.course_id = util.course_id
            AND util.year = @year 
            AND util.month = @month
        WHERE 
            mti.status = 'Active' 
            AND course.status = 'Active';
        `);

        const formattedData = result.recordset.map(row => ({
            mti_id: row.mti_id,
            mti_name: row.mti_name,
            course_name: row.course_name || "",
            course_id: row.course_id || "",
            course_category: row.course_category || "",
            approved_intake_capacity: row.approved_intake_capacity || null,
            total_admission_count: row.total_admission_count || null,
            capacity_utilisation: row.approved_intake_capacity
                ? ((row.total_admission_count / row.approved_intake_capacity) * 100).toFixed(2) + "%"
                : "",
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    }
};


async function updateCapacityUtilisation(req, res) {
    const { year, month, rowData, userId } = req.body;

    if (!year || !month || !rowData || !Array.isArray(rowData)) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    const conn = await pool;

    try {
        const validRows = rowData.filter(row => row.total_admission_count !== null);

        if (validRows.length === 0) {
            return res.status(400).json({ error: "Please enter at least one Admission Count to update" });
        }

        for (const row of validRows) {
            const checkRequest = conn.request();
            checkRequest.input("year", year);
            checkRequest.input("month", month);
            checkRequest.input("mti_id", row.mti_id);
            checkRequest.input("course_id", row.course_id);

            const checkResult = await checkRequest.query(`
                SELECT 1 
                FROM tbl_kpi_dgs_2_9_capacity_utilisation
                WHERE 
                    year = @year AND 
                    month = @month AND 
                    mti_id = @mti_id AND 
                    course_id = @course_id
            `);

            if (checkResult.recordset.length > 0) {
                const updateRequest = conn.request();
                updateRequest.input("year", year);
                updateRequest.input("month", month);
                updateRequest.input("userId", userId);
                updateRequest.input("mti_id", row.mti_id);
                updateRequest.input("course_id", row.course_id);
                updateRequest.input("total_admission_count", row.total_admission_count);

                await updateRequest.query(`
                    UPDATE tbl_kpi_dgs_2_9_capacity_utilisation
                    SET 
                        total_admission_count = @total_admission_count,
                        updated_by = @userId,
                        updated_date = GETDATE()
                    WHERE 
                        year = @year AND 
                        month = @month AND 
                        mti_id = @mti_id AND 
                        course_id = @course_id
                `);
            } else {
                const insertRequest = conn.request();
                insertRequest.input("year", year);
                insertRequest.input("month", month);
                insertRequest.input("userId", userId);
                insertRequest.input("mti_id", row.mti_id);
                insertRequest.input("course_id", row.course_id);
                insertRequest.input("total_admission_count", row.total_admission_count);

                await insertRequest.query(`
                    INSERT INTO tbl_kpi_dgs_2_9_capacity_utilisation 
                    (year, month, mti_id, course_id, total_admission_count, created_by, created_date) 
                    VALUES (@year, @month, @mti_id, @course_id, @total_admission_count, @userId, GETDATE())
                `);
            }
        }

        res.status(200).json({ message: "Data updated successfully" });
    } catch (error) {
        console.error("Error updating capacity utilisation data:", error);
        res.status(500).json({ error: "An error occurred while updating data." });
    }
};

async function getKpi2_9_4_placement_record(req, res) {

    const conn = await pool;

    try {
        const request = conn.request();

        const result = await request.query(`
           SELECT 
            CASE 
                WHEN course.affiliation = 'IMU' THEN 'IMU Affiliated MTIs'
                ELSE 'All other MTIs other than IMU Affiliated'
            END AS type_of_mti,
            mti.mti_name,
            mti.mti_id,
            course.course_name,
            course.course_type,
            course.course_id,
            course.approved_intake_capacity
        FROM 
            mmt_mti mti
        LEFT JOIN 
            mmt_mti_course course
        ON 
            mti.mti_id = course.mti_id
        WHERE 
            mti.status = 'Active' 
            AND course.status = 'Active'
            AND (course.course_type IS NULL OR course.course_type != 'Others')
        ORDER BY 
            CASE WHEN course.affiliation = 'IMU' THEN 1 ELSE 2 END;
        `);

        const formattedData = result.recordset.map((row, index) => ({
            s_no: index + 1,
            type_of_mti: row.type_of_mti,
            mti_name: row.mti_name || "",
            mti_id: row.mti_id || "",
            course_name: row.course_name || "",
            course_type: row.course_type || "",
            course_id: row.course_id || "",
            approved_intake_capacity: row.approved_intake_capacity || null,
            total_enrolled: null,
            total_placed: null,
        }));

        res.status(200).json(formattedData);
    } catch (err) {
        console.error("Error fetching placement records:", err);
        res.status(500).json({ error: "An error occurred while fetching placement records" });
    }
}


async function addKpi2_9_4_placement_record(req, res) {
    const conn = await pool;
    const { year, month, rowData, userId } = req.body;

    if (!year || !month || !rowData || !Array.isArray(rowData)) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    try {
        const validRows = rowData.filter(row => row.enrolled !== null || row.placed_first_contract !== null);

        if (validRows.length === 0) {
            return res.status(409).json({ error: "Please enter at least one row with Enrolled or Placed data" });
        }

        const checkRequest = conn.request();
        checkRequest.input("year", year);
        checkRequest.input("month", month);

        const checkResult = await checkRequest.query(`
            SELECT 1 
            FROM tbl_kpi_dgs_2_9_placement_record
            WHERE year = @year AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({ error: "Data already exists for the specified Year and Month" });
        }

        for (const row of validRows) {
            const insertRequest = conn.request();
            insertRequest.input("year", year);
            insertRequest.input("month", month);
            insertRequest.input("userId", userId);
            insertRequest.input("mti_id", row.mti_id);
            insertRequest.input("course_id", row.course_id);
            insertRequest.input("enrolled", row.enrolled);
            insertRequest.input("placed_first_contract", row.placed_first_contract);

            await insertRequest.query(`
                INSERT INTO tbl_kpi_dgs_2_9_placement_record 
                (year, month, mti_id, course_id, enrolled, placed_first_contract, created_by, created_date) 
                VALUES (@year, @month, @mti_id, @course_id, @enrolled, @placed_first_contract, @userId, GETDATE())
            `);
        }

        res.status(201).json({ message: "Data inserted successfully" });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "An error occurred while inserting data." });
    }
}


async function getPlacementRecordList(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT DISTINCT 
                year,
                month
            FROM 
                tbl_kpi_dgs_2_9_placement_record
            ORDER BY 
                year DESC, month ASC
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching capacity utilisation data:", error);
        res.status(500).json({ error: "An error occurred while fetching data." });
    }
};


async function getPlacementRecordDetails(req, res) {
    const { year, month } = req.params;

    if (!year || !month) {
        return res.status(400).json({ error: "Year and Month are required" });
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("year", year);
        request.input("month", month);

        const result = await request.query(`
           SELECT 
            CASE 
                WHEN course.affiliation = 'IMU' THEN 'IMU Affiliated MTIs'
                ELSE 'All other MTIs other than IMU Affiliated'
            END AS type_of_mti,
            mti.mti_id,
            mti.mti_name,
            course.course_name,
            course.course_id,
            course.course_type,
            course.approved_intake_capacity,
            placement.enrolled AS total_enrolled,
            placement.placed_first_contract AS total_placed
        FROM 
            mmt_mti mti
        LEFT JOIN 
            mmt_mti_course course
        ON 
            mti.mti_id = course.mti_id
        LEFT JOIN 
            tbl_kpi_dgs_2_9_placement_record placement
        ON 
            mti.mti_id = placement.mti_id
            AND course.course_id = placement.course_id
            AND placement.year = @year
            AND placement.month = @month
        WHERE 
            mti.status = 'Active' 
            AND course.status = 'Active'
            AND (course.course_type IS NULL OR course.course_type != 'Others')
        ORDER BY 
            CASE WHEN course.affiliation = 'IMU' THEN 1 ELSE 2 END;
        `);

        const formattedData = result.recordset.map((row, index) => ({
            s_no: index + 1,
            type_of_mti: row.type_of_mti,
            mti_id: row.mti_id,
            mti_name: row.mti_name || "",
            course_name: row.course_name || "",
            course_id: row.course_id || "",
            course_type: row.course_type || "",
            approved_intake_capacity: row.approved_intake_capacity || null,
            total_enrolled: row.total_enrolled || null,
            total_placed: row.total_placed || null,
            placement_percentage: row.total_enrolled > 0
                ? ((row.total_placed / row.total_enrolled) * 100).toFixed(2) + "%"
                : "",
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching placement data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    }
}

async function editKpi2_9_4_placement_record(req, res) {
    const conn = await pool;
    const { year, month, rowData, userId } = req.body;

    if (!year || !month || !rowData || !Array.isArray(rowData)) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    try {
        const updatePromises = rowData.map(row => {
            const updateRequest = conn.request();
            updateRequest.input("year", year);
            updateRequest.input("month", month);
            updateRequest.input("userId", userId);
            updateRequest.input("mti_id", row.mti_id);
            updateRequest.input("course_id", row.course_id);
            updateRequest.input("enrolled", row.enrolled);
            updateRequest.input("placed_first_contract", row.placed_first_contract);

            return updateRequest.query(`
                IF EXISTS (
                    SELECT 1 FROM tbl_kpi_dgs_2_9_placement_record
                    WHERE year = @year AND month = @month AND mti_id = @mti_id AND course_id = @course_id
                )
                BEGIN
                    UPDATE tbl_kpi_dgs_2_9_placement_record
                    SET enrolled = @enrolled,
                        placed_first_contract = @placed_first_contract,
                        updated_by = @userId,
                        updated_date = GETDATE()
                    WHERE year = @year AND month = @month AND mti_id = @mti_id AND course_id = @course_id;
                END
                ELSE
                BEGIN
                    INSERT INTO tbl_kpi_dgs_2_9_placement_record 
                    (year, month, mti_id, course_id, enrolled, placed_first_contract, created_by, created_date)
                    VALUES (@year, @month, @mti_id, @course_id, @enrolled, @placed_first_contract, @userId, GETDATE());
                END
            `);
        });

        await Promise.all(updatePromises);

        res.status(200).json({ message: "Placement record data updated successfully." });
    } catch (error) {
        console.error("Error updating placement record data:", error);
        res.status(500).json({ error: "An error occurred while updating data." });
    }
}


async function getKpi2_9_1_4_report(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                CASE
                    WHEN mc.affiliation LIKE '%IMU%' THEN 'IMU Affiliated MTIs'
                    ELSE 'All other MTIs other than IMU Affiliated'
                END AS affiliation_group,

                -- BE/B-Tech Marine Engineering
                SUM(CASE 
                        WHEN mc.course_type = 'BE/B-Tech Marine Engineering' 
                             AND cb.end_year = YEAR(GETDATE()) 
                        THEN mc.approved_intake_capacity 
                        ELSE 0 
                    END) AS beTotalIntake,
                SUM(CASE 
                        WHEN mc.course_type = 'BE/B-Tech Marine Engineering' 
                        THEN cb.enrolled_for_placement_count 
                        ELSE 0 
                    END) AS beEnrolled,
                SUM(CASE 
                        WHEN mc.course_type = 'BE/B-Tech Marine Engineering' 
                        THEN cb.placed_count 
                        ELSE 0 
                    END) AS bePlaced,

                -- B.Sc Nautical Science
                SUM(CASE 
                        WHEN mc.course_type = 'B.Sc Nautical Science' 
                             AND cb.end_year = YEAR(GETDATE()) 
                        THEN mc.approved_intake_capacity 
                        ELSE 0 
                    END) AS bscTotalIntake,
                SUM(CASE 
                        WHEN mc.course_type = 'B.Sc Nautical Science' 
                        THEN cb.enrolled_for_placement_count 
                        ELSE 0 
                    END) AS bscEnrolled,
                SUM(CASE 
                        WHEN mc.course_type = 'B.Sc Nautical Science' 
                        THEN cb.placed_count 
                        ELSE 0 
                    END) AS bscPlaced,

                -- Diploma in Nautical Science
                SUM(CASE 
                        WHEN mc.course_type = 'Diploma In Nautical Science' 
                             AND cb.end_year = YEAR(GETDATE()) 
                        THEN mc.approved_intake_capacity 
                        ELSE 0 
                    END) AS diplomaTotalIntake,
                SUM(CASE 
                        WHEN mc.course_type = 'Diploma In Nautical Science' 
                        THEN cb.enrolled_for_placement_count 
                        ELSE 0 
                    END) AS diplomaEnrolled,
                SUM(CASE 
                        WHEN mc.course_type = 'Diploma In Nautical Science' 
                        THEN cb.placed_count 
                        ELSE 0 
                    END) AS diplomaPlaced

            FROM [sagarmanthan_revamp].[dbo].[mmt_mti_course] mc
            LEFT JOIN [sagarmanthan_revamp].[dbo].[tbl_mti_course_batch] cb
                ON mc.course_id = cb.course_id
                AND mc.mti_id = cb.mti_id
                AND cb.end_year = YEAR(GETDATE())  -- 
            WHERE mc.status = 'Active'

            GROUP BY
                CASE
                    WHEN mc.affiliation LIKE '%IMU%' THEN 'IMU Affiliated MTIs'
                    ELSE 'All other MTIs other than IMU Affiliated'
                END

            ORDER BY
                CASE
                    WHEN CASE
                        WHEN mc.affiliation LIKE '%IMU%' THEN 'IMU Affiliated MTIs'
                        ELSE 'All other MTIs other than IMU Affiliated'
                    END = 'IMU Affiliated MTIs' THEN 1
                    ELSE 2
                END;
        `);

        let rowData = result.recordset;

        // Compute placement percentages and totals
        rowData = rowData.map(row => ({
            typeOfMTI: row.affiliation_group,

            beTotalIntake: row.beTotalIntake,
            beEnrolled: row.beEnrolled,
            bePlaced: row.bePlaced,
            bePlacementPercentage: row.beEnrolled ? ((row.bePlaced / row.beEnrolled) * 100).toFixed(2) : null,

            bscTotalIntake: row.bscTotalIntake,
            bscEnrolled: row.bscEnrolled,
            bscPlaced: row.bscPlaced,
            bscPlacementPercentage: row.bscEnrolled ? ((row.bscPlaced / row.bscEnrolled) * 100).toFixed(2) : null,

            diplomaTotalIntake: row.diplomaTotalIntake,
            diplomaEnrolled: row.diplomaEnrolled,
            diplomaPlaced: row.diplomaPlaced,
            diplomaPlacementPercentage: row.diplomaEnrolled ? ((row.diplomaPlaced / row.diplomaEnrolled) * 100).toFixed(2) : null,

            totalIntake: row.beTotalIntake + row.bscTotalIntake + row.diplomaTotalIntake,
            totalEnrolled: row.beEnrolled + row.bscEnrolled + row.diplomaEnrolled,
            totalPlaced: row.bePlaced + row.bscPlaced + row.diplomaPlaced,
            totalPlacementPercentage:
                (row.beEnrolled + row.bscEnrolled + row.diplomaEnrolled)
                    ? (((row.bePlaced + row.bscPlaced + row.diplomaPlaced) /
                        (row.beEnrolled + row.bscEnrolled + row.diplomaEnrolled)) * 100).toFixed(2)
                    : null
        }));

        res.json({ rowData });
    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
}





export default {
    getKpi2_9_1_report, getKpi2_9_2_report, getKpi2_9_3_report, getKpi2_9_1_capacity_utilisation, addKpi2_9_1_capacity_utilisation, getKpi2_9_4_placement_record,
    getCapacityUtilisationList, getCapacityUtilisationDetails, updateCapacityUtilisation, addKpi2_9_4_placement_record, getPlacementRecordList, getPlacementRecordDetails,
    editKpi2_9_4_placement_record,getKpi2_9_1_4_report
};
