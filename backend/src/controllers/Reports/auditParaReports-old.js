
import { pool } from "../../db.js";

async function auditParaWiseReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT tbl_audit_para.wing, tbl_audit_para.division, 
        mmt_wings.wing_name, mmt_division.division_name,  
        count(received_at_ministry) as received_at_ministry, count(comments_sought) as comments_sought, count(comments_rec) 
        as comments_rec, count(comments_furnished) as comments_furnished, count(cag_accepted) as cag_accepted, 
        count(disposed) as disposed
        FROM tbl_audit_para 
        INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
        INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division

        GROUP BY mmt_wings.wing_name, mmt_division.division_name, tbl_audit_para.wing, tbl_audit_para.division ;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function auditParaDivisionReport (req, res) 
{
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    // console.log(wingID, "wingID")
    try 
    {
        const result = await request.query(`SELECT tbl_audit_para.wing, tbl_audit_para.division, 
        mmt_wings.wing_name, mmt_division.division_name,  
        count(received_at_ministry) as received_at_ministry, count(comments_sought) as comments_sought, count(comments_rec) 
        as comments_rec, count(comments_furnished) as comments_furnished, count(cag_accepted) as cag_accepted, 
        count(disposed) as disposed
        FROM tbl_audit_para 
        INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
        INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
        WHERE wing = @wingID
        GROUP BY mmt_wings.wing_name, mmt_division.division_name, tbl_audit_para.wing, tbl_audit_para.division
         ;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


// async function getDetailAuditParaReports (req, res) 
// {   
//     const wingID = req.params.wingID;
//     const divisionID = req.params.divisionID;
//     const auditParaStage = req.params.auditParaStage;

//     const conn = await pool;
//     const request = conn.request();
//     request.input("wingID", wingID);
//     request.input("divisionID", divisionID);
//     request.input("auditParaStage", auditParaStage);

//     console.log(auditParaStage)

//     try 
//     {
//         const result = await request.query(`SELECT para_number, subject, wing, division, category, date_of_receipt, 
//         received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
//         under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
//         disposed_date, remarks, updated_date

//         FROM tbl_audit_para 
//         INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
//         INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
//         INNER JOIN tbl_audit_para_stage on tbl_audit_para_stage.audit_para_id = tbl_audit_para.audit_para_id
//         INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_name = tbl_audit_para_stage.stage_name

//         WHERE (wing = @wingID AND division = @divisionID) 
//         AND tbl_audit_para_stage.stage_name IN 
//         (
//             SELECT audit_para_stage_name FROM mmt_audit_para_stage WHERE audit_para_stage_id >= 
//                 (SELECT audit_para_stage_id FROM mmt_audit_para_stage t1 WHERE audit_para_stage_name = @auditParaStage )
//         )  ;`);
        
//     res.json(result.recordset);
// }
// catch(err) 
// {
//     console.log(err);
//     return res.sendStatus(500);
// }

// };

async function getDetailAuditParaWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const auditParaStage = req.params.auditParaStage;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("auditParaStage", auditParaStage);

    console.log(auditParaStage)

    try 
    {
        const result = await request.query(`SELECT para_number, subject, wing, division, category, date_of_receipt, 
        received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
        under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
        disposed_date, remarks, updated_date

        FROM tbl_audit_para 
        INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
        INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
        INNER JOIN tbl_audit_para_stage on tbl_audit_para_stage.audit_para_id = tbl_audit_para.audit_para_id
        INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_name = tbl_audit_para_stage.stage_name

        WHERE (wing = @wingID) 
        AND tbl_audit_para_stage.stage_name IN 
        (
            SELECT audit_para_stage_name FROM mmt_audit_para_stage WHERE audit_para_stage_id >= 
                (SELECT audit_para_stage_id FROM mmt_audit_para_stage t1 WHERE audit_para_stage_name = @auditParaStage )
        )  ;`);
        
    res.json(result.recordset);
}
catch(err) 
{
    console.log(err);
    return res.sendStatus(500);
}

};

async function getDetailAuditParaDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const auditParaStage = req.params.auditParaStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("auditParaStage", auditParaStage);

    console.log(divisionID)

    try 
    {
        const result = await request.query(`SELECT para_number, subject, wing, division, category, date_of_receipt, 
        received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
        under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
        disposed_date, remarks, updated_date

        FROM tbl_audit_para 
        INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_audit_para.wing
        INNER JOIN mmt_division on mmt_division.division_id = tbl_audit_para.division
        INNER JOIN tbl_audit_para_stage on tbl_audit_para_stage.audit_para_id = tbl_audit_para.audit_para_id
        INNER JOIN mmt_audit_para_stage on mmt_audit_para_stage.audit_para_stage_name = tbl_audit_para_stage.stage_name

        WHERE (division = @divisionID) 
        AND tbl_audit_para_stage.stage_name IN 
        (
            SELECT audit_para_stage_name FROM mmt_audit_para_stage WHERE audit_para_stage_id >= 
                (SELECT audit_para_stage_id FROM mmt_audit_para_stage t1 WHERE audit_para_stage_name = @auditParaStage )
        )  ;`);
        
    res.json(result.recordset);
}
catch(err) 
{
    console.log(err);
    return res.sendStatus(500);
}

};

export default { auditParaWiseReport, auditParaDivisionReport, getDetailAuditParaWingWise, getDetailAuditParaDivisionWise };