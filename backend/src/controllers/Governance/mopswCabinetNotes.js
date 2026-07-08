
import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';

async function createMopswCabinet(req, res) {
    
    const data = req.body;
    console.log(data);
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    const preliDcnPrepared = req.body.preliDcnPrepared;
    let preliDcnPreparedDate = req.body.preliDcnPreparedDate;
    const preliDcnApproved = req.body.preliDcnApproved;
    let preliDcnApprovedDate = req.body.preliDcnApprovedDate;
    const circulatedForImc = req.body.circulatedForImc;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    const imcCommentsRec = req.body.imcCommentsRec;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    const finalDcnPrepared = req.body.finalDcnPrepared;
    let dcmbeemApprovedDate  = req.body.dcmbeemApprovedDate;
    const dcmbeemApproved  = req.body.dcmbeemApproved;
    let finalDcnPreparedDate = req.body.finalDcnPreparedDate;
    const finalDcnApproved = req.body.finalDcnApproved;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    const advanceCopySentToPmo = req.body.advanceCopySentToPmo;
    let advanceCopySentToPmoDate = req.body.advanceCopySentToPmoDate;
    const cabinetApproved = req.body.cabinetApproved;
    let cabinetApprovedDate = req.body.cabinetApprovedDate;
    const onHold = req.body.onHold;
    let onHoldDate = req.body.onHoldDate;
    const completed = req.body.completed;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    let selectedCabinetNotesStage = req.body.selectedCabinetNotesStage;
    const userID = req.body.userID;

    if (preliDcnPreparedDate == "") {
        preliDcnPreparedDate = null;
    }
    if (preliDcnApprovedDate == "") {
        preliDcnApprovedDate = null;
    }
    if (circulatedForImcDate == "") {
        circulatedForImcDate = null;
    }
    if (imcCommentsRecDate == "") {
        imcCommentsRecDate = null;
    }
    if (finalDcnPreparedDate == "") {
        finalDcnPreparedDate = null;
    }
    if (finalDcnApprovedDate == "") {
        finalDcnApprovedDate = null;
    }
    if (advanceCopySentToPmoDate == "") {
        advanceCopySentToPmoDate = null;
    }
    if (cabinetApprovedDate == "") {
        cabinetApprovedDate = null;
    }
    if (onHoldDate == "") {
        onHoldDate = null;
    }
    if (completedDate == "") {
        completedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preliDcnPrepared", preliDcnPrepared);
    request.input("preliDcnPreparedDate", preliDcnPreparedDate);
    request.input("preliDcnApproved", preliDcnApproved);
    request.input("preliDcnApprovedDate", preliDcnApprovedDate);
    request.input("circulatedForImc", circulatedForImc);
    request.input("circulatedForImcDate", circulatedForImcDate);
    request.input("imcCommentsRec", imcCommentsRec);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("finalDcnPrepared", finalDcnPrepared);
    request.input("finalDcnPreparedDate", finalDcnPreparedDate);
    request.input("finalDcnApproved", finalDcnApproved);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("advanceCopySentToPmo", advanceCopySentToPmo);
    request.input("advanceCopySentToPmoDate", advanceCopySentToPmoDate);
    request.input("dcmbeemApprovedDate", dcmbeemApprovedDate);
    request.input("dcmbeemApproved", dcmbeemApproved  );
    request.input("cabinetApproved", cabinetApproved);
    request.input("cabinetApprovedDate", cabinetApprovedDate);
    request.input("onHold", onHold);
    request.input("onHoldDate", onHoldDate);
    request.input("completed", completed);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedCabinetNotesStage",selectedCabinetNotesStage);
    request.input("userID", userID);

    try {
        const result = await request.query(
            `INSERT INTO tbl_cabinet_notes_mopsw (stage_id, wing, division, subject, pre_dcn_prepared, pre_dcn_prepared_date,
            pre_dcn__approved, pre_dcn__approved_date, cirucalted_for_imc, cirucalted_for_imc_date, imc_comments_rec, imc_comments_rec_date,
            final_dcn_prepared, final_dcn_prepared_date, final_dcn_approved, final_dcn_approved_date, 
            advance_copy_sent_to_pmo, advance_copy_sent_to_pmo_date, cabinet_approved, cabinet_approved_date, on_hold, 
            on_hold_date, completed, completed_date,dcmbeen_approved,dcmbeen_approved_date,remarks, created_by)
            OUTPUT INSERTED.cabinet_notes_mopsw_id
             VALUES 
            (@selectedCabinetNotesStage, @wing, @division, @subject, @preliDcnPrepared, @preliDcnPreparedDate, @preliDcnApproved, @preliDcnApprovedDate, 
            @circulatedForImc, @circulatedForImcDate, @imcCommentsRec, @imcCommentsRecDate, 
            @finalDcnPrepared, @finalDcnPreparedDate, @finalDcnApproved, @finalDcnApprovedDate, 
            @advanceCopySentToPmo, @advanceCopySentToPmoDate, @cabinetApproved, @cabinetApprovedDate, @onHold, 
            @onHoldDate, @completed, @completedDate,@dcmbeemApproved,@dcmbeemApprovedDate, @remarks, @userID)`
        );

        const cabinet_notes_mopsw_id = result.recordset[0].cabinet_notes_mopsw_id;    
        console.log(result);
        res.status(201).json({ cabinet_notes_mopsw_id });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function editMopswCabinet(req, res) {


    const mopswCabinetID = req.body.mopswCabinetID;
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    const preliDcnPrepared = req.body.preliDcnPrepared;
    let preliDcnPreparedDate = req.body.preliDcnPreparedDate;
    const preliDcnApproved = req.body.preliDcnApproved;
    let preliDcnApprovedDate = req.body.preliDcnApprovedDate;
    const circulatedForImc = req.body.circulatedForImc;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    const imcCommentsRec = req.body.imcCommentsRec;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    const finalDcnPrepared = req.body.finalDcnPrepared;
    let finalDcnPreparedDate = req.body.finalDcnPreparedDate;
    const finalDcnApproved = req.body.finalDcnApproved;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    const dcmbeenApproved = req.body.dcmbeenApproved;
    let dcmbeenApprovedDate = req.body.dcmbeenApprovedDate;
    console.log("✅ DCM Approved:", dcmbeenApproved);
    console.log("📅 DCM Approved Date:", dcmbeenApprovedDate);
    const advanceCopySentToPmo = req.body.advanceCopySentToPmo;
    let advanceCopySentToPmoDate = req.body.advanceCopySentToPmoDate;
    const cabinetApproved = req.body.cabinetApproved;
    let cabinetApprovedDate = req.body.cabinetApprovedDate;
    const onHold = req.body.onHold;
    let onHoldDate = req.body.onHoldDate;
    const completed = req.body.completed;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    let selectedCabinetNotesStage = req.body.selectedCabinetNotesStage;
    const userID = req.body.userID;
 

    if (preliDcnPreparedDate == "") {
        preliDcnPreparedDate = null;
    }
    if (preliDcnApprovedDate == "") {
        preliDcnApprovedDate = null;
    }
    if (circulatedForImcDate == "") {
        circulatedForImcDate = null;
    }
    if (imcCommentsRecDate == "") {
        imcCommentsRecDate = null;
    }
    if (finalDcnPreparedDate == "") {
        finalDcnPreparedDate = null;
    }
    if (finalDcnApprovedDate == "") {
        finalDcnApprovedDate = null;
    }
    if (advanceCopySentToPmoDate == "") {
        advanceCopySentToPmoDate = null;
    }
    if (cabinetApprovedDate == "") {
        cabinetApprovedDate = null;
    }
    if (onHoldDate == "") {
        onHoldDate = null;
    }
    if (completedDate == "") {
        completedDate = null;
    }
    if (dcmbeenApprovedDate == "") {
        dcmbeenApprovedDate = null;
    }
    
    const conn = await pool;
    const request = conn.request();
    request.input("mopswCabinetID", mopswCabinetID);
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preliDcnPrepared", preliDcnPrepared);
    request.input("preliDcnPreparedDate", preliDcnPreparedDate);
    request.input("preliDcnApproved", preliDcnApproved);
    request.input("preliDcnApprovedDate", preliDcnApprovedDate);
    request.input("circulatedForImc", circulatedForImc);
    request.input("circulatedForImcDate", circulatedForImcDate);
    request.input("imcCommentsRec", imcCommentsRec);
    request.input("imcCommentsRecDate", imcCommentsRecDate);
    request.input("finalDcnPrepared", finalDcnPrepared);
    request.input("finalDcnPreparedDate", finalDcnPreparedDate);
    request.input("finalDcnApproved", finalDcnApproved);
    request.input("finalDcnApprovedDate", finalDcnApprovedDate);
    request.input("dcmbeenApproved", dcmbeenApproved);
    request.input("dcmbeenApprovedDate", dcmbeenApprovedDate);
    request.input("advanceCopySentToPmo", advanceCopySentToPmo);
    request.input("advanceCopySentToPmoDate", advanceCopySentToPmoDate);
    request.input("cabinetApproved", cabinetApproved);
    request.input("cabinetApprovedDate", cabinetApprovedDate);
    request.input("onHold", onHold);
    request.input("onHoldDate", onHoldDate);
    request.input("completed", completed);
    request.input("completedDate", completedDate);
    request.input("remarks", remarks);
    request.input("selectedCabinetNotesStage",selectedCabinetNotesStage);
    request.input("userID", userID);

    try {
        const result = await request.query(
            `UPDATE tbl_cabinet_notes_mopsw SET
            pre_dcn_prepared = @preliDcnPrepared,
            pre_dcn_prepared_date = @preliDcnPreparedDate,
            pre_dcn__approved = @preliDcnApproved,
            pre_dcn__approved_date = @preliDcnApprovedDate,
            cirucalted_for_imc = @circulatedForImc,
            cirucalted_for_imc_date = @circulatedForImcDate,
            imc_comments_rec = @imcCommentsRec,
            imc_comments_rec_date = @imcCommentsRecDate,
            final_dcn_prepared = @finalDcnPrepared,
            final_dcn_prepared_date = @finalDcnPreparedDate,
            final_dcn_approved = @finalDcnApproved,
            final_dcn_approved_date = @finalDcnApprovedDate,
            dcmbeen_approved = @dcmbeenApproved  ,
            dcmbeen_approved_date = @dcmbeenApprovedDate,
            advance_copy_sent_to_pmo = @advanceCopySentToPmo,
            advance_copy_sent_to_pmo_date = @advanceCopySentToPmoDate,
            cabinet_approved = @cabinetApproved,
            cabinet_approved_date = @cabinetApprovedDate,
            on_hold = @onHold,
            on_hold_date = @onHoldDate,
            completed = @completed,
            completed_date = @completedDate,
            remarks = @remarks,
            subject = @subject,
            wing = @wing,
            division = @division,
            updated_by = @userID,
            stage_id = @selectedCabinetNotesStage,
            updated_date = GETDATE()
            OUTPUT INSERTED.cabinet_notes_mopsw_id
            WHERE cabinet_notes_mopsw_id = @mopswCabinetID`
        );

        const cabinet_notes_mopsw_id = result.recordset[0].cabinet_notes_mopsw_id;    

           res.status(201).json({ cabinet_notes_mopsw_id }); 
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateMopswData (req, res) 
{    
    const mopswCabinetID = req.params.mopswCabinetID;

    const conn = await pool;
    const request = conn.request();
    request.input("mopswCabinetID", mopswCabinetID);

    try
    {
        const result = await request.query(`SELECT * FROM tbl_cabinet_notes_mopsw WHERE tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id = @mopswCabinetID;`);
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createCabinetNotesMopswStage (req, res)
{
    const cabinetNotesMopswID = req.body.cabinetNotesMopswID;
    const stage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();

    request.input("cabinetNotesMopswID", cabinetNotesMopswID);
    request.input("stage", stage);

    try {
    
        const checkResult = await request.query(`
        SELECT COUNT(*) AS recordCount
        FROM tbl_cabinet_notes_mopsw_stage
        WHERE cabinet_notes_mopsw_id = @cabinetNotesMopswID
    `);

    if (checkResult.recordset[0].recordCount > 0) {

        const updateResult = await request.query(`
            UPDATE tbl_cabinet_notes_mopsw_stage
            SET stage_name = @stage
            WHERE cabinet_notes_mopsw_id = @cabinetNotesMopswID
        `);
    } else {
  
        const insertResult = await request.query(`
            INSERT INTO tbl_cabinet_notes_mopsw_stage (cabinet_notes_mopsw_id, stage_name)
            VALUES (@cabinetNotesMopswID, @stage);
        `);
    }
    res.sendStatus(201); 
}   

  
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCabinetMopsw (req, res) 
{
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT * FROM tbl_cabinet_notes_mopsw AS notes
        INNER JOIN mmt_division AS division ON notes.division = division.division_id
        INNER JOIN mmt_wings AS wings ON notes.wing = wings.wing_id
        INNER JOIN mmt_cabinet_mopsw_stage AS stage ON notes.stage_id = stage.mopsw_stage_id
        ORDER BY stage_id;`);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getAllCabinetMopsw (req, res) 
{
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT * ,
        CASE 
            WHEN notes.pre_dcn_prepared = '1' THEN 'Yes'
            ELSE 'No'
        END AS pre_dcn_prepared_op,
        CASE 
            WHEN notes.pre_dcn__approved = '1' THEN 'Yes'
            ELSE 'No'
        END AS pre_dcn__approved_op,
        CASE 
            WHEN notes.cirucalted_for_imc = '1' THEN 'Yes'
            ELSE 'No'
        END AS cirucalted_for_imc_op,
        CASE 
            WHEN notes.imc_comments_rec = '1' THEN 'Yes'
            ELSE 'No'
        END AS imc_comments_rec_op,
        CASE 
            WHEN notes.final_dcn_prepared = '1' THEN 'Yes'
            ELSE 'No'
        END AS final_dcn_prepared_op,
        CASE 
            WHEN notes.final_dcn_approved = '1' THEN 'Yes'
            ELSE 'No'
        END AS final_dcn_approved_op,
          CASE 
            WHEN notes.dcmbeen_approved = '1' THEN 'Yes'
            ELSE 'No'
        END AS dcmbeen_approved_op,
        
        CASE 
            WHEN notes.advance_copy_sent_to_pmo = '1' THEN 'Yes'
            ELSE 'No'
        END AS advance_copy_sent_to_pmo_op,
        CASE 
            WHEN notes.cabinet_approved = '1' THEN 'Yes'
            ELSE 'No'
        END AS cabinet_approved_op,
        CASE 
            WHEN notes.on_hold = '1' THEN 'Yes'
            ELSE 'No'
        END AS on_hold_op,
        CASE 
            WHEN notes.completed = '1' THEN 'Yes'
            ELSE 'No'
        END AS completed_op
    
    FROM tbl_cabinet_notes_mopsw AS notes
        INNER JOIN mmt_division AS division ON notes.division = division.division_id
        INNER JOIN mmt_wings AS wings ON notes.wing = wings.wing_id
        INNER JOIN mmt_cabinet_mopsw_stage AS stage ON notes.stage_id = stage.mopsw_stage_id
        ORDER BY stage_id;`);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getMopswDocument(req, res) {
    const mopswCabinetID = req.params.mopswCabinetID;
   // console.log('mopswCabinetID', mopswCabinetID);
    const conn = await pool;
    const request = conn.request();
    request.input('mopswCabinetID',mopswCabinetID);

    try {            
            const result = await request.query(`
            SELECT * FROM tbl_cabinet_notes_mopsw_document
            WHERE mopsw_cabinet_id = @mopswCabinetID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteCabinetNotesMopsw(req, res) {
    try {
        const mopswCabinetID = req.params.cabinet_notes_mopsw_id;
        const userID = req.params.userID;

        const conn = await pool;
        const request = conn.request();
        request.input('mopswCabinetID', mopswCabinetID);
    
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
        const hourPart = String(now.getHours()).padStart(2, '0'); 
        const minutePart = String(now.getMinutes()).padStart(2, '0'); 
        const secondPart = String(now.getSeconds()).padStart(2, '0'); 
        const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
        const logFolder = `./delete_log/cabinet_notes_mopsw`;
        const logFileName = `${logFolder}/deleted_cabinet_notes_mopsw_log_${timestamp}.txt`;
        
        const result = await request.query(
            `SELECT * FROM tbl_cabinet_notes_mopsw WHERE cabinet_notes_mopsw_id = @mopswCabinetID`
        );

        // console.log("result",result);
        const exisMopswCabinetID = result.recordset[0].cabinet_notes_mopsw_id;

        // console.log('exisMopswCabinetID',exisMopswCabinetID);        
        request.input('exisMopswCabinetID', exisMopswCabinetID);

        const DocFileResult = await request.query(`SELECT cabinet_notes_mopsw_document FROM tbl_cabinet_notes_mopsw_document WHERE mopsw_cabinet_id = @exisMopswCabinetID`);
        console.log("DocFileResult",DocFileResult);
        const DocfileNamearray = DocFileResult.recordset.length > 0 ? DocFileResult.recordset.map(record => record.cabinet_notes_mopsw_document) : [];
        console.log("Document file Name array",DocfileNamearray);
        
        let dbDeletions = 0;
        let dbDocDeletions = 0;
        let fileSystemDeletions = 0;

        for (const fileName of DocfileNamearray) {

            const logMessage = `Deleting document '${fileName}' from tbl_cabinet_notes_mopsw_document...\n Deleted by userID -'${userID}'`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });
            
            request.input('fileName', fileName);
            const docDeleteQuery = `DELETE FROM tbl_cabinet_notes_mopsw_document WHERE cabinet_notes_mopsw_document = @fileName`;
            
            try{
                const result = await request.query(docDeleteQuery);
                console.log(`Record with fileName '${fileName}' deleted from the database successfully.`);
                dbDocDeletions++;

                const filePath = `./fileuploads/cabinet_notes_mopsw/${fileName}`;
                
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) {

                            console.error("Error deleting file:", err);
                        } else {
                            fileSystemDeletions++;
                        }
                    });
                } else {eNa
                    console.log(`File '${fileName}' does not exist, no deletion needed.`);
                }

            }catch (error) {
                console.error(`Error deleting record with fileName @fileName from the database:`, error);
            }
        }

        // console.log("Documents deleted successfully!");
        const resultData = result.recordset[0];
        const logMessage = `Deleting document '${JSON.stringify(resultData)}' from tbl_cabinet_notes_mopsw...\n Deleted by userID -'${userID}'`;
        fs.appendFile(logFileName, logMessage, (err) => {
            if (err) {
                console.error('Error writing to delete_logs.txt:', err);
            }
        });
                
        const deleteexistMopswCabinetID = await request.query(`DELETE FROM tbl_cabinet_notes_mopsw WHERE cabinet_notes_mopsw_id = @mopswCabinetID`);

        dbDeletions++;

        // console.log("Record Details deleted successfully.");
        // console.log('db record Deletions are ', dbDeletions, 'db Documents Deletions are ', dbDocDeletions, 'file System Deletions are ', fileSystemDeletions);

        if (dbDeletions > 0 && dbDocDeletions > 0 && fileSystemDeletions > 0) {

            // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbDocDeletions} Document deleted from the database.`);

        } else if (dbDeletions > 0) {

            if(dbDocDeletions > 0)
            {
                return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbDocDeletions} Document deleted from the database`);
            }

            return res.status(201).send(`${dbDeletions} records deleted from the database, but no files available in document.`);

        } else {

            return res.status(404).send("No data found for deletion. Please Contact Administration");

        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

export default { createMopswCabinet, getCabinetMopsw, getUpdateMopswData, editMopswCabinet, createCabinetNotesMopswStage, getMopswDocument, getAllCabinetMopsw, deleteCabinetNotesMopsw };