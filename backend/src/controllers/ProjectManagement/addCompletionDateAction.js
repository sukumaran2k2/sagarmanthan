
import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";
import { addLastUpdatedStagePC } from "./lastUpdatedStage.js";


async function addCompletionDate(req, res) {
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const actualCompletionDate = req.body.actualCompletionDate;
    const closureCost = req.body.closureCost;
    const projectStageID = req.body.projectStageID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("actualCompletionDate", actualCompletionDate);
    request.input("closureCost", closureCost);
    request.input("projectStageID", projectStageID);

    try {
        let lastUpdatedStatus;
        if (subProjectID == -1) {
            const result = await request.query(`UPDATE tbl_project SET actual_date_of_completion = @actualCompletionDate, 
            closure_cost = @closureCost
            WHERE project_id = @projectID`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }
        else {
            const result = await request.query(`UPDATE tbl_sub_project SET sub_actual_date_of_completion = @actualCompletionDate, 
            sub_closure_cost = @closureCost
            WHERE sub_project_id = @subProjectID`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        if (subProjectID == -1) {
            // const result = await request.query(`UPDATE tbl_project SET project_stage_id = @projectStageID WHERE project_id = @projectID;`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }
        else {
            // const result = await request.query(`UPDATE tbl_sub_project SET sub_project_stage_id = @projectStageID WHERE sub_project_id = @subProjectID;`);

            lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
        }

        if(actualCompletionDate == "" || !actualCompletionDate){
            actualCompletionDate = null;
        }

        if( actualCompletionDate !== null ){
            const lastUpdatedStage = await addLastUpdatedStagePC(projectID, subProjectID, req, res);
        }
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