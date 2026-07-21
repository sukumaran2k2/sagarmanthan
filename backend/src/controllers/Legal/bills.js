import { pool } from "../../db.js";
import fs from 'fs';

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
    const userID = req.body.userID || null;

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
        await request.query(`INSERT INTO tbl_bill_change (
            subject, wing, division, 
            draft_bill_prepared_date, dcn_draft_bill_approved_minister_date, 
            circulated_imc_date, imc_comments_rec_date, 
            dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, 
            submitted_legal_vetting_date, legal_vetting_completed_date, 
            final_dcn_draft_approved_date, advance_copy_date, 
            approved_by_cabinet_date, bill_introduced_in_parliament_date, 
            bill_passed_date, bill_notified_date, 
            completed_date, remarks, stage_id, created_by, created_date, updated_date,
            draft_bill_prepared_remarks, dcn_draft_bill_approved_minister_remarks,
            circulated_imc_remarks, imc_comments_rec_remarks,
            dcn_draft_bill_prepared_remarks, dcn_draft_bill_approved_remarks,
            submitted_legal_vetting_remarks, legal_vetting_completed_remarks,
            final_dcn_draft_approved_remarks, advance_copy_remarks,
            approved_by_cabinet_remarks, bill_introduced_in_parliament_remarks,
            bill_passed_remarks, bill_notified_remarks, completed_remarks
        ) VALUES (
            @subject, @wing, @division, 
            @draftBillPreparedDate, @dcnDraftBillApprovedMinisterDate, 
            @circulatedImcDate, @imcCommentsRecDate, 
            @dcnDraftBillPreparedDate, @dcnDraftBillApprovedDate, 
            @submittedLegalVettingDate, @legalVettingCompletedDate, 
            @finalDcnDraftApprovedDate, @advanceCopyDate, 
            @approvedByCabinetDate, @billIntroducedInParliamentDate, 
            @billPassedDate, @billNotifiedDate, 
            @completedDate, @remarks, @selectedBillStage, @userID, GETDATE(), GETDATE(),
            @draftBillPreparedRemark, @dcnDraftBillApprovedMinisterRemark,
            @circulatedImcRemark, @imcCommentsRecRemark,
            @dcnDraftBillPreparedRemark, @dcnDraftBillApprovedRemark,
            @submittedLegalVettingRemark, @legalVettingCompletedRemark,
            @finalDcnDraftApprovedRemark, @advanceCopyRemark,
            @approvedByCabinetRemark, @billIntroducedInParliamentRemark,
            @billPassedRemark, @billNotifiedRemark, @completedRemark
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
            draft_bill_prepared_date, dcn_draft_bill_approved_minister_date, 
            circulated_imc_date, imc_comments_rec_date, 
            dcn_draft_bill_prepared_date, dcn_draft_bill_approved_date, 
            submitted_legal_vetting_date, legal_vetting_completed_date, 
            final_dcn_draft_approved_date, advance_copy_date, 
            approved_by_cabinet_date, bill_introduced_in_parliament_date, 
            bill_passed_date, bill_notified_date, 
            completed_date, remarks, created_by, updated_by, created_date, updated_date,
            draft_bill_prepared_remarks, dcn_draft_bill_approved_minister_remarks,
            circulated_imc_remarks, imc_comments_rec_remarks,
            dcn_draft_bill_prepared_remarks, dcn_draft_bill_approved_remarks,
            submitted_legal_vetting_remarks, legal_vetting_completed_remarks,
            final_dcn_draft_approved_remarks, advance_copy_remarks,
            approved_by_cabinet_remarks, bill_introduced_in_parliament_remarks,
            bill_passed_remarks, bill_notified_remarks, completed_remarks,
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
    const userID = req.body.userID || null;

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
        await request.query(`UPDATE tbl_bill_change SET
            subject = @subject,
            wing = @wing,
            division = @division,
            draft_bill_prepared_date = @draftBillPreparedDate,
            dcn_draft_bill_approved_minister_date = @dcnDraftBillApprovedMinisterDate,
            circulated_imc_date = @circulatedImcDate,
            imc_comments_rec_date = @imcCommentsRecDate,
            dcn_draft_bill_prepared_date = @dcnDraftBillPreparedDate,
            dcn_draft_bill_approved_date = @dcnDraftBillApprovedDate,
            submitted_legal_vetting_date = @submittedLegalVettingDate,
            legal_vetting_completed_date = @legalVettingCompletedDate,
            final_dcn_draft_approved_date = @finalDcnDraftApprovedDate,
            advance_copy_date = @advanceCopyDate,
            approved_by_cabinet_date = @approvedByCabinetDate,
            bill_introduced_in_parliament_date = @billIntroducedInParliamentDate,
            bill_passed_date = @billPassedDate,
            bill_notified_date = @billNotifiedDate,
            completed_date = @completedDate,
            remarks = @remarks,
            stage_id = @selectedBillStage,
            updated_by = @userID,
            updated_date = GETDATE(),
            draft_bill_prepared_remarks = @draftBillPreparedRemark,
            dcn_draft_bill_approved_minister_remarks = @dcnDraftBillApprovedMinisterRemark,
            circulated_imc_remarks = @circulatedImcRemark,
            imc_comments_rec_remarks = @imcCommentsRecRemark,
            dcn_draft_bill_prepared_remarks = @dcnDraftBillPreparedRemark,
            dcn_draft_bill_approved_remarks = @dcnDraftBillApprovedRemark,
            submitted_legal_vetting_remarks = @submittedLegalVettingRemark,
            legal_vetting_completed_remarks = @legalVettingCompletedRemark,
            final_dcn_draft_approved_remarks = @finalDcnDraftApprovedRemark,
            advance_copy_remarks = @advanceCopyRemark,
            approved_by_cabinet_remarks = @approvedByCabinetRemark,
            bill_introduced_in_parliament_remarks = @billIntroducedInParliamentRemark,
            bill_passed_remarks = @billPassedRemark,
            bill_notified_remarks = @billNotifiedRemark,
            completed_remarks = @completedRemark
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