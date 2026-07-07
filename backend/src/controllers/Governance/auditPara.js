
import { pool } from "../../db.js";
import fs from 'fs';

async function createAuditPara (req, res) 
{
    const auditParaNumber = req.body.auditParaNumber;
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    const category = req.body.category;
    let yetSentForComment = req.body.yetSentForComment;
    let yetSentForCommentDate = req.body.yetSentForCommentDate;
    const commentSoughtOrg = req.body.commentSoughtOrg;
    let commentSoughtOrgDate = req.body.commentSoughtOrgDate;
    const commentReceived = req.body.commentReceived;
    let commentReceivedDate = req.body.commentReceivedDate;
    const underClarification = req.body.underClarification;    
    const commentFurnished = req.body.commentFurnished;
    let commentFurnishedDate = req.body.commentFurnishedDate;
    const cagAccepted = req.body.cagAccepted;
    let cagAcceptedDate = req.body.cagAcceptedDate;
    const disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;
    const remarks = req.body.remarks;
    const userID = req.body.userID;
    const selectedStage = req.body.selectedStage;

    if(yetSentForCommentDate == "")
    {
        yetSentForCommentDate = null;
    }
    if(commentSoughtOrgDate == "")
    {
        commentSoughtOrgDate = null;
    }
    if(commentReceivedDate == "")
    {
        commentReceivedDate = null;
    }
    if(commentFurnishedDate == "")
    {
        commentFurnishedDate = null;
    }
    if(cagAcceptedDate == "")
    {
        cagAcceptedDate = null;
    }
    if(disposedDate == "")
    {
        disposedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("auditParaNumber", auditParaNumber); 
    request.input("subject", subject);  
    request.input("wing", wing);
    request.input("division", division);
    request.input("category", category);
    request.input("yetSentForComment", yetSentForComment);  
    request.input("yetSentForCommentDate", yetSentForCommentDate);
    request.input("commentSoughtOrg", commentSoughtOrg);  
    request.input("commentSoughtOrgDate", commentSoughtOrgDate); 
    request.input("commentReceived", commentReceived);  
    request.input("commentReceivedDate", commentReceivedDate);
    request.input("underClarification", underClarification); 
    request.input("commentFurnished", commentFurnished);  
    request.input("commentFurnishedDate", commentFurnishedDate); 
    request.input("cagAccepted", cagAccepted);  
    request.input("cagAcceptedDate", cagAcceptedDate); 
    request.input("disposed", disposed);  
    request.input("disposedDate", disposedDate); 
    request.input("remarks", remarks);  
    request.input("userID", userID);
    request.input("selectedStage", selectedStage);    
    
    try 
    {    
        const result = await request.query(`INSERT INTO tbl_audit_para (para_number, subject, wing, division, category, 
            received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
            under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
            disposed_date, remarks, stage_id, created_by)
            OUTPUT INSERTED.audit_para_id
            VALUES (@auditParaNumber, @subject, @wing, @division, @category, @yetSentForComment, 
            @yetSentForCommentDate, @commentSoughtOrg, @commentSoughtOrgDate, @commentReceived, @commentReceivedDate, @underClarification,
            @commentFurnished, @commentFurnishedDate, @cagAccepted, @cagAcceptedDate, @disposed,
            @disposedDate, @remarks, @selectedStage, @userID)`);            
            
            const audit_para_id = result.recordset[0].audit_para_id;    
            
            // res.status(201).json({ audit_para_id });   
            res.sendStatus(201);  

    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getAuditPara (req, res) 
{
    const conn = await pool;

    try 
    {
        const result = await conn.query(`SELECT audit_para_id, stage_id, para_number, subject, 
        wing, division, wing_name, division_name, category, 
        received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
        under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
        disposed_date, remarks, stage_id, created_by, audit_para_stage_name,updated_date
        from tbl_audit_para
        INNER JOIN mmt_division ON tbl_audit_para.division = mmt_division.division_id
        INNER JOIN mmt_wings ON tbl_audit_para.wing = mmt_wings.wing_id
        INNER JOIN mmt_audit_para_stage ON mmt_audit_para_stage.audit_para_stage_id = tbl_audit_para.stage_id
        ORDER BY audit_para_stage_id ASC
        ;`);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUpdateAuditData (req, res) 
{    
    const auditParaID = req.params.auditParaID;
     console.log(auditParaID,"audit")
    const conn = await pool;
    const request = conn.request();
    request.input("auditParaID", auditParaID);

    try
    {
        const result = await request.query(`SELECT * FROM tbl_audit_para WHERE tbl_audit_para.audit_para_id = @auditParaID;`);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateAuditPara(req, res) 
{   
    const auditParaID = req.body.auditParaID;
    const auditParaNumber = req.body.auditParaNumber;
    const subject = req.body.subject;
    const category = req.body.category;
    const yetSentForComment = req.body.yetSentForComment;
    let yetSentForCommentDate = req.body.yetSentForCommentDate;
    const commentSoughtOrg = req.body.commentSoughtOrg;
    let commentSoughtOrgDate = req.body.commentSoughtOrgDate;
    const commentReceived = req.body.commentReceived;
    let commentReceivedDate = req.body.commentReceivedDate;
    const underClarification = req.body.underClarification;    
    const commentFurnished = req.body.commentFurnished;        
    let commentFurnishedDate = req.body.commentFurnishedDate;
    const cagAccepted = req.body.cagAccepted;
    let cagAcceptedDate = req.body.cagAcceptedDate;
    const disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;
    const remarks = req.body.remarks;
    const userID = req.body.userID;
    const selectedStage = req.body.selectedStage;

    if(yetSentForCommentDate == "")
    {
        yetSentForCommentDate = null;
    }
    if(commentSoughtOrgDate == "")
    {
        commentSoughtOrgDate = null;
    }
    if(commentReceivedDate == "")
    {
        commentReceivedDate = null;
    }
    if(commentFurnishedDate == "")
    {
        commentFurnishedDate = null;
    }
    if(cagAcceptedDate == "")
    {
        cagAcceptedDate = null;
    }
    if(disposedDate == "")
    {
        disposedDate = null;
    }

    const conn = await pool;
    const request = conn.request();    
    request.input("auditParaID", auditParaID); 
    request.input("auditParaNumber", auditParaNumber); 
    request.input("subject", subject);  
    request.input("category", category);  
    request.input("yetSentForComment", yetSentForComment);
    request.input("yetSentForCommentDate", yetSentForCommentDate);  
    request.input("commentSoughtOrg", commentSoughtOrg); 
    request.input("commentSoughtOrgDate", commentSoughtOrgDate);  
    request.input("commentReceived", commentReceived);
    request.input("commentReceivedDate", commentReceivedDate);  
    request.input("underClarification", underClarification);  
    request.input("commentFurnished", commentFurnished);  
    request.input("commentFurnishedDate", commentFurnishedDate); 
    request.input("cagAccepted", cagAccepted);  
    request.input("cagAcceptedDate", cagAcceptedDate); 
    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);
    request.input("remarks", remarks);
    request.input("userID", userID);
    request.input("selectedStage", selectedStage);   

    try
    {
        const result = await request.query(`UPDATE tbl_audit_para SET para_number = @auditParaNumber, subject = @subject,
        category = @category, received_at_ministry = @yetSentForComment, 
        date_of_receipt = @yetSentForCommentDate, comments_sought = @commentSoughtOrg, comments_sought_date = @commentSoughtOrgDate,
        comments_rec = @commentReceived,  comments_rec_date = @commentReceivedDate, 
        under_clarification = @underClarification, comments_furnished= @commentFurnished,
        comments_furnished_date = @commentFurnishedDate, cag_accepted = @cagAccepted, cag_accepted_date = @cagAcceptedDate, 
        disposed = @disposed, disposed_date = @disposedDate, 
        remarks = @remarks, stage_id = @selectedStage, updated_date = getDate(), updated_by = @userID
        OUTPUT INSERTED.audit_para_id
        WHERE audit_para_id = @auditParaID`);  
        
        const audit_para_id = result.recordset[0].audit_para_id;    

        // res.status(200).json({ audit_para_id }); 
        res.sendStatus(200);
    }
    catch (err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

// async function createAuditParaStage (req, res)
// {
//     const auditParaID = req.body.auditParaID;
//     const stage = req.body.selectedStage;

//     const conn = await pool;
//     const request = conn.request();

//     request.input("auditParaID", auditParaID);
//     request.input("stage", stage);

//     try {
    
//         const checkResult = await request.query(`
//         SELECT COUNT(*) AS recordCount
//         FROM tbl_audit_para_stage
//         WHERE audit_para_id = @auditParaID
//     `);

//     if (checkResult.recordset[0].recordCount > 0) {

//         const updateResult = await request.query(`
//             UPDATE tbl_audit_para_stage
//             SET stage_name = @stage
//             WHERE audit_para_id = @auditParaID
//         `);
//     } else {
  
//         const insertResult = await request.query(`
//             INSERT INTO tbl_audit_para_stage (audit_para_id, stage_name)
//             VALUES (@auditParaID, @stage);
//         `);
//     }
//     res.sendStatus(201); 
// }   

  
//     catch(err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }

async function deleteAuditPara (req, res) 
{    
    const auditParaID = req.params.audit_para_id;
    console.log('audit_para_id',auditParaID);

    const userID = req.params.userID;
    console.log('userID',userID);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const hourPart = String(now.getHours()).padStart(2, '0'); 
    const minutePart = String(now.getMinutes()).padStart(2, '0'); 
    const secondPart = String(now.getSeconds()).padStart(2, '0'); 
    const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
    const logFolder = `./delete_log/Audit_para`;
    const logFileName = `${logFolder}/deleted_Auditpara_log_${timestamp}.txt`;
    
    const conn = await pool;
    const request = conn.request();
    request.input("auditParaID", auditParaID);
    request.input("userID", userID);
    try
    {
        const dataToDelete = await request.query(`SELECT * FROM tbl_audit_para WHERE audit_para_id = @auditParaID;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    
        const result = await request.query(`DELETE FROM tbl_audit_para WHERE audit_para_id = @auditParaID;`);
        console.log('result',result);

        if (result.rowsAffected[0] > 0) {
            const logMessage = `User '${userID}' deleted Audit para data with Data ID '${auditParaID}'. Deleted Data: ${dataJSON}\n`;

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

export default { createAuditPara, getAuditPara, getUpdateAuditData, updateAuditPara, deleteAuditPara };