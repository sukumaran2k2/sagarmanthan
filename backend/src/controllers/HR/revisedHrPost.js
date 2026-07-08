import { pool } from "../../db.js";
import sql from 'mssql';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {convertIntoVacantPost, getNewEmployeeIDofOrg} from "../HR/hrHelperFunctions.js";

const uploadDestination = "./fileuploads/HR";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/HR");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function createRevisedHrPost(req, res) {
const postName = req.body.postName;
const classID = req.body.selectedClass;
const sanctionedStrength = req.body.sanctionedStrength;
const departmentID = req.body.departmentID;
const organisationID = req.body.organisationID;
const payScale = req.body.payScale ?? null;
const userID = req.body.userID;

if (!postName || !classID || !sanctionedStrength || !departmentID || !organisationID) {
    return res.status(400).json({ error: "All fields are required." });
}

const conn = await pool;
const request = conn.request();

request.input("organisationID", organisationID);
request.input("departmentID", departmentID);

let basePrefixCaseID = organisationID.toString().padStart(2, '0') + departmentID;
let basePostIDResult = await request.query(`SELECT
    RIGHT('000' + CAST(
        ISNULL(
            MAX(
                CAST(SUBSTRING(post_id,
                    LEN(CAST(organisation_id AS VARCHAR)) + LEN(CAST(department_id AS VARCHAR)) + 1,
                    LEN(post_id) - (LEN(CAST(organisation_id AS VARCHAR)) + LEN(CAST(department_id AS VARCHAR)))
                ) AS INT)
            ),
            0
        ) + 1 AS VARCHAR), 3) AS next_post_number
FROM
    mmt_hr_post
WHERE
    department_id = @departmentID
    AND organisation_id = @organisationID`);

let basePostID = basePostIDResult.recordset[0].next_post_number;
let postID = basePrefixCaseID + basePostID;

request.input("postID",postID);

let checkThePostExistance = await request.query(`
    SELECT COUNT(*) AS count
    FROM mmt_hr_post
    WHERE post_id = @postID
`);

const postExists = checkThePostExistance.recordset[0].count > 0;
if(postExists){
    return res.status(400).json({message:"Error Occured in Post Creation due to the generated post ID is already exists!"});
}

request.input("postName", postName);
request.input("classID", classID);
request.input("sanctionedStrength", sanctionedStrength);
request.input("payScale", payScale);
request.input("userID", userID);

try {
    const result = await request.query(`
        INSERT INTO mmt_hr_post (
            post_id, post_name, sanctioned_strength, class_id, department_id, payscale_range, organisation_id, created_date, created_by
        )
        VALUES (
            @postID, @postName, @sanctionedStrength, @classID, @departmentID, @payScale, @organisationID, GETDATE(), @userID
        )
    `);

    const organisationResult = await request.query(`SELECT organisation_name FROM mmt_organisation WHERE organisation_id= @organisationID`);
    let organisationName = organisationResult.recordset[0].organisation_name;
    
    const newRequest = conn.request();
    newRequest.input("PostID", postID);
    newRequest.input("SanctionedStrength", sanctionedStrength);
    newRequest.input("DepartmentID", departmentID);
    newRequest.input("OrganisationID", organisationID);
    newRequest.input("CreatedBy", userID);
    newRequest.input("organisationName", organisationName);

    try {
        await newRequest.execute("GeneratePostCodes");
    } catch (err) {
        // console.error("Error executing Generate Post Codes:", err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

    return res.sendStatus(201);
} catch (err) {
    console.error(err);
    return res.status(500).json({message:"Internal Server Error",error:err});
}

};

