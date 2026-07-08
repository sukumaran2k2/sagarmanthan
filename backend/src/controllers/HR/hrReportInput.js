import { pool } from "../../db.js";
import sql from 'mssql';

async function createHrReportInput1_5(req, res) {
    const {
        financialYear, month, classId, vacantOn, vacancyRisen, anticipatedVacancies, filledDuringFY,
        filledByOtherMoa, BalanceFillUp, processNotInit, processInitVC, vigilanceClearance, DPCConducted,
        approvalByCompetentAuth, promotionOrderIssued, organisationID, userID
    } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        // Add all inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("vacantOn", vacantOn);
        request.input("vacancyRisen", vacancyRisen);
        request.input("anticipatedVacancies", anticipatedVacancies);
        request.input("filledDuringFY", filledDuringFY);
        request.input("filledByOtherMoa", filledByOtherMoa);
        request.input("BalanceFillUp", BalanceFillUp);
        request.input("processNotInit", processNotInit);
        request.input("processInitVC", processInitVC);
        request.input("vigilanceClearance", vigilanceClearance);
        request.input("DPCConducted", DPCConducted);
        request.input("approvalByCompetentAuth", approvalByCompetentAuth);
        request.input("promotionOrderIssued", promotionOrderIssued);
        request.input("userID", userID);

       
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_5
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
      
            await request.query(`
                UPDATE tbl_hr_report_input_1_5
                SET
                    vacant_on = @vacantOn,
                    vacancy_risen = @vacancyRisen,
                    anticipated_vacancies = @anticipatedVacancies,
                    filled_during_fy = @filledDuringFY,
                    filled_by_other_moa = @filledByOtherMoa,
                    balance_fill_up = @BalanceFillUp,
                    process_not_init = @processNotInit,
                    process_not_vc = @processInitVC,
                    vigilance_clearance = @vigilanceClearance,
                    dpc_conducted = @DPCConducted,
                    approved_by_comp_auth = @approvalByCompetentAuth,
                    promotion_order_issued = @promotionOrderIssued,
                    updated_by = @userID,
                    updated_date = GETDATE()
                  
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);

            return res.status(201).json({ success: true, message: "Data saved successfully" });
        } else {
            await request.query(`
                INSERT INTO tbl_hr_report_input_1_5 (
                    financial_year, month, class_id, vacant_on, vacancy_risen, anticipated_vacancies,
                    filled_during_fy, filled_by_other_moa, balance_fill_up, process_not_init,
                    process_not_vc, vigilance_clearance, dpc_conducted, approved_by_comp_auth,
                    promotion_order_issued, organisation_id, created_date, created_by
                )
                VALUES (
                    @financialYear, @month, @classId, @vacantOn, @vacancyRisen, @anticipatedVacancies,
                    @filledDuringFY, @filledByOtherMoa, @BalanceFillUp, @processNotInit,
                    @processInitVC, @vigilanceClearance, @DPCConducted, @approvalByCompetentAuth,
                    @promotionOrderIssued, @organisationID, GETDATE(), @userID
                )
            `);

            return res.status(201).json({ success: true, message: "Data saved successfully" });
        }

    } catch (error) {
        // console.error("Error in createHrReportInput1_5:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}


async function createHrReportInput1_6(req, res) {
    const {
        financialYear, month, classId, vacantOn, vacancyRisen, filledDuringFY, BalanceFillUp,
        processNotInitiated, processStartedNotAdv, notificationIssued, applicationReceived,
        reviewByCommittee, approvalReceived, orderIssued, organisationID, userID
    } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        // Add all inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("vacantOn", vacantOn);
        request.input("vacancyRisen", vacancyRisen);
        request.input("filledDuringFY", filledDuringFY);
        request.input("BalanceFillUp", BalanceFillUp);
        request.input("processNotInitiated", processNotInitiated);
        request.input("processStartedNotAdv", processStartedNotAdv);
        request.input("notificationIssued", notificationIssued);
        request.input("applicationReceived", applicationReceived);
        request.input("reviewByCommittee", reviewByCommittee);
        request.input("approvalReceived", approvalReceived);
        request.input("orderIssued", orderIssued);
        request.input("userID", userID);

        // Check if record exists
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_6
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            // Update existing record
            await request.query(`
                UPDATE tbl_hr_report_input_1_6
                SET
                    vacant_on = @vacantOn,
                    vacancy_risen = @vacancyRisen,
                    filled_during_fy_deput = @filledDuringFY,
                    balance_filled_up = @BalanceFillUp,
                    vacancies_pro_not_init = @processNotInitiated,
                    vacancies_pro_init_notificatioon_issued = @processStartedNotAdv,
                    vacancies_adv_issued = @notificationIssued,
                    vacancies__app_received = @applicationReceived,
                    vacancies_review_committee = @reviewByCommittee,
                    vacancies_approval_received = @approvalReceived,
                    vacancies_in_order_issued = @orderIssued,
                    updated_by = @userID,
                    updated_at = GETDATE()
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);

              return res.status(201).json({ success: true, message: "Data saved successfully" });
        } else {
            // Insert new record
            await request.query(`
                INSERT INTO tbl_hr_report_input_1_6 (
                    financial_year, month, class_id,
                    vacant_on, vacancy_risen, filled_during_fy_deput, balance_filled_up,
                    vacancies_pro_not_init, vacancies_pro_init_notificatioon_issued,
                    vacancies_adv_issued, vacancies__app_received, vacancies_review_committee,
                    vacancies_approval_received, vacancies_in_order_issued,
                    organisation_id, created_date, created_by
                )
                VALUES (
                    @financialYear, @month, @classId,
                    @vacantOn, @vacancyRisen, @filledDuringFY, @BalanceFillUp,
                    @processNotInitiated, @processStartedNotAdv,
                    @notificationIssued, @applicationReceived, @reviewByCommittee,
                    @approvalReceived, @orderIssued,
                    @organisationID, GETDATE(), @userID
                )
            `);

            return res.status(201).json({ success: true, message: "Data saved successfully" });
        }

    } catch (error) {
        // console.error("Error in createHrReportInput1_6:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function createHrvacancyData(req, res) {
    const {
        financialYear, month, beginningFY, occurredFY, totalVacancies, anticipatedVacancies,
        filledTillLastMonth, filledDuringMonth, totalFilledUp, organisationID, userID
    } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        // Bind inputs
        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("beginningFY", beginningFY);
        request.input("occurredFY", occurredFY);
        request.input("totalVacancies", totalVacancies);
        request.input("anticipatedVacancies", anticipatedVacancies);
        request.input("filledTillLastMonth", filledTillLastMonth);
        request.input("filledDuringMonth", filledDuringMonth);
        request.input("totalFilledUp", totalFilledUp);
        request.input("userID", userID);
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_2
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            await request.query(`
                UPDATE tbl_hr_report_input_1_2
                SET
                    beginning_of_fy = @beginningFY,
                    during_the_fy = @occurredFY,
                    total_vacancies = @totalVacancies,
                    anticipated_vacancies = @anticipatedVacancies,
                    filled_till_last_month = @filledTillLastMonth,
                    filled_during_month = @filledDuringMonth,
                    total_filled = @totalFilledUp,
                    updated_by = @userID,
                    Updated_Date = GETDATE()
                 
                WHERE organisation_id = @organisationID
                  AND financial_year = @financialYear
                  AND month = @month
            `);

            return res.status(201).json({ success: true, message: "Data updated successfully" });
        } else {
            await request.query(`
                INSERT INTO tbl_hr_report_input_1_2 (
                    organisation_id, financial_year, month,
                    beginning_of_fy, during_the_fy, total_vacancies,
                    anticipated_vacancies, filled_till_last_month,
                    filled_during_month, total_filled,
                    created_date, created_by
                )
                VALUES (
                    @organisationID, @financialYear, @month,
                    @beginningFY, @occurredFY, @totalVacancies,
                    @anticipatedVacancies, @filledTillLastMonth,
                    @filledDuringMonth, @totalFilledUp,
                    GETDATE(), @userID
                )
            `);

            return res.status(201).json({ success: true, message: "Data inserted successfully" });
        }

    } catch (error) {
        // console.error("Error in createHrvacancyData:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
  
async function createHrreport1_3(req, res) {
    const {
        financialYear, month, noOfPosts, totalPostsStrength, liveVacinBeginning, liveVacOccurred, liveVacTotal,
        filledDR, filledP, filledD, filledCM, filledT, filledA, totalFilled,
        balDR, balP, balCM, balD, balT, totalVacant,
        classId, organisationID, userID
    } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        // Add inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("noOfPosts", noOfPosts);
        request.input("totalPostsStrength", totalPostsStrength);
        request.input("liveVacinBeginning", liveVacinBeginning);
        request.input("liveVacOccurred", liveVacOccurred);
        request.input("liveVacTotal", liveVacTotal);
        request.input("filledDR", filledDR);
        request.input("filledP", filledP);
        request.input("filledD", filledD);
        request.input("filledCM", filledCM);
        request.input("filledT", filledT);
        request.input("filledA", filledA);
        request.input("totalFilled", totalFilled);
        request.input("balDR", balDR);
        request.input("balP", balP);
        request.input("balCM", balCM);
        request.input("balD", balD);
        request.input("balT", balT);
        request.input("totalVacant", totalVacant);
        request.input("userID", userID);

        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_3
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            await request.query(`
                UPDATE tbl_hr_report_input_1_3
                SET
                    no_of_post = @noOfPosts,
                    total_posts_strength = @totalPostsStrength,
                    no_vacancy_beginning_fy = @liveVacinBeginning,
                    no_vacancy_occurred_fy = @liveVacOccurred,
                    total_vacancy = @liveVacTotal,
                    filled_direct_fy = @filledDR,
                    filled_promotion_fy = @filledP,
                    filled_deputation_fy = @filledD,
                    filled_composite_fy = @filledCM,
                    filled_transfer = @filledT,
                    filled_absorption = @filledA,
                    total_filled = @totalFilled,
                    balance_direct_recruitment = @balDR,
                    balance_promotion = @balP,
                    balance_composite_method = @balCM,
                    balance_deputation = @balD,
                    balance_transfer = @balT,
                    balance_total_vacancy = @totalVacant,
                    updated_by = @userID,
                    updated_date = GETDATE()
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);
            res.status(201).json({ message: "HR report 1.3 record updated" });
        } else {
    
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_report_input_1_3 (
                    organisation_id, class_id, financial_year, month,
                    no_of_post, total_posts_strength,
                    no_vacancy_beginning_fy, no_vacancy_occurred_fy, total_vacancy,
                    filled_direct_fy, filled_promotion_fy, filled_deputation_fy, filled_composite_fy,
                    filled_transfer, filled_absorption, total_filled,
                    balance_direct_recruitment, balance_promotion, balance_composite_method,
                    balance_deputation, balance_transfer, balance_total_vacancy,
                    created_date, created_by
                )
                OUTPUT INSERTED.id
                VALUES (
                    @organisationID, @classId, @financialYear, @month,
                    @noOfPosts, @totalPostsStrength,
                    @liveVacinBeginning, @liveVacOccurred, @liveVacTotal,
                    @filledDR, @filledP, @filledD, @filledCM,
                    @filledT, @filledA, @totalFilled,
                    @balDR, @balP, @balCM,
                    @balD, @balT, @totalVacant,
                    GETDATE(), @userID
                )
            `);
            res.status(201).json({ message: "HR report 1.3 record inserted", insertedId: insertResult.recordset[0].id });
        }

    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}


