
import { pool } from "../../db.js";
import fs from 'fs';

async function createVipReference(req, res) {
    const subject = req.body.vipSubject;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    const wing = req.body.wing;
    const division = req.body.division;
    const refLetterNum = req.body.referenceLetterNumber;
    const receivedFrom = req.body.receivedFrom;
    const receivedAtMinistry = req.body.vipReceivedMinistry;
    let receivedAtMinistryDate = req.body.vipReceivedMinistryDate;
    const submittedForApproval = req.body.vipSubmittedForApproval;
    let submittedForApprovalDate = req.body.vipSubmittedForApprovalDate;
    const commentsReceived = req.body.vipCommentsReceived;
    let commentsReceivedDate = req.body.vipCommentsReceivedDate;
    const commentsSought = req.body.vipCommentsSought;
    let commentsSoughtDate = req.body.vipCommentsSoughtDate;
    const replyFurnished = req.body.vipReplyFurnished;
    let replyFurnishedDate = req.body.vipReplyFurnishedDate;
    const disposed = req.body.vipDisposed;
    let disposedDate = req.body.vipDisposedDate;
    const remarks = req.body.vipRemarks;
    let selectedStage = req.body.selectedStage;
    let deadline = req.body.deadline;
    const userID = req.body.userID;


    if (receivedAtMinistryDate == "") {
        receivedAtMinistryDate = null;
    }
    if (submittedForApprovalDate == "") {
        submittedForApprovalDate = null;
    }
    if (commentsReceivedDate == "") {
        commentsReceivedDate = null;
    }
    if (commentsSoughtDate == "") {
        commentsSoughtDate = null;
    }
    if (replyFurnishedDate == "") {
        replyFurnishedDate = null;
    }
    if (deadline == "") {
        deadline = null;
    }
    if (disposedDate == "") {
        disposedDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("subject", subject);
    request.input("eofficeFileNumber", eofficeFileNumber);
    request.input("wing", wing);
    request.input("division", division);
    request.input("refLetterNum", refLetterNum);
    request.input("receivedFrom", receivedFrom);
    request.input("receivedAtMinistry", receivedAtMinistry);
    request.input("receivedAtMinistryDate", receivedAtMinistryDate);
    request.input("submittedForApproval", submittedForApproval);
    request.input("submittedForApprovalDate", submittedForApprovalDate);
    request.input("commentsReceived", commentsReceived);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("commentsSought", commentsSought);
    request.input("commentsSoughtDate", commentsSoughtDate);
    request.input("replyFurnished", replyFurnished);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);
    request.input("selectedStage", selectedStage);
    request.input("remarks", remarks);
    request.input("deadline", deadline);
    request.input("userID", userID);

    try {
        const result = await request.query(`INSERT INTO tbl_vip_reference (subject, eoffice_file_number, stage_id, wing, division, ref_letter_num, 
            received_from, received_at_ministry, received_at_ministry_date, submitted_for_approval, submitted_for_approval_date, 
            comments_received, comments_received_date, comments_sought, comments_sought_date, reply_furnished, reply_furnished_date, 
            disposed, disposed_date, remarks, deadline, created_by)
            OUTPUT INSERTED.vip_reference_id
            VALUES (@subject, @eofficeFileNumber, @selectedStage, @wing, @division, @refLetterNum, @receivedFrom, @receivedAtMinistry, @receivedAtMinistryDate, 
            @submittedForApproval, @submittedForApprovalDate, @commentsReceived, @commentsReceivedDate, 
            @commentsSought, @commentsSoughtDate, @replyFurnished, @replyFurnishedDate, @disposed, @disposedDate, 
            @remarks,@deadline, @userID);
        `);

        const vip_reference_id = result.recordset[0].vip_reference_id;
        res.status(201).json({ vip_reference_id });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function updateVipReference(req, res) {
    const vipReferenceID = req.body.vipReferenceID;
    const subject = req.body.vipSubject;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    const refLetterNum = req.body.referenceLetterNumber;
    const receivedFrom = req.body.receivedFrom;
    const receivedAtMinistry = req.body.vipReceivedMinistry;
    let receivedAtMinistryDate = req.body.vipReceivedMinistryDate;
    const submittedForApproval = req.body.vipSubmittedForApproval;
    let submittedForApprovalDate = req.body.vipSubmittedForApprovalDate;
    const commentsReceived = req.body.vipCommentsReceived;
    let commentsReceivedDate = req.body.vipCommentsReceivedDate;
    const commentsSought = req.body.vipCommentsSought;
    let commentsSoughtDate = req.body.vipCommentsSoughtDate;
    const replyFurnished = req.body.vipReplyFurnished;
    let replyFurnishedDate = req.body.vipReplyFurnishedDate;
    const disposed = req.body.vipDisposed;
    let disposedDate = req.body.vipDisposedDate;
    const remarks = req.body.vipRemarks;
    let selectedStage = req.body.selectedStage;
    let deadline = req.body.deadline;
    const userID = req.body.userID;

    if (receivedAtMinistryDate == "") {
        receivedAtMinistryDate = null;
    }
    if (submittedForApprovalDate == "") {
        submittedForApprovalDate = null;
    }
    if (commentsReceivedDate == "") {
        commentsReceivedDate = null;
    }
    if (commentsSoughtDate == "") {
        commentsSoughtDate = null;
    }
    if (replyFurnishedDate == "") {
        replyFurnishedDate = null;
    }
    if (deadline == "") {
        deadline = null;
    }
    if (disposedDate == "") {
        disposedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("vipReferenceID", vipReferenceID);
    request.input("subject", subject);
    request.input("eofficeFileNumber", eofficeFileNumber);
    request.input("refLetterNum", refLetterNum);
    request.input("receivedFrom", receivedFrom);
    request.input("receivedAtMinistry", receivedAtMinistry);
    request.input("receivedAtMinistryDate", receivedAtMinistryDate);
    request.input("submittedForApproval", submittedForApproval);
    request.input("submittedForApprovalDate", submittedForApprovalDate);
    request.input("commentsReceived", commentsReceived);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("commentsSought", commentsSought);
    request.input("commentsSoughtDate", commentsSoughtDate);
    request.input("replyFurnished", replyFurnished);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);
    request.input("remarks", remarks);
    request.input("selectedStage", selectedStage);
    request.input("deadline", deadline);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_vip_reference
            SET
            subject = @subject,
            eoffice_file_number = @eofficeFileNumber,
            stage_id = @selectedStage,
            ref_letter_num = @refLetterNum,
            received_from = @receivedFrom,
            received_at_ministry = @receivedAtMinistry,
            received_at_ministry_date = @receivedAtMinistryDate,
            submitted_for_approval = @submittedForApproval,
            submitted_for_approval_date = @submittedForApprovalDate,
            comments_received = @commentsReceived,
            comments_received_date = @commentsReceivedDate,
            comments_sought = @commentsSought,
            comments_sought_date = @commentsSoughtDate,
            reply_furnished = @replyFurnished,
            reply_furnished_date = @replyFurnishedDate,
            disposed = @disposed,
            disposed_date = @disposedDate,
            remarks = @remarks,
            updated_by = @userID,
            deadline = @deadline,
            updated_date = getDate()
            OUTPUT INSERTED.vip_reference_id
            WHERE vip_reference_id = @vipReferenceID
        `);

        const vip_reference_id = result.recordset[0].vip_reference_id;
        res.status(201).json({ vip_reference_id });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getVipReference (req, res) 
{
    const conn = await pool;
    const tname = req.params.tname;

    try {
     
        // const result = await conn.query(`SELECT subject, status, ref_letter_num, received_date, received_from,
        //  disposal_date, remarks from tbl_vip_reference;`);
        // res.json(result.recordset);


        const result = await conn.query(`SELECT * from tbl_vip_reference
        INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
        INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
        INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
        ORDER BY stage_id;`);
            res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createVipReferenceStage(req, res) {
    const vipReferenceID = req.body.vipReferenceID;
    const selectedStage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();

    request.input("vipReferenceID", vipReferenceID);
    request.input("selectedStage", selectedStage);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS recordCount
            FROM tbl_vip_reference_stage
            WHERE vip_reference_id = @vipReferenceID
        `);

        if (checkResult.recordset[0].recordCount > 0) {
            const updateResult = await request.query(`
                UPDATE tbl_vip_reference_stage
                SET stage_name = @selectedStage
                WHERE vip_reference_id = @vipReferenceID
            `);
        } else {
            const insertResult = await request.query(`
                INSERT INTO tbl_vip_reference_stage (vip_reference_id, stage_name)
                VALUES (@vipReferenceID, @selectedStage);
            `);
        }

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getUpdateVipReferenceData (req, res) 
{    
    const vipReferenceID = req.params.vipReferenceID;

    const conn = await pool;
    const request = conn.request();
    request.input("vipReferenceID", vipReferenceID);

    try
    {
        const result = await request.query(`SELECT * FROM tbl_vip_reference WHERE tbl_vip_reference.vip_reference_id = @vipReferenceID;`);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteVipReference (req, res) 
{    
    const vipReferenceID = req.params.vipReferenceID;
    // console.log(vipReferenceID);

    const userID = req.params.userID;
    console.log('userID',userID);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const hourPart = String(now.getHours()).padStart(2, '0'); 
    const minutePart = String(now.getMinutes()).padStart(2, '0'); 
    const secondPart = String(now.getSeconds()).padStart(2, '0'); 
    const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
    const logFolder = `./delete_log/Vip_Reference`;
    const logFileName = `${logFolder}/deleted_Vip_Reference_log_${timestamp}.txt`;
    

    const conn = await pool;
    const request = conn.request();
    request.input("vipReferenceID", vipReferenceID);

    try
    {

        const dataToDelete = await request.query(`SELECT * FROM tbl_vip_reference WHERE vip_reference_id = @vipReferenceID;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    
        const result = await request.query(`DELETE FROM tbl_vip_reference WHERE vip_reference_id = @vipReferenceID;`);
        // return res.sendStatus(201);
        console.log('result',result);
        if (result.rowsAffected[0] > 0) {
            
            const logMessage = `User '${userID}' deleted Vip Reference data with Data ID '${vipReferenceID}'. Deleted Data: ${dataJSON}\n`;

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
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


export default { getVipReference, createVipReference, updateVipReference, createVipReferenceStage, getUpdateVipReferenceData, deleteVipReference };