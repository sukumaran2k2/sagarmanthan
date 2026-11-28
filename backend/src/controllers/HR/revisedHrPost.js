import { pool } from "../../db.js";
import sql from 'mssql';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {convertIntoVacantPost, getNewEmployeeIDofOrg, safeRollback} from "../HR/hrHelperFunctions.js";

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
    // Every query below must run on the transaction, so the request is bound to it.
    const transaction = new sql.Transaction(conn);
    const request = new sql.Request(transaction);

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

    try {
        await transaction.begin();
    } catch (err) {
        return res.status(500).json({ message: "Could not start the database transaction", error: err.message });
    }
    switch (methodOfAppointment) {
        case 'directRecruitment':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength
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
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE post_code = @postCode
            `);

                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                await safeRollback(transaction);
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
                        updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
                        updated_by = @userID
                        WHERE post_code = @postCode`);

                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                activity_name = 'Promotion',
                                updated_date = GETDATE(),
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
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @promotionDate,  GETDATE(), @userID)
                    `);

                }
                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                //console.log(err);
                await safeRollback(transaction);
                return res.status(500).json({message:"Internal Server Error",error:err});
            }
            break;

        case 'deputationIn':
            try {
                //     await request.query(`UPDATE tbl_hr_post_strength
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
                updated_date = GETDATE(),
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
                    updated_date = GETDATE(),
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
                await safeRollback(transaction);
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
                        updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
                        updated_by = @userID
                        WHERE post_code = @postCode`);


                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                updated_date = GETDATE(),
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
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  GETDATE(), @userID)
                    `);

                }


                await transaction.commit();
                res.sendStatus(201);
            } catch (err) {
                await safeRollback(transaction);
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
                updated_date = GETDATE(),
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
                updated_date = GETDATE(),
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
                await safeRollback(transaction);
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
                await safeRollback(transaction);
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
                    updated_date                        = GETDATE(),   
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

            // Separation (Redeployment-out) set the employee inactive; joining this post brings them back
            await request.query(`UPDATE tbl_employee_master SET emp_status = 1 WHERE emp_master_id = @chdCategoryEmpMasterId`);

            await transaction.commit();
            res.sendStatus(201);
            break;

            } catch (err) {
                await safeRollback(transaction);
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
                        updated_date                     = GETDATE(),
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

            // Separation (Redeployment-out) set the employee inactive; joining this post brings them back
            await request.query(`UPDATE tbl_employee_master SET emp_status = 1 WHERE emp_master_id = @chdCategoryEmpMasterId`);

        await transaction.commit();
        res.sendStatus(201);
        break;

        
    } catch (err) {
        await safeRollback(transaction);
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
                updated_date                        = GETDATE(),
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
        await safeRollback(transaction);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
    break;

    default:
        await safeRollback(transaction);
        return res.status(400).json({ message: `Unknown method of appointment: ${methodOfAppointment}` });
    }
    
};

async function getPostNamesByPostCode(req, res) {
    const postCode = req.params.postCode;

    const conn = await pool;
    const request = conn.request();

    request.input("postCode", postCode);

    try {
        // Department and post of a post code, plus the vacancy it holds (method, date of arise,
        // vacant/filled, organisation): the React Add Employee form reads these instead of
        // trusting values carried in its URL. The date is yyyy-mm-dd (style 23) for date inputs.
        let query = ` SELECT ps.post_code, ps.post_id  ,d.department_id , d.department_name , p.post_name,
                ps.method_of_appointment, CONVERT(VARCHAR(10), ps.date_of_arise_in_vacancy, 23) AS date_of_arise_in_vacancy,
                ps.vacant_or_filled, ps.organisation_id
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
        let query = ` SELECT 
                ps.id,
                ps.post_code,
                ps.post_id,
                ps.department_id,
                ps.vacant_or_filled,
                ps.is_new,
                ps.employee_id,
                ps.emp_master_id,
                ps.reference_id,
                ps.date_of_arise_in_vacancy,
                ps.vacancy_type,
                ps.method_of_appointment,
                ps.expected_anticipated_vacancy,
                ps.exception_abolish,
                ps.reason_for_exemption,
                ps.exception_abolish_date,
                ps.employee_joined_date,
                ps.is_recruitment_through_ipa,
                ps.process_initiated_date,
                ps.notification_adv_issued_date,
                ps.renotification_adv_issued_date,
                ps.number_of_eligible_application,
                ps.exam_conducted_date,
                ps.interview_conducted_date,
                ps.selection_process_completed_date,
                ps.result_declared_date,
                ps.appointment_letter_issued_date,
                ps.vigilance_clr_received_date,
                ps.dpc_conducted_date,
                ps.approval_by_ca_date,
                ps.promotion_order_issued_date,
                ps.application_received_date,
                ps.review_application_by_comm,
                ps.approval_received_date,
                ps.order_issued_date,
                ps.discharge_reason,
                ps.revival_process_initiated,
                ps.revival_remarks,
                ps.revival_date,
                ps.revival_stage_id,
                ps.revival_submission_date,
                ps.revive_proposal_sent_to_doe_date,
                ps.revive_approval_date_from_doe,
                ps.revive_rejection_date_from_doe,
                ps.revive_remarks_from_doe,
                ps.revive_proposal_rejected_by_doe_date,
                ps.order_of_revival_issued_date,
                ps.revival_doc_name,
                ps.revoke_reason,
                ps.created_date,
                ps.created_by,
                ps.updated_date,
                ps.updated_by,
                ps.organisation_id,
                ps.organisation_name,
                ps.reason_for_process_not_initiated,
                ps.post_chd,
                a.A_is_recruitment_through_ipa,
                a.A_process_initiated_date,
                a.A_notification_adv_issued_date,
                a.A_renotification_adv_issued_date,
                a.A_number_of_eligible_application,
                a.A_exam_conducted_date,
                a.A_interview_conducted_date,
                a.A_selection_process_completed_date,
                a.A_result_declared_date,
                a.A_appointment_letter_issued_date,
                a.A_vigilance_clr_received_date,
                a.A_dpc_conducted_date,
                a.A_approval_by_ca_date,
                a.A_promotion_order_issued_date,
                a.A_application_received_date,
                a.A_review_application_by_comm,
                a.A_approval_received_date,
                a.A_order_issued_date
            FROM tbl_hr_post_strength ps
            LEFT JOIN tbl_hr_anticipated_vacancies_details a ON ps.post_code = a.post_code
            WHERE ps.post_code = @postCode`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

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
                //     await request.query(`UPDATE tbl_hr_post_strength
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
                    updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
                        updated_by = @userID
                        WHERE post_code = @postCode`);



                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                activity_name = 'Promotion',
                                updated_date = GETDATE(),
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
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  @promotionDate,  GETDATE(), @userID)
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
                //     await request.query(`UPDATE tbl_hr_post_strength
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
                updated_date = GETDATE(),
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
                    updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
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
                        updated_date = GETDATE(),
                        updated_by = @userID
                        WHERE post_code = @postCode`);



                    const updateTransaction = await request.query(`
                            UPDATE tbl_employee_transaction_details
                            SET method_of_discharge = @methodOfDischarge,
                                emp_post_end_date = @postEndDate,
                                updated_date = GETDATE(),
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
                    @postCode, @postName, @departmentName, @empWorkingOrgIDPrev,  GETDATE(), @userID)
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
                updated_date = GETDATE(),
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
                updated_date = GETDATE(),
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

export default {upload, updatePostStrengthLog,getVaccancyLogDetailsByPostCode, getPostNamesByPostCode, getPostListByDepAndOrg,updateHRPostActivitiy};