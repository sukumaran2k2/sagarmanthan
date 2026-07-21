
import { pool } from "../../db.js";
import sql from 'mssql';
import fs from 'fs';

async function createMinistryCabinet(req, res) {
    const subject = req.body.subject;
    const cabinetSubject = req.body.cabinetSubject || req.body.subject;
    const cabinetMinistryName = req.body.cabinetMinistryName;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    const cabinetMinistryNameText = req.body.cabinetMinistryNameText;
    let deadline = req.body.deadline;
    const receivedMinistry = req.body.receivedMinistry;
    let receivedMinistryDate = req.body.receivedMinistryDate;
    const sentForComment = req.body.sentForComment;
    let sentForCommentDate = req.body.sentForCommentDate;
    let wings = req.body.wings;
    if (Array.isArray(wings)) {
        wings = wings.join(',');
    }
    const commentsReceived = req.body.commentsReceived;
    let commentsReceivedDate = req.body.commentsReceivedDate;

    const shipping = req.body.shipping;
    let shippingDate = req.body.shippingDate;
    const vigilance = req.body.vigilance;
    let vigilanceDate = req.body.vigilanceDate;
    const ports = req.body.ports;
    let portsDate = req.body.portsDate;
    const iwt = req.body.iwt;
    let iwtDate = req.body.iwtDate;
    const administration = req.body.administration;
    let administrationDate = req.body.administrationDate;
    const coordI = req.body.coordI;
    let coordIDate = req.body.coordIDate;
    const coordII = req.body.coordII;
    let coordIIDate = req.body.coordIIDate;
    const dgll = req.body.dgll;
    let dgllDate = req.body.dgllDate;
    const development = req.body.development;
    let developmentDate = req.body.developmentDate;
    const finance = req.body.finance;
    let financeDate = req.body.financeDate;
    const sagarmala = req.body.sagarmala;
    let sagarmalaDate = req.body.sagarmalaDate;

    const fileSubmitted = req.body.fileSubmitted;
    let fileSubmittedDate = req.body.fileSubmittedDate;
    const replyFurnished = req.body.replyFurnished;
    let replyFurnishedDate = req.body.replyFurnishedDate;
    let selectedMinistryNotesStage = req.body.selectedMinistryNotesStage;
    const remarks = req.body.remarks;
    const userID = req.body.userID;

    // Remarks per stage field
    const receivedMinistryRemarks = req.body.receivedMinistryRemarks || null;
    const sentForCommentsRemarks = req.body.sentForCommentsRemarks || null;
    const commentsRecRemarks = req.body.commentsRecRemarks || null;
    const shippingRemarks = req.body.shippingRemarks || null;
    const vigilanceRemarks = req.body.vigilanceRemarks || null;
    const portsRemarks = req.body.portsRemarks || null;
    const iwtRemarks = req.body.iwtRemarks || null;
    const administrationRemarks = req.body.administrationRemarks || null;
    const coordIRemarks = req.body.coordIRemarks || null;
    const coordIIRemarks = req.body.coordIIRemarks || null;
    const dgllRemarks = req.body.dgllRemarks || null;
    const developmentRemarks = req.body.developmentRemarks || null;
    const financeRemarks = req.body.financeRemarks || null;
    const sagarmalaRemarks = req.body.sagarmalaRemarks || null;
    const fileSubmittedRemarks = req.body.fileSubmittedRemarks || null;
    const replyFurnishedRemarks = req.body.replyFurnishedRemarks || null;

    if (receivedMinistryDate == "" || !receivedMinistryDate) receivedMinistryDate = null;
    if (sentForCommentDate == "" || !sentForCommentDate) sentForCommentDate = null;
    if (commentsReceivedDate == "" || !commentsReceivedDate) commentsReceivedDate = null;
    if (fileSubmittedDate == "" || !fileSubmittedDate) fileSubmittedDate = null;
    if (replyFurnishedDate == "" || !replyFurnishedDate) replyFurnishedDate = null;
    if (deadline == "" || !deadline) deadline = null;
    if (shippingDate === "" || !shippingDate) shippingDate = null;
    if (vigilanceDate === "" || !vigilanceDate) vigilanceDate = null;
    if (portsDate === "" || !portsDate) portsDate = null;
    if (iwtDate === "" || !iwtDate) iwtDate = null;
    if (administrationDate === "" || !administrationDate) administrationDate = null;
    if (coordIDate === "" || !coordIDate) coordIDate = null;
    if (coordIIDate === "" || !coordIIDate) coordIIDate = null;
    if (dgllDate === "" || !dgllDate) dgllDate = null;
    if (developmentDate === "" || !developmentDate) developmentDate = null;
    if (financeDate === "" || !financeDate) financeDate = null;
    if (sagarmalaDate === "" || !sagarmalaDate) sagarmalaDate = null;

    const conn = await pool;
    const request = conn.request();
    const safeMinText = (cabinetMinistryNameText && String(cabinetMinistryNameText).trim()) ? String(cabinetMinistryNameText).trim() : 'Department of Atomic Energy';

    request.input("cabinetSubject", cabinetSubject);
    request.input("cabinetMinistryName", cabinetMinistryName);
    request.input("eofficeFileNumber", eofficeFileNumber);
    request.input("cabinetMinistryNameText", safeMinText);
    request.input("deadline", deadline);
    request.input("receivedMinistryDate", receivedMinistryDate);
    request.input("sentForCommentDate", sentForCommentDate);
    request.input('wings', wings);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("shippingDate", shippingDate);
    request.input("vigilanceDate", vigilanceDate);
    request.input("portsDate", portsDate);
    request.input("iwtDate", iwtDate);
    request.input("administrationDate", administrationDate);
    request.input("coordIDate", coordIDate);
    request.input("coordIIDate", coordIIDate);
    request.input("dgllDate", dgllDate);
    request.input("developmentDate", developmentDate);
    request.input("financeDate", financeDate);
    request.input("sagarmalaDate", sagarmalaDate);
    request.input("fileSubmittedDate", fileSubmittedDate);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("remarks", remarks);
    request.input("selectedMinistryNotesStage", selectedMinistryNotesStage);
    request.input("userID", userID);

    request.input("receivedMinistryRemarks", receivedMinistryRemarks);
    request.input("sentForCommentsRemarks", sentForCommentsRemarks);
    request.input("commentsRecRemarks", commentsRecRemarks);
    request.input("shippingRemarks", shippingRemarks);
    request.input("vigilanceRemarks", vigilanceRemarks);
    request.input("portsRemarks", portsRemarks);
    request.input("iwtRemarks", iwtRemarks);
    request.input("administrationRemarks", administrationRemarks);
    request.input("coordIRemarks", coordIRemarks);
    request.input("coordIIRemarks", coordIIRemarks);
    request.input("dgllRemarks", dgllRemarks);
    request.input("developmentRemarks", developmentRemarks);
    request.input("financeRemarks", financeRemarks);
    request.input("sagarmalaRemarks", sagarmalaRemarks);
    request.input("fileSubmittedRemarks", fileSubmittedRemarks);
    request.input("replyFurnishedRemarks", replyFurnishedRemarks);

    try {
        /*
        -- PREVIOUS QUERY ON OLD TABLE:
        const result = await request.query(`INSERT INTO tbl_cabinet_notes_ministry (subject, ministry_id, ministry_name, eoffice_file_number, deadline,
            received_ministry, received_ministry_date, sent_for_comments, sent_for_comments_date, sent_for_comments_wings, comments_rec, comments_rec_date,
            shipping, shipping_date, vigilance, vigilance_date, ports, ports_date, iwt, iwt_date, administration, 
            administration_date, coord_I, coord_I_date, coord_II, coord_II_date, dgll_parliament_and_trw, 
            dgll_parliament_and_trw_date, development, development_date, finance, finance_date, sagarmala, sagarmala_date,
            file_submitted, file_submitted_date, reply_furnished, reply_furnished_date, remarks, stage_id, created_by)
            OUTPUT INSERTED.cabinet_notes_ministry_id
            VALUES (@cabinetSubject, ...`);
        */

        const result = await request.query(`INSERT INTO tbl_cabinet_notes_ministry_change (
            subject, ministry_id, ministry_name, eoffice_file_number, deadline,
            received_ministry_date, sent_for_comments_date, sent_for_comments_wings, comments_rec_date,
            shipping_date, vigilance_date, ports_date, iwt_date, administration_date, 
            coord_I_date, coord_II_date, dgll_parliament_and_trw_date, 
            development_date, finance_date, sagarmala_date,
            file_submitted_date, reply_furnished_date, remarks, stage_id, created_by, created_date,
            received_ministry_remarks, sent_for_comments_remarks, comments_rec_remarks,
            shipping_remarks, vigilance_remarks, ports_remarks, iwt_remarks, administration_remarks,
            coord_I_remarks, coord_II_remarks, dgll_parliament_and_trw_remarks,
            development_remarks, finance_remarks, sagarmala_remarks, file_submitted_remarks, reply_furnished_remarks
        )
        OUTPUT INSERTED.cabinet_notes_ministry_id
        VALUES (
            @cabinetSubject, @cabinetMinistryName, @cabinetMinistryNameText, @eofficeFileNumber, @deadline,
            @receivedMinistryDate, @sentForCommentDate, @wings, @commentsReceivedDate,
            @shippingDate, @vigilanceDate, @portsDate, @iwtDate, @administrationDate,
            @coordIDate, @coordIIDate, @dgllDate,
            @developmentDate, @financeDate, @sagarmalaDate,
            @fileSubmittedDate, @replyFurnishedDate, @remarks, @selectedMinistryNotesStage, @userID, GETDATE(),
            @receivedMinistryRemarks, @sentForCommentsRemarks, @commentsRecRemarks,
            @shippingRemarks, @vigilanceRemarks, @portsRemarks, @iwtRemarks, @administrationRemarks,
            @coordIRemarks, @coordIIRemarks, @dgllRemarks,
            @developmentRemarks, @financeRemarks, @sagarmalaRemarks, @fileSubmittedRemarks, @replyFurnishedRemarks
        )`);

        const cabinet_notes_ministry_id = result.recordset[0].cabinet_notes_ministry_id;
        res.status(201).json({ cabinet_notes_ministry_id });
    }
    catch (err) {
        console.log("Error in createMinistryCabinet:", err);
        return res.status(500).json({ error: err.message });
    }
};