async function getRevisedHrPost(req, res) {
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID",organisationID);

    try {
        const result = await request.query(`
            Select post_id,post_name,d.department_id,d.department_name,class,p.class_id,sanctioned_strength,payscale_range,updated_date
            FROM
            mmt_hr_post p
            LEFT JOIN mmt_hr_department d ON d.department_id = p.department_id
            LEFT JOIN mmt_class mmt ON mmt.class_id  = p.class_id
            WHERE p.organisation_id = @organisationID`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function getDivisionDropdownData(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
            Select *
            FROM
            mmt_hr_division di
            LEFT JOIN mmt_hr_department d ON d.department_id = di.department_id`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function updateRevisedHrPostStrength(req, res) {
    const Id = req.params.Id;
    const Strength = req.body.Strength;
    const postName = req.body.postName;
    const departmentID = req.body.departmentID;
    const classID = req.body.classID;
    const payScale = req.body.payScale;
    const userID = req.body.userID;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);
    request.input("Strength", Strength);
    request.input("postName", postName);
    request.input("departmentID",departmentID);
    request.input("classID", classID);
    request.input("payScale", payScale);
    request.input("userID",userID);

    try{
        const checkPostResult = await request.query(`SELECT organisation_id,sanctioned_strength, department_id FROM mmt_hr_post WHERE post_id = @Id`);
        const {sanctioned_strength : oldStrength , organisation_id : organisationID} = checkPostResult.recordset[0];

        request.input("organisationID",organisationID);

        const organisationResult = await request.query(`SELECT organisation_name FROM mmt_organisation WHERE organisation_id= @organisationID`);
        let organisationName = organisationResult.recordset[0].organisation_name;

        request.parameters = {};

        if (Strength > oldStrength) {
            const newRequest = conn.request();
            newRequest.input("PostID", Id);
            newRequest.input("DepartmentID", departmentID);
            newRequest.input("Strength", Strength);
            newRequest.input("CreatedBy", userID); 
            newRequest.input("organisationID", organisationID); 
            newRequest.input("organisationName",organisationName);

            await newRequest.execute("CreatePostsForIncreasedStrength");
        }
        else if(Strength < oldStrength){
            const newRequest = conn.request();
            newRequest.input("PostID", Id);
            const postCheckResult = await newRequest.query(`
                SELECT post_code,post_id,is_new,vacant_or_filled
                FROM tbl_hr_post_strength 
                WHERE post_id = @PostID 
                ORDER BY id DESC
            `);
            const oldStrength = postCheckResult.recordset.length;
            const postsToRemove = oldStrength - Strength;
            const checkIfAnyPostIsFilled = true;
            if (checkIfAnyPostIsFilled) {
                const vacantPostsResult = await newRequest.query(`
                    SELECT post_code, vacant_or_filled, date_of_arise_in_vacancy, method_of_appointment
                    FROM tbl_hr_post_strength 
                    WHERE post_id = @PostID AND vacant_or_filled = 'vacant'
                    ORDER BY date_of_arise_in_vacancy ASC
                `);
                const actualStrengthResult = await newRequest.query(`
                    SELECT sanctioned_strength from mmt_hr_post WHERE post_id = @postID`);
                return res.status(400).json({
                    message: "Cannot reduce strength because there are some posts that are already updated",
                    vacantPosts: vacantPostsResult.recordset,
                    actualStrength: actualStrengthResult.recordset
                });
            }
            const postsToDelete = postCheckResult.recordset.slice(0, postsToRemove);
            const postCodesToDelete = postsToDelete.map(post => `'${post.post_code}'`).join(",");
            try {
                await newRequest.query(`
                    DELETE FROM tbl_hr_post_strength 
                    WHERE post_code IN (${postCodesToDelete})
                `);
                newRequest.input("Strength", Strength);
                await newRequest.query(`
                    UPDATE mmt_hr_post 
                    SET sanctioned_strength = @Strength 
                    WHERE post_id = @PostID
                `);

            } catch (err) {
                console.error(err);
                res.status(500).json({
                    error: "An error occurred while reducing the post strength."
                });
            }
        }

        request.input("Strength", Strength);
        request.input("postName", postName);
        request.input("departmentID",departmentID);
        request.input("classID", classID);
        request.input("payScale", payScale);
        request.input("userID",userID);
        request.input("Id", Id);
        await request.query(`UPDATE mmt_hr_post SET sanctioned_strength = @Strength, post_name = @postName, class_id = @classID, payscale_range = @payScale, updated_date=GETDATE(), updated_by = @userID WHERE post_id = @Id`);
        await request.query(`UPDATE tbl_employee_transaction_details SET emp_post_name = @postName WHERE emp_post_id = @Id`);

        res.status(200).json({ message: "Post strength updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while updating post strength." });
    }

};


async function getRevisedHrManagementPost(req, res) {
    const organisationId = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationId", organisationId);
    
    const departmentQuery = `
        SELECT department_id
        FROM tbl_new_hr_department
        WHERE organisation_id = @organisationId
    `;
    

    try {
        const departmentResult = await request.query(departmentQuery);
        
        const departmentIds = departmentResult.recordset.map(department => department.department_id);

        const postQuery = `
            SELECT *
            FROM tbl_new_hr_post
            WHERE department_id IN (${departmentIds.join(',')})
        `;

        const postResult = await request.query(postQuery);
        
        res.json(postResult.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
};

async function getRevisedSanctionedStrength(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();
    
    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT sanctioned_strength FROM tbl_new_hr_post WHERE post_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function revisedDeleteHrPost(req, res) {
    const postID = req.params.postId;
    const reason = req.params.reason;
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();
    
    request.input("postID", postID);
    request.input("userID", userID);
    request.input("reason", reason);

    try {
        const countResult = await request.query(`SELECT COUNT(post_code) AS count FROM tbl_hr_post_strength WHERE post_id = @postID AND vacant_or_filled = 'filled'`);
        const count = countResult.recordset[0].count;

        const postResult = await request.query(`SELECT * FROM mmt_hr_post WHERE post_id = @postID`);
        const postData = postResult.recordset[0];
        const mmtPostRequest = conn.request();

        mmtPostRequest.input("postID", postData.post_id);
        mmtPostRequest.input("postName", postData.post_name);
        mmtPostRequest.input("sanctionedStrength", postData.sanctioned_strength);
        mmtPostRequest.input("classID", postData.class_id);
        mmtPostRequest.input("departmentID", postData.department_id);
        mmtPostRequest.input("payScale", postData.payscale_range);
        mmtPostRequest.input("organisationID", postData.organisation_id);
        mmtPostRequest.input("createdBy", postData.created_by);
        mmtPostRequest.input("createdDate", postData.created_date);
        mmtPostRequest.input("updatedDate", postData.updated_date);
        mmtPostRequest.input("updatedBy", postData.updated_by);
        mmtPostRequest.input("userID", userID);
        mmtPostRequest.input("reason", reason);

        await mmtPostRequest.query(`
            INSERT INTO tbl_hr_deleted_post (
                post_id, post_name, sanctioned_strength, class_id, department_id, payscale_range, organisation_id, created_date, created_by, updated_date, updated_by, deleted_date, deleted_by, reason_for_deletion
            ) VALUES (
                @postID, @postName, @sanctionedStrength, @classID, @departmentID, @payScale, @organisationID, @createdDate, @createdBy, @updatedDate, @updatedBy, GETDATE(), @userID, @reason
            )
        `);

        await request.query(`DELETE FROM mmt_hr_post WHERE post_id = @postID`);

        const postDataResult = await request.query(`SELECT * FROM tbl_hr_post_strength WHERE post_id = @postID`);
        const postStrengthData = postDataResult.recordset;

       if(count !=0 ){
            const filledPostData = postDataResult.recordset.filter(post => post.vacant_or_filled === 'filled').map(post => ({
                post_code: post.post_code,
                employee_id: post.employee_id,
                emp_master_id: post.emp_master_id
            }));
            for (const post of filledPostData) {
                const filledPostRequest = conn.request();

                filledPostRequest.input("postCode",post.post_code);
                filledPostRequest.input("employeeID",post.employee_id);
                filledPostRequest.input("empMasterID",post.emp_master_id);

                await filledPostRequest.query(`
                    UPDATE tbl_employee_transaction_details
                    SET
                        emp_post_end_date = GETDATE(),
                        method_of_discharge = 'Employee Removed due to post deletion'
                    WHERE
                        emp_post_end_date IS NULL AND
                        emp_post_code = @postCode AND
                        employee_id = @employeeID AND
                        emp_master_id = @empMasterID
                `);
                await filledPostRequest.query(`
                    UPDATE tbl_employee_master
                    SET emp_status = 0
                    WHERE emp_master_id = @empMasterID
                `);
            }
        }

        for (const post of postStrengthData) {
            const insertRequest = conn.request();

            insertRequest.input("postId", post.post_id);
            insertRequest.input("postCode", post.post_code);
            insertRequest.input("departmentID", post.department_id);
            insertRequest.input("vacantOrFilled", post.vacant_or_filled);
            insertRequest.input("isNew", post.is_new);
            insertRequest.input("employeeID", post.employee_id);
            insertRequest.input("empMasterID", post.emp_master_id);
            insertRequest.input("referenceID", post.reference_id);
            insertRequest.input("dateOfAriseInVacancy", post.date_of_arise_in_vacancy);
            insertRequest.input("vacancyType", post.vacancy_type);
            insertRequest.input("methodOfAppointment", post.method_of_appointment);
            insertRequest.input("exceptionAbolish", post.exception_abolish);
            insertRequest.input("employeeJoinedDate", post.employee_joined_date);
            insertRequest.input("processInitiatedDate", post.process_initiated_date);
            insertRequest.input("notificationIssuedDate", post.notification_adv_issued_date);
            insertRequest.input("renotificationIssuedDate", post.renotification_adv_issued_date);
            insertRequest.input("examConductedDate", post.exam_conducted_date);
            insertRequest.input("interviewConductedDate", post.interview_conducted_date);
            insertRequest.input("selectionProcessCompletedDate", post.selection_process_completed_date);
            insertRequest.input("resultDeclaredDate", post.result_declared_date);
            insertRequest.input("appointmentLetterIssuedDate", post.appointment_letter_issued_date);
            insertRequest.input("vigilanceClearanceDate", post.vigilance_clr_received_date);
            insertRequest.input("dpcConductedDate", post.dpc_conducted_date);
            insertRequest.input("approvalByAuthorityDate", post.approval_by_ca_date);
            insertRequest.input("promotionOrderIssuedDate", post.promotion_order_issued_date);
            insertRequest.input("applicationReceivedDate", post.application_received_date);
            insertRequest.input("reviewApplicationByComm", post.review_application_by_comm);
            insertRequest.input("approvalReceivedDate", post.approval_received_date);
            insertRequest.input("orderIssuedDate", post.order_issued_date);
            insertRequest.input("dischargeReason", post.discharge_reason);
            insertRequest.input("createdDate", post.created_date);
            insertRequest.input("createdBy", post.created_by);
            insertRequest.input("updatedDate", post.updated_date);
            insertRequest.input("updatedBy", post.updated_by);
            insertRequest.input("organisationID", post.organisation_id);
            insertRequest.input("organisationName", post.organisation_name);
            insertRequest.input("reason", reason);
            insertRequest.input("userID", userID);

            await insertRequest.query(`
                INSERT INTO tbl_hr_deleted_post_strength (
                    post_id, post_code, department_id, vacant_or_filled, is_new, employee_id, emp_master_id, reference_id,
                    date_of_arise_in_vacancy, vacancy_type, method_of_appointment, exception_abolish,
                    employee_joined_date, process_initiated_date, notification_adv_issued_date, renotification_adv_issued_date,
                    exam_conducted_date, interview_conducted_date, selection_process_completed_date, result_declared_date,
                    appointment_letter_issued_date, vigilance_clr_received_date, dpc_conducted_date, approval_by_ca_date,
                    promotion_order_issued_date, application_received_date, review_application_by_comm, approval_received_date,
                    order_issued_date, discharge_reason, created_date, created_by, updated_date, updated_by,
                    reason_for_deletion, deleted_date, deleted_by, organisation_id, organisation_name
                ) VALUES (
                    @postId, @postCode, @departmentID, @vacantOrFilled, @isNew, @employeeID, @empMasterID, @referenceID,
                    @dateOfAriseInVacancy, @vacancyType, @methodOfAppointment, @exceptionAbolish,
                    @employeeJoinedDate, @processInitiatedDate, @notificationIssuedDate, @renotificationIssuedDate,
                    @examConductedDate, @interviewConductedDate, @selectionProcessCompletedDate, @resultDeclaredDate,
                    @appointmentLetterIssuedDate, @vigilanceClearanceDate, @dpcConductedDate, @approvalByAuthorityDate,
                    @promotionOrderIssuedDate, @applicationReceivedDate, @reviewApplicationByComm, @approvalReceivedDate,
                    @orderIssuedDate, @dischargeReason, @createdDate, @createdBy, @updatedDate, @updatedBy,
                    @reason, GETDATE(), @userID, @organisationID, @organisationName
                )
            `);
        }

        await request.query(`DELETE FROM tbl_hr_post_strength WHERE post_id = @postID`);

        res.sendStatus(201);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
};

async function deleteHrPostCodes(req, res) {
    const { checkedPostCodes, reason, userID } = req.body;

    if (!Array.isArray(checkedPostCodes) || checkedPostCodes.length === 0) {
        return res.status(400).json({ error: "checkedPostCodes must be a non-empty array." });
    }

    const conn = await pool;
    const request = conn.request();

    request.input("reason", reason);
    request.input("userID", userID);

    try {
        request.input("postCode", checkedPostCodes[0]);
        const postCheckResult = await request.query(`SELECT post_id FROM tbl_hr_post_strength WHERE post_code = @postCode`);

        if (postCheckResult.recordset.length === 0) {
            return res.status(404).json({ error: "Post code not found" });
        }

        const deletingPostId = postCheckResult.recordset[0].post_id;
        request.input("deletingPostId", deletingPostId);

        checkedPostCodes.forEach((code, index) => {
            request.input(`postCode${index}`, code);
        });

        const postDataResult = await request.query(
            `SELECT * FROM tbl_hr_post_strength WHERE post_code IN (${checkedPostCodes.map((_, i) => `@postCode${i}`).join(",")})`
        );

        const postData = postDataResult.recordset;

        for (const post of postData) {
            const insertRequest = conn.request();

            insertRequest.input("postId", post.post_id);
            insertRequest.input("postCode", post.post_code);
            insertRequest.input("departmentID", post.department_id);
            insertRequest.input("vacantOrFilled", post.vacant_or_filled);
            insertRequest.input("isNew", post.is_new);
            insertRequest.input("employeeID", post.employee_id);
            insertRequest.input("empMasterID", post.emp_master_id);
            insertRequest.input("referenceID", post.reference_id);
            insertRequest.input("dateOfAriseInVacancy", post.date_of_arise_in_vacancy);
            insertRequest.input("vacancyType", post.vacancy_type);
            insertRequest.input("methodOfAppointment", post.method_of_appointment);
            insertRequest.input("exceptionAbolish", post.exception_abolish);
            insertRequest.input("employeeJoinedDate", post.employee_joined_date);
            insertRequest.input("processInitiatedDate", post.process_initiated_date);
            insertRequest.input("notificationIssuedDate", post.notification_adv_issued_date);
            insertRequest.input("renotificationIssuedDate", post.renotification_adv_issued_date);
            insertRequest.input("examConductedDate", post.exam_conducted_date);
            insertRequest.input("interviewConductedDate", post.interview_conducted_date);
            insertRequest.input("selectionProcessCompletedDate", post.selection_process_completed_date);
            insertRequest.input("resultDeclaredDate", post.result_declared_date);
            insertRequest.input("appointmentLetterIssuedDate", post.appointment_letter_issued_date);
            insertRequest.input("vigilanceClearanceDate", post.vigilance_clr_received_date);
            insertRequest.input("dpcConductedDate", post.dpc_conducted_date);
            insertRequest.input("approvalByAuthorityDate", post.approval_by_ca_date);
            insertRequest.input("promotionOrderIssuedDate", post.promotion_order_issued_date);
            insertRequest.input("applicationReceivedDate", post.application_received_date);
            insertRequest.input("reviewApplicationByComm", post.review_application_by_comm);
            insertRequest.input("approvalReceivedDate", post.approval_received_date);
            insertRequest.input("orderIssuedDate", post.order_issued_date);
            insertRequest.input("dischargeReason", post.discharge_reason);
            insertRequest.input("createdDate", post.created_date);
            insertRequest.input("createdBy", post.created_by);
            insertRequest.input("updatedDate", post.updated_date);
            insertRequest.input("updatedBy", post.updated_by);
            insertRequest.input("organisationID", post.organisation_id);
            insertRequest.input("organisationName", post.organisation_name);
            insertRequest.input("reason", reason);
            insertRequest.input("userID", userID);

            await insertRequest.query(`
                INSERT INTO tbl_hr_deleted_post_strength (
                    post_id, post_code, department_id, vacant_or_filled, is_new, employee_id, emp_master_id, reference_id,
                    date_of_arise_in_vacancy, vacancy_type, method_of_appointment, exception_abolish,
                    employee_joined_date, process_initiated_date, notification_adv_issued_date, renotification_adv_issued_date,
                    exam_conducted_date, interview_conducted_date, selection_process_completed_date, result_declared_date,
                    appointment_letter_issued_date, vigilance_clr_received_date, dpc_conducted_date, approval_by_ca_date,
                    promotion_order_issued_date, application_received_date, review_application_by_comm, approval_received_date,
                    order_issued_date, discharge_reason, created_date, created_by, updated_date, updated_by,
                    reason_for_deletion, deleted_date, deleted_by, organisation_id, organisation_name
                ) VALUES (
                    @postId, @postCode, @departmentID, @vacantOrFilled, @isNew, @employeeID, @empMasterID, @referenceID,
                    @dateOfAriseInVacancy, @vacancyType, @methodOfAppointment, @exceptionAbolish,
                    @employeeJoinedDate, @processInitiatedDate, @notificationIssuedDate, @renotificationIssuedDate,
                    @examConductedDate, @interviewConductedDate, @selectionProcessCompletedDate, @resultDeclaredDate,
                    @appointmentLetterIssuedDate, @vigilanceClearanceDate, @dpcConductedDate, @approvalByAuthorityDate,
                    @promotionOrderIssuedDate, @applicationReceivedDate, @reviewApplicationByComm, @approvalReceivedDate,
                    @orderIssuedDate, @dischargeReason, @createdDate, @createdBy, @updatedDate, @updatedBy,
                    @reason, GETDATE(), @userID, @organisationID, @organisationName
                )
            `);
        }

        const deleteRequest = conn.request();
        checkedPostCodes.forEach((code, index) => {
            deleteRequest.input(`postCode${index}`, code);
        });

        await deleteRequest.query(
            `DELETE FROM tbl_hr_post_strength WHERE post_code IN (${checkedPostCodes.map((_, i) => `@postCode${i}`).join(",")})`
        );

        const countOfPostResult = await request.query(
            `SELECT COUNT(post_code) AS count FROM tbl_hr_post_strength WHERE post_id = @deletingPostId`
        );

        const countOfPost = countOfPostResult.recordset[0].count;
        const updateRequest = conn.request();
        updateRequest.input("countOfPost", countOfPost);
        updateRequest.input("deletingPostId", deletingPostId);

        await updateRequest.query(
            `UPDATE mmt_hr_post SET sanctioned_strength = @countOfPost WHERE post_id = @deletingPostId`
        );

        return res.sendStatus(201);
    } catch (err) {
        // console.error("Error deleting HR post codes:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

async function getPostListByDepAndOrg(req, res) {
    const organisationID = req.params.organisationID;
    const departmentID = req.params.departmentID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    if (departmentID != "None" && departmentID != '0' ) {
        request.input("departmentID", departmentID);
     }

    try {
        let query = `SELECT * FROM mmt_hr_post p
                        WHERE organisation_id =@organisationID`;
        if (departmentID != "None" && departmentID != '0') {
           query += ` AND department_id = @departmentID`;
        }
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function updateFilledPostActivity(req,res){
    let {dateOfVacancy, methodOfAppointment, postCode, dateFields, userID} = req.body;
    const conn = await pool;
    const request = conn.request();

    request.input("postCode", postCode);
    request.input("userID", userID);
    request.input("dateOfVacancy", dateOfVacancy);

    const processedDateFields = {
        processInitiatedDate: dateFields.processInitiatedDate || null,
        notificationIssuedDate: dateFields.notificationIssuedDate || null,
        reNotificationIssuedDate: dateFields.reNotificationIssuedDate || null,
        examConductedDate: dateFields.examConductedDate || null,
        interviewConductedDate: dateFields.interviewConductedDate || null,
        selectionProcessDate: dateFields.selectionProcessDate || null,
        resultDeclaredDate: dateFields.resultDeclaredDate || null,
        appointmentLetterIssuedDate: dateFields.appointmentLetterIssuedDate || null,
        employeeJoiningDateDR: dateFields.employeeJoiningDateDR || null,
        vigilanceClearanceDate: dateFields.vigilanceClearanceDate || null,
        dpcConductedDate: dateFields.dpcConductedDate || null,
        approvalByAuthorityDate: dateFields.approvalByAuthorityDate || null,
        promotionOrderDate: dateFields.promotionOrderDate || null,
        employeeJoiningDatePromotion: dateFields.employeeJoiningDatePromotion || null,
        employeeJoiningDateDeputation: dateFields.employeeJoiningDateDeputation || null,
        employeeJoiningDateComposite: dateFields.employeeJoiningDateComposite || null,
        employeeJoinedDateAbsorption: dateFields.employeeJoinedDateAbsorption || null,
    };

    request.input("processInitiatedDate", processedDateFields.processInitiatedDate);
    request.input("notificationIssuedDate", processedDateFields.notificationIssuedDate);
    request.input("reNotificationIssuedDate", processedDateFields.reNotificationIssuedDate);
    request.input("examConductedDate", processedDateFields.examConductedDate);
    request.input("interviewConductedDate", processedDateFields.interviewConductedDate);
    request.input("selectionProcessDate", processedDateFields.selectionProcessDate);
    request.input("resultDeclaredDate", processedDateFields.resultDeclaredDate);
    request.input("appointmentLetterIssuedDate", processedDateFields.appointmentLetterIssuedDate);
    request.input("employeeJoiningDateDR", processedDateFields.employeeJoiningDateDR);
    request.input("vigilanceClearanceDate", processedDateFields.vigilanceClearanceDate);
    request.input("dpcConductedDate", processedDateFields.dpcConductedDate);
    request.input("approvalByAuthorityDate", processedDateFields.approvalByAuthorityDate);
    request.input("promotionOrderDate", processedDateFields.promotionOrderDate);
    request.input("employeeJoiningDatePromotion", processedDateFields.employeeJoiningDatePromotion);
    request.input("employeeJoiningDateDeputation", processedDateFields.employeeJoiningDateDeputation);
    request.input("employeeJoiningDateComposite", processedDateFields.employeeJoiningDateComposite);
    request.input("employeeJoinedDateAbsorption", processedDateFields.employeeJoinedDateAbsorption);

    try {
        if (methodOfAppointment === "Direct Recruitment") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, process_initiated_date = @processInitiatedDate,
                    notification_adv_issued_date = @notificationIssuedDate,
                    renotification_adv_issued_date = @reNotificationIssuedDate,
                    exam_conducted_date = @examConductedDate,
                    interview_conducted_date = @interviewConductedDate,
                    selection_process_completed_date = @selectionProcessDate,
                    result_declared_date = @resultDeclaredDate,
                    appointment_letter_issued_date = @appointmentLetterIssuedDate,
                    employee_joined_date = @employeeJoiningDateDR,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                updated_by : userID
            });
        } else if (methodOfAppointment === "promotion") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, process_initiated_date = @processInitiatedDate,
                    vigilance_clr_received_date = @vigilanceClearanceDate,
                    dpc_conducted_date = @dpcConductedDate,
                    approval_by_ca_date = @approvalByAuthorityDate,
                    promotion_order_issued_date =@promotionOrderDate,
                    employee_joined_date = @employeeJoiningDatePromotion,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                updated_by : userID
            });
        } else if (methodOfAppointment === "Deputation In") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, process_initiated_date = @processInitiatedDate,
                    notification_issued_date = @notificationIssuedDate,
                    review_application_by_comm = @reviewOfApplicationDate,
                    approval_received_date = @approvalReceivedDate,
                    order_issued_date = @orderIssuedDate,
                    employee_joined_date = @employeeJoiningDateDeputation,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                updated_by : userID
            });
        }else if (methodOfAppointment === "Composite Method") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, process_initiated_date = @processInitiatedDate,
                    notification_issued_date = @notificationIssuedDate,
                    review_application_by_comm = @reviewOfApplicationDate,
                    approval_received_date = @approvalReceivedDate,
                    order_issued_date = @orderIssuedDate,
                    employee_joined_date = @employeeJoiningDateComposite,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                userID
            });
        } else if (methodOfAppointment === "Absorption") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, employee_joined_date = @employeeJoinedDateAbsorption,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                userID
            });
        } else if (methodOfAppointment === "Transfer In") {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET date_of_arise_in_vacancy = @dateOfVacancy, process_initiated_date = @processInitiatedDate,
                    notification_issued_date = @notificationIssuedDate,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE post_code = @postCode
            `, {
                dateOfVacancy,
                ...processedDateFields,
                userID
            });
        }

        res.status(201).json({ message: "Post activity updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while updating post activity." });
    }
}

