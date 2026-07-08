
import { pool } from "../../db.js";
import nodemailer from "nodemailer";
import moment from 'moment';
import { sendEmail } from "../sendNotification.js";


// --------------------------------------------- Drop Project ---------------------------------------------
async function deleteProjectRequest(req, res) 
{
    const projectID = req.body.projectID;
    let userID = req.body.userID;
    let email = req.body.email;
    let reason = req.body.reason;
    let subProjectID = req.body.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("userID", userID);
    request.input("email", email);
    request.input("reason", reason);

    console.log(projectID, subProjectID, "projectID, subProjectID")
    let todayDate = new Date();
    let currentDate = moment(todayDate, 'MM-DD-YYYY',true).format("DD-MM-YYYY");
        try 
        {
            const result = await request.query(`INSERT INTO tbl_project_drop_request (project_id, sub_project_id,
                submitted_by, remarks) VALUES (@projectID, @subProjectID, @userID, @reason )`);


                // Email Notification
           
                let CommonProjectIdLabel, CommonProjectNameLabel, CommonProjectID, CommonProjectName;
                if(subProjectID == '-1')
                {
                    const query1 = await request.query('SELECT project_name from tbl_project where project_id = @projectID')
                    const userProjectNameData = query1.recordset[0];

                    CommonProjectIdLabel = "Project ID";
                    CommonProjectNameLabel = "Project Name";
                    CommonProjectID = projectID;
                    CommonProjectName = userProjectNameData.project_name;
                    console.log(CommonProjectName, userProjectNameData,"CommonProjectName, userProjectNameData" )

                }
                else
                {
                    const query1 = await request.query('SELECT sub_project_name from tbl_sub_project where sub_project_id = @subProjectID')
                    const userProjectNameData = query1.recordset[0];

                    CommonProjectIdLabel = "Sub Project ID";
                    CommonProjectNameLabel = "Sub Project Name";
                    CommonProjectID = subProjectID;
                    CommonProjectName = userProjectNameData.sub_project_name;
                    console.log(CommonProjectName, userProjectNameData,"CommonProjectName, userProjectNameData" )

                }
                console.log(CommonProjectIdLabel, CommonProjectID, "CommonProjectIdLabel, CommonProjectID;")
               
                let subject = "Drop Project Request Submission";
                let body = `Dear User,
                            <br><br>
                            Your drop request for the <b> ${CommonProjectIdLabel}: ${CommonProjectID} </b> has been successfully submitted to 
                            the Ministry Admin on ${currentDate}
                            <br><br>
                            <strong>${CommonProjectIdLabel}: ${CommonProjectID}</strong>
                            <br>
                            <strong>${CommonProjectNameLabel}: ${CommonProjectName}</strong>
                            <br>
                            <strong>Date of Submission: ${currentDate}</strong>  `
                        
                            const sendNotification1 = await sendEmail(email, null, subject, body, req, res);
        } 
        catch (err) 
        {
            console.log(err);
            return res.sendStatus(500);
        }
            console.log(
              "--------------------------------------------------------------------------------"
            );      
};

async function viewDropProjectList(req, res) {
    // inner join tbl_project_stage on tbl_project_stage.status_id = tbl_project.project_stage_id

    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input("userID", userID);

    try {

        const userResult = await request.query(` SELECT role_id FROM tbl_user WHERE user_id = @userID `);
        const { role_id } = userResult.recordset[0];

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) 
        {
            const result = await conn.query(`SELECT tbl_project.project_id,
                ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, organisation_name,
                tbl_project.project_name, tbl_sub_project.sub_project_id, tbl_sub_project.sub_project_name,
                tbl_user.name,  sanctioned_cost, target_completion_date, current_project_stage_id, tbl_project_stage.stage_name, 
                tbl_project_drop_request.remarks, tbl_project_drop_request.status, tbl_project_drop_request.submitted_on, 
                tbl_project_drop_request.drop_date, tbl_project_drop_request.drop_rejected_remarks,
                tbl_project_drop_request.reject_request_status

                FROM tbl_project_drop_request
                INNER JOIN tbl_project on tbl_project.project_id = tbl_project_drop_request.project_id        
                Left JOIN tbl_user on tbl_user.user_id = tbl_project_drop_request.submitted_by
                LEFT JOIN tbl_project_stage on tbl_project_stage.stage_id = tbl_project.current_project_stage_id
                Left JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_drop_request.sub_project_id
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
                                                                              
                where tbl_project_drop_request.status = 1 or tbl_project_drop_request.status = 0     
                ORDER BY tbl_project_drop_request.submitted_on desc	
            ;`);

            res.json(result.recordset);
        }
        else 
        {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            request.input("organisationID", organisationID);

            const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`);
            const userIDs = usersResult.recordset.map(user => user.user_id);


            const result = await conn.query(`SELECT tbl_project.project_id, 
                ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, organisation_name,
                tbl_project.project_name, tbl_sub_project.sub_project_id, tbl_sub_project.sub_project_name, tbl_user.name,  
                sanctioned_cost, target_completion_date, current_project_stage_id, tbl_project_stage.stage_name, tbl_project_drop_request.remarks, 
                tbl_project_drop_request.status, tbl_project_drop_request.drop_date, tbl_project_drop_request.submitted_on, 
                tbl_project_drop_request.drop_rejected_remarks, tbl_project_drop_request.reject_request_status
    
                FROM tbl_project_drop_request
                INNER JOIN tbl_project on tbl_project.project_id = tbl_project_drop_request.project_id  
                LEFT JOIN tbl_user on tbl_user.user_id = tbl_project_drop_request.submitted_by
                LEFT JOIN tbl_project_stage on tbl_project_stage.stage_id = tbl_project.current_project_stage_id
                LEFT JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_drop_request.sub_project_id
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
                                                         
                WHERE (tbl_project_drop_request.submitted_by IN (${userIDs.join(',')})) AND
                (   tbl_project_drop_request.status = 1 or tbl_project_drop_request.status = 0   )

                ORDER BY tbl_project_drop_request.submitted_on desc	
                ;`);

                res.json(result.recordset);
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function deleteProject(req, res) {
    // const conn = await pool;
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let dropProjectQuery;
    if (subProjectID == -1) {
        // console.log(projectID)
        let queryExists = await request.query("UPDATE tbl_project set status = 0 where project_id = @projectID;")
        if (queryExists) {
            // console.log("yes")
            dropProjectQuery = (`UPDATE tbl_project_drop_request SET status = 0, 
                    drop_date = getDate()             
                    WHERE project_id = @projectID`)
        }
    }
    else {
        let queryExists = await request.query("UPDATE tbl_sub_project set sub_status = 0 where sub_project_id = @subProjectID;")
        if (queryExists) {
            dropProjectQuery = (`UPDATE tbl_project_drop_request SET status = 0, 
                    drop_date = getDate()             
                    WHERE sub_project_id = @subProjectID`)
        }
    }

    try {
        const result = await request.query(dropProjectQuery);
        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function rejectProjectDropRequest(req, res) {
    const projectID = req.body.projectID;
    let reason = req.body.reason;
    let subProjectID = req.body.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("reason", reason);

    try {
        const result = await request.query(`UPDATE tbl_project_drop_request SET reject_request_status = 0, drop_rejected_remarks = @reason
        WHERE project_id = @projectID AND sub_project_id = @subProjectID`);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { deleteProjectRequest, viewDropProjectList, deleteProject, rejectProjectDropRequest
    };