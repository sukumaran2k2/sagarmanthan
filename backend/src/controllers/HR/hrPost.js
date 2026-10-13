import { pool } from "../../db.js";
import sql from "mssql";

async function createHrPost(req, res) {
const postName = req.body.postName;
const classID = req.body.selectedClass;
const sanctionedStrength = req.body.sanctionedStrength;
const departmentID = req.body.departmentName;

const conn = await pool;
const request = conn.request();
request.input("postName", postName);
request.input("classID", classID);
request.input("sanctionedStrength", sanctionedStrength);
request.input("departmentID", departmentID);

try {
    const result = await request.query(`
        INSERT INTO tbl_hr_post (
            post_name, sanctioned_strength, class_id, department_id
        )
        VALUES (
            @postName, @sanctionedStrength, @classID, @departmentID
        )
    `);
    return res.sendStatus(201);
} catch (err) {
    console.error(err);
    return res.sendStatus(500);
}

};

async function getHrPost(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT * FROM tbl_hr_post WHERE department_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function updateHrPostStrength(req, res) {
    const Id = req.params.Id;
    const Strength = req.body.Strength;
    const postName = req.body.postName;
    const classId = req.body.classId;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);
    request.input("Strength", Strength);
    request.input("postName", postName);
    request.input("classId", classId);

    try {
        const result = await request.query(`UPDATE tbl_hr_post SET sanctioned_strength =@Strength, post_name =@postName, class_id=@classId WHERE post_id=@Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getHrManagementPost(req, res) {
    const organisationId = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationId", organisationId);
    
    const departmentQuery = `
        SELECT department_id
        FROM tbl_hr_department
        WHERE organisation_id = @organisationId
    `;
    

    try {
        const departmentResult = await request.query(departmentQuery);
        
        const departmentIds = departmentResult.recordset.map(department => department.department_id);

        const postQuery = `
            SELECT *
            FROM tbl_hr_post
            WHERE department_id IN (${departmentIds.join(',')})
        `;

        const postResult = await request.query(postQuery);
        
        res.json(postResult.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getSanctionedStrength(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT sanctioned_strength FROM tbl_hr_post WHERE post_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getFilledVacantDataCount(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT 
        COUNT(tbl_hr_post_strength.id) AS vacant_filled_data,
        tbl_hr_post.sanctioned_strength
    FROM 
        [sagarmanthan_revamp].[dbo].[tbl_hr_post_strength]
    LEFT JOIN
        [sagarmanthan_revamp].[dbo].[tbl_hr_post] ON tbl_hr_post_strength.post_id = tbl_hr_post.post_id
    WHERE 
        tbl_hr_post_strength.post_id = @Id
        AND (tbl_hr_post_strength.vacant_or_filled = 'vacant' OR tbl_hr_post_strength.vacant_or_filled = 'filled')
    GROUP BY
        tbl_hr_post.sanctioned_strength;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getMissingPostDataCount(req, res) {
    const organisationId = req.params.organisationId;

    const conn = await pool;
    const request = conn.request();
    
    request.input("organisationId", organisationId);

    try {
        const result = await request.query(`SELECT COUNT(*) AS missingCount  FROM tbl_hr_post_strength 
        WHERE ((vacant_or_filled='vacant' AND date_of_arise_in_vacancy IS NULL AND to_be_filled_through IS NULL) OR 
        (vacant_or_filled='filled' AND employee_joining_date IS NULL AND to_be_filled_through IS NULL)) AND organisation_id=@organisationId
        `);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function deleteHrPost(req, res) {
    const postId = req.params.postId;
    
    const conn = await pool;
    const request = conn.request();
    request.input("postId", postId);
    
    try {
        const firstDelete = await request.query(`
            DELETE tbl_hr_post WHERE post_id = ${postId}
        `);
        const secondDelete = await request.query(`
            DELETE tbl_hr_post_strength WHERE post_id = ${postId}
        `);
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
    
};
 
async function getActivityDateData(req,res) {
    const fromDate = req.params.fromDate;
    const toDate = req.params.toDate;
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("fromDate", fromDate);
    request.input("toDate", toDate);
    request.input("organisationID", organisationID);

    try {
        let query = `SELECT  
            ROW_NUMBER() OVER (ORDER BY o.organisation_id) AS [S No],
            o.organisation_name AS [ORGANISATION],
            et.emp_reference_id [STAFF ID],
            et.employee_id AS [EMPLOYEE ID],
			em.emp_name AS [EMPLOYEE NAME],
            et.emp_post_code AS [POST CODE],
			FORMAT(et.employee_joining_date, 'yyyy-MM-dd') AS [EMPLOYEE JOINING DATE],
            et.activity_name AS [ACTIVITY NAME],
            et.separation_reason AS [SEPARATION REASON],
            FORMAT(et.separation_date, 'yyyy-MM-dd') AS [SEPARATION DATE],
            et.org_to_be_transferred AS [ORGANISATION TO BE TRANSFERRED],
            --o.organisation_name AS [EMPLOYEE WORKING ORGANISATION ],
            FORMAT(et.transfer_out_date, 'yyyy-MM-dd') AS [TRANSFER OUT DATE],
            FORMAT(et.promotion_date, 'yyyy-MM-dd') AS [PROMOTION DATE],
            o_deputed.organisation_name AS [ORGANISATION TO BE DEPUTED],
            FORMAT(et.date_of_deputing_out, 'yyyy-MM-dd') AS [DATE OF DEPUTING OUT],
            FORMAT(et.activity_date, 'yyyy-MM-dd') AS [ACTIVITY DATE]
        FROM 
            tbl_employee_transaction_details et
        LEFT JOIN 
            tbl_employee_master em 
            ON em.emp_master_id = et.emp_master_id
        LEFT JOIN 
            mmt_organisation o 
            ON em.emp_curr_org_id = et.emp_working_org_id
        LEFT JOIN 
            mmt_organisation o_deputed  
            ON et.org_to_be_deputed = o_deputed.organisation_id
		 LEFT JOIN 
            tbl_hr_post_strength ps  
            ON et.emp_post_code = ps.post_code
        WHERE 
            et.activity_date BETWEEN @fromDate AND @toDate 
            AND et.emp_working_org_id = @organisationID
            AND o.organisation_id = @organisationID
            `;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        // console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
} 

async function getOrganisationStructurePosts(req, res) {
    const { organisationId } = req.params;
    const orgIdNum = (organisationId && organisationId !== 'all' && organisationId !== '0') ? parseInt(organisationId, 10) : null;

    try {
        const conn = await pool;
        const request = conn.request();
        
        let query = `
            SELECT 
                p.id,
                p.post_id,
                p.post_name,
                p.department_id,
                LTRIM(RTRIM(d.department_name)) AS department_name,
                p.class_id,
                c.class AS class_name,
                ISNULL(p.sanctioned_strength, 0) AS sanctioned_strength,
                p.payscale_range,
                p.organisation_id,
                o.organisation_name
            FROM mmt_hr_post p
            LEFT JOIN mmt_hr_department d ON p.department_id = d.department_id
            LEFT JOIN mmt_class c ON p.class_id = c.class_id
            LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
        `;

        if (orgIdNum) {
            request.input("orgId", sql.Int, orgIdNum);
            query += ` WHERE p.organisation_id = @orgId`;
        }

        query += ` ORDER BY d.department_name ASC, p.post_name ASC`;

        const result = await request.query(query);
        return res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching organisation structure posts:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

async function addOrganisationStructurePost(req, res) {
    const {
        organisationId,
        departmentId,
        classId,
        postName,
        sanctionedStrength,
        payscaleRange
    } = req.body;

    if (!organisationId || !departmentId || !classId || !postName) {
        return res.status(400).json({ message: "Missing required fields: organisationId, departmentId, classId, and postName are required" });
    }

    const orgId = parseInt(organisationId, 10);
    const clsId = parseInt(classId, 10);
    const strength = parseInt(sanctionedStrength, 10) || 1;
    const deptId = String(departmentId).trim();
    const cleanPostName = String(postName).trim();
    const pRange = payscaleRange ? String(payscaleRange).trim() : null;

    try {
        const conn = await pool;
        const request = conn.request();
        request.input("orgId", sql.Int, orgId);
        request.input("deptId", sql.VarChar(10), deptId);

        // Find existing maximum post_id for this organisation and department
        const seqResult = await request.query(`
            SELECT MAX(post_id) AS max_post_id
            FROM mmt_hr_post
            WHERE organisation_id = @orgId AND department_id = @deptId
        `);

        let nextSeq = 1;
        const maxPostId = seqResult.recordset[0]?.max_post_id;
        if (maxPostId && maxPostId.length >= 8) {
            const lastPart = parseInt(maxPostId.slice(-3), 10);
            if (!isNaN(lastPart)) {
                nextSeq = lastPart + 1;
            }
        }

        const orgPrefix = String(orgId).padStart(2, '0');
        const deptPrefix = String(deptId).padStart(3, '0');
        const seqSuffix = String(nextSeq).padStart(3, '0');
        const newPostId = `${orgPrefix}${deptPrefix}${seqSuffix}`;

        // Insert into mmt_hr_post
        const insertReq = conn.request();
        insertReq.input("postId", sql.VarChar(50), newPostId);
        insertReq.input("postName", sql.NVarChar(255), cleanPostName);
        insertReq.input("deptId", sql.VarChar(10), deptId);
        insertReq.input("classId", sql.Int, clsId);
        insertReq.input("strength", sql.Int, strength);
        insertReq.input("payscaleRange", sql.NVarChar(50), pRange);
        insertReq.input("orgId", sql.Int, orgId);

        await insertReq.query(`
            INSERT INTO mmt_hr_post (
                post_id, post_name, department_id, class_id, sanctioned_strength, payscale_range, organisation_id, created_date
            )
            VALUES (
                @postId, @postName, @deptId, @classId, @strength, @payscaleRange, @orgId, GETDATE()
            )
        `);

        // Seed tbl_hr_post_strength entries
        for (let i = 1; i <= strength; i++) {
            const postCode = `${newPostId}${String(i).padStart(3, '0')}`;
            const strReq = conn.request();
            strReq.input("postCode", sql.VarChar(50), postCode);
            strReq.input("postId", sql.VarChar(50), newPostId);
            strReq.input("deptId", sql.VarChar(10), deptId);
            strReq.input("orgId", sql.Int, orgId);

            await strReq.query(`
                INSERT INTO tbl_hr_post_strength (
                    post_code, post_id, department_id, vacant_or_filled, organisation_id, created_date
                )
                VALUES (
                    @postCode, @postId, @deptId, 'vacant', @orgId, GETDATE()
                )
            `);
        }

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            postId: newPostId
        });
    } catch (err) {
        console.error("Error adding post:", err);
        return res.status(500).json({ message: "Failed to create post", error: err.message });
    }
}

async function updateOrganisationStructurePost(req, res) {
    const { postId } = req.params;
    const {
        postName,
        classId,
        sanctionedStrength,
        payscaleRange
    } = req.body;

    if (!postId || !postName) {
        return res.status(400).json({ message: "postId and postName are required" });
    }

    const clsId = classId ? parseInt(classId, 10) : null;
    const newStrength = parseInt(sanctionedStrength, 10) || 1;
    const cleanPostName = String(postName).trim();
    const pRange = payscaleRange ? String(payscaleRange).trim() : null;

    try {
        const conn = await pool;
        const checkReq = conn.request();
        checkReq.input("postId", sql.VarChar(50), postId);

        const currentRes = await checkReq.query(`
            SELECT * FROM mmt_hr_post WHERE post_id = @postId
        `);

        if (currentRes.recordset.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }

        const currentPost = currentRes.recordset[0];
        const oldStrength = parseInt(currentPost.sanctioned_strength, 10) || 0;
        const deptId = currentPost.department_id;
        const orgId = currentPost.organisation_id;

        // Update mmt_hr_post
        const updateReq = conn.request();
        updateReq.input("postId", sql.VarChar(50), postId);
        updateReq.input("postName", sql.NVarChar(255), cleanPostName);
        updateReq.input("classId", sql.Int, clsId || currentPost.class_id);
        updateReq.input("strength", sql.Int, newStrength);
        updateReq.input("payscaleRange", sql.NVarChar(50), pRange || currentPost.payscale_range);

        await updateReq.query(`
            UPDATE mmt_hr_post
            SET post_name = @postName,
                class_id = @classId,
                sanctioned_strength = @strength,
                payscale_range = @payscaleRange,
                updated_date = GETDATE()
            WHERE post_id = @postId
        `);

        // If sanctioned strength increased, add new vacant post_codes
        if (newStrength > oldStrength) {
            for (let i = oldStrength + 1; i <= newStrength; i++) {
                const postCode = `${postId}${String(i).padStart(3, '0')}`;
                const strReq = conn.request();
                strReq.input("postCode", sql.VarChar(50), postCode);
                strReq.input("postId", sql.VarChar(50), postId);
                strReq.input("deptId", sql.VarChar(10), deptId);
                strReq.input("orgId", sql.Int, orgId);

                await strReq.query(`
                    IF NOT EXISTS (SELECT 1 FROM tbl_hr_post_strength WHERE post_code = @postCode)
                    BEGIN
                        INSERT INTO tbl_hr_post_strength (
                            post_code, post_id, department_id, vacant_or_filled, organisation_id, created_date
                        )
                        VALUES (
                            @postCode, @postId, @deptId, 'vacant', @orgId, GETDATE()
                        )
                    END
                `);
            }
        } else if (newStrength < oldStrength) {
            // Only remove vacant slots that exceed new strength
            const delReq = conn.request();
            delReq.input("postId", sql.VarChar(50), postId);
            delReq.input("newStrength", sql.Int, newStrength);
            await delReq.query(`
                DELETE FROM tbl_hr_post_strength 
                WHERE post_id = @postId 
                  AND vacant_or_filled = 'vacant'
                  AND TRY_CAST(RIGHT(post_code, 3) AS INT) > @newStrength
            `);
        }

        return res.json({ success: true, message: "Post updated successfully" });
    } catch (err) {
        console.error("Error updating post:", err);
        return res.status(500).json({ message: "Failed to update post", error: err.message });
    }
}

async function deleteOrganisationStructurePost(req, res) {
    const { postId } = req.params;

    if (!postId) {
        return res.status(400).json({ message: "postId is required" });
    }

    try {
        const conn = await pool;
        const checkReq = conn.request();
        checkReq.input("postId", sql.VarChar(50), postId);

        // Check if any active employee holds this post
        const filledRes = await checkReq.query(`
            SELECT COUNT(*) AS filledCount 
            FROM tbl_hr_post_strength 
            WHERE post_id = @postId AND vacant_or_filled = 'filled'
        `);

        if (filledRes.recordset[0]?.filledCount > 0) {
            return res.status(400).json({ 
                message: "Cannot delete post: Active employees are currently assigned to this post." 
            });
        }

        // Delete from tbl_hr_post_strength
        const delStrReq = conn.request();
        delStrReq.input("postId", sql.VarChar(50), postId);
        await delStrReq.query(`DELETE FROM tbl_hr_post_strength WHERE post_id = @postId`);

        // Delete from mmt_hr_post
        const delPostReq = conn.request();
        delPostReq.input("postId", sql.VarChar(50), postId);
        await delPostReq.query(`DELETE FROM mmt_hr_post WHERE post_id = @postId`);

        return res.json({ success: true, message: "Post deleted successfully" });
    } catch (err) {
        console.error("Error deleting post:", err);
        return res.status(500).json({ message: "Failed to delete post", error: err.message });
    }
}

async function getOrganisationStructureDepartments(req, res) {
    try {
        const conn = await pool;
        const result = await conn.request().query(`
            SELECT DISTINCT
                department_id,
                LTRIM(RTRIM(department_name)) AS department_name
            FROM mmt_hr_department
            WHERE status = 1 OR status IS NULL
            ORDER BY department_name ASC
        `);
        return res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching departments:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

async function getOrganisationStructureClasses(req, res) {
    try {
        const conn = await pool;
        const result = await conn.request().query(`
            SELECT class_id, class AS class_name 
            FROM mmt_class 
            WHERE status = 1 OR status = 'true'
            ORDER BY class_id ASC
        `);
        return res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching classes:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export default { 
    createHrPost, 
    getHrPost, 
    getHrManagementPost, 
    getSanctionedStrength, 
    updateHrPostStrength, 
    getFilledVacantDataCount, 
    getMissingPostDataCount, 
    deleteHrPost,
    getActivityDateData,
    getOrganisationStructurePosts,
    addOrganisationStructurePost,
    updateOrganisationStructurePost,
    deleteOrganisationStructurePost,
    getOrganisationStructureDepartments,
    getOrganisationStructureClasses
};