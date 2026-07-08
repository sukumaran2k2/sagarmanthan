import { pool } from "../../db.js";

async function addLastUpdatedDate(projectID, subProjectID, req, res) 
{
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try 
    {
        if (subProjectID == -1) 
        {
            const result = await request.query(`UPDATE tbl_project SET last_updated = getDate() WHERE project_id = @projectID`);
        } 
        else 
        {
            const result = await request.query(`UPDATE tbl_sub_project SET sub_last_updated = getDate() WHERE sub_project_id = @subProjectID`);
        }
        return 200;
    } 
    catch (err) 
    {
        console.log(err);
        return 500;
    }
}

async function addContractPhysicalProgress(projectID, subProjectID, userID,  req, res) 
{

    console.log("called contract");
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("userID", userID);

    try 
    {
        if (subProjectID == -1) 
        {
            console.log("add contract progress")

            const result = await request.query(`INSERT INTO tbl_project_physical_progress(project_id, sub_project_id, physical_progress, progress_date, updated_by) 
            VALUES(@projectID, -1, 0, GETDATE(), @userID)`);

        } 
        else 
        {
            const result = await request.query(`INSERT INTO tbl_project_physical_progress(project_id, sub_project_id, physical_progress, progress_date, updated_by) 
            VALUES(@projectID, @subProjectID, 0,  GETDATE(), @userID)`);
        }
        return 200;
    } 
    catch (err) 
    {
        console.log(err);
        return 500;
    }
}

export { addLastUpdatedDate, addContractPhysicalProgress };

