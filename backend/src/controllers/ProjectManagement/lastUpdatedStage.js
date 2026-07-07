import { pool } from "../../db.js";

//Under Tendering
async function addLastUpdatedStageUT(projectID, subProjectID, req, res) {
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        if (subProjectID == -1) {
            const stageCheck = await request.query(`Select current_project_stage_id From tbl_project WHERE project_id = @projectID`);
            const stageID = stageCheck.recordset[0].current_project_stage_id;

            if (stageID < 12) {
                const result = await request.query(`UPDATE tbl_project SET current_project_stage_id = 12 WHERE project_id = @projectID`);
            }
        }
        else {
            const stageCheck = await request.query(`Select sub_current_project_stage_id From tbl_sub_project WHERE sub_project_id = @subProjectID`);
            const stageID = stageCheck.recordset[0].sub_current_project_stage_id;

            if (stageID < 12) {
                const result = await request.query(`UPDATE tbl_sub_project SET sub_current_project_stage_id = 12 WHERE sub_project_id = @subProjectID`);
            }
        }
        return 200;
    }
    catch (err) {
        console.log(err);
        return 500;
    }
}


//Physical progress
async function addLastUpdatedStagePP(projectID, subProjectID, req, res) {
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        if (subProjectID == -1) {
            const stageCheck = await request.query(`Select current_project_stage_id From tbl_project WHERE project_id = @projectID`);
            const stageID = stageCheck.recordset[0].current_project_stage_id;

            if (stageID < 13) {
                const result = await request.query(`UPDATE tbl_project SET current_project_stage_id = 13 WHERE project_id = @projectID`);
            }
        }
        else {
            const stageCheck = await request.query(`Select sub_current_project_stage_id From tbl_sub_project WHERE sub_project_id = @subProjectID`);
            const stageID = stageCheck.recordset[0].sub_current_project_stage_id;

            if (stageID < 13) {
                const result = await request.query(`UPDATE tbl_sub_project SET sub_current_project_stage_id = 13 WHERE sub_project_id = @subProjectID`);
            }
        }
        return 200;
    }
    catch (err) {
        console.log(err);
        return 500;
    }
}

//Project Completion
async function addLastUpdatedStagePC(projectID, subProjectID, req, res) {
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        if (subProjectID == -1) {
            const stageCheck = await request.query(`Select current_project_stage_id From tbl_project WHERE project_id = @projectID`);
            const stageID = stageCheck.recordset[0].current_project_stage_id;

            if (stageID < 14) {
                const result = await request.query(`UPDATE tbl_project SET project_stage_id = 14, current_project_stage_id = 14 WHERE project_id = @projectID`);
            }
        }
        else {
            const stageCheck = await request.query(`Select sub_current_project_stage_id From tbl_sub_project WHERE sub_project_id = @subProjectID`);
            const stageID = stageCheck.recordset[0].sub_current_project_stage_id;

            if (stageID < 14) {
                const result = await request.query(`UPDATE tbl_sub_project SET sub_project_stage_id = 14, sub_current_project_stage_id = 14 WHERE sub_project_id = @subProjectID`);
            }
        }
        return 200;
    }
    catch (err) {
        console.log(err);
        return 500;
    }
}

export { addLastUpdatedStageUT, addLastUpdatedStagePP, addLastUpdatedStagePC };