async function editMinistryCabinet(req, res) {
    const ministryCabinetID = req.body.ministryCabinetID || req.body.cabinet_notes_ministry_id;
    const cabinetSubject = req.body.cabinetSubject || req.body.subject;
    const cabinetMinistryName = req.body.cabinetMinistryName;
    const cabinetMinistryNameText = req.body.cabinetMinistryNameText;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    let deadline = req.body.deadline;

    let receivedMinistryDate = req.body.receivedMinistryDate;
    let shippingDate = req.body.shippingDate;
    let vigilanceDate = req.body.vigilanceDate;
    let portsDate = req.body.portsDate;
    let iwtDate = req.body.iwtDate;
    let administrationDate = req.body.administrationDate;
    let coordIDate = req.body.coordIDate;
    let coordIIDate = req.body.coordIIDate;
    let dgllDate = req.body.dgllDate;
    let developmentDate = req.body.developmentDate;
    let financeDate = req.body.financeDate;
    let sagarmalaDate = req.body.sagarmalaDate;
    let selectedMinistryNotesStage = req.body.selectedMinistryNotesStage;

    let sentForCommentDate = req.body.sentForCommentDate;
    let wings = req.body.wings;
    if (Array.isArray(wings)) {
        wings = wings.join(',');
    }
    let commentsReceivedDate = req.body.commentsReceivedDate;
    let fileSubmittedDate = req.body.fileSubmittedDate;
    let replyFurnishedDate = req.body.replyFurnishedDate;
    const remarks = req.body.remarks;
    const userID = req.body.userID;

    const receivedMinistryRemarks = req.body.receivedMinistryRemarks || null;
    const sentForCommentsRemarks = req.body.sentForCommentsRemarks || null;
    const commentsRecRemarks = req.body.commentsRecRemarks || null;
    const shippingRemarks = req.body.shippingRemarks || null;
    const vigilanceRemarks = req.body.vigilanceRemarks || null;
    const portsRemarks = req.body.portsRemarks || null;
    const iwtRemarks = req.body.iwtRemarks || null;
    const administrationRemarks = req.body.administrationRemarks || null;
    const coordIRemarks = req.body.coordIRemarks || null;
    const coordIIRemarks = req.body.coordIIRemarks || null;
    const dgllRemarks = req.body.dgllRemarks || null;
    const developmentRemarks = req.body.developmentRemarks || null;
    const financeRemarks = req.body.financeRemarks || null;
    const sagarmalaRemarks = req.body.sagarmalaRemarks || null;
    const fileSubmittedRemarks = req.body.fileSubmittedRemarks || null;
    const replyFurnishedRemarks = req.body.replyFurnishedRemarks || null;

    if (receivedMinistryDate == "" || !receivedMinistryDate) receivedMinistryDate = null;
    if (sentForCommentDate == "" || !sentForCommentDate) sentForCommentDate = null;
    if (commentsReceivedDate == "" || !commentsReceivedDate) commentsReceivedDate = null;
    if (fileSubmittedDate == "" || !fileSubmittedDate) fileSubmittedDate = null;
    if (replyFurnishedDate == "" || !replyFurnishedDate) replyFurnishedDate = null;
    if (deadline == "" || !deadline) deadline = null;
    if (shippingDate === "" || !shippingDate) shippingDate = null;
    if (vigilanceDate === "" || !vigilanceDate) vigilanceDate = null;
    if (portsDate === "" || !portsDate) portsDate = null;
    if (iwtDate === "" || !iwtDate) iwtDate = null;
    if (administrationDate === "" || !administrationDate) administrationDate = null;
    if (coordIDate === "" || !coordIDate) coordIDate = null;
    if (coordIIDate === "" || !coordIIDate) coordIIDate = null;
    if (dgllDate === "" || !dgllDate) dgllDate = null;
    if (developmentDate === "" || !developmentDate) developmentDate = null;
    if (financeDate === "" || !financeDate) financeDate = null;
    if (sagarmalaDate === "" || !sagarmalaDate) sagarmalaDate = null;

    const conn = await pool;
    const request = conn.request();
    const safeMinText = (cabinetMinistryNameText && String(cabinetMinistryNameText).trim()) ? String(cabinetMinistryNameText).trim() : 'Department of Atomic Energy';

    request.input("ministryCabinetID", ministryCabinetID ? parseInt(ministryCabinetID) : null);
    request.input("cabinetSubject", cabinetSubject || null);
    request.input("cabinetMinistryName", cabinetMinistryName ? parseInt(cabinetMinistryName) : null);
    request.input("cabinetMinistryNameText", safeMinText);
    request.input("eofficeFileNumber", eofficeFileNumber || null);
    request.input("deadline", deadline || null);

    request.input("receivedMinistryDate", receivedMinistryDate || null);
    request.input("sentForCommentDate", sentForCommentDate || null);
    request.input('wings', wings ? String(wings) : null);
    request.input("commentsReceivedDate", commentsReceivedDate || null);
    request.input("shippingDate", shippingDate || null);
    request.input("vigilanceDate", vigilanceDate || null);
    request.input("portsDate", portsDate || null);
    request.input("iwtDate", iwtDate || null);
    request.input("administrationDate", administrationDate || null);
    request.input("coordIDate", coordIDate || null);
    request.input("coordIIDate", coordIIDate || null);
    request.input("dgllDate", dgllDate || null);
    request.input("developmentDate", developmentDate || null);
    request.input("financeDate", financeDate || null);
    request.input("sagarmalaDate", sagarmalaDate || null);
    request.input("fileSubmittedDate", fileSubmittedDate || null);
    request.input("replyFurnishedDate", replyFurnishedDate || null);
    request.input("remarks", remarks || null);
    request.input("selectedMinistryNotesStage", selectedMinistryNotesStage ? parseInt(selectedMinistryNotesStage) : 1);
    request.input("userID", userID ? parseInt(userID) : 1);

    request.input("receivedMinistryRemarks", receivedMinistryRemarks);
    request.input("sentForCommentsRemarks", sentForCommentsRemarks);
    request.input("commentsRecRemarks", commentsRecRemarks);
    request.input("shippingRemarks", shippingRemarks);
    request.input("vigilanceRemarks", vigilanceRemarks);
    request.input("portsRemarks", portsRemarks);
    request.input("iwtRemarks", iwtRemarks);
    request.input("administrationRemarks", administrationRemarks);
    request.input("coordIRemarks", coordIRemarks);
    request.input("coordIIRemarks", coordIIRemarks);
    request.input("dgllRemarks", dgllRemarks);
    request.input("developmentRemarks", developmentRemarks);
    request.input("financeRemarks", financeRemarks);
    request.input("sagarmalaRemarks", sagarmalaRemarks);
    request.input("fileSubmittedRemarks", fileSubmittedRemarks);
    request.input("replyFurnishedRemarks", replyFurnishedRemarks);

    try {
        /*
        -- PREVIOUS QUERY ON OLD TABLE:
        const result = await request.query(`
            UPDATE tbl_cabinet_notes_ministry SET
            subject = @cabinetSubject, ...
        `);
        */
        const result = await request.query(`
            UPDATE tbl_cabinet_notes_ministry_change SET
            subject = @cabinetSubject,
            ministry_id = @cabinetMinistryName,
            ministry_name = @cabinetMinistryNameText,
            eoffice_file_number = @eofficeFileNumber,
            deadline = @deadline,
            stage_id = @selectedMinistryNotesStage,
            received_ministry_date = @receivedMinistryDate,
            sent_for_comments_date = @sentForCommentDate,
            sent_for_comments_wings = @wings,
            comments_rec_date = @commentsReceivedDate,
            shipping_date = @shippingDate,
            vigilance_date = @vigilanceDate,
            ports_date = @portsDate,
            iwt_date = @iwtDate,
            administration_date = @administrationDate,
            coord_I_date = @coordIDate,
            coord_II_date = @coordIIDate,
            dgll_parliament_and_trw_date = @dgllDate,
            development_date = @developmentDate,
            finance_date = @financeDate,
            sagarmala_date = @sagarmalaDate,
            file_submitted_date = @fileSubmittedDate,
            reply_furnished_date = @replyFurnishedDate,
            remarks = @remarks,
            received_ministry_remarks = @receivedMinistryRemarks,
            sent_for_comments_remarks = @sentForCommentsRemarks,
            comments_rec_remarks = @commentsRecRemarks,
            shipping_remarks = @shippingRemarks,
            vigilance_remarks = @vigilanceRemarks,
            ports_remarks = @portsRemarks,
            iwt_remarks = @iwtRemarks,
            administration_remarks = @administrationRemarks,
            coord_I_remarks = @coordIRemarks,
            coord_II_remarks = @coordIIRemarks,
            dgll_parliament_and_trw_remarks = @dgllRemarks,
            development_remarks = @developmentRemarks,
            finance_remarks = @financeRemarks,
            sagarmala_remarks = @sagarmalaRemarks,
            file_submitted_remarks = @fileSubmittedRemarks,
            reply_furnished_remarks = @replyFurnishedRemarks,
            updated_by = @userID,
            updated_date = GETDATE()
            OUTPUT INSERTED.cabinet_notes_ministry_id
            WHERE cabinet_notes_ministry_id = @ministryCabinetID
        `);

        const cabinet_notes_ministry_id = (result.recordset && result.recordset.length > 0) ? result.recordset[0].cabinet_notes_ministry_id : ministryCabinetID;
        res.status(200).json({ cabinet_notes_ministry_id });
    } catch (err) {
        console.log("Error in editMinistryCabinet:", err);
        return res.status(500).json({ error: err.message });
    }
}

