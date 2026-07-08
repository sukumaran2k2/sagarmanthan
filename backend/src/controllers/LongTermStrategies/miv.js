import { pool } from "../../db.js";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const uploadDestination = './fileuploads/MIV/initiatives';

// Ensure that the destination folder exists
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        let selectedFolder = uploadDestination;

        // Assuming 'exeDocument' corresponds to 'pertChart' in the frontend
        if (file.fieldname === 'supportDocument' || file.fieldname === 'latestImage') {
            selectedFolder = path.join(uploadDestination);
            // Create the folder if it doesn't exist
            fs.promises.mkdir(selectedFolder, { recursive: true });
        }

        callback(null, selectedFolder);
    },
    filename: (req, file, callback) => {
        // Use generateUniqueFileName for all file types
        const uniqueFileName = generateUniqueFileName(file.originalname);
        callback(null, uniqueFileName);
    },
});



// Use the multer instance with the correct storage configuration
const upload = multer({ storage: storage });

// Use promisify from the util module
const filesUploadPromise = promisify(upload.fields([
    // { name: 'projectPPT', maxCount: 1 },
    // { name: 'pertChart', maxCount: 1 },
    { name: 'latestImage', maxCount: 10 },
    { name: 'supportDocument', maxCount: 1 },
]));

function getThemeInitiative(initiativeID) {
    const themeNumber = Math.floor(parseFloat(initiativeID.split('.')[0]));
    return themeNumber;
}

