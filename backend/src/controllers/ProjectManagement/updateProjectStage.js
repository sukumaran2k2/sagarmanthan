
import { pool } from "../../db.js";

async function checkProjectStage(req, res) {
   
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let checkProStageId;
    console.log("no sub project", projectID, subProjectID)
 
    try {
        if(subProjectID == -1)
        {
            console.log("no sub project", projectID)
            checkProStageId = (`SELECT sub_stage_id, planned_date, actual_date 
                FROM tbl_project_date where project_id = @projectID;`)
        }
        else
        {
            checkProStageId = (`SELECT sub_stage_id, planned_date, actual_date
                FROM tbl_project_date WHERE sub_project_id = @subProjectID ;`)
        }
        const projectDateStage = await request.query(checkProStageId)
        
        const response = { projectDateStage:  projectDateStage.recordset,
        }
   
        res.json(response);
        console.log(result.recordset, "test")

    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

export default { checkProjectStage};