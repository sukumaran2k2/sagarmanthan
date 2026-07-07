
import { pool } from "../../db.js";
import fs from 'fs';

async function createMinistryCabinet(req, res) {
    const subject = req.body.subject;
    const cabinetSubject = req.body.cabinetSubject;
    const cabinetMinistryName = req.body.cabinetMinistryName;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    const cabinetMinistryNameText = req.body.cabinetMinistryNameText;
    let deadline = req.body.deadline;
    const receivedMinistry = req.body.receivedMinistry;
    let receivedMinistryDate = req.body.receivedMinistryDate;
    const sentForComment = req.body.sentForComment;
    let sentForCommentDate = req.body.sentForCommentDate;
    let wings = req.body.wings;
    wings = wings.join(',');
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

    if (receivedMinistryDate == "") {
        receivedMinistryDate = null;
    }
    if (sentForCommentDate == "") {
        sentForCommentDate = null;
    }
    if (commentsReceivedDate == "") {
        commentsReceivedDate = null;
    }
    if (fileSubmittedDate == "") {
        fileSubmittedDate = null;
    }
    if (replyFurnishedDate == "") {
        replyFurnishedDate = null;
    }
    if (deadline == "") {
        deadline = null;
    }
    if (shippingDate === "") {
        shippingDate = null;
    }
    if (vigilanceDate === "") {
        vigilanceDate = null;
    }
    if (portsDate === "") {
        portsDate = null;
    }
    if (iwtDate === "") {
        iwtDate = null;
    }
    if (administrationDate === "") {
        administrationDate = null;
    }
    if (coordIDate === "") {
        coordIDate = null;
    }
    if (coordIIDate === "") {
        coordIIDate = null;
    }
    if (dgllDate === "") {
        dgllDate = null;
    }
    if (developmentDate === "") {
        developmentDate = null;
    }
    if (financeDate === "") {
        financeDate = null;
    }
    if (sagarmalaDate === "") {
        sagarmalaDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("cabinetSubject", cabinetSubject);
    request.input("cabinetMinistryName", cabinetMinistryName);
    request.input("eofficeFileNumber", eofficeFileNumber);
    request.input("cabinetMinistryNameText", cabinetMinistryNameText);
    request.input("deadline", deadline);
    request.input("receivedMinistry", receivedMinistry);
    request.input("receivedMinistryDate", receivedMinistryDate);
    request.input("sentForComment", sentForComment);
    request.input("sentForCommentDate", sentForCommentDate);
    request.input('wings', wings);
    request.input("commentsReceived", commentsReceived);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("shipping", shipping);
    request.input("shippingDate", shippingDate);
    request.input("vigilance", vigilance);
    request.input("vigilanceDate", vigilanceDate);
    request.input("ports", ports);
    request.input("portsDate", portsDate);
    request.input("iwt", iwt);
    request.input("iwtDate", iwtDate);
    request.input("administration", administration);
    request.input("administrationDate", administrationDate);
    request.input("coordI", coordI);
    request.input("coordIDate", coordIDate);
    request.input("coordII", coordII);
    request.input("coordIIDate", coordIIDate);
    request.input("dgll", dgll);
    request.input("dgllDate", dgllDate);
    request.input("development", development);
    request.input("developmentDate", developmentDate);
    request.input("finance", finance);
    request.input("financeDate", financeDate);
    request.input("sagarmala", sagarmala);
    request.input("sagarmalaDate", sagarmalaDate);
    request.input("fileSubmitted", fileSubmitted);
    request.input("fileSubmittedDate", fileSubmittedDate);
    request.input("replyFurnished", replyFurnished);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("remarks", remarks);
    request.input("selectedMinistryNotesStage",selectedMinistryNotesStage);
    request.input("userID", userID);

    try {

        const result = await request.query(`INSERT INTO tbl_cabinet_notes_ministry (subject, ministry_id, ministry_name, eoffice_file_number, deadline,
            received_ministry, received_ministry_date, sent_for_comments, sent_for_comments_date, sent_for_comments_wings, comments_rec, comments_rec_date,
            shipping, shipping_date, vigilance, vigilance_date, ports, ports_date, iwt, iwt_date, administration, 
            administration_date, coord_I, coord_I_date, coord_II, coord_II_date, dgll_parliament_and_trw, 
            dgll_parliament_and_trw_date, development, development_date, finance, finance_date, sagarmala, sagarmala_date,
            file_submitted, file_submitted_date, reply_furnished, reply_furnished_date, remarks, stage_id, created_by)
            OUTPUT INSERTED.cabinet_notes_ministry_id
            VALUES (@cabinetSubject, 
            @cabinetMinistryName, @cabinetMinistryNameText, @eofficeFileNumber, @deadline, @receivedMinistry, @receivedMinistryDate, @sentForComment, 
            @sentForCommentDate, @wings, @commentsReceived, @commentsReceivedDate, @shipping, @shippingDate, @vigilance, @vigilanceDate, @ports, 
            @portsDate, @iwt, @iwtDate, @administration, @administrationDate, @coordI, @coordIDate, @coordII, 
            @coordIIDate, @dgll, @dgllDate, @development, @developmentDate, @finance, @financeDate, @sagarmala, 
            @sagarmalaDate, @fileSubmitted, @fileSubmittedDate, 
            @replyFurnished, @replyFurnishedDate, @remarks, @selectedMinistryNotesStage, @userID)`);

        const cabinet_notes_ministry_id = result.recordset[0].cabinet_notes_ministry_id;

        res.status(201).json({ cabinet_notes_ministry_id });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editMinistryCabinet(req, res) {
    const ministryCabinetID = req.body.ministryCabinetID;
    const cabinetSubject = req.body.cabinetSubject;
    const cabinetMinistryName = req.body.cabinetMinistryName;
    const cabinetMinistryNameText = req.body.cabinetMinistryNameText;
    const eofficeFileNumber = req.body.eofficeFileNumber;
    let deadline = req.body.deadline;

    const receivedMinistry = req.body.receivedMinistry;
    let receivedMinistryDate = req.body.receivedMinistryDate;

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
    let selectedMinistryNotesStage = req.body.selectedMinistryNotesStage;

    const sentForComment = req.body.sentForComment;
    let sentForCommentDate = req.body.sentForCommentDate;
    let wings = req.body.wings;
    wings = wings.join(',');
    const commentsReceived = req.body.commentsReceived;
    let commentsReceivedDate = req.body.commentsReceivedDate;
    const fileSubmitted = req.body.fileSubmitted;
    let fileSubmittedDate = req.body.fileSubmittedDate;
    const replyFurnished = req.body.replyFurnished;
    let replyFurnishedDate = req.body.replyFurnishedDate;
    const remarks = req.body.remarks;
    const userID = req.body.userID;

    if (receivedMinistryDate == "") {
        receivedMinistryDate = null;
    }
    if (sentForCommentDate == "") {
        sentForCommentDate = null;
    }
    if (commentsReceivedDate == "") {
        commentsReceivedDate = null;
    }
    if (fileSubmittedDate == "") {
        fileSubmittedDate = null;
    }
    if (replyFurnishedDate == "") {
        replyFurnishedDate = null;
    }
    if (deadline == "") {
        deadline = null;
    }
    if (shippingDate === "") {
        shippingDate = null;
    }
    if (vigilanceDate === "") {
        vigilanceDate = null;
    }
    if (portsDate === "") {
        portsDate = null;
    }
    if (iwtDate === "") {
        iwtDate = null;
    }
    if (administrationDate === "") {
        administrationDate = null;
    }
    if (coordIDate === "") {
        coordIDate = null;
    }
    if (coordIIDate === "") {
        coordIIDate = null;
    }
    if (dgllDate === "") {
        dgllDate = null;
    }
    if (developmentDate === "") {
        developmentDate = null;
    }
    if (financeDate === "") {
        financeDate = null;
    }
    if (sagarmalaDate === "") {
        sagarmalaDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("ministryCabinetID", ministryCabinetID);
    request.input("cabinetSubject", cabinetSubject);
    request.input("cabinetMinistryName", cabinetMinistryName);
    request.input("cabinetMinistryNameText", cabinetMinistryNameText);
    request.input("eofficeFileNumber", eofficeFileNumber);
    request.input("deadline", deadline);
    request.input("receivedMinistry", receivedMinistry);
    request.input("receivedMinistryDate", receivedMinistryDate);
    request.input("sentForComment", sentForComment);
    request.input("sentForCommentDate", sentForCommentDate);
    request.input('wings', wings);
    request.input("commentsReceived", commentsReceived);
    request.input("commentsReceivedDate", commentsReceivedDate);
    request.input("shipping", shipping);
    request.input("shippingDate", shippingDate);
    request.input("vigilance", vigilance);
    request.input("vigilanceDate", vigilanceDate);
    request.input("ports", ports);
    request.input("portsDate", portsDate);
    request.input("iwt", iwt);
    request.input("iwtDate", iwtDate);
    request.input("administration", administration);
    request.input("administrationDate", administrationDate);
    request.input("coordI", coordI);
    request.input("coordIDate", coordIDate);
    request.input("coordII", coordII);
    request.input("coordIIDate", coordIIDate);
    request.input("dgll", dgll);
    request.input("dgllDate", dgllDate);
    request.input("development", development);
    request.input("developmentDate", developmentDate);
    request.input("finance", finance);
    request.input("financeDate", financeDate);
    request.input("sagarmala", sagarmala);
    request.input("sagarmalaDate", sagarmalaDate);
    request.input("fileSubmitted", fileSubmitted);
    request.input("fileSubmittedDate", fileSubmittedDate);
    request.input("replyFurnished", replyFurnished);
    request.input("replyFurnishedDate", replyFurnishedDate);
    request.input("remarks", remarks);
    request.input("selectedMinistryNotesStage",selectedMinistryNotesStage);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_cabinet_notes_ministry SET
            subject = @cabinetSubject,
            ministry_id = @cabinetMinistryName,
            ministry_name = @cabinetMinistryNameText,
            eoffice_file_number = @eofficeFileNumber,
            deadline = @deadline,
            stage_id = @selectedMinistryNotesStage,
            received_ministry = @receivedMinistry,
            received_ministry_date = @receivedMinistryDate,
            sent_for_comments = @sentForComment,
            sent_for_comments_date = @sentForCommentDate,
            sent_for_comments_wings = @wings,
            comments_rec = @commentsReceived,
            comments_rec_date = @commentsReceivedDate,
            shipping = @shipping,
            shipping_date = @shippingDate,
            vigilance = @vigilance,
            vigilance_date = @vigilanceDate,
            ports = @ports,
            ports_date = @portsDate,
            iwt = @iwt,
            iwt_date = @iwtDate,
            administration = @administration,
            administration_date = @administrationDate,
            coord_I = @coordI,
            coord_I_date = @coordIDate,
            coord_II = @coordII,
            coord_II_date = @coordIIDate,
            dgll_parliament_and_trw = @dgll,
            dgll_parliament_and_trw_date = @dgllDate,
            development = @development,
            development_date = @developmentDate,
            finance = @finance,
            finance_date = @financeDate,
            sagarmala = @sagarmala,
            sagarmala_date = @sagarmalaDate,
            file_submitted = @fileSubmitted,
            file_submitted_date = @fileSubmittedDate,
            reply_furnished = @replyFurnished,
            reply_furnished_date = @replyFurnishedDate,
            remarks = @remarks,
            updated_by = @userID,
            updated_date = GETDATE()
            OUTPUT INSERTED.cabinet_notes_ministry_id
            WHERE cabinet_notes_ministry_id = @ministryCabinetID
        `);

        const cabinet_notes_ministry_id = result.recordset[0].cabinet_notes_ministry_id;

        res.status(201).json({ cabinet_notes_ministry_id });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
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

    const { role_id } = userResult.recordset[0];

    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
        const result = await conn.query(`
        SELECT
        mmt_ministry.ministry_name as ministry_name,
        tbl_cabinet_notes_ministry.cabinet_notes_ministry_id,
        tbl_cabinet_notes_ministry.wing,
        tbl_cabinet_notes_ministry.division,
        tbl_cabinet_notes_ministry.subject,
        tbl_cabinet_notes_ministry.deadline,
        stage.cab_ministry_stage_name AS stage_name,
        tbl_cabinet_notes_ministry.received_ministry,
        tbl_cabinet_notes_ministry.received_ministry_date,
        tbl_cabinet_notes_ministry.sent_for_comments,
        tbl_cabinet_notes_ministry.sent_for_comments_date,
        tbl_cabinet_notes_ministry.comments_rec,
        tbl_cabinet_notes_ministry.comments_rec_date,
        tbl_cabinet_notes_ministry.file_submitted,
        tbl_cabinet_notes_ministry.file_submitted_date,
        tbl_cabinet_notes_ministry.reply_furnished,
        tbl_cabinet_notes_ministry.reply_furnished_date,
        tbl_cabinet_notes_ministry.remarks,
        tbl_cabinet_notes_ministry.updated_date
    FROM
        tbl_cabinet_notes_ministry
        INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
        INNER JOIN mmt_cabinet_ministry_stage AS stage ON tbl_cabinet_notes_ministry.stage_id = stage.cab_ministry_stage_id
        ORDER BY stage_id;
        `);

        res.json(result.recordset);
    
    } 

    else{

        //Fetch organisation_id from tbl_user
        const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
        const organisationID = orgResult.recordset[0].organisation_id;

        //Fetch user_ids with the same organisation_id
        request.input('organisationID', organisationID);
        const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id =@organisationID`);
        const userIDs = usersResult.recordset.map(user => user.user_id);

        //Fetch data from tbl_cabinet_notes_ministry based on user_id
        const result = await conn.query(`
        SELECT
        mmt_ministry.ministry_name as ministry_name,
        tbl_cabinet_notes_ministry.cabinet_notes_ministry_id,
        tbl_cabinet_notes_ministry.wing,
        tbl_cabinet_notes_ministry.division,
        tbl_cabinet_notes_ministry.subject,
        tbl_cabinet_notes_ministry.deadline,
        stage.cab_ministry_stage_name AS stage_name,
        tbl_cabinet_notes_ministry.received_ministry,
        tbl_cabinet_notes_ministry.received_ministry_date,
        tbl_cabinet_notes_ministry.sent_for_comments,
        tbl_cabinet_notes_ministry.sent_for_comments_date,
        tbl_cabinet_notes_ministry.comments_rec,
        tbl_cabinet_notes_ministry.comments_rec_date,
        tbl_cabinet_notes_ministry.file_submitted,
        tbl_cabinet_notes_ministry.file_submitted_date,
        tbl_cabinet_notes_ministry.reply_furnished,
        tbl_cabinet_notes_ministry.reply_furnished_date,
        tbl_cabinet_notes_ministry.remarks,
        tbl_cabinet_notes_ministry.updated_date
    FROM
        tbl_cabinet_notes_ministry
        INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
        INNER JOIN mmt_cabinet_ministry_stage AS stage ON tbl_cabinet_notes_ministry.stage_id = stage.cab_ministry_stage_id
        WHERE created_by IN (${userIDs.join(',')})
        ORDER BY stage_id;
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

            const updateResult = await request.query(`
            UPDATE tbl_cabinet_notes_ministry_stage
            SET stage_name = @stage
            WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryID
        `);
        } else {

            const insertResult = await request.query(`
            INSERT INTO tbl_cabinet_notes_ministry_stage (cabinet_notes_ministry_id, stage_name)
            VALUES (@cabinetNotesMinistryID, @stage);
        `);
        }
        res.sendStatus(201);
    }


    catch (err) {
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
        const result = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry WHERE tbl_cabinet_notes_ministry.cabinet_notes_ministry_id = @ministryCabinetID;`);
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
    console.log('cabinet_notes_ministry_id',cabinetNotesMinistryId);

    const userID = req.params.userID;
    console.log('userID',userID);

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
        const dataToDelete = await request.query(`SELECT * FROM tbl_cabinet_notes_ministry WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);
    
        const result = await request.query(`DELETE FROM tbl_cabinet_notes_ministry WHERE cabinet_notes_ministry_id = @cabinetNotesMinistryId;`);
        // console.log('result',result);
        if (result.rowsAffected[0] > 0) {
            const logMessage = `User @userID deleted Cabinet Notes Ministry data with Data ID ${cabinetNotesMinistryId}. Deleted Data: ${dataJSON}\n`;

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

export default { createMinistryCabinet, getCabinetMinistry, editMinistryCabinet, getUpdateCabinetMinistryData, 
    createCabinetNotesMinistryStage , deleteCabinetNotesMinistry};