import { pool } from "../../db.js";
import sql from "mssql";
import { getDataScope } from "../../middleware/dataScope.js";
import { httpError, withTransaction } from "./hrHelperFunctions.js";

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

// Columns copied from tbl_hr_post_strength into tbl_hr_deleted_post_strength when post codes are removed
const ARCHIVED_POST_CODE_COLUMNS = `post_id, post_code, department_id, vacant_or_filled, is_new, employee_id, emp_master_id, reference_id,
    date_of_arise_in_vacancy, vacancy_type, method_of_appointment, exception_abolish, exception_abolish_date,
    employee_joined_date, process_initiated_date, notification_adv_issued_date, renotification_adv_issued_date,
    exam_conducted_date, interview_conducted_date, selection_process_completed_date, result_declared_date,
    appointment_letter_issued_date, vigilance_clr_received_date, dpc_conducted_date, approval_by_ca_date,
    promotion_order_issued_date, application_received_date, review_application_by_comm, approval_received_date,
    order_issued_date, discharge_reason, revival_process_initiated, revival_remarks, revival_date, revival_stage_id,
    revival_submission_date, revive_proposal_sent_to_doe_date, revive_approval_date_from_doe,
    revive_rejection_date_from_doe, revive_remarks_from_doe, revive_proposal_rejected_by_doe_date,
    order_of_revival_issued_date, created_date, created_by, updated_date, updated_by, organisation_id, organisation_name`;

// reason_for_deletion is nvarchar(400) = 200 characters
const MAX_DELETION_REASON = 200;
const MAX_STRENGTH = 999;

function readDeletionReason(value) {
    const reason = String(value ?? "").trim();
    if (!reason) throw httpError(400, "Enter the reason for deletion.");
    if (reason.length > MAX_DELETION_REASON) throw httpError(400, `Reason must be at most ${MAX_DELETION_REASON} characters.`);
    return reason;
}

// Organisation users may change only their own organisation's posts; ministry users any
function canManageOrganisation(req, organisationId) {
    const { isWide, isOrganisation, organisationId: ownOrg } = getDataScope(req.user);
    if (isOrganisation) return Number(ownOrg) === Number(organisationId);
    return Boolean(isWide);
}

async function loadManagedPost(request, req, postId) {
    request.input("postId", sql.NVarChar(300), postId);
    const post = (await request.query(`
        SELECT post_id, post_name, department_id, class_id, sanctioned_strength, payscale_range, organisation_id
        FROM mmt_hr_post WITH (UPDLOCK, HOLDLOCK) WHERE post_id = @postId
    `)).recordset[0];
    if (!post) throw httpError(404, "Post not found.");
    if (!canManageOrganisation(req, post.organisation_id)) throw httpError(403, "You can change only your organisation's posts.");
    return post;
}

// Copy the post codes matched by `where` to tbl_hr_deleted_post_strength, then delete them
async function archiveAndDeletePostCodes(request, where, reason, userId) {
    request.input("reason", sql.NVarChar(MAX_DELETION_REASON), reason);
    request.input("userId", sql.Int, userId);
    await request.query(`
        INSERT INTO tbl_hr_deleted_post_strength (${ARCHIVED_POST_CODE_COLUMNS}, reason_for_deletion, deleted_date, deleted_by)
        SELECT ${ARCHIVED_POST_CODE_COLUMNS}, @reason, GETDATE(), @userId
        FROM tbl_hr_post_strength WHERE ${where};
        DELETE FROM tbl_hr_post_strength WHERE ${where};
    `);
}

function sendError(res, err, fallback) {
    if (err.status) return res.status(err.status).json({ message: err.message, ...(err.details || {}) });
    console.error(fallback, err);
    return res.status(500).json({ message: fallback });
}

/**
 * Edit a post. Strength is compared with the post codes that exist:
 * - higher: the missing codes are created (gaps in the numbering are reused first);
 * - lower: the user must choose which vacant codes go. Without `postCodesToDelete` the request is
 *   refused with 409 and the vacant codes to choose from; with exactly (current - new) vacant codes
 *   and `reason`, they are archived to tbl_hr_deleted_post_strength and deleted.
 * Everything runs in one transaction; sanctioned strength is then the number of post codes.
 */