async function createHrreportinput1_4(req, res) {
    const {
        classId,financialYear,month,vacantOnDate_14,vacancyRisen_14,anticipatedVacancies_14,filledDuringFY_14,filledByOtherMethod_14,
        balanceToBeFilled_14,processNotInitiated_14,processStartedNotAdv_14,notificationIssued_14,examConducted_14,interviewConducted_14,
        selectionCompleted_14,resultDeclared_14,appointmentIssued_14,organisationID,userID
         } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();

        // Add inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("vacantOnDate_14", vacantOnDate_14);
        request.input("vacancyRisen_14", vacancyRisen_14);
        request.input("anticipatedVacancies_14", anticipatedVacancies_14);
        request.input("filledDuringFY_14", filledDuringFY_14);
        request.input("filledByOtherMethod_14", filledByOtherMethod_14);
        request.input("balanceToBeFilled_14", balanceToBeFilled_14);
        request.input("processNotInitiated_14", processNotInitiated_14);
        request.input("processStartedNotAdv_14", processStartedNotAdv_14);
        request.input("notificationIssued_14", notificationIssued_14);
        request.input("examConducted_14", examConducted_14);
        request.input("interviewConducted_14", interviewConducted_14);
        request.input("selectionCompleted_14", selectionCompleted_14);
        request.input("resultDeclared_14", resultDeclared_14);
        request.input("appointmentIssued_14", appointmentIssued_14);
        request.input("userID", userID);

        // Check if record exists
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_4
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            // Update existing record
            await request.query(`
                UPDATE tbl_hr_report_input_1_4
                SET
                    vacant_as_on = @vacantOnDate_14,
                    vacancy_risen_during_year = @vacancyRisen_14,
                    anticipated_vacancy = @anticipatedVacancies_14,
                    filled_during_fy = @filledDuringFY_14,
                    filled_by_other_methods = @filledByOtherMethod_14,
                    balance_to_be_filled = @balanceToBeFilled_14,
                    process_not_initiated = @processNotInitiated_14,
                    advertisement_yet_issued = @processStartedNotAdv_14,
                    notification_adv_issued = @notificationIssued_14,
                    exam_conducted = @examConducted_14,
                    interview_conducted = @interviewConducted_14,
                    selction_process_completed = @selectionCompleted_14,
                    result_declared = @resultDeclared_14,
                    appointment_issued = @appointmentIssued_14,
                    updated_by = @userID,
                    Updated_Date = GETDATE()
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);
            res.status(201).json({ message: "HR report record updated" });
        } else {
            // Insert new record
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_report_input_1_4 (
                    organisation_id, class_id, financial_year, month,
                    vacant_as_on, vacancy_risen_during_year, anticipated_vacancy,
                    filled_during_fy, filled_by_other_methods, balance_to_be_filled,
                    process_not_initiated, advertisement_yet_issued, notification_adv_issued,
                    exam_conducted, interview_conducted, selction_process_completed,
                    result_declared, appointment_issued, created_by
                )
                OUTPUT INSERTED.id
                VALUES (
                    @organisationID, @classId, @financialYear, @month,
                    @vacantOnDate_14, @vacancyRisen_14, @anticipatedVacancies_14,
                    @filledDuringFY_14, @filledByOtherMethod_14, @balanceToBeFilled_14,
                    @processNotInitiated_14, @processStartedNotAdv_14, @notificationIssued_14,
                    @examConducted_14, @interviewConducted_14, @selectionCompleted_14,
                    @resultDeclared_14, @appointmentIssued_14, @userID
                )
            `);
            res.status(201).json({ message: "HR report record inserted", insertedId: insertResult.recordset[0].id });
        }

    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function createHrreportinput1_8(req, res) {
    const {
        classId, financialYear, month,
        vacantOnDate_18_1, vacancyRisen_18_1, filledDuringFY_18_1,
        balanceToBeFilled_18_1, processNotInitiated_18_1, processStartedNotAdv_18_1,
        notificationIssued_18_1, applicationReceived_18_1, reviewByCommittee_18_1,
        approvalReceived_18_1, orderIssued_18_1, proposal_rejected_18_1,
        organisationID, userID
    } = req.body;


    try {
        const conn = await pool;
        const request = conn.request();

        // Add inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("vacantOnDate_18_1", vacantOnDate_18_1);
        request.input("vacancyRisen_18_1", vacancyRisen_18_1);
        request.input("filledDuringFY_18_1", filledDuringFY_18_1);
        request.input("balanceToBeFilled_18_1", balanceToBeFilled_18_1);
        request.input("processNotInitiated_18_1", processNotInitiated_18_1);
        request.input("processStartedNotAdv_18_1", processStartedNotAdv_18_1);
        request.input("notificationIssued_18_1", notificationIssued_18_1);
        request.input("applicationReceived_18_1", applicationReceived_18_1);
        request.input("reviewByCommittee_18_1", reviewByCommittee_18_1);
        request.input("approvalReceived_18_1", approvalReceived_18_1);
        request.input("orderIssued_18_1", orderIssued_18_1);
        request.input("proposal_rejected_18_1", proposal_rejected_18_1);
        request.input("userID", userID);

        // Check if record exists
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_8
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            // Update existing record
            await request.query(`
                UPDATE tbl_hr_report_input_1_8
                SET
                    vacant_as_on = @vacantOnDate_18_1,
                    vacancy_risen_fy = @vacancyRisen_18_1,
                    filled_during_fy = @filledDuringFY_18_1,
                    balance_to_filled = @balanceToBeFilled_18_1,
                    process_not_initiated = @processNotInitiated_18_1,
                    process_initiated_not_issues = @processStartedNotAdv_18_1,
                    notify_adv = @notificationIssued_18_1,
                    application_received = @applicationReceived_18_1,
                    review_application = @reviewByCommittee_18_1,
                    approval_received = @approvalReceived_18_1,
                    order_issues = @orderIssued_18_1,
                    proposal_rejected = @proposal_rejected_18_1,
                    updated_by = @userID,
                    Updated_Date = GETDATE()
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);
            res.status(201).json({ message: "HR report 1.8 record updated" });
        } else {
           
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_report_input_1_8 (
                    organisation_id, class_id, financial_year, month,
                    vacant_as_on, vacancy_risen_fy, filled_during_fy,
                    balance_to_filled, process_not_initiated, process_initiated_not_issues,
                    notify_adv, application_received, review_application,
                    approval_received, order_issues, proposal_rejected,
                    created_by, created_date
                )
                OUTPUT INSERTED.id
                VALUES (
                    @organisationID, @classId, @financialYear, @month,
                    @vacantOnDate_18_1, @vacancyRisen_18_1, @filledDuringFY_18_1,
                    @balanceToBeFilled_18_1, @processNotInitiated_18_1, @processStartedNotAdv_18_1,
                    @notificationIssued_18_1, @applicationReceived_18_1, @reviewByCommittee_18_1,
                    @approvalReceived_18_1, @orderIssued_18_1, @proposal_rejected_18_1,
                    @userID, GETDATE()
                )
            `);
            res.status(201).json({ message: "HR report 1.8 record inserted", insertedId: insertResult.recordset[0].id });
        }

    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function createHrreportinput1_7(req, res) {
    const {
        classId, financialYear, month,
        vacantOnDate_17_1, vacancyRisen_17_1, filledDuringFY_17_1, balanceToBeFilled_17_1,
        processNotInitiated_17_1, processStartedNotAdv_17_1, notificationIssued_17_1,
        applicationReceived_17_1, reviewByCommittee_17_1, approvalReceived_17_1,
        orderIssued_17_1, organisationID, userID
    } = req.body;


    try {
        const conn = await pool;
        const request = conn.request();

        // Add inputs
        request.input("organisationID", organisationID);
        request.input("classId", classId);
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("vacantOnDate_17_1", vacantOnDate_17_1);
        request.input("vacancyRisen_17_1", vacancyRisen_17_1);
        request.input("filledDuringFY_17_1", filledDuringFY_17_1);
        request.input("balanceToBeFilled_17_1", balanceToBeFilled_17_1);
        request.input("processNotInitiated_17_1", processNotInitiated_17_1);
        request.input("processStartedNotAdv_17_1", processStartedNotAdv_17_1);
        request.input("notificationIssued_17_1", notificationIssued_17_1);
        request.input("applicationReceived_17_1", applicationReceived_17_1);
        request.input("reviewByCommittee_17_1", reviewByCommittee_17_1);
        request.input("approvalReceived_17_1", approvalReceived_17_1);
        request.input("orderIssued_17_1", orderIssued_17_1);
        request.input("userID", userID);

        // Check if record exists
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_7
            WHERE organisation_id = @organisationID
              AND class_id = @classId
              AND financial_year = @financialYear
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            await request.query(`
                UPDATE tbl_hr_report_input_1_7
                SET
                    vacant_as_on = @vacantOnDate_17_1,
                    vacancy_risen_fy = @vacancyRisen_17_1,
                    filled_during_fy = @filledDuringFY_17_1,
                    balance_to_filled = @balanceToBeFilled_17_1,
                    process_not_initiated = @processNotInitiated_17_1,
                    process_initiated_not_issues = @processStartedNotAdv_17_1,
                    notify_adv = @notificationIssued_17_1,
                    application_received = @applicationReceived_17_1,
                    review_application = @reviewByCommittee_17_1,
                    approval_received = @approvalReceived_17_1,
                    order_issues = @orderIssued_17_1,
                    updated_by = @userID,
                    Updated_Date = GETDATE()
                WHERE organisation_id = @organisationID
                  AND class_id = @classId
                  AND financial_year = @financialYear
                  AND month = @month
            `);
            res.status(201).json({ message: "HR report record updated" });
        } else {
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_report_input_1_7 (
                    organisation_id, class_id, financial_year, month,
                    vacant_as_on, vacancy_risen_fy, filled_during_fy,
                    balance_to_filled, process_not_initiated, process_initiated_not_issues,
                    notify_adv, application_received, review_application,
                    approval_received, order_issues, created_by, created_date
                )
                OUTPUT INSERTED.id
                VALUES (
                    @organisationID, @classId, @financialYear, @month,
                    @vacantOnDate_17_1, @vacancyRisen_17_1, @filledDuringFY_17_1,
                    @balanceToBeFilled_17_1, @processNotInitiated_17_1, @processStartedNotAdv_17_1,
                    @notificationIssued_17_1, @applicationReceived_17_1, @reviewByCommittee_17_1,
                    @approvalReceived_17_1, @orderIssued_17_1, @userID, GETDATE()
                )
            `);
            res.status(201).json({ message: "HR report record inserted", insertedId: insertResult.recordset[0].id });
        }

    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}


async function submitReportInput1_1(req, res) {
    const {  year,month, sanctionedStrength, inPosition, totalVacanciesR1,
                anticipatedVacanciesFY, lessThan5Years, moreThan5Years,
                organisationID, userID } = req.body;

    const conn = await pool;
    const request = conn.request();
    try {
        
        request.input("year", year);
        request.input("month", month);
        request.input("sanctionedStrength", sanctionedStrength);
        request.input("inPosition", inPosition);
        request.input("totalVacanciesR1", totalVacanciesR1);
        request.input("anticipatedVacanciesFY", anticipatedVacanciesFY);
        request.input("lessThan5Years", lessThan5Years);
        request.input("moreThan5Years", moreThan5Years);
        request.input("organisationID", organisationID);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_hr_report_input_1_1 (financial_year,month,sanctioned_strength,in_position,total_vacancies,anticipated_vacancies_curr_fy,less_than_five_years,more_than_five_years,organisation_id,created_date,created_by)
            OUTPUT INSERTED.id
            VALUES (@year,@month, @sanctionedStrength, @inPosition, @totalVacanciesR1, @anticipatedVacanciesFY, @lessThan5Years, @moreThan5Years, @organisationID,getDate(), @userID)
        `);
        res.status(201).json({ insertedYPId: insertResult.recordset[0].id });
    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function checkFinancialYearExists(req, res) {
    try {
        const { organisationID, financialYear, month,classId } = req.query;

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("month", parseInt(month, 10));
        request.input("classId", classId);

        const query = `
            SELECT financial_year, month, organisation_id, NULL as class_id FROM tbl_hr_report_input_1_2
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month 
            UNION
            SELECT financial_year, month, organisation_id, class_id  FROM tbl_hr_report_input_1_3
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
            UNION
            SELECT financial_year, month, organisation_id, class_id FROM tbl_hr_report_input_1_4
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
            UNION
            SELECT financial_year, month, organisation_id, class_id FROM tbl_hr_report_input_1_5
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
            UNION
            SELECT financial_year, month, organisation_id, class_id FROM tbl_hr_report_input_1_6
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
            UNION
            SELECT financial_year, month, organisation_id, class_id FROM tbl_hr_report_input_1_7
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
            UNION
            SELECT financial_year, month, organisation_id, class_id FROM tbl_hr_report_input_1_8
            WHERE organisation_id = @organisationID
              AND financial_year = @financialYear
              AND month = @month AND class_id = @classId
        `;

        const result = await request.query(query);

        const exists = result.recordset.length > 0;
        return res.json({ exists });
    } catch (error) {
        // console.error("Error checking financial year and month:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function hrSecondReportOtherOrg(req, res) {
  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      beginning_of_fy AS [At the beginning of the FY],
      during_the_fy AS [Occurred during the FY],
      total_vacancies AS [Total],
      anticipated_vacancies AS [Anticipated vacancies in Next FY],
      filled_till_last_month AS [Filled from Beginning of the FY till last month],
      filled_during_month AS [Filled during the month],
      total_filled AS [Total filled up]
    FROM 
      [dbo].[tbl_hr_report_input_1_2]
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = tbl_hr_report_input_1_2.organisation_id
    WHERE
        tbl_hr_report_input_1_2.financial_year = @financialYear AND
        tbl_hr_report_input_1_2.month = @lastMonth `;
    }else{
      query1 = `
      SELECT 
        mmt.organisation_name AS 'Organisation',
        mmt.organisation_id AS 'organisationId',
        beginning_of_fy AS [At the beginning of the FY],
        during_the_fy AS [Occurred during the FY],
        total_vacancies AS [Total],
        anticipated_vacancies AS [Anticipated vacancies in Next FY],
        filled_till_last_month AS [Filled from Beginning of the FY till last month],
        filled_during_month AS [Filled during the month],
        total_filled AS [Total filled up]
      FROM 
        [dbo].[tbl_hr_report_input_1_2]
      INNER JOIN 
        mmt_organisation mmt ON mmt.organisation_id = tbl_hr_report_input_1_2.organisation_id
      WHERE 
        tbl_hr_report_input_1_2.organisation_id = @organisationID AND
        tbl_hr_report_input_1_2.financial_year = @financialYear AND
        tbl_hr_report_input_1_2.month = @lastMonth

        `;
  }
  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      { headerName: "Organisation", field: "Organisation", headerClass: "headercenter", cellStyle: { textAlign: "center" } },
      { headerName: "Organisation Id", field: "organisationId", headerClass: "headerGroup" },
      {
        headerName: "Number of Live Vacancies",
        headerClass: "headercenter",
        children: [
          { headerName: "At the beginning of the FY", field: "At the beginning of the FY", headerClass: "headercenter" },
          { headerName: "Occurred during the FY", field: "Occurred during the FY", headerClass: "headercenter" },
          { headerName: "Total", field: "Total", headerClass: "headercenter" },
        ],
      },
      {
        headerName: "Anticipated vacancies in Next FY",
        field: "Anticipated vacancies in Next FY",
        headerClass: "headercenter",
      },
      {
        headerName: "Filled During the Year",
        headerClass: "headercenter",
        children: [
          { headerName: "Filled from Beginning of the FY till last month", field: "Filled from Beginning of the FY till last month", headerClass: "headercenter" },
          { headerName: "Filled during the month", field: "Filled during the month", headerClass: "headercenter" },
          { headerName: "Total filled up", field: "Total filled up", headerClass: "headercenter" },
        ],
      },
    ];
    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err.message });
  }
}

async function hrAbstarctReportOtherOrg(req, res) {
  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);
 
   let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
	    cls.class AS 'Class / Group',
	    report1_3.no_of_post AS 'No of Posts',
      report1_3.total_posts_strength AS 'Total No of Posts Strength',
      
      report1_3.no_vacancy_beginning_fy AS 'At the beginning of the FY',
      report1_3.no_vacancy_occurred_fy AS 'Occurred during the FY',
      report1_3.total_vacancy AS 'Total',
      report1_3.filled_direct_fy AS 'DR',
      report1_3.filled_promotion_fy AS 'P',
      report1_3.filled_deputation_fy AS 'D',
      report1_3.filled_composite_fy AS 'CM',
      report1_3.filled_transfer AS 'T',
      report1_3.filled_absorption AS 'A',
      report1_3.total_filled AS 'TotalFilled',
      report1_3.balance_direct_recruitment AS 'DR_vacant',
      report1_3.balance_promotion AS 'P_vacant',
      report1_3.balance_composite_method AS 'CM_vacant',
      report1_3.balance_deputation AS 'D_vacant',
      report1_3.balance_transfer AS 'T_vacant',
      report1_3.balance_total_vacancy AS 'TotalVacant'
    
    FROM 
      [dbo].[tbl_hr_report_input_1_3] report1_3
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_3.organisation_id
	  LEFT JOIN mmt_class cls ON report1_3.class_id = cls.class_id
    WHERE
        report1_3.financial_year = @financialYear AND
        report1_3.month = @lastMonth `;
  }else{
   query1 =  `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
	    cls.class AS 'Class / Group',
	    report1_3.no_of_post AS 'No of Posts',
      report1_3.total_posts_strength AS 'Total No of Posts Strength',
      report1_3.no_vacancy_beginning_fy AS 'At the beginning of the FY',
      report1_3.no_vacancy_occurred_fy AS 'Occurred during the FY',
      report1_3.total_vacancy AS 'Total',
      report1_3.filled_direct_fy AS 'DR',
      report1_3.filled_promotion_fy AS 'P',
      report1_3.filled_deputation_fy AS 'D',
      report1_3.filled_composite_fy AS 'CM',
      report1_3.filled_transfer AS 'T',
      report1_3.filled_absorption AS 'A',
      report1_3.total_filled AS 'TotalFilled',
      report1_3.balance_direct_recruitment AS 'DR_vacant',
      report1_3.balance_promotion AS 'P_vacant',
      report1_3.balance_composite_method AS 'CM_vacant',
      report1_3.balance_deputation AS 'D_vacant',
      report1_3.balance_transfer AS 'T_vacant',
      report1_3.balance_total_vacancy AS 'TotalVacant'
    FROM 
      [dbo].[tbl_hr_report_input_1_3] report1_3
    INNER JOIN mmt_organisation mmt ON mmt.organisation_id = report1_3.organisation_id
	  LEFT JOIN mmt_class cls ON report1_3.class_id = cls.class_id
    WHERE 
        report1_3.organisation_id = @organisationID AND
        report1_3.financial_year = @financialYear AND
        report1_3.month = @lastMonth 
    `
  };

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        width: 320,
        cellStyle: { textAlign: "center" },
        children: [
          {
            headerName: "1",
            width: 320,
            field: "Organisation",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headercenter",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        width: 150,
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            width: 150,
            field: "Class / Group",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headercenter",
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "3",
            headerClass: "headercenter",
            field: "No of Posts",
          },
        ],
      },
      {
        headerName: "Total No of Posts Strength",
        field: "Total No of Posts Strength",
        width: 200,
        headerClass: "headercenter",
        children: [
          {
            headerName: "4",
            width: 200,
            headerClass: "headercenter",
            field: "Total No of Posts Strength",
          },
        ],
      },
      {
        headerName: "No. of Vacancies (Live)",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the beginning of the FY",
            field: "At the beginning of the FY",
            headerClass: "headercenter",
            width: 200,
            children: [
              {
                headerName: "5",
                width: 200,
                headerClass: "headercenter",
                field: "At the beginning of the FY",
              },
            ],
          },
          {
            headerName: "Occurred during the FY",
            field: "Occurred during the FY",
            headerClass: "headercenter",
            width: 180,
            children: [
              {
                headerName: "6",
                width: 180,
                headerClass: "headercenter",
                field: "Occurred during the FY",
              },
            ],
          },
          {
            headerName: "Total",
            field: "Total",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                headerClass: "headercenter",
                field: "Total",
              },
            ],
          },
        ],
      },
      {
        headerName: "No. of vacancies filled up during the FY by",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR",
            field: "DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "DR",
              },
            ],
          },
          {
            headerName: "P",
            field: "P",
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "P",
              },
            ],
          },
          {
            headerName: "D",
            field: "D",
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "D",
              },
            ],
          },
          {
            headerName: "CM",
            field: "CM",
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "CM",
              },
            ],
          },
          {
            headerName: "T",
            field: "T",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "T",
              },
            ],
          },
           {
            headerName: "A",
            field: "A",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "A",
              },
            ],
          },
          {
            headerName: "Total Filled",
            field: "TotalFilled",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "TotalFilled",
              },
            ],
          },
        ],
      },
      {
        headerName: "Balance No. of vacancies to be filled up by",
        field: "balanceVacant",
        headerClass: "headercenter",
        children: [
          {
            headerName: "DR ",
            field: "DR_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "15",
                field: "DR_vacant",
              },
            ],
          },
          {
            headerName: "P ",
            field: "P_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "16",
                field: "P_vacant",
              },
            ],
          },
          {
            headerName: "CM ",
            field: "CM_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "17",
                field: "CM_vacant",
              },
            ],
          },
          {
            headerName: "D",
            field: "D_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "18",
                field: "D_vacant",
              },
            ],
          },
          {
            headerName: "T",
            field: "T_vacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "19",
                field: "T_vacant",
              },
            ],
          },
          {
            headerName: "Total Vacant",
            field: "TotalVacant",
            headerClass: "headercenter",
            children: [
              {
                headerName: "20",
                field: "TotalVacant",
              },
            ],
          },
        ],
      },
    ];

   
    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrFourthReportOtherOrg(req, res) {
  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS 'Class / Group', 
      report1_4.vacant_as_on AS 'Vacant as on 01/04/2024',
      report1_4.vacancy_risen_during_year AS 'Vacancy risen during the year',
      report1_4.anticipated_vacancy AS 'Anticipated vacancies in Current FY',
      report1_4.filled_during_fy AS 'Filled during FY',
      report1_4.filled_by_other_methods AS 'Filled by Other method Appointment',
      report1_4.balance_to_be_filled AS 'Balance to be filled up',
      report1_4.process_not_initiated AS 'Process not initiated',
      report1_4.advertisement_yet_issued AS 'Process started but advertisement yet to be published',
      report1_4.notification_adv_issued AS 'Notification/Adv Issued',
      report1_4.exam_conducted AS 'Exam Conducted',
      report1_4.interview_conducted AS 'Interview Conducted',
      report1_4.selction_process_completed AS 'Selection Process Completed',
      report1_4.result_declared AS 'Result Declared',
      report1_4.appointment_issued AS 'Appointment Letter issued'
    FROM 
      [dbo].[tbl_hr_report_input_1_4] report1_4
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_4.organisation_id
    LEFT JOIN 
      mmt_class cls ON cls.class_id = report1_4.class_id
    WHERE
        report1_4.financial_year = @financialYear AND
        report1_4.month = @lastMonth
  `}else{
    query1 = `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS 'Class / Group', 
      report1_4.vacant_as_on AS 'Vacant as on 01/04/2024',
      report1_4.vacancy_risen_during_year AS 'Vacancy risen during the year',
      report1_4.anticipated_vacancy AS 'Anticipated vacancies in Current FY',
      report1_4.filled_during_fy AS 'Filled during FY',
      report1_4.filled_by_other_methods AS 'Filled by Other method Appointment',
      report1_4.balance_to_be_filled AS 'Balance to be filled up',
      report1_4.process_not_initiated AS 'Process not initiated',
      report1_4.advertisement_yet_issued AS 'Process started but advertisement yet to be published',
      report1_4.notification_adv_issued AS 'Notification/Adv Issued',
      report1_4.exam_conducted AS 'Exam Conducted',
      report1_4.interview_conducted AS 'Interview Conducted',
      report1_4.selction_process_completed AS 'Selection Process Completed',
      report1_4.result_declared AS 'Result Declared',
      report1_4.appointment_issued AS 'Appointment Letter issued'
    FROM 
      [dbo].[tbl_hr_report_input_1_4] report1_4
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_4.organisation_id
    LEFT JOIN 
      mmt_class cls ON cls.class_id = report1_4.class_id
    WHERE 
        report1_4.organisation_id = @organisationID AND
        report1_4.financial_year = @financialYear AND
        report1_4.month = @lastMonth
    `
  };

  
  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    // Your existing columnDefs, ensure 'Anticipated vacancies in Current FY' is present
    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headercenter",
        cellStyle: { textAlign: "center" },
        width: 300,
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies", // This is a parent group, field should match a calculated total if you display one, otherwise remove this field.
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through DR",
            headerClass: "headercenter",
            children: [
              {
                headerName: 'Vacant as on 01/04/2024', // Dynamic date for header
                field: "Vacant as on 01/04/2024",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Anticipated vacancies in Current FY",
                field: "Anticipated vacancies in Current FY", // This field name must match SQL alias
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "5",
                    field: "Anticipated vacancies in Current FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "6",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled by Other method Appointment",
                field: "Filled by Other method Appointment",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "6",
                    field: "Filled by Other method Appointment",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "7",
                    field: "Balance to be filled up",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process started but advertisement yet to be published",
            field: "Process started but advertisement yet to be published",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process started but advertisement yet to be published",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification/Adv Issued",
            field: "Notification/Adv Issued",
            headerClass: "headercenter",
            width: 300,
            children: [
              {
                headerName: "10",
                field: "Notification/Adv Issued",
                width: 300,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Exam Conducted",
            field: "Exam Conducted",
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Exam Conducted",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Interview Conducted",
            field: "Interview Conducted",
            headerClass: "headercenter",
            children: [
                {
                    headerName: "12",
                    field: "Interview Conducted",
                    headerClass: "headercenter",
                }
            ]
          },
          {
            headerName: "Selection Process Completed",
            field: "Selection Process Completed",
            width: 350,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Selection Process Completed",
                width: 350,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Result Declared",
            field: "Result Declared",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Result Declared",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Appointment Letter issued",
            field: "Appointment Letter issued",
            headerClass: "headercenter",
            width: 280,
            children: [
              {
                headerName: "15",
                field: "Appointment Letter issued",
                width: 280,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error("Database error:", err.message);
    res.status(500).json({ error: "Failed to retrieve data." });
  }
}

async function hrFifthReportOtherOrg(req, res) {
  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);
  
  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS 'Class / Group',
      report1_5.vacant_on AS 'Vacant as on 01/04/2024',
      report1_5.vacancy_risen AS 'Vacancy risen during the year',
      report1_5.anticipated_vacancies AS 'Anticipated vacancies in Current FY',
      report1_5.filled_during_fy AS 'Filled during FY',
      report1_5.filled_by_other_moa AS 'Filled by Other method Appointment',
      report1_5.balance_fill_up AS 'Balance to be filled up',
      report1_5.process_not_init AS 'Process not initiated',
      report1_5.process_not_vc AS 'Process initiated vc not received',
      report1_5.vigilance_clearance AS 'Vigilance clearance received',
      report1_5.dpc_conducted AS 'DPC conducted',
      report1_5.approved_by_comp_auth AS 'Approval by competent authority',
      report1_5.promotion_order_issued AS 'Promotion order issued'
      
    FROM 
      [dbo].[tbl_hr_report_input_1_5] report1_5
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_5.organisation_id
    LEFT JOIN 
      mmt_class cls ON cls.class_id = report1_5.class_id
    WHERE
        report1_5.financial_year = @financialYear AND
        report1_5.month = @lastMonth 
  `}else{
    query1 =  `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS 'Class / Group',
      report1_5.vacant_on AS 'Vacant as on 01/04/2024',
      report1_5.vacancy_risen AS 'Vacancy risen during the year',
      report1_5.anticipated_vacancies AS 'Anticipated vacancies in Current FY',
      report1_5.filled_during_fy AS 'Filled during FY',
      report1_5.filled_by_other_moa AS 'Filled by Other method Appointment',
      report1_5.balance_fill_up AS 'Balance to be filled up',
      report1_5.process_not_init AS 'Process not initiated',
      report1_5.process_not_vc AS 'Process initiated vc not received',
      report1_5.vigilance_clearance AS 'Vigilance clearance received',
      report1_5.dpc_conducted AS 'DPC conducted',
      report1_5.approved_by_comp_auth AS 'Approval by competent authority',
      report1_5.promotion_order_issued AS 'Promotion order issued'
      
    FROM 
      [dbo].[tbl_hr_report_input_1_5] report1_5
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_5.organisation_id
    LEFT JOIN 
      mmt_class cls ON cls.class_id = report1_5.class_id
    WHERE 
        report1_5.organisation_id = @organisationID AND 
        report1_5.financial_year = @financialYear AND
        report1_5.month = @lastMonth 
    `
  };

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        width: 300,
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 300,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Organisation Category",
        field: "Organisation Category",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Promotion",
            headerClass: "headercenter",
            children: [
              {
                headerName: 'Vacant as on 01/04/2024',
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 250,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 250,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Anticipated vacancies in Current FY",
                field: "Anticipated vacancies in Current FY",
                width: 220,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Anticipated vacancies in Current FY",
                    width: 220,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Filled during FY",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled by Other method Appointment",
                field: "Filled by Other method Appointment",
                headerClass: "headercenter",
                width: 210,
                children: [
                  {
                    headerName: "6",
                    field: "Filled by Other method Appointment",
                    width: 210,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "7",
                    field: "Balance to be filled up",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated vc not received",
            field: "Process initiated vc not received",
            width: 260,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Process initiated vc not received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Vigilance clearance received",
            field: "Vigilance clearance received",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Vigilance clearance received",
                width: 220,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "DPC conducted",
            field: "DPC conducted",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "DPC conducted",
                width: 210,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval by competent authority",
            field: "Approval by competent authority",
            headerClass: "headercenter",
            width: 240,
            children: [
              {
                headerName: "12",
                field: "Approval by competent authority",
                width: 240,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Promotion order issued",
            field: "Promotion order issued",
            headerClass: "headercenter",
            width: 230,
            children: [
              {
                headerName: "13",
                field: "Promotion order issued",
                width: 230,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSixthReportOtherOrg(req, res) {

  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

   const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `
     SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_6.vacant_on AS [Vacant as on 01/04/2024],
      report1_6.vacancy_risen AS [Vacancy risen during the year],
      report1_6.filled_during_fy_deput AS [Filled during FY],
      report1_6.balance_filled_up AS [Balance to be filled up],
      report1_6.vacancies_pro_not_init AS [Process not initiated],
      report1_6.vacancies_pro_init_notificatioon_issued AS [Process initiated but notification yet to be issued],
      report1_6.vacancies_adv_issued AS [Notification Adv Issued],
      report1_6.vacancies__app_received AS [Application Received],
      report1_6.vacancies_review_committee AS [Review of application by Committee],
      report1_6.vacancies_approval_received AS [Approval Received],
      report1_6.vacancies_in_order_issued AS [Order issued]
    FROM 
      [dbo].[tbl_hr_report_input_1_6] report1_6
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_6.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_6.class_id = cls.class_id
    WHERE
        report1_6.financial_year = @financialYear AND
        report1_6.month = @lastMonth 
  `}else{
    query1 = `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_6.vacant_on AS [Vacant as on 01/04/2024],
      report1_6.vacancy_risen AS [Vacancy risen during the year],
      report1_6.filled_during_fy_deput AS [Filled during FY],
      report1_6.balance_filled_up AS [Balance to be filled up],
      report1_6.vacancies_pro_not_init AS [Process not initiated],
      report1_6.vacancies_pro_init_notificatioon_issued AS [Process initiated but notification yet to be issued],
      report1_6.vacancies_adv_issued AS [Notification Adv Issued],
      report1_6.vacancies__app_received AS [Application Received],
      report1_6.vacancies_review_committee AS [Review of application by Committee],
      report1_6.vacancies_approval_received AS [Approval Received],
      report1_6.vacancies_in_order_issued AS [Order issued]
    FROM 
      [dbo].[tbl_hr_report_input_1_6] report1_6
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_6.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_6.class_id = cls.class_id
    WHERE 
        report1_6.organisation_id = @organisationID AND
        report1_6.financial_year = @financialYear AND
        report1_6.month = @lastMonth 
    `
  };

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        width: 20,
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Deputation",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on 01/04/2024`,
                field: "Vacant as on 01/04/2024",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    width: 260,
                    field: "Vacant as on 01/04/2024",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    width: 290,
                    field: "Vacancy risen during the year",
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 240,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 290,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    width: 290,
                    field: "Balance to be filled up",
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                width: 290,
                field: "Process not initiated",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                width: 330,
                field: "Process initiated but notification yet to be issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                width: 290,
                field: "Notification Adv Issued",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                width: 290,
                field: "Application Received",
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Review of application by Committee",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Approval Received",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Order issued",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrSeventhReportOtherOrg(req, res) {

  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `
   SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_7.vacant_as_on AS [Vacant as on 01/04/2024],
      report1_7.vacancy_risen_fy AS [Vacancy risen during the year],
      report1_7.filled_during_fy AS [Filled during FY],
      report1_7.balance_to_filled AS [Balance to be filled up],
      report1_7.process_not_initiated AS [Process not initiated],
      report1_7.process_initiated_not_issues AS [Process initiated but notification yet to be issued],
      report1_7.notify_adv AS [Notification Adv Issued],
      report1_7.application_received AS [Application Received],
      report1_7.review_application AS [Review of application by Committee],
      report1_7.approval_received AS [Approval Received],
      report1_7.order_issues AS [Order issued]
    FROM 
      [dbo].[tbl_hr_report_input_1_7] report1_7
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_7.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_7.class_id = cls.class_id
    WHERE
        report1_7.financial_year = @financialYear AND
        report1_7.month = @lastMonth 
  `}else{
    query1 = `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_7.vacant_as_on AS [Vacant as on 01/04/2024],
      report1_7.vacancy_risen_fy AS [Vacancy risen during the year],
      report1_7.filled_during_fy AS [Filled during FY],
      report1_7.balance_to_filled AS [Balance to be filled up],
      report1_7.process_not_initiated AS [Process not initiated],
      report1_7.process_initiated_not_issues AS [Process initiated but notification yet to be issued],
      report1_7.notify_adv AS [Notification Adv Issued],
      report1_7.application_received AS [Application Received],
      report1_7.review_application AS [Review of application by Committee],
      report1_7.approval_received AS [Approval Received],
      report1_7.order_issues AS [Order issued]
    FROM 
      [dbo].[tbl_hr_report_input_1_7] report1_7
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_7.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_7.class_id = cls.class_id
    WHERE 
        report1_7.organisation_id = @organisationID AND
        report1_7.financial_year = @financialYear AND
        report1_7.month = @lastMonth 
    `
  };

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Vacancies",
        field: "No. of Vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "To be filled through Composite Method",
            headerClass: "headercenter",
            children: [
              {
                headerName: `Vacant as on 01/04/2024`,
                field: "Vacant as on 01/04/2024",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "3",
                    field: "Vacant as on 01/04/2024",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Vacancy risen during the year",
                field: "Vacancy risen during the year",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "4",
                    field: "Vacancy risen during the year",
                    width: 290,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Filled during FY",
                field: "Filled during FY",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "5",
                    field: "Filled during FY",
                    width: 240,
                    headerClass: "headercenter",
                  },
                ],
              },
              {
                headerName: "Balance to be filled up",
                field: "Balance to be filled up",
                width: 210,
                headerClass: "headercenter",
                children: [
                  {
                    headerName: "6",
                    field: "Balance to be filled up",
                    width: 280,
                    headerClass: "headercenter",
                  },
                ],
              },
            ],
          },
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Process not initiated",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but notification yet to be issued",
            field: "Process initiated but notification yet to be issued",
            width: 270,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process initiated but notification yet to be issued",
                width: 320,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Notification Adv Issued",
            field: "Notification Adv Issued",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Notification Adv Issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Application Received",
            field: "Application Received",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Application Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Review of application by Committee",
            field: "Review of application by Committee",
            width: 250,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Review of application by Committee",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received",
            field: "Approval Received",
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Approval Received",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Order issued",
            field: "Order issued",
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Order issued",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function hrEighthReportOtherOrg(req, res) {

  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;

    // Calculate Last Month
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = Number(lastMonthDate.getMonth() + 1);

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", sql.VarChar, financialYear);
  request.input("lastMonth", sql.Int, lastMonth);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_8.vacant_as_on AS [At the Beginning of the FY],
      report1_8.vacancy_risen_fy AS [Abolished during the year],
      report1_8.filled_during_fy AS [Revived During the FY],
      report1_8.balance_to_filled AS [Balance to be Revived],
      report1_8.process_not_initiated AS [Process not initiated],
      report1_8.process_initiated_not_issues AS [Process initiated but decision not taken],
      report1_8.notify_adv AS [Decision Taken for Revival at Organisation Level By Competent Authority],
      report1_8.application_received AS [Rejected for Revival at Organisation Level By Competent Authority],
      report1_8.review_application AS [Proposal Submitted to Ministry],
      report1_8.approval_received AS [Proposal Sent to DoE],
      report1_8.order_issues AS [Approval Received from DoE],
      report1_8.proposal_rejected AS [Proposal Rejected by DoE]
    FROM 
      [dbo].[tbl_hr_report_input_1_8] report1_8
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_8.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_8.class_id = cls.class_id
    WHERE
        report1_8.financial_year = @financialYear AND
        report1_8.month = @lastMonth 
  `}else{
    query1 =  `
    SELECT 
      mmt.organisation_name AS 'Organisation',
      mmt.organisation_id AS 'organisationId',
      cls.class AS [Class / Group],
      report1_8.vacant_as_on AS [At the Beginning of the FY],
      report1_8.vacancy_risen_fy AS [Abolished during the year],
      report1_8.filled_during_fy AS [Revived During the FY],
      report1_8.balance_to_filled AS [Balance to be Revived],
      report1_8.process_not_initiated AS [Process not initiated],
      report1_8.process_initiated_not_issues AS [Process initiated but decision not taken],
      report1_8.notify_adv AS [Decision Taken for Revival at Organisation Level By Competent Authority],
      report1_8.application_received AS [Rejected for Revival at Organisation Level By Competent Authority],
      report1_8.review_application AS [Proposal Submitted to Ministry],
      report1_8.approval_received AS [Proposal Sent to DoE],
      report1_8.order_issues AS [Approval Received from DoE],
      report1_8.proposal_rejected AS [Proposal Rejected by DoE]
    FROM 
      [dbo].[tbl_hr_report_input_1_8] report1_8
    INNER JOIN 
      mmt_organisation mmt ON mmt.organisation_id = report1_8.organisation_id
    LEFT JOIN
      mmt_class cls ON report1_8.class_id = cls.class_id
    WHERE 
        report1_8.organisation_id = @organisationID AND
        report1_8.financial_year = @financialYear AND
        report1_8.month = @lastMonth 
    `
  };

  try {
    const result = await request.query(query1);
    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        cellStyle: { textAlign: "center" },
        headerClass: "headercenter",
        children: [
          {
            headerName: "1",
            field: "Organisation",
            width: 290,
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "OrganisationId",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Class / Group",
        field: "Class / Group",
        headerClass: "headercenter",
        children: [
          {
            headerName: "2",
            field: "Class / Group",
            headerClass: "headercenter",
          },
        ],
      },
      {
        headerName: "classId",
        field: "classId",
        headerClass: "headerGroup",
      },
      {
        headerName: "No. of Posts to be revived",
        field: "No. of Posts to be revived",
        headerClass: "headercenter",
        children: [
          {
            headerName: "At the Beginning of the FY",
            field: "At the Beginning of the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "3",
                field: "At the Beginning of the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Abolished during the year",
            field: "Abolished during the year",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "4",
                field: "Abolished during the year",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Revived During the FY",
            field: "Revived During the FY",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "5",
                field: "Revived During the FY",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Balance to be Revived",
            field: "Balance to be Revived",
            width: 210,
            headerClass: "headercenter",
            children: [
              {
                headerName: "6",
                field: "Balance to be Revived",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
      {
        headerName: "No of Posts",
        field: "No of Posts",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Process not initiated",
            field: "Process not initiated",
            headerClass: "headercenter",
            children: [
              {
                headerName: "7",
                field: "Process not initiated",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Process initiated but decision not taken",
            field: "Process initiated but decision not taken",
            width: 310,
            headerClass: "headercenter",
            children: [
              {
                headerName: "8",
                field: "Process initiated but decision not taken",
                width: 290,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Decision Taken for Revival at Organisation Level By Competent Authority",
            field: "Decision Taken for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "9",
                field: "Decision Taken for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Rejected for Revival at Organisation Level By Competent Authority",
            field: "Rejected for Revival at Organisation Level By Competent Authority",
            width: 340,
            headerClass: "headercenter",
            children: [
              {
                headerName: "10",
                field: "Rejected for Revival at Organisation Level By Competent Authority",
                width: 340,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Submitted to Ministry",
            field: "Proposal Submitted to Ministry",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "11",
                field: "Proposal Submitted to Ministry",
                width: 270,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Sent to DoE",
            field: "Proposal Sent to DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "12",
                field: "Proposal Sent to DoE",
                width: 250,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Approval Received from DoE",
            field: "Approval Received from DoE",
            width: 220,
            headerClass: "headercenter",
            children: [
              {
                headerName: "13",
                field: "Approval Received from DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
          {
            headerName: "Proposal Rejected by DoE",
            field: "Proposal Rejected by DoE",
            headerClass: "headercenter",
            children: [
              {
                headerName: "14",
                field: "Proposal Rejected by DoE",
                width: 260,
                headerClass: "headercenter",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function getHrreportInputformList(req, res) {

        const conn = await pool;
        const request = conn.request();

        const userID = req.params.userID;
        request.input("userID",userID );
        
      try {
        const userResult = await conn.query(` SELECT role_id,organisation_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id,organisation_id  } = userResult.recordset[0];
        
        let result;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            result = await conn.query(`
        SELECT DISTINCT 
            org.organisation_id,
            org.organisation_name,
            combined.financial_year,
            combined.month,
            t2.latest_updated_date AS updated_date
        FROM (

            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_1
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_2
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_3
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_4
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_5
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_6
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_7
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_8
        ) AS combined
        INNER JOIN sagarmanthan_revamp.dbo.mmt_organisation org
            ON combined.organisation_id = org.organisation_id
             LEFT JOIN (
                    SELECT organisation_id, financial_year, month, MAX(updated_date) AS latest_updated_date
                    FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_2
                    GROUP BY organisation_id, financial_year, month
                ) t2
                    ON combined.organisation_id = t2.organisation_id
                    AND combined.financial_year = t2.financial_year
                    AND combined.month = t2.month
        ORDER BY combined.financial_year DESC, combined.month DESC;
        `);
        }else{
          request.input("organisation_id", organisation_id);
          result = await request.query(`
           SELECT DISTINCT 
            org.organisation_id,
            org.organisation_name,
            combined.financial_year,
            combined.month,
            t2.latest_updated_date AS updated_date
        FROM (

            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_1
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_2
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_3
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_4
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_5
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_6
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_7
            UNION
            SELECT organisation_id, financial_year, month FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_8
        ) AS combined
        INNER JOIN sagarmanthan_revamp.dbo.mmt_organisation org
            ON combined.organisation_id = org.organisation_id
            LEFT JOIN (
                    SELECT organisation_id, financial_year, month, MAX(updated_date) AS latest_updated_date
                    FROM sagarmanthan_revamp.dbo.tbl_hr_report_input_1_2
                    GROUP BY organisation_id, financial_year, month
                ) t2
                   ON combined.organisation_id = t2.organisation_id
                    AND combined.financial_year = t2.financial_year
                    AND combined.month = t2.month
        WHERE org.organisation_id = @organisation_id
        ORDER BY combined.financial_year DESC, combined.month DESC
        `);
        }
        res.json(result.recordset);

    } catch (error) {
      console.log("error",error)
        res.status(500).send("Internal Server Error");
    }
}

