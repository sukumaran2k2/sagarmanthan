
import { pool } from "../../db.js";

async function cabinetMinistryReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT mmt_ministry.ministry_name as ministry_name, tbl_cabinet_notes_ministry.ministry_id, 
        count(received_ministry) as received_ministry, count(sent_for_comments) as sent_for_comments, count(comments_rec) 
        as comments_rec, count(file_submitted) as file_submitted, count(reply_furnished) as reply_furnished
        FROM tbl_cabinet_notes_ministry 
        INNER JOIN mmt_ministry on mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
        GROUP BY mmt_ministry.ministry_name, tbl_cabinet_notes_ministry.ministry_id;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getMinistryDetailsReport (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT mmt_ministry.ministry_name as ministry_name, subject, deadline, received_ministry,
        received_ministry_date, sent_for_comments, sent_for_comments_date, comments_rec, comments_rec_date, file_submitted, 
        file_submitted_date, reply_furnished, reply_furnished_date, remarks, updated_date
        FROM tbl_cabinet_notes_ministry 
        INNER JOIN mmt_ministry on mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
         ;`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


export default { cabinetMinistryReport, getMinistryDetailsReport };