async function getCabinetMinistry(req, res) {
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();
    request.input('userID', userID);

    try {
        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const role_id = userResult.recordset.length > 0 ? userResult.recordset[0].role_id : null;

        /*
        -- PREVIOUS QUERY ON OLD TABLE:
        FROM tbl_cabinet_notes_ministry
        INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
        INNER JOIN mmt_cabinet_ministry_stage AS stage ON tbl_cabinet_notes_ministry.stage_id = stage.cab_ministry_stage_id
        */

        if (!role_id || role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            const result = await conn.query(`
            SELECT
                ISNULL(mmt_ministry.ministry_name, tbl_cabinet_notes_ministry_change.ministry_name) as ministry_name,
                tbl_cabinet_notes_ministry_change.*,
                stage.cab_ministry_stage_name AS stage_name
            FROM
                tbl_cabinet_notes_ministry_change
                LEFT JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
                LEFT JOIN mmt_cabinet_ministry_stage AS stage ON tbl_cabinet_notes_ministry_change.stage_id = stage.cab_ministry_stage_id
            ORDER BY cabinet_notes_ministry_id DESC;
            `);

            res.json(result.recordset);
        } else {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            request.input('organisationID', organisationID);
            const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            const result = await conn.query(`
            SELECT
                ISNULL(mmt_ministry.ministry_name, tbl_cabinet_notes_ministry_change.ministry_name) as ministry_name,
                tbl_cabinet_notes_ministry_change.*,
                stage.cab_ministry_stage_name AS stage_name
            FROM
                tbl_cabinet_notes_ministry_change
                LEFT JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry_change.ministry_id
                LEFT JOIN mmt_cabinet_ministry_stage AS stage ON tbl_cabinet_notes_ministry_change.stage_id = stage.cab_ministry_stage_id
            WHERE created_by IN (${userIDs.join(',')})
            ORDER BY cabinet_notes_ministry_id DESC;
            `);

            res.json(result.recordset);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function createCabinetNotesMinistryStage(req, res) {
    const cabinetNotesMinistryID = req.body.cabinetNotesMinistryID;
    const stage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();
    request.input("cabinetNotesMinistryID", cabinetNotesMinistryID);
    request.input("stage", stage);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS recordCount
            FROM tbl_cabinet_notes_ministry_stage
            WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryID
        `);

        if (checkResult.recordset[0].recordCount > 0) {
            await request.query(`
                UPDATE tbl_cabinet_notes_ministry_stage
                SET stage_name = @stage
                WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryID
            `);
        } else {
            await request.query(`
                INSERT INTO tbl_cabinet_notes_ministry_stage (cabinet_notes_ministry_id, stage_name)
                VALUES (@cabinetNotesMinistryID, @stage);
            `);
        }
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateCabinetMinistryData(req, res) {
    const ministryCabinetID = req.params.ministryCabinetID;

    const conn = await pool;
    const request = conn.request();
    request.input("ministryCabinetID", ministryCabinetID);

    try {
        /*
        -- PREVIOUS QUERY ON OLD TABLE:
        const result = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry WHERE tbl_cabinet_notes_ministry.cabinet_notes_ministry_id = @ministryCabinetID;`);
        */
        const result = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry_change WHERE cabinet_notes_ministry_id = @ministryCabinetID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteCabinetNotesMinistry (req, res) 
{    
    const cabinetNotesMinistryId = req.params.cabinet_notes_ministry_id;
    const userID = req.params.userID;

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const hourPart = String(now.getHours()).padStart(2, '0'); 
    const minutePart = String(now.getMinutes()).padStart(2, '0'); 
    const secondPart = String(now.getSeconds()).padStart(2, '0'); 
    const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
    const logFolder = `./delete_log/cabinet_notes_other`;
    const logFileName = `${logFolder}/deleted_cabinet_notes_other_log_${timestamp}.txt`;

    const conn = await pool;
    const request = conn.request();
    request.input("cabinetNotesMinistryId", cabinetNotesMinistryId);
    try
    {
        /*
        -- PREVIOUS DELETE QUERY ON OLD TABLE:
        const dataToDelete = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        const result = await request.query(`DELETE FROM tbl_cabinet_notes_ministry WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        */
        const dataToDelete = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry_change WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    
        const result = await request.query(`DELETE FROM tbl_cabinet_notes_ministry_change WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        if (result.rowsAffected[0] > 0) {
            const logMessage = `User ${userID} deleted Cabinet Notes Ministry data with Data ID ${cabinetNotesMinistryId}. Deleted Data: ${dataJSON}\n`;

            if (!fs.existsSync(logFolder)) {
                fs.mkdirSync(logFolder, { recursive: true });
            }
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete log:', err);
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

export default { 
    createMinistryCabinet, 
    getCabinetMinistry, 
    editMinistryCabinet, 
    getUpdateCabinetMinistryData, 
    createCabinetNotesMinistryStage, 
    deleteCabinetNotesMinistry 
};