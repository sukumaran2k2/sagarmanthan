import { pool } from "../../db.js";
import multer from 'multer';
import sql from 'mssql';
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

async function getOrganisationCode(req, res) {
    const organisationId = req.params.organisationId;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationId", organisationId);

    try {
        const result = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @organisationId`);
        res.json(result.recordset);
    } catch (err) {
        ////console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

};

async function getDepartmentId(req, res) {
    const postId = req.params.postId;

    const conn = await pool;
    const request = conn.request();

    request.input("postId", postId);

    try {
        const result = await request.query(`SELECT department_id FROM tbl_hr_post WHERE post_id = @postId`);
        res.json(result.recordset);
    } catch (err) {
        ////console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

}

async function checkPostCode(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT COUNT(*) as number FROM tbl_hr_post_strength WHERE post_code = @Id`);
        res.json(result.recordset);
    } catch (err) {
        ////console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

}

async function addRevivePost(req, res) {
    const postCode = req.body.postCode;
    let dateOfApproval = req.body.dateOfApproval;
    // const reviveProcessInitiated = req.body.reviveProcessInitiated;

    // const remarks = req.body.remarks;
    const reviveStageID = req.body.reviveStageID;
    const reviveSubmissionDate = req.body.reviveSubmissionDate;

    const rejectRemarksUser = req.body.rejectRemarksUser && req.body.rejectRemarksUser.trim() !== '' ? req.body.rejectRemarksUser : null;
    const processInitiatedDate = req.body.processInitiatedDate && req.body.processInitiatedDate.trim() !== '' ? req.body.processInitiatedDate : null;
    const dateOfDcisionTakenApproved = req.body.dateOfDcisionTakenApproved && req.body.dateOfDcisionTakenApproved.trim() !== '' ? req.body.dateOfDcisionTakenApproved : null;
    const dateOfDcisionTakenRejected = req.body.dateOfDcisionTakenRejected && req.body.dateOfDcisionTakenRejected.trim() !== '' ? req.body.dateOfDcisionTakenRejected : null;


    let approvalOrRejectDate;
    let reviveDecisionByCA = 0;;

    if (!dateOfDcisionTakenApproved == '' || !dateOfDcisionTakenApproved == null) {
        approvalOrRejectDate = dateOfDcisionTakenApproved;
        // dateOfDcisionTakenRejected = null;
        // rejectRemarksUser = null;
       // reviveDecisionByCA = 1;
    } else if (!dateOfDcisionTakenRejected == '' || !dateOfDcisionTakenRejected == null) {
        approvalOrRejectDate = dateOfDcisionTakenRejected;
      //  dateOfDcisionTakenApproved = null;
      //  reviveDecisionByCA = 1;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("postCode", postCode);
    request.input("dateOfApproval", dateOfApproval);
    // request.input("reviveProcessInitiated", reviveProcessInitiated);
    // request.input("reviveDecisionByCA", reviveDecisionByCA);
    // request.input("remarks", remarks);
    request.input("reviveStageID", reviveStageID);
    request.input("reviveSubmissionDate", reviveSubmissionDate);
    request.input("rejectRemarksUser", rejectRemarksUser);
    request.input("processInitiatedDate", processInitiatedDate);
    // request.input("dateOfDcisionTakenApproved", dateOfDcisionTakenApproved);
    // request.input("dateOfDcisionTakenRejected", dateOfDcisionTakenRejected);

    request.input("approvalOrRejectDate", approvalOrRejectDate);
   // request.input("reviveDecisionByCA", reviveDecisionByCA);


    if (!dateOfApproval || dateOfApproval.trim() === "") {
        dateOfApproval = null;
    }

    try {
        const result = await request.query(`UPDATE tbl_hr_post_strength
        SET revival_process_initiated = @processInitiatedDate,
            revival_remarks = @rejectRemarksUser,
            revival_date = @approvalOrRejectDate,
            revival_stage_id = @reviveStageID,
            revival_submission_date = @reviveSubmissionDate,
            updated_date = GETDATE()
         WHERE post_code = @postCode;`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }

}


async function addPostStrengthDetail(req, res) {
    const userID = req.body.userID;
    const postCode = req.body.postCode;
    const postId = req.body.postId;
    const stageId = req.body.stage_id;
    const vacantFilled = req.body.vacantFilled;
    const exceptionAbolish = req.body.exceptionAbolish;
    let vacancyDate = req.body.vacancyDate;
    const toBeFilledThrough = req.body.toBeFilledThrough;
    let employeeJoiningDate = req.body.employeeJoining;
    const nameOfEmployee = req.body.nameOfEmployee;
    // const processNotInitiated = req.body.processNotInitiated;
    // let processNotInitiatedDate = req.body.processNotInitiatedDate;
    const processInitiatedNoNotification = req.body.processInitiatedNoNotification;
    // let processInitiatedNoNotificationDate = req.body.processInitiatedNoNotificationDate;
    // const processNotStarted = req.body.processNotStarted;
    // let processNotStartedDate = req.body.processNotStartedDate;
    const processStartedNoAdvertisement = req.body.processStartedNoAdvertisement;
    // let processStartedNoAdvertisementDate = req.body.processStartedNoAdvertisementDate;
    const notificationIssued = req.body.notificationIssued;
    let notificationIssuedDate = req.body.notificationIssuedDate;
    const examCompleted = req.body.examCompleted;
    let examCompletedDate = req.body.examCompletedDate;
    const resultDeclared = req.body.resultDeclared;
    let resultDeclaredDate = req.body.resultDeclaredDate;
    const appointmentLetterIssued = req.body.appointmentLetterIssued;
    let appointmentLetterIssuedDate = req.body.appointmentLetterIssuedDate;
    const applicationReceived = req.body.applicationReceived;
    let applicationReceivedDate = req.body.applicationReceivedDate;
    const reviewByCommittee = req.body.reviewByCommittee;
    let reviewByCommitteeDate = req.body.reviewByCommitteeDate;
    const approvalReceived = req.body.approvalReceived;
    let approvalReceivedDate = req.body.approvalReceivedDate;
    const orderIssued = req.body.orderIssued;
    let orderIssuedDate = req.body.orderIssuedDate;
    const processInitiatedVCNotReceived = req.body.processInitiatedVCNotReceived;
    // let processInitiatedVCNotReceivedDate = req.body.processInitiatedVCNotReceivedDate;
    const vigilanceClearanceReceived = req.body.vigilanceClearanceReceived;
    let vigilanceClearanceReceivedDate = req.body.vigilanceClearanceReceivedDate;
    const dpcConducted = req.body.dpcConducted;
    let dpcConductedDate = req.body.dpcConductedDate;
    const approvalCompetentAuthority = req.body.approvalCompetentAuthority;
    let approvalCompetentAuthorityDate = req.body.approvalCompetentAuthorityDate;
    const promotionOrderIssued = req.body.promotionOrderIssued;
    let promotionOrderIssuedDate = req.body.promotionOrderIssuedDate;
    const employeesJoined = req.body.employeesJoined;
    let employeesJoinedDate = req.body.employeesJoinedDate;
    let recruitmentAgencyName = req.body.recruitmentAgencyName;
    let organisationName = req.body.organisationName;
    let organisationId = req.body.organisationId;
    const transferredFrom = req.body.transferredFrom;
    let transferredOn = req.body.transferredOn;

    if (vacancyDate == "") {
        vacancyDate = null;
    }
    if (transferredOn == "") {
        transferredOn = null;
    }

    if (employeeJoiningDate == "") {
        employeeJoiningDate = null;
    }

    if (notificationIssuedDate == "") {
        notificationIssuedDate = null;
    }

    if (examCompletedDate == "") {
        examCompletedDate = null;
    }

    if (resultDeclaredDate == "") {
        resultDeclaredDate = null;
    }

    if (appointmentLetterIssuedDate == "") {
        appointmentLetterIssuedDate = null;
    }

    if (applicationReceivedDate == "") {
        applicationReceivedDate = null;
    }

    if (reviewByCommitteeDate == "") {
        reviewByCommitteeDate = null;
    }

    if (approvalReceivedDate == "") {
        approvalReceivedDate = null;
    }

    if (orderIssuedDate == "") {
        orderIssuedDate = null;
    }

    if (vigilanceClearanceReceivedDate == "") {
        vigilanceClearanceReceivedDate = null;
    }

    if (dpcConductedDate == "") {
        dpcConductedDate = null;
    }

    if (approvalCompetentAuthorityDate == "") {
        approvalCompetentAuthorityDate = null;
    }

    if (promotionOrderIssuedDate == "") {
        promotionOrderIssuedDate = null;
    }

    if (employeesJoinedDate == "") {
        employeesJoinedDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);
    request.input("postCode", postCode);
    request.input("postId", postId);
    request.input("stageId", stageId);
    request.input("vacantFilled", vacantFilled);
    request.input("exceptionAbolish", exceptionAbolish);
    request.input("employeeJoiningDate", employeeJoiningDate);
    request.input("vacancyDate", vacancyDate);
    request.input("toBeFilledThrough", toBeFilledThrough);
    request.input("nameOfEmployee", nameOfEmployee);
    request.input("processInitiatedNoNotification", processInitiatedNoNotification);
    request.input("processStartedNoAdvertisement", processStartedNoAdvertisement);
    request.input("notificationIssued", notificationIssued);
    request.input("notificationIssuedDate", notificationIssuedDate);
    request.input("examCompleted", examCompleted);
    request.input("examCompletedDate", examCompletedDate);
    request.input("resultDeclared", resultDeclared);
    request.input("resultDeclaredDate", resultDeclaredDate);
    request.input("appointmentLetterIssued", appointmentLetterIssued);
    request.input("appointmentLetterIssuedDate", appointmentLetterIssuedDate);
    request.input("applicationReceived", applicationReceived);
    request.input("applicationReceivedDate", applicationReceivedDate);
    request.input("reviewByCommittee", reviewByCommittee);
    request.input("reviewByCommitteeDate", reviewByCommitteeDate);
    request.input("approvalReceived", approvalReceived);
    request.input("approvalReceivedDate", approvalReceivedDate);
    request.input("orderIssued", orderIssued);
    request.input("orderIssuedDate", orderIssuedDate);
    request.input("processInitiatedVCNotReceived", processInitiatedVCNotReceived);
    request.input("vigilanceClearanceReceived", vigilanceClearanceReceived);
    request.input("vigilanceClearanceReceivedDate", vigilanceClearanceReceivedDate);
    request.input("dpcConducted", dpcConducted);
    request.input("dpcConductedDate", dpcConductedDate);
    request.input("approvalCompetentAuthority", approvalCompetentAuthority);
    request.input("approvalCompetentAuthorityDate", approvalCompetentAuthorityDate);
    request.input("promotionOrderIssued", promotionOrderIssued);
    request.input("promotionOrderIssuedDate", promotionOrderIssuedDate);
    request.input("employeesJoined", employeesJoined);
    request.input("employeesJoinedDate", employeesJoinedDate);
    request.input("recruitmentAgencyName", recruitmentAgencyName);
    request.input("organisationName", organisationName);
    request.input("organisationId", organisationId);
    request.input("transferredFrom", transferredFrom);
    request.input("transferredOn", transferredOn);

    try {
        const checkResult = await request.query(`
            SELECT * FROM tbl_hr_post_strength
            WHERE post_code = @postCode
        `);

        if (checkResult.recordset.length > 0) {
            const updateResult = await request.query(`
                UPDATE tbl_hr_post_strength
                SET
                    vacant_or_filled = @vacantFilled,
                    exception_abolish = @exceptionAbolish,
                    date_of_arise_in_vacancy = @vacancyDate,
                    to_be_filled_through = @toBeFilledThrough,
                    employee_joining_date = @employeeJoiningDate,
                    name_of_employee = @nameOfEmployee,
                    process_initiated_notification_yet_to_be_issued = @processInitiatedNoNotification,
                    process_started_advertisement_yet = @processStartedNoAdvertisement,
                    notification_issued = @notificationIssued,
                    notification_issued_date = @notificationIssuedDate,
                    exam_conducted = @examCompleted,
                    exam_conducted_date = @examCompletedDate,
                    result_declared = @resultDeclared,
                    result_declared_date = @resultDeclaredDate,
                    appointment_letter_issued = @appointmentLetterIssued,
                    appointment_letter_issued_date = @appointmentLetterIssuedDate,
                    application_received = @applicationReceived,
                    application_received_date = @applicationReceivedDate,
                    review_of_application = @reviewByCommittee,
                    review_of_application_date = @reviewByCommitteeDate,
                    approval_received = @approvalReceived,
                    approval_received_date = @approvalReceivedDate,
                    order_issued = @orderIssued,
                    order_issued_date = @orderIssuedDate,
                    process_initiated_vc_not_received = @processInitiatedVCNotReceived,
                    vigilance_clearance_received = @vigilanceClearanceReceived,
                    vigilance_clearance_received_date = @vigilanceClearanceReceivedDate,
                    dpc_conducted = @dpcConducted,
                    dpc_conducted_date = @dpcConductedDate,
                    approval_by_competent_authority = @approvalCompetentAuthority,
                    approval_by_competent_authority_date = @approvalCompetentAuthorityDate,
                    promotion_order_issued = @promotionOrderIssued,
                    promotion_order_issued_date = @promotionOrderIssuedDate,
                    employees_joined = @employeesJoined,
                    employees_joined_date = @employeesJoinedDate,
                    recruitment_agency_name = @recruitmentAgencyName,
                    stage_id = @stageId,
                    updated_by = @userID,
                    updated_date = getDate(),
                    transferred_from =@transferredFrom,
                    transferred_on = @transferredOn,
                    organisation_name = @organisationName,
                    organisation_id = @organisationId
                WHERE post_code = @postCode
            `);
        } else {
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_post_strength (
                    post_code,
                    post_id,
                    vacant_or_filled,
                    exception_abolish,
                    date_of_arise_in_vacancy,
                    to_be_filled_through,
                    employee_joining_date,
                    name_of_employee,
                    process_initiated_notification_yet_to_be_issued,
                    process_started_advertisement_yet,
                    notification_issued,
                    notification_issued_date,
                    exam_conducted,
                    exam_conducted_date,
                    result_declared,
                    result_declared_date,
                    appointment_letter_issued,
                    appointment_letter_issued_date,
                    application_received,
                    application_received_date,
                    review_of_application,
                    review_of_application_date,
                    approval_received,
                    approval_received_date,
                    order_issued,
                    order_issued_date,
                    process_initiated_vc_not_received,
                    vigilance_clearance_received,
                    vigilance_clearance_received_date,
                    dpc_conducted,
                    dpc_conducted_date,
                    approval_by_competent_authority,
                    approval_by_competent_authority_date,
                    promotion_order_issued,
                    promotion_order_issued_date,
                    employees_joined,
                    employees_joined_date,
                    recruitment_agency_name,
                    transferred_from,
                    transferred_on,
                    stage_id,
                    created_by,
                    organisation_name,
                    organisation_id
                )
                VALUES (
                    @postCode,
                    @postId,
                    @vacantFilled,
                    @exceptionAbolish,
                    @vacancyDate,
                    @toBeFilledThrough,
                    @employeeJoiningDate,
                    @nameOfEmployee,
                    @processInitiatedNoNotification,
                    @processStartedNoAdvertisement,
                    @notificationIssued,
                    @notificationIssuedDate,
                    @examCompleted,
                    @examCompletedDate,
                    @resultDeclared,
                    @resultDeclaredDate,
                    @appointmentLetterIssued,
                    @appointmentLetterIssuedDate,
                    @applicationReceived,
                    @applicationReceivedDate,
                    @reviewByCommittee,
                    @reviewByCommitteeDate,
                    @approvalReceived,
                    @approvalReceivedDate,
                    @orderIssued,
                    @orderIssuedDate,
                    @processInitiatedVCNotReceived,
                    @vigilanceClearanceReceived,
                    @vigilanceClearanceReceivedDate,
                    @dpcConducted,
                    @dpcConductedDate,
                    @approvalCompetentAuthority,
                    @approvalCompetentAuthorityDate,
                    @promotionOrderIssued,
                    @promotionOrderIssuedDate,
                    @employeesJoined,
                    @employeesJoinedDate,
                    @recruitmentAgencyName,
                    @transferredFrom,
                    @transferredOn,
                    @stageId,
                    @userID,
                    @organisationName,
                    @organisationId

                )
            `);
        }

        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getPostStrengthData(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT * FROM tbl_hr_post_strength WHERE post_code = @Id`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getPostStrengthAbsoluteData(req, res) {
    const Id = req.params.Id;

    const conn = await pool;
    const request = conn.request();

    request.input("Id", Id);

    try {
        const result = await request.query(`SELECT * FROM tbl_hr_post_strength WHERE post_id = @Id`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getPermanentAbolishedPost(req, res) {
    const conn = await pool;
    const request = conn.request();

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    try {
        const query1 = `
    SELECT
        d.department_name,
        h.post_code,
        h.updated_date,
        p.post_name,
        h.date_of_arise_in_vacancy,
        h.revival_stage_id,
        o.organisation_name
    FROM
        [tbl_hr_post_strength] h
    LEFT JOIN
        mmt_organisation o ON o.organisation_id = h.organisation_id
    LEFT JOIN
        [mmt_hr_post] p ON h.post_id = p.post_id
    LEFT JOIN
        [mmt_hr_department] d ON p.department_id = d.department_id
    WHERE
        (h.vacant_or_filled='vacant' AND h.date_of_arise_in_vacancy < DATEADD(YEAR, -5, GETDATE())) OR h.revival_stage_id = 9;
`;

const [result1] = await Promise.all([
    request.query(query1)
]);

// Send both results in a single JSON object
res.json({
    query1Result: result1.recordset
});


        // const result = await request.query(query);
        // res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getPermanentAbolishedPostOrg(req, res) {
    const organisationId = req.params.organisationID;

    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    const [startYear, endYear] = financialYear.split('-');
    const fiscalYearStart = `${startYear}-04-01`;
    const fiscalYearEnd = `${endYear}-03-31`;
    const previousYrEnd = `${startYear}-03-31`;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationId", organisationId);

    try {
            const query1 = `
        SELECT
            d.department_name,
            h.post_code,
            p.post_name,
            h.date_of_arise_in_vacancy,
            h.revival_stage_id,
            h.updated_date,
            o.organisation_name
        FROM
            [tbl_hr_post_strength] h
        LEFT JOIN
            mmt_organisation o ON o.organisation_id = h.organisation_id
        LEFT JOIN
            [mmt_hr_post] p ON h.post_id = p.post_id
        LEFT JOIN
            [mmt_hr_department] d ON p.department_id = d.department_id
        WHERE h.organisation_id = @organisationId
            AND ((
                (h.vacant_or_filled = 'vacant'
                AND (h.exception_abolish IS NULL OR h.exception_abolish = 0)
                AND h.date_of_arise_in_vacancy < DATEADD(YEAR, -5, GETDATE()))
            ) OR h.revival_stage_id = 9)
        ORDER BY h.revival_stage_id DESC
    `;

    const [result1] = await Promise.all([
        request.query(query1)
    ]);

    res.json({
        query1Result: result1.recordset
    });

    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}


async function postReviveDate(req, res) {
    const postCode = req.body.postCode;
    const revivalDate = req.body.revivalDate;

    const conn = await pool;
    const request = conn.request();


    request.input("postCode", postCode);
    request.input("revivalDate", revivalDate);

    try {
        const result = await request.query(`INSERT  INTO tbl_hr_post_strength(revival_date) INTO VALUES(@revivalDate) WHERE post_code = @postCode`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}





async function getFilledPost(req, res) {
    const postId = req.params.postId;

    const conn = await pool;
    const request = conn.request();

    request.input("postId", postId);

    try {
        const result = await request.query(`SELECT COUNT(*) AS numOfPostFilled
        FROM tbl_hr_post_strength
        WHERE post_id = @postId
          AND vacant_or_filled = 'filled';
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getVacantPost(req, res) {
    const postId = req.params.postId;

    const conn = await pool;
    const request = conn.request();

    request.input("postId", postId);

    try {
        const result = await request.query(`SELECT COUNT(*) AS numOfPostVacant
        FROM tbl_hr_post_strength
        WHERE post_id = @postId
          AND vacant_or_filled = 'vacant';
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function updateRevivePostApprovalDetails(req, res) {

    const proposalSentToDoeDate = req.body.proposalSentToDoeDate && req.body.proposalSentToDoeDate.trim() !== '' ? req.body.proposalSentToDoeDate : null;
    const approvalDateFromDOE = req.body.approvalDateFromDOE && req.body.approvalDateFromDOE.trim() !== '' ? req.body.approvalDateFromDOE : null;
    const rejectionDateFromDOE = req.body.rejectionDateFromDOE && req.body.rejectionDateFromDOE.trim() !== '' ? req.body.rejectionDateFromDOE : null;
    const orderCreatePostDate = req.body.orderForCreationDate && req.body.orderForCreationDate.trim() !== '' ? req.body.orderForCreationDate : null;;
    const remarksFromDOE = req.body.remarksRejectAdmin && req.body.remarksRejectAdmin.trim() !== '' ? req.body.remarksRejectAdmin : null;;
    const reviveStageID = req.body.reviveStageID;
    const postCode = req.body.postCode;
    const propRejectedDate = req.body.propRejectedDate?req.body.propRejectedDate:'';

    const conn = await pool;
    const request = conn.request();
    request.input("proposalSentToDoeDate", proposalSentToDoeDate);
    request.input("approvalDateFromDOE", approvalDateFromDOE);
    request.input("rejectionDateFromDOE", rejectionDateFromDOE);
    request.input("remarksFromDOE", remarksFromDOE);
    request.input("propRejectedDate", propRejectedDate);
    request.input("orderCreatePostDate", orderCreatePostDate);
    request.input("reviveStageID", reviveStageID);
    request.input("postCode", postCode);


    try {
        let updateQuery;

        if (reviveStageID === 9) {
            updateQuery = `UPDATE tbl_hr_post_strength 
            SET 
                revive_proposal_sent_to_doe_date = @proposalSentToDoeDate,
                revive_approval_date_from_doe = @approvalDateFromDOE,
                revive_rejection_date_from_doe = @rejectionDateFromDOE, 
                revive_remarks_from_doe = @remarksFromDOE, 
                revive_proposal_rejected_by_doe_date = @propRejectedDate,
                order_of_revival_issued_date = @orderCreatePostDate,
                revival_stage_id = @reviveStageID, 
                vacant_or_filled = 'vacant', 
                created_date = created_date, 
                [date_of_arise_in_vacancy] = @orderCreatePostDate,
                [notification_adv_issued_date] = NULL,
                [renotification_adv_issued_date] = NULL,
                [exam_conducted_date] = NULL,
                [result_declared_date] = NULL,
                [appointment_letter_issued_date] = NULL,
                [application_received_date] = NULL,
                [review_application_by_comm] = NULL,
                [approval_received_date] = NULL,
                [order_issued_date] = NULL,
                [process_initiated_date] = NULL,
                [vigilance_clr_received_date] = NULL,
                [dpc_conducted_date] = NULL,
                [promotion_order_issued_date] = NULL,
                [employee_joined_date] = NULL,
                [updated_by] = GETDATE(),
                [updated_date] = NULL
            WHERE post_code = @postCode;`
        }
        else {
            updateQuery = `UPDATE tbl_hr_post_strength
             SET
             revive_proposal_sent_to_doe_date = @proposalSentToDoeDate,
            revive_approval_date_from_doe = @approvalDateFromDOE ,
            revive_rejection_date_from_doe = @rejectionDateFromDOE,
            revive_remarks_from_doe = @remarksFromDOE,
            revive_proposal_rejected_by_doe_date = @propRejectedDate,
            order_of_revival_issued_date = @orderCreatePostDate,
            revival_stage_id = @reviveStageID,
            updated_date = GETDATE()
            WHERE post_code = @postCode;`
        }

        const result = await request.query(updateQuery);

        res.sendStatus(201);
    }
    catch (err) {
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function addAnticipatedVancancies(req, res) {
    const financialYr = req.body.financialYr;
    const anticipatedVacancies = req.body.anticipatedVacancies;
    const organisationID = req.body.organisationID;
    const userId = req.body.userId;
    let createdDate = new Date().toISOString().split('T')[0];

    const conn = await pool;
    const request = conn.request();

    request.input("financialYr", financialYr);
    request.input("organisationID", organisationID);
    request.input("anticipatedVacancies", anticipatedVacancies);
    request.input("userId", userId);
    request.input("createdDate", createdDate);


    try {
        const checkResult = await request.query(`
            SELECT * FROM tbl_hr_anticipated
            WHERE fiscl_Yr = @financialYr AND organisation_id = @organisationID
        `);

        if (checkResult.recordset.length > 0) {
            return res.status(200).send("Data already exists. Cannot insert.");
        } else {
            const insertResult = await request.query(`
                INSERT INTO tbl_hr_anticipated (
                    fiscl_yr,
                    anticipated_vacancies_next_fy,
                    organisation_id,
                    created_date,
                    created_by
                )
                VALUES (
                    @financialYr,
                    @anticipatedVacancies,
                    @organisationID,
                    @createdDate,
                    @userId
                )
            `);
            return res.sendStatus(201);
        }
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function updateAnticipatedVacancies(req, res) {
    const financialYr = req.body.financialYr;
    const anticipatedVacancies = req.body.anticipatedVacancies;
    const organisationID = req.body.organisationID;
    const userId = req.body.userId;
    let updatedDate = new Date().toISOString().split('T')[0];

    const conn = await pool;
    const request = conn.request();

    request.input("financialYr", financialYr);
    request.input("anticipatedVacancies", anticipatedVacancies);
    request.input("organisationID", organisationID);
    request.input("userId", userId);
    request.input("updatedDate", updatedDate);

    try {
        const updateResult = await request.query(`
            UPDATE tbl_hr_anticipated
            SET
                anticipated_vacancies_next_fy = @anticipatedVacancies,
                updated_by = @userId,
                updated_date = @updatedDate
            WHERE fiscl_yr = @financialYr AND organisation_id = @organisationID
        `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).send("Data not found. Cannot update.");
        }

        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function deleteAnticipatedVacancy(req, res) {
    const anticipatedId = req.params.anticipatedId;

    const conn = await pool;
    const request = conn.request();

    request.input("anticipatedId", anticipatedId);

    try {
        const deleteResult = await request.query(`
            DELETE FROM tbl_hr_anticipated
            WHERE anticipated_id = @anticipatedId
        `);

        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(404).send("Data not found. Cannot delete.");
        }

        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function deleteHrPostData(req, res) {
    const postId = req.params.postId;
    const postCode = req.params.postCode;

    let successStatus;

    const conn = await pool;
    const request = conn.request();

    request.input("postId", postId);
    request.input("postCode", postCode);

    const basePostCode = postCode.slice(0, -1);
    const postIndex = parseInt(postCode.slice(-1));
    try {
        const result = await request.query(
            `SELECT sanctioned_strength FROM tbl_hr_post WHERE post_id = @postId`
        );

        const rows = result.recordset;

        if (rows.length === 0) {
            throw new Error("Post not found");
        }

        let strength = rows[0].sanctioned_strength;

        if (postIndex === strength) {
            await request.query(
                `DELETE FROM tbl_hr_post_strength WHERE post_id = @postId AND post_code = @postCode AND vacant_or_filled!='filled'`
            );

            if (strength === 1 && postIndex === 1) {
                successStatus = 200;
                await request.query(
                    `DELETE FROM tbl_hr_post WHERE post_id = @postId`
                );
            } else {
                await request.input("newStrength", strength - 1).query(
                    `UPDATE tbl_hr_post SET sanctioned_strength = @newStrength WHERE post_id = @postId`
                );
            }
        } else {
            await request.query(
                `DELETE FROM tbl_hr_post_strength WHERE post_id = @postId AND post_code = @postCode AND vacant_or_filled!='filled'`
            );
            await request.input("newStrength", strength - 1).query(
                `UPDATE tbl_hr_post SET sanctioned_strength = @newStrength WHERE post_id = @postId`
            );

            for (let i = postIndex; i < strength; i++) {
                let oldPostCode = `${basePostCode}${i + 1}`;
                let newPostCode = `${basePostCode}${i}`;

                const updateRequest = conn.request();
                await updateRequest.input("newPostCode", newPostCode)
                    .input("oldPostCode", oldPostCode)
                    .input("postId", postId)
                    .query(
                        `UPDATE tbl_hr_post_strength SET post_code = @newPostCode WHERE post_code = @oldPostCode AND post_id = @postId`
                    );
            }
        }

        let finalStatus = (successStatus) ? successStatus : 201;
        return res.sendStatus(finalStatus);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}




async function getAnticipatedVacancies(req, res) {
    const organisationId = req.params.Id;
    const conn = await pool;
    const request = conn.request();

    //console.log("org id", organisationId);

    request.input("organisationId", organisationId);

    try {
        const result = await request.query(`
    SELECT 
        *
    FROM 
        tbl_hr_anticipated
    WHERE 
        organisation_id = @organisationId
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function deleteHrDepartment(req, res) {
    const deptID = req.params.deptID;
    const orgID = req.params.orgID;

    const conn = await pool;
    const request = conn.request();

    request.input("deptID", deptID);
    request.input("orgID", orgID);

    try {
        const deleteDepPostData = await request.query(`DELETE FROM tbl_hr_post_strength WHERE post_id IN (SELECT post_id FROM tbl_hr_post WHERE department_id= @deptID)`);

        const deleteDepPost = await request.query(`DELETE FROM tbl_hr_post WHERE department_id =@deptID`);

        const deletedep = await request.query(`
            DELETE FROM tbl_hr_department
            WHERE department_id = @deptID
        `);

        if (deletedep.rowsAffected[0] === 0) {
            return res.status(404).send("Department Data not found. Cannot delete.");
        }

        return res.sendStatus(201);
    } catch (err) {
        //console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHRAllData(req, res) {
    const organisationID = req.params.organisationID;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`SELECT o.organisation_name AS ORGANISATION,
            p.post_name AS [POST NAME],
            dp.department_name AS [DEPARTMENT NAME],
            c.class AS [CLASS],
            ps.post_code AS [POST CODE],
            ps.vacant_or_filled AS [VACANT OR FILLED],
            CONVERT(VARCHAR(10), ps.date_of_arise_in_vacancy, 103) AS [DATE OF ARISE IN VACANCY],
            ps.method_of_appointment AS [METHOD OF APPOINTMENT],
            CASE WHEN ps.exception_abolish = 1 THEN 'YES' ELSE 'NO' END AS [WHETHER THE POST NEEDS TO BE EXEMPTED FROM ABOLISHING?],
            CONVERT(VARCHAR(10), ps.employee_joined_date, 103) AS [EMPLOYEE JOINED DATE],
            et.employee_id AS [EMPLOYEE ID],
            et.emp_reference_id AS [REFERENCE NUMBER / PERSONNEL NUMBER],
            em.emp_name AS [EMPLOYEE NAME]
            FROM tbl_hr_post_strength ps
            LEFT JOIN mmt_hr_post p ON p.post_id = ps.post_id
            LEFT JOIN mmt_hr_department dp ON dp.department_id = ps.department_id
            LEFT JOIN mmt_class c ON c.class_id = p.class_id
            LEFT JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
            LEFT JOIN tbl_employee_transaction_details et ON et.employee_id = ps.employee_id
            LEFT JOIN tbl_employee_master em ON em.emp_master_id = et.emp_master_id
            WHERE ps.organisation_id = @organisationID AND et.emp_post_end_date IS NULL`);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function getHRAllEmployeeData(req, res) {
    try {
        const roleID = parseInt(req.params.roleID, 10);
        const organisationID = req.params.organisationID ? parseInt(req.params.organisationID, 10) : null;

        if ((roleID === 6 || roleID === 7) && !organisationID) {
            return res.status(400).json({ 
                message: "OrganisationID required for role 6 and 7" 
            });
        }

        const conn = await pool;
        const request = conn.request();

        request.input("roleID", roleID);
        if (organisationID) {
            request.input("organisationID", organisationID);
        }

        const isOrgRestricted = (roleID === 6 || roleID === 7) && organisationID;

        const orgFilterActive     = isOrgRestricted ? "AND ps.organisation_id    = @organisationID" : "";
        const orgFilterDeputation = isOrgRestricted ? "AND lt.emp_working_org_id = @organisationID" : "";
        const orgFilterTransfer   = isOrgRestricted ? "AND lt.emp_working_org_id = @organisationID" : "";
        const orgFilterInactive   = isOrgRestricted ? "AND em.emp_curr_org_id    = @organisationID" : "";

        const query = `
        WITH LatestTransaction AS (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY emp_master_id
                    ORDER BY TRY_CONVERT(DATE, employee_joining_date) DESC
                ) AS tx_rn
            FROM tbl_employee_transaction_details
        ),
        EmployeeStatus AS (
            SELECT
                em.emp_reference_id AS [REFERENCE NUMBER / PERSONNEL NUMBER],

                CASE
                    WHEN LTRIM(RTRIM(lt.activity_name)) = 'Deputation Out' THEN 'DEPUTED'
                    WHEN LTRIM(RTRIM(lt.activity_name)) = 'Transfer Out'   THEN 'TRANSFERRED OUT'
                    WHEN ps.vacant_or_filled = 'filled'                    THEN 'ACTIVE'
                    ELSE 'INACTIVE'
                END AS [EMPLOYEE STATUS],

                lt.employee_id                                             AS [EMPLOYEE ID],
                em.emp_name                                                AS [EMPLOYEE NAME],
                em.emp_gender                                              AS [GENDER],
                TRY_CONVERT(DATE, em.emp_dob)                             AS [DATE OF BIRTH],
                TRY_CONVERT(DATE, em.emp_dor)                             AS [DATE OF RETIREMENT],
                em.emp_aadhar_number                                       AS [AADHAR NUMBER],
                em.emp_religion                                            AS [RELIGION],
                em.emp_ethnic_origin                                       AS [ETHNIC ORIGIN],
                em.emp_disability                                          AS [WHETHER PWBD],
                s.state_name                                               AS [DOMICILE STATE],
                COALESCE(mmo.organisation_name, 'Others')                 AS [PARENT ORGANISATION],
                TRY_CONVERT(DATE, em.emp_parent_org_joined_date)          AS [INITIAL DATE OF JOINING PORT SERVICE],
                CASE 
                    WHEN em.ex_service_or_not = 1 THEN 'YES' 
                    ELSE 'NO' 
                END AS [WHETHER EX-SERVICE PERSONNEL],

                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE ISNULL(lt.emp_department_name, '') END AS [DEPARTMENT],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE ISNULL(lt.emp_post_name, '')       END AS [POST NAME],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE ISNULL(lt.emp_post_code, '')       END AS [POST CODE],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE cls.class                          END AS [CLASS],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE ps.vacant_or_filled                END AS [VACANT OR FILLED],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE lt.method_of_appointment           END AS [METHOD OF APPOINTMENT],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE TRY_CONVERT(DATE, ps.date_of_arise_in_vacancy) END AS [DATE OF ARISE IN VACANCY],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE TRY_CONVERT(DATE, lt.employee_joining_date)    END AS [EMPLOYEE JOINING DATE],
                CASE WHEN ps.emp_master_id IS NULL THEN NULL ELSE TRY_CONVERT(DATE, lt.emp_post_end_date)        END AS [POST END DATE]

            FROM tbl_employee_master em

            LEFT JOIN LatestTransaction lt ON em.emp_master_id = lt.emp_master_id AND lt.tx_rn = 1
            LEFT JOIN tbl_hr_post_strength ps ON em.emp_master_id = ps.emp_master_id
            LEFT JOIN mmt_hr_post po       ON ps.post_id          = po.post_id
            LEFT JOIN mmt_class cls        ON po.class_id         = cls.class_id
            LEFT JOIN mmt_state s          ON em.emp_domicile_state = s.state_id
            LEFT JOIN mmt_organisation mmo ON em.emp_parent_org_id = mmo.organisation_id

            WHERE (
                (ps.vacant_or_filled = 'filled' ${orgFilterActive} )
                OR (LTRIM(RTRIM(lt.activity_name)) = 'Deputation Out' ${orgFilterDeputation})
                OR ( LTRIM(RTRIM(lt.activity_name)) = 'Transfer Out' ${orgFilterTransfer} )
                OR( ps.emp_master_id IS NULL ${orgFilterInactive}) 
            )
        )
        SELECT *
        FROM EmployeeStatus
        ORDER BY [REFERENCE NUMBER / PERSONNEL NUMBER];
        `;

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ 
            message: "Internal Server Error", 
            error: err 
        });
    }
}

async function getPostListByOrgId(req, res) {
    const deptID = req.params.departmentId;
    const orgID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("deptID", deptID);
    request.input("orgID", orgID);
    try {
        const result = await request.query(`
            SELECT p.* FROM mmt_hr_post as p
            JOIN mmt_hr_department as d on p.department_id = d.department_id
            JOIN mmt_organisation as o ON o.organisation_id = p.organisation_id
            WHERE p.organisation_id = @orgID and d.department_id =@deptID
        `);
        res.json(result.recordset);
    } catch (err) {
        //console.log(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
    }
}

async function addNewEmployee(req, res) {
    const conn = await pool;
    const request = new sql.Request(conn);

    try {
        // let uniqueFileName = null;

        // if (req.file) {
        //     const originalFileName = req.file.originalname;
        //     uniqueFileName = generateUniqueFileName(originalFileName);

        //     const destinationFolder = './fileuploads/hr_employee';
        //     const destinationPath = path.join(destinationFolder, uniqueFileName);

        //     if (!fs.existsSync(destinationFolder)) {
        //         fs.mkdirSync(destinationFolder, { recursive: true });
        //     }

        //     fs.renameSync(req.file.path, destinationPath);
        // }

        const employeeName = req.body.employeeName;
        const empReferenceId = req.body.referenceNumber;
        const dateOfBirth = req.body.dateOfBirth;
        const employeeAadhar = req.body.employeeAadhar ?? null;
        const emp_disability = req.body.whethVhorOh;
        const religion = req.body.religion;
        const ethnicOrigin = req.body.ethnicOrigin;
        const empDivisionName = req.body.empDivisionName ?? null;
        const gender = req.body.gender;
        const experience = req.body.experience;
        const empDepartmentId = req.body.department;
        const empDepartmentName = req.body.departmentName;
        const empCurrOrgId = req.body.organisationID;
        const empPostId = req.body.empPostId;
        const empPostName = req.body.empPostName;
        const empPostCode = req.body.postCode;
        //  const empPostJoinedDate = req.body.joiningDate;
        const parentOrganisation = req.body.parentOrganisation ? parseInt(req.body.parentOrganisation) || null : null;
        const domicileState = req.body.domicileState;
        const parentOrgJoiningDate = req.body.parentOrgJoiningDate ?? null;
        const retirementDate = req.body.retirementDate;
        const appoinmentMethod = req.body.appoinmentMethod;
        const vacancyAriseDate = req.body.vacancyAriseDate;
        const empPostJoinDate = req.body.empPostJoinDate;
        const currentOrgJoiningDate = req.body.joiningDate;
        const currentPostJoiningDate = req.body.joiningDate;

        const activityName = req.body.activityName ?? null;
        const absorptionDate = req.body.absorptionDate ?? null;
        const transferOutDate = req.body.transferOutDate ?? null;
        const dateOfDeputingOut = req.body.dateOfDeputingOut ?? null;
        const orgIdToBeDeputed = req.body.orgIdToBeDeputed ?? null;
        const deputationStartDate = req.body.deputationStartDate ?? null;
        const deputationEndDate = req.body.deputationEndDate ?? null;
        const separationReason = req.body.separationReason ?? null;
        const separationDate = req.body.separationDate ?? null;
        const promotionDate = req.body.promotionDate ?? null;
        const empPostEndDate = req.body.promotionDate ?? null;
        const otherParentOrg = req.body.otherParentOrg ?? null;
        const empDiscipline = req.body.empDiscipline ?? null;
        const empHighestEdu = req.body.empHighestEdu ?? null;
        const ugCount = req.body.ugCount ?? null;
        const pgCount = req.body.pgCount ?? null;
        const ugDisciplines = req.body.ugDisciplines ?? null;
        const pgDisciplines = req.body.pgDisciplines ?? null;
        const technicalResPerson = req.body.technicalResPerson ?? null;
        const userID = req.body.userID ?? null;
        let employeeId = req.body.employeeId ?? null;
        let empMasterId = req.body.empMasterId ?? null;
        

        const ugDisciplinesStr = ugDisciplines.join(',');
        const pgDisciplinesStr = pgDisciplines.join(',');

        request.input("activityName", activityName);
        request.input("absorptionDate", absorptionDate);
        request.input("transferOutDate", transferOutDate);
        request.input("dateOfDeputingOut", dateOfDeputingOut);
        request.input("orgIdToBeDeputed", orgIdToBeDeputed);
        request.input("deputationStartDate", deputationStartDate);
        request.input("deputationEndDate", deputationEndDate);
        request.input("separationReason", separationReason);
        request.input("separationDate", separationDate);
        request.input("promotionDate", promotionDate);
        request.input("empPostEndDate", empPostEndDate);
        request.input("empHighestEdu",empHighestEdu);
        request.input("empDiscipline",empDiscipline);
        request.input("employeeName", employeeName);
        request.input("empReferenceId", empReferenceId);
        request.input("dateOfBirth", dateOfBirth);
        request.input("employeeAadhar", employeeAadhar);
        request.input("emp_disability", emp_disability);
        request.input("religion", religion);
        request.input("ethnicOrigin", ethnicOrigin);
        request.input("gender", gender);
        request.input("empDivisionName",empDivisionName);
        request.input("experience", experience);
        request.input("empPostId", empPostId);
        request.input("empPostName", empPostName);
        request.input("empPostCode", empPostCode);
        // request.input("empPostJoinedDate", empPostJoinedDate);
        request.input("empDepartmentId", empDepartmentId);
        request.input("empDepartmentName", empDepartmentName);
        request.input("empCurrOrgId", empCurrOrgId);
        request.input("parentOrganisation", parentOrganisation);
        request.input("domicileState", domicileState);
        request.input("parentOrgJoiningDate", parentOrgJoiningDate);
        request.input("retirementDate", retirementDate);
        // request.input("uniqueFileName", uniqueFileName);
        request.input("appoinmentMethod", appoinmentMethod);
        request.input("vacancyAriseDate", vacancyAriseDate);
        request.input("empPostJoinDate", empPostJoinDate);
        request.input("currentOrgJoiningDate", currentOrgJoiningDate);
        request.input("currentPostJoiningDate", currentPostJoiningDate);
        request.input("otherParentOrg",otherParentOrg);
        request.input("ugCount", ugCount);
        request.input("pgCount", pgCount);
        request.input("technicalResPerson", technicalResPerson);
        request.input("ugDisciplines", ugDisciplinesStr);
        request.input("pgDisciplines", pgDisciplinesStr);
        request.input("userID", userID);
        request.input("empMasterId", empMasterId);

        const createdDate = new Date();
        request.input("createdDate", createdDate);

        let insertEmployeeQuery;

        if(parentOrganisation == 73){
            insertEmployeeQuery = `INSERT INTO tbl_employee_master (
                emp_name, emp_dob, emp_gender, emp_aadhar_number, emp_religion, emp_ethnic_origin, emp_disability, emp_dor, ex_service_or_not, emp_parent_org_id,emp_other_parent_org,
                emp_domicile_state, emp_parent_org_joined_date,emp_division_name,emp_curr_org_id,emp_other_org_name,emp_discipline,emp_highest_edu,created_date, created_by,emp_status,
                ug_count,pg_count,ug_discipline,pg_discipline,technical_resign,emp_curr_org_join_date,emp_reference_id)
                 OUTPUT INSERTED.emp_master_id
                VALUES (@employeeName, @dateOfBirth, @gender, @employeeAadhar, @religion, @ethnicOrigin, @emp_disability, @retirementDate, @experience, @parentOrganisation, @otherParentOrg,
                @domicileState, @parentOrgJoiningDate, @empDivisionName,@parentOrganisation,@otherParentOrg,@empDiscipline,@empHighestEdu,@createdDate, @userID,1,@ugCount,@pgCount,@ugDisciplines,@pgDisciplines,@technicalResPerson,@currentOrgJoiningDate,@empReferenceId)`;
            employeeId = await getNewEmployeeIDofOrg(73);
            request.input("employeeId", employeeId);
        }else if(technicalResPerson != 1){
            insertEmployeeQuery = `INSERT INTO tbl_employee_master (
                emp_name, emp_dob, emp_gender, emp_aadhar_number, emp_religion, emp_ethnic_origin, emp_disability, emp_dor, ex_service_or_not, emp_parent_org_id,emp_other_parent_org,
                emp_domicile_state, emp_parent_org_joined_date,emp_division_name,emp_curr_org_id,emp_discipline,emp_highest_edu,created_date, created_by,emp_status,ug_count,pg_count,ug_discipline,pg_discipline,technical_resign,emp_curr_org_join_date,emp_reference_id)
                 OUTPUT INSERTED.emp_master_id
                VALUES (@employeeName, @dateOfBirth, @gender, @employeeAadhar, @religion, @ethnicOrigin, @emp_disability, @retirementDate, @experience, @parentOrganisation, @otherParentOrg,
                @domicileState, @parentOrgJoiningDate, @empDivisionName,@empCurrOrgId,@empDiscipline,@empHighestEdu,@createdDate, @userID,1,@ugCount,@pgCount,@ugDisciplines,@pgDisciplines,@technicalResPerson,@currentOrgJoiningDate,@empReferenceId)`;
            employeeId = await getNewEmployeeIDofOrg(empCurrOrgId);
            request.input("employeeId", employeeId);

        }else if(technicalResPerson == 1){
           employeeId = req.body.employeeId;
            request.input("employeeId", employeeId);
            insertEmployeeQuery = `
            UPDATE tbl_employee_master
                SET 
                emp_status = 1,
                emp_name = @employeeName,
                emp_dob = @dateOfBirth,
                emp_gender = @gender,
                emp_religion = @religion,
                emp_aadhar_number = @employeeAadhar,
                ex_service_or_not = @experience,
                emp_parent_org_id = @parentOrganisation,
                emp_ethnic_origin = @ethnicOrigin,
                emp_domicile_state = @domicileState,
                emp_parent_org_joined_date = @parentOrgJoiningDate,
                emp_other_parent_org = @otherParentOrg,
                emp_division_name = @empDivisionName,
                emp_discipline = @empDiscipline,
                emp_highest_edu = @empHighestEdu,
                ug_count = @ugCount,
                pg_count = @pgCount,
                ug_discipline = @ugDisciplines,
                pg_discipline = @pgDisciplines,
                emp_curr_org_join_date= @currentOrgJoiningDate
        WHERE emp_master_id = ${empMasterId}`
        }
        
        const result = await request.query(insertEmployeeQuery);

        if (technicalResPerson != 1) {
            if (result && result.recordset && result.recordset.length > 0) {
                empMasterId = result.recordset[0].emp_master_id;
            } else {
                throw new Error("Failed to insert into tbl_employee_master.");
            }
        }

        const existing = await request.query(`
            SELECT employee_id, emp_working_org_id,emp_reference_id
            FROM tbl_employee_transaction_details
            WHERE employee_id = @employeeId AND emp_working_org_id = @empCurrOrgId
        `);

        let isSameOrg = false;
        let existingEmployeeId = null;

        if (existing.recordset.length > 0) {
            existingEmployeeId = existing.recordset[0].employee_id;
            if (existing.recordset[0].emp_working_org_id == empCurrOrgId) {
                isSameOrg = true; 
            }
        }

        if(technicalResPerson == 1){
            if (isSameOrg) {
                employeeId = existingEmployeeId;

            }else if(!isSameOrg){
                employeeId = await getNewEmployeeIDofOrg(empCurrOrgId);
            }
        } 
        const transReq = new sql.Request(conn);

        transReq.input("employeeId", employeeId);
        transReq.input("empMasterId", empMasterId);
        transReq.input("empReferenceId", empReferenceId);
        transReq.input("currentPostJoiningDate", currentPostJoiningDate);
        transReq.input("empPostEndDate", empPostEndDate);
        transReq.input("appoinmentMethod", appoinmentMethod);
        transReq.input("currentOrgJoiningDate", currentOrgJoiningDate);
        transReq.input("empDepartmentId", empDepartmentId);
        transReq.input("empPostId", empPostId);
        transReq.input("empPostCode", empPostCode);
        transReq.input("empPostName", empPostName);
        transReq.input("empDepartmentName", empDepartmentName);
        transReq.input("empCurrOrgId", empCurrOrgId);
        transReq.input("activityName", activityName);
        transReq.input("absorptionDate", absorptionDate);
        transReq.input("transferOutDate", transferOutDate);
        transReq.input("dateOfDeputingOut", dateOfDeputingOut);
        transReq.input("orgIdToBeDeputed", orgIdToBeDeputed);
        transReq.input("deputationStartDate", deputationStartDate);
        transReq.input("deputationEndDate", deputationEndDate);
        transReq.input("separationReason", separationReason);
        transReq.input("separationDate", separationDate);
        transReq.input("promotionDate", promotionDate);
        transReq.input("createdDate", createdDate);
        transReq.input("userID", userID);

        await transReq.query(`
                INSERT INTO tbl_employee_transaction_details (
                    employee_id,
                    emp_master_id,
                    emp_reference_id,
                    emp_post_join_date,
                    emp_post_end_date,
                    method_of_appointment,
                    employee_joining_date,
                    emp_department_id,
                    emp_post_id,
                    emp_post_code,
                    emp_post_name,
                    emp_department_name,
                    emp_working_org_id,
                    activity_name,
                    absorption_date,
                    transfer_out_date,
                    date_of_deputing_out,
                    org_to_be_deputed,
                    deputation_start_date,
                    deputation_end_date,
                    separation_reason,
                    separation_date,
                    promotion_date,
                    created_date,
                    created_by
                )
                VALUES (
                    @employeeId,
                    @empMasterId,
                    @empReferenceId,
                    @currentPostJoiningDate,
                    @empPostEndDate,
                    @appoinmentMethod,
                    @currentOrgJoiningDate,
                    @empDepartmentId,
                    @empPostId,
                    @empPostCode,
                    @empPostName,
                    @empDepartmentName,
                    @empCurrOrgId,
                    @activityName,
                    @absorptionDate,
                    @transferOutDate,
                    @dateOfDeputingOut,
                    @orgIdToBeDeputed,
                    @deputationStartDate,
                    @deputationEndDate,
                    @separationReason,
                    @separationDate,
                    @promotionDate,
                    @createdDate,
                    @userID
                );
            `);

        await request.query(`
            UPDATE tbl_hr_post_strength
            SET vacant_or_filled = 'filled',
                employee_id = @employeeId,
                method_of_appointment = @appoinmentMethod,
                employee_joined_date = @createdDate,
                date_of_arise_in_vacancy = @vacancyAriseDate,
                is_new = 0,
                emp_master_id = ${empMasterId},
                updated_date = GETDATE(),
                updated_by = @userID
            WHERE post_code = @empPostCode
        `);

        return res.status(201).json({
            status: "success",
            employeeId: employeeId,
            empMasterId : empMasterId
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({message:"Internal Server Error",error:err});
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

async function editEmployeeDetails(req, res) {
    const conn = await pool;
    // const request = conn.request();
    // let uniqueFileName = null;
    // const profileImgUpdateStatus = req.body.profileImgUpdateStatus;

    // if (req.file) {
    //     const originalFileName = req.file.originalname;

    //     if (profileImgUpdateStatus == 1) {
    //         uniqueFileName = generateUniqueFileName(originalFileName);
    //         const destinationFolder = './fileuploads/hr_employee';
    //         const destinationPath = path.join(destinationFolder, uniqueFileName);

    //         if (!fs.existsSync(destinationFolder)) {
    //             fs.mkdirSync(destinationFolder, { recursive: true });
    //         }

    //         fs.renameSync(req.file.path, destinationPath);
    //     } else {
    //         uniqueFileName = originalFileName;
    //     }
    // }

    // request.input("fileName", uniqueFileName);


    const employeeName = req.body.employeeName;
    const empID = req.body.empID;
    const referenceNumber = req.body.referenceNumber;
    const empDivisionName = req.body.empDivisionName;
    const dateOfBirth = req.body.dateOfBirth;
    const gender = req.body.gender;
    const religion = req.body.religion;
    const employeeAadhar = req.body.employeeAadhar;
    // const department = req.body.department;
    const joiningDate = req.body.joiningDate;
    const experience = req.body.experience;
    const parentOrganisation = req.body.parentOrganisation;
    const currentDesignation = req.body.currentDesignation;
    const whethVhorOh = req.body.whethVhorOh;
    const ethnicOrigin = req.body.ethnicOrigin;
    const parentOrgJoiningDate = req.body.parentOrgJoiningDate;
    const empMasterID = req.body.empMasterID;
    const domicileState = req.body.domicileState;
    const empDiscipline = req.body.empDiscipline;
    const empHighestEdu = req.body.empHighestEdu;
    const otherParentOrg = req.body.otherParentOrg && req.body.otherParentOrg.trim() !== '' ? req.body.otherParentOrg : null;
    const retirementDate = req.body.retirementDate;

    const ugCount = req.body.ugCount ?? null;
    const pgCount = req.body.pgCount ?? null;
    const ugDisciplines = req.body.ugDisciplines ?? null;
    const pgDisciplines = req.body.pgDisciplines ?? null;

    const ugDisciplinesStr = ugDisciplines.join(',');
    const pgDisciplinesStr = pgDisciplines.join(',');

    // const tempPath = req.file.path ; 
    // const finalPath = `Downloads/${req.file.filename}`; 

    try {
    const transaction = new sql.Transaction(conn);
    await transaction.begin();

    const req1 = new sql.Request(transaction);
    req1.input("employeeName", employeeName);
    req1.input("referenceNumber", referenceNumber);
    req1.input("dateOfBirth", dateOfBirth);
    req1.input("employeeAadhar", employeeAadhar);
    req1.input("whethVhorOh", whethVhorOh);
    req1.input("religion", religion);
    req1.input("ethnicOrigin", ethnicOrigin);
    req1.input("gender", gender);
    req1.input("experience", experience);
    req1.input("currentDesignation", currentDesignation);
    //  request.input("fileName",fileName);
    // request.input("department", department);
    req1.input("parentOrganisation", parentOrganisation);
    req1.input("parentOrgJoiningDate", parentOrgJoiningDate);
    //  request.input("employeeID", employeeID);
    // request.input("uniqueFileName", uniqueFileName);
    req1.input("empMasterID", empMasterID);
    req1.input("domicileState", domicileState);
    req1.input("empDivisionName",empDivisionName);
    req1.input("otherParentOrg",otherParentOrg);
    req1.input("empDiscipline",empDiscipline);
    req1.input("empHighestEdu",empHighestEdu);
    req1.input("ugCount", ugCount);
    req1.input("pgCount", pgCount);
    req1.input("ugDisciplines", ugDisciplinesStr);
    req1.input("pgDisciplines", pgDisciplinesStr);
    req1.input("joiningDate", joiningDate);
    req1.input("retirementDate", retirementDate);

    await req1.query(`
        UPDATE tbl_employee_master
        SET 
        emp_name = @employeeName,
        emp_dob = @dateOfBirth,
        emp_gender = @gender,
        emp_reference_id = @referenceNumber,
        emp_religion = @religion,
        emp_aadhar_number = @employeeAadhar,
        ex_service_or_not = @experience,
        emp_parent_org_id = @parentOrganisation,
        emp_disability = @whethVhorOh,
        emp_ethnic_origin = @ethnicOrigin,
        emp_domicile_state = @domicileState,
        emp_parent_org_joined_date = @parentOrgJoiningDate,
        emp_other_parent_org = @otherParentOrg,
        emp_division_name = @empDivisionName,
        emp_discipline = @empDiscipline,
        emp_highest_edu = @empHighestEdu,
        ug_count = @ugCount,
        pg_count = @pgCount,
        ug_discipline = @ugDisciplines,
        pg_discipline = @pgDisciplines,
        emp_curr_org_join_date = @joiningDate,
        emp_dor = @retirementDate
        WHERE emp_master_id =@empMasterID
    `);
    const req2 = new sql.Request(transaction);
    req2.input("empMasterID", empMasterID);
    req2.input("empID", empID);
    req2.input("referenceNumber", referenceNumber);
    req2.input("joiningDate", joiningDate);
    await req2.query(`
        UPDATE tbl_employee_transaction_details
        SET 
        emp_reference_id = @referenceNumber,
        emp_post_join_date = @joiningDate,
        employee_joining_date = @joiningDate
            WHERE emp_master_id =@empMasterID AND employee_id = @empID AND emp_post_end_date is NULL
    `);

    await transaction.commit();
    return res.status(200).json({ message: "Employee details updated successfully" })
    } catch (err) {
       console.error(err);
        if (transaction) 
            await transaction.rollback();
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }

};


async function getDetailedSanctionedStrength(req, res) {

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
           SELECT
                o.organisation_name,
                d.department_name,
                h.post_code,
                p.post_name,
                h.date_of_arise_in_vacancy,
                h.vacant_or_filled,
                h.method_of_appointment
            FROM
                [tbl_hr_post_strength] h
            LEFT JOIN
                mmt_organisation o ON o.organisation_id = h.organisation_id
            LEFT JOIN
                [mmt_hr_post] p ON h.post_id = p.post_id
            LEFT JOIN
                [mmt_hr_department] d ON p.department_id = d.department_id
            `);
        }else{
            request.input("organisation_id", organisation_id);
            result = await request.query(`
            SELECT
                o.organisation_name,
                d.department_name,
                h.post_code,
                p.post_name,
                h.date_of_arise_in_vacancy,
                h.vacant_or_filled,
                h.method_of_appointment
            FROM
                [tbl_hr_post_strength] h
            LEFT JOIN
                mmt_organisation o ON o.organisation_id = h.organisation_id
            LEFT JOIN
                [mmt_hr_post] p ON h.post_id = p.post_id
            LEFT JOIN
                [mmt_hr_department] d ON p.department_id = d.department_id
                WHERE o.organisation_id = @organisation_id
            `); 
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: "Internal Server Error" });
    }
}


async function getDetailedTotalFilledPosts(req,res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;
    request.input("organisationID",organisationID );
    try {
        let result = await request.query(`
            SELECT
                o.organisation_name,
                d.department_name,
                h.post_code,
                p.post_name,
                h.date_of_arise_in_vacancy,
                h.vacant_or_filled,
                m.emp_name,
                m.emp_reference_id,
                h.method_of_appointment
            FROM
                [tbl_hr_post_strength] h
            LEFT JOIN
                mmt_organisation o ON o.organisation_id = h.organisation_id
            LEFT JOIN
                [mmt_hr_post] p ON h.post_id = p.post_id
            LEFT JOIN
                tbl_employee_master m ON h.emp_master_id = m.emp_master_id
            LEFT JOIN
                [mmt_hr_department] d ON p.department_id = d.department_id
                WHERE o.organisation_id = @organisationID AND h.vacant_or_filled = 'filled'
            `); 
        
        res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: "Internal Server Error" });
    }
}

async function getTotalVacantPosts(req,res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;
    request.input("organisationID",organisationID );
    try {
        let result = await request.query(`
            SELECT
                o.organisation_name,
                d.department_name,
                h.post_code,
                p.post_name,
                h.date_of_arise_in_vacancy,
                h.vacant_or_filled,
                h.method_of_appointment
            FROM
                [tbl_hr_post_strength] h
            LEFT JOIN
                mmt_organisation o ON o.organisation_id = h.organisation_id
            LEFT JOIN
                [mmt_hr_post] p ON h.post_id = p.post_id
            LEFT JOIN
                [mmt_hr_department] d ON p.department_id = d.department_id
            WHERE o.organisation_id = @organisationID 
                AND h.vacant_or_filled = 'vacant'
                AND h.date_of_arise_in_vacancy IS NOT NULL 
                AND (
                    ( (h.exception_abolish IS NULL OR h.exception_abolish = 0)
                        AND DATEADD(YEAR, 5, h.date_of_arise_in_vacancy) > GETDATE()
                    )
                    OR h.exception_abolish = 1
                )
            `); 
        
        res.status(200).json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({error: "Internal Server Error" });
    }
}

async function getAbolishedVacantPosts(req,res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;
    request.input("organisationID",organisationID );
    try {
        let result = await request.query(`
            SELECT
                o.organisation_name,
                d.department_name,
                h.post_code,
                p.post_name,
                h.date_of_arise_in_vacancy,
                h.vacant_or_filled,
                h.method_of_appointment
            FROM
                [tbl_hr_post_strength] h
            LEFT JOIN
                mmt_organisation o ON o.organisation_id = h.organisation_id
            LEFT JOIN
                [mmt_hr_post] p ON h.post_id = p.post_id
            LEFT JOIN
                [mmt_hr_department] d ON p.department_id = d.department_id
            WHERE o.organisation_id = @organisationID 
                AND h.vacant_or_filled = 'vacant'
                AND h.date_of_arise_in_vacancy IS NOT NULL 
                AND (
                    ( (h.exception_abolish IS NULL OR h.exception_abolish = 0)
                        AND DATEADD(YEAR, 5, h.date_of_arise_in_vacancy) <= GETDATE()
                    )
                )
            `); 
        
       res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: "Internal Server Error" });
    }
}

async function getYearAndMonth(req, res) {
    const conn = await pool;
    const request = conn.request();
    const organisationID = req.params.organisationID;

    request.input("organisationID", organisationID);

    try {
        let result = await request.query(`
            SELECT DISTINCT
                h.log_year,
                h.log_month
            FROM tbl_hr_post_strength_log h
            WHERE h.organisation_id = @organisationID
            ORDER BY h.log_year DESC, h.log_month DESC
        `);

        res.status(200).json(result.recordset);

    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function updateActivityData(req, res) {
    const transaction = new sql.Transaction(await pool);

    try {
        await transaction.begin();

        const {
            currentEmployeeId,
            currentEmpMasterId,
            currentReferenceId,
            promotionActivityName,
            departmentValue,
            departmentName,
            promotionPostCode,
            postName,
            promotionPostID,
            promotionOrderDate,
            userID,
            organisationID
        } = req.body;

        let methodOfAppointment = promotionActivityName;

        if (promotionActivityName === "Deputation Back") {
            const selectRequest = new sql.Request(transaction);

            const result = await selectRequest
                .input("empMasterID", currentEmpMasterId)
                .query(`
                    SELECT TOP 1 method_of_appointment
                    FROM tbl_employee_transaction_details
                    WHERE emp_master_id = @empMasterID
                    ORDER BY created_date ASC
                `);

            if (result.recordset.length > 0) {
                methodOfAppointment = result.recordset[0].method_of_appointment;
            }
        }

        const request = new sql.Request(transaction);

        request.input("employeeID", currentEmployeeId);
        request.input("empMasterID", currentEmpMasterId);
        request.input("empReferenceId", currentReferenceId);
        request.input("organisationID", organisationID);
        request.input("promotionActivityName", promotionActivityName);
        request.input("methodOfAppointment", methodOfAppointment);
        request.input("departmentValue", departmentValue);
        request.input("promotionPostCode", promotionPostCode);
        request.input("postName", postName);
        request.input("promotionPostID", promotionPostID);
        request.input("promotionOrderDate", promotionOrderDate);
        request.input("departmentName", departmentName);
        request.input("userID", userID);

        await request.query(`
            INSERT INTO tbl_employee_transaction_details (
                employee_id,
                emp_master_id,
                emp_reference_id,
                emp_post_join_date,
                employee_joining_date,
                promotion_date,
                method_of_appointment,
                activity_date,
                activity_name,
                emp_department_id,
                emp_department_name,
                emp_post_code,
                emp_post_name,
                emp_post_id,
                emp_working_org_id,
                created_date,
                created_by
            )
            VALUES (
                @employeeID,
                @empMasterID,
                @empReferenceId,
                @promotionOrderDate,
                @promotionOrderDate,
                @promotionOrderDate,
                @methodOfAppointment,
                GETDATE(),
                @promotionActivityName, 
                @departmentValue,
                @departmentName,
                @promotionPostCode,
                @postName,
                @promotionPostID,
                @organisationID,
                GETDATE(),
                @userID
            )
        `);

        await request.query(`
            UPDATE tbl_hr_post_strength
            SET 
                vacant_or_filled = 'filled',
                employee_id = @employeeID,
                emp_master_id = @empMasterID,
                employee_joined_date = @promotionOrderDate,
                updated_date = GETDATE(),
                updated_by = @userID,
                organisation_id = @organisationID
            WHERE post_code = @promotionPostCode
        `);

        await request.query(`
            UPDATE tbl_employee_master
            SET emp_status = 1
            WHERE emp_master_id = @empMasterID
        `);

        await transaction.commit();
        res.status(200).json({ message: "Activity updated successfully" });

    } catch (error) {
        await transaction.rollback();
        console.error("Error updating activity:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getDeputationEndEmployees(req, res) {
    const { employeeId, empMasterId, empReferenceId } = req.params;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("employeeId", employeeId);
        request.input("empMasterId", empMasterId);
        request.input("empReferenceId", empReferenceId);

        const result = await request.query(`
        SELECT TOP 1
            etd.transaction_id,
            etd.employee_id,
            etd.emp_master_id,
            etd.emp_reference_id,
            etd.emp_department_id,
            etd.emp_post_id,
            ISNULL(ps.vacant_or_filled, 'FILLED') AS vacant_or_filled,
            etd.emp_post_code,
            etd.emp_post_name,
            etd.method_of_appointment
        FROM tbl_employee_transaction_details etd
        LEFT JOIN tbl_hr_post_strength ps ON LTRIM(RTRIM(etd.emp_post_id)) = LTRIM(RTRIM(ps.post_id))
                AND LTRIM(RTRIM(etd.emp_post_code)) = LTRIM(RTRIM(ps.post_code))
        WHERE etd.employee_id = @employeeId
            AND etd.emp_master_id = @empMasterId
            AND etd.emp_reference_id = @empReferenceId
            ORDER BY etd.transaction_id ASC
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Employee transactions not found" });
        }

        const data = result.recordset[0];

        // Check if the post is filled
        if (data.vacant_or_filled && data.vacant_or_filled.toUpperCase() === "FILLED") {
            return res.status(200).json({
                status: "FILLED",
                message: "This post already has an employee"
            });
        }

        // Post is vacant, return details
        return res.status(200).json({
            status: "VACANT",
            emp_department_id: data.emp_department_id,
            emp_post_id: data.emp_post_id,
            emp_post_name: data.emp_post_name,
            emp_post_code: data.emp_post_code,
            method_of_appointment: data.method_of_appointment
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export default  {
    getOrganisationCode, getPostStrengthAbsoluteData, getDepartmentId, checkPostCode, addRevivePost, addPostStrengthDetail,
    getPostStrengthData, getFilledPost, getVacantPost, getPermanentAbolishedPostOrg, getPermanentAbolishedPost, postReviveDate,
    updateRevivePostApprovalDetails, addAnticipatedVancancies, updateAnticipatedVacancies, getAnticipatedVacancies,
    deleteAnticipatedVacancy, deleteHrPostData, deleteHrDepartment, getHRAllData, getHRAllEmployeeData,  getPostListByOrgId, addNewEmployee, editEmployeeDetails, upload,
    getDetailedSanctionedStrength,getDetailedTotalFilledPosts,getTotalVacantPosts,getAbolishedVacantPosts,getYearAndMonth,updateActivityData,getDeputationEndEmployees
};