// Create MIV data in the database
async function createMIVData(req, res) {
    try {
        const {
            organisationID,
            initiativeID,
            initiativeName,
            projectDetail,
            totalCost,
            category,
            outcomes,
            sourceOfFunding,
            statusOn,
            statusCurrent,
            physicalProgress,
            reasonsForDrop,
            reasonsForDelay,
            startDate,
            completionDate,
            actualDate,
            userID,
            id,
            directEmpGen, 
			inDirectEmpGen, 
            directInvCreated, 
            inDirectInvCreated,
            Feedback, 
            Response,
            OutcomesRemarks
        } = req.body;
        const themeInitiative = getThemeInitiative(initiativeID);

        const conn = await pool;
        const request = conn.request();

        request.input('organisationID', organisationID);
        request.input('initiativeID', initiativeID);
        request.input('initiativeName', initiativeName);
        request.input('projectDetail', projectDetail);
        request.input('totalCost', totalCost);
        request.input('category', category);
        request.input('outcomes', outcomes);
        request.input('sourceOfFunding', Array.isArray(sourceOfFunding) ? sourceOfFunding.join(',') : sourceOfFunding);
        request.input('statusOn', statusOn);
        request.input('statusCurrent', statusCurrent);
        request.input('physicalProgress', physicalProgress);
        request.input('reasonsForDrop', reasonsForDrop);
        request.input('reasonsForDelay', reasonsForDelay);
        request.input('startDate', startDate);
        request.input('completionDate', completionDate);
        request.input('actualDate', actualDate);
        request.input('userID', userID);
        request.input('id', id);

        request.input('directEmpGen', directEmpGen);
        request.input('inDirectEmpGen', inDirectEmpGen);
        request.input('directInvCreated', directInvCreated);
        request.input('inDirectInvCreated', inDirectInvCreated);
        request.input('themeInitiative', themeInitiative);
        request.input('Feedback', Feedback);
        request.input('Response', Response);
        request.input('OutcomesRemarks', OutcomesRemarks);


        const data = {
            organisationID, initiativeID, initiativeName, projectDetail, totalCost, category,
            outcomes, sourceOfFunding, statusOn, statusCurrent, physicalProgress, reasonsForDrop,
            reasonsForDelay, startDate, completionDate, actualDate, userID, 
            directEmpGen, inDirectEmpGen, directInvCreated, inDirectInvCreated, themeInitiative,
            Feedback, Response, OutcomesRemarks 
        };

        // Insert data into the database
        await request.query(`
            INSERT INTO tbl_initiative (
                organisation_id, initiative_id, initiative_name, project_detail, total_cost, category, outcomes, source_of_funding, status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
                start_date, completion_date, actual_date, created_by, direct_Emp_Gen, inDirect_Emp_Gen, direct_Inv_Created, inDirect_Inv_Created, theme_Initiative, Feedback, Response, Outcomes_Remarks
            ) VALUES (
                @organisationID, @initiativeID, @initiativeName, @projectDetail, @totalCost, @category, @outcomes, @sourceOfFunding, @statusOn, @statusCurrent, @physicalProgress, @reasonsForDrop, @reasonsForDelay,
                @startDate, @completionDate, @actualDate, @userID, @directEmpGen, @inDirectEmpGen, @directInvCreated, @inDirectInvCreated, @themeInitiative, @Feedback, @Response, @OutcomesRemarks
            )
        `);

    //     await request.query(`
    //     UPDATE mmt_initiative_activity
    //     SET status = 1
    //     WHERE id = @id
    // `);

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

//--------------------------------------------- File name generator -----------------------------------------------------------
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

async function uploadFiles(req, res) {
    try {
        await filesUploadPromise(req, res);

        // Update the database with file names
        const conn = await pool;
        const request = conn.request();

        // Handle file uploads
        const getFileFilename = (fileArray) => fileArray && fileArray.length > 0 ? fileArray[0].filename : null;

        // const projectPPT = getFileFilename(req.files && req.files['projectPPT']);
        // const pertChart = getFileFilename(req.files && req.files['pertChart']);
        const latestImage = req.files && req.files['latestImage'] ? req.files['latestImage'].map(image => image.filename).join(',') : null;
        const supportDocument = getFileFilename(req.files && req.files['supportDocument']);  // Add this line to get supportDocument
        let ID = parseInt(req.body.ID);
        
        request.input('ID', ID);
        request.input('latestImage', latestImage);
        request.input('supportDocument', supportDocument);

        if( ID === -1 ){
            const result = await request.query(`
                SELECT TOP 1 ID FROM tbl_initiative
                ORDER BY ID DESC
            `);
            ID = result.recordset[0].ID;

            if(latestImage){
                
                const updateLatest = await request.query(`
                    UPDATE tbl_initiative
                    SET latestImage = @latestImage
                    WHERE ID = @ID;
                `);
            }

            if(supportDocument){
                const updateSupport = await request.query(`
                    UPDATE tbl_initiative
                    SET supportDocument = @supportDocument
                    WHERE ID = @ID;
                `);
            }
        } else {
            if(latestImage){
                const oldLatest = await request.query(`
                    SELECT latestImage FROM tbl_initiative
                    WHERE ID = @ID
                `);
    
                if (oldLatest.recordset.length > 0) {
                    const latestFileName = oldLatest.recordset[0].latestImage;
            
                    if (latestFileName) {
                        if (latestFileName.includes(',')) {
                            const files = latestFileName.split(',');
                            files.forEach(file => {
                                deleteFile(file.trim()); 
                            });
                        } else {
                            deleteFile(latestFileName.trim());
                        }
                    }
                }
                
                const updateLatest = await request.query(`
                    UPDATE tbl_initiative
                    SET latestImage = @latestImage
                    WHERE ID = @ID
                `);
            }
    
            if(supportDocument){
                const oldSupport = await request.query(`
                    SELECT supportDocument as fileName FROM tbl_initiative
                    WHERE ID = @ID
                `);
    
                if (oldSupport.recordset.length > 0) {
                    const name = oldSupport.recordset[0].fileName;
    
                    if (name) {
                        deleteFile(name);
                    }
                    
                }
                const updateSupport = await request.query(`
                    UPDATE tbl_initiative
                    SET supportDocument = @supportDocument
                    WHERE ID = @ID
                `);
            }
        }        

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
const uploadDestinationMeeting = "./fileuploads/MIV/meeting";

if (!fs.existsSync(uploadDestinationMeeting)) {
    fs.mkdirSync(uploadDestinationMeeting, { recursive: true });
}

const storageMeeting = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/MIV/meeting");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        callback(null, uniqueFileName);
    },
});

const uploadMeeting = multer({
    storage: storageMeeting,
    limits: { fileSize: 20000000 }
});


async function getMeeting(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * FROM [sagarmanthan_revamp].[dbo].[tbl_meeting_document];`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// async function createMeeting(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         // Extract data from the request body
//         const meetingDate = req.body.date_of_upload;
//         const organisationID = req.body.organisationID;
//         console.log(organisationID)

//         if (!meetingDate) {
//             return res.status(400).json({ error: "Meeting date is required" });
//         }
//         if (!organisationID) {
//             return res.status(400).json({ error: "organisationID is required" });
//         }

//         if (!req.file) {
//             return res.status(400).json({ error: "No file uploaded" });
//         }

//         const originalFileName = req.file.originalname;
//         const uniqueFileName = req.file.filename;

//         request.input("file_name", sql.NVarChar, uniqueFileName);
//         request.input("date_of_meeting", sql.Date, new Date(meetingDate));
//         request.input("organisationID", sql.Int, organisationID);


//         // Execute the INSERT operation and get the ID of the newly inserted record
//         const result = await request.query(`
//             INSERT INTO tbl_meeting_document (file_name, date_of_meeting, organisation_id)
//             OUTPUT INSERTED.meeting_document_id
//             VALUES (@file_name, @date_of_meeting, @organisationID)
//         `);

//         const insertedId = result.recordset[0].id; // Get the ID from the result

//         // Include the ID in the response
//         res.status(201).json({
//             message: "Meeting record created successfully",
//             id: insertedId,
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

async function createMeeting(req, res) {

    const conn = await pool;
    const request = conn.request();

    const meetingDate = req.body.date_of_upload;
    const organisationID = req.body.organisationID;

    if (!meetingDate) {
        return res.status(400).json({ error: "Meeting date is required" });
    }

    // Check if a file is uploaded
    if (req.file && req.file.fieldname === "file") {
        const originalFileName = req.file.originalname;
        const uniqueFileName = req.file.filename;
        request.input("file_name", sql.NVarChar, uniqueFileName);
    } else {
        request.input("file_name", sql.NVarChar, null);
    }

    request.input("date_of_meeting", sql.Date, new Date(meetingDate));
    request.input("organisationID", sql.Int, organisationID);

    // Execute the INSERT operation and get the ID of the newly inserted record
    const result = await request.query(`
            INSERT INTO tbl_meeting_document (file_name, date_of_meeting, organisation_id)
            OUTPUT INSERTED.meeting_document_id
            VALUES (@file_name, @date_of_meeting, @organisationID)
        `);

    const insertedId = result.recordset[0].meeting_document_id; // Get the ID from the result

    // Include the ID in the response
    res.status(201).json({
        message: "Meeting record created successfully",
        id: insertedId,
    });
}





//-------------------------------------------------- miv data --------------------------------------------------
async function getMIVData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT ID, initiative_id, initiative_name, total_cost, project_detail,
        category, outcomes, source_of_funding, status_on, status_current, physical_progress, reasons_for_drop, 
        reasons_for_delay, start_date, completion_date, actual_date, updated_date, tbl_initiative.organisation_id,
        organisation_name   
        FROM tbl_initiative
        INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
        ;`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// async function getMIVData(req, res) 
// {
//     const conn = await pool;

//     try {
//         const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
//         const organisationID = orgResult.recordset[0].organisation_id;

//         const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
//         const userIDs = usersResult.recordset.map(user => user.user_id);

// const result = await conn.query(`SELECT ID, initiative_id, initiative_name, total_cost, category, 
//     source_of_funding, status_on, status_current, physical_progress, reasons_for_drop, 
//     reasons_for_delay, start_date, completion_date, actual_date, tbl_initiative.organisation_id,
//     organisation_name   

// FROM tbl_initiative
// INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
// WHERE created_by IN (${userIDs.join(',')});`);
//         res.json(result.recordset);
//     } catch (err) {
//         console.error(err);
//         return res.sendStatus(500);
//     }
// }


async function editMIVData(req, res) {
    try {
        const {
            ID,
            organisationID,
            initiativeID,
            initiativeName,
            projectDetail,
            totalCost,
            category,
            outcomes,
            sourceOfFunding,
            statusOn,
            statusCurrent,
            physicalProgress,
            reasonsForDrop,
            reasonsForDelay,
            startDate,
            completionDate,
            actualDate,

            directEmpGen, 
			inDirectEmpGen, 
            directInvCreated, 
            inDirectInvCreated,
            Feedback,
            Response,
            OutcomesRemarks
        } = req.body;


        const conn = await pool;
        const request = conn.request();

        request.input("ID", ID);
        request.input("organisationID", organisationID);
        request.input("initiativeID", initiativeID);
        request.input("initiativeName", initiativeName);
        request.input('projectDetail', projectDetail);
        request.input("totalCost", totalCost);
        request.input("category", category);
        request.input("outcomes", outcomes);
        request.input("sourceOfFunding", Array.isArray(sourceOfFunding) ? sourceOfFunding.join(",") : sourceOfFunding);
        request.input("statusOn", statusOn);
        request.input("statusCurrent", statusCurrent);
        request.input("physicalProgress", physicalProgress);
        request.input("reasonsForDrop", reasonsForDrop);
        request.input("reasonsForDelay", reasonsForDelay);
        request.input("startDate", startDate);
        request.input("completionDate", completionDate);
        request.input("actualDate", actualDate);

        request.input('directEmpGen', directEmpGen);
        request.input('inDirectEmpGen', inDirectEmpGen);
        request.input('directInvCreated', directInvCreated);
        request.input('inDirectInvCreated', inDirectInvCreated);
        request.input('Feedback', Feedback);
        request.input('Response', Response);
        request.input('OutcomesRemarks', OutcomesRemarks);


        // Ensure that the destination folder exists
        // const uploadDestination = './fileuploads/MIV/initiatives';
        // if (!fs.existsSync(uploadDestination)) {
        //     fs.mkdirSync(uploadDestination, { recursive: true });
        // }

        // const storage = multer.diskStorage({
        //     destination: (req, file, callback) => {
        //         let selectedFolder = uploadDestination;

        //         if (file.fieldname === 'latestImage') {
        //             selectedFolder = path.join(uploadDestination, 'documents');
        //             fs.promises.mkdir(selectedFolder, { recursive: true });
        //         }

        //         callback(null, selectedFolder);
        //     },
        //     filename: (req, file, callback) => {
        //         callback(null, file.originalname);
        //     },
        // });

        // const upload = multer({ storage: storage });

        // // Handle file uploads
        // const filesUpload = upload.fields([
        //     // { name: 'projectPPT', maxCount: 1 },
        //     // { name: 'pertChart', maxCount: 1 },
        //     { name: 'latestImage', maxCount: 10 },
        // ]);

        // filesUpload(req, res, async function (err) {
        //     if (err) {
        //         console.error(err);
        //         res.sendStatus(500);
        //         return;
        //     }

        //     const getFileFilename = (fileArray) => fileArray && isImage(fileArray[0]) ? fileArray[0].filename : null;
        //     const getFileFilenames = (fileArray) => fileArray ? fileArray.filter(file => isImage(file)).map(image => image.filename).join(',') : null;

        //     // const projectPPT = req.files && req.files['projectPPT'] ? getFileFilename(req.files['projectPPT']) : null;
        //     // const pertChart = req.files && req.files['pertChart'] ? getFileFilename(req.files['pertChart']) : null;
        //     const latestImage = req.files && req.files['latestImage'] ? getFileFilenames(req.files['latestImage']) : null;

        //     // request.input("projectPPT", projectPPT);
        //     // request.input("pertChart", pertChart);
        //     request.input("latestImage", latestImage);

            try {
                // Updated the SET clause without parentheses
                await request.query(`
                    UPDATE tbl_initiative
                    SET
                        initiative_id = @initiativeID,
                        initiative_name = @initiativeName,
                        project_detail = @projectDetail,
                        total_cost = @totalCost,
                        category = @category,
                        outcomes = @outcomes,
                        source_of_funding = @sourceOfFunding,
                        status_on = @statusOn,
                        status_current = @statusCurrent,
                        physical_progress = @physicalProgress,
                        reasons_for_drop = @reasonsForDrop,
                        reasons_for_delay = @reasonsForDelay,
                        start_date = @startDate,
                        completion_date = @completionDate,
                        actual_date = @actualDate,
                        updated_date = GETDATE(),

                        direct_Emp_Gen = @directEmpGen, 
                        inDirect_Emp_Gen = @inDirectEmpGen, 
                        direct_Inv_Created = @directInvCreated, 
                        inDirect_Inv_Created = @inDirectInvCreated,
                        Feedback = @Feedback, 
                        Response = @Response,
                        Outcomes_Remarks = @OutcomesRemarks  
                    WHERE ID = @ID`);
                res.sendStatus(201);
            } catch (error) {
                console.error("Error updating initiative data:", error);
                res.sendStatus(500);
            }
        // });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}


function isImage(file) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    return imageExtensions.includes(fileExtension);
}

//------------------------------------------------------------ NO OF MEETING ------------------------------------------------------------


// async function getNoOfMeetings(req, res) {
//     const conn = await pool;
//     try {
//         const result = await conn.query('SELECT no_of_meetings FROM tbl_no_of_meeting WHERE no_of_meeting_id = 1;');

//         if (result.recordset && result.recordset.length > 0) {
//           const noOfMeetings = result.recordset[0].no_of_meetings ?? 0;
//           res.json({ no_of_meetings: noOfMeetings });
//         } else {
//           res.status(500).json({ error: 'No data found in the result set' });
//         }
//       } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error' });
//       } finally {
//         conn.release(); // Release the connection back to the pool
//       }
// }

async function getNoOfMeetings(req, res) {
    const organisationID = req.query.organisationID;
    const conn = await pool;
    const request = conn.request();

    request.input('organisationID', organisationID);
    

    try {
        const result = await request.query(`SELECT count(meeting_document_id) as meeting_document_id ,
            tbl_meeting_document.organisation_id,
            organisation_name 
            FROM tbl_meeting_document      
          
            INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_meeting_document.organisation_id
           
            where tbl_meeting_document.organisation_id = @organisationID
          
            Group by tbl_meeting_document.organisation_id,
            organisation_name  
            ;`);
        // res.json(result.recordset);
        if (result.recordset && result.recordset.length > 0) {
            const noOfMeetings = result.recordset[0].meeting_document_id ?? 0;
            const organisationID = result.recordset[0].organisation_id;
            res.json({ meeting_document_id: noOfMeetings, organisation_id: organisationID });
            // res.json({ meeting_document_id: noOfMeetings });

            //   res.json({ proposalID });        
        }
        else {
            res.status(500).json({ error: 'No data found in the result set' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    finally {
        conn.release(); 
    }
}
// ---------------------------------------------------- meeting document download -----------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadMeeting(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;

        const request = conn.request();
        request.input('id', id);
        
        const result = await request.query(`SELECT file_name FROM tbl_meeting_document WHERE meeting_document_id = @id`);
        const fileName = result.recordset[0].file_name;
        const file_path = path.join(__dirname, "../../../fileuploads/MIV/meeting", fileName);

        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(file_path).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(file_path);
            fileStream.pipe(res);

        } else {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getUpdateMIV(req, res) {
    const conn = await pool;
    const request = conn.request();

    const ID = req.params.ID;
    request.input("ID", ID);
    try {
        const result = await request.query(`SELECT * FROM tbl_initiative WHERE tbl_initiative.ID = @ID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getMIVMeeting(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT 
            COUNT(tbl_meeting_document.meeting_document_id) as meeting_document_count,
            tbl_meeting_document.organisation_id,
            mmt_organisation.organisation_name
        FROM 
            tbl_meeting_document
        INNER JOIN 
            mmt_organisation ON mmt_organisation.organisation_id = tbl_meeting_document.organisation_id
        GROUP BY 
            tbl_meeting_document.organisation_id, mmt_organisation.organisation_name;
    `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getInitiativeMopswData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT ID, initiative_id, initiative_name, project_detail, total_cost, category, outcomes, source_of_funding, status_on, status_current,
         physical_progress, reasons_for_drop, reasons_for_delay,start_date, completion_date, actual_date,updated_date, tbl_initiative.organisation_id,
         organisation_name   
        FROM tbl_initiative
        INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id;`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getLogMeetingMopsw(req, res) {
    const organisationId = req.params.organisationId;
    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request
            .input("organisationId", organisationId)
            .query('SELECT * FROM sagarmanthan_revamp.dbo.tbl_meeting_document WHERE organisation_id = @organisationId;');

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getInitiativeName(req, res) {
    const initiativeID = req.params.initiativeID;
    const organisationID = req.query.organisationID;
    const conn = await pool;
    const request = conn.request();
    request.input("initiativeID", initiativeID);
    request.input("organisationID", organisationID);
    try {
        const result = await request.query('SELECT * FROM mmt_initiative_activity WHERE initiative_id = @initiativeID;');
        // AND organisation_id = @organisationID AND status = 0;
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getInitiativeTargetDate(req, res) {
    const initiativeID = req.params.initiativeID;
    const conn = await pool;
    const request = conn.request();
    request.input("initiativeID", initiativeID);
    try {
        const result = await request.query('SELECT target_date_of_completion FROM mmt_initiative_activity WHERE id = @initiativeID;');

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `fileuploads/MIV/initiatives/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
}

async function getMIVDashboard(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.orgID) || 0;

    const currentStatus = req.query.currentStatus?.trim() || null;
    const startDate = req.query.startDate?.trim() || null;
    const targetDate = req.query.targetDate?.trim() || null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("currentStatus", currentStatus);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);

        const initiativeQuery = `
        WITH CleanInitiatives AS (
            SELECT 
                ti.initiative_id,
                ti.organisation_id,
                ti.total_cost,
                ti.start_date,
                ti.completion_date,
                ti.actual_date,

                ROW_NUMBER() OVER (
                    PARTITION BY ti.initiative_id 
                    ORDER BY ti.initiative_id
                ) AS rn

            FROM tbl_initiative ti
            INNER JOIN mmt_organisation o 
                ON ti.organisation_id = o.organisation_id

            WHERE
                (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)
                AND (@currentStatus IS NULL OR ti.status_current = @currentStatus)

                AND (
                    @startDate IS NULL 
                    OR @targetDate IS NULL
                    OR (
                        ti.start_date <= @targetDate
                        AND ti.completion_date >= @startDate
                    )
                )

                AND ti.actual_date IS NOT NULL
                AND ti.completion_date IS NOT NULL
        )

        SELECT 
            COUNT(*) AS initiative_count,

            COUNT(CASE 
                WHEN actual_date <= completion_date THEN 1 
            END) AS ontime_projects,

            COUNT(CASE 
                WHEN actual_date > completion_date THEN 1 
            END) AS delayed_projects,

            SUM(total_cost) AS totalInitiativeCost,

            SUM(CASE 
                WHEN actual_date <= completion_date THEN total_cost 
                ELSE 0 
            END) AS totalOntimeCost,

            SUM(CASE 
                WHEN actual_date > completion_date THEN total_cost 
                ELSE 0 
            END) AS totalDelayCost

        FROM CleanInitiatives
        WHERE rn = 1;
        `;

        const meetingQuery = `
        SELECT 
            COUNT(DISTINCT tmd.meeting_document_id) AS meeting_document_count
        FROM tbl_meeting_document tmd
        INNER JOIN mmt_organisation o 
            ON tmd.organisation_id = o.organisation_id
        WHERE
            (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
            AND (@organisationID = 0 OR o.organisation_id = @organisationID);
        `;

        const [initiativeResult, meetingResult] = await Promise.all([
            request.query(initiativeQuery),
            request.query(meetingQuery)
        ]);

        const combinedTotals = {
            ...initiativeResult.recordset[0],
            ...meetingResult.recordset[0]
        };

        return res.json({
            combinedTotals,
            message: "MIV data"
        });

    } catch (error) {
        console.error("Error fetching MIV:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getMIVactivityStatusWise(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.orgID) || 0;
    const currentStatus = req.query.currentStatus && req.query.currentStatus.trim() !== "" ? req.query.currentStatus : null;
    const startDate = req.query.startDate && req.query.startDate.trim() !== "" ? req.query.startDate : null;
    const targetDate = req.query.targetDate && req.query.targetDate.trim() !== "" ? req.query.targetDate : null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("currentStatus", currentStatus);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);

        const result = await request.query(`
            SELECT 
                ti.status_current AS project_status,
                COUNT(*) AS stage_wise_count
            FROM tbl_initiative ti
            INNER JOIN mmt_organisation o ON ti.organisation_id = o.organisation_id
            INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)
                AND (@currentStatus IS NULL OR ti.status_current = @currentStatus)
                AND (
                    (@startDate IS NULL OR ti.start_date >= @startDate OR ti.completion_date >= @startDate)
                    AND (@targetDate IS NULL OR ti.start_date <= @targetDate OR ti.completion_date <= @targetDate)
                )
            GROUP BY ti.status_current
            ORDER BY ti.status_current;
        `);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error fetching initiative:", error);
        return res.status(500).json({ message: "Error fetching initiative." });
    }
}

async function getMIVactivityCurrentStatusPortWise(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.orgID) || 0;
    const currentStatus = req.query.currentStatus && req.query.currentStatus.trim() !== "" ? req.query.currentStatus : null;
    const startDate = req.query.startDate && req.query.startDate.trim() !== "" ? req.query.startDate : null;
    const targetDate = req.query.targetDate && req.query.targetDate.trim() !== "" ? req.query.targetDate : null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("currentStatus", currentStatus);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);

        const result = await request.query(`
            SELECT 
                mmt.organisation_id,
                mmt.organisation_label,
                ini.status_current AS project_status,
                COUNT(*) AS stage_wise_count
            FROM tbl_initiative ini
            LEFT JOIN mmt_organisation mmt ON ini.organisation_id = mmt.organisation_id
            INNER JOIN mmt_hr_cluster cid ON mmt.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@clusterID = 0 OR mmt.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt.organisation_id = @organisationID)
                AND (@currentStatus IS NULL OR ini.status_current = @currentStatus)
                AND (
                    (@startDate IS NULL OR ini.start_date >= @startDate OR ini.completion_date >= @startDate)
                    AND (@targetDate IS NULL OR ini.start_date <= @targetDate OR ini.completion_date <= @targetDate)
                )
            GROUP BY 
                ini.status_current,
                mmt.organisation_id,
                mmt.organisation_label
            ORDER BY mmt.organisation_id;
        `);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error fetching initiative:", error);
        return res.status(500).json({ message: "Error fetching initiative." });
    }
}

async function getMIVCategoryCountWise(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.orgID) || 0;
    const currentStatus = req.query.currentStatus && req.query.currentStatus.trim() !== "" ? req.query.currentStatus : null;
    const startDate = req.query.startDate && req.query.startDate.trim() !== "" ? req.query.startDate : null;
    const targetDate = req.query.targetDate && req.query.targetDate.trim() !== "" ? req.query.targetDate : null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("currentStatus", currentStatus);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);

        const result = await request.query(`
            SELECT 
                ti.category,
                COUNT(*) AS count
            FROM tbl_initiative ti
            INNER JOIN mmt_organisation mmt ON ti.organisation_id = mmt.organisation_id
            INNER JOIN mmt_hr_cluster cid ON mmt.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@clusterID = 0 OR mmt.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt.organisation_id = @organisationID)
                AND ti.category IS NOT NULL
                AND (@currentStatus IS NULL OR ti.status_current = @currentStatus)
                AND (
                    (@startDate IS NULL OR ti.start_date >= @startDate OR ti.completion_date >= @startDate)
                    AND (@targetDate IS NULL OR ti.start_date <= @targetDate OR ti.completion_date <= @targetDate)
                )
            GROUP BY ti.category
            ORDER BY ti.category;
        `);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error fetching initiative:", error);
        return res.status(500).json({ message: "Error fetching initiative." });
    }
}

