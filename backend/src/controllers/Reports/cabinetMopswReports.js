
import { pool } from "../../db.js";

async function getMopswReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT
                mmt_wings.wing_id AS wing,
                tbl_cabinet_notes_mopsw.stage_id,
                mmt_wings.wing_name,
                COUNT(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) AS cabinet_notes_mopsw_count
            FROM
                mmt_wings
            LEFT JOIN
                tbl_cabinet_notes_mopsw ON tbl_cabinet_notes_mopsw.wing = mmt_wings.wing_id
            LEFT JOIN
                mmt_cabinet_mopsw_stage ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
            GROUP BY
                mmt_wings.wing_id, tbl_cabinet_notes_mopsw.stage_id, mmt_wings.wing_name
            ORDER BY
                wing_name;
        ;`);

        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCabinetMopswDivisionReport (req, res) 
{
    const wingID = req.params.wingID;
    
    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);

    try 
    {
        const result = await request.query(`SELECT division, stage_id, division_name, 
            count(tbl_cabinet_notes_mopsw.cabinet_notes_mopsw_id) as cabinet_notes_mopsw_count  
            FROM tbl_cabinet_notes_mopsw 

            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
            
            WHERE wing = @wingID
            GROUP BY division, stage_id, division_name
            ORDER BY division_name
        ;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDetailMopswWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const mopswStage = req.params.mopswStage;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("mopswStage", mopswStage);

    try 
    {
            const result = await request.query(`SELECT wing, division, subject, pre_dcn_prepared, pre_dcn_prepared_date,
            pre_dcn__approved, pre_dcn__approved_date, cirucalted_for_imc, cirucalted_for_imc_date, imc_comments_rec, imc_comments_rec_date,
            final_dcn_prepared, final_dcn_prepared_date, final_dcn_approved, final_dcn_approved_date, 
            advance_copy_sent_to_pmo, advance_copy_sent_to_pmo_date, cabinet_approved, cabinet_approved_date, on_hold, 
            on_hold_date, completed, completed_date, remarks, updated_date

            FROM tbl_cabinet_notes_mopsw 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id
            
            WHERE (wing = @wingID) AND tbl_cabinet_notes_mopsw.stage_id = @mopswStage
            ORDER BY subject
        ;`);
            
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailMopswDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const mopswStage = req.params.mopswStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("mopswStage", mopswStage);

    try 
    {
        const result = await request.query(`SELECT wing, division, subject, pre_dcn_prepared, pre_dcn_prepared_date,
            pre_dcn__approved, pre_dcn__approved_date, cirucalted_for_imc, cirucalted_for_imc_date, imc_comments_rec, imc_comments_rec_date,
            final_dcn_prepared, final_dcn_prepared_date, final_dcn_approved, final_dcn_approved_date, 
            advance_copy_sent_to_pmo, advance_copy_sent_to_pmo_date, cabinet_approved, cabinet_approved_date, on_hold, 
            on_hold_date, completed, completed_date, remarks, updated_date

            FROM tbl_cabinet_notes_mopsw 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_cabinet_notes_mopsw.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw.stage_id

            WHERE (division = @divisionID) AND tbl_cabinet_notes_mopsw.stage_id = @mopswStage
            ORDER BY subject
        ;`);
            
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { getMopswReport, getCabinetMopswDivisionReport, getDetailMopswWingWise, getDetailMopswDivisionWise };