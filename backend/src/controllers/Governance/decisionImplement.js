import { pool } from "../../db.js";

async function addDecisionImplementData(req, res) {

    const meetingId = req.body.meetingId;
    const meetingChair = req.body.meetingChair;
    const subject = req.body.subject;
    const actionItem = req.body.actionItem;
    const resDepart = req.body.resDepart;
    const resOrg = req.body.resOrg;
    const initiationDate = req.body.initiationDate;
    const targetDate = req.body.targetDate;
    const currentPending = req.body.currentPending;
    const currentStatus = req.body.currentStatus;
    const expectedCompletion = req.body.expectedCompletion;
    const reasonsForDelay = req.body.reasonsForDelay;
    const remarksOnDelay = req.body.remarksOnDelay;
    const statusInBreif = req.body.statusInBreif;

    const userID = req.body.userID;

    const conn = await pool;
    const request = conn.request();

    request.input("meetingId", meetingId);
    request.input("meetingChair", meetingChair);
    request.input("subject", subject);
    request.input("actionItem", actionItem);
    request.input("resDepart", resDepart);
    request.input("resOrg", resOrg);
    request.input("initiationDate", initiationDate);
    request.input("targetDate", targetDate);
    request.input("currentPending", currentPending);
    request.input("currentStatus", currentStatus);
    request.input("expectedCompletion", expectedCompletion);
    request.input("reasonsForDelay", reasonsForDelay);
    request.input("remarksOnDelay", remarksOnDelay);
    request.input("statusInBreif", statusInBreif);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            INSERT INTO tbl_IT_decision_implement (
                meeting_id, meeting_chair, subject, action_item, res_wing, res_org,
                initiation_date, target_date, current_pending, current_status, expected_completion,
                reasons_for_delay, remarks_on_delay, status_in_breif, created_by
            )
            VALUES (
                @meetingId, @meetingChair, @subject, @actionItem, @resDepart, @resOrg,
                @initiationDate, @targetDate, @currentPending, @currentStatus, @expectedCompletion,
                @reasonsForDelay, @remarksOnDelay, @statusInBreif, @userID
            )
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function editDecisionImplementData(req, res) {
    const meetingId = req.body.meetingId;
    const meetingChair = req.body.meetingChair;
    const subject = req.body.subject;
    const actionItem = req.body.actionItem;
    const resDepart = req.body.resDepart;
    const resOrg = req.body.resOrg;
    const initiationDate = req.body.initiationDate;
    const targetDate = req.body.targetDate;
    const currentPending = req.body.currentPending;
    const currentStatus = req.body.currentStatus;
    const expectedCompletion = req.body.expectedCompletion;
    const reasonsForDelay = req.body.reasonsForDelay;
    const remarksOnDelay = req.body.remarksOnDelay;
    const userID = req.body.userID;
    const decisionImplementID = req.body.ID; 
    const statusInBreif = req.body.statusInBreif;

    const conn = await pool;
    const request = conn.request();

    request.input("meetingId", meetingId);
    request.input("meetingChair", meetingChair);
    request.input("subject", subject);
    request.input("actionItem", actionItem);
    request.input("resDepart", resDepart);
    request.input("resOrg", resOrg);
    request.input("initiationDate", initiationDate);
    request.input("targetDate", targetDate);
    request.input("currentPending", currentPending);
    request.input("currentStatus", currentStatus);
    request.input("expectedCompletion", expectedCompletion);
    request.input("reasonsForDelay", reasonsForDelay);
    request.input("remarksOnDelay", remarksOnDelay);
    request.input("userID", userID);
    request.input("decisionImplementID", decisionImplementID);
    request.input("statusInBreif", statusInBreif);

    try {
        const result = await request.query(`
            UPDATE tbl_IT_decision_implement
            SET
                meeting_id = @meetingId,
                meeting_chair = @meetingChair,
                subject = @subject,
                action_item = @actionItem,
                res_wing = @resDepart,
                res_org = @resOrg,
                initiation_date = @initiationDate,
                target_date = @targetDate,
                current_pending = @currentPending,
                current_status = @currentStatus,
                expected_completion = @expectedCompletion,
                reasons_for_delay = @reasonsForDelay,
                remarks_on_delay = @remarksOnDelay,
                status_in_breif = @statusInBreif,
                created_by = @userID
            WHERE decision_ID = @decisionImplementID
        `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getDecisionImplementData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT * from tbl_IT_decision_implement
            INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_IT_decision_implement.res_org
            ORDER BY decision_ID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateDecisionImplementData(req, res) {
    const decisionImplementID = req.params.ID;
    const conn = await pool;
    const request = conn.request();
    request.input("decisionImplementID", decisionImplementID);

    try {
        const result = await request.query(`
            SELECT * FROM tbl_IT_decision_implement
            INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_IT_decision_implement.res_org
            WHERE tbl_IT_decision_implement.decision_ID = @decisionImplementID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};





const decisionController = {
    addDecisionImplementData,
    getDecisionImplementData,
    editDecisionImplementData,
    getUpdateDecisionImplementData
};

export default decisionController;
