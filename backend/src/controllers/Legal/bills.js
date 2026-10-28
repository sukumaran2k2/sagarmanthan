import { pool } from "../../db.js";
import fs from 'fs';

// Bills are kept in 2.0's tbl_bill (3.0 had been writing to a separate copy of it).
// The API and the form keep 3.0's field names; this maps each stage to tbl_bill's columns.
// Each stage has a date, the done flag 2.0 keeps beside it (set from the date), and a
// remark column added for 3.0.
const STAGES = [
    { field: 'draft_bill_prepared_date', column: 'pre_draft_bill_prepared', param: 'draftBillPrepared' },
    { field: 'dcn_draft_bill_approved_minister_date', column: 'pre_draft_bill_approved', param: 'dcnDraftBillApprovedMinister' },
    { field: 'circulated_imc_date', column: 'circulated_imc', param: 'circulatedImc' },
    { field: 'imc_comments_rec_date', column: 'imc_comments_rec', param: 'imcCommentsRec' },
    { field: 'dcn_draft_bill_prepared_date', column: 'dcn_draft_bill_prepared', param: 'dcnDraftBillPrepared' },
    { field: 'dcn_draft_bill_approved_date', column: 'dcn_draft_bill_approved', param: 'dcnDraftBillApproved' },
    { field: 'submitted_legal_vetting_date', column: 'submited_legal_vetting', param: 'submittedLegalVetting' },
    { field: 'legal_vetting_completed_date', column: 'legal_vetting_completed', param: 'legalVettingCompleted' },
    { field: 'final_dcn_draft_approved_date', column: 'final_dcn_approved', param: 'finalDcnDraftApproved' },
    { field: 'advance_copy_date', column: 'advance_copy', param: 'advanceCopy' },
    { field: 'approved_by_cabinet_date', column: 'approved_by_cabinet', param: 'approvedByCabinet' },
    { field: 'bill_introduced_in_parliament_date', column: 'bill_introduced_in_parliament', param: 'billIntroducedInParliament' },
    { field: 'bill_passed_date', column: 'bill_passed', param: 'billPassed' },
    { field: 'bill_notified_date', column: 'bill_notified', param: 'billNotified' },
    { field: 'completed_date', column: 'completed', param: 'completed' },
].map((s) => ({ ...s, remark: s.field.replace(/_date$/, '_remarks') }));

// A bill as the API returns it: tbl_bill's columns under 3.0's field names
const BILL_COLUMNS = `tbl_bill.bill_id, subject, wing, division, stage_id,
            ${STAGES.map((s) => `${s.column}_date AS ${s.field}, ${s.remark}`).join(',\n            ')},
            remarks, tbl_bill.created_by, tbl_bill.updated_by, tbl_bill.created_date, tbl_bill.updated_date`;
const doneFlag = (s) => `CASE WHEN @${s.param}Date IS NULL THEN 0 ELSE 1 END`;