async function updateOrganisationStructurePost(req, res) {
    const { postId } = req.params;
    const { postName, classId, sanctionedStrength, payscaleRange, postCodesToDelete, reason } = req.body;

    const cleanPostName = String(postName ?? "").trim();
    const newStrength = Number.parseInt(sanctionedStrength, 10);
    if (!postId || !cleanPostName) return res.status(400).json({ message: "postId and postName are required" });
    if (!Number.isInteger(newStrength) || newStrength < 1 || newStrength > MAX_STRENGTH) {
        return res.status(400).json({ message: `Sanctioned strength must be between 1 and ${MAX_STRENGTH}.` });
    }
    const userId = req.user?.userId ?? null;

    try {
        const result = await withTransaction(pool, async (request, transaction) => {
            const post = await loadManagedPost(request, req, postId);
            const codes = (await request.query(`
                SELECT post_code, vacant_or_filled, date_of_arise_in_vacancy, method_of_appointment
                FROM tbl_hr_post_strength WITH (UPDLOCK, HOLDLOCK) WHERE post_id = @postId
            `)).recordset;
            const currentStrength = codes.length;
            let deleted = 0;

            if (newStrength < currentStrength) {
                const toDelete = currentStrength - newStrength;
                const vacant = codes
                    .filter(c => String(c.vacant_or_filled).toLowerCase() === "vacant")
                    .map(({ post_code, date_of_arise_in_vacancy, method_of_appointment }) => ({
                        post_code: String(post_code).trim(), date_of_arise_in_vacancy, method_of_appointment }))
                    .sort((a, b) => a.post_code.localeCompare(b.post_code));
                const chosen = Array.isArray(postCodesToDelete) ? [...new Set(postCodesToDelete.map(c => String(c).trim()))] : [];
                if (!chosen.length) {
                    const err = httpError(409, vacant.length < toDelete
                        ? `Only ${vacant.length} post code(s) are vacant; filled post codes cannot be deleted.`
                        : `Select ${toDelete} vacant post code(s) to delete.`);
                    err.details = { code: "SELECT_POST_CODES", currentStrength, requestedStrength: newStrength, postsToDelete: toDelete, vacantPosts: vacant };
                    throw err;
                }
                if (chosen.length !== toDelete) throw httpError(400, `Select exactly ${toDelete} post code(s) to delete.`);
                const vacantCodes = new Set(vacant.map(c => c.post_code));
                const notVacant = chosen.filter(c => !vacantCodes.has(c));
                if (notVacant.length) throw httpError(400, `These are not vacant post codes of this post: ${notVacant.join(", ")}`);
                const deletionReason = readDeletionReason(reason);

                chosen.forEach((code, i) => request.input(`code${i}`, sql.NVarChar(50), code));
                const where = `post_id = @postId AND post_code IN (${chosen.map((_, i) => `@code${i}`).join(", ")})`;
                await archiveAndDeletePostCodes(request, where, deletionReason, userId);
                deleted = chosen.length;
            } else if (newStrength > currentStrength) {
                const organisationName = (await request.query(`
                    SELECT o.organisation_name FROM mmt_organisation o
                    JOIN mmt_hr_post p ON p.organisation_id = o.organisation_id WHERE p.post_id = @postId
                `)).recordset[0]?.organisation_name ?? null;
                // Same procedure the legacy page used: reuses gaps, sets vacancy_type / is_new / organisation
                const createRequest = new sql.Request(transaction);
                createRequest.input("PostID", sql.NVarChar(50), postId);
                createRequest.input("DepartmentID", sql.NVarChar(50), post.department_id);
                createRequest.input("organisationID", sql.Int, post.organisation_id);
                createRequest.input("organisationName", sql.NVarChar(50), organisationName);
                createRequest.input("Strength", sql.Int, newStrength);
                createRequest.input("CreatedBy", sql.Int, userId);
                await createRequest.execute("CreatePostsForIncreasedStrength");
            }

            request.input("postName", sql.NVarChar(300), cleanPostName);
            request.input("classId", sql.Int, Number.parseInt(classId, 10) || post.class_id);
            request.input("payscaleRange", sql.NVarChar(100), String(payscaleRange ?? "").trim() || post.payscale_range);
            request.input("updatedBy", sql.Int, userId);
            const strength = (await request.query(`
                UPDATE mmt_hr_post
                SET post_name = @postName,
                    class_id = @classId,
                    sanctioned_strength = (SELECT COUNT(*) FROM tbl_hr_post_strength WHERE post_id = @postId),
                    payscale_range = @payscaleRange,
                    updated_date = GETDATE(),
                    updated_by = @updatedBy
                WHERE post_id = @postId;
                SELECT sanctioned_strength FROM mmt_hr_post WHERE post_id = @postId;
            `)).recordset[0].sanctioned_strength;
            return { sanctionedStrength: strength, deletedPostCodes: deleted };
        });
        return res.json({ success: true, message: "Post updated successfully", ...result });
    } catch (err) {
        return sendError(res, err, "Failed to update post");
    }
}

/**
 * Delete a post and all its post codes, with a reason. Refused while any post code is filled.
 * The post is copied to tbl_hr_deleted_post and its codes to tbl_hr_deleted_post_strength first.
 */
async function deleteOrganisationStructurePost(req, res) {
    const { postId } = req.params;
    if (!postId) return res.status(400).json({ message: "postId is required" });
    const userId = req.user?.userId ?? null;

    try {
        await withTransaction(pool, async (request) => {
            const reason = readDeletionReason(req.body?.reason);
            await loadManagedPost(request, req, postId);
            const filled = (await request.query(`
                SELECT COUNT(*) AS filledCount FROM tbl_hr_post_strength
                WHERE post_id = @postId AND LOWER(vacant_or_filled) = 'filled'
            `)).recordset[0].filledCount;
            if (filled > 0) throw httpError(400, "Cannot delete post: Active employees are currently assigned to this post.");

            await archiveAndDeletePostCodes(request, "post_id = @postId", reason, userId);
            await request.query(`
                INSERT INTO tbl_hr_deleted_post (post_id, post_name, sanctioned_strength, class_id, department_id, payscale_range,
                    organisation_id, created_date, created_by, updated_date, updated_by, deleted_date, deleted_by, reason_for_deletion)
                SELECT post_id, post_name, sanctioned_strength, class_id, department_id, payscale_range,
                    organisation_id, created_date, created_by, updated_date, updated_by, GETDATE(), @userId, @reason
                FROM mmt_hr_post WHERE post_id = @postId;
                DELETE FROM mmt_hr_post WHERE post_id = @postId;
            `);
        });
        return res.json({ success: true, message: "Post deleted successfully" });
    } catch (err) {
        return sendError(res, err, "Failed to delete post");
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