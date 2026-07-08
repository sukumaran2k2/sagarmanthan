import { pool } from "../../db.js";

export async function convertIntoVacantPost(request,postCode,newDateOfVacancy) {
    // const conn = await pool;
    // const request = conn.request();
    let newPostCode = postCode;
    let revisedNewDateOfVacancy = newDateOfVacancy;

    request.input("revisedNewDateOfVacancy", revisedNewDateOfVacancy);
    request.input("newPostCode", newPostCode);

    await request.query(`UPDATE tbl_hr_post_strength
                        SET
                          process_initiated_date = A_process_initiated_date,
                          notification_adv_issued_date = A_notification_adv_issued_date,
                          renotification_adv_issued_date = A_renotification_adv_issued_date,
                          number_of_eligible_application = A_number_of_eligible_application,
                          exam_conducted_date = A_exam_conducted_date,
                          interview_conducted_date = A_interview_conducted_date,
                          selection_process_completed_date = A_selection_process_completed_date,
                          result_declared_date = A_result_declared_date,
                          appointment_letter_issued_date = A_appointment_letter_issued_date,
                          vigilance_clr_received_date = A_vigilance_clr_received_date,
                          dpc_conducted_date = A_dpc_conducted_date,
                          approval_by_ca_date = A_approval_by_ca_date,
                          promotion_order_issued_date = A_promotion_order_issued_date,
                          application_received_date = A_application_received_date,
                          review_application_by_comm = A_review_application_by_comm,
                          approval_received_date = A_approval_received_date,
                          order_issued_date = A_order_issued_date,
                          is_recruitment_through_ipa = A_is_recruitment_through_ipa,
                          method_of_appointment = expected_anticipated_vacancy,
                          vacancy_type = expected_anticipated_vacancy
                        WHERE post_code = @newPostCode`);

    await request.query(`UPDATE tbl_hr_post_strength
                        SET vacant_or_filled = 'vacant',
                        is_new = 0,
                        employee_id = NULL,
                        emp_master_id = NULL,
                        date_of_arise_in_vacancy = @revisedNewDateOfVacancy,
                        expected_anticipated_vacancy = NULL,
                        employee_joined_date = NULL,
                        created_date = GETDATE(),
                        updated_date = NULL,
                        updated_by = NULL,
                        discharge_reason = NULL,
                        revival_process_initiated = NULL,
                        revival_remarks = NULL,
                        revival_date = NULL,
                        revival_stage_id = NULL,
                        revival_submission_date = NULL,
                        revive_proposal_sent_to_doe_date = NULL,
                        revive_approval_date_from_doe = NULL,
                        revive_rejection_date_from_doe = NULL,
                        revive_remarks_from_doe = NULL,
                        revive_proposal_rejected_by_doe_date = NULL,
                        order_of_revival_issued_date = NULL,
                        revoke_reason = NULL,
                        revival_doc_name = NULL,
                        A_process_initiated_date = NULL,
                        A_notification_adv_issued_date = NULL,
                        A_renotification_adv_issued_date = NULL,
                        A_number_of_eligible_application = NULL,
                        A_exam_conducted_date = NULL,
                        A_interview_conducted_date = NULL,
                        A_selection_process_completed_date = NULL,
                        A_result_declared_date = NULL,
                        A_appointment_letter_issued_date = NULL,
                        A_vigilance_clr_received_date = NULL,
                        A_dpc_conducted_date = NULL,
                        A_approval_by_ca_date = NULL,
                        A_promotion_order_issued_date = NULL,
                        A_application_received_date = NULL,
                        A_review_application_by_comm = NULL,
                        A_approval_received_date = NULL,
                        A_order_issued_date = NULL,
                        A_is_recruitment_through_ipa = NULL
                        WHERE post_code = @newPostCode`);
};

export async function getNewEmployeeIDofOrg(organisationID) {
    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const lastEmployeeIDResult = await request.query(`with getEmployeeID as(
                SELECT cast(LEFT( employee_id,CHARINDEX('EMP',employee_id)-1) as int) as org_value,employee_id,
                cast(SUBSTRING(employee_id, CHARINDEX('EMP', employee_id) + 3, LEN(employee_id)) AS int) as emp_value
            FROM tbl_employee_transaction_details et
            LEFT JOIN tbl_employee_master m ON et.emp_master_id = m.emp_master_id
            where et.employee_id != '0')
            select top 1  emp_value, employee_id from getEmployeeID where org_value = @organisationID order by emp_value desc`);

            let newEmployeeID;
            if (lastEmployeeIDResult.recordset.length > 0) {
                const getLastEmployeeOfDeputedOrg = lastEmployeeIDResult.recordset[0].employee_id;
                const prefix = getLastEmployeeOfDeputedOrg.slice(0, getLastEmployeeOfDeputedOrg.indexOf('EMP') + 3);
                const lastNumber = parseInt(getLastEmployeeOfDeputedOrg.slice(getLastEmployeeOfDeputedOrg.indexOf('EMP') + 3), 10);
                const newNumber = (lastNumber + 1).toString();
                newEmployeeID = `${prefix}${newNumber}`;
            } else {
                const organisationId = organisationID.toString().padStart(2, '0');
                newEmployeeID = `${organisationId}EMP1`;
            }

            request.input("newEmployeeID", newEmployeeID);
            const checkResult = await request.query(`
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM tbl_employee_transaction_details WHERE employee_id = @newEmployeeID
                ) THEN 1 ELSE 0 END AS isExists
            `);

            const isEmployeeIDExists = checkResult.recordset[0].isExists;

            if (isEmployeeIDExists) {
                throw new Error("Generated Employee ID already exists in the system");
            }

            return newEmployeeID;
    } catch (error) {
        console.error("Error fetching last employee ID:", error);
        throw error;
    }
};

export async function checkAadharNumberExistence(req,res) {
    const aadharNumber = req.params.aadharNumber;
    
    try {
        const conn = await pool;
        const request = conn.request();
        request.input("aadharNumber", aadharNumber);
        
        const result = await request.query(`SELECT CASE WHEN EXISTS (SELECT 1 FROM tbl_employee_master WHERE emp_aadhar_number = @aadharNumber) THEN 1 ELSE 0 END AS isExists`);
        res.json({ exists: result.recordset[0].isExists });
    } catch(error) {
        console.error("Error occurred while checking the aadhar number existence", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export async function checkReferenceNumberExistence(req,res) {
    const refNo = req.params.refNo;
    const orgID = req.params.orgID;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("refNo", refNo);
        request.input("orgID", orgID);
        
        const result = await request.query(`SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM tbl_employee_transaction_details t
                LEFT JOIN tbl_employee_master m ON t.emp_master_id = m.emp_master_id
                WHERE m.emp_curr_org_id = @orgID
                AND t.emp_reference_id = @refNo
            ) THEN 1 ELSE 0 END AS isExists`);
        res.json({ exists: result.recordset[0].isExists });
    } catch(error) {
        console.error("Error occurred while checking the reference number existence", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export default {
    checkAadharNumberExistence,
    checkReferenceNumberExistence
};
