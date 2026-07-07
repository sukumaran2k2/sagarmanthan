import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';



const uploadDestination = "./fileuploads/mom_file";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        
        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);  // Save the file with the unique name
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10000000 }  
});

async function createMOM(req, res) {
    const {
        meetingHeldOn, meetingChairedBy, subjectOfTheMeeting,wing, userID, actionPoints, meetingId} = req.body;
        console.log(req.body,"rew")

        const conn = await pool;

    try {
        const request = conn.request();
        request.input("meetingId", meetingId);

        const checkQuery = `
            SELECT meeting_id 
            FROM tbl_psw_meeting 
            WHERE meeting_id = @meetingId
        `;

        const checkResult = await request.query(checkQuery);

        let meeting_id;

        if (meetingId && checkResult.recordset.length > 0) {
            // Update existing meeting
            const updateRequest = conn.request();
            await updateRequest
                .input("meetingId", meetingId)
                .input("meetingHeldOn", meetingHeldOn)
                .input("meetingChairedBy", meetingChairedBy)
                .input("subjectOfTheMeeting", subjectOfTheMeeting)
                .input("wing", wing)
                .input("userID", userID)
                .query(`
                    UPDATE tbl_psw_meeting SET
                        meeting_held_on = @meetingHeldOn,
                        meeting_chaired_by = @meetingChairedBy,
                        subject_of_the_meeting = @subjectOfTheMeeting,
                        wings = @wing,
                        created_at = GETDATE(),
                        created_by = @userID
                    WHERE meeting_id = @meetingId
                `);

            meeting_id = meetingId;

            // Only delete existing action points if new ones are provided
            if (actionPoints && actionPoints.length > 0) {
                await conn.request()
                    .input("meeting_id", meeting_id)
                    .query(`
                        DELETE FROM tbl_psw_action_points 
                        WHERE meeting_id = @meeting_id
                    `);
            }
        } else {
            // Insert new meeting
            const insertRequest = conn.request();
            const result = await insertRequest
                .input("meetingHeldOn", meetingHeldOn)
                .input("meetingChairedBy", meetingChairedBy)
                .input("subjectOfTheMeeting", subjectOfTheMeeting)
                .input("wing", wing)
                .input("userID", userID)
                .query(`
                    INSERT INTO tbl_psw_meeting 
                    (meeting_held_on, meeting_chaired_by, subject_of_the_meeting,wings, created_at, created_by)
                    OUTPUT INSERTED.meeting_id
                    VALUES (@meetingHeldOn, @meetingChairedBy, @subjectOfTheMeeting,@wing, GETDATE(), @userID);
                `);

            meeting_id = result.recordset[0].meeting_id;
        }

        // Insert action points if provided
        if (actionPoints && actionPoints.length > 0) {
            for (let action of actionPoints) {
                const { actionBrief, deptDivision,wingtDivision, deadline,actionTakenReport, status } = action;

       
        const assignedTodep = Array.isArray(deptDivision) ? deptDivision.join(",") : deptDivision || null;
         const assignedTowing = Array.isArray(wingtDivision) ? wingtDivision.join(",") : wingtDivision || null;
         console.log(assignedTowing,"asswing")
       
        const actionRequest = conn.request();

        await actionRequest
            .input("meeting_id", meeting_id)
            .input("actionBrief", actionBrief)
            .input("actionTakenReport", actionTakenReport)
            .input("assignedTodep", assignedTodep)
            .input("assignedTowing", assignedTowing)
            .input("deadline", deadline ? new Date(deadline) : null)
            .input("status", status)
            .query(`
                INSERT INTO tbl_psw_action_points 
                (meeting_id, action_brief,action_point, assigned_to,responsible_wing, deadline, status)
                VALUES (@meeting_id, @actionBrief,@actionTakenReport, @assignedTodep,@assignedTowing, @deadline, @status);
            `);
            }
        }

        return res.status(201).json({
            meeting_id,
            message: meetingId
                ? "Meeting updated successfully"
                : "Meeting created successfully"
        });

    } catch (err) {
        console.error("Error creating/updating MOM:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
async function createMOMedit(req, res) {

    const {
        meetingHeldOn,
        meetingChairedBy,
        subjectOfTheMeeting,
        wing,
        userID,
        actionPoints,
        meetingId
    } = req.body;

    console.log(req.body, "UPDATE MOM");

    const conn = await pool;

    try {

        // CHECK EXISTING MEETING
        const checkResult = await conn.request()
            .input("meetingId", meetingId)
            .query(`
                SELECT meeting_id
                FROM tbl_psw_meeting
                WHERE meeting_id = @meetingId
            `);

        if (checkResult.recordset.length === 0) {

            return res.status(404).json({
                message: "Meeting not found"
            });
        }

        // UPDATE MEETING
        await conn.request()
            .input("meetingId", meetingId)
            .input("meetingHeldOn", meetingHeldOn)
            .input("meetingChairedBy", meetingChairedBy)
            .input("subjectOfTheMeeting", subjectOfTheMeeting)
            .input("wing", wing)
            .input("userID", userID)
            .query(`
                UPDATE tbl_psw_meeting
                SET
                    meeting_held_on = @meetingHeldOn,
                    meeting_chaired_by = @meetingChairedBy,
                    subject_of_the_meeting = @subjectOfTheMeeting,
                    wings = @wing,
                    created_at = GETDATE(),
                    created_by = @userID
                WHERE meeting_id = @meetingId
            `);

        // DELETE OLD ACTION POINTS
        await conn.request()
            .input("meeting_id", meetingId)
            .query(`
                DELETE FROM tbl_psw_action_points
                WHERE meeting_id = @meeting_id
            `);

        // INSERT UPDATED ACTION POINTS
        if (actionPoints && actionPoints.length > 0) {

            for (let action of actionPoints) {

                const {
                    actionBrief,deptDivision,wingtDivision,deadline,actionTakenReport,status} = action;

                const assignedTodep =
                    Array.isArray(deptDivision)
                        ? deptDivision.join(",")
                        : deptDivision || null;

                const assignedTowing =
                    Array.isArray(wingtDivision)
                        ? wingtDivision.join(",")
                        : wingtDivision || null;

                await conn.request()
                    .input("meeting_id", meetingId)
                    .input("actionBrief", actionBrief)
                    .input("actionTakenReport", actionTakenReport)
                    .input("assignedTodep", assignedTodep)
                    .input("assignedTowing", assignedTowing)
                    .input("deadline", deadline ? new Date(deadline) : null)
                    .input("status", status)
                    .query(`
                        INSERT INTO tbl_psw_action_points
                        (
                            meeting_id,
                            action_brief,
                            action_point,
                            assigned_to,
                            responsible_wing,
                            deadline,
                            status
                        )
                        VALUES
                        (
                            @meeting_id,
                            @actionBrief,
                            @actionTakenReport,
                            @assignedTodep,
                            @assignedTowing,
                            @deadline,
                            @status
                        )
                    `);
            }
        }

        return res.status(200).json({
            meeting_id: meetingId,
            message: "Meeting updated successfully"
        });

    } catch (err) {

        console.error("Error updating MOM:", err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}


async function addNewactionpointsFileupload(req, res) 
{
    // const { folderName } = req.body;
    try {
        const conn = await pool; 
        // console.log("File Details:", req.file);

        if (!req.file || !req.file.filename) {
            // console.error("No file or unique file name provided.");
            return res.status(400).json({ error: "No file uploaded or unique name missing" });
        }

        const uniqueFileName = req.file.filename;
     
        console.log("Uploaded file object:", req.file);
        console.log("Generated Unique File Name:", uniqueFileName);

        const createDir = `./fileuploads/mom_file`;
       

        const destinationPath = `${createDir}/${uniqueFileName}`;

        // fs.renameSync(req.file.path, destinationPath);
        res.status(200).json({ status: 'success', uniqueFileName });
    } catch (err) {
        // console.error("Error in file upload:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function addNewMOMFile(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const meetingID = parseInt(req.body.meetingID);

        if (!meetingID) {
            return res.status(400).json({ error: "Meeting ID is required" });
        }

        request.input("meetingID", meetingID);

        if (req.file) {
            request.input("fileName", req.uniqueFileName);
        }

        const checkRecord = await conn.request()
            .input("meetingID", meetingID)
            .query(`
                SELECT upload_mom_file
                FROM tbl_psw_meeting_file
                WHERE meeting_id = @meetingID
            `);

        let sqlQuery;

        if (checkRecord.recordset.length > 0) {
            const oldFileName = checkRecord.recordset[0].upload_mom_file;

            if (oldFileName && req.file) {
                deleteFile(oldFileName); // delete old file
            }

            if (req.file) {
                sqlQuery = `
                    UPDATE tbl_psw_meeting_file
                    SET upload_mom_file = @fileName
                    WHERE meeting_id = @meetingID
                `;
            } else {
                sqlQuery = `
                    UPDATE tbl_psw_meeting_file
                    SET upload_mom_file = NULL
                    WHERE meeting_id = @meetingID
                `;
            }

        } else {
    
            if (req.file) {
                sqlQuery = `
                    INSERT INTO tbl_psw_meeting_file (meeting_id, upload_mom_file)
                    VALUES (@meetingID, @fileName)
                `;
            } else {
                sqlQuery = `
                    INSERT INTO tbl_psw_meeting_file (meeting_id)
                    VALUES (@meetingID)
                `;
            }
        }

        await request.query(sqlQuery);

        res.status(201).json({
            message: "Document uploaded successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}


async function addMOMRequest(req, res) {
    
    const { meetingId, status } = req.params;
    if (!meetingId || !status) {
        return res.status(400).json({ message: 'meeting_id and status are required' });
    }
 
    const conn = await pool;
    const request = conn.request();

    try {
        
        const result = await request
            .input('meetingId', meetingId)  
            .input('status', status)     
            .query(`
                SELECT 
                   m.meeting_id,
                    m.meeting_held_on,
                    m.meeting_chaired_by,
                    m.subject_of_the_meeting,
                    m.wings,
                    m.created_by AS meeting_created_by,
                    m.created_at AS meeting_created_at,
                    mf.upload_mom_file,  -- Added MOM file from tbl_psw_meeting_file
                    ap.action_point_id,
                    ap.action_point,
                    ap.action_brief,
                    ap.assigned_to,
                    ap.responsible_wing,
                    ap.deadline,
                    ap.status,
                    ap.date_of_completion,
                    ap.action_points_fileupload
                FROM dbo.tbl_psw_meeting m
                LEFT JOIN dbo.tbl_psw_action_points ap
                    ON m.meeting_id = ap.meeting_id
                    AND ap.status = @status
                LEFT JOIN dbo.tbl_psw_meeting_file mf
                    ON m.meeting_id = mf.meeting_id
                WHERE m.meeting_id = @meetingId;
            `);

        
        res.json(result.recordset);
    } catch (err) {
        
        console.error('Error fetching action points:', err);
        
        return res.sendStatus(500);
    }
}



async function actionpointsPdfFileDownload(req, res) 
    {
        const { fileName } = req.query;
    
        // Base folder path
        const uploadDestinationBase = './fileuploads/mom_file';
        // Construct the file path by directly joining the base path and fileName
        const filePath = path.join(uploadDestinationBase, fileName); // Correct file path construction
    
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                res.status(500).send({ error: "Internal Server Error" });
            } else {
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'application/pdf');
                res.send(data);
            }
        });
    }




function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

    // async function getMeetingStatusSummary(req, res) {
    //     try {

    //     const roleID = req.params.roleID;
    //     const organisationID = req.params.organisationID;
    //     const WingID = req.params.WingId;
    //     console.log(WingID,"wingg")
    //     const conn = await pool;
    //     const request = conn.request();
            
    //     request.input("roleID",roleID);
    //         request.input("organisationID",organisationID);


    //         let query = "";

    //         if (roleID == 2  || roleID == 4 || roleID == 5 || roleID == 8) {
    //                 // If meeting_id is provided
    //                 query = `
    //                     SELECT
    //                     meeting.meeting_id,
    //                     CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,
    //                     meeting.subject_of_the_meeting,
    //                     meeting.wings,
    //                     SUM(CASE WHEN action_point.status = 'Yet to be Initiated' THEN 1 ELSE 0 END) AS [Yet To Be Initiated],
    //                     SUM(CASE WHEN action_point.status = 'Work in Progress' THEN 1 ELSE 0 END) AS [Work In Progress],
    //                     SUM(CASE WHEN action_point.status = 'Work Completed' THEN 1 ELSE 0 END) AS [Work Completed]
    //                     FROM tbl_psw_meeting AS meeting
    //                     LEFT JOIN tbl_psw_action_points AS action_point 
    //                     ON meeting.meeting_id = action_point.meeting_id
    //                     GROUP BY
    //                     meeting.meeting_id,
    //                     meeting.meeting_held_on,
    //                     meeting.subject_of_the_meeting,
    //                     meeting.wings
    //                 `;
    //             } else {
    //                 // If meeting_id is NOT provided
    //                 query = `
    //                     SELECT
    //                     meeting.meeting_id,
    //                     CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,
    //                     meeting.subject_of_the_meeting,
    //                     meeting.wings,
    //                     SUM(CASE WHEN action_point.status = 'Yet to be Initiated' THEN 1 ELSE 0 END) AS [Yet To Be Initiated],
    //                     SUM(CASE WHEN action_point.status = 'Work in Progress' THEN 1 ELSE 0 END) AS [Work In Progress],
    //                     SUM(CASE WHEN action_point.status = 'Work Completed' THEN 1 ELSE 0 END) AS [Work Completed]
    //                 FROM tbl_psw_meeting AS meeting
    //                 LEFT JOIN tbl_psw_action_points AS action_point 
    //                     ON meeting.meeting_id = action_point.meeting_id
    //                 WHERE action_point.assigned_to IS NOT NULL
    //                 AND EXISTS (
    //                     SELECT 1
    //                     FROM STRING_SPLIT(action_point.assigned_to, ',') s
    //                     WHERE TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = @organisationID
    //                 )
    //                 GROUP BY
    //                     meeting.meeting_id,
    //                     meeting.meeting_held_on,
    //                     meeting.subject_of_the_meeting,
    //                     meeting.wings
    //                 `;
    //             }

    //             const result = await request.query(query);
    //             return res.json({ rowData: result.recordset });

    //     } catch (err) {
    //         console.error(err);
    //         res.sendStatus(500);
    //     }
    // }

    async function getMeetingStatusSummary(req, res) {
    try {

        const roleID = req.params.roleID;
        const userID = req.params.userID;
        console.log(userID,"userwing")
        const organisationID = req.params.organisationID;
        const WingID = req.params.WingId;

        console.log(WingID, "wingg");

        const conn = await pool;
        const request = conn.request();

        request.input("roleID", roleID);
        request.input("organisationID", organisationID);
        request.input("WingID", WingID);
        request.input("userID", userID);

        let query = "";


        if (roleID == 2 || roleID == 4 || roleID == 5 || roleID == 8) {

            query = `
                SELECT
                    meeting.meeting_id,
                    CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,
                    meeting.subject_of_the_meeting,
                    meeting.wings,

                    SUM(CASE WHEN action_point.status = 'Yet to be Initiated' THEN 1 ELSE 0 END) AS [Yet To Be Initiated],

                    SUM(CASE WHEN action_point.status = 'Work in Progress' THEN 1 ELSE 0 END) AS [Work In Progress],

                    SUM(CASE WHEN action_point.status = 'Work Completed' THEN 1 ELSE 0 END) AS [Work Completed]

                FROM tbl_psw_meeting AS meeting

                LEFT JOIN tbl_psw_action_points AS action_point
                    ON meeting.meeting_id = action_point.meeting_id

                GROUP BY
                    meeting.meeting_id,
                    meeting.meeting_held_on,
                    meeting.subject_of_the_meeting,
                    meeting.wings
            `;

        }

        // Wing User
      // Wing User
else if (roleID == 3) {

    query = `
        SELECT
            meeting.meeting_id,

            CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,

            meeting.subject_of_the_meeting,

            meeting.wings,

            meeting.created_by,

            STRING_AGG(action_point.responsible_wing, ', ') AS responsible_wing,

            COALESCE(SUM(
                CASE 
                    WHEN action_point.status = 'Yet to be Initiated' 
                    THEN 1 
                    ELSE 0 
                END
            ), 0) AS [Yet To Be Initiated],

            COALESCE(SUM(
                CASE 
                    WHEN action_point.status = 'Work in Progress' 
                    THEN 1 
                    ELSE 0 
                END
            ), 0) AS [Work In Progress],

            COALESCE(SUM(
                CASE 
                    WHEN action_point.status = 'Work Completed' 
                    THEN 1 
                    ELSE 0 
                END
            ), 0) AS [Work Completed]

        FROM tbl_psw_meeting AS meeting

        LEFT JOIN tbl_psw_action_points AS action_point
            ON meeting.meeting_id = action_point.meeting_id

    

        GROUP BY
            meeting.meeting_id,
            meeting.meeting_held_on,
            meeting.subject_of_the_meeting,
            meeting.wings,
            meeting.created_by
    `;
}

        else {

            query = `
                SELECT
                    meeting.meeting_id,
                    CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,
                    meeting.subject_of_the_meeting,
                    meeting.wings,

                    SUM(CASE WHEN action_point.status = 'Yet to be Initiated' THEN 1 ELSE 0 END) AS [Yet To Be Initiated],

                    SUM(CASE WHEN action_point.status = 'Work in Progress' THEN 1 ELSE 0 END) AS [Work In Progress],

                    SUM(CASE WHEN action_point.status = 'Work Completed' THEN 1 ELSE 0 END) AS [Work Completed]

                FROM tbl_psw_meeting AS meeting

                LEFT JOIN tbl_psw_action_points AS action_point
                    ON meeting.meeting_id = action_point.meeting_id

                WHERE action_point.assigned_to IS NOT NULL

                AND EXISTS (
                    SELECT 1
                    FROM STRING_SPLIT(action_point.assigned_to, ',') s
                    WHERE TRY_CAST(LTRIM(RTRIM(s.value)) AS INT) = @organisationID
                )

                GROUP BY
                    meeting.meeting_id,
                    meeting.meeting_held_on,
                    meeting.subject_of_the_meeting,
                    meeting.wings
            `;
        }

        const result = await request.query(query);

        return res.json({
            rowData: result.recordset
        });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
async function getMeetingStatusSummaryedit(req, res) {
    try {

        const roleID = req.params.roleID;
        const userID = req.params.userID;
        const organisationID = req.params.organisationID;
        const WingID = req.params.WingId;

        console.log(userID, "userwing");
        console.log(WingID, "wingg");

        const conn = await pool;
        const request = conn.request();

        request.input("roleID", roleID);
        request.input("organisationID", organisationID);
        request.input("WingID", WingID);
        request.input("userID", userID);

        let query = `
            
           SELECT
            meeting.meeting_id,

            CONVERT(DATE, meeting.meeting_held_on) AS meeting_held_on,

            meeting.subject_of_the_meeting,

            meeting.wings,

            meeting.created_by,

            STRING_AGG(
                ISNULL(action_point.responsible_wing, ''),
                ', '
            ) AS responsible_wing,

            COALESCE(SUM(
                CASE
                    WHEN action_point.status = 'Yet to be Initiated'
                    THEN 1
                    ELSE 0
                END
            ), 0) AS [Yet To Be Initiated],

            COALESCE(SUM(
                CASE
                    WHEN action_point.status = 'Work in Progress'
                    THEN 1
                    ELSE 0
                END
            ), 0) AS [Work In Progress],

            COALESCE(SUM(
                CASE
                    WHEN action_point.status = 'Work Completed'
                    THEN 1
                    ELSE 0
                END
            ), 0) AS [Work Completed]

        FROM tbl_psw_meeting AS meeting

        LEFT JOIN tbl_psw_action_points AS action_point
            ON meeting.meeting_id = action_point.meeting_id
            AND (
                action_point.assigned_to IS NULL
                OR LTRIM(RTRIM(action_point.assigned_to)) = ''
            )

        GROUP BY
            meeting.meeting_id,
            meeting.meeting_held_on,
            meeting.subject_of_the_meeting,
            meeting.wings,
            meeting.created_by
        `;

        const result = await request.query(query);

        return res.json({
            rowData: result.recordset
        });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}


async function updateActionPointfileupload(req, res) {

    const data = req.body;

    const actionTakenReportorg = req.body.actionTakenReportorg;
    const updateStatusSelect = req.body.updateStatusSelect;
    const updatePublicationdate = req.body.updatePublicationdate;
    const actionPointsDocumentFileName = req.body.actionPointsDocumentFileName;
    const meetingId = req.body.meetingId;

    const organisationID = req.body.organisationID;
    const wing_id = req.body.wing_id;

    const userID = req.body.userID;

    console.log(req.body, "update body");

    const conn = await pool;
    const request = conn.request();

    request.input('updateStatusSelect', updateStatusSelect);
    request.input('actionTakenReportorg', actionTakenReportorg);
    request.input('updatePublicationdate', updatePublicationdate);
    request.input('actionPointsDocumentFileName', actionPointsDocumentFileName);
    request.input("meetingId", meetingId);
    request.input("organisationID", organisationID);
    request.input("wing_id", wing_id);
    request.input("userID", userID);

    try {

        let query = "";

        // ROLE 3 -> update using responsible_wing
        if (wing_id) {

            query = `
                UPDATE tbl_psw_action_points
                SET status = @updateStatusSelect,
                    date_of_completion = @updatePublicationdate,
                    action_point = @actionTakenReportorg,
                    action_points_fileupload = @actionPointsDocumentFileName
                WHERE meeting_id = @meetingId
                AND ',' + responsible_wing + ',' 
                    LIKE '%,' + CAST(@wing_id AS VARCHAR) + ',%'
            `;

        } else {

            // Other roles -> update using organisation
            query = `
                UPDATE tbl_psw_action_points
                SET status = @updateStatusSelect,
                    date_of_completion = @updatePublicationdate,
                    action_point = @actionTakenReportorg,
                    action_points_fileupload = @actionPointsDocumentFileName
                WHERE meeting_id = @meetingId
                AND ',' + assigned_to + ',' 
                    LIKE '%,' + CAST(@organisationID AS VARCHAR) + ',%'
            `;
        }

        await request.query(query);

        return res.sendStatus(201);

    } catch (err) {

        console.log(err);
        return res.sendStatus(500);
    }
}
    
    
    async function actionpointsfileDelete(req, res) 
    {
        try {
            const { fileName } = req.query;
            if (!fileName) {
                return res.status(400).send({ error: "File name is required" });
            }
    
            const uploadDestination = './fileuploads/mom_file'; // Base directory
            const filePath = path.join(uploadDestination, fileName); // Construct the correct file path
    
            // Update the database to set projectcompletion to NULL
            const conn = await pool;
            const request = conn.request();
            request.input('fileName', fileName);
    
            const result = await request.query(`
                UPDATE tbl_psw_action_points
                SET action_points_fileupload = NULL
                WHERE action_points_fileupload = @fileName
            `);
    
            if (result.rowsAffected[0] > 0) {
                res.status(200).send({ message: "File deleted successfully and database updated" });
            } else {
                res.status(404).send({ error: "No matching database record found" });
            }
        } catch (err) {
            res.status(500).send({ error: "Internal Server Error" });
        }
    }

     
    async function momfileDelete(req, res) 
    {
        try {
            const { fileName } = req.query;
            if (!fileName) {
                return res.status(400).send({ error: "File name is required" });
            }
    
            const uploadDestination = './fileuploads/mom_file'; // Base directory
            const filePath = path.join(uploadDestination, fileName); // Construct the correct file path
    
            // Update the database to set projectcompletion to NULL
            const conn = await pool;
            const request = conn.request();
            request.input('fileName', fileName);
    
            const result = await request.query(`
                UPDATE tbl_psw_meeting_file
                SET upload_mom_file = NULL
                WHERE upload_mom_file = @fileName
            `);
    
            if (result.rowsAffected[0] > 0) {
                // console.log(`Database updated. File ${fileName} removed from document_uploader.`);
                res.status(200).send({ message: "File deleted successfully and database updated" });
            } else {
                // console.log(`No database record found for file ${fileName}.`);
                res.status(404).send({ error: "No matching database record found" });
            }
        } catch (err) {
            console.error("Error deleting file or updating database:", err);
            res.status(500).send({ error: "Internal Server Error" });
        }
    }



    async function getmomofPswReport (req, res) 
    {    
        const conn = await pool;
        try 
        {
        const result = await conn.query(`SELECT 
        ap.action_point_id,ap.meeting_id,ap.action_brief,ap.action_point, ap.status,ap.assigned_to,m.meeting_held_on,m.subject_of_the_meeting,
        o.organisation_id,o.organisation_name,w.wing_id,w.wing_name, mf.upload_mom_file

            FROM tbl_psw_action_points ap

            INNER JOIN tbl_psw_meeting m
                ON m.meeting_id = ap.meeting_id
            LEFT JOIN mmt_organisation o
                ON o.organisation_id = ap.assigned_to
            LEFT JOIN mmt_wings w
                ON w.wing_id = m.wings
            LEFT JOIN tbl_psw_meeting_file mf
                ON mf.meeting_id = ap.meeting_id 
            ORDER BY 
                ap.meeting_id,ap.action_point_id;
                    ;`);

            res.json(result.recordset);
        }
        catch(err) 
        {
            console.log(err);
            return res.sendStatus(500);
        }
    };

 async function getmomofPswReportdata(req, res) 
{   
    try 
    {
        const meetingId = req.params.meetingId;
        const conn = await pool;

        const result = await conn.request()   
        .input("meetingId", meetingId)        
        .query(`
           SELECT 
            ap.action_point_id,
            ap.meeting_id,
            ap.action_brief,
            ap.action_point,
            ap.deadline,
            ap.action_points_fileupload,
            ap.status,
            ap.assigned_to,
            m.meeting_held_on,
            m.meeting_chaired_by,
            m.subject_of_the_meeting,
            o.organisation_id,
            o.organisation_name,
            w.wing_id,
            w.wing_name,
            mf.upload_mom_file   

        FROM tbl_psw_action_points ap
        INNER JOIN tbl_psw_meeting m
            ON m.meeting_id = ap.meeting_id
        LEFT JOIN mmt_organisation o
            ON o.organisation_id = ap.assigned_to
        LEFT JOIN mmt_wings w
            ON w.wing_id = m.wings
        LEFT JOIN tbl_psw_meeting_file mf   
            ON mf.meeting_id = ap.meeting_id
        WHERE ap.meeting_id = @meetingId

        ORDER BY 
            ap.meeting_id,
            ap.action_point_id;
        `);

        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
}
export default {createMOM,addNewMOMFile,getMeetingStatusSummary,addMOMRequest,addNewactionpointsFileupload,updateActionPointfileupload,actionpointsPdfFileDownload,actionpointsfileDelete,momfileDelete,getmomofPswReport,getmomofPswReportdata,createMOMedit,getMeetingStatusSummaryedit,upload};