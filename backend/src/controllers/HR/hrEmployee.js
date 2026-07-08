import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function createHrDepartment(req, res) {
    const departmentName = req.body.departmentName;
    const organisationID = req.body.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("departmentName", departmentName);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        INSERT INTO tbl_hr_department (
            department_name, organisation_id
        )
        VALUES (
            @departmentName, @organisationID
        )
    `);
        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function getHrEmployee(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);
    try {
        const result = await request.query(`
            SELECT
                *
            FROM
                tbl_employee e
            WHERE
                e.emp_parent_org_id = @Id
        `);
        res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrEmployeeByID(req, res) {
    const employeeMasterID = req.params.employeeMasterID;

    const conn = await pool;
    const request = conn.request();

    request.input("employeeMasterID", employeeMasterID);
    try {
        // const result = await request.query(`
        //     SELECT e.*, 
        //            o1.organisation_name AS current_organisation_name,  
        //            o2.organisation_name AS parent_organisation_name,
        //            d.department_name,
        //            ps.date_of_arise_in_vacancy,
        //            p.post_name AS name_of_post,
        //            p.payscale_range AS payscale_range
        //         FROM tbl_employee e
        //         LEFT JOIN mmt_organisation o1 ON e.emp_curr_org_id = o1.organisation_id
        //         LEFT JOIN mmt_organisation o2 ON e.emp_parent_org_id = o2.organisation_id
        //         LEFT JOIN mmt_hr_department d ON d.department_id = e.emp_department_id
        //         LEFT JOIN mmt_hr_post p ON p.post_id = e.emp_post_id
        //         LEFT JOIN tbl_hr_post_strength ps ON ps.post_id = e.emp_post_id
        //         WHERE e.employee_id = @employeeID;
        // `);

        const result = await request.query(`SELECT em.*, o1.organisation_name AS parent_organisation_name,et.emp_post_join_date,
                   p.payscale_range AS payscale_range
                FROM tbl_employee_master em
				JOIN tbl_employee_transaction_details et ON et.emp_master_id = em.emp_master_id
				LEFT JOIN mmt_organisation o1 ON em.emp_parent_org_id = o1.organisation_id
				LEFT JOIN mmt_hr_post p ON p.post_id = et.emp_post_id
				WHERE em.emp_master_id =@employeeMasterID;
                `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employee = result.recordset[0];
        const imageFileName = employee.emp_profile_img_name || '';
        const imagePath = imageFileName ? path.join(__dirname, '../../../fileuploads/hr_employee', imageFileName) : null;

        let imageBase64 = null;
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            imageBase64 = imageBuffer.toString("base64");
        } else {
            //console.warn("Image file not found:", imagePath);
        }

        return res.json({
            employee,
            profileImage: imageBase64 ? `data:image/png;base64,${imageBase64}` : null,
        });

    } catch (err) {
        //console.error("Error fetching employee data:", err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

// async function getPostNamesByOrgId(req, res) {
//     const conn = await pool;
//     const request = conn.request();
//     const organisationID = req.params.organisationID;
//     const departmentID = req.params.selectedDepartmentId;

//     request.input("organisationID", organisationID);

//     if (departmentID != "None" && departmentID != '0' ) {
//         request.input("departmentID", departmentID);
//      }

//     try {
//         let query = `SELECT * FROM mmt_hr_post p
//                         WHERE organisation_id =@organisationID`;
//         if (departmentID != "None" && departmentID != '0') {
//            query += ` AND department_id = @departmentID`;
//         }
//         const result = await request.query(query);
//         res.json(result.recordset);
//     } catch (err) {
//         //console.log(err);
//         return res.status(500).json({message:"Internal Server Error",error:err});
//     }
// }

async function getPostNamesByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.selectedOrganisationId;
    request.input("organisationID", organisationID);

    try {
        const query = `SELECT * FROM mmt_hr_post 
                       WHERE organisation_id = @organisationID`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}

async function getDepartmentList(req, res) {

    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT department_id, department_name, status
            FROM mmt_hr_department;
        `);

        res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function submitEmpLeaveHistory(req, res) {
    const leaveData = req.body; // Expecting an array of leave data objects
    if (!Array.isArray(leaveData) || leaveData.length === 0) {
        return res.status(400).send({ message: "Invalid leave data" });
    }

    const conn = await pool;
    const transaction = conn.transaction();
    const request = transaction.request();

    try {
        await transaction.begin();

        const employeeID = leaveData[0].empID;
        const empMasterID = leaveData[0].empMasterID;
        request.input("employeeID", employeeID);
        request.input("empMasterID", empMasterID);

        await request.query(`
            DELETE FROM tbl_emp_leave_history
            WHERE emp_id = @employeeID;
        `);

        let insertQuery = `
            INSERT INTO tbl_emp_leave_history (
                emp_id, emp_master_id, leave_year, leave_q1, leave_q2, leave_q3, leave_q4
            ) VALUES 
        `;
        const values = [];
        leaveData.forEach((leave, index) => {
            const { year, q1, q2, q3, q4 } = leave;
            insertQuery += `(@employeeID,@empMasterID, @year${index}, @q1${index}, @q2${index}, @q3${index}, @q4${index}),`;
            request.input(`year${index}`, year);
            request.input(`q1${index}`, q1);
            request.input(`q2${index}`, q2);
            request.input(`q3${index}`, q3);
            request.input(`q4${index}`, q4);
        });
        insertQuery = insertQuery.slice(0, -1);

        await request.query(insertQuery);

        await transaction.commit();
        return res.status(201).send({ message: "Employee leave history saved successfully" });
    } catch (err) {
        if (transaction) {
            await transaction.rollback();
        }

        return res.status(500).send({ message: "Failed to save leave history", error: err.message });
    }
}


async function getEmpLeaveHistoryData(req, res) {
    const employeeID = req.params.employeeID;

    const conn = await pool;
    const request = conn.request();

    request.input("employeeID", employeeID);
    try {
        const result = await request.query(`
                SELECT emp_name,elh.* FROM tbl_emp_leave_history elh
                LEFT JOIN tbl_employee_master em ON elh.emp_master_id = em.emp_master_id
                    WHERE emp_id = @employeeID;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function updateEmployeeStatus(req, res) {
    const conn = await pool;
    const request = conn.request();
    const status = req.params.status;
    const empID = req.params.empID;
    const referenceID = req.params.referenceID;

    request.input("status", status);
    request.input("empID", empID);
    request.input("referenceID", referenceID);

    try {
        const query = await request.query(`UPDATE m
                        SET m.emp_status = @status
                        FROM tbl_employee_master m
                        JOIN tbl_employee_transaction_details et
                            ON et.emp_master_id = m.emp_master_id
                        WHERE m.emp_master_id = @empID
                        AND et.emp_reference_id = @referenceID;`);

        return res.status(201).send({ message: "Employee status updated successfully" });
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
};


async function getHrDepartmentList(req, res) {
    const organisationID  = req.params.organisationID;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID",organisationID);
    let result;
    try {
        if(organisationID == 0){
            result = await request.query(`
                SELECT *
                FROM mmt_hr_department m
            `);
        }else{
            const orgResult = await request.query(`SELECT organisation_category_id FROM mmt_organisation where organisation_id = @organisationID`);
            let orgCategory = orgResult.recordset[0].organisation_category_id;
            if(orgCategory==1 || orgCategory==3){
                request.input("orgCategory",orgCategory);
                result = await request.query(`
                    SELECT *
                    FROM mmt_hr_department m
                    WHERE organisation_category_id =  @orgCategory
                `);
            }else{
                result = await request.query(`
                    SELECT *
                    FROM mmt_hr_department m
                `);
            }
        }
        res.json(result.recordset);
    } catch (err) {
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrDivisionList(req, res) {

    const conn = await pool;
    const request = conn.request();
    try {
        const result = await request.query(`
            SELECT *
            FROM dbo.mmt_hr_division
        `);
        res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrPostList(req, res) {

    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`
            SELECT *
            FROM dbo.mmt_hr_post WHERE organisation_id= @organisationID
        `);
        res.json(result.recordset);
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrPostDetails(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);
    try {
        // const result = await request.query(`
        //     SELECT
        //         p.post_id as post_id,
        //         d.department_name as department,
        //         dv.division_name as division,
        //         p.post_name as post_name,
        //         count(*) as sanctioned_strength,
        //         COUNT(CASE WHEN ps.vacant_or_filled = 'vacant' THEN 1 END) AS vacant_post,
        //         COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post
        //     FROM
        //         mmt_hr_post p
        //     LEFT JOIN
        //         dbo.tbl_hr_post_strength ps ON ps.post_id = p.post_id
        //     LEFT JOIN
        //         dbo.mmt_hr_department d ON d.department_id = p.department_id
        //     LEFT JOIN
        //         dbo.mmt_hr_division dv ON dv.division_id = p.division_id
        //         WHERE p.organisation_id =@organisationID
        //     GROUP BY
        //         p.post_id, d.department_name, dv.division_name, p.post_name;
        // `);

        // const exceptionPosts = await request.query(`SELECT ps.*, DATEDIFF(DAY, ps.exception_abolish_date, GETDATE()) AS date_difference
        //     FROM
        //         dbo.tbl_hr_post_strength ps
        //     WHERE
        //         ps.exception_abolish_date IS NOT NULL
        //         AND DATEDIFF(DAY, GETDATE(), ps.exception_abolish_date) < 30;`)
        // res.json(result.recordset);
        const postsQuery = `
            SELECT
    p.post_id AS post_id,
    d.department_id,
    d.department_name AS department,
    mmtc.class,
    p.post_name AS post_name,
    COUNT(*) AS sanctioned_strength,
    COUNT(CASE WHEN ps.vacant_or_filled = 'filled' THEN 1 END) AS filled_post,
    COALESCE(SUM(CASE WHEN
        ps.vacant_or_filled = 'vacant'
        AND (((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
        AND ps.date_of_arise_in_vacancy IS NOT NULL
		AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) > GETDATE()
        OR ps.exception_abolish = 1) OR  ps.date_of_arise_in_vacancy IS NULL)
    THEN 1 ELSE 0 END), 0) AS live_post,
    COALESCE(SUM(CASE WHEN
        ps.vacant_or_filled = 'vacant'
        AND ps.date_of_arise_in_vacancy IS NOT NULL
        AND ((ps.exception_abolish IS NULL OR ps.exception_abolish = 0)
        AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE())
    THEN 1 ELSE 0 END), 0) AS abolished_post,
    COUNT(CASE WHEN ps.vacant_or_filled = 'vacant' THEN 1 END) AS total_vacant_post
FROM
    mmt_hr_post p
LEFT JOIN
    dbo.tbl_hr_post_strength ps ON ps.post_id = p.post_id
LEFT JOIN
    dbo.mmt_class mmtc ON p.class_id = mmtc.class_id
LEFT JOIN
    dbo.mmt_hr_department d ON d.department_id = p.department_id
WHERE
    p.organisation_id = @organisationID
GROUP BY
    mmtc.class, d.department_id, p.post_id, d.department_name, p.post_name;
        `;

        const exceptionQuery = `
            SELECT
                ps.department_id,
                ps.post_id,
                ps.post_code,
                DATEDIFF(DAY, ps.date_of_arise_in_vacancy, GETDATE()) AS date_difference,
                CASE
                    WHEN ps.date_of_arise_in_vacancy IS NOT NULL
                         AND GETDATE() >= DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
                    THEN 'Yes'
                    ELSE 'No'
                END AS abolished_post
            FROM
                tbl_hr_post_strength ps
            WHERE vacant_or_filled = 'vacant'
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                AND MONTH(DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)) = MONTH(GETDATE())
                AND YEAR(DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)) = YEAR(GETDATE())
                AND ps.organisation_id = @organisationID;
        `;

        // Execute queries
        const [postsResult, exceptionResult] = await Promise.all([
            request.query(postsQuery),
            request.query(exceptionQuery),
        ]);

        // Combine and return results
        res.json({
            success: true,
            data: {
                posts: postsResult.recordset,
                exceptions: exceptionResult.recordset,
            },
        });
    } catch (err) {
        // //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrVacancyDetails(req, res) {
    const conn = await pool;
    const request = conn.request();
    const postId = req.params.postId;
    const isLive = req.params.isLive;

    request.input("postId", postId);

    try {
        let vacancyQuery = `
        WITH LastOccupant AS (
            SELECT
                et.emp_post_code,
                et.emp_master_id,
                em.emp_name,
                ROW_NUMBER() OVER (PARTITION BY et.emp_post_code ORDER BY et.emp_post_end_date DESC) AS rn
            FROM tbl_employee_transaction_details et
            LEFT JOIN tbl_employee_master em ON et.emp_master_id = em.emp_master_id
            WHERE et.emp_post_end_date IS NOT NULL
        )

        SELECT tbl_hr_post_strength.*,lo.emp_name AS previous_occupant
            FROM tbl_hr_post_strength
            LEFT JOIN LastOccupant lo ON tbl_hr_post_strength.post_code = lo.emp_post_code AND lo.rn = 1
            WHERE post_id = @postId AND vacant_or_filled = 'vacant' AND (date_of_arise_in_vacancy IS NOT NULL`;

        if (isLive == 1) {
            vacancyQuery += ` AND ((exception_abolish IS NULL OR exception_abolish = 0)
                              AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) > GETDATE()
                              OR exception_abolish = 1) OR date_of_arise_in_vacancy IS NULL)`;
        } else if (isLive == 0) {
            vacancyQuery += ` AND (exception_abolish IS NULL OR exception_abolish = 0)
                              AND DATEADD(YEAR, 5, date_of_arise_in_vacancy) <= GETDATE())`;
        }

        vacancyQuery += ` ORDER BY date_of_arise_in_vacancy ASC;`;

        //console.log("vacancy query",vacancyQuery);

        const vacancyResult = await request.query(vacancyQuery);

        const vacancies = vacancyResult.recordset;

        if (vacancies.length === 0) {
            return res.json([]);
        }

        const organisationId = vacancies[0].organisation_id;
        request.input("organisationId", organisationId);

        const abolishResult = await request.query(`
            SELECT *
            FROM tbl_hr_organisation_abolish
            WHERE organisation_id = @organisationId;
        `);

        const abolishStatus = abolishResult.recordset;

        const exceptions = await request.query(`
            SELECT
                ps.post_id,
                ps.post_code,
                DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) AS date_of_abolish,
                DATEDIFF(DAY, ps.date_of_arise_in_vacancy, GETDATE()) AS date_difference,
                CASE
                    WHEN ps.date_of_arise_in_vacancy IS NOT NULL
                         AND GETDATE() >= DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
                         AND MONTH(ps.date_of_arise_in_vacancy) != MONTH(GETDATE())
                    THEN 'Yes'
                    WHEN ps.date_of_arise_in_vacancy IS NOT NULL
                         AND GETDATE() >= DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
                         AND MONTH(ps.date_of_arise_in_vacancy) = MONTH(GETDATE())
                    THEN 'Abolished this month'
                    WHEN ps.date_of_arise_in_vacancy IS NOT NULL
                         AND GETDATE() < DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
                         AND MONTH(ps.date_of_arise_in_vacancy) != MONTH(GETDATE())
                    THEN 'Live'
                    WHEN ps.date_of_arise_in_vacancy IS NOT NULL
                         AND GETDATE() < DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)
                         AND MONTH(ps.date_of_arise_in_vacancy) = MONTH(GETDATE())
                    THEN 'Live till this month'
                    ELSE 'No'
                END AS abolished_post
            FROM
                tbl_hr_post_strength ps
            WHERE
                vacant_or_filled = 'vacant'
                AND ( exception_abolish IS NULL OR exception_abolish = 0 )
                AND ps.date_of_arise_in_vacancy IS NOT NULL
                AND (
                    (MONTH(GETDATE()) = MONTH(DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy))
                    AND YEAR(GETDATE()) = YEAR(DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy)))
                    OR DATEADD(YEAR, 5, ps.date_of_arise_in_vacancy) <= GETDATE()
                )
                AND ps.organisation_id = @organisationId;
        `);
        const exceptionPost = exceptions.recordset;

        // res.json({
        //     success: true,
        //     data: {
        //         posts: postsResult.recordset,
        //         exceptions: exceptionResult.recordset,
        //     },
        // });

        res.json({
            vacancies,
            abolishStatus,
            exceptionPost
        });

    } catch (err) {
        console.error("Error fetching HR vacancy details:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

async function getEmployeeDetailsByOrgID(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_employee e WHERE e.emp_curr_org_id =@organisationID AND emp_status =1;
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getEmployeeDetailsByEmpId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const empID = req.params.empID;

    request.input("empID", empID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_employee e WHERE e.employee_id =@empID AND emp_status =1;
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getEmployeeListByOrgId(req, res) {

    const conn = await pool;
    const request = conn.request();
    const orgID = req.params.orgID;

    request.input("orgID", orgID);
    try {
        const result = await request.query(`
            SELECT
                *
            FROM
                tbl_employee e
            WHERE
                e.emp_curr_org_id = @orgID
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getEmployeeListByOrgDepPost(req, res) {
    const conn = await pool;
    const request = conn.request();
    const roleID = parseInt(req.params.roleID, 10);
    const orgID = req.params.orgID ? parseInt(req.params.orgID, 10) : null;

    request.input("roleID", roleID);

     if (orgID) {
        request.input("orgID", orgID);
    }
 
    let orgFilterCondition = "";
    let orgWorkingFilterCondition = "";

     if ((roleID === 6 || roleID === 7) && orgID) {
        orgFilterCondition = " AND e.emp_curr_org_id = @orgID ";
        orgWorkingFilterCondition = " AND t.emp_working_org_id = @orgID ";
    }

    try {
        let query = `
            -- Common Table Expressions (CTEs)
WITH TransferOutTransactions AS (
    SELECT
        t.emp_master_id,
        m.emp_name,
        t.transaction_id,
        t.employee_id,
        m.emp_status,
        t.emp_reference_id,
        m.emp_curr_org_id,
        mmt.organisation_name
    FROM tbl_employee_transaction_details t WITH (NOLOCK)
    INNER JOIN tbl_employee_master m WITH (NOLOCK)
        ON t.emp_master_id = m.emp_master_id
    JOIN mmt_organisation mmt ON m.emp_curr_org_id = mmt.organisation_id
    WHERE
        t.activity_name = 'Transfer Out'
        ${roleID === 6 || roleID === 7 ? "AND m.emp_curr_org_id = @orgID" : ""}
),
ValidTransferOut AS (
    SELECT tot.*
    FROM TransferOutTransactions tot
    WHERE EXISTS (
        SELECT 1
        FROM tbl_employee_transaction_details tin WITH (NOLOCK)
        WHERE tin.emp_master_id = tot.emp_master_id
          AND (
                tin.method_of_appointment = 'Transfer In'
                OR (
                    tin.emp_post_code IS NOT NULL
                    AND tin.emp_working_org_id != tot.emp_curr_org_id
                )
          )
    )
),
AbsorptionTransactions AS (
    SELECT
        t.emp_master_id,
        m.emp_name,
        t.transaction_id,
        t.employee_id,
        m.emp_status,
        t.emp_post_id,
        t.emp_department_id,
        mmc.class,
        t.emp_post_name,
        t.emp_department_name,
        t.emp_reference_id,
        mmt.organisation_name
    FROM tbl_employee_transaction_details t WITH (NOLOCK)
    JOIN tbl_employee_master m WITH (NOLOCK) ON t.emp_master_id = m.emp_master_id
    JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
    JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
    JOIN mmt_organisation mmt ON m.emp_curr_org_id = mmt.organisation_id
    WHERE
        t.activity_name = 'Deputation Out'
        ${orgWorkingFilterCondition}
),
SubsequentAbsorptionTransactions AS (
    SELECT 1 AS exists_flag, emp_master_id
    FROM tbl_employee_transaction_details t2 WITH (NOLOCK)
    WHERE t2.method_of_appointment = 'Absorption'
),
DeputationOutTransactions AS (
        SELECT
        t.emp_master_id,
        m.emp_name,
        t.transaction_id,
        t.employee_id,
        m.emp_status,
        t.emp_post_id,
        t.emp_department_id,
        t.emp_post_name,
        t.emp_department_name,
        t.emp_reference_id,
        mmc.class,
        m.emp_curr_org_id,
        mmt.organisation_name
    FROM tbl_employee_transaction_details t WITH (NOLOCK)
    JOIN tbl_employee_master m WITH (NOLOCK) ON t.emp_master_id = m.emp_master_id
    JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
    JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
    JOIN mmt_organisation mmt ON m.emp_curr_org_id = mmt.organisation_id
    WHERE LTRIM(RTRIM(t.activity_name)) = 'Deputation Out'
      AND (@orgID IS NULL OR m.emp_curr_org_id = @orgID)
),
SubsequentDeputationInTransactions AS (
	SELECT
        t2.emp_master_id
    FROM tbl_employee_transaction_details t2 WITH (NOLOCK)
    JOIN tbl_employee_master m2 WITH (NOLOCK) ON t2.emp_master_id = m2.emp_master_id
    WHERE
        t2.method_of_appointment = 'Deputation In'
		${roleID === 6 || roleID === 7 ? "AND m2.emp_curr_org_id = @orgID" : ""}
        AND (
            t2.emp_post_code IS NULL
            OR (
                t2.emp_post_code IS NOT NULL
                AND t2.emp_working_org_id != m2.emp_curr_org_id
            )
        )
),
DeputationBackTransactions AS (
    SELECT
        t.emp_master_id,
        m.emp_name,
        t.transaction_id,
        t.employee_id,
        m.emp_status,
        t.emp_post_id,
        t.emp_department_id,
        t.emp_post_name,
        t.emp_department_name,
        t.emp_reference_id,
        mmc.class,
        m.emp_curr_org_id,
        mmt.organisation_name,
        t.created_date
    FROM tbl_employee_transaction_details t WITH (NOLOCK)
    JOIN tbl_employee_master m WITH (NOLOCK) ON t.emp_master_id = m.emp_master_id
    JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
    JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
    JOIN mmt_organisation mmt ON m.emp_curr_org_id = mmt.organisation_id
    WHERE LTRIM(RTRIM(t.method_of_appointment)) = 'Deputation Back'
    AND (@orgID IS NULL OR m.emp_curr_org_id = @orgID)
)

-- Main Query Combining All Result Sets
SELECT DISTINCT
    t.transaction_id,
    e.emp_name,
    t.employee_id,
    e.emp_master_id,
    t.emp_reference_id,
    e.emp_status,
    t.emp_post_id,
    t.emp_department_id,
    t.emp_post_name,
    t.emp_department_name,
    mmc.class,
    mmt.organisation_name,
       CASE
        WHEN t.emp_post_end_date IS NOT NULL THEN t.updated_date
        ELSE t.created_date
    END AS action_date,
    CASE
        WHEN e.emp_curr_org_id = t.emp_working_org_id AND t.method_of_appointment = 'Deputation In'
        THEN 'Internal Deputation'
        ELSE 'Deputation In'
    END AS type_of_people,
    'Active' AS working_status
FROM tbl_employee_transaction_details t WITH (NOLOCK)
JOIN tbl_employee_master e WITH (NOLOCK) ON t.emp_master_id = e.emp_master_id
JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
JOIN mmt_organisation mmt ON e.emp_curr_org_id = mmt.organisation_id
WHERE
    t.emp_post_join_date IS NOT NULL
    AND t.emp_post_end_date IS NULL
    AND t.method_of_appointment = 'Deputation In'
    ${orgWorkingFilterCondition}

UNION 

-- General Employees
SELECT DISTINCT
    t.transaction_id,
    e.emp_name,
    t.employee_id,
    e.emp_master_id,
    t.emp_reference_id,
    e.emp_status,
    t.emp_post_id,
    t.emp_department_id,
    t.emp_post_name,
    t.emp_department_name,
    mmc.class,
    mmt.organisation_name,
    CASE
        WHEN t.emp_post_end_date IS NOT NULL THEN t.updated_date
        ELSE t.created_date
    END AS action_date,
    'General Employee' AS type_of_people,
    'Active' AS working_status
FROM tbl_employee_transaction_details t WITH (NOLOCK)
JOIN tbl_employee_master e WITH (NOLOCK) ON t.emp_master_id = e.emp_master_id
JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
JOIN mmt_organisation mmt ON e.emp_curr_org_id = mmt.organisation_id
WHERE
    t.emp_post_end_date IS NULL
    AND t.method_of_appointment IN (
        'Promotion', 'Direct Recruitment', 'Composite Method', 'Absorption', 'Transfer In', 'Transfer','Reversion'
    )
    ${orgWorkingFilterCondition}
    ${orgFilterCondition}

UNION 
--separation
SELECT
    t.transaction_id,
    e.emp_name,
    t.employee_id,
    e.emp_master_id,
    t.emp_reference_id,
    e.emp_status,
    '' AS emp_post_id,
    '' AS emp_department_id,
    '' AS emp_post_name,
    '' AS emp_department_name,
    '' AS class,
    mmt.organisation_name,
    t.created_date,
    CONCAT('Separation - ', COALESCE(t.separation_reason, 'Unknown Reason')) AS type_of_people,
    'Inactive' AS working_status
FROM (
    SELECT
        transaction_id,
        emp_master_id,
        employee_id,
        emp_reference_id,
        created_date,
        separation_reason,
        ROW_NUMBER() OVER (
            PARTITION BY emp_master_id
            ORDER BY created_date DESC
        ) AS rn
    FROM tbl_employee_transaction_details WITH (NOLOCK)
    WHERE emp_post_end_date IS NOT NULL
      AND activity_name = 'Separation'
) t
JOIN tbl_employee_master e WITH (NOLOCK)
    ON t.emp_master_id = e.emp_master_id
JOIN mmt_organisation mmt
    ON e.emp_curr_org_id = mmt.organisation_id
WHERE t.rn = 1
  AND e.emp_status = 0
    ${orgFilterCondition}

UNION 

-- Deputation Out
SELECT distinct
    etd.transaction_id,
    tot.emp_name,
    tot.employee_id,
    tot.emp_master_id,
    tot.emp_reference_id,
    tot.emp_status,
    etd.emp_post_id,
    etd.emp_department_id,
    etd.emp_post_name,
    etd.emp_department_name,
    tot.class,
    tot.organisation_name,
    CASE
        WHEN etd.emp_post_end_date IS NOT NULL THEN etd.updated_date
        ELSE etd.updated_date
    END AS created_date,
    'Deputation Out' AS type_of_people,
    'Inactive' AS working_status


FROM DeputationOutTransactions tot
JOIN tbl_employee_transaction_details etd ON etd.transaction_id = tot.transaction_id
WHERE NOT EXISTS (
      SELECT 1 
    FROM DeputationBackTransactions dbt 
    WHERE dbt.emp_master_id = tot.emp_master_id
)
AND NOT EXISTS (
    SELECT 1 FROM tbl_employee_transaction_details t3 WITH (NOLOCK)
    WHERE t3.emp_master_id = tot.emp_master_id
    AND t3.method_of_appointment = 'Absorption'
)
--AND etd.activity_name IS NULL

UNION 

-- Deputation Back
SELECT DISTINCT
    dbt.transaction_id,
    dbt.emp_name,
    dbt.employee_id,
    dbt.emp_master_id,
    dbt.emp_reference_id,
    dbt.emp_status,
    dbt.emp_post_id,
    dbt.emp_department_id,
    dbt.emp_post_name,
    dbt.emp_department_name,
    dbt.class,
    dbt.organisation_name,
    dbt.created_date AS action_date,
    'Deputation Back' AS type_of_people,
    'Active' AS working_status
FROM DeputationBackTransactions dbt

UNION 

-- Transfer Out (via NULL post_code)
SELECT DISTINCT
    t.transaction_id,
    e.emp_name,
    t.employee_id,
    e.emp_master_id,
    t.emp_reference_id,
    e.emp_status,
    t.emp_post_id,
    t.emp_department_id,
    '' AS emp_post_name,
    '' AS emp_department_name,
    mmc.class,
    mmt.organisation_name,
      CASE
        WHEN t.emp_post_end_date IS NOT NULL THEN t.updated_date
        ELSE t.created_date
    END AS action_date,
    'Transfer Out' AS type_of_people,
    'Inactive' AS working_status
FROM tbl_employee_transaction_details t WITH (NOLOCK)
JOIN tbl_employee_master e WITH (NOLOCK) ON t.emp_master_id = e.emp_master_id
JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
JOIN mmt_organisation mmt ON e.emp_curr_org_id = mmt.organisation_id
WHERE
    t.emp_post_code IS NULL
    AND t.method_of_appointment = 'Transfer In'
    ${orgFilterCondition}

UNION 

-- Transfer Out with Subsequent Transfer In
SELECT DISTINCT
    vtot.transaction_id,
    vtot.emp_name,
    vtot.employee_id,
    vtot.emp_master_id,
    vtot.emp_reference_id,
    vtot.emp_status,
    '' AS emp_post_id,
    '' AS emp_department_id,
    '' AS emp_post_name,
    '' AS emp_department_name,
    '' AS class,
    vtot.organisation_name,
     GETDATE() AS action_date,
    'Transfer Out' AS type_of_people,
    'Inactive' AS working_status
FROM ValidTransferOut vtot

UNION 

-- Absorption
SELECT DISTINCT
    tot.transaction_id,
    tot.emp_name,
    tot.employee_id,
    tot.emp_master_id,
    tot.emp_reference_id,
    tot.emp_status,
    tot.emp_post_id,
    tot.emp_department_id,
    tot.emp_post_name,
    tot.emp_department_name,
    tot.class,
    tot.organisation_name,
     GETDATE() AS action_date,
    'Absorption' AS type_of_people,
    'Inactive' AS working_status
FROM AbsorptionTransactions tot
WHERE EXISTS (
    SELECT 1 FROM SubsequentAbsorptionTransactions st WHERE st.emp_master_id = tot.emp_master_id
)

UNION 

-- Appointment method not specified
SELECT DISTINCT
    t.transaction_id,
    e.emp_name,
    t.employee_id,
    e.emp_master_id,
    t.emp_reference_id,
    e.emp_status,
    t.emp_post_id,
    t.emp_department_id,
    t.emp_post_name,
    t.emp_department_name,
    mmc.class,
    mmt.organisation_name,
     CASE
        WHEN t.emp_post_end_date IS NOT NULL THEN t.updated_date
        ELSE t.created_date
    END AS action_date,
    'Method of Appointment Not Provided' AS type_of_people,
    'Active' AS working_status
FROM tbl_employee_transaction_details t WITH (NOLOCK)
JOIN tbl_employee_master e WITH (NOLOCK) ON t.emp_master_id = e.emp_master_id
JOIN mmt_hr_post p WITH (NOLOCK) ON t.emp_post_id = p.post_id
JOIN mmt_class mmc WITH (NOLOCK) ON p.class_id = mmc.class_id
JOIN mmt_organisation mmt ON e.emp_curr_org_id = mmt.organisation_id
WHERE
    t.emp_post_end_date IS NULL
    AND t.method_of_appointment IS NULL
    ${orgFilterCondition}

        `;

        // if (depID != "None") {
        //     query += ` AND et.emp_department_id = @depID`;
        // }
        // if (postID != "None") {
        //     query += ` AND p.post_id = @postID`;
        // }
        // query += ` ORDER BY m.emp_master_id ASC`;

        const result = await request.query(query);
       
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}

async function getEmployeeListHoldingDesig(req, res) {
  
    const conn = await pool;
    const request = conn.request();
    const orgID = req.params.orgID;
    const depID = req.params.depID;
    const postID = req.params.postID;

    request.input("orgID", orgID);
    if (depID != "None") {
        request.input("depID", depID);
    }
    if (postID != "None") {
        request.input("postID", postID);
    }

    try {
        let query = `
            SELECT et.employee_id,
                   et.emp_master_id,
                   et.emp_post_code,
				   et.emp_post_end_date,
                   m.emp_name,
                   m.emp_dor,
                et.emp_reference_id AS reference_id,
                m.emp_status,
                p.post_name,
                p.post_id,
                mmc.class,
                d.department_id
				,d.department_name
                ,ps.date_of_arise_in_vacancy
                ,ps.method_of_appointment
                ,ps.exception_abolish
                ,ps.employee_joined_date
                ,ps.process_initiated_date
                ,ps.notification_adv_issued_date
                ,ps.renotification_adv_issued_date
                ,ps.exam_conducted_date
                ,ps.interview_conducted_date
                ,ps.selection_process_completed_date
                ,ps.result_declared_date
                ,ps.appointment_letter_issued_date
                ,ps.vigilance_clr_received_date
                ,ps.dpc_conducted_date
                ,ps.approval_by_ca_date
                ,ps.promotion_order_issued_date
                ,ps.application_received_date
                ,ps.review_application_by_comm
                ,ps.approval_received_date
                ,ps.order_issued_date
            FROM 
            tbl_employee_transaction_details et
			LEFT JOIN tbl_hr_post_strength ps ON et.emp_post_code = ps.post_code
			LEFT JOIN tbl_employee_master m ON et.emp_master_id = m.emp_master_id
            LEFT JOIN mmt_hr_post p ON et.emp_post_id = p.post_id
            LEFT JOIN mmt_class mmc ON p.class_id = mmc.class_id
            LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
            WHERE ps.organisation_id= ${orgID} AND ps.vacant_or_filled='filled' AND emp_post_end_date IS NULL
        `;

        if (depID != "None") {
            query += ` AND d.department_id = @depID`;
        }
        if (postID != "None") {
            query += ` AND p.post_id = @postID`;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getPostCodeByPostId(req, res) {
  
    const conn = await pool;
    const request = conn.request();
    const methodOfApp = req.params.methodOfApp;
    const postID = req.params.postID;


    request.input("postID", postID);
    request.input("methodOfApp",methodOfApp);

    let result;
    try {
        if(methodOfApp == 'Direct Recruitment (Compassionate Method)'){
            result = await request.query(`
                SELECT * FROM tbl_hr_post_strength ps WHERE post_id = @postID AND vacant_or_filled='vacant' AND (method_of_appointment IS NULL OR method_of_appointment = @methodOfApp)`);
        }else if(methodOfApp == 'Direct Recruitment'){
            result = await request.query(`
                SELECT * FROM tbl_hr_post_strength ps WHERE post_id = @postID AND vacant_or_filled='vacant' AND method_of_appointment = @methodOfApp AND appointment_letter_issued_date IS NOT NULL`);
        }else if(methodOfApp == 'Composite Method'){
            result = await request.query(`
                SELECT * FROM tbl_hr_post_strength ps WHERE post_id = @postID AND vacant_or_filled='vacant' AND method_of_appointment = @methodOfApp AND order_issued_date IS NOT NULL`);
        }
        else if(methodOfApp == 'Transfer In'){
            result = await request.query(`
                SELECT * FROM tbl_hr_post_strength ps WHERE post_id = @postID AND vacant_or_filled='vacant' AND method_of_appointment = @methodOfApp`);
        }
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getTransactionHstryOfEmp(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const empMasterID = req.params.empMasterID;
        const orgID = req.params.orgID;
        const roleID = parseInt(req.params.roleID); 

        request.input("empMasterID", empMasterID);
        request.input("orgID", orgID);

        let query;

        if (roleID >= 1 && roleID <= 5 || roleID == 8) {
            // Role 1–5 can see all transactions for the employee (any org)
            query = `SELECT * FROM tbl_employee_transaction_details 
                     WHERE emp_master_id = @empMasterID 
                     ORDER BY transaction_id DESC`;
        } else if (roleID === 6 || roleID === 7) {
            // Role 6–7 can only see transactions for the given org
            query = `SELECT * FROM tbl_employee_transaction_details 
                     WHERE emp_master_id = @empMasterID 
                     AND emp_working_org_id = @orgID 
                     ORDER BY transaction_id DESC`;
        } else {
            return res.status(403).json({ message: "Unauthorized access: Invalid role" });
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}


//vacancy status
async function updatedVaccancyPosts(req, res) {
    const conn = await pool;
    const data = req.body;

    try {
        for (const row of data) {
            const { id, vacancy_type, method_of_appointment, vacancy_arise_date, exemption,reasonForExemption, abolish_date} = row;

            const request = conn.request();
            request.input("vacancyType", vacancy_type || null);
            request.input("method", method_of_appointment || null);
            request.input("date", vacancy_arise_date || null);
            request.input("exemption", exemption ? 1 : 0);
            request.input("abolishDate", abolish_date || null);
            request.input("reasonForExemption", reasonForExemption || null);
            request.input("id", id || null);

            await request.query(`
                UPDATE tbl_hr_post_strength
                SET vacancy_type = @vacancyType,
                    method_of_appointment = @method,
                    date_of_arise_in_vacancy = @date,
                    exception_abolish = @exemption,
                    reason_for_exemption = @reasonForExemption,
                    updated_date = GETDATE()
                WHERE id = @id AND vacant_or_filled = 'vacant';
            `);
        }

        res.json({ message: "Vacancy details updated successfully" });
    } catch (err) {
        //console.error(err);
        res.sendStatus(500);
    }
}

async function getDeputedEmployeeListByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationId = req.params.organisationId;

    request.input("organisationId", organisationId);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_employee_transaction_details et
            JOIN tbl_employee_master em ON em.emp_master_id = et.emp_master_id
            WHERE method_of_appointment ='Deputation In' AND em.emp_curr_org_id =  @organisationID
            AND org_to_be_deputed =@organisationID AND emp_post_end_date IS NULL AND date_of_deputing_out IS NULL
            AND deputation_end_date IS NULL AND emp_post_code IS NULL`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getDeputedEmployeesByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;
    const selectedOrganisationID = req.params.organisationId;

    request.input("organisationID", organisationID);
    request.input("selectedOrganisationID", selectedOrganisationID);
    try {
        const result = await request.query(`
            SELECT em.emp_name,td.* FROM tbl_employee_transaction_details td
            JOIN tbl_employee_master em ON em.emp_master_id = td.emp_master_id
            WHERE
            td.method_of_appointment = 'Deputation In' AND td.emp_post_code IS NULL AND
             td.emp_working_org_id = @organisationID AND em.emp_curr_org_id = @selectedOrganisationID;
            `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrEmployeeListByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`
            SELECT em.emp_master_id ,td.emp_reference_id, td.employee_id FROM tbl_employee_transaction_details td
            JOIN tbl_employee_master em ON em.emp_master_id = td.emp_master_id
            WHERE em.emp_parent_org_id= @organisationID AND td.emp_working_org_id =@organisationID
            AND emp_status=1`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHrCompositeEmployeeListByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`
            SELECT em.emp_master_id ,td.emp_reference_id, td.employee_id, em.emp_name FROM tbl_employee_transaction_details td
            JOIN tbl_employee_master em ON em.emp_master_id = td.emp_master_id
            WHERE td.emp_working_org_id =@organisationID
            AND method_of_appointment != 'Deputation In' AND em.emp_curr_org_id =  @organisationID
            AND td.emp_post_end_date is null
            AND emp_status=1`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getTransferInEmployeeListByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationId = req.params.organisationID;

    request.input("organisationId", organisationId);
    try {
        const result = await request.query(`
            SELECT  em.emp_master_id, tetd.emp_reference_id,tetd.employee_id, em.emp_name FROM tbl_employee_master em
            JOIN tbl_employee_transaction_details tetd ON tetd.emp_master_id = em.emp_master_id
            WHERE emp_curr_org_id =@organisationId AND tetd.emp_post_code IS NULL AND tetd.method_of_appointment ='Transfer In'`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getEmpDetailsForVacancyManagement(req, res) {
    const conn = await pool;
    const request = conn.request();
    const employeeID = req.params.employeeID;

    request.input("employeeID", employeeID);
    try {
        const result = await request.query(`
            SELECT emp_name,emp_dob, emp_gender, emp_aadhar_number, mmts.state_name FROM tbl_employee_master em
            LEFT JOIN tbl_employee_transaction_details tetd ON tetd.emp_master_id = em.emp_master_id
            LEFT JOIN mmt_state mmts ON em.emp_domicile_state = mmts.state_id
            WHERE employee_id = @employeeID`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getDeputedEndEmployeeData(req,res){
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID",organisationID);
    try {
        const result = await request.query(`
            SELECT
                et.employee_id,
                em.emp_master_id,
                em.emp_name,
                et.emp_reference_id,
                'End of Deputation' AS status,
                mmt.organisation_name AS emp_from
            FROM tbl_employee_transaction_details et
            LEFT JOIN tbl_employee_master em ON et.emp_master_id = em.emp_master_id
            LEFT JOIN mmt_organisation mmt ON et.emp_working_org_id = mmt.organisation_id
            WHERE 
                et.transaction_id = (
                    SELECT MAX(transaction_id)
                    FROM tbl_employee_transaction_details
                    WHERE employee_id = et.employee_id
                )
            AND et.activity_name = 'End of Deputation' 
            AND em.emp_curr_org_id = @organisationID;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getEmployeeDetailsByReferenceId(req,res) {
    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
            SELECT 
                em.emp_master_id,
                em.emp_name,
                em.emp_status, 
                em.emp_reference_id,
                et.activity_name,
                et.separation_reason,
                et.employee_id
            FROM tbl_employee_master em
            INNER JOIN tbl_employee_transaction_details et 
                ON em.emp_master_id = et.emp_master_id
            --WHERE em.emp_curr_org_id = @organisationID 
            AND em.emp_status = 0 
            AND et.activity_name = 'Separation' 
            AND et.separation_reason = 'Technical Resignation'
               `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.status(500).json({message:"Internal Server Error"});
    }
}

async function getEmployeeDetailsByReferenceIdOnly(req,res) {
    const conn = await pool;
    const request = conn.request();
    const referenceID = req.params.referenceID;

    request.input("referenceID",referenceID);
    try {
        const result = await request.query(`
            SELECT 
                em.*,
                etd.employee_id
                FROM tbl_employee_master em
            LEFT JOIN tbl_employee_transaction_details etd
                ON em.emp_master_id = etd.emp_master_id
            WHERE em.emp_reference_id = @referenceID;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.status(500).json({message:"Internal Server Error"});
    }
}

async function getCHDEmployeesByOrgId(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationId = req.params.organisationId;

    request.input("organisationId", organisationId);
    try {
        const result = await request.query(`
            SELECT
        em.emp_master_id,
        tetd.emp_reference_id,
        tetd.employee_id,
        em.emp_name
    FROM tbl_employee_master em
    INNER JOIN tbl_employee_transaction_details tetd
        ON tetd.emp_master_id = em.emp_master_id
    WHERE em.emp_curr_org_id = @organisationId
        AND tetd.separation_reason = 'Redeployment-out'
        AND tetd.employee_id NOT IN (
            SELECT employee_id
            FROM tbl_hr_post_strength
            WHERE employee_id IS NOT NULL
            AND vacant_or_filled = 'filled'
            AND method_of_appointment IN (
                'Redeployed from CHD Category',
                'Redeployed-in',
                'Promotion-in by Direct Recruitment'
            )
        )
			`);

        res.json(result.recordset);

        console.log("reuslt",result)
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

export default {
    getDeputedEndEmployeeData,getHrEmployee,getTransferInEmployeeListByOrgId, getEmpDetailsForVacancyManagement,getHrEmployeeByID, getDepartmentList, submitEmpLeaveHistory, getEmpLeaveHistoryData, updateEmployeeStatus,
    getHrDepartmentList, getHrDivisionList, getHrPostList, getHrPostDetails, getHrVacancyDetails, getEmployeeDetailsByOrgID, getEmployeeDetailsByEmpId,
    getPostNamesByOrgId, getEmployeeListByOrgId, getEmployeeListByOrgDepPost, getPostCodeByPostId,getEmployeeListHoldingDesig, getTransactionHstryOfEmp,
    updatedVaccancyPosts, getDeputedEmployeeListByOrgId, getDeputedEmployeesByOrgId, getHrEmployeeListByOrgId, getHrCompositeEmployeeListByOrgId,getEmployeeDetailsByReferenceId,
    getEmployeeDetailsByReferenceIdOnly,getCHDEmployeesByOrgId
};