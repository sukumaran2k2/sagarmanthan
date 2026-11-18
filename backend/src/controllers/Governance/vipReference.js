
import { pool } from "../../db.js";
import fs from 'fs';
import {applyDataScope} from '../../middleware/dataScope.js';

async function createVipReference(req, res) {

    const subject = req.body.vipSubject;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    const wing = req.body.wing;
    const division = req.body.division;
    const refLetterNum = req.body.referenceLetterNumber;
    const receivedFrom = req.body.receivedFrom;
    let receivedAtMinistryDate = req.body.vipReceivedMinistryDate;
    let submittedForApprovalDate = req.body.vipSubmittedForApprovalDate;
    let commentsReceivedDate = req.body.vipCommentsReceivedDate;
    let commentsSoughtDate = req.body.vipCommentsSoughtDate;
    let replyFurnishedDate = req.body.vipReplyFurnishedDate;
    let disposedDate = req.body.vipDisposedDate;

    const remarks = req.body.vipRemarks;
    const vipReceivedMinistryRemark = req.body.vipReceivedMinistryRemark;
    const vipSubmittedForApprovalRemark = req.body.vipSubmittedForApprovalRemark;
    const vipCommentsSoughtRemark = req.body.vipCommentsSoughtRemark;
    const vipCommentsReceivedRemark = req.body.vipCommentsReceivedRemark;
    const vipReplyFurnishedRemark = req.body.vipReplyFurnishedRemark;

    const vipDisposedRemark = req.body.vipDisposedRemark;
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
    request.input("receivedAtMinistryDate", receivedAtMinistryDate);
    request.input("submittedForApprovalDate", submittedForApprovalDate);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("commentsSoughtDate", commentsSoughtDate);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("disposedDate", disposedDate);
    request.input("selectedStage", selectedStage);
    request.input("remarks", remarks);

    request.input("vipReceivedMinistryRemark", vipReceivedMinistryRemark);
    request.input("vipSubmittedForApprovalRemark", vipSubmittedForApprovalRemark);
    request.input("vipCommentsSoughtRemark", vipCommentsSoughtRemark);
    request.input("vipCommentsReceivedRemark", vipCommentsReceivedRemark);
    request.input("vipReplyFurnishedRemark", vipReplyFurnishedRemark);
    request.input("vipDisposedRemark", vipDisposedRemark);

    request.input("deadline", deadline);
    request.input("userID", userID);

    try {
        const result = await request.query(`INSERT INTO tbl_vip_reference (subject, eoffice_file_number, stage_id, wing, division, ref_letter_num,
            received_from, received_at_ministry_date, submitted_for_approval_date,
            comments_received_date, comments_sought_date, reply_furnished_date, disposed_date,
            remarks, vip_received_ministry_remark, vip_submitted_for_approval_remark, vip_comments_sought_remark,
            vip_comments_received_remark, vip_reply_furnished_remark, vip_disposed_remark,
            deadline, created_by, created_date)
            OUTPUT INSERTED.vip_reference_id
            VALUES (@subject, @eofficeFileNumber, @selectedStage, @wing, @division, @refLetterNum, @receivedFrom,
            @receivedAtMinistryDate, @submittedForApprovalDate,
            @commentsReceivedDate, @commentsSoughtDate, @replyFurnishedDate, @disposedDate,
            @remarks, @vipReceivedMinistryRemark, @vipSubmittedForApprovalRemark, @vipCommentsSoughtRemark,
            @vipCommentsReceivedRemark, @vipReplyFurnishedRemark, @vipDisposedRemark,
            @deadline, @userID, getDate());
        `);

        const vip_reference_id = result.recordset[0].vip_reference_id;
        res.status(201).json({ vip_reference_id });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function updateVipReference(req, res) {
    const {
        vipReferenceID,
        vipSubject: subject,
        eofficeFileNumber,
        wing,
        division,
        referenceLetterNumber: refLetterNum,
        receivedFrom,
        vipReceivedMinistryDate,
        vipSubmittedForApprovalDate,
        vipCommentsReceivedDate,
        vipCommentsSoughtDate,
        vipReplyFurnishedDate,
        vipDisposedDate,
        vipRemarks: remarks,
        vipReceivedMinistryRemark,
        vipSubmittedForApprovalRemark,
        vipCommentsSoughtRemark,
        vipCommentsReceivedRemark,
        vipReplyFurnishedRemark,
        vipDisposedRemark,
        selectedStage,
        deadline,
    } = req.body;

    if (!Number.isInteger(Number(vipReferenceID)) || Number(vipReferenceID) <= 0) {
        return res.status(400).json({ message: "Invalid VIP Reference ID" });
    }

    const toNullable = (value) => value === "" || value == null ? null : value;

    const receivedAtMinistryDate = toNullable(vipReceivedMinistryDate);
    const submittedForApprovalDate = toNullable(vipSubmittedForApprovalDate);
    const commentsReceivedDate = toNullable(vipCommentsReceivedDate);
    const commentsSoughtDate = toNullable(vipCommentsSoughtDate);
    const replyFurnishedDate = toNullable(vipReplyFurnishedDate);
    const disposedDate = toNullable(vipDisposedDate);
    const deadlineDate = toNullable(deadline);

    try {
        const conn = await pool;
        const request = conn.request();

        // Apply record-level access control
        const scope = applyDataScope(request, req.user, {
            strategy: "viaCreatedBy",
            alias: "v",
        });

        request.input("vipReferenceID", Number(vipReferenceID));
        request.input("subject", subject);
        request.input("eofficeFileNumber", eofficeFileNumber);
        request.input("wing", wing);
        request.input("division", division);
        request.input("refLetterNum", refLetterNum);
        request.input("receivedFrom", receivedFrom);
        request.input("receivedAtMinistryDate", receivedAtMinistryDate);
        request.input("submittedForApprovalDate", submittedForApprovalDate);
        request.input("commentsReceivedDate", commentsReceivedDate);
        request.input("commentsSoughtDate", commentsSoughtDate);
        request.input("replyFurnishedDate", replyFurnishedDate);
        request.input("disposedDate", disposedDate);
        request.input("remarks", remarks);

        request.input("vipReceivedMinistryRemark", vipReceivedMinistryRemark);
        request.input("vipSubmittedForApprovalRemark", vipSubmittedForApprovalRemark);
        request.input("vipCommentsSoughtRemark", vipCommentsSoughtRemark);
        request.input("vipCommentsReceivedRemark", vipCommentsReceivedRemark);
        request.input("vipReplyFurnishedRemark", vipReplyFurnishedRemark);
        request.input("vipDisposedRemark", vipDisposedRemark);

        request.input("selectedStage", selectedStage);
        request.input("deadline", deadlineDate);

        // Use the authenticated user ID, not a client-supplied userID
        const authenticatedUserID = req.user?.user_id ?? req.user?.userId;

        if (!authenticatedUserID) {
            return res.status(401).json({ message: "Unauthenticated user" });
        }

        request.input("userID", authenticatedUserID);

        const result = await request.query(`
            UPDATE v
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
                vip_received_ministry_remark = @vipReceivedMinistryRemark,
                vip_submitted_for_approval_remark = @vipSubmittedForApprovalRemark,
                vip_comments_sought_remark = @vipCommentsSoughtRemark,
                vip_comments_received_remark = @vipCommentsReceivedRemark,
                vip_reply_furnished_remark = @vipReplyFurnishedRemark,
                vip_disposed_remark = @vipDisposedRemark,
                updated_by = @userID,
                deadline = @deadline,
                updated_date = GETDATE()

            OUTPUT INSERTED.vip_reference_id

            FROM tbl_vip_reference AS v

            ${scope.joinSql || ""}

            WHERE v.vip_reference_id = @vipReferenceID
            ${scope.whereSql || ""}
        `);

        // No matching row means missing OR outside the user's scope
        if (!result.rowsAffected?.[0]) {
            return res.status(404).json({
                message: "VIP Reference not found",
            });
        }

        return res.status(200).json({
            message: "VIP Reference updated successfully",
            vip_reference_id: result.recordset[0].vip_reference_id,
        });

    } catch (err) {
        console.error("Update VIP Reference Error:", err);
        return res.status(500).json({
            message: "Failed to update VIP Reference",
        });
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
    try {
        const conn = await pool;

        const page = req.query.page ? parseInt(req.query.page, 10) : null;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
        const wing = req.query.wing && req.query.wing !== 'All' ? req.query.wing : null;
        const division = req.query.division && req.query.division !== 'All' ? req.query.division : null;
        const status = req.query.status && req.query.status !== 'All' ? req.query.status : null;
        const search = req.query.search || null;

        // Validate pagination
        if (
            (page !== null && (!Number.isInteger(page) || page < 1)) ||
            (limit !== null && (!Number.isInteger(limit) || limit < 1)) ||
            ((page === null) !== (limit === null))
        ) {
            return res.status(400).json({
                message: "Invalid pagination parameters"
            });
        }

        // Explicit column list
        const selectColumns = `
            tbl_vip_reference.vip_reference_id,
            tbl_vip_reference.stage_id,
            tbl_vip_reference.subject,
            tbl_vip_reference.eoffice_file_number,
            tbl_vip_reference.ref_letter_num,
            tbl_vip_reference.received_from,
            tbl_vip_reference.remarks,
            tbl_vip_reference.deadline,
            tbl_vip_reference.wing AS wing_id,
            tbl_vip_reference.division AS division_id,
            mmt_wings.wing_name,
            mmt_division.division_name,
            mmt_vip_stage.vip_stage_id,
            mmt_vip_stage.vip_stage_name,

            tbl_vip_reference.received_at_ministry_date,
            tbl_vip_reference.vip_received_ministry_remark,

            tbl_vip_reference.submitted_for_approval_date,
            tbl_vip_reference.vip_submitted_for_approval_remark,

            tbl_vip_reference.comments_sought_date,
            tbl_vip_reference.vip_comments_sought_remark,

            tbl_vip_reference.comments_received_date,
            tbl_vip_reference.vip_comments_received_remark,

            tbl_vip_reference.reply_furnished_date,
            tbl_vip_reference.vip_reply_furnished_remark,

            tbl_vip_reference.disposed_date,
            tbl_vip_reference.vip_disposed_remark,

            tbl_vip_reference.created_by,
            tbl_vip_reference.updated_by,
            tbl_vip_reference.created_date,
            tbl_vip_reference.updated_date
        `;

        const request = conn.request();

        let whereClauses = [];

        const scope = applyDataScope(request, req.user, {
            strategy: 'viaCreatedBy',
            alias: 'tbl_vip_reference'
        });

        if (wing) {
            whereClauses.push("mmt_wings.wing_name = @wing" );
            request.input('wing', wing);
        }

        if (division) {
            whereClauses.push("mmt_division.division_name = @division" );
            request.input('division', division);
        }

        if (status) {
            const stageMap = {
                'Received at Ministry': 1,
                'Submitted for Approval': 2,
                'Comments Sought': 3,
                'Comments Received': 4,
                'Reply Furnished': 5,
                'Disposed': 6
            };

            if (stageMap[status]) {
                whereClauses.push( "mmt_vip_stage.vip_stage_id = @stageId");
                request.input('stageId', stageMap[status]);
            } else {
                whereClauses.push("mmt_vip_stage.vip_stage_name = @status");
                request.input('status', status);
            }
        }

        if (search) {
            whereClauses.push(`
                (
                    tbl_vip_reference.subject LIKE '%' + @search + '%'
                    OR tbl_vip_reference.eoffice_file_number LIKE '%' + @search + '%'
                    OR tbl_vip_reference.ref_letter_num LIKE '%' + @search + '%'
                    OR tbl_vip_reference.received_from LIKE '%' + @search + '%'
                    OR mmt_wings.wing_name LIKE '%' + @search + '%'
                    OR mmt_division.division_name LIKE '%' + @search + '%'
                )
            `);

            request.input('search', search);
        }

        let whereSql = whereClauses.length > 0? `WHERE ${whereClauses.join(' AND ')}`: 'WHERE 1 = 1';

        // applyDataScope returns conditions beginning with AND
        whereSql += scope.whereSql || '';

        const fromSql = `
            FROM tbl_vip_reference

            ${scope.joinSql || ''}

            INNER JOIN mmt_division ON tbl_vip_reference.division = mmt_division.division_id
            INNER JOIN mmt_wings ON tbl_vip_reference.wing = mmt_wings.wing_id
            INNER JOIN mmt_vip_stage ON tbl_vip_reference.stage_id = mmt_vip_stage.vip_stage_id
        `;

        if (page !== null && limit !== null) {
            const offset = (page - 1) * limit;

            request.input('offset', offset);
            request.input('limit', limit);

            const result = await request.query(`
                SELECT ${selectColumns}, COUNT(*) OVER() AS total_count
                ${fromSql}
                ${whereSql}

                ORDER BY tbl_vip_reference.stage_id
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

            const total = result.recordset.length > 0 ? result.recordset[0].total_count : 0;

            return res.json({
                data: result.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }

        const result = await request.query(`
            SELECT ${selectColumns}
            ${fromSql}
            ${whereSql}
            ORDER BY tbl_vip_reference.stage_id;
        `);

        return res.json(result.recordset);

    } catch (err) {
        console.error("getVipReference error:", err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

async function createVipReferenceStage(req, res) {
    const vipReferenceID = Number(req.body.vipReferenceID);
    const selectedStage = req.body.selectedStage;

    if (!Number.isInteger(vipReferenceID) || vipReferenceID <= 0) {
        return res.status(400).json({
            message: "Invalid VIP Reference ID",
        });
    }

    if (selectedStage === undefined || selectedStage === null || selectedStage === "") {
        return res.status(400).json({
            message: "Stage is required",
        });
    }

    if (!req.user) {
        return res.status(401).json({
            message: "Unauthenticated user",
        });
    }

    let transaction;

    try {
        const conn = await pool;

        transaction = new sql.Transaction(conn);
        await transaction.begin();

        const request = new sql.Request(transaction);

        request.input("vipReferenceID", vipReferenceID);
        request.input("selectedStage", selectedStage);

        // Apply record-level access control to the parent reference
        const scope = applyDataScope(request, req.user, {
            strategy: "viaCreatedBy",
            alias: "v",
        });

        // Verify that the parent VIP Reference belongs to this user's scope
        const checkResult = await request.query(`
            SELECT TOP 1 v.vip_reference_id

            FROM tbl_vip_reference AS v WITH (UPDLOCK, HOLDLOCK)

            ${scope.joinSql || ""}

            WHERE v.vip_reference_id = @vipReferenceID
            ${scope.whereSql || ""}
        `);

        if (!checkResult.recordset?.length) {
            await transaction.rollback();

            return res.status(404).json({
                message: "VIP Reference not found",
            });
        }

        // Update the existing stage or insert a new stage
        await request.query(`
            IF EXISTS (
                SELECT 1
                FROM tbl_vip_reference_stage
                WHERE vip_reference_id = @vipReferenceID
            )
            BEGIN
                UPDATE tbl_vip_reference_stage
                SET stage_name = @selectedStage
                WHERE vip_reference_id = @vipReferenceID;
            END
            ELSE
            BEGIN
                INSERT INTO tbl_vip_reference_stage (
                    vip_reference_id,
                    stage_name
                )
                VALUES (
                    @vipReferenceID,
                    @selectedStage
                );
            END
        `);

        await transaction.commit();

        return res.status(200).json({
            message: "VIP Reference stage saved successfully",
            vip_reference_id: vipReferenceID,
        });

    } catch (err) {
        console.error("Create VIP Reference Stage Error:", err);

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error("VIP Stage Transaction Rollback Error:", rollbackError);
            }
        }

        return res.status(500).json({
            message: "Failed to save VIP Reference stage",
        });
    }
}

async function getUpdateVipReferenceData(req, res) {
    const vipReferenceID = req.params.vipReferenceID;

    const conn = await pool;
    const request = conn.request();

    request.input("vipReferenceID", vipReferenceID);

    try {
        // Apply organisation-level data scope
        const scope = applyDataScope(request, req.user, {
            strategy: 'viaCreatedBy',
            alias: 'tbl_vip_reference'
        });

        const whereClauses = [
            "tbl_vip_reference.vip_reference_id = @vipReferenceID"
        ];

        // Add organisation scope
        if (scope.whereSql) {
            whereClauses.push(scope.whereSql);
        }

        const whereSql = "WHERE " + whereClauses.join(" AND ");

        const result = await request.query(`
            SELECT tbl_vip_reference.*
            FROM tbl_vip_reference
            ${scope.joinSql || ''}
            ${whereSql};
        `);

        if (result.recordset.length === 0) {
            return res.sendStatus(404);
        }

        return res.json(result.recordset);

    } catch (err) {
        console.error("getUpdateVipReferenceData error:", err);
        return res.sendStatus(500);
    }
}

// async function deleteVipReference(req, res) {
//     const vipReferenceID = Number(req.params.vipReferenceID);

//     if (!Number.isInteger(vipReferenceID) || vipReferenceID <= 0) {
//         return res.status(400).json({ message: "Invalid VIP Reference ID" });
//     }

//     const userID = req.user?.user_id ?? req.user?.userId;

//     if (!userID) {
//         return res.status(401).json({ message: "Unauthenticated user" });
//     }

//     const now = new Date();
//     const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
//     const hourPart = String(now.getHours()).padStart(2, "0");
//     const minutePart = String(now.getMinutes()).padStart(2, "0");
//     const secondPart = String(now.getSeconds()).padStart(2, "0");

//     const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
//     const logFolder = "./delete_log/Vip_Reference";
//     const logFileName = `${logFolder}/deleted_Vip_Reference_log_${timestamp}.txt`;

//     try {
//         const conn = await pool;
//         const request = conn.request();

//         request.input("vipReferenceID", vipReferenceID);

//         // Apply record-level access control
//         const scope = applyDataScope(request, req.user, {
//             strategy: "viaCreatedBy",
//             alias: "v",
//         });

//         const result = await request.query(`
//             DELETE v

//             OUTPUT DELETED.*

//             FROM tbl_vip_reference AS v

//             ${scope.joinSql || ""}

//             WHERE v.vip_reference_id = @vipReferenceID
//             ${scope.whereSql || ""}
//         `);

//         // Missing or out-of-scope records both return 404
//         if (!result.rowsAffected?.[0] || !result.recordset?.length) {
//             return res.status(404).json({
//                 message: "VIP Reference not found",
//             });
//         }

//         const dataJSON = JSON.stringify(result.recordset[0]);

//         const logMessage =
//             `User '${userID}' deleted VIP Reference data with Data ID '${vipReferenceID}'. ` +
//             `Deleted Data: ${dataJSON}\n`;

//         fs.appendFile(logFileName, logMessage, (err) => {
//             if (err) {
//                 console.error("Error writing VIP Reference delete log:", err);
//             }
//         });

//         return res.status(200).json({
//             message: "VIP Reference deleted successfully",
//             vip_reference_id: vipReferenceID,
//         });

//     } catch (err) {
//         console.error("Delete VIP Reference Error:", err);
//         return res.status(500).json({
//             message: "Failed to delete VIP Reference",
//         });
//     }
// }


export default { getVipReference, createVipReference, updateVipReference, createVipReferenceStage, getUpdateVipReferenceData };