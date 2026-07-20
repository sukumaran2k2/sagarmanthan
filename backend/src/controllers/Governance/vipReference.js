
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
        const result = await request.query(`INSERT INTO tbl_vip_reference_change (subject, eoffice_file_number, stage_id, wing, division, ref_letter_num, 
            received_from, received_at_ministry_date, submitted_for_approval_date, 
            comments_received_date, comments_sought_date, reply_furnished_date, 
            disposed_date, remarks, deadline, created_by, created_date)
            OUTPUT INSERTED.vip_reference_id
            VALUES (@subject, @eofficeFileNumber, @selectedStage, @wing, @division, @refLetterNum, @receivedFrom, @receivedAtMinistryDate, 
            @submittedForApprovalDate, @commentsReceivedDate, 
            @commentsSoughtDate, @replyFurnishedDate, @disposedDate, 
            @remarks,@deadline, @userID, getDate());
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
    request.input("vipReferenceID", vipReferenceID);
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
    request.input("remarks", remarks);
    request.input("selectedStage", selectedStage);
    request.input("deadline", deadline);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_vip_reference_change
            SET
            subject = @subject,
            eoffice_file_number = @eofficeFileNumber,
            stage_id = @selectedStage,
            wing = @wing,
            division = @division,
            ref_letter_num = @refLetterNum,
            received_from = @receivedFrom,
            received_at_ministry_date = @receivedAtMinistryDate,
            submitted_for_approval_date = @submittedForApprovalDate,
            comments_received_date = @commentsReceivedDate,
            comments_sought_date = @commentsSoughtDate,
            reply_furnished_date = @replyFurnishedDate,
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

/*
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
*/

/*
async function getVipReference(req, res) {
    const conn = await pool;

    // Optional page and limit parameters
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    try {
        if (page && limit) {
            const offset = (page - 1) * limit;
            const request = conn.request();
            request.input('offset', offset);
            request.input('limit', limit);

            const result = await request.query(`
                SELECT *, COUNT(*) OVER() AS total_count 
                FROM tbl_vip_reference
                INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
                ORDER BY stage_id
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

            const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;
            res.json({
                data: result.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } else {
            const result = await conn.query(`
                SELECT * from tbl_vip_reference
                INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
                ORDER BY stage_id;
            `);
            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
*/

/*
async function getVipReference(req, res) {
    const conn = await pool;

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const wing = req.query.wing || null;
    const division = req.query.division || null;
    const status = req.query.status || null;
    const search = req.query.search || null;

    try {
        if (page && limit) {
            const offset = (page - 1) * limit;
            const request = conn.request();
            request.input('offset', offset);
            request.input('limit', limit);
            request.input('wing', wing);
            request.input('division', division);
            request.input('status', status);
            request.input('search', search);

            const result = await request.query(`
                SELECT *, COUNT(*) OVER() AS total_count 
                FROM tbl_vip_reference
                INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
                WHERE 
                    (@wing IS NULL OR @wing = 'All' OR mmt_wings.wing_name = @wing)
                    AND (@division IS NULL OR @division = 'All' OR mmt_division.division_name = @division)
                    AND (@status IS NULL OR @status = 'All' OR mmt_vip_stage.vip_stage_name = @status OR 
                        (
                            (@status = 'Received at Ministry' AND mmt_vip_stage.vip_stage_id = 1) OR
                            (@status = 'Submitted for Approval' AND mmt_vip_stage.vip_stage_id = 2) OR
                            (@status = 'Comments Sought' AND mmt_vip_stage.vip_stage_id = 3) OR
                            (@status = 'Comments Received' AND mmt_vip_stage.vip_stage_id = 4) OR
                            (@status = 'Reply Furnished' AND mmt_vip_stage.vip_stage_id = 5) OR
                            (@status = 'Disposed' AND mmt_vip_stage.vip_stage_id = 6)
                        )
                    )
                    AND (
                        @search IS NULL OR @search = '' 
                        OR tbl_vip_reference.subject LIKE '%' + @search + '%'
                        OR tbl_vip_reference.ref_letter_num LIKE '%' + @search + '%'
                        OR tbl_vip_reference.received_from LIKE '%' + @search + '%'
                        OR mmt_wings.wing_name LIKE '%' + @search + '%'
                        OR mmt_division.division_name LIKE '%' + @search + '%'
                    )
                ORDER BY stage_id
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

            const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;
            res.json({
                data: result.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } else {
            const request = conn.request();
            request.input('wing', wing);
            request.input('division', division);
            request.input('status', status);
            request.input('search', search);

            const result = await request.query(`
                SELECT * from tbl_vip_reference
                INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
                WHERE 
                    (@wing IS NULL OR @wing = 'All' OR mmt_wings.wing_name = @wing)
                    AND (@division IS NULL OR @division = 'All' OR mmt_division.division_name = @division)
                    AND (@status IS NULL OR @status = 'All' OR mmt_vip_stage.vip_stage_name = @status OR 
                        (
                            (@status = 'Received at Ministry' AND mmt_vip_stage.vip_stage_id = 1) OR
                            (@status = 'Submitted for Approval' AND mmt_vip_stage.vip_stage_id = 2) OR
                            (@status = 'Comments Sought' AND mmt_vip_stage.vip_stage_id = 3) OR
                            (@status = 'Comments Received' AND mmt_vip_stage.vip_stage_id = 4) OR
                            (@status = 'Reply Furnished' AND mmt_vip_stage.vip_stage_id = 5) OR
                            (@status = 'Disposed' AND mmt_vip_stage.vip_stage_id = 6)
                        )
                    )
                    AND (
                        @search IS NULL OR @search = '' 
                        OR tbl_vip_reference.subject LIKE '%' + @search + '%'
                        OR tbl_vip_reference.ref_letter_num LIKE '%' + @search + '%'
                        OR tbl_vip_reference.received_from LIKE '%' + @search + '%'
                        OR mmt_wings.wing_name LIKE '%' + @search + '%'
                        OR mmt_division.division_name LIKE '%' + @search + '%'
                    )
                ORDER BY stage_id;
            `);
            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}
*/

async function getVipReference(req, res) {
    const conn = await pool;

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const wing = req.query.wing && req.query.wing !== 'All' ? req.query.wing : null;
    const division = req.query.division && req.query.division !== 'All' ? req.query.division : null;
    const status = req.query.status && req.query.status !== 'All' ? req.query.status : null;
    const search = req.query.search || null;

    try {
        const request = conn.request();
        let whereClauses = [];

        if (wing) {
            whereClauses.push("mmt_wings.wing_name = @wing");
            request.input('wing', wing);
        }
        if (division) {
            whereClauses.push("mmt_division.division_name = @division");
            request.input('division', division);
        }
        if (status) {
            if (status === 'Received at Ministry') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 1");
            } else if (status === 'Submitted for Approval') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 2");
            } else if (status === 'Comments Sought') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 3");
            } else if (status === 'Comments Received') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 4");
            } else if (status === 'Reply Furnished') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 5");
            } else if (status === 'Disposed') {
                whereClauses.push("mmt_vip_stage.vip_stage_id = 6");
            } else {
                whereClauses.push("mmt_vip_stage.vip_stage_name = @status");
                request.input('status', status);
            }
        }
        if (search) {
            whereClauses.push(`(
                tbl_vip_reference_change.subject LIKE '%' + @search + '%'
                OR tbl_vip_reference_change.ref_letter_num LIKE '%' + @search + '%'
                OR tbl_vip_reference_change.received_from LIKE '%' + @search + '%'
                OR mmt_wings.wing_name LIKE '%' + @search + '%'
                OR mmt_division.division_name LIKE '%' + @search + '%'
            )`);
            request.input('search', search);
        }

        const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        if (page && limit) {
            const offset = (page - 1) * limit;
            request.input('offset', offset);
            request.input('limit', limit);

            const result = await request.query(`
                SELECT *, COUNT(*) OVER() AS total_count 
                FROM tbl_vip_reference_change
                INNER JOIN mmt_division ON tbl_vip_reference_change.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference_change.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference_change.stage_id = mmt_vip_stage.vip_stage_id
                ${whereSql}
                ORDER BY stage_id
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

            const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;
            res.json({
                data: result.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } else {
            const query = `
                SELECT * from tbl_vip_reference_change
                INNER JOIN mmt_division ON tbl_vip_reference_change.division = mmt_division.division_id
                INNER JOIN mmt_wings ON tbl_vip_reference_change.wing = mmt_wings.wing_id
                INNER JOIN mmt_vip_stage ON tbl_vip_reference_change.stage_id = mmt_vip_stage.vip_stage_id
                ${whereSql}
                ORDER BY stage_id;
            `;
            const result = await request.query(query);
            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


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
        const result = await request.query(`SELECT * FROM tbl_vip_reference_change WHERE tbl_vip_reference_change.vip_reference_id = @vipReferenceID;`);
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

        const dataToDelete = await request.query(`SELECT * FROM tbl_vip_reference_change WHERE vip_reference_id = @vipReferenceID;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    
        const result = await request.query(`DELETE FROM tbl_vip_reference_change WHERE vip_reference_id = @vipReferenceID;`);
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