async function detailedMivDashboard(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.organisationID) || 0;

    const stage = req.query.stage?.trim().toLowerCase() || null;
    const currentStatus = req.query.currentStatus?.trim().toLowerCase() || null;

    const startDate = req.query.startDate?.trim() || null;
    const targetDate = req.query.targetDate?.trim() || null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("currentStatus", currentStatus);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);
        request.input("stage", stage);

        if (stage === "totalmeeting") {
            const meetingQuery = `
                SELECT 
                    tmd.meeting_document_id,
                    tmd.file_name,
                    FORMAT(tmd.date_of_meeting, 'dd-MM-yyyy') AS date_of_meeting,
                    o.organisation_name
                FROM tbl_meeting_document tmd
                INNER JOIN mmt_organisation o 
                    ON tmd.organisation_id = o.organisation_id
                WHERE
                    (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
                    AND (@organisationID = 0 OR o.organisation_id = @organisationID)
                ORDER BY tmd.date_of_meeting DESC;
            `;

            const result = await request.query(meetingQuery);

            return res.json({
                columnDefs: [
                    { headerName: "Meeting ID", field: "meeting_document_id" },
                    { headerName: "File Name", field: "file_name" },
                    { headerName: "Meeting Date", field: "date_of_meeting" },
                    { headerName: "Organisation", field: "organisation_name" }
                ],
                rowData: result.recordset
            });
        }

        const query = `
        WITH CleanInitiatives AS (
            SELECT 
                ti.initiative_id,
                o.organisation_name,
                ti.initiative_name,
                ti.project_detail,
                ti.total_cost,
                ti.start_date,
                ti.completion_date,
                ti.actual_date,

                ROW_NUMBER() OVER (
                    PARTITION BY ti.initiative_id 
                    ORDER BY ti.initiative_id
                ) AS rn

            FROM tbl_initiative ti
            INNER JOIN mmt_organisation o 
                ON ti.organisation_id = o.organisation_id

            WHERE
                (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)

                AND (@currentStatus IS NULL OR ti.status_current = @currentStatus)

                AND (
                    (@startDate IS NULL OR ti.start_date >= @startDate)
                    AND (@targetDate IS NULL OR ti.completion_date <= @targetDate)
                )
        )

        SELECT 
            initiative_id,
            organisation_name,
            initiative_name,
            project_detail,
            total_cost,
            start_date,
            completion_date,
            actual_date,

            CASE 
                WHEN actual_date IS NULL OR completion_date IS NULL THEN 'total'
                WHEN actual_date <= completion_date THEN 'ontime'
                ELSE 'delayed'
            END AS status

        FROM CleanInitiatives
        WHERE rn = 1

        AND (
            @stage = 'totalinitiatives'

            OR (@stage = 'ontime' 
                AND actual_date IS NOT NULL 
                AND completion_date IS NOT NULL 
                AND actual_date <= completion_date)

            OR (@stage = 'delayed' 
                AND actual_date IS NOT NULL 
                AND completion_date IS NOT NULL 
                AND actual_date > completion_date)
        )

        ORDER BY organisation_name;
        `;

        const result = await request.query(query);

        return res.json({
            columnDefs: [
                { headerName: "Initiative ID", field: "initiative_id" },
                { headerName: "Organisation", field: "organisation_name" },
                { headerName: "Initiative Name", field: "initiative_name" },
                { headerName: "Project Detail", field: "project_detail" },
                { headerName: "Total Cost (In Cr.)", field: "total_cost" },
                { headerName: "Start Date", field: "start_date" },
                { headerName: "Completion Date", field: "completion_date" },
                { headerName: "Actual Date", field: "actual_date" },
                { headerName: "Status", field: "status" }
            ],
            rowData: result.recordset
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getMivCategoryDetails(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.organisationID) || 0;
    const category = req.query.category?.trim() || null;
    const startDate = req.query.startDate?.trim() || null;
    const targetDate = req.query.targetDate?.trim() || null;
    const stage = req.query.stage?.trim().toLowerCase() || null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("category", category);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);
        request.input("stage", stage);

        const query = `
            SELECT 
                ti.initiative_id,
                mmt.organisation_name,
                ti.initiative_name,
                ti.project_detail,
                ti.total_cost,
                ti.start_date,
                ti.completion_date,
                ti.actual_date,
                ti.status_current AS status,
                ti.category
            FROM tbl_initiative ti
            INNER JOIN mmt_organisation mmt 
                ON ti.organisation_id = mmt.organisation_id
            INNER JOIN mmt_hr_cluster cid 
                ON mmt.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@clusterID = 0 OR mmt.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt.organisation_id = @organisationID)
                AND (@category IS NULL OR ti.category = @category)
                AND (@stage IS NULL OR ti.status_current = @stage)
                AND ti.category IS NOT NULL
                AND (
                    (@startDate IS NULL OR ti.start_date >= @startDate OR ti.completion_date >= @startDate)
                    AND (@targetDate IS NULL OR ti.start_date <= @targetDate OR ti.completion_date <= @targetDate)
                )
            ORDER BY ti.initiative_id;
        `;

        const result = await request.query(query);

        res.json({
            columnDefs: [
                { headerName: "Initiative ID", field: "initiative_id" },
                { headerName: "Organisation", field: "organisation_name" },
                { headerName: "Initiative Name", field: "initiative_name" },
                { headerName: "Project Detail", field: "project_detail" },
                { headerName: "Total Cost (In Cr.)", field: "total_cost" },
                { headerName: "Start Date", field: "start_date" },
                { headerName: "Completion Date", field: "completion_date" },
                { headerName: "Actual Date", field: "actual_date" },
                { headerName: "Status", field: "status" }
            ],
            rowData: result.recordset
        });

    } catch (err) {
        console.error("Error fetching category details:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getDetailsMivActivityStatusWise(req, res) {
    const clusterID = parseInt(req.query.clusterID) || 0;
    const organisationID = parseInt(req.query.organisationID) || 0;
    const stage = req.query.stage && req.query.stage.trim() !== "" ? req.query.stage.trim() : null;
    const startDate = req.query.startDate && req.query.startDate.trim() !== "" ? req.query.startDate : null;
    const targetDate = req.query.targetDate && req.query.targetDate.trim() !== "" ? req.query.targetDate : null;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("stage", stage);
        request.input("startDate", startDate);
        request.input("targetDate", targetDate);

        const query = `
            SELECT 
                ti.initiative_id,
                o.organisation_name,
                ti.initiative_name,
                ti.project_detail,
                ti.total_cost,
                ti.start_date,
                ti.completion_date,
                ti.actual_date,
                ti.status_current AS status
            FROM tbl_initiative ti
            INNER JOIN mmt_organisation o ON ti.organisation_id = o.organisation_id
            INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)
                AND (@stage IS NULL OR ti.status_current = @stage)
                AND (@startDate IS NULL OR ti.start_date >= @startDate OR ti.completion_date >= @startDate)
                AND (@targetDate IS NULL OR ti.start_date <= @targetDate OR ti.completion_date <= @targetDate)
            ORDER BY ti.initiative_id;
        `;

        const result = await request.query(query);

        return res.json({
            columnDefs: [
                { headerName: "Initiative ID", field: "initiative_id" },
                { headerName: "Organisation", field: "organisation_name" },
                { headerName: "Initiative Name", field: "initiative_name" },
                { headerName: "Project Detail", field: "project_detail" },
                { headerName: "Total Cost (In Cr.)", field: "total_cost" },
                { headerName: "Start Date", field: "start_date" },
                { headerName: "Completion Date", field: "completion_date" },
                { headerName: "Actual Date", field: "actual_date" },
                { headerName: "Status", field: "status" }
            ],
            rowData: result.recordset
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const MIVTab = {
    getMIVData, createMIVData,
    createMeeting, getMeeting,
    getNoOfMeetings, editMIVData, uploadMeeting: uploadMeeting,
    uploadFiles, downloadMeeting, getUpdateMIV, getMIVMeeting, getInitiativeMopswData, 
    getLogMeetingMopsw, getInitiativeName, getInitiativeTargetDate,getMIVDashboard,
    getMIVactivityStatusWise,getMIVactivityCurrentStatusPortWise,getMIVCategoryCountWise,detailedMivDashboard,
    getMivCategoryDetails,getDetailsMivActivityStatusWise
};

export default MIVTab;
