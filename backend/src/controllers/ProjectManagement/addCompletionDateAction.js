import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";
import { loadStageSnapshot, syncProjectStage } from "./projectStage.js";


async function addCompletionDate(req, res) {
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const actualCompletionDate = req.body.actualCompletionDate || null;
    const closureCost = req.body.closureCost;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("actualCompletionDate", actualCompletionDate);
    request.input("closureCost", closureCost);

    try {
        const before = await loadStageSnapshot(projectID, subProjectID);

        if (subProjectID == -1) {
            await request.query(`UPDATE tbl_project SET actual_date_of_completion = @actualCompletionDate, 
            closure_cost = @closureCost
            WHERE project_id = @projectID`);
        }
        else {
            await request.query(`UPDATE tbl_sub_project SET sub_actual_date_of_completion = @actualCompletionDate, 
            sub_closure_cost = @closureCost
            WHERE sub_project_id = @subProjectID`);
        }

        const lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        await syncProjectStage(projectID, subProjectID, before);

        res.sendStatus(lastUpdatedStatus);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getCompletionPageData(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT actual_date_of_completion, closure_cost
            FROM tbl_project WHERE project_id = @projectID;`);
        }
        else {
            result = await request.query(`SELECT sub_actual_date_of_completion as actual_date_of_completion, sub_closure_cost as closure_cost
            FROM tbl_sub_project WHERE sub_project_id = @subProjectID;`);
        }
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


export default { addCompletionDate, getCompletionPageData };