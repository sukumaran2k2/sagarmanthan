
import { pool } from "../../db.js";
import nodemailer from "nodemailer";
import moment from 'moment';

// --------------------------------------------- Drop Project ---------------------------------------------
async function deleteProjectRequest(req, res) {
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
    let currentDate = moment(todayDate, 'MM-DD-YYYY', true).format("DD-MM-YYYY");
    try {
        const result = await request.query(`INSERT INTO tbl_project_drop_request (project_id, sub_project_id,
                submitted_by, remarks) VALUES (@projectID, @subProjectID, @userID, @reason )`);

                

        try {

            let CommonProjectLabel, CommonProjectID;
            if (subProjectID == '-1') {
                CommonProjectLabel = "Project ID";
                CommonProjectID = projectID;
            }
            else {
                CommonProjectLabel = "Sub Project ID";
                CommonProjectID = subProjectID;
            }
            console.log(CommonProjectLabel, CommonProjectID, "CommonProjectLabel, CommonProjectID;")

            const transporter = nodemailer.createTransport({
                host: "smtp.office365.com",
                port: 587,
                auth: {
                    user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                    pass: "Sagarmanthan@123",
                },
            });

            const mailOptions = {
                from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                to: email,
                subject: "Password Reset",
                html: `Dear User,
                              <br><br>
                              Your drop request for the <b> ${CommonProjectLabel}: ${CommonProjectID} </b> has been successfully submitted to 
                              the Ministry Admin on ${currentDate}
                              <br><br>
                              <strong>${CommonProjectLabel}: ${CommonProjectID}</strong>
                              <br>
                              <strong>Date of Submission: ${currentDate}</strong>  
                              <br><br>
                              This is an auto-generated email. Please do not reply.
                              <br><br>
                              Regards,
                              <br>
                              Sagarmanthan Team`,
            };

            await transporter.sendMail(mailOptions);
            console.log("Email Sent Successfully");
            return res.sendStatus(200);
        }
        catch (emailError) {
            console.error("Error sending email:", emailError);
            return res.sendStatus(500);
        }




    }
    catch (err) {
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
    try {
        const result = await conn.query(`SELECT tbl_project.project_id, tbl_project.project_name, 
        tbl_sub_project.sub_project_id, tbl_sub_project.sub_project_name,
        tbl_user.name, 
        sanctioned_cost, target_completion_date, current_project_stage_id, tbl_project_stage.stage_name, 
        tbl_project_drop_request.remarks, tbl_project_drop_request.status, tbl_project_drop_request.submitted_on, tbl_project_drop_request.drop_rejected_remarks,
        tbl_project_drop_request.reject_request_status

        FROM tbl_project_drop_request
        INNER JOIN tbl_project on tbl_project.project_id = tbl_project_drop_request.project_id        
        Left JOIN tbl_user on tbl_user.user_id = tbl_project_drop_request.submitted_by
        LEFT JOIN tbl_project_stage on tbl_project_stage.stage_id = tbl_project.current_project_stage_id
        Left JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_drop_request.sub_project_id
														
        where tbl_project_drop_request.status = 1 or tbl_project_drop_request.status = 0     
        ORDER BY tbl_project_drop_request.submitted_on desc	
        ;`);
        res.json(result.recordset);
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

export default {
    deleteProjectRequest, viewDropProjectList, deleteProject, rejectProjectDropRequest
};