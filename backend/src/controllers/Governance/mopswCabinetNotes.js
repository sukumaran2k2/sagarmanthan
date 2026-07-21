
import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';

function parseDateTime(val) {
    if (!val || val === "") return null;
    const parts = val.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const d = new Date();
    d.setFullYear(year, month, day);
    return d;
}

async function createMopswCabinet(req, res) {
    
    const data = req.body;
    console.log(data);
    const subject = req.body.subject;
    const wing = req.body.wing;
    const division = req.body.division;
    let preliDcnPreparedDate = req.body.preliDcnPreparedDate;
    let preliDcnApprovedDate = req.body.preliDcnApprovedDate;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    let dcmbeenApprovedDate = req.body.dcmbeenApprovedDate || req.body.dcmbeemApprovedDate;
    let finalDcnPreparedDate = req.body.finalDcnPreparedDate;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    let advanceCopySentToPmoDate = req.body.advanceCopySentToPmoDate;
    let cabinetApprovedDate = req.body.cabinetApprovedDate;
    let onHoldDate = req.body.onHoldDate;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    let selectedCabinetNotesStage = req.body.selectedCabinetNotesStage;
    const userID = req.body.userID;

    const preliDcnPreparedRemark = req.body.preliDcnPreparedRemark || null;
    const preliDcnApprovedRemark = req.body.preliDcnApprovedRemark || null;
    const circulatedForImcRemark = req.body.circulatedForImcRemark || null;
    const imcCommentsRecRemark = req.body.imcCommentsRecRemark || null;
    const finalDcnPreparedRemark = req.body.finalDcnPreparedRemark || null;
    const finalDcnApprovedRemark = req.body.finalDcnApprovedRemark || null;
    const dcmbeenApprovedRemark = req.body.dcmbeenApprovedRemark || null;
    const advanceCopySentToPmoRemark = req.body.advanceCopySentToPmoRemark || null;
    const cabinetApprovedRemark = req.body.cabinetApprovedRemark || null;
    const onHoldRemark = req.body.onHoldRemark || null;
    const completedRemark = req.body.completedRemark || null;

    const conn = await pool;
    const request = conn.request();
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preliDcnPreparedDate", sql.Date, parseDateTime(preliDcnPreparedDate));
    request.input("preliDcnApprovedDate", sql.Date, parseDateTime(preliDcnApprovedDate));
    request.input("circulatedForImcDate", sql.Date, parseDateTime(circulatedForImcDate));
    request.input("imcCommentsRecDate", sql.Date, parseDateTime(imcCommentsRecDate));
    request.input("finalDcnPreparedDate", sql.Date, parseDateTime(finalDcnPreparedDate));
    request.input("finalDcnApprovedDate", sql.Date, parseDateTime(finalDcnApprovedDate));
    request.input("advanceCopySentToPmoDate", sql.Date, parseDateTime(advanceCopySentToPmoDate));
    request.input("dcmbeenApprovedDate", sql.Date, parseDateTime(dcmbeenApprovedDate));
    request.input("cabinetApprovedDate", sql.Date, parseDateTime(cabinetApprovedDate));
    request.input("onHoldDate", sql.Date, parseDateTime(onHoldDate));
    request.input("completedDate", sql.Date, parseDateTime(completedDate));
    request.input("remarks", remarks);
    request.input("selectedCabinetNotesStage", selectedCabinetNotesStage);
    request.input("userID", userID);

    request.input("preliDcnPreparedRemark", preliDcnPreparedRemark);
    request.input("preliDcnApprovedRemark", preliDcnApprovedRemark);
    request.input("circulatedForImcRemark", circulatedForImcRemark);
    request.input("imcCommentsRecRemark", imcCommentsRecRemark);
    request.input("finalDcnPreparedRemark", finalDcnPreparedRemark);
    request.input("finalDcnApprovedRemark", finalDcnApprovedRemark);
    request.input("dcmbeenApprovedRemark", dcmbeenApprovedRemark);
    request.input("advanceCopySentToPmoRemark", advanceCopySentToPmoRemark);
    request.input("cabinetApprovedRemark", cabinetApprovedRemark);
    request.input("onHoldRemark", onHoldRemark);
    request.input("completedRemark", completedRemark);

    try {
        const result = await request.query(
            `INSERT INTO tbl_cabinet_notes_mopsw_change (stage_id, wing, division, subject, 
            pre_dcn_prepared_date, pre_dcn_prepared_remarks,
            pre_dcn_approved_date, pre_dcn__approved_remarks, 
            circulated_for_imc_date, cirucalted_for_imc_remarks, 
            imc_comments_rec_date, imc_comments_rec_remarks,
            final_dcn_prepared_date, final_dcn_prepared_remarks, 
            final_dcn_approved_date, final_dcn_approved_remarks, 
            dcm_been_approved_date, dcmbeen_approved_remarks, 
            advance_copy_sent_to_pmo_date, advance_copy_sent_to_pmo_remarks, 
            cabinet_approved_date, cabinet_approved_remarks, 
            on_hold_date, on_hold_remarks, 
            completed_date, completed_remarks, 
            remarks, created_by, created_date, updated_date)
            OUTPUT INSERTED.cabinet_notes_mopsw_id
             VALUES 
            (@selectedCabinetNotesStage, @wing, @division, @subject, 
            @preliDcnPreparedDate, @preliDcnPreparedRemark, 
            @preliDcnApprovedDate, @preliDcnApprovedRemark, 
            @circulatedForImcDate, @circulatedForImcRemark, 
            @imcCommentsRecDate, @imcCommentsRecRemark, 
            @finalDcnPreparedDate, @finalDcnPreparedRemark, 
            @finalDcnApprovedDate, @finalDcnApprovedRemark, 
            @dcmbeenApprovedDate, @dcmbeenApprovedRemark, 
            @advanceCopySentToPmoDate, @advanceCopySentToPmoRemark, 
            @cabinetApprovedDate, @cabinetApprovedRemark, 
            @onHoldDate, @onHoldRemark, 
            @completedDate, @completedRemark, 
            @remarks, @userID, GETDATE(), NULL)`
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
    let preliDcnPreparedDate = req.body.preliDcnPreparedDate;
    let preliDcnApprovedDate = req.body.preliDcnApprovedDate;
    let circulatedForImcDate = req.body.circulatedForImcDate;
    let imcCommentsRecDate = req.body.imcCommentsRecDate;
    let finalDcnPreparedDate = req.body.finalDcnPreparedDate;
    let finalDcnApprovedDate = req.body.finalDcnApprovedDate;
    let dcmbeenApprovedDate = req.body.dcmbeenApprovedDate || req.body.dcmbeemApprovedDate;
    const dcmbeenApprovedRemark = req.body.dcmbeenApprovedRemark;
    console.log("📅 DCM Approved Date:", dcmbeenApprovedDate);
    let advanceCopySentToPmoDate = req.body.advanceCopySentToPmoDate;
    let cabinetApprovedDate = req.body.cabinetApprovedDate;
    let onHoldDate = req.body.onHoldDate;
    let completedDate = req.body.completedDate;
    const remarks = req.body.remarks;
    let selectedCabinetNotesStage = req.body.selectedCabinetNotesStage;
    const userID = req.body.userID;

    const preliDcnPreparedRemark = req.body.preliDcnPreparedRemark || null;
    const preliDcnApprovedRemark = req.body.preliDcnApprovedRemark || null;
    const circulatedForImcRemark = req.body.circulatedForImcRemark || null;
    const imcCommentsRecRemark = req.body.imcCommentsRecRemark || null;
    const finalDcnPreparedRemark = req.body.finalDcnPreparedRemark || null;
    const finalDcnApprovedRemark = req.body.finalDcnApprovedRemark || null;
    const advanceCopySentToPmoRemark = req.body.advanceCopySentToPmoRemark || null;
    const cabinetApprovedRemark = req.body.cabinetApprovedRemark || null;
    const onHoldRemark = req.body.onHoldRemark || null;
    const completedRemark = req.body.completedRemark || null;
 
    const conn = await pool;
    const request = conn.request();
    request.input("mopswCabinetID", mopswCabinetID);
    request.input("subject", subject);
    request.input("wing", wing);
    request.input("division", division);
    request.input("preliDcnPreparedDate", sql.Date, parseDateTime(preliDcnPreparedDate));
    request.input("preliDcnApprovedDate", sql.Date, parseDateTime(preliDcnApprovedDate));
    request.input("circulatedForImcDate", sql.Date, parseDateTime(circulatedForImcDate));
    request.input("imcCommentsRecDate", sql.Date, parseDateTime(imcCommentsRecDate));
    request.input("finalDcnPreparedDate", sql.Date, parseDateTime(finalDcnPreparedDate));
    request.input("finalDcnApprovedDate", sql.Date, parseDateTime(finalDcnApprovedDate));
    request.input("dcmbeenApprovedDate", sql.Date, parseDateTime(dcmbeenApprovedDate));
    request.input("advanceCopySentToPmoDate", sql.Date, parseDateTime(advanceCopySentToPmoDate));
    request.input("cabinetApprovedDate", sql.Date, parseDateTime(cabinetApprovedDate));
    request.input("onHoldDate", sql.Date, parseDateTime(onHoldDate));
    request.input("completedDate", sql.Date, parseDateTime(completedDate));
    request.input("remarks", remarks);
    request.input("selectedCabinetNotesStage",selectedCabinetNotesStage);
    request.input("userID", userID);

    request.input("preliDcnPreparedRemark", preliDcnPreparedRemark);
    request.input("preliDcnApprovedRemark", preliDcnApprovedRemark);
    request.input("circulatedForImcRemark", circulatedForImcRemark);
    request.input("imcCommentsRecRemark", imcCommentsRecRemark);
    request.input("finalDcnPreparedRemark", finalDcnPreparedRemark);
    request.input("finalDcnApprovedRemark", finalDcnApprovedRemark);
    request.input("dcmbeenApprovedRemark", dcmbeenApprovedRemark);
    request.input("advanceCopySentToPmoRemark", advanceCopySentToPmoRemark);
    request.input("cabinetApprovedRemark", cabinetApprovedRemark);
    request.input("onHoldRemark", onHoldRemark);
    request.input("completedRemark", completedRemark);

    try {
        const result = await request.query(
            `UPDATE tbl_cabinet_notes_mopsw_change SET
            pre_dcn_prepared_date = @preliDcnPreparedDate,
            pre_dcn_prepared_remarks = @preliDcnPreparedRemark,
            pre_dcn_approved_date = @preliDcnApprovedDate,
            pre_dcn__approved_remarks = @preliDcnApprovedRemark,
            circulated_for_imc_date = @circulatedForImcDate,
            cirucalted_for_imc_remarks = @circulatedForImcRemark,
            imc_comments_rec_date = @imcCommentsRecDate,
            imc_comments_rec_remarks = @imcCommentsRecRemark,
            final_dcn_prepared_date = @finalDcnPreparedDate,
            final_dcn_prepared_remarks = @finalDcnPreparedRemark,
            final_dcn_approved_date = @finalDcnApprovedDate,
            final_dcn_approved_remarks = @finalDcnApprovedRemark,
            dcm_been_approved_date = @dcmbeenApprovedDate,
            dcmbeen_approved_remarks = @dcmbeenApprovedRemark,
            advance_copy_sent_to_pmo_date = @advanceCopySentToPmoDate,
            advance_copy_sent_to_pmo_remarks = @advanceCopySentToPmoRemark,
            cabinet_approved_date = @cabinetApprovedDate,
            cabinet_approved_remarks = @cabinetApprovedRemark,
            on_hold_date = @onHoldDate,
            on_hold_remarks = @onHoldRemark,
            completed_date = @completedDate,
            completed_remarks = @completedRemark,
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
        const result = await request.query(`SELECT * FROM tbl_cabinet_notes_mopsw_change WHERE tbl_cabinet_notes_mopsw_change.cabinet_notes_mopsw_id = @mopswCabinetID;`);
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

        const result = await conn.query(`SELECT *,
        (SELECT COUNT(*) FROM tbl_cabinet_notes_mopsw_document WHERE mopsw_cabinet_id = notes.cabinet_notes_mopsw_id) AS doc_count
        FROM tbl_cabinet_notes_mopsw_change AS notes
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
        (SELECT COUNT(*) FROM tbl_cabinet_notes_mopsw_document WHERE mopsw_cabinet_id = notes.cabinet_notes_mopsw_id) AS doc_count,
        CASE 
            WHEN notes.pre_dcn_prepared_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS pre_dcn_prepared_op,
        CASE 
            WHEN notes.pre_dcn_approved_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS pre_dcn__approved_op,
        CASE 
            WHEN notes.circulated_for_imc_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS cirucalted_for_imc_op,
        CASE 
            WHEN notes.imc_comments_rec_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS imc_comments_rec_op,
        CASE 
            WHEN notes.final_dcn_prepared_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS final_dcn_prepared_op,
        CASE 
            WHEN notes.final_dcn_approved_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS final_dcn_approved_op,
          CASE 
            WHEN notes.dcm_been_approved_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS dcmbeen_approved_op,
        
        CASE 
            WHEN notes.advance_copy_sent_to_pmo_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS advance_copy_sent_to_pmo_op,
        CASE 
            WHEN notes.cabinet_approved_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS cabinet_approved_op,
        CASE 
            WHEN notes.on_hold_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS on_hold_op,
        CASE 
            WHEN notes.completed_date IS NOT NULL THEN 'Yes'
            ELSE 'No'
        END AS completed_op
    
    FROM tbl_cabinet_notes_mopsw_change AS notes
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
            `SELECT * FROM tbl_cabinet_notes_mopsw_change WHERE cabinet_notes_mopsw_id = @mopswCabinetID`
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
                } else {
                    console.log(`File '${fileName}' does not exist, no deletion needed.`);
                }

            }catch (error) {
                console.error(`Error deleting record with fileName @fileName from the database:`, error);
            }
        }

        // console.log("Documents deleted successfully!");
        const resultData = result.recordset[0];
        const logMessage = `Deleting document '${JSON.stringify(resultData)}' from tbl_cabinet_notes_mopsw_change...\n Deleted by userID -'${userID}'`;
        fs.appendFile(logFileName, logMessage, (err) => {
            if (err) {
                console.error('Error writing to delete_logs.txt:', err);
            }
        });
                
        const deleteexistMopswCabinetID = await request.query(`DELETE FROM tbl_cabinet_notes_mopsw_change WHERE cabinet_notes_mopsw_id = @mopswCabinetID`);

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