async function getUpdatehrReport1_3data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_3]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); // this will return all classes for the given FY and month
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getUpdatehrReport1_4data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_4]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); // this will return all classes for the given FY and month
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getUpdatehrReport1_8data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_8]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); 
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getUpdatehrReport1_6data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_6]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); // this will return all classes for the given FY and month
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getUpdatehrReport1_7data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_7]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); // this will return all classes for the given FY and month
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getUpdatehrReport1_5data(req, res) {
    const { financialYear, month,organisationID } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("month", month);
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`
        SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_5]
        WHERE financial_year = @financialYear AND month = @month AND organisation_id = @organisationID
        ORDER BY class_id
    `);
        res.json(result.recordset); // this will return all classes for the given FY and month
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getUpdatehrReportdata(req, res) {
    const { organisationID,financialYear, month } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("month", month);

    try {
        // Query for tbl_hr_report_input_1_2
        const result1 = await request.query(`
            SELECT TOP 1 *
            FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_2]
            WHERE organisation_id = @organisationID AND financial_year = @financialYear 
              AND month = @month
            ORDER BY Created_Date DESC
        `);

        // Query for tbl_hr_report_input_1_1
        const result2 = await request.query(`
            SELECT TOP 1 *
            FROM [sagarmanthan_revamp].[dbo].[tbl_hr_report_input_1_1]
            WHERE organisation_id = @organisationID AND financial_year = @financialYear 
            ORDER BY Created_Date DESC
        `);

        // Combine results in an object
        res.json({
            hr_report_input_1_2: result1.recordset[0] || null,
            hr_report_input_1_1: result2.recordset[0] || null
        });
    } catch (err) {
        // console.log("Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function hrFirstReportOtherOrg(req, res) {
  const roleID = req.params.roleID;
  const organisationID = req.params.organisationID;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 

   // Calculate Financial Year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // FY starts in April
  const fyEndYear = fyStartYear + 1;
  const financialYear = `${fyStartYear}-${fyEndYear}`;
  const month = 3;   

  const conn = await pool;
  const request = conn.request();
  
  request.input("organisationID", sql.Int, organisationID);
  request.input("roleID", sql.Int, roleID);
  request.input("financialYear", financialYear);
  request.input("month", sql.Int, month);

  let query1;
  if (roleID >= 1 && roleID <= 5) {
  query1 = `
    SELECT 
        mmt.organisation_name AS 'Organisation',
        mmt.organisation_id AS 'organisationId',
        sanctioned_strength AS [Sanctioned Strength],
        in_position AS [In Position],
        total_vacancies AS [Total Vacancies],
        anticipated_vacancies_curr_fy AS [Anticipated vacancies in Current FY],
        less_than_five_years AS [Less than 5 years (Live)],
        more_than_five_years AS [More than 5 years (Abolished)]
      FROM 
        [dbo].[tbl_hr_report_input_1_1]
      INNER JOIN 
        mmt_organisation mmt ON mmt.organisation_id = tbl_hr_report_input_1_1.organisation_id
      WHERE
        tbl_hr_report_input_1_1.financial_year = @financialYear AND
        tbl_hr_report_input_1_1.month = @month`;
      }else{
      query1 = `
      SELECT 
        mmt.organisation_name AS 'Organisation',
        mmt.organisation_id AS 'organisationId',
        sanctioned_strength AS [Sanctioned Strength],
        in_position AS [In Position],
        total_vacancies AS [Total Vacancies],
        anticipated_vacancies_curr_fy AS [Anticipated vacancies in Current FY],
        less_than_five_years AS [Less than 5 years (Live)],
        more_than_five_years AS [More than 5 years (Abolished)]
      FROM 
        [dbo].[tbl_hr_report_input_1_1]
      INNER JOIN 
        mmt_organisation mmt ON mmt.organisation_id = tbl_hr_report_input_1_1.organisation_id
      WHERE 
        tbl_hr_report_input_1_1.organisation_id = @organisationID AND 
        tbl_hr_report_input_1_1.financial_year = @financialYear AND
        tbl_hr_report_input_1_1.month = @month
        `;
  }
  try {
    const result = await request.query(query1);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }

    let columnDefs = [
      {
        headerName: "Organisation",
        field: "Organisation",
        headerClass: "headerGroup",
        cellStyle: { textAlign: "center" },
        rowSpan: function (params) {
          return params.data.rowSpan || 2; // Default to 1 if rowSpan is not provided
        },
        cellRenderer: function (params) {
          return params.value ? params.value : ""; // Render empty string for null or undefined values
        },
        children: [
          {
            headerName: "1",
            field: "Organisation",
            headerClass: "headerGroup",
          },
        ],
      },
      {
        headerName: "Organisation Id",
        field: "organisationId",
        headerClass: "headerGroup",
      },
      {
        headerName: "Sanctioned Strength",
        field: "Sanctioned Strength",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "2",
            field: "Sanctioned Strength",
          },
        ],
      },
      {
        headerName: "In Position",
        field: "In Position",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "3",
            field: "In Position",
          },
        ],
      },
      {
        headerName: "Total Vacancies",
        field: "Total Vacancies",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "4",
            field: "Total Vacancies",
          },
        ],
      },
      {
        headerName: `Anticipated vacancies in Current FY`,
        field: "Anticipated vacancies in Current FY",
        headerClass: "headerGroup",
        children: [
          {
            headerName: "6",
            field: "Anticipated vacancies in Current FY",
          },
        ],
      },
      {
        headerName: "No of vacancies",
        headerClass: "headercenter",
        children: [
          {
            headerName: "Less than 5 years (Live)",
            field: "Less than 5 years (Live)",
            children: [
              {
                headerName: "7",
                field: "Less than 5 years (Live)",
              },
            ],
          },
          {
            headerName: "More than 5 years (Abolished)",
            field: "More than 5 years (Abolished)",
            children: [
              {
                headerName: "8",
                field: "More than 5 years (Abolished)",
              },
            ],
          },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err });
  }
}