//vacancy status

async function updatePostStrengthLog(req, res) {
    const organisationID = req.body.organisationID;
    const methodOfAppointment = req.body.methodOfAppointment;
    const vacancyType = req.body.vacancyType;
    let exceptionAbolish = null;
    if (req.body.exceptionAbolish) {
        if (req.body.exceptionAbolish === "1" || req.body.exceptionAbolish === "0") {
            exceptionAbolish = parseInt(req.body.exceptionAbolish);
        }
    }
    const reasonForExemption = req.body.reasonForExemption?.length ? req.body.reasonForExemption : null;
    const recruitmentThrough = req.body.recruitmentThrough?.length ? req.body.recruitmentThrough : null;

    const processInitiatedDate = req.body.processInitiatedDate?.length ? req.body.processInitiatedDate : null;
    const notificationIssuedDate = req.body.notificationIssuedDate?.length ? req.body.notificationIssuedDate : null;
    const reNotificationIssuedDate = req.body.reNotificationIssuedDate?.length ? req.body.reNotificationIssuedDate : null;
    const examConductedDate = req.body.examConductedDate?.length ? req.body.examConductedDate : null;
    const interviewConductedDate = req.body.interviewConductedDate?.length ? req.body.interviewConductedDate : null;
    const selectionProcessDate = req.body.selectionProcessDate?.length ? req.body.selectionProcessDate : null;
    const resultDeclaredDate = req.body.resultDeclaredDate?.length ? req.body.resultDeclaredDate : null;
    const appointmentLetterIssuedDate = req.body.appointmentLetterIssuedDate?.length ? req.body.appointmentLetterIssuedDate : null;

    const dischargeReason = req.body.dischargeReason?.length ? req.body.dischargeReason : null;

    const applicationReceivedDeputation = req.body.applicationReceivedDeputation?.length ? req.body.applicationReceivedDeputation : null;
    const reviewOfApplicationDeputation = req.body.reviewOfApplicationDeputation?.length ? req.body.reviewOfApplicationDeputation : null;
    const approvalReceivedDeputation = req.body.approvalReceivedDeputation?.length ? req.body.approvalReceivedDeputation : null;
    const orderIssuedDeputation = req.body.orderIssuedDeputation?.length ? req.body.orderIssuedDeputation : null;
    const organisationOfEmp = req.body.organisationOfEmp?.length ? req.body.organisationOfEmp : null;

    const vigilanceClearanceDatePromotion = req.body.vigilanceClearanceDatePromotion?.length ? req.body.vigilanceClearanceDatePromotion : null;
    const dpcConductedDatePromotion = req.body.dpcConductedDatePromotion?.length ? req.body.dpcConductedDatePromotion : null;
    const approvalByAuthorityDatePromotion = req.body.approvalByAuthorityDatePromotion?.length ? req.body.approvalByAuthorityDatePromotion : null;
    const orderDatePromotion = req.body.orderDatePromotion?.length ? req.body.orderDatePromotion : null;
    const selectEmployeeId = req.body.selectEmployeeId?.length ? req.body.selectEmployeeId : null;

    const selectDeputedEmployeeId = req.body.deputedEmpId?.length ? req.body.deputedEmpId : null;
    const selectDeputedEmployeeMasterId = req.body.deputedEmpMasterId ? (Array.isArray(req.body.deputedEmpMasterId) ? req.body.deputedEmpMasterId[0] : req.body.deputedEmpMasterId) : null;
    const transferEmpId = req.body.transferEmpId?.length ? req.body.transferEmpId : null;
    let transferEmpMasterId = req.body.transferEmpMasterId;
    const dateOfJoiningTransferIn = req.body.dateOfJoiningTransferIn?.length ? req.body.dateOfJoiningTransferIn : null;
    const numberOfEligibleApplication = req.body.numberOfEligibleApplication?.length ? req.body.numberOfEligibleApplication : null;

    const approvalCompetentAuthorityDateCHD = req.body.approvalCompetentAuthorityDateCHD;
    const orderIssuedDateCHD = req.body.orderIssuedDateCHD;
    const dateOfJoiningCHD = req.body.dateOfJoiningCHD;
    const fromWhichPostCHD = req.body.fromWhichPostCHD;
    const chdCategoryEmpMasterId  = req.body.chdCategoryEmpMasterId ;

    const employeeJoinedDate = req.body.employeeJoinedDate?.length ? req.body.employeeJoinedDate : null;
    let postEndDate = null;
    if (employeeJoinedDate) {
        const date = new Date(employeeJoinedDate);
        date.setDate(date.getDate() - 1);
        postEndDate = date.toISOString().split('T')[0];
    }

    const dateOfAriseInVacancy = req.body.dateOfAriseInVacancy?.length ? req.body.dateOfAriseInVacancy : null;

    const allFieldsFilled = req.body.allFieldsFilled;

    const postID = req.body.postId;
    const postCode = req.body.postCode;
    const userID = req.body.userID;

    const currentDate = new Date().toISOString().slice(0, 10);

    const conn = await pool;
    const request = conn.request();

    const transaction = new sql.Transaction(conn);

    request.input("organisationID", organisationID);
    request.input("processInitiatedDate", processInitiatedDate);
    request.input("notificationIssuedDate", notificationIssuedDate);
    request.input("reNotificationIssuedDate", reNotificationIssuedDate);
    request.input("examConductedDate", examConductedDate);
    request.input("interviewConductedDate", interviewConductedDate);
    request.input("selectionProcessDate", selectionProcessDate);
    request.input("resultDeclaredDate", resultDeclaredDate);
    request.input("appointmentLetterIssuedDate", appointmentLetterIssuedDate);
    request.input("postID", postID);
    request.input("postCode", postCode);
    request.input("exceptionAbolish", exceptionAbolish);
    request.input("reasonForExemption",reasonForExemption);
    request.input("recruitmentThrough",recruitmentThrough);

    request.input("dischargeReason", dischargeReason);
    request.input("vacancyType",vacancyType);

    request.input("applicationReceivedDeputation", applicationReceivedDeputation);
    request.input("reviewOfApplicationDeputation", reviewOfApplicationDeputation);
    request.input("approvalReceivedDeputation", approvalReceivedDeputation);
    request.input("orderIssuedDeputation", orderIssuedDeputation);
    request.input("organisationOfEmp", organisationOfEmp);
    request.input("employeeJoinedDate", employeeJoinedDate);

    request.input("vigilanceClearanceDatePromotion", vigilanceClearanceDatePromotion);
    request.input("dpcConductedDatePromotion", dpcConductedDatePromotion);
    request.input("approvalByAuthorityDatePromotion", approvalByAuthorityDatePromotion);
    request.input("orderDatePromotion", orderDatePromotion);
    request.input("selectEmployeeId", selectEmployeeId);
    request.input("currentDate", currentDate);
    request.input("selectDeputedEmployeeId", selectDeputedEmployeeId);
    request.input("selectDeputedEmployeeMasterId", selectDeputedEmployeeMasterId);


    request.input("postEndDate", postEndDate);

    request.input("dateOfAriseInVacancy", dateOfAriseInVacancy);
    request.input("userID", userID);

    request.input("transferEmpId", transferEmpId);
    request.input("transferEmpMasterId", transferEmpMasterId);
    request.input("dateOfJoiningTransferIn", dateOfJoiningTransferIn);

    request.input("numberOfEligibleApplication", numberOfEligibleApplication);


    request.input("approvalCompetentAuthorityDateCHD", approvalCompetentAuthorityDateCHD);
    request.input("orderIssuedDateCHD", orderIssuedDateCHD);
    request.input("dateOfJoiningCHD", dateOfJoiningCHD);
    request.input("fromWhichPostCHD", fromWhichPostCHD);
    request.input("chdCategoryEmpMasterId", chdCategoryEmpMasterId);

    await transaction.begin();
    switch (methodOfAppointment) {
        case 'directRecruitment':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength_log
                // SET process_initiated_date = @processInitiatedDate,
                //  notification_adv_issued_date = @notificationIssuedDate,
                //  renotification_adv_issued_date = @reNotificationIssuedDate,
                //  exam_conducted_date = @examConductedDate,
                //  interview_conducted_date = @interviewConductedDate,
                //  selection_process_completed_date = @selectionProcessDate,
                //  result_declared_date = @resultDeclaredDate,
                //  appointment_letter_issued_date = @appointmentLetterIssuedDate
                //  WHERE post_code = @postCode`);



                await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                    vacancy_type = @vacancyType,
                    method_of_appointment ='Direct Recruitment',
                    is_new = 0,
                    date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                    is_recruitment_through_ipa = @recruitmentThrough,
                    exception_abolish = @exceptionAbolish,
                    reason_for_exemption = @reasonForExemption,
                    process_initiated_date = @processInitiatedDate,
                    notification_adv_issued_date = @notificationIssuedDate,
                    number_of_eligible_application = @numberOfEligibleApplication,
                    renotification_adv_issued_date = @reNotificationIssuedDate,
                    exam_conducted_date = @examConductedDate,
                    interview_conducted_date = @interviewConductedDate,
                    selection_process_completed_date = @selectionProcessDate,
                    result_declared_date = @resultDeclaredDate,
                    appointment_letter_issued_date = @appointmentLetterIssuedDate,
                    vigilance_clr_received_date = NULL,
                    dpc_conducted_date = NULL,
                    approval_by_ca_date = NULL,
                    promotion_order_issued_date = NULL,
                    application_received_date = NULL,
                    review_application_by_comm = NULL,
                    approval_received_date = NULL,
                    order_issued_date = NULL,
                    discharge_reason = @dischargeReason,
                    updated_date = @currentDate,
                    updated_by = @userID
                WHERE post_code = @postCode
            `);

                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'promotion':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = CASE
                            WHEN @employeeJoinedDate IS NOT NULL AND
                                 @vigilanceClearanceDatePromotion IS NOT NULL AND
                                 @dpcConductedDatePromotion IS NOT NULL AND
                                 @approvalByAuthorityDatePromotion IS NOT NULL AND
                                 @orderDatePromotion IS NOT NULL AND
                                 @selectEmployeeId IS NOT NULL AND
                                 @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                        vacancy_type = @vacancyType,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        process_initiated_date = @processInitiatedDate,
                        method_of_appointment = 'Promotion',
                        employee_joined_date = @employeeJoinedDate,
                        vigilance_clr_received_date = @vigilanceClearanceDatePromotion,
                        dpc_conducted_date = @dpcConductedDatePromotion,
                        approval_by_ca_date = @approvalByAuthorityDatePromotion,
                        promotion_order_issued_date = @orderDatePromotion,
                        application_received_date = NULL,
                        review_application_by_comm = NULL,
                        approval_received_date = NULL,
                        order_issued_date = NULL,
                        number_of_eligible_application = NULL,
                        exam_conducted_date = NULL,
                        interview_conducted_date = NULL,
                        selection_process_completed_date = NULL,
                        result_declared_date = NULL,
                        appointment_letter_issued_date = NULL,
                        discharge_reason = @dischargeReason,
                        updated_date = @currentDate,
                        updated_by = @userID
                    WHERE post_code = @postCode
                `);


                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);

                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;

                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);



                if (selectEmployeeId != '' && selectEmployeeId != null) {
                    const empResult = await request.query(`SELECT TOP 1 *
                        FROM tbl_employee_transaction_details
                        WHERE employee_id = @selectEmployeeId
                        ORDER BY 1 DESC;`)

                    const employeeIDPrev = empResult.recordset[0].employee_id;
                    const empMasterIDPrev = empResult.recordset[0].emp_master_id
                    const employeeRefIDPrev = empResult.recordset[0].emp_reference_id;
                    const empWorkingOrgIDPrev = empResult.recordset[0].emp_working_org_id;
                    const methodOfAppointmentPrev = empResult.recordset[0].method_of_appointment;
                    const empPostCodePrev = empResult.recordset[0].emp_post_code;
                   // const methodOfDischarge = methodOfAppointmentPrev + 'End';
                   const methodOfDischarge = `${methodOfAppointmentPrev} End`;

                    request.input("employeeIDPrev", employeeIDPrev);
                    request.input("empMasterIDPrev", empMasterIDPrev);
                    request.input("employeeRefIDPrev", employeeRefIDPrev);
                    request.input("empWorkingOrgIDPrev", empWorkingOrgIDPrev);
                    request.input("methodOfAppointmentPrev", methodOfAppointmentPrev);
                    request.input("empPostCodePrev", empPostCodePrev);
                    request.input("methodOfDischarge", methodOfDischarge);

                    const postResult = await request.query(`SELECT post_code, post_id FROM tbl_hr_post_strength
                                WHERE employee_id = @employeeIDPrev`);
                    const empPrevPostId = postResult.recordset[0].post_id;
                    const empPrevPostCode = postResult.recordset[0].post_code;

                    request.input("empPrevPostId", empPrevPostId);
                    request.input("empPrevPostCode", empPrevPostCode);

                    const updateEmpInPostStrength = await request.query(`UPDATE tbl_hr_post_strength
                    SET
                        employee_id = @employeeIDPrev,
                        emp_master_id = @empMasterIDPrev,
                        updated_date = @currentDate,
                        updated_by = @userID
                        WHERE post_code = @postCode`);

                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                activity_name = 'Promotion',
                                updated_date = @currentDate,
                            updated_by = @userID
                            WHERE employee_id = @employeeIDPrev
                                AND emp_master_id = @empMasterIDPrev
                                AND emp_post_code = @empPostCodePrev
                                AND method_of_appointment = @methodOfAppointmentPrev
                        `);

                        //making the post vacant

                        const empDataResult = await request.query(`SELECT TOP 1 *
                            FROM tbl_employee_transaction_details
                            WHERE employee_id = @selectEmployeeId
                            ORDER BY 1 DESC;`)

                        const empPostCodePrevious = empDataResult.recordset[0].emp_post_code;
                        request.input("empPostCodePrevious",empPostCodePrevious);

                        await convertIntoVacantPost(request,empPostCodePrevious,postEndDate);

                    const promotionDate = currentDate;
                    request.input("promotionDate", promotionDate);
                    await request.query(`INSERT INTO tbl_employee_transaction_details (
                    employee_id, emp_master_id, emp_reference_id, emp_post_join_date, method_of_appointment, employee_joining_date, emp_department_id, emp_post_id,
                    emp_post_code, emp_post_name, emp_department_name, emp_working_org_id,  promotion_date, created_date, created_by)
                    VALUES (@employeeIDPrev, @empMasterIDPrev, @employeeRefIDPrev , @employeeJoinedDate, 'Promotion' , @employeeJoinedDate, @departmentId, @postID,
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @promotionDate,  @currentDate, @userID)
                    `);

                }
                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'deputationIn':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength_log
                //    SET process_initiated_date = @processInitiatedDate,
                //     notification_adv_issued_date = @notificationIssuedDate,
                //     application_received_date = @applicationReceivedDeputation,
                //     review_application_by_comm = @reviewOfApplicationDeputation,
                //     approval_received_date = @approvalReceivedDeputation,
                //     order_issued_date = @orderIssuedDeputation,
                //     organisation_id = @organisationOfEmp
                //     WHERE post_code = @postCode`);

                await request.query(`UPDATE tbl_hr_post_strength
                SET
                vacant_or_filled = CASE
                            WHEN @selectDeputedEmployeeId IS NOT NULL AND
                                @selectDeputedEmployeeMasterId IS NOT NULL AND
                                @processInitiatedDate IS NOT NULL AND
                                @notificationIssuedDate IS NOT NULL AND
                                @applicationReceivedDeputation IS NOT NULL AND
                                @reviewOfApplicationDeputation IS NOT NULL AND
                                @approvalReceivedDeputation IS NOT NULL AND
                                @orderIssuedDeputation IS NOT NULL AND
                                @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        vacancy_type = @vacancyType,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                method_of_appointment ='Deputation In',
                employee_joined_date = @employeeJoinedDate,
                process_initiated_date = @processInitiatedDate,
                notification_adv_issued_date = @notificationIssuedDate,
                application_received_date = @applicationReceivedDeputation,
                review_application_by_comm = @reviewOfApplicationDeputation,
                approval_received_date = @approvalReceivedDeputation,
                order_issued_date = @orderIssuedDeputation,
                employee_id = @selectDeputedEmployeeId,
                emp_master_id = @selectDeputedEmployeeMasterId,
                discharge_reason = @dischargeReason,
                number_of_eligible_application = NULL,
                exam_conducted_date = NULL,
                interview_conducted_date = NULL,
                selection_process_completed_date = NULL,
                result_declared_date = NULL,
                appointment_letter_issued_date = NULL,
                vigilance_clr_received_date = NULL,
                dpc_conducted_date = NULL,
                approval_by_ca_date = NULL,
                promotion_order_issued_date = NULL,
                updated_date = @currentDate,
                updated_by = @userID
                WHERE post_code = @postCode`);

                if (selectDeputedEmployeeId != '' && selectDeputedEmployeeId != null) {
                    const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                        JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                        JOIN mmt_hr_department d ON d.department_id = p.department_id
                        WHERE ps.post_code = @postCode`);

                    const postName = postResult.recordset[0].post_name;
                    const departmentName = postResult.recordset[0].department_name;
                    const departmentId = postResult.recordset[0].department_id;

                    request.input("postName", postName);
                    request.input("departmentName", departmentName);
                    request.input("departmentId", departmentId);

                const updateTransaction = await request.query(`
                    UPDATE tbl_employee_transaction_details
                    SET
                    method_of_appointment = 'Deputation In',
                    emp_post_join_date = @employeeJoinedDate,
                    employee_joining_date = @employeeJoinedDate,
                    emp_department_id = @departmentId,
                    emp_post_id = @postID,
                    emp_post_code = @postCode,
                    emp_post_name = @postName,
                    emp_department_name = @departmentName,
                    updated_date = @currentDate,
                    updated_by = @userID
                    WHERE employee_id = @selectDeputedEmployeeId
                        AND emp_master_id = @selectDeputedEmployeeMasterId
                        AND emp_post_join_date IS NULL
                        AND emp_post_id IS NULL
                `);
                }

                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
        case 'composite':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = CASE
                            WHEN @processInitiatedDate IS NOT NULL AND
                                 @notificationIssuedDate IS NOT NULL AND
                                 @applicationReceivedDeputation IS NOT NULL AND
                                 @reviewOfApplicationDeputation IS NOT NULL AND
                                 @selectEmployeeId IS NOT NULL AND
                                 @employeeJoinedDate IS NOT NULL AND
                                 @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                        vacancy_type = @vacancyType,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        process_initiated_date = @processInitiatedDate,
                        method_of_appointment = 'Composite Method',
                        notification_adv_issued_date = @notificationIssuedDate,
                        application_received_date = @applicationReceivedDeputation,
                        review_application_by_comm = @reviewOfApplicationDeputation,
                        approval_received_date = @approvalReceivedDeputation,
                        employee_joined_date = @employeeJoinedDate,
                        order_issued_date = @orderIssuedDeputation,
                        discharge_reason = @dischargeReason,
                        number_of_eligible_application = NULL,
                        exam_conducted_date = NULL,
                        interview_conducted_date = NULL,
                        selection_process_completed_date = NULL,
                        result_declared_date = NULL,
                        appointment_letter_issued_date = NULL,
                        vigilance_clr_received_date = NULL,
                        dpc_conducted_date = NULL,
                        approval_by_ca_date = NULL,
                        promotion_order_issued_date = NULL,
                        updated_date = @currentDate,
                        updated_by = @userID
                    WHERE post_code = @postCode
                `);

                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);

                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;

                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);

                if (selectEmployeeId != '' && selectEmployeeId != null) {
                    const empResult = await request.query(`SELECT TOP 1 *
                        FROM tbl_employee_transaction_details
                        WHERE employee_id = @selectEmployeeId
                        ORDER BY 1 DESC;`)

                    const employeeIDPrev = empResult.recordset[0].employee_id;
                    const empMasterIDPrev = empResult.recordset[0].emp_master_id
                    const employeeRefIDPrev = empResult.recordset[0].emp_reference_id;
                    const empWorkingOrgIDPrev = empResult.recordset[0].emp_working_org_id;
                    const methodOfAppointmentPrev = empResult.recordset[0].method_of_appointment;
                    const empPostCodePrev = empResult.recordset[0].emp_post_code;
                 //   const methodOfDischarge = methodOfAppointmentPrev + 'End';
                 const methodOfDischarge = `${methodOfAppointmentPrev} End`;
                 //const methodOfDischarge = methodOfAppointmentPrev.concat(' End');

                    request.input("employeeIDPrev", employeeIDPrev);
                    request.input("empMasterIDPrev", empMasterIDPrev);
                    request.input("employeeRefIDPrev", employeeRefIDPrev);
                    request.input("empWorkingOrgIDPrev", empWorkingOrgIDPrev);
                    request.input("methodOfAppointmentPrev", methodOfAppointmentPrev);
                    request.input("empPostCodePrev", empPostCodePrev);
                    request.input("methodOfDischarge", methodOfDischarge);

                    const postResult = await request.query(`SELECT post_code, post_id FROM tbl_hr_post_strength
                                WHERE employee_id = @employeeIDPrev`);
                    const empPrevPostId = postResult.recordset[0].post_id;
                    const empPrevPostCode = postResult.recordset[0].post_code;

                    request.input("empPrevPostId", empPrevPostId);
                    request.input("empPrevPostCode", empPrevPostCode);

                    // const currentDate = currentDate;
                    // request.input("currentDate", currentDate);

                    let newDateOfVacancy = new Date(employeeJoinedDate);
                    newDateOfVacancy.setDate(newDateOfVacancy.getDate() + 1);

                    await convertIntoVacantPost(request,empPrevPostCode,newDateOfVacancy);

                    const updateEmpInPostStrength = await request.query(`UPDATE tbl_hr_post_strength
                    SET
                        employee_id = @employeeIDPrev,
                        emp_master_id = @empMasterIDPrev,
                        updated_date = @currentDate,
                        updated_by = @userID
                        WHERE post_code = @postCode`);


                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                updated_date = @currentDate,
                            updated_by = @userID
                            WHERE employee_id = @employeeIDPrev
                                AND emp_master_id = @empMasterIDPrev
                                AND emp_post_code = @empPostCodePrev
                                AND method_of_appointment = @methodOfAppointmentPrev
                        `);


                    await request.query(`INSERT INTO tbl_employee_transaction_details (
                    employee_id, emp_master_id, emp_reference_id, emp_post_join_date, method_of_appointment, employee_joining_date, emp_department_id, emp_post_id,
                    emp_post_code, emp_post_name, emp_department_name, emp_working_org_id, created_date, created_by)
                    VALUES (@employeeIDPrev, @empMasterIDPrev, @employeeRefIDPrev , @employeeJoinedDate, 'Composite Method' , @employeeJoinedDate, @departmentId, @postID,
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @currentDate, @userID)
                    `);

                }


                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
        case 'transferIn':
            try {
                let newEmployeeID;
                if(organisationOfEmp == organisationID){ // If employee from same organisation , no need to change the employee id
                    newEmployeeID = transferEmpId;
                }
                else{
                    newEmployeeID = await getNewEmployeeIDofOrg(organisationID);
                }
                request.input("newEmployeeID", newEmployeeID);
                await request.query(`UPDATE tbl_hr_post_strength
                SET
                vacant_or_filled = CASE
                            WHEN @newEmployeeID IS NOT NULL AND
                                @transferEmpMasterId IS NOT NULL AND
                                @dateOfJoiningTransferIn IS NOT NULL AND
                                @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                method_of_appointment ='Transfer In',
                employee_id = @newEmployeeID,
                emp_master_id = @transferEmpMasterId,
                employee_joined_date = @dateOfJoiningTransferIn,
                discharge_reason = @dischargeReason,
                vacancy_type = @vacancyType,
                updated_date = @currentDate,
                updated_by = @userID
                WHERE post_code = @postCode`);
                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);
                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;
                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);
                const updateTransaction = await request.query(`
                UPDATE tbl_employee_transaction_details
                SET
                method_of_appointment = 'Transfer In',
                emp_post_join_date = @dateOfJoiningTransferIn,
                employee_joining_date = @dateOfJoiningTransferIn,
                emp_department_id = @departmentId,
                emp_post_id = @postID,
                emp_post_code = @postCode,
                emp_post_name = @postName,
                emp_department_name = @departmentName,
                emp_working_org_id = @organisationID,
                updated_date = @currentDate,
                updated_by = @userID,
                employee_id = @newEmployeeID
                WHERE employee_id = @transferEmpId
                    AND emp_post_join_date IS NULL
                    AND emp_post_id IS NULL
                `);
                await request.query(`
                    UPDATE tbl_employee_master
                    SET
                    emp_curr_org_id = @organisationID,
                    updated_date = GETDATE(),
                    updated_by = @userID
                    WHERE emp_master_id = @transferEmpMasterId
                `);
                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                await transaction.rollback();
                res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
        case 'directRecruitmentCompassionate':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                    vacancy_type = @vacancyType,
                    method_of_appointment = 'Direct Recruitment (Compassionate Method)',
                    date_of_arise_in_vacancy =@dateOfAriseInVacancy,
                    exception_abolish = @exceptionAbolish,
                    reason_for_exemption = @reasonForExemption,
                    process_initiated_date = NULL,
                    notification_adv_issued_date = NULL,
                    renotification_adv_issued_date = NULL,
                    number_of_eligible_application = NULL,
                    exam_conducted_date = NULL,
                    interview_conducted_date = NULL,
                    selection_process_completed_date = NULL,
                    result_declared_date = NULL,
                    appointment_letter_issued_date = NULL,
                    vigilance_clr_received_date = NULL,
                    dpc_conducted_date = NULL,
                    approval_by_ca_date = NULL,
                    promotion_order_issued_date = NULL,
                    application_received_date = NULL,
                    review_application_by_comm = NULL,
                    approval_received_date = NULL,
                    order_issued_date = NULL,
                    updated_date = GETDATE(),
                    updated_by = @userID
                    WHERE post_code = @postCode
                `);
                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                await transaction.rollback();
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
            case 'prevredeployedFromCHD':
            try {

                let chdPostEndDate = null;
                if (dateOfJoiningCHD) {
                    const date = new Date(dateOfJoiningCHD);
                    date.setDate(date.getDate() - 1);
                    chdPostEndDate = date.toISOString().split('T')[0];
                }
                request.input("chdPostEndDate", chdPostEndDate);

                await request.query(`
                    UPDATE tbl_hr_post_strength
                SET
                    vacant_or_filled = CASE
                        WHEN @approvalCompetentAuthorityDateCHD IS NOT NULL AND
                            @orderIssuedDateCHD IS NOT NULL AND
                            @dateOfJoiningCHD IS NOT NULL AND
                            @fromWhichPostCHD IS NOT NULL AND
                            @dateOfAriseInVacancy IS NOT NULL
                        THEN 'filled'
                        ELSE vacant_or_filled
                    END,
                    employee_id = @selectEmployeeId,
                    emp_master_id = @chdCategoryEmpMasterId,
                    method_of_appointment       = 'Redeployed from CHD Category',
                    vacancy_type                = @vacancyType,
                    date_of_arise_in_vacancy    = @dateOfAriseInVacancy,
                    exception_abolish           = @exceptionAbolish,
                    reason_for_exemption        = @reasonForExemption,
                    is_new                      = 0,
                    approval_by_ca_date         = @approvalCompetentAuthorityDateCHD,
                    order_issued_date           = @orderIssuedDateCHD,
                    employee_joined_date        = @dateOfJoiningCHD,
                    post_chd                    = @fromWhichPostCHD,
                    process_initiated_date              = NULL,
                    notification_adv_issued_date        = NULL,
                    renotification_adv_issued_date      = NULL,
                    number_of_eligible_application      = NULL,
                    exam_conducted_date                 = NULL,
                    interview_conducted_date            = NULL,
                    selection_process_completed_date    = NULL,
                    result_declared_date                = NULL,
                    appointment_letter_issued_date      = NULL,
                    vigilance_clr_received_date         = NULL,
                    dpc_conducted_date                  = NULL,
                    promotion_order_issued_date         = NULL,
                    application_received_date           = NULL,
                    review_application_by_comm          = NULL,
                    approval_received_date              = NULL,
                    discharge_reason                    = NULL,
                    updated_date                        = @currentDate,   
                    updated_by                          = @userID
                WHERE post_code = @postCode
                `);

                // Fetch post details for transaction insert
                const postResult = await request.query(`
                    SELECT 
                        p.post_id, 
                        p.post_name, 
                        d.department_name, 
                        d.department_id
                    FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode
                `);

                const postName       = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId   = postResult.recordset[0].department_id;

                request.input("postName",       postName);
                request.input("departmentName", departmentName);
                request.input("departmentId",   departmentId);

                 const empResult = await request.query(`
                    SELECT TOP 1 
                        emp_reference_id,
                        emp_working_org_id
                    FROM tbl_employee_transaction_details
                    WHERE employee_id = @selectEmployeeId
                    AND emp_master_id = @chdCategoryEmpMasterId
                    ORDER BY created_date DESC
                `);

        let empReferenceId   = null;
        let empWorkingOrgId  = organisationID; 

        if (empResult.recordset.length > 0) {
            empReferenceId  = empResult.recordset[0].emp_reference_id;
            empWorkingOrgId = empResult.recordset[0].emp_working_org_id;
        }

        request.input("empReferenceId",  empReferenceId);
        request.input("empWorkingOrgId", empWorkingOrgId);

                await request.query(`
                INSERT INTO tbl_employee_transaction_details (
                    employee_id,
                    emp_master_id,
                    emp_reference_id,
                    emp_post_join_date,
                    method_of_appointment,
                    employee_joining_date,
                    emp_department_id,
                    emp_post_id,
                    emp_post_code,
                    emp_post_name,
                    emp_department_name,
                    emp_working_org_id,
                    created_date,
                    created_by
                )
                VALUES (
                    @selectEmployeeId,
                    @chdCategoryEmpMasterId,
                    @empReferenceId,
                    @dateOfJoiningCHD,
                    'Redeployed from CHD Category',
                    @dateOfJoiningCHD,
                    @departmentId,
                    @postID,
                    @postCode,
                    @postName,
                    @departmentName,
                    @organisationID,
                    GETDATE(),
                    @userID
                )
            `);

            await transaction.commit();
            res.sendStatus(201);
            break;

            } catch (err) {
                await transaction.rollback();
                return res.status(500).json({ message: "Internal Server Error", error: err });
            }
            break;
            case 'prevredeployedFromredeployedIn':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = CASE
                            WHEN @selectEmployeeId IS NOT NULL AND
                                @dateOfJoiningCHD IS NOT NULL AND
                                @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        employee_id          = @selectEmployeeId,
                        emp_master_id        = @chdCategoryEmpMasterId,
                        method_of_appointment = 'Redeployed-in',
                        vacancy_type         = @vacancyType,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                        exception_abolish    = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new               = 0,
                        employee_joined_date = @dateOfJoiningCHD,
                        process_initiated_date           = NULL,
                        notification_adv_issued_date     = NULL,
                        renotification_adv_issued_date   = NULL,
                        number_of_eligible_application   = NULL,
                        exam_conducted_date              = NULL,
                        interview_conducted_date         = NULL,
                        selection_process_completed_date = NULL,
                        result_declared_date             = NULL,
                        appointment_letter_issued_date   = NULL,
                        vigilance_clr_received_date      = NULL,
                        dpc_conducted_date               = NULL,
                        promotion_order_issued_date      = NULL,
                        application_received_date        = NULL,
                        review_application_by_comm       = NULL,
                        approval_received_date           = NULL,
                        order_issued_date                = NULL,
                        discharge_reason                 = NULL,
                        updated_date                     = @currentDate,
                        updated_by                       = @userID
                    WHERE post_code = @postCode
                `);

            const postResult = await request.query(`
                SELECT p.post_id, p.post_name, d.department_name, d.department_id
                FROM mmt_hr_post p
                JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                JOIN mmt_hr_department d ON d.department_id = p.department_id
                WHERE ps.post_code = @postCode
            `);

            const postName     = postResult.recordset[0].post_name;
            const departmentName = postResult.recordset[0].department_name;
            const departmentId = postResult.recordset[0].department_id;

            request.input("postName",       postName);
            request.input("departmentName", departmentName);
            request.input("departmentId",   departmentId);

            const empResult = await request.query(`
                SELECT TOP 1 emp_reference_id, emp_working_org_id
                FROM tbl_employee_transaction_details
                WHERE employee_id = @selectEmployeeId
                AND emp_master_id = @chdCategoryEmpMasterId
                ORDER BY created_date DESC
            `);

            let empReferenceId  = null;
            let empWorkingOrgId = organisationID;
            if (empResult.recordset.length > 0) {
                empReferenceId  = empResult.recordset[0].emp_reference_id;
                empWorkingOrgId = empResult.recordset[0].emp_working_org_id;
            }
            request.input("empReferenceId",  empReferenceId);
            request.input("empWorkingOrgId", empWorkingOrgId);


            await request.query(`
                INSERT INTO tbl_employee_transaction_details (
                    employee_id, emp_master_id, emp_reference_id,
                    emp_post_join_date, method_of_appointment, employee_joining_date,
                    emp_department_id, emp_post_id, emp_post_code,
                    emp_post_name, emp_department_name, emp_working_org_id,
                    created_date, created_by
                )
                VALUES (
                    @selectEmployeeId, @chdCategoryEmpMasterId, @empReferenceId,
                    @dateOfJoiningCHD, 'Redeployed-in', @dateOfJoiningCHD,
                    @departmentId, @postID, @postCode,
                    @postName, @departmentName, @organisationID,
                    GETDATE(), @userID
                )
        `);

        await transaction.commit();
        res.sendStatus(201);
        break;

        
    } catch (err) {
        await transaction.rollback();
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
    break;
    case 'prevredeployedFromprevredeployedPromotionbyDR':
    try {
        await request.query(`
            UPDATE tbl_hr_post_strength
            SET
                vacant_or_filled = CASE
                    WHEN @selectEmployeeId IS NOT NULL AND      
                        @dateOfJoiningCHD IS NOT NULL AND      
                        @dateOfAriseInVacancy IS NOT NULL
                    THEN 'filled'
                    ELSE vacant_or_filled
                END,
                employee_id                         = @selectEmployeeId,
                emp_master_id                       = @chdCategoryEmpMasterId,
                method_of_appointment               = 'Promotion-in by Direct Recruitment',
                vacancy_type                        = @vacancyType,
                date_of_arise_in_vacancy            = @dateOfAriseInVacancy,
                exception_abolish                   = @exceptionAbolish,
                reason_for_exemption                = @reasonForExemption,
                is_new                              = 0,
                employee_joined_date                = @dateOfJoiningCHD,
                approval_by_ca_date                 = NULL,
                order_issued_date                   = NULL,
                post_chd                            = NULL,
                process_initiated_date              = NULL,
                notification_adv_issued_date        = NULL,
                renotification_adv_issued_date      = NULL,
                number_of_eligible_application      = NULL,
                exam_conducted_date                 = NULL,
                interview_conducted_date            = NULL,
                selection_process_completed_date    = NULL,
                result_declared_date                = NULL,
                appointment_letter_issued_date      = NULL,
                vigilance_clr_received_date         = NULL,
                dpc_conducted_date                  = NULL,
                promotion_order_issued_date         = NULL,
                application_received_date           = NULL,
                review_application_by_comm          = NULL,
                approval_received_date              = NULL,
                discharge_reason                    = NULL,
                updated_date                        = @currentDate,
                updated_by                          = @userID
            WHERE post_code = @postCode
        `);

        const postResult = await request.query(`
            SELECT p.post_id, p.post_name, d.department_name, d.department_id
            FROM mmt_hr_post p
            JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
            JOIN mmt_hr_department d ON d.department_id = p.department_id
            WHERE ps.post_code = @postCode
        `);

        const postName       = postResult.recordset[0].post_name;
        const departmentName = postResult.recordset[0].department_name;
        const departmentId   = postResult.recordset[0].department_id;

        request.input("postName",       postName);
        request.input("departmentName", departmentName);
        request.input("departmentId",   departmentId);

        const empResult = await request.query(`
            SELECT TOP 1 emp_reference_id, emp_working_org_id
            FROM tbl_employee_transaction_details
            WHERE employee_id   = @selectEmployeeId
              AND emp_master_id = @chdCategoryEmpMasterId
            ORDER BY created_date DESC
        `);

        let empReferenceId  = null;
        let empWorkingOrgId = organisationID;

        if (empResult.recordset.length > 0) {
            empReferenceId  = empResult.recordset[0].emp_reference_id;
            empWorkingOrgId = empResult.recordset[0].emp_working_org_id;
        }

        request.input("empReferenceId",  empReferenceId);
        request.input("empWorkingOrgId", empWorkingOrgId);

        await request.query(`
            INSERT INTO tbl_employee_transaction_details (
                employee_id,
                emp_master_id,
                emp_reference_id,
                emp_post_join_date,
                method_of_appointment,
                employee_joining_date,
                emp_department_id,
                emp_post_id,
                emp_post_code,
                emp_post_name,
                emp_department_name,
                emp_working_org_id,
                created_date,
                created_by
            )
            VALUES (
                @selectEmployeeId,
                @chdCategoryEmpMasterId,
                @empReferenceId,
                @dateOfJoiningCHD,
                'Promotion-in by Direct Recruitment',
                @dateOfJoiningCHD,
                @departmentId,
                @postID,
                @postCode,
                @postName,
                @departmentName,
                @organisationID,
                GETDATE(),
                @userID
            )
        `);

        await transaction.commit();
        res.sendStatus(201);
        break;

    } catch (err) {
        await transaction.rollback();
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
    break;
    }
    
};

async function getEmployeeIdFromPostStrength(req, res) {
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        let query = `SELECT * FROM tbl_hr_post_strength where vacant_or_filled='filled' AND method_of_appointment NOT IN ('Deputation In')
                     AND organisation_id = @organisationID`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function getPostNamesByPostCode(req, res) {
    const postCode = req.params.postCode;

    const conn = await pool;
    const request = conn.request();

    request.input("postCode", postCode);

    try {
        let query = ` SELECT ps.post_code, ps.post_id  ,d.department_id , d.department_name , p.post_name
            FROM tbl_hr_post_strength ps
           	LEFT JOIN mmt_hr_department d ON d.department_id = ps.department_id
            LEFT JOIN  mmt_hr_post p ON p.post_id = ps.post_id
            WHERE post_code=@postCode`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function getVaccancyLogDetailsByPostCode(req, res) {
    const postCode = req.params.postCode;

    const conn = await pool;
    const request = conn.request();

    request.input("postCode", postCode);

    try {
        let query = ` SELECT *
            FROM tbl_hr_post_strength
            WHERE post_code=@postCode`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function revokeHRVacantPost(req, res) {
    let { revokeReason, postCode, revisedDateOfVacancy, userID } = req.body;

    if (!revokeReason || !revisedDateOfVacancy || !postCode || postCode == '') {
        return res.status(400).json({ error: "Post Code, Revoke reason and date of vacancy are required." });
    }

    const revisedDate = new Date(revisedDateOfVacancy);
    const currentDate = new Date();

    const futureDate = new Date(revisedDate);
    futureDate.setFullYear(futureDate.getFullYear() + 5);

    if (futureDate <= currentDate) {
        return res.status(400).json({ error: "The revised date of vacancy cannot exceed the current date." });
    }

    const uploadDir = './fileuploads/HR/hr_revival_documents';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    let uniqueFileName = null;

    if (req.file) {
        const originalFileName = req.file.filename;

        uniqueFileName = generateUniqueFileName(originalFileName);
        const destinationFolder = './fileuploads/HR/hr_revival_documents';
        if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder, { recursive: true });
        }

        const destinationPath = path.join(destinationFolder, uniqueFileName);
        fs.renameSync(req.file.path, destinationPath);
    }

    const conn = await pool;
    const request = conn.request();

    request.input("revokeReason", revokeReason);
    request.input("postCode", postCode);
    request.input("revisedDateOfVacancy", revisedDateOfVacancy);
    request.input("userID", userID);
    request.input("uniqueFileName", uniqueFileName);

    try {
        if (revokeReason == 'Approved by ministry for revival') {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                date_of_arise_in_vacancy = @revisedDateOfVacancy,
                employee_joined_date = NULL,
                process_initiated_date = NULL,
                notification_adv_issued_date = NULL,
                renotification_adv_issued_date = NULL,
                exam_conducted_date = NULL,
                interview_conducted_date = NULL,
                selection_process_completed_date = NULL,
                result_declared_date = NULL,
                appointment_letter_issued_date = NULL,
                vigilance_clr_received_date = NULL,
                dpc_conducted_date = NULL,
                approval_by_ca_date = NULL,
                promotion_order_issued_date = NULL,
                application_received_date = NULL,
                review_application_by_comm = NULL,
                approval_received_date = NULL,
                order_issued_date = NULL,
                revival_stage_id = 9,
                revival_submission_date = NULL,
                revive_proposal_sent_to_doe_date = @revisedDateOfVacancy,
                revive_approval_date_from_doe = @revisedDateOfVacancy,
                revive_rejection_date_from_doe = NULL,
                revive_remarks_from_doe = NULL,
                revive_proposal_rejected_by_doe_date = NULL,
                order_of_revival_issued_date = @revisedDateOfVacancy,
                revoke_reason = @revokeReason,
                revival_doc_name = @uniqueFileName,
                updated_date = GETDATE(),
                updated_by = @userID
                WHERE post_code = @postCode
            `);
        } else {
            await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                date_of_arise_in_vacancy = @revisedDateOfVacancy,
                revoke_reason = @revokeReason,
                updated_date = GETDATE(),
                updated_by = @userID
                WHERE post_code = @postCode
            `);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("Error updating HR post strength:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

async function updateHRPostActivitiy(req, res) {
    const organisationID = req.body.organisationID;
    const methodOfAppointment = req.body.methodOfAppointment;
    const vacancyType = req.body.vacancyType;
    let exceptionAbolish = null;
    if (req.body.exceptionAbolish) {
        if (req.body.exceptionAbolish === "1" || req.body.exceptionAbolish === "0") {
            exceptionAbolish = parseInt(req.body.exceptionAbolish);
        }
    }
    const reasonForExemption = req.body.reasonForExemption?.length ? req.body.reasonForExemption : null;
    const recruitmentThrough = req.body.recruitmentThrough?.length ? req.body.recruitmentThrough : null;

    const processInitiatedDate = req.body.processInitiatedDate?.length ? req.body.processInitiatedDate : null;
    const notificationIssuedDate = req.body.notificationIssuedDate?.length ? req.body.notificationIssuedDate : null;
    const reNotificationIssuedDate = req.body.reNotificationIssuedDate?.length ? req.body.reNotificationIssuedDate : null;
    const examConductedDate = req.body.examConductedDate?.length ? req.body.examConductedDate : null;
    const interviewConductedDate = req.body.interviewConductedDate?.length ? req.body.interviewConductedDate : null;
    const selectionProcessDate = req.body.selectionProcessDate?.length ? req.body.selectionProcessDate : null;
    const resultDeclaredDate = req.body.resultDeclaredDate?.length ? req.body.resultDeclaredDate : null;
    const appointmentLetterIssuedDate = req.body.appointmentLetterIssuedDate?.length ? req.body.appointmentLetterIssuedDate : null;

    const dischargeReason = req.body.dischargeReason?.length ? req.body.dischargeReason : null;

    const applicationReceivedDeputation = req.body.applicationReceivedDeputation?.length ? req.body.applicationReceivedDeputation : null;
    const reviewOfApplicationDeputation = req.body.reviewOfApplicationDeputation?.length ? req.body.reviewOfApplicationDeputation : null;
    const approvalReceivedDeputation = req.body.approvalReceivedDeputation?.length ? req.body.approvalReceivedDeputation : null;
    const orderIssuedDeputation = req.body.orderIssuedDeputation?.length ? req.body.orderIssuedDeputation : null;
    const organisationOfEmp = req.body.organisationOfEmp?.length ? req.body.organisationOfEmp : null;

    const vigilanceClearanceDatePromotion = req.body.vigilanceClearanceDatePromotion?.length ? req.body.vigilanceClearanceDatePromotion : null;
    const dpcConductedDatePromotion = req.body.dpcConductedDatePromotion?.length ? req.body.dpcConductedDatePromotion : null;
    const approvalByAuthorityDatePromotion = req.body.approvalByAuthorityDatePromotion?.length ? req.body.approvalByAuthorityDatePromotion : null;
    const orderDatePromotion = req.body.orderDatePromotion?.length ? req.body.orderDatePromotion : null;
    const selectEmployeeId = req.body.selectEmployeeId?.length ? req.body.selectEmployeeId : null;

    const selectDeputedEmployeeId = req.body.deputedEmpId?.length ? req.body.deputedEmpId : null;
    const selectDeputedEmployeeMasterId = req.body.deputedEmpMasterId ? (Array.isArray(req.body.deputedEmpMasterId) ? req.body.deputedEmpMasterId[0] : req.body.deputedEmpMasterId) : null;
    const transferEmpId = req.body.transferEmpId?.length ? req.body.transferEmpId : null;
    let transferEmpMasterId = req.body.transferEmpMasterId;
    const dateOfJoiningTransferIn = req.body.dateOfJoiningTransferIn?.length ? req.body.dateOfJoiningTransferIn : null;
    const numberOfEligibleApplication = req.body.numberOfEligibleApplication?.length ? req.body.numberOfEligibleApplication : null;


    const employeeJoinedDate = req.body.employeeJoinedDate?.length ? req.body.employeeJoinedDate : null;
    let postEndDate = null;
    if (employeeJoinedDate) {
        const date = new Date(employeeJoinedDate);
        date.setDate(date.getDate() - 1);
        postEndDate = date.toISOString().split('T')[0];
    }

    const dateOfAriseInVacancy = req.body.dateOfAriseInVacancy?.length ? req.body.dateOfAriseInVacancy : null;

    const allFieldsFilled = req.body.allFieldsFilled;

    const postID = req.body.postId;
    const postCode = req.body.postCode;
    const userID = req.body.userID;

    const currentDate = new Date().toISOString().slice(0, 10);

    const conn = await pool;
    const request = conn.request();

    const transaction = new sql.Transaction(conn);

    request.input("organisationID", organisationID);
    request.input("processInitiatedDate", processInitiatedDate);
    request.input("notificationIssuedDate", notificationIssuedDate);
    request.input("reNotificationIssuedDate", reNotificationIssuedDate);
    request.input("examConductedDate", examConductedDate);
    request.input("interviewConductedDate", interviewConductedDate);
    request.input("selectionProcessDate", selectionProcessDate);
    request.input("resultDeclaredDate", resultDeclaredDate);
    request.input("appointmentLetterIssuedDate", appointmentLetterIssuedDate);
    request.input("postID", postID);
    request.input("postCode", postCode);
    request.input("exceptionAbolish", exceptionAbolish);
    request.input("reasonForExemption",reasonForExemption);
    request.input("recruitmentThrough",recruitmentThrough);

    request.input("dischargeReason", dischargeReason);
    request.input("vacancyType",vacancyType);

    request.input("applicationReceivedDeputation", applicationReceivedDeputation);
    request.input("reviewOfApplicationDeputation", reviewOfApplicationDeputation);
    request.input("approvalReceivedDeputation", approvalReceivedDeputation);
    request.input("orderIssuedDeputation", orderIssuedDeputation);
    request.input("organisationOfEmp", organisationOfEmp);
    request.input("employeeJoinedDate", employeeJoinedDate);

    request.input("vigilanceClearanceDatePromotion", vigilanceClearanceDatePromotion);
    request.input("dpcConductedDatePromotion", dpcConductedDatePromotion);
    request.input("approvalByAuthorityDatePromotion", approvalByAuthorityDatePromotion);
    request.input("orderDatePromotion", orderDatePromotion);
    request.input("selectEmployeeId", selectEmployeeId);
    request.input("currentDate", currentDate);
    request.input("selectDeputedEmployeeId", selectDeputedEmployeeId);
    request.input("selectDeputedEmployeeMasterId", selectDeputedEmployeeMasterId);


    request.input("postEndDate", postEndDate);

    request.input("dateOfAriseInVacancy", dateOfAriseInVacancy);
    request.input("userID", userID);

    request.input("transferEmpId", transferEmpId);
    request.input("transferEmpMasterId", transferEmpMasterId);
    request.input("dateOfJoiningTransferIn", dateOfJoiningTransferIn);

    request.input("numberOfEligibleApplication", numberOfEligibleApplication);

    await transaction.begin();
    switch (methodOfAppointment) {
        case 'directRecruitment':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength_log
                // SET process_initiated_date = @processInitiatedDate,
                //  notification_adv_issued_date = @notificationIssuedDate,
                //  renotification_adv_issued_date = @reNotificationIssuedDate,
                //  exam_conducted_date = @examConductedDate,
                //  interview_conducted_date = @interviewConductedDate,
                //  selection_process_completed_date = @selectionProcessDate,
                //  result_declared_date = @resultDeclaredDate,
                //  appointment_letter_issued_date = @appointmentLetterIssuedDate
                //  WHERE post_code = @postCode`);



                await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                    vacancy_type = @vacancyType,
                    method_of_appointment ='Direct Recruitment',
                    is_new = 0,
                    date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                    is_recruitment_through_ipa = @recruitmentThrough,
                    exception_abolish = @exceptionAbolish,
                    reason_for_exemption = @reasonForExemption,
                    process_initiated_date = @processInitiatedDate,
                    notification_adv_issued_date = @notificationIssuedDate,
                    number_of_eligible_application = @numberOfEligibleApplication,
                    renotification_adv_issued_date = @reNotificationIssuedDate,
                    exam_conducted_date = @examConductedDate,
                    interview_conducted_date = @interviewConductedDate,
                    selection_process_completed_date = @selectionProcessDate,
                    result_declared_date = @resultDeclaredDate,
                    appointment_letter_issued_date = @appointmentLetterIssuedDate,
                    vigilance_clr_received_date = NULL,
                    dpc_conducted_date = NULL,
                    approval_by_ca_date = NULL,
                    promotion_order_issued_date = NULL,
                    application_received_date = NULL,
                    review_application_by_comm = NULL,
                    approval_received_date = NULL,
                    order_issued_date = NULL,
                    discharge_reason = @dischargeReason,
                    updated_date = @currentDate,
                    updated_by = @userID
                WHERE post_code = @postCode
            `);

                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'promotion':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = CASE
                            WHEN @employeeJoinedDate IS NOT NULL AND
                                 @vigilanceClearanceDatePromotion IS NOT NULL AND
                                 @dpcConductedDatePromotion IS NOT NULL AND
                                 @approvalByAuthorityDatePromotion IS NOT NULL AND
                                 @orderDatePromotion IS NOT NULL AND
                                 @selectEmployeeId IS NOT NULL AND
                                 @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                        vacancy_type = @vacancyType,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        process_initiated_date = @processInitiatedDate,
                        method_of_appointment = 'Promotion',
                        employee_joined_date = @employeeJoinedDate,
                        vigilance_clr_received_date = @vigilanceClearanceDatePromotion,
                        dpc_conducted_date = @dpcConductedDatePromotion,
                        approval_by_ca_date = @approvalByAuthorityDatePromotion,
                        promotion_order_issued_date = @orderDatePromotion,
                        application_received_date = NULL,
                        review_application_by_comm = NULL,
                        approval_received_date = NULL,
                        order_issued_date = NULL,
                        number_of_eligible_application = NULL,
                        exam_conducted_date = NULL,
                        interview_conducted_date = NULL,
                        selection_process_completed_date = NULL,
                        result_declared_date = NULL,
                        appointment_letter_issued_date = NULL,
                        discharge_reason = @dischargeReason,
                        updated_date = @currentDate,
                        updated_by = @userID
                    WHERE post_code = @postCode
                `);


                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);

                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;

                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);



                if (selectEmployeeId != '' && selectEmployeeId != null) {
                    const empResult = await request.query(`SELECT TOP 1 *
                        FROM tbl_employee_transaction_details
                        WHERE employee_id = @selectEmployeeId
                        ORDER BY 1 DESC;`)

                    const employeeIDPrev = empResult.recordset[0].employee_id;
                    const empMasterIDPrev = empResult.recordset[0].emp_master_id
                    const employeeRefIDPrev = empResult.recordset[0].emp_reference_id;
                    const empWorkingOrgIDPrev = empResult.recordset[0].emp_working_org_id;
                    const methodOfAppointmentPrev = empResult.recordset[0].method_of_appointment;
                    const empPostCodePrev = empResult.recordset[0].emp_post_code;
                   // const methodOfDischarge = methodOfAppointmentPrev + 'End';
                   const methodOfDischarge = `${methodOfAppointmentPrev} End`;

                    request.input("employeeIDPrev", employeeIDPrev);
                    request.input("empMasterIDPrev", empMasterIDPrev);
                    request.input("employeeRefIDPrev", employeeRefIDPrev);
                    request.input("empWorkingOrgIDPrev", empWorkingOrgIDPrev);
                    request.input("methodOfAppointmentPrev", methodOfAppointmentPrev);
                    request.input("empPostCodePrev", empPostCodePrev);
                    request.input("methodOfDischarge", methodOfDischarge);

                    const postResult = await request.query(`SELECT post_code, post_id FROM tbl_hr_post_strength
                                WHERE employee_id = @employeeIDPrev`);
                    const empPrevPostId = postResult.recordset[0].post_id;
                    const empPrevPostCode = postResult.recordset[0].post_code;

                    request.input("empPrevPostId", empPrevPostId);
                    request.input("empPrevPostCode", empPrevPostCode);

                    const updateEmpInPostStrength = await request.query(`UPDATE tbl_hr_post_strength
                    SET
                        employee_id = @employeeIDPrev,
                        emp_master_id = @empMasterIDPrev,
                        updated_date = @currentDate,
                        updated_by = @userID
                        WHERE post_code = @postCode`);



                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                activity_name = 'Promotion',
                                updated_date = @currentDate,
                            updated_by = @userID
                            WHERE employee_id = @employeeIDPrev
                                AND emp_master_id = @empMasterIDPrev
                                AND emp_post_code = @empPostCodePrev
                                AND method_of_appointment = @methodOfAppointmentPrev
                        `);

                        //making the post vacant

                        const empDataResult = await request.query(`SELECT TOP 1 *
                            FROM tbl_employee_transaction_details
                            WHERE employee_id = @selectEmployeeId
                            ORDER BY 1 DESC;`)

                        const empPostCodePrevious = empDataResult.recordset[0].emp_post_code;
                        request.input("empPostCodePrevious",empPostCodePrevious);

                        await convertIntoVacantPost(request,empPostCodePrevious,postEndDate);

                    const promotionDate = currentDate;
                    request.input("promotionDate", promotionDate);
                    await request.query(`INSERT INTO tbl_employee_transaction_details (
                    employee_id, emp_master_id, emp_reference_id, emp_post_join_date, method_of_appointment, employee_joining_date, emp_department_id, emp_post_id,
                    emp_post_code, emp_post_name, emp_department_name, emp_working_org_id,  promotion_date, created_date, created_by)
                    VALUES (@employeeIDPrev, @empMasterIDPrev, @employeeRefIDPrev , @employeeJoinedDate, 'Promotion' , @employeeJoinedDate, @departmentId, @postID,
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @promotionDate,  @currentDate, @userID)
                    `);

                }
                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'deputationIn':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength_log
                //    SET process_initiated_date = @processInitiatedDate,
                //     notification_adv_issued_date = @notificationIssuedDate,
                //     application_received_date = @applicationReceivedDeputation,
                //     review_application_by_comm = @reviewOfApplicationDeputation,
                //     approval_received_date = @approvalReceivedDeputation,
                //     order_issued_date = @orderIssuedDeputation,
                //     organisation_id = @organisationOfEmp
                //     WHERE post_code = @postCode`);

                await request.query(`UPDATE tbl_hr_post_strength
                SET
                vacant_or_filled = CASE
                            WHEN @selectDeputedEmployeeId IS NOT NULL AND
                                @selectDeputedEmployeeMasterId IS NOT NULL AND
                                @processInitiatedDate IS NOT NULL AND
                                @notificationIssuedDate IS NOT NULL AND
                                @applicationReceivedDeputation IS NOT NULL AND
                                @reviewOfApplicationDeputation IS NOT NULL AND
                                @approvalReceivedDeputation IS NOT NULL AND
                                @orderIssuedDeputation IS NOT NULL AND
                                @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        vacancy_type = @vacancyType,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                method_of_appointment ='Deputation In',
                employee_joined_date = @employeeJoinedDate,
                process_initiated_date = @processInitiatedDate,
                notification_adv_issued_date = @notificationIssuedDate,
                application_received_date = @applicationReceivedDeputation,
                review_application_by_comm = @reviewOfApplicationDeputation,
                approval_received_date = @approvalReceivedDeputation,
                order_issued_date = @orderIssuedDeputation,
                employee_id = @selectDeputedEmployeeId,
                emp_master_id = @selectDeputedEmployeeMasterId,
                discharge_reason = @dischargeReason,
                number_of_eligible_application = NULL,
                exam_conducted_date = NULL,
                interview_conducted_date = NULL,
                selection_process_completed_date = NULL,
                result_declared_date = NULL,
                appointment_letter_issued_date = NULL,
                vigilance_clr_received_date = NULL,
                dpc_conducted_date = NULL,
                approval_by_ca_date = NULL,
                promotion_order_issued_date = NULL,
                updated_date = @currentDate,
                updated_by = @userID
                WHERE post_code = @postCode`);

                if (selectDeputedEmployeeId != '' && selectDeputedEmployeeId != null) {
                    const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                        JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                        JOIN mmt_hr_department d ON d.department_id = p.department_id
                        WHERE ps.post_code = @postCode`);

                    const postName = postResult.recordset[0].post_name;
                    const departmentName = postResult.recordset[0].department_name;
                    const departmentId = postResult.recordset[0].department_id;

                    request.input("postName", postName);
                    request.input("departmentName", departmentName);
                    request.input("departmentId", departmentId);

                const updateTransaction = await request.query(`
                    UPDATE tbl_employee_transaction_details
                    SET
                    method_of_appointment = 'Deputation In',
                    emp_post_join_date = @employeeJoinedDate,
                    employee_joining_date = @employeeJoinedDate,
                    emp_department_id = @departmentId,
                    emp_post_id = @postID,
                    emp_post_code = @postCode,
                    emp_post_name = @postName,
                    emp_department_name = @departmentName,
                    updated_date = @currentDate,
                    updated_by = @userID
                    WHERE employee_id = @selectDeputedEmployeeId
                        AND emp_master_id = @selectDeputedEmployeeMasterId
                        AND emp_post_join_date IS NULL
                        AND emp_post_id IS NULL
                `);
                }

                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                //console.log(err);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
        case 'composite':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                        vacant_or_filled = CASE
                            WHEN @processInitiatedDate IS NOT NULL AND
                                 @notificationIssuedDate IS NOT NULL AND
                                 @applicationReceivedDeputation IS NOT NULL AND
                                 @reviewOfApplicationDeputation IS NOT NULL AND
                                 @selectEmployeeId IS NOT NULL AND
                                 @employeeJoinedDate IS NOT NULL AND
                                 @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                        vacancy_type = @vacancyType,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        process_initiated_date = @processInitiatedDate,
                        method_of_appointment = 'Composite Method',
                        notification_adv_issued_date = @notificationIssuedDate,
                        application_received_date = @applicationReceivedDeputation,
                        review_application_by_comm = @reviewOfApplicationDeputation,
                        approval_received_date = @approvalReceivedDeputation,
                        employee_joined_date = @employeeJoinedDate,
                        order_issued_date = @orderIssuedDeputation,
                        discharge_reason = @dischargeReason,
                        number_of_eligible_application = NULL,
                        exam_conducted_date = NULL,
                        interview_conducted_date = NULL,
                        selection_process_completed_date = NULL,
                        result_declared_date = NULL,
                        appointment_letter_issued_date = NULL,
                        vigilance_clr_received_date = NULL,
                        dpc_conducted_date = NULL,
                        approval_by_ca_date = NULL,
                        promotion_order_issued_date = NULL,
                        updated_date = @currentDate,
                        updated_by = @userID
                    WHERE post_code = @postCode
                `);

                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);

                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;

                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);

                if (selectEmployeeId != '' && selectEmployeeId != null) {
                    const empResult = await request.query(`SELECT TOP 1 *
                        FROM tbl_employee_transaction_details
                        WHERE employee_id = @selectEmployeeId
                        ORDER BY 1 DESC;`)

                    const employeeIDPrev = empResult.recordset[0].employee_id;
                    const empMasterIDPrev = empResult.recordset[0].emp_master_id
                    const employeeRefIDPrev = empResult.recordset[0].emp_reference_id;
                    const empWorkingOrgIDPrev = empResult.recordset[0].emp_working_org_id;
                    const methodOfAppointmentPrev = empResult.recordset[0].method_of_appointment;
                    const empPostCodePrev = empResult.recordset[0].emp_post_code;
                 //   const methodOfDischarge = methodOfAppointmentPrev + 'End';
                 const methodOfDischarge = `${methodOfAppointmentPrev} End`;
                 //const methodOfDischarge = methodOfAppointmentPrev.concat(' End');

                    request.input("employeeIDPrev", employeeIDPrev);
                    request.input("empMasterIDPrev", empMasterIDPrev);
                    request.input("employeeRefIDPrev", employeeRefIDPrev);
                    request.input("empWorkingOrgIDPrev", empWorkingOrgIDPrev);
                    request.input("methodOfAppointmentPrev", methodOfAppointmentPrev);
                    request.input("empPostCodePrev", empPostCodePrev);
                    request.input("methodOfDischarge", methodOfDischarge);

                    const postResult = await request.query(`SELECT post_code, post_id FROM tbl_hr_post_strength
                                WHERE employee_id = @employeeIDPrev`);
                    const empPrevPostId = postResult.recordset[0].post_id;
                    const empPrevPostCode = postResult.recordset[0].post_code;

                    request.input("empPrevPostId", empPrevPostId);
                    request.input("empPrevPostCode", empPrevPostCode);

                    // const currentDate = currentDate;
                    // request.input("currentDate", currentDate);

                    let newDateOfVacancy = new Date(employeeJoinedDate);
                    newDateOfVacancy.setDate(newDateOfVacancy.getDate() + 1);

                    await convertIntoVacantPost(request,empPrevPostCode,newDateOfVacancy);

                    const updateEmpInPostStrength = await request.query(`UPDATE tbl_hr_post_strength
                    SET
                        employee_id = @employeeIDPrev,
                        emp_master_id = @empMasterIDPrev,
                        updated_date = @currentDate,
                        updated_by = @userID
                        WHERE post_code = @postCode`);



                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                updated_date = @currentDate,
                            updated_by = @userID
                            WHERE employee_id = @employeeIDPrev
                                AND emp_master_id = @empMasterIDPrev
                                AND emp_post_code = @empPostCodePrev
                                AND method_of_appointment = @methodOfAppointmentPrev
                        `);


                    await request.query(`INSERT INTO tbl_employee_transaction_details (
                    employee_id, emp_master_id, emp_reference_id, emp_post_join_date, method_of_appointment, employee_joining_date, emp_department_id, emp_post_id,
                    emp_post_code, emp_post_name, emp_department_name, emp_working_org_id, created_date, created_by)
                    VALUES (@employeeIDPrev, @empMasterIDPrev, @employeeRefIDPrev , @employeeJoinedDate, 'Composite Method' , @employeeJoinedDate, @departmentId, @postID,
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @currentDate, @userID)
                    `);

                }


                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
        case 'transferIn':
            try {
                let newEmployeeID;
                if(organisationOfEmp == organisationID){ // If employee from same organisation , no need to change the employee id
                    newEmployeeID = transferEmpId;
                }
                else{
                    newEmployeeID = await getNewEmployeeIDofOrg(organisationID);
                }
                request.input("newEmployeeID", newEmployeeID);
                await request.query(`UPDATE tbl_hr_post_strength
                SET
                vacant_or_filled = CASE
                            WHEN @newEmployeeID IS NOT NULL AND
                                @transferEmpMasterId IS NOT NULL AND
                                @dateOfJoiningTransferIn IS NOT NULL AND
                                @dateOfAriseInVacancy IS NOT NULL
                            THEN 'filled'
                            ELSE vacant_or_filled
                        END,
                        exception_abolish = @exceptionAbolish,
                        reason_for_exemption = @reasonForExemption,
                        is_new = 0,
                        date_of_arise_in_vacancy = @dateOfAriseInVacancy,
                method_of_appointment ='Transfer In',
                employee_id = @newEmployeeID,
                emp_master_id = @transferEmpMasterId,
                employee_joined_date = @dateOfJoiningTransferIn,
                discharge_reason = @dischargeReason,
                vacancy_type = @vacancyType,
                updated_date = @currentDate,
                updated_by = @userID
                WHERE post_code = @postCode`);
                const postResult = await request.query(`SELECT p.post_id , p.post_name, d.department_name , d.department_id  FROM mmt_hr_post p
                    JOIN tbl_hr_post_strength ps ON ps.post_id = p.post_id
                    JOIN mmt_hr_department d ON d.department_id = p.department_id
                    WHERE ps.post_code = @postCode`);
                const postName = postResult.recordset[0].post_name;
                const departmentName = postResult.recordset[0].department_name;
                const departmentId = postResult.recordset[0].department_id;
                request.input("postName", postName);
                request.input("departmentName", departmentName);
                request.input("departmentId", departmentId);
                const updateTransaction = await request.query(`
                UPDATE tbl_employee_transaction_details
                SET
                method_of_appointment = 'Transfer In',
                emp_post_join_date = @dateOfJoiningTransferIn,
                employee_joining_date = @dateOfJoiningTransferIn,
                emp_department_id = @departmentId,
                emp_post_id = @postID,
                emp_post_code = @postCode,
                emp_post_name = @postName,
                emp_department_name = @departmentName,
                emp_working_org_id = @organisationID,
                updated_date = @currentDate,
                updated_by = @userID,
                employee_id = @newEmployeeID
                WHERE employee_id = @transferEmpId
                    AND emp_post_join_date IS NULL
                    AND emp_post_id IS NULL
                `);
                await request.query(`
                    UPDATE tbl_employee_master
                    SET
                    emp_curr_org_id = @organisationID,
                    updated_date = GETDATE(),
                    updated_by = @userID
                    WHERE emp_master_id = @transferEmpMasterId
                `);
                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                await transaction.rollback();
                res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;
        case 'directRecruitmentCompassionate':
            try {
                await request.query(`
                    UPDATE tbl_hr_post_strength
                    SET
                    vacancy_type = @vacancyType,
                    method_of_appointment = 'Direct Recruitment (Compassionate Method)',
                    date_of_arise_in_vacancy =@dateOfAriseInVacancy,
                    exception_abolish = @exceptionAbolish,
                    reason_for_exemption = @reasonForExemption,
                    process_initiated_date = NULL,
                    notification_adv_issued_date = NULL,
                    renotification_adv_issued_date = NULL,
                    number_of_eligible_application = NULL,
                    exam_conducted_date = NULL,
                    interview_conducted_date = NULL,
                    selection_process_completed_date = NULL,
                    result_declared_date = NULL,
                    appointment_letter_issued_date = NULL,
                    vigilance_clr_received_date = NULL,
                    dpc_conducted_date = NULL,
                    approval_by_ca_date = NULL,
                    promotion_order_issued_date = NULL,
                    application_received_date = NULL,
                    review_application_by_comm = NULL,
                    approval_received_date = NULL,
                    order_issued_date = NULL,
                    updated_date = GETDATE(),
                    updated_by = @userID
                    WHERE post_code = @postCode
                `);
                await transaction.commit();
                res.sendStatus(201);
                break;
            } catch (err) {
                await transaction.rollback();
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
    }
};

export default {upload, createRevisedHrPost, getRevisedHrPost, getRevisedHrManagementPost, getRevisedSanctionedStrength, updateRevisedHrPostStrength,
    updatePostStrengthLog, getEmployeeIdFromPostStrength,getVaccancyLogDetailsByPostCode, getPostNamesByPostCode, getDivisionDropdownData, revisedDeleteHrPost, deleteHrPostCodes, getPostListByDepAndOrg, updateFilledPostActivity, revokeHRVacantPost,updateHRPostActivitiy};