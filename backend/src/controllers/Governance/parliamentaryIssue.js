import { pool } from "../../db.js";
import fs from 'fs';

async function getParliamentaryIssue (req, res) 
{
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT *
        FROM [sagarmanthan_revamp].[dbo].[tbl_parliamentary_issue] AS tpi

        INNER JOIN [sagarmanthan_revamp].[dbo].[mmt_parliamentary_stage] AS mps
        ON tpi.stage_id = mps.parlia_stage_id
        INNER JOIN mmt_division ON tpi.division = mmt_division.division_id
        INNER JOIN mmt_wings ON tpi.wing = mmt_wings.wing_id
        ORDER BY stage_id;
        `);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createParliamentaryIssue (req, res) {
    const wing = req.body.wing;
    const division = req.body.division;
    const parliamentarySubject = req.body.parliamentarySubject;
    const fileNumber = req.body.fileNumber;
    const issueType = req.body.issueType;
    const assuranceNumber = req.body.assuranceNumber;
    const parliamentHouse = req.body.parliamentHouse;
    const nameOfMP = req.body.nameOfMP;
    let extensionSought = req.body.extensionSought;
    const received = req.body.received;
    let receivedDate = req.body.receivedDate;
    const commentSought = req.body.commentSought;
    let commentSoughtDate = req.body.commentSoughtDate;
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

    const extensionTimeSought = req.body.extensionTimeSought;
    let extensionTimeSoughtDate = req.body.extensionTimeSoughtDate;
    const replySend = req.body.replySend;
    let replySendDate = req.body.replySendDate;
    const debatedInParliament = req.body.debatedInParliament;
    let debatedInParliamentDate = req.body.debatedInParliamentDate;
    const impReportFurnished = req.body.impReportFurnished;
    let impReportFurnishedDate = req.body.impReportFurnishedDate;
    const matterDisposed = req.body.matterDisposed;
    let matterDisposedDate = req.body.matterDisposedDate;
    const remarks = req.body.remarks;
    const parlia_stage_id = req.body.parlia_stage_id;
    const userID = req.body.userID;
    
    if (extensionSought === "") {
        extensionSought = null;
    }
    if (receivedDate === "") {
        receivedDate = null;
    }
    if (commentSoughtDate === "") {
        commentSoughtDate = null;
    }
    if (commentsReceivedDate === "") {
        commentsReceivedDate = null;
    }
    if (extensionTimeSoughtDate === "") {
        extensionTimeSoughtDate = null;
    }
    if (replySendDate === "") {
        replySendDate = null;
    }
    if (debatedInParliamentDate === "") {
        debatedInParliamentDate = null;
    }
    if (impReportFurnishedDate === "") {
        impReportFurnishedDate = null;
    }
    if (matterDisposedDate === "") {
        matterDisposedDate = null;
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

    request.input("wing", wing);
    request.input("division", division);
    request.input("parliamentarySubject", parliamentarySubject);
    request.input("fileNumber", fileNumber);
    request.input("issueType", issueType);
    request.input("assuranceNumber", assuranceNumber);
    request.input("parliamentHouse", parliamentHouse);
    request.input("nameOfMP", nameOfMP);
    request.input("extensionSought", extensionSought);
    request.input("received", received);
    request.input("receivedDate", receivedDate);
    request.input("commentSought", commentSought);
    request.input("commentSoughtDate", commentSoughtDate);
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
    request.input("extensionTimeSought", extensionTimeSought);
    request.input("extensionTimeSoughtDate", extensionTimeSoughtDate);
    request.input("replySend", replySend);
    request.input("replySendDate", replySendDate);
    request.input("debatedInParliament", debatedInParliament);
    request.input("debatedInParliamentDate", debatedInParliamentDate);
    request.input("impReportFurnished", impReportFurnished);
    request.input("impReportFurnishedDate", impReportFurnishedDate);
    request.input("matterDisposed", matterDisposed);
    request.input("matterDisposedDate", matterDisposedDate);
    request.input("remarks", remarks); 
    request.input("parlia_stage_id", parlia_stage_id);
    request.input("userID", userID);
    try {
        const result = await request.query(`
        INSERT INTO tbl_parliamentary_issue (
            wing, division, subject, file_number, parliamentary_issue_type, assurance_number, parliament_house, name_of_mp, extension_sought_date, received_at_ministry, received_at_ministry_date, 
            comment_soughted, comment_soughted_date, comment_soughted_wings, comment_received, comment_received_date, shipping, shipping_date, 
            vigilance, vigilance_date, ports, ports_date, iwt, iwt_date, administration, administration_date, coord_I, coord_I_date,
            coord_II, coord_II_date, dgll_parliament_and_trw, dgll_parliament_and_trw_date, development, development_date, finance,
            finance_date, sagarmala, sagarmala_date, extension_time_soughted, extension_time_soughted_date, reply_send, 
            reply_send_date, debated_in_parliament, debated_in_parliament_date, implementation_report_furnished, 
            implementation_report_furnished_date, matter_disposed, matter_disposed_date, remarks, stage_id, created_by
        ) 
        OUTPUT INSERTED.parliamentary_issue_id
        VALUES (
            @wing, @division, @parliamentarySubject, @fileNumber, @issueType, @assuranceNumber, @parliamentHouse, @nameOfMP, @extensionSought, @received, @receivedDate, @commentSought, 
            @commentSoughtDate, @wings, @commentsReceived, @commentsReceivedDate, @shipping, @shippingDate, @vigilance, @vigilanceDate, @ports, 
            @portsDate, @iwt, @iwtDate, @administration, @administrationDate, @coordI, @coordIDate, @coordII, 
            @coordIIDate, @dgll, @dgllDate, @development, @developmentDate, @finance, @financeDate, @sagarmala, 
            @sagarmalaDate, @extensionTimeSought, @extensionTimeSoughtDate, @replySend,
            @replySendDate, @debatedInParliament, @debatedInParliamentDate, @impReportFurnished, @impReportFurnishedDate,
            @matterDisposed, @matterDisposedDate, @remarks, @parlia_stage_id, @userID
        )
    `);
    const parliamentary_issue_id = result.recordset[0].parliamentary_issue_id;    

    res.status(201).json({ parliamentary_issue_id });   
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editParliamentaryIssue(req, res) {

    const parliamentaryIssueID = req.body.parliamentaryIssueID;
    const wing = req.body.wing;
    const division = req.body.division;
    const parliamentarySubject = req.body.parliamentarySubject;
    const fileNumber = req.body.fileNumber;
    const issueType = req.body.issueType;
    const assuranceNumber = req.body.assuranceNumber;
    const parliamentHouse = req.body.parliamentHouse;
    const nameOfMP = req.body.nameOfMP;
    let extensionSought = req.body.extensionSought;
    const received = req.body.received;
    let receivedDate = req.body.receivedDate;
    const commentSought = req.body.commentSought;
    let commentSoughtDate = req.body.commentSoughtDate;
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

    const extensionTimeSought = req.body.extensionTimeSought;
    let extensionTimeSoughtDate = req.body.extensionTimeSoughtDate;
    const replySend = req.body.replySend;
    let replySendDate = req.body.replySendDate;
    const debatedInParliament = req.body.debatedInParliament;
    let debatedInParliamentDate = req.body.debatedInParliamentDate;
    const impReportFurnished = req.body.impReportFurnished;
    let impReportFurnishedDate = req.body.impReportFurnishedDate;
    const matterDisposed = req.body.matterDisposed;
    let matterDisposedDate = req.body.matterDisposedDate;
    const remarks = req.body.remarks;
    const parlia_stage_id = req.body.parlia_stage_id;
    const userID = req.body.userID;

    if (extensionSought === "") {
        extensionSought = null;
    }
    if (receivedDate === "") {
        receivedDate = null;
    }
    if (commentSoughtDate === "") {
        commentSoughtDate = null;
    }
    if (commentsReceivedDate === "") {
        commentsReceivedDate = null;
    }
    if (extensionTimeSoughtDate === "") {
        extensionTimeSoughtDate = null;
    }
    if (replySendDate === "") {
        replySendDate = null;
    }
    if (debatedInParliamentDate === "") {
        debatedInParliamentDate = null;
    }
    if (impReportFurnishedDate === "") {
        impReportFurnishedDate = null;
    }
    if (matterDisposedDate === "") {
        matterDisposedDate = null;
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

    request.input("parliamentaryIssueID", parliamentaryIssueID);
    request.input("wing", wing);
    request.input("division", division);
    request.input("parliamentarySubject", parliamentarySubject);
    request.input("fileNumber", fileNumber);
    request.input("issueType", issueType);
    request.input("assuranceNumber", assuranceNumber);
    request.input("parliamentHouse", parliamentHouse);
    request.input("nameOfMP", nameOfMP);
    request.input("extensionSought", extensionSought);
    request.input("received", received);
    request.input("receivedDate", receivedDate);
    request.input("commentSought", commentSought);
    request.input("commentSoughtDate", commentSoughtDate);
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
    request.input("extensionTimeSought", extensionTimeSought);
    request.input("extensionTimeSoughtDate", extensionTimeSoughtDate);
    request.input("replySend", replySend);
    request.input("replySendDate", replySendDate);
    request.input("debatedInParliament", debatedInParliament);
    request.input("debatedInParliamentDate", debatedInParliamentDate);
    request.input("impReportFurnished", impReportFurnished);
    request.input("impReportFurnishedDate", impReportFurnishedDate);
    request.input("matterDisposed", matterDisposed);
    request.input("matterDisposedDate", matterDisposedDate);
    request.input("remarks", remarks);
    request.input("parlia_stage_id", parlia_stage_id);
    request.input("userID", userID);
  
    try {
        const result = await request.query(
            `UPDATE tbl_parliamentary_issue SET 
            wing = @wing,
            division = @division,
            subject = @parliamentarySubject,
            file_number = @fileNumber,
            parliamentary_issue_type = @issueType,
            assurance_number = @assuranceNumber,
            parliament_house = @parliamentHouse,
            name_of_mp = @nameOfMP,
            extension_sought_date = @extensionSought,
            received_at_ministry = @received,
            received_at_ministry_date = @receivedDate,
            comment_soughted = @commentSought,
            comment_soughted_date = @commentSoughtDate,
            comment_soughted_wings = @wings,
            comment_received = @commentsReceived, 
            comment_received_date = @commentsReceivedDate,
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
            extension_time_soughted = @extensionTimeSought,
            extension_time_soughted_date = @extensionTimeSoughtDate,
            reply_send = @replySend,
            reply_send_date = @replySendDate,
            debated_in_parliament = @debatedInParliament,
            debated_in_parliament_date = @debatedInParliamentDate,
            implementation_report_furnished = @impReportFurnished,
            implementation_report_furnished_date = @impReportFurnishedDate,
            matter_disposed = @matterDisposed,
            matter_disposed_date = @matterDisposedDate,
            remarks = @remarks,
            stage_id = @parlia_stage_id,
            updated_by = @userID,
            updated_date = getDate()
            OUTPUT INSERTED.parliamentary_issue_id
            WHERE parliamentary_issue_id = @parliamentaryIssueID`
        );
        const parliamentary_issue_id = result.recordset[0].parliamentary_issue_id;    
            
        res.status(201).json({ parliamentary_issue_id });  
        }
        catch(err) {
            console.log(err);
            return res.sendStatus(500);
        }
    };

async function getUpdateParliamentaryIssueData (req, res) 
{    
    const parliamentaryIssueID = req.params.parliamentaryIssueID;

    const conn = await pool;
    const request = conn.request();
    request.input("parliamentaryIssueID", parliamentaryIssueID);

    try
    {
        const result = await request.query(`SELECT * FROM tbl_parliamentary_issue WHERE tbl_parliamentary_issue.parliamentary_issue_id = @parliamentaryIssueID;`);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteParliamentaryIssue (req, res) 
{    
    const parliamentaryIssueID = req.params.parliamentaryIssueID;
    console.log('parliamentaryIssueID',parliamentaryIssueID);

    const userID = req.params.userID;
    console.log('userID',userID);

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const hourPart = String(now.getHours()).padStart(2, '0'); 
    const minutePart = String(now.getMinutes()).padStart(2, '0'); 
    const secondPart = String(now.getSeconds()).padStart(2, '0'); 
    const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
    const logFolder = `./delete_log/Parlimentry_Issue`;
    const logFileName = `${logFolder}/deleted_Parlimentry_Issue_log_${timestamp}.txt`;
    

    const conn = await pool;
    const request = conn.request();
    request.input("parliamentaryIssueID", parliamentaryIssueID);

    try
    {
        
        const dataToDelete = await request.query(`SELECT * FROM tbl_parliamentary_issue WHERE parliamentary_issue_id = @parliamentaryIssueID;`);
        const dataJSON = JSON.stringify(dataToDelete.recordset[0]);

        const result = await request.query(`DELETE FROM tbl_parliamentary_issue WHERE parliamentary_issue_id = @parliamentaryIssueID;`);
        // return res.sendStatus(201);
        console.log('result',result);
        if (result.rowsAffected[0] > 0) {
                        
            const logMessage = `User '${userID}' deleted Parliamentary Issue data with Data ID '${parliamentaryIssueID}'. Deleted Data: ${dataJSON}\n`;

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


export default { getParliamentaryIssue, createParliamentaryIssue, editParliamentaryIssue, getUpdateParliamentaryIssueData, deleteParliamentaryIssue };