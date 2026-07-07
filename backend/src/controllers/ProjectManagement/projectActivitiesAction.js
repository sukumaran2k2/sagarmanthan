
import e from "express";
import { pool } from "../../db.js";
import { addLastUpdatedDate } from "./lastUpdatedDate.js";
import { addLastUpdatedStagePC } from "./lastUpdatedStage.js";

async function addActivityData(req, res) {
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const activityTab = req.body.activityTab;
    const userID = req.body.userID;
    const inaugurationValue = req.body.inaugurationValue;
    let inaugurationDate = req.body.inaugurationDate;
    let tentativeInaugurationDate = req.body.tentativeInaugurationDate;

    const conn = await pool;
    let request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    try {
        let lastUpdatedStatus;
        for (let p = 0; p < activityTab.length; p++) 
        {
            let activityPlannedDate = activityTab[p].activityPlannedDate
            let activityActualDate = activityTab[p].activityActualDate
            let activityID = activityTab[p].activityID
            let delayReason = activityTab[p].delayReason

            if (activityPlannedDate == "") {
                activityPlannedDate = null;
            }
            if (activityActualDate == "") {
                activityActualDate = null;
            }
            if (inaugurationDate == "") {
                inaugurationDate = null;
            }
            if (tentativeInaugurationDate == "") {
                tentativeInaugurationDate = null;
            }
            let request = conn.request();
            request.input("activityPlannedDate", activityPlannedDate);
            request.input("activityActualDate", activityActualDate);
            request.input("activityID", activityID);
            request.input("userID", userID);
            request.input("delayReason", delayReason);

            let milestone = p;
            request.input("milestone", milestone);

            if (activityID) 
            {
                if (subProjectID == -1) {
                    const result = await request.query(`UPDATE tbl_project_activity SET
                    start_date = @activityPlannedDate, end_date = @activityActualDate, delay_reason = @delayReason, updated_by = @userID, updated_date = getDate()
                    WHERE activity_id = @activityID AND project_id = '${projectID}'`);

                    lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
                }
                else {
                    const result = await request.query(`UPDATE tbl_project_activity SET
                    start_date = @activityPlannedDate, end_date = @activityActualDate, delay_reason = @delayReason, updated_by = @userID, updated_date = getDate()
                    WHERE activity_id = @activityID AND sub_project_id = '${subProjectID}'`);

                    lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
                }
            }
            else {
                const result = await request.query(`INSERT INTO tbl_project_activity (project_id, sub_project_id, milestone_id, start_date, end_date, delay_reason, created_by) 
                    VALUES ('${projectID}','${subProjectID}', @milestone, @activityPlannedDate, @activityActualDate, @delayReason, @userID)`);

                    lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);
            } 


            // Update actual_date_of_completion if milestone ID is 5
            if (milestone === 5) {
                if (subProjectID == -1) {
                    await request.query(`UPDATE tbl_project SET actual_date_of_completion = @activityActualDate WHERE project_id = '${projectID}'`);
                } else {
                    await request.query(`UPDATE tbl_sub_project SET sub_actual_date_of_completion = @activityActualDate WHERE sub_project_id = '${subProjectID}'`);
                }
                if (activityActualDate !== null) {
                    const lastUpdatedStage = await addLastUpdatedStagePC(projectID, subProjectID, req, res);
                }
            }
        }

        request.input("inaugurationValue", inaugurationValue);
        request.input("inaugurationDate", inaugurationDate);
        request.input("tentativeInaugurationDate", tentativeInaugurationDate);

        if (subProjectID == -1) {
            await request.query(`UPDATE tbl_project SET
                inauguration_value = @inaugurationValue, 
                inauguration_date = @inaugurationDate, 
                tentative_inauguration_date = @tentativeInaugurationDate
                WHERE project_id = @projectID`);
        } else {
            await request.query(`UPDATE tbl_sub_project SET
                sub_inauguration_value = @inaugurationValue, 
                sub_inauguration_date = @inaugurationDate, 
                sub_tentative_inauguration_date = @tentativeInaugurationDate
                WHERE sub_project_id = @subProjectID`);
        }

        res.sendStatus(lastUpdatedStatus);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getActivityData(req, res) {

    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT activity_id, start_date, end_date
            FROM tbl_project_activity where project_id = @projectID;`);
        }
        else {
            result = await request.query(`SELECT activity_id, start_date, end_date
            FROM tbl_project_activity where sub_project_id = @subProjectID;`);
        }

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDelayReason(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    let result;
    try {
        if (subProjectID == -1) {
            result = await request.query(`
            SELECT delay_reason FROM tbl_project_activity WHERE project_id = @projectID
        `);
        }
        else {
            result = await request.query(`
            SELECT delay_reason FROM tbl_project_activity WHERE sub_project_id = @subProjectID
        `);
        }

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function addPhysicalProgress(req, res) {
    let progressDate = req.body.progressDate;
    const progressValue = req.body.progressValue;
    const projectID = req.body.projectID;
    const subProjectID = req.body.subProjectID;
    const userID = req.body.userID;

    if (progressDate == "") {
        progressDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("progressDate", progressDate);
    request.input("progressValue", progressValue);
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("userID", userID);

    try {
        let lastUpdatedStatus;
        const result = await request.query(`INSERT INTO tbl_project_physical_progress(project_id, sub_project_id, physical_progress, progress_date, updated_by) 
        VALUES(@projectID, @subProjectID, @progressValue, @progressDate, @userID);
        `);


        let isActivityExists;
        if (subProjectID == -1) 
        {  
            isActivityExists = await request.query (` SELECT activity_id FROM tbl_project_activity 
            WHERE project_id = '${projectID}'; `)
        }
        else
        {
            isActivityExists = await request.query (` SELECT activity_id FROM tbl_project_activity 
            WHERE sub_project_id = '${subProjectID}'; `)
        }

        let milestoneIndex, milestone;
        if (isActivityExists.recordset.length <= 0) 
        {
            for (let p = 0; p < 6; p++) 
            {
                milestoneIndex = p;
                                
                if(subProjectID == -1)
                {
                    const result = await request.query (`INSERT INTO tbl_project_activity (project_id, sub_project_id, milestone_id, created_by) 
                    VALUES ('${projectID}', '${subProjectID}', ${milestoneIndex}, @userID)` ) 
                }
                else
                {
                    const result = await request.query (`INSERT INTO tbl_project_activity (project_id, sub_project_id, milestone_id, created_by) 
                    VALUES ('${projectID}','${subProjectID}', ${milestoneIndex}, @userID)` )               
                }   

            }
        }

        if(progressValue >= 0 && progressValue < 20)
        {
            milestone = 0;
        }
        else if(progressValue >= 20 && progressValue < 40)
        {
            milestone = 1;
        }
        else if(progressValue >= 40 && progressValue < 60)
        {
            milestone = 2;
        }
        else if(progressValue >= 60 && progressValue < 80)
        {
            milestone = 3;
        }
        else if(progressValue >= 80 && progressValue < 100)
        {
            milestone = 4;
        }
        else if(progressValue == 100)
        {
            milestone = 5;
        }

       
        if (subProjectID == -1) 
        {
            const result = await request.query(`UPDATE tbl_project_activity SET
                end_date = @progressDate, updated_by = @userID, updated_date = getDate()
                WHERE milestone_id = ${milestone} AND project_id = '${projectID}'`);
                // console.log(progressDate, "progressDate")
        }
        else 
        {
            const result = await request.query(`UPDATE tbl_project_activity SET
                end_date = @progressDate, updated_by = @userID, updated_date = getDate()
                WHERE milestone_id = ${milestone} AND sub_project_id = '${subProjectID}'`);
        }

  
        lastUpdatedStatus = await addLastUpdatedDate(projectID, subProjectID, req, res);

             // Update actual_date_of_completion if milestone ID is 5
             if (milestone == 5) {
                if (subProjectID == -1) {
                    await request.query(`UPDATE tbl_project SET actual_date_of_completion = @progressDate WHERE project_id = '${projectID}'`);
                } else {
                    await request.query(`UPDATE tbl_sub_project SET sub_actual_date_of_completion = @progressDate WHERE sub_project_id = '${subProjectID}'`);
                }
                if (progressDate !== null) {
                    const lastUpdatedStage = await addLastUpdatedStagePC(projectID, subProjectID, req, res);
                }
            }

        res.status(lastUpdatedStatus).json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getProgressValue(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        const result = await request.query(`
        SELECT TOP 1 physical_progress, progress_date 
        FROM tbl_project_physical_progress 
        WHERE project_id = @projectID AND sub_project_id = @subProjectID
        ORDER BY physical_progress DESC;               
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getInaugurationDate(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let query;
        if (subProjectID == -1) {
            query = `
                SELECT 
                    inauguration_value, 
                    inauguration_date, 
                    tentative_inauguration_date
                FROM tbl_project 
                WHERE project_id = @projectID;
            `;
        } else {
            query = `
                SELECT 
                    sub_inauguration_value AS inauguration_value, 
                    sub_inauguration_date AS inauguration_date, 
                    sub_tentative_inauguration_date AS tentative_inauguration_date
                FROM tbl_sub_project 
                WHERE sub_project_id = @subProjectID;
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


export default { addActivityData, getActivityData, getDelayReason, addPhysicalProgress, getProgressValue, getInaugurationDate };