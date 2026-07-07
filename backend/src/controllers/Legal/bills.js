
import { pool } from "../../db.js";
import fs from 'fs';

async function createBill(req, res) {
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    const preDraftBillPrep = req.body.preDraftBillPrep;
    let preDraftBillPrepDate = req.body.preDraftBillPrepDate;
    const preDcnDraftBillApproved = req.body.preDcnDraftBillApproved;
    let preDcnDraftBillApprovedDate = req.body.preDcnDraftBillApprovedDate;
    const circulatedForImc = req.body.circulatedForImc;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    const imcCommentsRec = req.body.imcCommentsRec;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    const dcnDraftBillPrepared = req.body.dcnDraftBillPrepared;
    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate;
    const dcnDraftBillApproved = req.body.dcnDraftBillApproved;
    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate;
    const submittedLegalVetting = req.body.submittedLegalVetting;
    let submittedLegalVettingDate = req.body.submittedLegalVettingDate;
    const legalVettingCompleted = req.body.legalVettingCompleted;
    let legalVettingCompletedDate = req.body.legalVettingCompletedDate;
    const finalDcnApproved = req.body.finalDcnApproved;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    const advanceCopyToPmo = req.body.advanceCopyToPmo;
    let advanceCopyToPmoDate = req.body.advanceCopyToPmoDate;
    const approvedByCabinet = req.body.approvedByCabinet;
    let approvedByCabinetDate = req.body.approvedByCabinetDate;
    const billIntroduced = req.body.billIntroduced;
    let billIntroducedDate = req.body.billIntroducedDate;
    const billPassed = req.body.billPassed;
    let billPassedDate = req.body.billPassedDate;
    const billNotified = req.body.billNotified;
    let billNotifiedDate = req.body.billNotifiedDate;
    const completed = req.body.completed;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    const selectedBillStage = req.body.selectedBillStage;    
    const userID = req.body.userID;

    if (preDraftBillPrepDate == "") {
        preDraftBillPrepDate = null;
    }
    if (preDcnDraftBillApprovedDate == "") {
        preDcnDraftBillApprovedDate = null;
    }
    if (circulatedForImcDate == "") {
        circulatedForImcDate = null;
    }
    if (imcCommentsRecDate == "") {
        imcCommentsRecDate = null;
    }
    if (dcnDraftBillPreparedDate == "") {
        dcnDraftBillPreparedDate = null;
    }
    if (dcnDraftBillApprovedDate == "") {
        dcnDraftBillApprovedDate = null;
    }
    if (submittedLegalVettingDate == "") {
        submittedLegalVettingDate = null;
    }
    if (legalVettingCompletedDate == "") {
        legalVettingCompletedDate = null;
    }
    if (finalDcnApprovedDate == "") {
        finalDcnApprovedDate = null;
    }
    if (advanceCopyToPmoDate == "") {
        advanceCopyToPmoDate = null;
    }
    if (approvedByCabinetDate == "") {
        approvedByCabinetDate = null;
    }
    if (billIntroducedDate == "") {
        billIntroducedDate = null;
    }
    if (billPassedDate == "") {
        billPassedDate = null;
    }
    if (billNotifiedDate == "") {
        billNotifiedDate = null;
    }
    if (completedDate == "") {
        completedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preDraftBillPrep", preDraftBillPrep);
    request.input("preDraftBillPrepDate", preDraftBillPrepDate);
    request.input("preDcnDraftBillApproved", preDcnDraftBillApproved);
    request.input("preDcnDraftBillApprovedDate", preDcnDraftBillApprovedDate);
    request.input("circulatedForImc", circulatedForImc);
    request.input("circulatedForImcDate", circulatedForImcDate);
    request.input("imcCommentsRec", imcCommentsRec);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("dcnDraftBillPrepared", dcnDraftBillPrepared);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);

    request.input("dcnDraftBillApproved", dcnDraftBillApproved);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("submittedLegalVetting", submittedLegalVetting);
    request.input("submittedLegalVettingDate", submittedLegalVettingDate);
    request.input("legalVettingCompleted", legalVettingCompleted);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);

    request.input("finalDcnApproved", finalDcnApproved);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("advanceCopyToPmo", advanceCopyToPmo);
    request.input("advanceCopyToPmoDate", advanceCopyToPmoDate);

    request.input("approvedByCabinet", approvedByCabinet);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("billIntroduced", billIntroduced);
    request.input("billIntroducedDate", billIntroducedDate);
    request.input("billPassed", billPassed);
    request.input("billPassedDate", billPassedDate);
    request.input("billNotified", billNotified);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("completed", completed);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);    
    request.input("userID", userID);
    try {

        const result = await request.query(`INSERT INTO tbl_bill (subject, wing, division, pre_draft_bill_prepared, 
            pre_draft_bill_prepared_date, pre_draft_bill_approved, pre_draft_bill_approved_date, circulated_imc, 
            circulated_imc_date, imc_comments_rec, imc_comments_rec_date, dcn_draft_bill_prepared, dcn_draft_bill_prepared_date, 
            dcn_draft_bill_approved, dcn_draft_bill_approved_date, submited_legal_vetting, submited_legal_vetting_date, 
            legal_vetting_completed, legal_vetting_completed_date, final_dcn_approved, final_dcn_approved_date, advance_copy,
            advance_copy_date, approved_by_cabinet, approved_by_cabinet_date, bill_introduced_in_parliament, 
            bill_introduced_in_parliament_date, bill_passed, bill_passed_date, bill_notified, 
            bill_notified_date, completed, completed_date, remarks, stage_id, created_by) 
            OUTPUT INSERTED.bill_id
            VALUES (@subject, @wing, @division, @preDraftBillPrep, @preDraftBillPrepDate, @preDcnDraftBillApproved, 
            @preDcnDraftBillApprovedDate, @circulatedForImc, @circulatedForImcDate, @imcCommentsRec, @imcCommentsRecDate, 
            @dcnDraftBillPrepared, @dcnDraftBillPreparedDate, @dcnDraftBillApproved, @dcnDraftBillApprovedDate, 
            @submittedLegalVetting, @submittedLegalVettingDate, @legalVettingCompleted,  @legalVettingCompletedDate,            
            @finalDcnApproved, @finalDcnApprovedDate, @advanceCopyToPmo,
            @advanceCopyToPmoDate, @approvedByCabinet, @approvedByCabinetDate, 
            @billIntroduced, @billIntroducedDate, @billPassed, @billPassedDate, @billNotified,
            @billNotifiedDate, @completed, @completedDate, @remarks, @selectedBillStage, @userID)`);

        // const bill_id = result.recordset[0].bill_id;
        // res.status(201).json({ bill_id });

        res.sendStatus(201);  
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getBill(req, res) {
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT bill_id, bill_stage_name, subject, wing_name, division_name,
        wing, division, pre_draft_bill_prepared, 
        pre_draft_bill_prepared_date, pre_draft_bill_approved, pre_draft_bill_approved_date, circulated_imc, 
        circulated_imc_date, imc_comments_rec, imc_comments_rec_date, dcn_draft_bill_prepared, dcn_draft_bill_prepared_date, 
        dcn_draft_bill_approved, dcn_draft_bill_approved_date, submited_legal_vetting, submited_legal_vetting_date, 
        legal_vetting_completed, legal_vetting_completed_date, final_dcn_approved, final_dcn_approved_date, advance_copy,
        advance_copy_date, approved_by_cabinet, approved_by_cabinet_date, bill_introduced_in_parliament, 
        bill_introduced_in_parliament_date, bill_passed, bill_passed_date, bill_notified, 
        bill_notified_date, completed, completed_date, remarks, stage_id, created_by,updated_date
        
        FROM tbl_bill
        INNER JOIN mmt_division ON tbl_bill.division = mmt_division.division_id
        INNER JOIN mmt_wings ON tbl_bill.wing = mmt_wings.wing_id
        INNER JOIN mmt_bill_stage ON mmt_bill_stage.bill_stage_id = tbl_bill.stage_id
        ORDER BY mmt_bill_stage.bill_stage_id ASC
        ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};



async function getUpdateBill(req, res) {
    const billID = req.params.billID;

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    try {
        const result = await request.query(`SELECT * FROM tbl_bill WHERE tbl_bill.bill_id = @billID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateBill(req, res) {
    const billID = req.body.billID;
    const subject = req.body.subject;
    const preDraftBillPrep = req.body.preDraftBillPrep;
    let preDraftBillPrepDate = req.body.preDraftBillPrepDate;
    const preDcnDraftBillApproved = req.body.preDcnDraftBillApproved;
    let preDcnDraftBillApprovedDate = req.body.preDcnDraftBillApprovedDate;
    const circulatedForImc = req.body.circulatedForImc;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    const imcCommentsRec = req.body.imcCommentsRec;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    const dcnDraftBillPrepared = req.body.dcnDraftBillPrepared;
    let dcnDraftBillPreparedDate = req.body.dcnDraftBillPreparedDate;
    const dcnDraftBillApproved = req.body.dcnDraftBillApproved;
    let dcnDraftBillApprovedDate = req.body.dcnDraftBillApprovedDate;
    const submittedLegalVetting = req.body.submittedLegalVetting;
    let submittedLegalVettingDate = req.body.submittedLegalVettingDate;
    const legalVettingCompleted = req.body.legalVettingCompleted;
    let legalVettingCompletedDate = req.body.legalVettingCompletedDate;
    const finalDcnApproved = req.body.finalDcnApproved;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    const advanceCopyToPmo = req.body.advanceCopyToPmo;
    let advanceCopyToPmoDate = req.body.advanceCopyToPmoDate;
    const approvedByCabinet = req.body.approvedByCabinet;
    let approvedByCabinetDate = req.body.approvedByCabinetDate;
    const billIntroduced = req.body.billIntroduced;
    let billIntroducedDate = req.body.billIntroducedDate;
    const billPassed = req.body.billPassed;
    let billPassedDate = req.body.billPassedDate;
    const billNotified = req.body.billNotified;
    let billNotifiedDate = req.body.billNotifiedDate;
    const completed = req.body.completed;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    const selectedBillStage = req.body.selectedBillStage;    
    const userID = req.body.userID;

    if (preDraftBillPrepDate == "") {
        preDraftBillPrepDate = null;
    }
    if (preDcnDraftBillApprovedDate == "") {
        preDcnDraftBillApprovedDate = null;
    }
    if (circulatedForImcDate == "") {
        circulatedForImcDate = null;
    }
    if (imcCommentsRecDate == "") {
        imcCommentsRecDate = null;
    }
    if (dcnDraftBillPreparedDate == "") {
        dcnDraftBillPreparedDate = null;
    }
    if (dcnDraftBillApprovedDate == "") {
        dcnDraftBillApprovedDate = null;
    }
    if (submittedLegalVettingDate == "") {
        submittedLegalVettingDate = null;
    }
    if (legalVettingCompletedDate == "") {
        legalVettingCompletedDate = null;
    }
    if (finalDcnApprovedDate == "") {
        finalDcnApprovedDate = null;
    }
    if (advanceCopyToPmoDate == "") {
        advanceCopyToPmoDate = null;
    }
    if (approvedByCabinetDate == "") {
        approvedByCabinetDate = null;
    }
    if (billIntroducedDate == "") {
        billIntroducedDate = null;
    }
    if (billPassedDate == "") {
        billPassedDate = null;
    }
    if (billNotifiedDate == "") {
        billNotifiedDate = null;
    }
    if (completedDate == "") {
        completedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    request.input("subject", subject);
    request.input("preDraftBillPrep", preDraftBillPrep);
    request.input("preDraftBillPrepDate", preDraftBillPrepDate);
    request.input("preDcnDraftBillApproved", preDcnDraftBillApproved);
    request.input("preDcnDraftBillApprovedDate", preDcnDraftBillApprovedDate);
    request.input("circulatedForImc", circulatedForImc);
    request.input("circulatedForImcDate", circulatedForImcDate);
    request.input("imcCommentsRec", imcCommentsRec);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("dcnDraftBillPrepared", dcnDraftBillPrepared);
    request.input("dcnDraftBillPreparedDate", dcnDraftBillPreparedDate);
    request.input("dcnDraftBillApproved", dcnDraftBillApproved);
    request.input("dcnDraftBillApprovedDate", dcnDraftBillApprovedDate);
    request.input("submittedLegalVetting", submittedLegalVetting);
    request.input("submittedLegalVettingDate", submittedLegalVettingDate);
    request.input("legalVettingCompleted", legalVettingCompleted);
    request.input("legalVettingCompletedDate", legalVettingCompletedDate);
    request.input("finalDcnApproved", finalDcnApproved);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("advanceCopyToPmo", advanceCopyToPmo);
    request.input("advanceCopyToPmoDate", advanceCopyToPmoDate);
    request.input("approvedByCabinet", approvedByCabinet);
    request.input("approvedByCabinetDate", approvedByCabinetDate);
    request.input("billIntroduced", billIntroduced);
    request.input("billIntroducedDate", billIntroducedDate);
    request.input("billPassed", billPassed);
    request.input("billPassedDate", billPassedDate);
    request.input("billNotified", billNotified);
    request.input("billNotifiedDate", billNotifiedDate);
    request.input("completed", completed);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedBillStage", selectedBillStage);  
    request.input("userID", userID);

    try {
        const result = await request.query(`UPDATE tbl_bill SET
            subject = @subject,
            pre_draft_bill_prepared = @preDraftBillPrep,
            pre_draft_bill_prepared_date = @preDraftBillPrepDate,
            pre_draft_bill_approved = @preDcnDraftBillApproved,
            pre_draft_bill_approved_date = @preDcnDraftBillApprovedDate,
            circulated_imc = @circulatedForImc,
            circulated_imc_date = @circulatedForImcDate,
            imc_comments_rec = @imcCommentsRec,
            imc_comments_rec_date = @imcCommentsRecDate,
            dcn_draft_bill_prepared = @dcnDraftBillPrepared,
            dcn_draft_bill_prepared_date = @dcnDraftBillPreparedDate,
            dcn_draft_bill_approved = @dcnDraftBillApproved,
            dcn_draft_bill_approved_date = @dcnDraftBillApprovedDate,
            submited_legal_vetting = @submittedLegalVetting,
            submited_legal_vetting_date = @submittedLegalVettingDate,
            legal_vetting_completed = @legalVettingCompleted,
            legal_vetting_completed_date = @legalVettingCompletedDate,
            final_dcn_approved = @finalDcnApproved,
            final_dcn_approved_date = @finalDcnApprovedDate,
            advance_copy = @advanceCopyToPmo,
            advance_copy_date = @advanceCopyToPmoDate,
            approved_by_cabinet = @approvedByCabinet,
            approved_by_cabinet_date = @approvedByCabinetDate,
            bill_introduced_in_parliament = @billIntroduced,
            bill_introduced_in_parliament_date = @billIntroducedDate,
            bill_passed = @billPassed,
            bill_passed_date = @billPassedDate,
            bill_notified = @billNotified,
            bill_notified_date = @billNotifiedDate,
            completed = @completed,
            completed_date = @completedDate,
            remarks = @remarks,
            stage_id= @selectedBillStage,
            updated_by = @userID,
            updated_date = getDate()
            OUTPUT INSERTED.bill_id
            WHERE bill_id = @billID`);

        // const bill_id = result.recordset[0].bill_id;
        // res.status(201).json({ bill_id });
        res.sendStatus(201);  

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// async function createBillStage(req, res) {
//     const billID = req.body.billID;
//     const stage = req.body.selectedBillStage;

//     const conn = await pool;
//     const request = conn.request();

//     request.input("billID", billID);
//     request.input("stage", stage);

//     try {

//         const checkResult = await request.query(`
//         SELECT COUNT(*) AS recordCount
//         FROM tbl_bill_stage
//         WHERE bill_id = @billID
//     `);

//         if (checkResult.recordset[0].recordCount > 0) {

//             const updateResult = await request.query(`
//             UPDATE tbl_bill_stage
//             SET stage_name = @stage
//             WHERE bill_id = @billID
//         `);
//         } else {

//             const insertResult = await request.query(`
//             INSERT INTO tbl_bill_stage (bill_id, stage_name)
//             VALUES (@billID, @stage);
//         `);
//         }
//         res.sendStatus(201);
//     }


//     catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }

async function deleteBill(req, res) {
    const billID = req.params.billID;
    console.log(billID);

    const userID = req.params.userID;
    console.log('userID',userID);

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
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);

        const result = await request.query(`DELETE FROM tbl_bill WHERE tbl_bill.bill_id = @billID;`);
        
        console.log('console.log', result);
        
        if (result.rowsAffected[0] > 0) {
            const logMessage = `User '${userID}' deleted Bills PreConstitutions data with Data ID '${billID}'. Deleted Data: ${dataJSON}\n`;

            // Append the log message to the log file
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                console.error('Error writing to delete_logs.txt:', err);
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
};

export default { createBill, getBill, getUpdateBill, updateBill, deleteBill };