async function createBill(req, res) {
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;

    let draftBillPreparedDate = req.body.draftBillPreparedDate || req.body.preDraftBillPrepDate || null;
    let draftBillPreparedRemark = req.body.draftBillPreparedRemark || req.body.preDraftBillPrepRemark || null;

    let dcnDraftBillApprovedMinisterDate = req.body.dcnDraftBillApprovedMinisterDate || req.body.preDraftBillApprovedDate || null;
    let dcnDraftBillApprovedMinisterRemark = req.body.dcnDraftBillApprovedMinisterRemark || req.body.preDraftBillApprovedRemark || null;

    let circulatedImcDate = req.body.circulatedImcDate || null;
    let circulatedImcRemark = req.body.circulatedImcRemark || null;

    let imcCommentsRecDate = req.body.imcCommentsRecDate || null;
    let imcCommentsRecRemark = req.body.imcCommentsRecRemark || null;

    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate || null;
    let dcnDraftBillPreparedRemark = req.body.dcnDraftBillPreparedRemark || null;

    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate || null;
    let dcnDraftBillApprovedRemark = req.body.dcnDraftBillApprovedRemark || null;

    let submittedLegalVettingDate = req.body.submittedLegalVettingDate || req.body.submitedLegalVettingDate || null;
    let submittedLegalVettingRemark = req.body.submittedLegalVettingRemark || req.body.submitedLegalVettingRemark || null;

    let legalVettingCompletedDate = req.body.legalVettingCompletedDate || null;
    let legalVettingCompletedRemark = req.body.legalVettingCompletedRemark || null;

    let finalDcnDraftApprovedDate = req.body.finalDcnDraftApprovedDate || req.body.finalDcnApprovedDate || null;
    let finalDcnDraftApprovedRemark = req.body.finalDcnDraftApprovedRemark || req.body.finalDcnApprovedRemark || null;

    let advanceCopyDate = req.body.advanceCopyDate || null;
    let advanceCopyRemark = req.body.advanceCopyRemark || null;

    let approvedByCabinetDate = req.body.approvedByCabinetDate || null;
    let approvedByCabinetRemark = req.body.approvedByCabinetRemark || null;

    let billIntroducedInParliamentDate = req.body.billIntroducedInParliamentDate || null;
    let billIntroducedInParliamentRemark = req.body.billIntroducedInParliamentRemark || null;

    let billPassedDate = req.body.billPassedDate || null;
    let billPassedRemark = req.body.billPassedRemark || null;

    let billNotifiedDate = req.body.billNotifiedDate || null;
    let billNotifiedRemark = req.body.billNotifiedRemark || null;

    let completedDate = req.body.completedDate || null;
    let completedRemark = req.body.completedRemark || null;

    const remarks = req.body.remarks || '';
    const selectedBillStage = req.body.selectedBillStage || null;    
    const userID = req.user.userId; // the signed-in user, not a form value

    if (draftBillPreparedDate === "") draftBillPreparedDate = null;
    if (draftBillPreparedRemark === "") draftBillPreparedRemark = null;
    if (dcnDraftBillApprovedMinisterDate === "") dcnDraftBillApprovedMinisterDate = null;
    if (dcnDraftBillApprovedMinisterRemark === "") dcnDraftBillApprovedMinisterRemark = null;
    if (circulatedImcDate === "") circulatedImcDate = null;
    if (circulatedImcRemark === "") circulatedImcRemark = null;
    if (imcCommentsRecDate === "") imcCommentsRecDate = null;
    if (imcCommentsRecRemark === "") imcCommentsRecRemark = null;
    if (dcnDraftBillPreparedDate === "") dcnDraftBillPreparedDate = null;
    if (dcnDraftBillPreparedRemark === "") dcnDraftBillPreparedRemark = null;
    if (dcnDraftBillApprovedDate === "") dcnDraftBillApprovedDate = null;
    if (dcnDraftBillApprovedRemark === "") dcnDraftBillApprovedRemark = null;
    if (submittedLegalVettingDate === "") submittedLegalVettingDate = null;
    if (submittedLegalVettingRemark === "") submittedLegalVettingRemark = null;
    if (legalVettingCompletedDate === "") legalVettingCompletedDate = null;
    if (legalVettingCompletedRemark === "") legalVettingCompletedRemark = null;
    if (finalDcnDraftApprovedDate === "") finalDcnDraftApprovedDate = null;
    if (finalDcnDraftApprovedRemark === "") finalDcnDraftApprovedRemark = null;
    if (advanceCopyDate === "") advanceCopyDate = null;
    if (advanceCopyRemark === "") advanceCopyRemark = null;
    if (approvedByCabinetDate === "") approvedByCabinetDate = null;
    if (approvedByCabinetRemark === "") approvedByCabinetRemark = null;
    if (billIntroducedInParliamentDate === "") billIntroducedInParliamentDate = null;
    if (billIntroducedInParliamentRemark === "") billIntroducedInParliamentRemark = null;
    if (billPassedDate === "") billPassedDate = null;
    if (billPassedRemark === "") billPassedRemark = null;
    if (billNotifiedDate === "") billNotifiedDate = null;
    if (billNotifiedRemark === "") billNotifiedRemark = null;
    if (completedDate === "") completedDate = null;
    if (completedRemark === "") completedRemark = null;

    const conn = await pool;
    const request = conn.request();
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("draftBillPreparedDate", draftBillPreparedDate);
    request.input("draftBillPreparedRemark", draftBillPreparedRemark);
    request.input("dcnDraftBillApprovedMinisterDate", dcnDraftBillApprovedMinisterDate);
    request.input("dcnDraftBillApprovedMinisterRemark", dcnDraftBillApprovedMinisterRemark);
    request.input("circulatedImcDate", circulatedImcDate);
    request.input("circulatedImcRemark", circulatedImcRemark);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("imcCommentsRecRemark", imcCommentsRecRemark);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);
    request.input("dcnDraftBillPreparedRemark", dcnDraftBillPreparedRemark);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("dcnDraftBillApprovedRemark", dcnDraftBillApprovedRemark);
    request.input("submittedLegalVettingDate", submittedLegalVettingDate);
    request.input("submittedLegalVettingRemark", submittedLegalVettingRemark);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);
    request.input("legalVettingCompletedRemark", legalVettingCompletedRemark);
    request.input("finalDcnDraftApprovedDate", finalDcnDraftApprovedDate);
    request.input("finalDcnDraftApprovedRemark", finalDcnDraftApprovedRemark);
    request.input("advanceCopyDate", advanceCopyDate);
    request.input("advanceCopyRemark", advanceCopyRemark);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("approvedByCabinetRemark", approvedByCabinetRemark);
    request.input("billIntroducedInParliamentDate", billIntroducedInParliamentDate);
    request.input("billIntroducedInParliamentRemark", billIntroducedInParliamentRemark);
    request.input("billPassedDate", billPassedDate);
    request.input("billPassedRemark", billPassedRemark);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("billNotifiedRemark", billNotifiedRemark);
    request.input("completedDate", completedDate);
    request.input("completedRemark", completedRemark);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);    
    request.input("userID", userID);

    try {
        await request.query(`INSERT INTO tbl_bill (
            subject, wing, division,
            ${STAGES.map((st) => `${st.column}_date, ${st.column}, ${st.remark}`).join(', ')},
            remarks, stage_id, created_by, created_date, updated_date
        ) VALUES (
            @subject, @wing, @division,
            ${STAGES.map((st) => `@${st.param}Date, ${doneFlag(st)}, @${st.param}Remark`).join(', ')},
            @remarks, @selectedBillStage, @userID, GETDATE(), GETDATE()
        )`);
        res.sendStatus(201);  
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getBill(req, res) {
    const conn = await pool;
    try {
        const userID = req.user.userId; // scope by the signed-in user, not a URL value
        let scopeClause = '';
        const request = conn.request();

        // Same scoping as Audit Para: MOPSW admin/other-user/wing-head/
        // division-head roles see everything; any other role
        // (organisation-level users) is scoped to their own wing, or to
        // records they personally created.
        if (userID) {
            request.input("scopeUserId", userID);
            const userResult = await request.query(`SELECT role_id, wing_id FROM tbl_user WHERE user_id = @scopeUserId`);
            const { role_id, wing_id } = userResult.recordset[0] || {};
            const isMopswRole = [2, 3, 4, 5, 8].includes(role_id);
            if (!isMopswRole) {
                request.input("userWingId", wing_id);
                request.input("requestingUserId", userID);
                scopeClause = `WHERE (tbl_bill.wing = @userWingId OR tbl_bill.created_by = @requestingUserId)`;
            }
        }

        const result = await request.query(`SELECT ${BILL_COLUMNS},
            wing_name, division_name, bill_stage_name
            FROM tbl_bill
            INNER JOIN mmt_division ON tbl_bill.division = mmt_division.division_id
            INNER JOIN mmt_wings ON tbl_bill.wing = mmt_wings.wing_id
            LEFT JOIN mmt_bill_stage ON mmt_bill_stage.bill_stage_id = tbl_bill.stage_id
            ${scopeClause}
            ORDER BY tbl_bill.bill_id DESC;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateBill(req, res) {
    const billID = req.params.billID;
    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    try {
        const result = await request.query(`SELECT ${BILL_COLUMNS} FROM tbl_bill WHERE bill_id = @billID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function updateBill(req, res) {
    const billID = req.body.billID;
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;

    let draftBillPreparedDate = req.body.draftBillPreparedDate || req.body.preDraftBillPrepDate || null;
    let draftBillPreparedRemark = req.body.draftBillPreparedRemark || req.body.preDraftBillPrepRemark || null;

    let dcnDraftBillApprovedMinisterDate = req.body.dcnDraftBillApprovedMinisterDate || req.body.preDraftBillApprovedDate || null;
    let dcnDraftBillApprovedMinisterRemark = req.body.dcnDraftBillApprovedMinisterRemark || req.body.preDraftBillApprovedRemark || null;

    let circulatedImcDate = req.body.circulatedImcDate || null;
    let circulatedImcRemark = req.body.circulatedImcRemark || null;

    let imcCommentsRecDate = req.body.imcCommentsRecDate || null;
    let imcCommentsRecRemark = req.body.imcCommentsRecRemark || null;

    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate || null;
    let dcnDraftBillPreparedRemark = req.body.dcnDraftBillPreparedRemark || null;

    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate || null;
    let dcnDraftBillApprovedRemark = req.body.dcnDraftBillApprovedRemark || null;

    let submittedLegalVettingDate = req.body.submittedLegalVettingDate || req.body.submitedLegalVettingDate || null;
    let submittedLegalVettingRemark = req.body.submittedLegalVettingRemark || req.body.submitedLegalVettingRemark || null;

    let legalVettingCompletedDate = req.body.legalVettingCompletedDate || null;
    let legalVettingCompletedRemark = req.body.legalVettingCompletedRemark || null;

    let finalDcnDraftApprovedDate = req.body.finalDcnDraftApprovedDate || req.body.finalDcnApprovedDate || null;
    let finalDcnDraftApprovedRemark = req.body.finalDcnDraftApprovedRemark || req.body.finalDcnApprovedRemark || null;

    let advanceCopyDate = req.body.advanceCopyDate || null;
    let advanceCopyRemark = req.body.advanceCopyRemark || null;

    let approvedByCabinetDate = req.body.approvedByCabinetDate || null;
    let approvedByCabinetRemark = req.body.approvedByCabinetRemark || null;

    let billIntroducedInParliamentDate = req.body.billIntroducedInParliamentDate || null;
    let billIntroducedInParliamentRemark = req.body.billIntroducedInParliamentRemark || null;

    let billPassedDate = req.body.billPassedDate || null;
    let billPassedRemark = req.body.billPassedRemark || null;

    let billNotifiedDate = req.body.billNotifiedDate || null;
    let billNotifiedRemark = req.body.billNotifiedRemark || null;

    let completedDate = req.body.completedDate || null;
    let completedRemark = req.body.completedRemark || null;

    const remarks = req.body.remarks || '';
    const selectedBillStage = req.body.selectedBillStage || null;  
    const userID = req.user.userId; // the signed-in user, not a form value

    if (draftBillPreparedDate === "") draftBillPreparedDate = null;
    if (draftBillPreparedRemark === "") draftBillPreparedRemark = null;
    if (dcnDraftBillApprovedMinisterDate === "") dcnDraftBillApprovedMinisterDate = null;
    if (dcnDraftBillApprovedMinisterRemark === "") dcnDraftBillApprovedMinisterRemark = null;
    if (circulatedImcDate === "") circulatedImcDate = null;
    if (circulatedImcRemark === "") circulatedImcRemark = null;
    if (imcCommentsRecDate === "") imcCommentsRecDate = null;
    if (imcCommentsRecRemark === "") imcCommentsRecRemark = null;
    if (dcnDraftBillPreparedDate === "") dcnDraftBillPreparedDate = null;
    if (dcnDraftBillPreparedRemark === "") dcnDraftBillPreparedRemark = null;
    if (dcnDraftBillApprovedDate === "") dcnDraftBillApprovedDate = null;
    if (dcnDraftBillApprovedRemark === "") dcnDraftBillApprovedRemark = null;
    if (submittedLegalVettingDate === "") submittedLegalVettingDate = null;
    if (submittedLegalVettingRemark === "") submittedLegalVettingRemark = null;
    if (legalVettingCompletedDate === "") legalVettingCompletedDate = null;
    if (legalVettingCompletedRemark === "") legalVettingCompletedRemark = null;
    if (finalDcnDraftApprovedDate === "") finalDcnDraftApprovedDate = null;
    if (finalDcnDraftApprovedRemark === "") finalDcnDraftApprovedRemark = null;
    if (advanceCopyDate === "") advanceCopyDate = null;
    if (advanceCopyRemark === "") advanceCopyRemark = null;
    if (approvedByCabinetDate === "") approvedByCabinetDate = null;
    if (approvedByCabinetRemark === "") approvedByCabinetRemark = null;
    if (billIntroducedInParliamentDate === "") billIntroducedInParliamentDate = null;
    if (billIntroducedInParliamentRemark === "") billIntroducedInParliamentRemark = null;
    if (billPassedDate === "") billPassedDate = null;
    if (billPassedRemark === "") billPassedRemark = null;
    if (billNotifiedDate === "") billNotifiedDate = null;
    if (billNotifiedRemark === "") billNotifiedRemark = null;
    if (completedDate === "") completedDate = null;
    if (completedRemark === "") completedRemark = null;

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("draftBillPreparedDate", draftBillPreparedDate);
    request.input("draftBillPreparedRemark", draftBillPreparedRemark);
    request.input("dcnDraftBillApprovedMinisterDate", dcnDraftBillApprovedMinisterDate);
    request.input("dcnDraftBillApprovedMinisterRemark", dcnDraftBillApprovedMinisterRemark);
    request.input("circulatedImcDate", circulatedImcDate);
    request.input("circulatedImcRemark", circulatedImcRemark);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("imcCommentsRecRemark", imcCommentsRecRemark);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);
    request.input("dcnDraftBillPreparedRemark", dcnDraftBillPreparedRemark);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("dcnDraftBillApprovedRemark", dcnDraftBillApprovedRemark);
    request.input("submittedLegalVettingDate", submittedLegalVettingDate);
    request.input("submittedLegalVettingRemark", submittedLegalVettingRemark);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);
    request.input("legalVettingCompletedRemark", legalVettingCompletedRemark);
    request.input("finalDcnDraftApprovedDate", finalDcnDraftApprovedDate);
    request.input("finalDcnDraftApprovedRemark", finalDcnDraftApprovedRemark);
    request.input("advanceCopyDate", advanceCopyDate);
    request.input("advanceCopyRemark", advanceCopyRemark);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("approvedByCabinetRemark", approvedByCabinetRemark);
    request.input("billIntroducedInParliamentDate", billIntroducedInParliamentDate);
    request.input("billIntroducedInParliamentRemark", billIntroducedInParliamentRemark);
    request.input("billPassedDate", billPassedDate);
    request.input("billPassedRemark", billPassedRemark);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("billNotifiedRemark", billNotifiedRemark);
    request.input("completedDate", completedDate);
    request.input("completedRemark", completedRemark);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);  
    request.input("userID", userID);

    try {
        await request.query(`UPDATE tbl_bill SET
            subject = @subject,
            wing = @wing,
            division = @division,
            ${STAGES.map((st) => `${st.column}_date = @${st.param}Date, ${st.column} = ${doneFlag(st)}, ${st.remark} = @${st.param}Remark`).join(',\n            ')},
            remarks = @remarks,
            stage_id = @selectedBillStage,
            updated_by = @userID,
            updated_date = GETDATE()
            WHERE bill_id = @billID`);
        res.sendStatus(201);  
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteBill(req, res) {
    const billID = req.params.billID;
    const userID = req.user.userId; // logged as the deleting user

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const hourPart = String(now.getHours()).padStart(2, '0'); 
    const minutePart = String(now.getMinutes()).padStart(2, '0'); 
    const secondPart = String(now.getSeconds()).padStart(2, '0'); 
    const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
    const logFolder = `./delete_log/Bills_PreConstitutions`;
    const logFileName = `${logFolder}/deleted_Bills_log_${timestamp}.txt`;

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    try {        
        const dataToDelete = await request.query(`SELECT * FROM tbl_bill WHERE bill_id = @billID;`);
        if (dataToDelete.recordset.length === 0) {
            return res.status(404).send("Data not found");
        }
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
        const result = await request.query(`DELETE FROM tbl_bill WHERE bill_id = @billID;`);
        
        if (result.rowsAffected[0] > 0) {
            const logMessage = `User '${userID}' deleted Bills PreConstitutions data with Data ID '${billID}'. Deleted Data: ${dataJSON}\n`;
            if (!fs.existsSync(logFolder)) {
                fs.mkdirSync(logFolder, { recursive: true });
            }
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to deleted log:', err);
                }
            });
            return res.sendStatus(201);
        } else {
            return res.status(404).send("Data not found");
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

export default { createBill, getBill, getUpdateBill, updateBill, deleteBill };