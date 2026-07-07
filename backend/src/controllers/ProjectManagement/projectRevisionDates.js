
import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";

async function saveRevisionDate (req, res) 
{
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    let projectSubStageID = req.body.projectSubStageID;
    let revisionStartDate = req.body.revisionStartDate;
    let revisionRemarks = req.body.revisionRemarks;

    console.log("projectID",projectID)
    console.log("projectSubStageID",projectSubStageID)
    console.log("revisionStartDate",revisionStartDate)
    console.log("revisionRemarks",revisionRemarks)
  
    if(revisionStartDate == "")
    {
        revisionStartDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("projectID", projectID); 
    request.input("subProjectID", subProjectID); 
    request.input("projectSubStageID", projectSubStageID);
    request.input("revisionStartDate", revisionStartDate);
    request.input("revisionRemarks", revisionRemarks);

    console.log("projectID 1",projectID)
    console.log("projectSubStageID 1",projectSubStageID)
    console.log("revisionStartDate 1",revisionStartDate)
    console.log("revisionRemarks 1",revisionRemarks)
  

    try 
    {  let lastUpdatedStatus;
        let isExists = await request.query(`SELECT project_id from tbl_project_date where project_id = @projectID
            AND  sub_stage_id = @projectSubStageID ;`);
        if(isExists.recordset.length > 0)
        {
            console.log("update")
            if (subProjectID == -1) {
                const result = await request.query(`UPDATE tbl_project_date SET revised_date = @revisionStartDate, 
                remarks = @revisionRemarks WHERE project_id = @projectID AND sub_stage_id = @projectSubStageID `); 
                
                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }
            else {
                const result = await request.query(`UPDATE tbl_project_date SET revised_date = @revisionStartDate, 
                remarks = @revisionRemarks WHERE sub_project_id = @subProjectID AND sub_stage_id = @projectSubStageID `);
                
                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            }  
        }    
        else
        {   
            console.log("insert")

            const result = await request.query(`INSERT INTO tbl_project_date (project_id, sub_project_id, sub_stage_id, revised_date, 
                remarks) VALUES (@projectID, @subProjectID, @projectSubStageID, @revisionStartDate, @revisionRemarks )`); 

                lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }       

        if(revisionStartDate)
        {
            const result = await request.query(`INSERT INTO tbl_project_date_history (project_id, sub_project_id, sub_stage_id, revised_date, remarks)
            VALUES (@projectID, @subProjectID, @projectSubStageID, @revisionStartDate, @revisionRemarks)`); 

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }
        
        res.sendStatus(lastUpdatedStatus);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default {saveRevisionDate };
