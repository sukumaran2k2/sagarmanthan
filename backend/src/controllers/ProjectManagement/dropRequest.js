
import { pool } from "../../db.js";
import nodemailer from "nodemailer";
import moment from 'moment';
import { sendEmail } from "../sendNotification.js";


// --------------------------------------------- Drop Project ---------------------------------------------
async function deleteProjectRequest(req, res) 
{
    try 
    {
        const projectID = req.body.projectID ? String(req.body.projectID).trim() : null;
        let userID = req.body.userID || req.user?.id || 1;
        let email = req.body.email;
        let reason = req.body.reason ? String(req.body.reason).trim() : null;
        let rawSubProjectID = req.body.subProjectID;
        let subProjectID = (!rawSubProjectID || rawSubProjectID === '-1' || rawSubProjectID === '-' || rawSubProjectID === 'null') ? '-1' : String(rawSubProjectID).trim();

        if (!projectID) {
            return res.status(400).json({ message: "Project ID is required for drop request." });
        }
        if (!reason) {
            return res.status(400).json({ message: "Reason is required for drop request." });
        }

        const conn = await pool;
        const request = conn.request();
        request.input("projectID", projectID);
        request.input("subProjectID", subProjectID);
        request.input("userID", userID);
        request.input("reason", reason);

        await request.query(`INSERT INTO tbl_project_drop_request (project_id, sub_project_id,
            submitted_by, remarks, submitted_on) VALUES (@projectID, @subProjectID, @userID, @reason, GETDATE())`);

        // Send email asynchronously if possible without failing the HTTP response
        if (email) {
            (async () => {
                try {
                    let CommonProjectIdLabel, CommonProjectNameLabel, CommonProjectID, CommonProjectName;
                    const reqInfo = conn.request();
                    reqInfo.input("projectID", projectID);
                    reqInfo.input("subProjectID", subProjectID);

                    if (subProjectID === '-1' || subProjectID === '-' || !subProjectID) {
                        const q1 = await reqInfo.query('SELECT project_name from tbl_project where project_id = @projectID');
                        const data = (q1.recordset && q1.recordset[0]) || {};
                        CommonProjectIdLabel = "Project ID";
                        CommonProjectNameLabel = "Project Name";
                        CommonProjectID = projectID;
                        CommonProjectName = data.project_name || projectID;
                    } else {
                        const q1 = await reqInfo.query('SELECT sub_project_name from tbl_sub_project where sub_project_id = @subProjectID');
                        const data = (q1.recordset && q1.recordset[0]) || {};
                        CommonProjectIdLabel = "Sub Project ID";
                        CommonProjectNameLabel = "Sub Project Name";
                        CommonProjectID = subProjectID;
                        CommonProjectName = data.sub_project_name || subProjectID;
                    }

                    const currentDate = moment().format("DD-MM-YYYY");
                    const subject = "Drop Project Request Submission";
                    const body = `Dear User,
                                <br><br>
                                Your drop request for the <b> ${CommonProjectIdLabel}: ${CommonProjectID} </b> has been successfully submitted to 
                                the Ministry Admin on ${currentDate}
                                <br><br>
                                <strong>${CommonProjectIdLabel}: ${CommonProjectID}</strong>
                                <br>
                                <strong>${CommonProjectNameLabel}: ${CommonProjectName}</strong>
                                <br>
                                <strong>Date of Submission: ${currentDate}</strong>`;

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
                        subject: subject,
                        html: body,
                    };
                    await transporter.sendMail(mailOptions);
                } catch (emailErr) {
                    console.log("Optional drop request email notification skipped or failed:", emailErr?.message);
                }
            })();
        }

        return res.status(200).json({ message: "Drop project request submitted successfully." });
    } 
    catch (err) 
    {
        console.error("Error in deleteProjectRequest:", err);
        return res.status(500).json({ message: err?.message || "Internal server error" });
    }
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
                tbl_user.name, tbl_user.name AS submitted_by_name, sanctioned_cost, target_completion_date, current_project_stage_id, tbl_project_stage.stage_name, 
                tbl_project_drop_request.remarks, tbl_project_drop_request.status, tbl_project_drop_request.submitted_on, 
                tbl_project_drop_request.drop_date, tbl_project_drop_request.drop_rejected_remarks,
                tbl_project_drop_request.reject_request_status,
                tbl_project_drop_request.submitted_by,
                tbl_project_drop_request.approved_by,
                uApp.name AS approved_by_name

                FROM tbl_project_drop_request
                INNER JOIN tbl_project on tbl_project.project_id = tbl_project_drop_request.project_id        
                LEFT JOIN tbl_user on tbl_user.user_id = tbl_project_drop_request.submitted_by
                LEFT JOIN tbl_user uApp on uApp.user_id = tbl_project_drop_request.approved_by
                LEFT JOIN tbl_project_stage on tbl_project_stage.stage_id = tbl_project.current_project_stage_id
                LEFT JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_drop_request.sub_project_id
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
                                                                              
                where tbl_project_drop_request.status = 1 or tbl_project_drop_request.status = 0     
                ORDER BY tbl_project_drop_request.submitted_on desc	
            ;`);

            res.json(result.recordset);
        }
        else 
        {
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            if (!orgResult.recordset.length || !orgResult.recordset[0].organisation_id) {
                return res.json([]);
            }
            const organisationID = orgResult.recordset[0].organisation_id;

            request.input("organisationID", organisationID);

            const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`);
            const userIDs = usersResult.recordset.map(user => user.user_id).filter(Boolean);

            if (userIDs.length === 0) {
                return res.json([]);
            }

            const result = await conn.query(`SELECT tbl_project.project_id, 
                ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, organisation_name,
                tbl_project.project_name, tbl_sub_project.sub_project_id, tbl_sub_project.sub_project_name, tbl_user.name, tbl_user.name AS submitted_by_name, 
                sanctioned_cost, target_completion_date, current_project_stage_id, tbl_project_stage.stage_name, tbl_project_drop_request.remarks, 
                tbl_project_drop_request.status, tbl_project_drop_request.drop_date, tbl_project_drop_request.submitted_on, 
                tbl_project_drop_request.drop_rejected_remarks, tbl_project_drop_request.reject_request_status,
                tbl_project_drop_request.submitted_by,
                tbl_project_drop_request.approved_by,
                uApp.name AS approved_by_name
    
                FROM tbl_project_drop_request
                INNER JOIN tbl_project on tbl_project.project_id = tbl_project_drop_request.project_id  
                LEFT JOIN tbl_user on tbl_user.user_id = tbl_project_drop_request.submitted_by
                LEFT JOIN tbl_user uApp on uApp.user_id = tbl_project_drop_request.approved_by
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
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const approvedBy = req.body?.approvedBy || req.body?.userId || req.user?.id || req.query?.approvedBy || null;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("approvedBy", approvedBy);

    let dropProjectQuery;
    if (subProjectID == -1 || subProjectID == '-1' || !subProjectID) {
        let queryExists = await request.query("UPDATE tbl_project set status = 0, last_updated = GETDATE() where project_id = @projectID;")
        if (queryExists) {
            dropProjectQuery = (`UPDATE tbl_project_drop_request SET status = 0, 
                    drop_date = GETDATE(),
                    approved_by = COALESCE(@approvedBy, approved_by)
                    WHERE project_id = @projectID`)
        }
    }
    else {
        let queryExists = await request.query("UPDATE tbl_sub_project set sub_status = 0, sub_last_updated = GETDATE() where sub_project_id = @subProjectID;")
        if (queryExists) {
            dropProjectQuery = (`UPDATE tbl_project_drop_request SET status = 0, 
                    drop_date = GETDATE(),
                    approved_by = COALESCE(@approvedBy, approved_by)
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
        let whereClause = (subProjectID == -1 || subProjectID == '-1' || !subProjectID)
            ? "WHERE project_id = @projectID AND (sub_project_id = '-1' OR sub_project_id IS NULL OR sub_project_id = '')"
            : "WHERE project_id = @projectID AND sub_project_id = @subProjectID";
            
        const result = await request.query(`UPDATE tbl_project_drop_request SET reject_request_status = 0, drop_rejected_remarks = @reason ${whereClause}`);

        res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { deleteProjectRequest, viewDropProjectList, deleteProject, rejectProjectDropRequest
    };