
import { pool } from "../../db.js";

async function getMopswReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT
                mmt_wings.wing_id AS wing,
                tbl_cabinet_notes_mopsw_change.stage_id,
                mmt_wings.wing_name,
                COUNT(tbl_cabinet_notes_mopsw_change.cabinet_notes_mopsw_id) AS cabinet_notes_mopsw_count
            FROM
                mmt_wings
            LEFT JOIN
                tbl_cabinet_notes_mopsw_change ON tbl_cabinet_notes_mopsw_change.wing = mmt_wings.wing_id
            LEFT JOIN
                mmt_cabinet_mopsw_stage ON mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw_change.stage_id
            GROUP BY
                mmt_wings.wing_id, tbl_cabinet_notes_mopsw_change.stage_id, mmt_wings.wing_name
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
            count(tbl_cabinet_notes_mopsw_change.cabinet_notes_mopsw_id) as cabinet_notes_mopsw_count  
            FROM tbl_cabinet_notes_mopsw_change 

            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw_change.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw_change.stage_id
            
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
            const result = await request.query(`SELECT wing, division, subject, 
            CASE WHEN pre_dcn_prepared_date IS NOT NULL THEN '1' ELSE '0' END AS pre_dcn_prepared, pre_dcn_prepared_date,
            CASE WHEN pre_dcn_approved_date IS NOT NULL THEN '1' ELSE '0' END AS pre_dcn_approved, pre_dcn_approved_date, 
            CASE WHEN circulated_for_imc_date IS NOT NULL THEN '1' ELSE '0' END AS circulated_for_imc, circulated_for_imc_date, 
            CASE WHEN imc_comments_rec_date IS NOT NULL THEN '1' ELSE '0' END AS imc_comments_rec, imc_comments_rec_date,
            CASE WHEN final_dcn_prepared_date IS NOT NULL THEN '1' ELSE '0' END AS final_dcn_prepared, final_dcn_prepared_date, 
            CASE WHEN final_dcn_approved_date IS NOT NULL THEN '1' ELSE '0' END AS final_dcn_approved, final_dcn_approved_date, 
            CASE WHEN dcm_been_approved_date IS NOT NULL THEN '1' ELSE '0' END AS dcm_been_approved, dcm_been_approved_date,
            CASE WHEN advance_copy_sent_to_pmo_date IS NOT NULL THEN '1' ELSE '0' END AS advance_copy_sent_to_pmo, advance_copy_sent_to_pmo_date, 
            CASE WHEN cabinet_approved_date IS NOT NULL THEN '1' ELSE '0' END AS cabinet_approved, cabinet_approved_date, 
            CASE WHEN on_hold_date IS NOT NULL THEN '1' ELSE '0' END AS on_hold, on_hold_date, 
            CASE WHEN completed_date IS NOT NULL THEN '1' ELSE '0' END AS completed, completed_date, 
            remarks, updated_date

            FROM tbl_cabinet_notes_mopsw_change 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_cabinet_notes_mopsw_change.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw_change.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw_change.stage_id
            
            WHERE (wing = @wingID) AND tbl_cabinet_notes_mopsw_change.stage_id = @mopswStage
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
        const result = await request.query(`SELECT wing, division, subject, 
            CASE WHEN pre_dcn_prepared_date IS NOT NULL THEN '1' ELSE '0' END AS pre_dcn_prepared, pre_dcn_prepared_date,
            CASE WHEN pre_dcn_approved_date IS NOT NULL THEN '1' ELSE '0' END AS pre_dcn_approved, pre_dcn_approved_date, 
            CASE WHEN circulated_for_imc_date IS NOT NULL THEN '1' ELSE '0' END AS circulated_for_imc, circulated_for_imc_date, 
            CASE WHEN imc_comments_rec_date IS NOT NULL THEN '1' ELSE '0' END AS imc_comments_rec, imc_comments_rec_date,
            CASE WHEN final_dcn_prepared_date IS NOT NULL THEN '1' ELSE '0' END AS final_dcn_prepared, final_dcn_prepared_date, 
            CASE WHEN final_dcn_approved_date IS NOT NULL THEN '1' ELSE '0' END AS final_dcn_approved, final_dcn_approved_date, 
            CASE WHEN dcm_been_approved_date IS NOT NULL THEN '1' ELSE '0' END AS dcm_been_approved, dcm_been_approved_date,
            CASE WHEN advance_copy_sent_to_pmo_date IS NOT NULL THEN '1' ELSE '0' END AS advance_copy_sent_to_pmo, advance_copy_sent_to_pmo_date, 
            CASE WHEN cabinet_approved_date IS NOT NULL THEN '1' ELSE '0' END AS cabinet_approved, cabinet_approved_date, 
            CASE WHEN on_hold_date IS NOT NULL THEN '1' ELSE '0' END AS on_hold, on_hold_date, 
            CASE WHEN completed_date IS NOT NULL THEN '1' ELSE '0' END AS completed, completed_date, 
            remarks, updated_date

            FROM tbl_cabinet_notes_mopsw_change 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_cabinet_notes_mopsw_change.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_cabinet_notes_mopsw_change.division
            INNER JOIN mmt_cabinet_mopsw_stage on mmt_cabinet_mopsw_stage.mopsw_stage_id = tbl_cabinet_notes_mopsw_change.stage_id

            WHERE (division = @divisionID) AND tbl_cabinet_notes_mopsw_change.stage_id = @mopswStage
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