async function getUpdatehrReport1_1data(req, res) {
    const { organisationID, financialYear } = req.params; 
    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", sql.VarChar, financialYear);
    request.input("organisationID", sql.Int, organisationID);

    try {
        const query = `
           SELECT TOP 1
            t1.id,
            t1.financial_year,              
            --t1.month,
            t1.sanctioned_strength,
            t1.in_position,
            t1.total_vacancies,
            t1.anticipated_vacancies_curr_fy,
            t1.less_than_five_years,
            t1.more_than_five_years
        FROM tbl_hr_report_input_1_1 t1
        WHERE t1.financial_year = @financialYear
        AND t1.organisation_id = @organisationID
        ORDER BY t1.id DESC;
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        // console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function updateReportInput1_1(req, res) {
    const {
        year, month, sanctionedStrength, inPosition, totalVacanciesR1,
        anticipatedVacanciesFY, lessThan5Years, moreThan5Years,
        organisationID, userID
    } = req.body;
    try {
        const conn = await pool;
        const request = conn.request();

        // Bind inputs
        request.input("year", year);
        request.input("month", month);
        request.input("sanctionedStrength", sanctionedStrength);
        request.input("inPosition", inPosition);
        request.input("totalVacanciesR1", totalVacanciesR1);
        request.input("anticipatedVacanciesFY", anticipatedVacanciesFY);
        request.input("lessThan5Years", lessThan5Years);
        request.input("moreThan5Years", moreThan5Years);
        request.input("organisationID", organisationID);
        request.input("userID", userID);

        // Check if row already exists
        const checkResult = await request.query(`
            SELECT TOP 1 id
            FROM tbl_hr_report_input_1_1
            WHERE organisation_id = @organisationID
              AND financial_year = @year
              AND month = @month
        `);

        if (checkResult.recordset.length > 0) {
            // Update existing row
            await request.query(`
                UPDATE tbl_hr_report_input_1_1
                SET
                    sanctioned_strength = @sanctionedStrength,
                    in_position = @inPosition,
                    total_vacancies = @totalVacanciesR1,
                    anticipated_vacancies_curr_fy = @anticipatedVacanciesFY,
                    less_than_five_years = @lessThan5Years,
                    more_than_five_years = @moreThan5Years,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE organisation_id = @organisationID
                  AND financial_year = @year
                  AND month = @month
            `);

            return res.status(201).json({ success: true, message: "Data updated successfully" });
        } else {
            return res.status(404).json({ success: false, message: "No record found to update" });
        }

    } catch (error) {
        console.error("Error in submitReportInput1_1:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export default{createHrReportInput1_5,createHrReportInput1_6,createHrvacancyData,createHrreport1_3,createHrreportinput1_4,createHrreportinput1_8,createHrreportinput1_7,
    submitReportInput1_1,checkFinancialYearExists,hrSecondReportOtherOrg,hrSixthReportOtherOrg,hrSeventhReportOtherOrg,hrEighthReportOtherOrg,hrFifthReportOtherOrg,hrFourthReportOtherOrg,
    hrAbstarctReportOtherOrg,getHrreportInputformList,getUpdatehrReport1_3data,getUpdatehrReport1_4data,getUpdatehrReport1_5data,getUpdatehrReport1_6data,getUpdatehrReport1_7data,getUpdatehrReport1_8data,
  getUpdatehrReportdata,hrFirstReportOtherOrg,updateReportInput1_1,getUpdatehrReport1_1data
}