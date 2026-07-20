import { pool } from "../../db.js";
import fs from 'fs';

async function createBill(req, res) {
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    let preDraftBillPrepDate = req.body.preDraftBillPrepDate || null;
    let preDraftBillApprovedDate = req.body.preDraftBillApprovedDate || req.body.preDcnDraftBillApprovedDate || null;
    let circulatedImcDate = req.body.circulatedImcDate || req.body.circulatedForImcDate || null;
    let imcCommentsRecDate = req.body.imcCommentsRecDate || null;
    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate || null;
    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate || null;
    let submitedLegalVettingDate = req.body.submitedLegalVettingDate || req.body.submittedLegalVettingDate || null;
    let legalVettingCompletedDate = req.body.legalVettingCompletedDate || null;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate || null;
    let advanceCopyDate = req.body.advanceCopyDate || req.body.advanceCopyToPmoDate || null;
    let approvedByCabinetDate = req.body.approvedByCabinetDate || null;
    let billIntroducedInParliamentDate = req.body.billIntroducedInParliamentDate || req.body.billIntroducedDate || null;
    let billPassedDate = req.body.billPassedDate || null;
    let billNotifiedDate = req.body.billNotifiedDate || null;
    let completedDate = req.body.completedDate || null;
    const remarks = req.body.remarks || '';
    const selectedBillStage = req.body.selectedBillStage || null;    
    const userID = req.body.userID || null;

    if (preDraftBillPrepDate === "") preDraftBillPrepDate = null;
    if (preDraftBillApprovedDate === "") preDraftBillApprovedDate = null;
    if (circulatedImcDate === "") circulatedImcDate = null;
    if (imcCommentsRecDate === "") imcCommentsRecDate = null;
    if (dcnDraftBillPreparedDate === "") dcnDraftBillPreparedDate = null;
    if (dcnDraftBillApprovedDate === "") dcnDraftBillApprovedDate = null;
    if (submitedLegalVettingDate === "") submitedLegalVettingDate = null;
    if (legalVettingCompletedDate === "") legalVettingCompletedDate = null;
    if (finalDcnApprovedDate === "") finalDcnApprovedDate = null;
    if (advanceCopyDate === "") advanceCopyDate = null;
    if (approvedByCabinetDate === "") approvedByCabinetDate = null;
    if (billIntroducedInParliamentDate === "") billIntroducedInParliamentDate = null;
    if (billPassedDate === "") billPassedDate = null;
    if (billNotifiedDate === "") billNotifiedDate = null;
    if (completedDate === "") completedDate = null;

    const conn = await pool;
    const request = conn.request();
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preDraftBillPrepDate", preDraftBillPrepDate);
    request.input("preDraftBillApprovedDate", preDraftBillApprovedDate);
    request.input("circulatedImcDate", circulatedImcDate);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("submitedLegalVettingDate", submitedLegalVettingDate);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("advanceCopyDate", advanceCopyDate);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("billIntroducedInParliamentDate", billIntroducedInParliamentDate);
    request.input("billPassedDate", billPassedDate);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);    
    request.input("userID", userID);

    try {
        await request.query(`INSERT INTO tbl_bill_change (
            subject, wing, division, 
            pre_draft_bill_prepared_date, pre_draft_bill_approved_date, 
            circulated_imc_date, imc_comments_rec_date, 
            dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, 
            submited_legal_vetting_date, legal_vetting_completed_date, 
            final_dcn_approved_date, advance_copy_date, 
            approved_by_cabinet_date, bill_introduced_in_parliament_date, 
            bill_passed_date, bill_notified_date, 
            completed_date, remarks, stage_id, created_by, created_date, updated_date
        ) VALUES (
            @subject, @wing, @division, 
            @preDraftBillPrepDate, @preDraftBillApprovedDate, 
            @circulatedImcDate, @imcCommentsRecDate, 
            @dcnDraftBillPreparedDate, @dcnDraftBillApprovedDate, 
            @submitedLegalVettingDate, @legalVettingCompletedDate, 
            @finalDcnApprovedDate, @advanceCopyDate, 
            @approvedByCabinetDate, @billIntroducedInParliamentDate, 
            @billPassedDate, @billNotifiedDate, 
            @completedDate, @remarks, @selectedBillStage, @userID, GETDATE(), GETDATE()
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
        const result = await conn.query(`SELECT bill_id, subject, wing, division, stage_id,
            pre_draft_bill_prepared_date, pre_draft_bill_approved_date, 
            circulated_imc_date, imc_comments_rec_date, 
            dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, 
            submited_legal_vetting_date, legal_vetting_completed_date, 
            final_dcn_approved_date, advance_copy_date, 
            approved_by_cabinet_date, bill_introduced_in_parliament_date, 
            bill_passed_date, bill_notified_date, 
            completed_date, remarks, created_by, updated_by, created_date, updated_date,
            wing_name, division_name, bill_stage_name
            FROM tbl_bill_change
            INNER JOIN mmt_division ON tbl_bill_change.division = mmt_division.division_id
            INNER JOIN mmt_wings ON tbl_bill_change.wing = mmt_wings.wing_id
            LEFT JOIN mmt_bill_stage ON mmt_bill_stage.bill_stage_id = tbl_bill_change.stage_id
            ORDER BY tbl_bill_change.bill_id DESC;`);
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
        const result = await request.query(`SELECT * FROM tbl_bill_change WHERE bill_id = @billID;`);
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
    let preDraftBillPrepDate = req.body.preDraftBillPrepDate || null;
    let preDraftBillApprovedDate = req.body.preDraftBillApprovedDate || req.body.preDcnDraftBillApprovedDate || null;
    let circulatedImcDate = req.body.circulatedImcDate || req.body.circulatedForImcDate || null;
    let imcCommentsRecDate = req.body.imcCommentsRecDate || null;
    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate || null;
    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate || null;
    let submitedLegalVettingDate = req.body.submitedLegalVettingDate || req.body.submittedLegalVettingDate || null;
    let legalVettingCompletedDate = req.body.legalVettingCompletedDate || null;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate || null;
    let advanceCopyDate = req.body.advanceCopyDate || req.body.advanceCopyToPmoDate || null;
    let approvedByCabinetDate = req.body.approvedByCabinetDate || null;
    let billIntroducedInParliamentDate = req.body.billIntroducedInParliamentDate || req.body.billIntroducedDate || null;
    let billPassedDate = req.body.billPassedDate || null;
    let billNotifiedDate = req.body.billNotifiedDate || null;
    let completedDate = req.body.completedDate || null;
    const remarks = req.body.remarks || '';
    const selectedBillStage = req.body.selectedBillStage || null;  
    const userID = req.body.userID || null;

    if (preDraftBillPrepDate === "") preDraftBillPrepDate = null;
    if (preDraftBillApprovedDate === "") preDraftBillApprovedDate = null;
    if (circulatedImcDate === "") circulatedImcDate = null;
    if (imcCommentsRecDate === "") imcCommentsRecDate = null;
    if (dcnDraftBillPreparedDate === "") dcnDraftBillPreparedDate = null;
    if (dcnDraftBillApprovedDate === "") dcnDraftBillApprovedDate = null;
    if (submitedLegalVettingDate === "") submitedLegalVettingDate = null;
    if (legalVettingCompletedDate === "") legalVettingCompletedDate = null;
    if (finalDcnApprovedDate === "") finalDcnApprovedDate = null;
    if (advanceCopyDate === "") advanceCopyDate = null;
    if (approvedByCabinetDate === "") approvedByCabinetDate = null;
    if (billIntroducedInParliamentDate === "") billIntroducedInParliamentDate = null;
    if (billPassedDate === "") billPassedDate = null;
    if (billNotifiedDate === "") billNotifiedDate = null;
    if (completedDate === "") completedDate = null;

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preDraftBillPrepDate", preDraftBillPrepDate);
    request.input("preDraftBillApprovedDate", preDraftBillApprovedDate);
    request.input("circulatedImcDate", circulatedImcDate);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("submitedLegalVettingDate", submitedLegalVettingDate);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("advanceCopyDate", advanceCopyDate);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("billIntroducedInParliamentDate", billIntroducedInParliamentDate);
    request.input("billPassedDate", billPassedDate);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);  
    request.input("userID", userID);

    try {
        await request.query(`UPDATE tbl_bill_change SET
            subject = @subject,
            wing = @wing,
            division = @division,
            pre_draft_bill_prepared_date = @preDraftBillPrepDate,
            pre_draft_bill_approved_date = @preDraftBillApprovedDate,
            circulated_imc_date = @circulatedImcDate,
            imc_comments_rec_date = @imcCommentsRecDate,
            dcn_draft_bill_prepared_date = @dcnDraftBillPreparedDate,
            dcn_draft_bill_approved_date = @dcnDraftBillApprovedDate,
            submited_legal_vetting_date = @submitedLegalVettingDate,
            legal_vetting_completed_date = @legalVettingCompletedDate,
            final_dcn_approved_date = @finalDcnApprovedDate,
            advance_copy_date = @advanceCopyDate,
            approved_by_cabinet_date = @approvedByCabinetDate,
            bill_introduced_in_parliament_date = @billIntroducedInParliamentDate,
            bill_passed_date = @billPassedDate,
            bill_notified_date = @billNotifiedDate,
            completed_date = @completedDate,
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
    const userID = req.params.userID;

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
        const dataToDelete = await request.query(`SELECT * FROM tbl_bill_change WHERE bill_id = @billID;`);
        if (dataToDelete.recordset.length === 0) {
            return res.status(404).send("Data not found");
        }
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
        const result = await request.query(`DELETE FROM tbl_bill_change WHERE bill_id = @billID;`);
        
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