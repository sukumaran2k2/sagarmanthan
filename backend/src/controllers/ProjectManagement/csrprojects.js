import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import moment from 'moment';
import mime from 'mime-types';
import { getDataScope } from '../../middleware/dataScope.js';
import { ORG_GROUPS } from './capexDashboard.js';

// Ministry / master users see every organisation's CSR data; organisation users only their own.
// Decided from the signed token only (never from URL, query or body values), as in GMIS and CAPEX.
// orgId is the organisation to restrict to (null = every organisation); blocked is true for an
// organisation user without an organisation, who sees nothing.
function csrScope(user) {
    const { isWide, isOrganisation, organisationId } = getDataScope(user);
    if (isWide) return { orgId: null, blocked: false };
    if (!isOrganisation || !Number.isFinite(organisationId) || organisationId <= 0) return { orgId: null, blocked: true };
    return { orgId: organisationId, blocked: false };
}

// True when the row exists and belongs to an organisation within the user's scope.
async function canAccessRow(user, table, idColumn, id) {
    const rowId = Number(id);
    if (!Number.isInteger(rowId) || rowId <= 0) return false;
    const scope = csrScope(user);
    if (scope.blocked) return false;
    const request = (await pool).request();
    request.input('scopeRowId', rowId);
    let orgSql = '';
    if (scope.orgId) {
        request.input('scopeOrgId', scope.orgId);
        orgSql = 'AND organisation_id = @scopeOrgId';
    }
    const result = await request.query(`SELECT TOP 1 1 AS ok FROM ${table} WHERE ${idColumn} = @scopeRowId ${orgSql}`);
    return result.recordset.length > 0;
}
const canAccessProject = (user, csrProjectId) => canAccessRow(user, 'tbl_csr_projects', 'csr_project_id', csrProjectId);
const canAccessFund = (user, csrFundId) => canAccessRow(user, 'tbl_csr_fund', 'csr_fund_id', csrFundId);

// Records an organisation user adds always belong to their own organisation.
const organisationForSave = (user, requested) => csrScope(user).orgId ?? requested;

// Dashboard organisation filter: 0 = every organisation (ministry users only); organisation
// users always get their own (-1, which matches nothing, when they have none).
function dashboardOrganisation(req) {
    const scope = csrScope(req.user);
    if (scope.orgId) return scope.orgId;
    if (scope.blocked) return -1;
    return parseInt(req.params.organisationID, 10) || 0;
}

// The project a stored file belongs to (a gallery file or a completion document), or null.
async function projectForCsrFile(fileName) {
    const request = (await pool).request();
    request.input('scopeFileName', fileName);
    const result = await request.query(`
        SELECT TOP 1 csr_project_id FROM (
            SELECT csr_project_id FROM tbl_csr_image WHERE document_name = @scopeFileName
            UNION ALL
            SELECT csr_project_id FROM tbl_csr_projects WHERE project_completion_doc = @scopeFileName
        ) AS files`);
    return result.recordset[0]?.csr_project_id ?? null;
}

// Sends a stored CSR file when it belongs to a project the user can see. Only a plain stored
// file name is accepted, so a request can't reach other server files with "../".
async function sendCsrFile(req, res, fileName) {
    if (!fileName || path.basename(String(fileName)) !== fileName) {
        return res.status(400).send({ error: "Invalid file name" });
    }
    const projectId = await projectForCsrFile(fileName);
    if (!projectId || !(await canAccessProject(req.user, projectId))) {
        return res.status(404).send({ message: "File not found" });
    }
    const filePath = path.join(uploadDestination, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send({ message: "File not found" });
    }
    res.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    fs.createReadStream(filePath).pipe(res);
}


const uploadDestination = "./fileuploads/CSR_Projects";


if (!fs.existsSync(uploadDestination)) 
{
    fs.mkdirSync(uploadDestination, { recursive: true });
}


const generateUniqueFileName = (originalName) => {
    // Get the current date and time in the desired format
    const currentDateTime = moment().format('YYYY-MM-DD_HH-mm-ss');
    
    // Get the file extension from the original file name
    const fileExtension = path.extname(originalName);

    // Create the unique filename using the format 'filename_YYYY-MM-DD_HH-mm-ss.extension'
    const uniqueFileName = `${path.basename(originalName, fileExtension)}_${currentDateTime}${fileExtension}`;

    return uniqueFileName;
};

// Define the storage configuration first
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDestination); // Set the destination folder
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname); // Generate the unique file name
        // req.uniqueFileName = uniqueFileName; // Store the unique file name in the request object
        console.log(`Generated File Name: ${uniqueFileName}`); // Log the generated file name
        callback(null, uniqueFileName); // Pass the unique file name to the callback
    },
});

 const upload = multer({ 
    storage: storage,
    limits: { fileSize: 52428800 },  //50MB
    fileFilter: (req, file, callback) => {
        if (file.mimetype === 'application/pdf') {
            callback(null, true);
        } else {
            callback(new Error('Only PDF files are allowed for this upload.'));
        }
    }
});

async function createCsrProjects(req, res)
{
    if (csrScope(req.user).blocked) {
        return res.status(403).json({ error: "Your account is not linked to an organisation." });
    }
    const organisationID = organisationForSave(req.user, req.body.organisationID);
    const csrfocus = req.body.csrfocus;
    const nameofproject = req.body.nameofproject;
    const projectReceived = req.body.projectReceived;
    const impactproject = req.body.impactproject;
    const targetbeneficiaries = req.body.targetbeneficiaries;
    const projectvalue = req.body.projectvalue;
    const projectstatus = req.body.projectstatus;
    const financialYear = req.body.financialYear;    
    let commencedon = req.body.commencedon;
    let completedon = req.body.completedon;
    const finiancialprogresssofar = req.body.finiancialprogresssofar;
    const physicalprogresssofar = req.body.physicalprogresssofar;
    const remarksoftheproject = req.body.remarksoftheproject;
    const userID = req.user.userId; // created_by / updated_by: the signed-in user, not a body value
    let uniqueFileName = req.body.csrDocumentFileName;  // Use req.uniqueFileName here
    let focusID = req.body.focusID;
    const csrExpenditureTab = req.body.expenditures || [];
    // Ensure csrGalleryFileNames is an array, even if it's not provided
    const csrGalleryFileNames = req.body.csrGalleryFileNames || [];
    // Ensure the default values for optional fields
    if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
    }
    if (!commencedon || commencedon === "") {
        commencedon = null;
    }
    if (!completedon || completedon === "") {
        completedon = null;
    }


    const conn = await pool;
    try {
        const request = conn.request();

        // Bind input parameters for the main CSR project
        request.input("organisationID", organisationID);
        request.input("csrfocus", csrfocus);
        request.input("nameofproject", nameofproject);
        request.input("projectReceived", projectReceived);
        request.input("impactproject", impactproject);
        request.input("targetbeneficiaries", targetbeneficiaries);
        request.input("projectvalue", projectvalue);
        request.input("projectstatus", projectstatus);
        request.input("financialYear", financialYear);
        request.input("commencedon", commencedon);
        request.input("completedon", completedon);
        request.input("finiancialprogresssofar", finiancialprogresssofar);
        request.input("physicalprogresssofar", physicalprogresssofar);
        request.input("remarksoftheproject", remarksoftheproject);
        request.input("userID", userID);
        request.input("focusID", focusID);
        request.input("uniqueFileName", uniqueFileName);


        // Insert into tbl_csr_projects and get the csr_project_id
        const result = await request.query(`
            INSERT INTO tbl_csr_projects (
                organisation_id, csr_focus, project_name, project_received_from, impact_possible_outcome, target_beneficiaries,
                project_value, project_status, financial_year, commenced_on, completed_on, financial_progress, physical_progress, remarks,        
                created_by, created_date, project_completion_doc
            )
            OUTPUT INSERTED.csr_project_id
            VALUES (
                @organisationID, @csrfocus, @nameofproject, @projectReceived, @impactproject, @targetbeneficiaries,
                @projectvalue, @projectstatus, @financialYear, @commencedon, @completedon, @finiancialprogresssofar, @physicalprogresssofar,
                @remarksoftheproject, @userID, GETDATE(), @uniqueFileName
            );
        `);

        const csrProjectId = result.recordset[0].csr_project_id;


        // Expenditure tab         
        // Check the length of csrExpenditureTab before proceeding
        if (csrExpenditureTab.length > 0) {
            for (let i = 0; i < csrExpenditureTab.length; i++) 
            {
                const expenditureRequest = conn.request(); // New request for expenditure insertion
                let csrExpenditureId = csrExpenditureTab[i].csrExpenditureId;
                let expenditureFinancialYear = csrExpenditureTab[i].expenditureFinancialYear;
                let expenditureCost = csrExpenditureTab[i].expenditureCost;
        
                expenditureRequest.input("csrProjectId", csrProjectId);
                expenditureRequest.input("csrExpenditureId", csrExpenditureId);
                expenditureRequest.input("expenditureFinancialYear", expenditureFinancialYear);
                expenditureRequest.input("expenditureCost", expenditureCost);
                expenditureRequest.input("userID", userID);
        
                let query = ` 
                    INSERT INTO tbl_csr_expenditure (csr_project_id, year, csr_expenditure_cost, created_by, created_date) 
                    VALUES (@csrProjectId, @expenditureFinancialYear, @expenditureCost, @userID, GETDATE());
                `;
        
                await expenditureRequest.query(query);
            }
        } 
       
        // Now insert gallery images into tbl_csr_image (if any)
        if (csrGalleryFileNames.length > 0) {
            for (const fileName of csrGalleryFileNames) {
                // Bind the fileName for insertion
                const request = conn.request();
                request.input("fileName", fileName);
                
                let documentType;
                if(fileName.endsWith(".mp4")) {
                    documentType = "Video";
                }
                else {
                    documentType = "Image";
                }

                // Insert gallery image into tbl_csr_image
                request.input("documentType", documentType);
                request.input("csrProjectId", csrProjectId);
                await request.query(`
                    INSERT INTO tbl_csr_image (csr_project_id, document_type, document_name)
                    VALUES (
                        @csrProjectId,
                        @documentType,
                        @fileName
                    );
                `);
            }
        }

        // Send success response
        res.status(200).json({
            message: 'CSR project created successfully with gallery images',
            csr_project_id: csrProjectId,
            status: 200
        });

    } catch (err) {
        console.error("Error creating CSR project:", err);
        res.status(500).json({ error: "An error occurred while creating the project." });
    }
}

async function csrProjectDocumentUploader(req, res) 
{
    // const { folderName } = req.body;
    try {
        const conn = await pool; 
        // console.log("File Details:", req.file);

        if (!req.file || !req.file.filename) {
            console.error("No file or unique file name provided.");
            return res.status(400).json({ error: "No file uploaded or unique name missing" });
        }

        const uniqueFileName = req.file.filename;

        const createDir = `./fileuploads/CSR_Projects`;
       

        const destinationPath = `${createDir}/${uniqueFileName}`;

        // fs.renameSync(req.file.path, destinationPath);
        res.status(200).json({ status: 'success', uniqueFileName });
    } catch (err) {
        console.error("Error in file upload:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

//file upload 
const fileUploadDestination = './fileuploads/CSR_Projects';

let fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, fileUploadDestination );
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const fileUpload= multer({
    storage: fileStorage,
    limits: { fileSize: 10000000},
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            callback(null, true);
        } else {
            callback(new Error('Only image or video files are allowed for the gallery.'));
        }
    }
});

// Wraps a multer upload middleware so a rejected file (wrong type, too large)
// returns a clean 400 JSON response instead of falling through to Express's
// default error page.
function handleUploadErrors(uploadMiddleware) {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
}

async function addNewCsrFileGallery(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const filenames = [];
    
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }

        const createDir = `./fileuploads/CSR_Projects`;

        if (!fs.existsSync(createDir)) {
            fs.mkdirSync(createDir, { recursive: true });
        }

        // Loop through the uploaded files
        for (let index = 0; index < req.files.length; index++) 
        {
            const file = req.files[index];
            // const uniqueFileName = file.originalname;
            const uniqueFileName =  file.filename

            let destinationPath = path.join(createDir, uniqueFileName);
         
            // Move the file to the destination directory
            // fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }
        // Send response with filenames
        return res.status(200).json({
            message: 'success',
            filenames,
            status:200
        });
    } catch (err) {
        // console.error(err.message);
        res.status(400).json({ error: err.message });
    }
}

async function csrfileDownload(req, res) 
{
    try
    {
        await sendCsrFile(req, res, req.params.fileName);
    } catch (error) {
        console.log("error",error)
        res.status(500).send("Internal Server Error");
    }
}

async function csrfileDelete(req, res) 
{
    try {
        const { fileName } = req.query;
        // console.log("Received fileName:", fileName);

        if (!fileName) {
            return res.status(400).send({ error: "File name is required" });
        }

        // Only for a project the user can see
        const projectId = await projectForCsrFile(fileName);
        if (!projectId || !(await canAccessProject(req.user, projectId))) {
            return res.status(404).send({ error: "No matching database record found" });
        }

        // Update the database to set projectcompletion to NULL
        const conn = await pool;
        const request = conn.request();
        request.input('fileName', fileName);
        request.input('projectId', projectId);

        const result = await request.query(`
            UPDATE tbl_csr_projects
            SET project_completion_doc = NULL
            WHERE project_completion_doc = @fileName AND csr_project_id = @projectId
        `);

        if (result.rowsAffected[0] > 0) {
            // console.log(`Database updated. File ${fileName} removed from project_completion_doc.`);
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

// ----------------------------------------------------- GET DATA  -----------------------------------------------------------

async function getCsrProjectslist(req, res)
{
    const scope = csrScope(req.user);
    const conn = await pool;
    const request = conn.request();

    try
    {
        if (!scope.orgId && !scope.blocked)
        {
            const query = ` SELECT csr_project_id, tbl_csr_projects.organisation_id, mmt_organisation.organisation_name, csr_focus, 
                project_name, project_received_from, impact_possible_outcome, target_beneficiaries, project_value, project_status, 
                financial_year, commenced_on, completed_on, financial_progress, physical_progress, remarks, created_by, project_completion_doc,updated_date

                FROM tbl_csr_projects 
                INNER JOIN mmt_organisation ON tbl_csr_projects.organisation_id = mmt_organisation.organisation_id 
                ORDER BY financial_year DESC, 
                CASE 
                    WHEN project_status = 'Approved by Board' THEN 1
                    WHEN project_status = 'Project yet to start' THEN 2
                    WHEN project_status = 'Project Under implementation' THEN 3
                    WHEN project_status = 'Completed' THEN 4
                    ELSE 5 
                END 
                ;
            `;
            
            // Execute the query
            const result = await request.query(query);

            res.json(result.recordset);
        }
        else {
            const organisationID = scope.orgId;

            if (!organisationID) {
                return res.json([]);
            }

            request.input("organisationID", organisationID);

            const query  = `
            SELECT csr_project_id, tbl_csr_projects.organisation_id, mmt_organisation.organisation_name, csr_focus, 
                project_name, project_received_from, impact_possible_outcome, target_beneficiaries, project_value, project_status, 
                financial_year, commenced_on, completed_on, financial_progress, physical_progress, remarks, created_by, project_completion_doc
                FROM tbl_csr_projects 
                INNER JOIN mmt_organisation ON tbl_csr_projects.organisation_id = mmt_organisation.organisation_id
                WHERE tbl_csr_projects.organisation_id = @organisationID
                ORDER BY financial_year DESC, 
                CASE 
                    WHEN project_status = 'Approved by Board' THEN 1
                    WHEN project_status = 'Project yet to start' THEN 2
                    WHEN project_status = 'Project Under implementation' THEN 3
                    WHEN project_status = 'Completed' THEN 4
                    ELSE 5 
                END;
            `;

            const result = await request.query(query);
            res.json(result.recordset);
        }
    } catch (err) {
        console.error('Error fetching CSR projects:', err);
        res.status(500).json({ error: 'Internal server error' }); // Send an error response
    }
}

async function getUpdateCsrProjectsData(req, res) 
{
    const csrProjectId = req.params.csrProjectId;
    const conn = await pool;
    const request = conn.request();
    request.input("csrProjectId", csrProjectId);

    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        const result = await request.query(`
            SELECT
                *
            FROM
                tbl_csr_projects
                WHERE csr_project_id  = @csrProjectId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateCsrProjects(req, res) 
{    
    const projectID = req.body.csrProjectId;
    const csrfocus = req.body.csrfocus;
    const nameofproject = req.body.nameofproject;
    const projectReceived = req.body.projectReceived;
    const impactproject = req.body.impactproject;
    const targetbeneficiaries = req.body.targetbeneficiaries;
    const projectvalue = req.body.projectvalue;
    const projectstatus = req.body.projectstatus;
    const financialYear = req.body.financialYear;
    let commencedon = req.body.commencedon;
    let completedon = req.body.completedon;
    const finiancialprogresssofar = req.body.finiancialprogresssofar;
    const physicalprogresssofar = req.body.physicalprogresssofar;
    const remarksoftheproject = req.body.remarksoftheproject;
    let uniqueFileName = req.body.uniqueFileName;
    const userID = req.user.userId;
    const expenditures = req.body.expenditures || [];

    // Handle null or empty values
    if (!commencedon || commencedon === "") {
        commencedon = null;
    }
    if (!completedon || completedon === "") {
        completedon = null;
    }
    if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
    }

    const conn = await pool;
    const request = conn.request();

    // Set SQL parameters
    request.input("projectID", projectID);
    request.input("csrfocus", csrfocus);
    request.input("nameofproject", nameofproject);
    request.input("projectReceived", projectReceived);
    request.input("impactproject", impactproject);
    request.input("targetbeneficiaries", targetbeneficiaries);
    request.input("projectvalue", projectvalue);
    request.input("projectstatus", projectstatus);
    request.input("financialYear", financialYear);    
    request.input("commencedon", commencedon);
    request.input("completedon", completedon);
    request.input("finiancialprogresssofar", finiancialprogresssofar);
    request.input("physicalprogresssofar", physicalprogresssofar);
    request.input("remarksoftheproject", remarksoftheproject);
    request.input("userID", userID);
    request.input("uniqueFileName", uniqueFileName);

    try {
        if (!(await canAccessProject(req.user, projectID))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        const result = await request.query(`
            UPDATE tbl_csr_projects
            SET
                csr_focus = @csrfocus,
                project_name = @nameofproject,
                project_received_from = @projectReceived,
                impact_possible_outcome = @impactproject,
                target_beneficiaries = @targetbeneficiaries,
                project_value = @projectvalue,
                project_status = @projectstatus,
                financial_year = @financialYear,
                commenced_on = @commencedon,
                completed_on = @completedon,
                financial_progress = @finiancialprogresssofar,
                physical_progress = @physicalprogresssofar,
                remarks = @remarksoftheproject,
                project_completion_doc = @uniqueFileName,
                updated_by = @userID,
                updated_date = getDate()
            
            WHERE csr_project_id = @projectID
        `);

        // Replace all expenditure rows for this project: the frontend doesn't
        // track individual expenditure row IDs, so the simplest correct way
        // to handle additions, removals, and edits in one step is to clear
        // the existing rows and re-insert fresh from the current payload.
        if (expenditures.length > 0) {
            const deleteRequest = conn.request();
            deleteRequest.input("projectID", projectID);
            await deleteRequest.query(`DELETE FROM tbl_csr_expenditure WHERE csr_project_id = @projectID`);

            for (let i = 0; i < expenditures.length; i++) {
                const expenditureRequest = conn.request();
                expenditureRequest.input(`csrProjectId${i}`, projectID);
                expenditureRequest.input(`expenditureFinancialYear${i}`, expenditures[i].expenditureFinancialYear);
                expenditureRequest.input(`expenditureCost${i}`, expenditures[i].expenditureCost);
                expenditureRequest.input(`userID${i}`, userID);

                await expenditureRequest.query(`
                    INSERT INTO tbl_csr_expenditure (csr_project_id, year, csr_expenditure_cost, created_by, created_date)
                    VALUES (@csrProjectId${i}, @expenditureFinancialYear${i}, @expenditureCost${i}, @userID${i}, GETDATE());
                `);
            }
        }

         res.sendStatus(200);
    }catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    
}

// ----------------------------------------------------- Edit Expenditure  ------------------------------------------------------
async function addCsrExpenditure(req, res) 
{
    const csrProjectId = req.body.csrProjectId;
    const csrExpenditureTab = JSON.parse(req.body.csrExpenditureTab);
    const userID = req.user.userId;

    const conn = await pool;

    try
    {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        for (let p = 0; p < csrExpenditureTab.length; p++)
        {
            let csrExpenditureId = csrExpenditureTab[p].csrExpenditureId
            let financialYear = csrExpenditureTab[p].financialYear
            let expenditureCost = csrExpenditureTab[p].expenditureCost
        
            const request = conn.request();
            request.input("csrProjectId", csrProjectId);             
            request.input("csrExpenditureId", csrExpenditureId);
            request.input("financialYear", financialYear);
            request.input("expenditureCost", expenditureCost);
            request.input("userID", userID);

            let query;

            // if (recordCount > 0) 
            if(csrExpenditureId && csrProjectId)
            {
                query =   ` UPDATE tbl_csr_expenditure 
                    SET  csr_expenditure_cost = @expenditureCost, updated_by = @userID, updated_date = GETDATE()
                    WHERE csr_project_id = @csrProjectId AND year = @financialYear`;
            }
            else 
            {
                query = ` INSERT INTO tbl_csr_expenditure ( csr_project_id, year, csr_expenditure_cost, created_by, created_date ) 
                        VALUES ( @csrProjectId, @financialYear, @expenditureCost, @userID, GETDATE() )            
                    ` ;
            }          
            
            await request.query(query);
        }

       res.sendStatus(201);
    } 
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}


async function getCsrExpenditureCost(req, res) 
{
    const csrProjectId = req.params.csrProjectId;
    // const year = req.params.financialYear;

    const conn = await pool;
    const request = conn.request();
    request.input("csrProjectId", csrProjectId);
    // request.input("year",year)

    let result;
    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
            result = await request.query(`SELECT * FROM tbl_csr_expenditure
                WHERE tbl_csr_expenditure.csr_project_id = @csrProjectId ORDER BY year;`);
        
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCsrFileUploadDocument(req,res) {
    const csrProjectId = req.params.csrProjectId;

    console.log("")
    if (!csrProjectId || isNaN(csrProjectId)) {
        return res.status(400).json({ error: "Invalid or missing CSR Project ID" });
    }
    try {
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: "CSR project not found" });
        }
        const conn = await pool;
        const request = conn.request();
        request.input("csrProjectId", csrProjectId);

        let result = await request.query(`
            SELECT * FROM tbl_csr_image WHERE csr_project_id = @csrProjectId ;`);
            if (result.recordset.length === 0) {
                return res.status(200).json([]); 
            } else {
                return res.status(200).json(result.recordset); 
            }
    } catch (error) {
        return res.status(500).json({error: "Internal server error" });
    }    
}

async function deleteGalleryFile(req, res) {
    const csrProjectId = req.params.csrProjectId;
    const fileName = req.params.filename;
    
    try {
        if (!fileName || path.basename(fileName) !== fileName) {
            return res.status(400).send({ error: "File name is required" });
        }
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).send({ error: "File not found in the database" });
        }

        const uploadDestination = './fileuploads/CSR_Projects';
        const filePath = path.join(uploadDestination, fileName);

        const conn = await pool;
        const request = conn.request();
        request.input('csrProjectId', csrProjectId);
        request.input('fileName', fileName);

        const result = await request.query(`
            DELETE FROM tbl_csr_image
            WHERE csr_project_id = @csrProjectId AND document_name = @fileName
        `);

        if (result.rowsAffected[0] > 0) {
            fs.unlinkSync(filePath);
            res.status(200).send({ message: "File deleted successfully and database updated" });
        }else if (result.rowsAffected[0] === 0) {
            return res.status(404).send({ error: "File not found in the database" });
        }else {
            res.status(404).send({ error: "No matching database record found" });
        }
    } catch (err) {
        console.log("errpr",err)
        res.status(500).send({ error: "Internal Server Error" });
    }
}

async function updateGalleryFile(req,res) {

    try {
        const conn = await pool;
        const request = conn.request();

        const { csrProjectId, documentID } = req.body;

        const fileName = req.file.filename;
      
        // const documentType = req.file.documentType;

        if (!documentID) {
            return res.status(400).send({ error: "File name is required" });
        }
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).send({ error: "No matching database record found" });
        }
        const uploadDestination = './fileuploads/CSR_Projects';
        const filePath = path.join(uploadDestination,fileName); 
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).send({ error: "File not found on the server" });
        }

        request.input('csrProjectId', csrProjectId); 
        request.input('documentID', documentID); 
        request.input('fileName', fileName);
       
        const queryString = `
        UPDATE [sagarmanthan_revamp].[dbo].[tbl_csr_image]
        SET 
            [document_name] = @fileName 
        WHERE 
            csr_project_id = @csrProjectId 
            AND document_id = @documentID;
        `;
       
        // Execute the query
        const result = await request.query(queryString);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({
                message: 'success',
                status:200
            });
        } else {
           return res.status(404).send({ error: "No matching database record found" });
        }
    } catch (err) {
        // console.log("err",err)
        res.status(500).send({ error: "Internal Server Error" });
    }
}

async function uploadMediaGalleryFile(req,res) {
    try {
        const conn = await pool;

        const filenames = [];

        const csrProjectId = req.params.csrProjectId;

        if (!csrProjectId) {
            return res.status(400).json({ error: 'Missing csrProjectId' });
        }
        if (!(await canAccessProject(req.user, csrProjectId))) {
            return res.status(404).json({ error: 'CSR project not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }

        const createDir = `./fileuploads/CSR_Projects`;

        if (!fs.existsSync(createDir)) {
            fs.mkdirSync(createDir, { recursive: true });
        }

        // Loop through the uploaded files
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const uniqueFileName =  file.filename;
            const documentType = file.mimetype;

            const removeDocType = documentType.split('/')[0];
            
            let destinationPath = path.join(createDir, uniqueFileName);
            fs.copyFileSync(file.path, destinationPath);
         
            filenames.push(uniqueFileName);

        const insertQuery = `
            INSERT INTO tbl_csr_image (csr_project_id, document_name, document_type)
            VALUES (@csrProjectId, @documentName, @documentType)
        `;
        // A request per file: reusing one redeclared the parameters and failed after the first file
        await conn.request()
                .input('csrProjectId', csrProjectId)
                .input('documentName', uniqueFileName) 
                .input('documentType',removeDocType)  
                .query(insertQuery);  
        }

        return res.status(200).json({
            message: 'Files uploaded successfully',
            filenames,
            status:200
        });
        
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ error: err.message });
    }
}

// ----------------------------------------------------- CSR Fund detail ---------------------------------------------------------
async function addCsrFundDetails(req, res)
{
    if (csrScope(req.user).blocked) {
        return res.status(403).json({ error: "Your account is not linked to an organisation." });
    }
    const organisationID = organisationForSave(req.user, req.body.organisationID);
    const financialYear = req.body.financialYear;
    const netProfit = req.body.netProfit;
    const csrFundAllotedForYear = req.body.csrFundAllotedForYear;
    const openingBalanceCSR = req.body.openingBalanceCSR;   
    const userID = req.user.userId;
   
    const conn = await pool;
    try {
        const request = conn.request();

        // Bind input parameters for the main CSR project
        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("netProfit", netProfit);
        request.input("csrFundAllotedForYear", csrFundAllotedForYear);
        request.input("openingBalanceCSR", openingBalanceCSR);
        request.input("userID", userID);
       
        // Insert into tbl_csr_projects and get the csr_project_id
        const result = await request.query(`
            INSERT INTO tbl_csr_fund (
                organisation_id, financial_year, net_profit, csr_fund_alloted_year, opening_balance_csr, created_by, created_date
            )
            OUTPUT INSERTED.csr_fund_id
            VALUES (
                @organisationID, @financialYear, @netProfit, @csrFundAllotedForYear, @openingBalanceCSR, @userID, GETDATE()
            );
        `);

        const csrFundId = result.recordset[0].csr_fund_id;

        // Send success response
        res.status(200).json({
            message: 'CSR project created successfully with gallery images',
            csr_fund_id: csrFundId,
            status: 200
        });

    } catch (err) {
        console.error("Error creating CSR project:", err);
        res.status(500).json({ error: "An error occurred while creating the project." });
    }
}

async function getCsrFundList(req, res) {
    const scope = csrScope(req.user);
    const conn = await pool;
    const request = conn.request();

    try {
    if (!scope.orgId && !scope.blocked)



     {
            const query = `WITH FundExpenditure AS (
                SELECT 
                    tbl_csr_fund.csr_fund_id, 
                    tbl_csr_fund.organisation_id, 
                    tbl_csr_fund.financial_year, 
                    
                    ROUND(SUM(CASE 
                        WHEN tbl_csr_expenditure.year = tbl_csr_fund.financial_year 
                        AND tbl_csr_projects.organisation_id = tbl_csr_fund.organisation_id
                        THEN tbl_csr_expenditure.csr_expenditure_cost 
                        ELSE 0 
                    END), 2) AS project_expenditure
                FROM 
                    tbl_csr_fund
                LEFT JOIN tbl_csr_expenditure 
                    ON tbl_csr_expenditure.year = tbl_csr_fund.financial_year
                LEFT JOIN tbl_csr_projects 
                    ON tbl_csr_projects.csr_project_id = tbl_csr_expenditure.csr_project_id
                GROUP BY 
                    tbl_csr_fund.csr_fund_id, 
                    tbl_csr_fund.organisation_id, 
                    tbl_csr_fund.financial_year
            )
            SELECT 
                tbl_csr_fund.csr_fund_id, 
                tbl_csr_fund.organisation_id, 
                mmt_organisation.organisation_name, 
                tbl_csr_fund.financial_year, 
                net_profit, 
                opening_balance_csr,
                csr_fund_alloted_year, 
                fe.project_expenditure,
                tbl_csr_fund.updated_date, 

                -- Renaming the total_project_expenditure_for_year to csr_fund_balance
                ROUND(
                    (opening_balance_csr + csr_fund_alloted_year) - 
                    SUM(fe.project_expenditure) OVER (PARTITION BY tbl_csr_fund.organisation_id, tbl_csr_fund.financial_year), 
                    2
                ) AS csr_fund_balance  -- Renamed here

                
            FROM 
                tbl_csr_fund
            INNER JOIN mmt_organisation 
                ON tbl_csr_fund.organisation_id = mmt_organisation.organisation_id 
            LEFT JOIN FundExpenditure fe 
                ON fe.csr_fund_id = tbl_csr_fund.csr_fund_id

            ORDER BY 
                tbl_csr_fund.financial_year DESC;

           `;
            
          // Execute the query
            const result = await request.query(query);

             res.json(result.recordset);
        }
        
       else {
           const organisationID = scope.orgId;

           if (!organisationID) {
               return res.json([]);
           }

           request.input("organisationID", organisationID);

           const query  = `  WITH FundExpenditure AS (
                SELECT 
                    tbl_csr_fund.csr_fund_id, 
                    tbl_csr_fund.organisation_id, 
                    tbl_csr_fund.financial_year, 
                    ROUND(SUM(CASE 
                        WHEN tbl_csr_expenditure.year = tbl_csr_fund.financial_year 
                        AND tbl_csr_projects.organisation_id = tbl_csr_fund.organisation_id
                        THEN tbl_csr_expenditure.csr_expenditure_cost 
                        ELSE 0 
                    END), 2) AS project_expenditure
                FROM 
                    tbl_csr_fund
                LEFT JOIN tbl_csr_expenditure 
                    ON tbl_csr_expenditure.year = tbl_csr_fund.financial_year
                LEFT JOIN tbl_csr_projects 
                    ON tbl_csr_projects.csr_project_id = tbl_csr_expenditure.csr_project_id
                GROUP BY 
                    tbl_csr_fund.csr_fund_id, 
                    tbl_csr_fund.organisation_id, 
                    tbl_csr_fund.financial_year
            )
            SELECT 
                tbl_csr_fund.csr_fund_id, 
                tbl_csr_fund.organisation_id, 
                mmt_organisation.organisation_name, 
                tbl_csr_fund.financial_year, 
                net_profit, 
                opening_balance_csr,
                csr_fund_alloted_year, 
                fe.project_expenditure,
                ROUND(
                    (opening_balance_csr + csr_fund_alloted_year) - 
                    SUM(fe.project_expenditure) OVER (PARTITION BY tbl_csr_fund.organisation_id, tbl_csr_fund.financial_year), 
                    2
                ) AS csr_fund_balance
            FROM 
                tbl_csr_fund
            INNER JOIN mmt_organisation 
                ON tbl_csr_fund.organisation_id = mmt_organisation.organisation_id 
            LEFT JOIN FundExpenditure fe 
                ON fe.csr_fund_id = tbl_csr_fund.csr_fund_id
            WHERE tbl_csr_fund.organisation_id = @organisationID
            ORDER BY 
                tbl_csr_fund.financial_year DESC;
            `;

           const result = await request.query(query);
           res.json(result.recordset);

        }
    } catch (err) {
        console.error('Error fetching CSR Fund:', err);
        res.status(500).json({ error: 'Internal server error' }); // Send an error response
     }
}

async function getUpdateFundData(req, res) 
{

    const csrFundId = req.params.csrFundId;
    const conn = await pool;
    const request = conn.request();
    request.input("csrFundId", csrFundId);

    try {
        if (!(await canAccessFund(req.user, csrFundId))) {
            return res.status(404).json({ error: "CSR fund record not found" });
        }
        const result = await request.query(`
        SELECT csr_fund_id, organisation_id, financial_year, net_profit, csr_fund_alloted_year,
        opening_balance_csr 
        FROM tbl_csr_fund
        WHERE csr_fund_id  = @csrFundId
            
    `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function editCsrFund(req,res)
{

const csrFundId = req.body.csrFundId;
const financialYear = req.body.financialYear;
const netProfit = req.body.netProfit;
const csrFundAllotedForYear = req.body.csrFundAllotedForYear;
const openingBalanceCSR = req.body.openingBalanceCSR;   
const userID = req.user.userId;

const conn = await pool;
const request = conn.request();
request.input("csrFundId", csrFundId);
request.input("financialYear", financialYear);
request.input("netProfit", netProfit);
request.input("csrFundAllotedForYear", csrFundAllotedForYear);
request.input("openingBalanceCSR", openingBalanceCSR);
request.input("userID", userID);

try {
    if (!(await canAccessFund(req.user, csrFundId))) {
        return res.status(404).json({ error: "CSR fund record not found" });
    }
    const result = await request.query(`
        UPDATE tbl_csr_fund  SET financial_year = @financialYear, net_profit = @netProfit, csr_fund_alloted_year = @csrFundAllotedForYear,
            opening_balance_csr = @openingBalanceCSR, updated_by = @userID, updated_date = GETDATE()
            WHERE csr_fund_id = @csrFundId

    `);
    
        
        res.sendStatus(200);
}catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
}
}

async function csrPdfFileDownload(req, res) 
{
    // Previously joined any requested name onto the folder, so "../" could read any server file
    try {
        await sendCsrFile(req, res, req.query.fileName);
    } catch (err) {
        console.error("Error reading file:", err);
        res.status(500).send("Internal Server Error");
    }
}

async function csrProjectsAbstractReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const scope = csrScope(req.user);
        const organisation_id = scope.orgId; // null for a blocked user, which matches no organisation

        let result;

        if (!scope.orgId && !scope.blocked) {
        result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
            org.organisation_id AS [organisationID],
            org.organisation_name AS [Organisation Name],
            SUM(CASE WHEN ac.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS [Approved by Board],
            SUM(CASE WHEN ac.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS [Project yet to Start],
            SUM(CASE WHEN ac.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS [Project Under implementation],
            SUM(CASE WHEN ac.project_status = 'Completed' THEN 1 ELSE 0 END) AS [Completed],
            SUM(CASE WHEN ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed') THEN 1 ELSE 0 END) AS [Total Number of CSR Projects till date]
        FROM
            mmt_organisation org
        LEFT JOIN
            tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
        GROUP BY
            org.organisation_id, org.organisation_name
        ORDER BY
            org.organisation_id;
        `);
        }else{
            request.input("organisation_id", organisation_id);
            result = await request.query(`
                SELECT
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisationID],
                    org.organisation_name AS [Organisation Name],
                    SUM(CASE WHEN ac.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS [Approved by Board],
                    SUM(CASE WHEN ac.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS [Project yet to Start],
                    SUM(CASE WHEN ac.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS [Project Under implementation],
                    SUM(CASE WHEN ac.project_status = 'Completed' THEN 1 ELSE 0 END) AS [Completed],
                    SUM(CASE WHEN ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed') THEN 1 ELSE 0 END) AS [Total Number of CSR Projects till date]
                FROM
                    mmt_organisation org
                LEFT JOIN
                    tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
                WHERE
                    org.organisation_id = @organisation_id
                GROUP BY
                    org.organisation_id, org.organisation_name
                ORDER BY
                    org.organisation_id;
                `);
        }

        const rowData = result.recordset || [];

        let columnDefs = [
            {
                headerName: "S.No",
                field: "S No",
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 455,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Total Number of CSR Projects till date",
                field: "Total Number of CSR Projects till date",
                width: 490,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Current Stage",
                headerClass: "headercenter",
                cellStyle: { textAlign: 'center' },
                children: [
                    {
                        headerName: "Approved by Board",
                        field: "Approved by Board",
                        width: 260,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Project yet to Start",
                        field: "Project yet to Start",
                        width: 280,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Project Under implementation",
                        field: "Project Under implementation",
                        width: 280,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    },
                    {
                        headerName: "Completed",
                        field: "Completed",
                        width: 260,
                        cellStyle: { textAlign: 'center' },
                        cellRenderer: 'hyperlinkCellRenderer'
                    }
                ]
            }
        ];
        return res.json({ columnDefs, rowData });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function csrProjectsDetailedReport(req,res) {
    try {

        const organisationID = req.params.organisationID;
        const OrganisationName = req.params.OrganisationName;
        const statusText = req.query.status;

        const conn = await pool;
        const request = conn.request();

        // Organisation users only get their own organisation, whatever the URL names
        const scope = csrScope(req.user);
        request.input("organisationID", scope.orgId || scope.blocked ? scope.orgId : organisationID);
        request.input("OrganisationName", OrganisationName);

        let statusCondition = '';
        if (statusText) {
            switch (statusText) {
                case 'ApprovedbyBoard':
                    statusCondition = ` AND ac.project_status = 'Approved by Board'`;
                    break;
                case 'ProjectyettoStart':
                    statusCondition = ` AND ac.project_status = 'Project yet to Start'`;
                    break;
                case 'ProjectUnderImplementation':
                    statusCondition = ` AND ac.project_status = 'Project Under implementation'`;
                    break;
                case 'Completed':
                    statusCondition = ` AND ac.project_status = 'Completed'`;
                    break;
                default:
                    break;
            }
        }

        const query = `
            SELECT
                ROW_NUMBER() OVER (ORDER BY ac.csr_project_id) AS [S No],
                org.organisation_id AS [Organisation ID],
                org.organisation_name AS [Organisation Name],
                ac.csr_focus AS [CSR Focus],
                ac.project_name AS [Project Name],
                ac.project_received_from AS [Project Received From],
                ac.impact_possible_outcome AS [Impact Possible Outcome],
                ac.target_beneficiaries AS [Target Beneficiaries],
                ac.project_value AS [Project Value],
                ac.financial_year AS [Financial Year],
                ac.commenced_on AS [Commenced On],
                ac.completed_on AS [Completed On],
                ac.financial_progress AS [Financial Progress],
                ac.physical_progress AS [Physical Progress]
            FROM
                mmt_organisation org
            LEFT JOIN
                tbl_csr_projects ac ON org.organisation_id = ac.organisation_id
            WHERE
                org.organisation_id = @organisationID ${statusCondition}
            ORDER BY
                ac.csr_project_id;
        `;

        const result = await request.query(query);
        const rowData = result.recordset || [];

        let columnDefs = [
            {
                headerName: "S. No",
                field: "S No",
                width:180,
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 280,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR Focus",
                field: "CSR Focus",
                width:180,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Name",
                field: "Project Name",
                width:350,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Received From",
                field: "Project Received From",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Impact Possible Outcome",
                field: "Impact Possible Outcome",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Target Beneficiaries",
                field: "Target Beneficiaries",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Value",
                field: "Project Value",
                width:180,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Year",
                field: "Financial Year",
                width:200,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Commenced On",
                field: "Commenced On",
                width:245,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Completed On",
                field: "Completed On",
                width:240,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Progress",
                field: "Financial Progress",
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Physical Progress",
                field: "Physical Progress",
                cellStyle: { textAlign: 'center' },
            },
        ];
        return res.json({ columnDefs, rowData });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getCurrentFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    return today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};


async function csrExpenditureReport(req,res) {
    try {

        const conn = await pool;
        const request = conn.request();

        let financialYear = req.query.financialYear;
        if (financialYear && financialYear !== 'all') {
            request.input("financialYear", financialYear);
        } else {
            financialYear = null;
            request.input("financialYear", null);
        }

        const scope = csrScope(req.user);
        const organisation_id = scope.orgId; // null for a blocked user, which matches no organisation

        let result;
        if (!scope.orgId && !scope.blocked) {
        result = await request.query(`
          WITH ProjectExpenditure AS (
            SELECT 
                p.organisation_id,
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_csr_expenditure] e
            JOIN 
                [sagarmanthan_revamp].[dbo].[tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],
                ROUND(COALESCE(SUM(pe.total_expenditure), 0), 2) AS [Project Expenditure],
                ROUND(
                    (fund.opening_balance_csr + fund.csr_fund_alloted_year) - 
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [CSR Fund Balance],
                ROW_NUMBER() OVER (PARTITION BY org.organisation_id ORDER BY fund.financial_year DESC) AS rn
            FROM
                mmt_organisation org
            JOIN
                [sagarmanthan_revamp].[dbo].[tbl_csr_fund] fund
                ON org.organisation_id = fund.organisation_id
            LEFT JOIN 
                ProjectExpenditure pe
                ON pe.organisation_id = fund.organisation_id  
                AND pe.financial_year = fund.financial_year  
            WHERE 
                (@financialYear IS NULL OR fund.financial_year = @financialYear)
            GROUP BY
                org.organisation_id,
                org.organisation_name,
                fund.financial_year,
                fund.csr_fund_alloted_year,
                fund.opening_balance_csr
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY organisationID) AS [S No], 
            organisationID, 
            [Organisation Name], 
            [Financial Year], 
            [CSR Fund Allotted Year], 
            [Project Expenditure], 
            [CSR Fund Balance]
        FROM CTE
        ORDER BY organisationID;
         `);
     
        }else {
            request.input("organisationID", organisation_id);
            result = await request.query(
                `WITH ProjectExpenditure AS (
            SELECT 
                p.organisation_id,
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_csr_expenditure] e
            JOIN 
                [sagarmanthan_revamp].[dbo].[tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],
                ROUND(COALESCE(SUM(pe.total_expenditure), 0), 2) AS [Project Expenditure],
                ROUND(
                    (fund.opening_balance_csr + fund.csr_fund_alloted_year) - 
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [CSR Fund Balance],
                ROW_NUMBER() OVER (PARTITION BY org.organisation_id ORDER BY fund.financial_year DESC) AS rn
            FROM
                mmt_organisation org
            JOIN
                [sagarmanthan_revamp].[dbo].[tbl_csr_fund] fund
                ON org.organisation_id = fund.organisation_id
            LEFT JOIN 
                ProjectExpenditure pe
                ON pe.organisation_id = fund.organisation_id  
                AND pe.financial_year = fund.financial_year  
            WHERE 
                (@financialYear IS NULL OR fund.financial_year = @financialYear) AND org.organisation_id = @organisationID
            GROUP BY
                org.organisation_id,
                org.organisation_name,
                fund.financial_year,
                fund.csr_fund_alloted_year,
                fund.opening_balance_csr
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY organisationID) AS [S No], 
            organisationID, 
            [Organisation Name], 
            [Financial Year], 
            [CSR Fund Allotted Year], 
            [Project Expenditure], 
            [CSR Fund Balance]
        FROM CTE
        ORDER BY organisationID;
                   `);
        };

        const rowData = result.recordset || [];
        
        let columnDefs = [
            {
                headerName: "S. No",
                field: "S No",
                width:200,
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                width: 280,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Financial Year",
                field: "Financial Year",
                width:200,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR fund Allotted for the year (Rs.In lakhs)",
                field: "CSR Fund Allotted Year",
                width:400,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Project Expenditure (Rs.In lakhs) ",
                field: "Project Expenditure",
                width:250,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "CSR Fund Balance (Rs.In lakhs)",
                field: "CSR Fund Balance",
                width:400,
                cellStyle: { textAlign: 'center' },
            },
            
        ];
        return res.json({ columnDefs, rowData });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getCSRProjectDashboard(req, res) {
    try {
        const clusterID = parseInt(req.params.clusterID, 10) || 0;
        const organisationID = dashboardOrganisation(req);
        const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
        const focusID = parseInt(req.params.focusID, 10) || 0;

        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("focusID", focusID);

        // Each table is totalled on its own: joining projects, funds and expenditure in one query
        // repeated every fund row once per project (and every project once per expenditure row),
        // so the fund allotted came out many times too high. Funds have no focus area, so the
        // fund total follows the organisation and year filters only; expenditure is that of the
        // filtered projects.
        const combinedQuery = `
        WITH Projects AS (
            SELECT tc.csr_project_id, tc.project_value
            FROM tbl_csr_projects tc
            INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
            WHERE
                (@organisationID = 0 OR tc.organisation_id = @organisationID) AND
                (@financialYear IS NULL OR @financialYear = '' OR tc.financial_year = @financialYear) AND
                (@focusID = 0 OR tc.csr_focus = @focusID)
        )
        SELECT
            (SELECT COUNT(*) FROM Projects) AS total_csr_projects,
            (SELECT ROUND(SUM(project_value) / 100.0, 2) FROM Projects) AS total_project_value,
            (SELECT ROUND(SUM(f.csr_fund_alloted_year) / 100.0, 2)
               FROM tbl_csr_fund f
               INNER JOIN mmt_organisation o ON f.organisation_id = o.organisation_id
               WHERE (@organisationID = 0 OR f.organisation_id = @organisationID)
                 AND (@financialYear IS NULL OR @financialYear = '' OR f.financial_year = @financialYear)) AS csr_fund,
            (SELECT ROUND(SUM(e.csr_expenditure_cost) / 100.0, 2)
               FROM tbl_csr_expenditure e
               INNER JOIN Projects p ON p.csr_project_id = e.csr_project_id) AS total_expenditure
        `; 

        const combinedResult = await request.query(combinedQuery);

        return res.json({
            combinedTotals: combinedResult.recordset[0],
            message: "CSR projects data"
        });

    } catch (error) {
        console.error("Error fetching CSR projects:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCsrFundAllocatted(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const organisationID = dashboardOrganisation(req);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
    const focusID = parseInt(req.params.focusID, 10) || 0;

    const conn = await pool;
    const request = conn.request();

    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("focusID", focusID);

    // Per financial year: the fund allotted that year and the expenditure recorded in that year
    // (as in Reports 1.1-1.3), each totalled on its own so no row is counted twice
    const sqlQuery = `
      WITH Funds AS (
        SELECT f.financial_year, SUM(f.csr_fund_alloted_year) AS allotted
        FROM tbl_csr_fund f
        INNER JOIN mmt_organisation o ON f.organisation_id = o.organisation_id
        WHERE (@organisationID = 0 OR f.organisation_id = @organisationID)
          AND (@financialYear IS NULL OR @financialYear = '' OR f.financial_year = @financialYear)
        GROUP BY f.financial_year
      ),
      Spend AS (
        SELECT e.year AS financial_year, SUM(e.csr_expenditure_cost) AS spent
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects tc ON tc.csr_project_id = e.csr_project_id
        INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
        WHERE (@organisationID = 0 OR tc.organisation_id = @organisationID)
          AND (@financialYear IS NULL OR @financialYear = '' OR e.year = @financialYear)
          AND (@focusID = 0 OR tc.csr_focus = @focusID)
        GROUP BY e.year
      )
      SELECT
        f.financial_year,
        ROUND(f.allotted / 100.0, 2) AS total_fund_allocated,
        ROUND(COALESCE(s.spent, 0) / 100.0, 2) AS total_expenditure
      FROM Funds f
      LEFT JOIN Spend s ON s.financial_year = f.financial_year
      ORDER BY f.financial_year;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectStageWise(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const organisationID = dashboardOrganisation(req);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
    const focusID = parseInt(req.params.focusID, 10) || 0;

    const conn = await pool;
    const request = conn.request();

    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("focusID", focusID);

    const sqlQuery = `
    SELECT
        ISNULL(tc.project_status, 'Unknown') AS project_status,
        COUNT(DISTINCT tc.csr_project_id) AS stage_wise_count,
        ROUND(ISNULL(SUM(tce.csr_expenditure_cost),0)/100.0,2) AS stage_wise_cost
    FROM tbl_csr_projects tc
    LEFT JOIN tbl_csr_expenditure tce ON tc.csr_project_id = tce.csr_project_id
    INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
    WHERE
        (@organisationID = 0 OR o.organisation_id = @organisationID)
        AND (@financialYear IS NULL OR @financialYear = '' OR tc.financial_year = @financialYear) AND
        (@focusID = 0 OR tc.csr_focus = @focusID)
    GROUP BY tc.project_status
    ORDER BY project_status;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCSRProjectCountWise(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const organisationID = dashboardOrganisation(req);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
    const focusID = parseInt(req.params.focusID, 10) || 0;

    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("focusID", focusID);

    const sqlQuery = `
    SELECT 
	  o.organisation_id,
	  o.organisation_name,
	  COUNT(DISTINCT tcp.csr_project_id) AS Total_Projects,
      ROUND(ISNULL(SUM(tce.csr_expenditure_cost),0)/100.0,2) AS stage_wise_cost
	FROM tbl_csr_projects tcp
    LEFT JOIN tbl_csr_expenditure tce 
      ON tcp.csr_project_id = tce.csr_project_id
	LEFT JOIN mmt_organisation o ON tcp.organisation_id = o.organisation_id
	WHERE 
      (@organisationID = 0 OR o.organisation_id = @organisationID)
      AND (@financialYear IS NULL OR @financialYear = '' OR tcp.financial_year = @financialYear) AND
      (@focusID = 0 OR tcp.csr_focus = @focusID)
	GROUP BY o.organisation_id, o.organisation_name
    ORDER BY o.organisation_id, o.organisation_name;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Dashboard: everything in one call, for the filters (cluster, organisation, financial year,
// focus area). Amounts are lakh, as stored; the page shows crore.
// - Projects (KPIs, status table, organisation chart) follow all four filters; the year is the
//   project's financial year.
// - Funds have no focus area, so the fund figures follow cluster, organisation and year only.
//   For one year: that year's fund rows, the expenditure booked in that year, and
//   balance = opening + allotted - expenditure (as Fund Details). For all years the opening
//   balance is each organisation's earliest year, so the summary still adds up.
// - Expenditure (KPI) is the expenditure booked in the selected year on the filtered projects.
// - The year-on-year trend ignores the year filter (it compares years).
// A cluster is a group of organisation categories, as on the CAPEX dashboard.
async function getCsrDashboard(req, res) {
  try {
    const scope = csrScope(req.user);
    const orgId = scope.orgId || (scope.blocked ? -1 : (parseInt(req.query.organisationId, 10) || 0));
    const group = ORG_GROUPS.find((g) => g.id === (parseInt(req.query.clusterId, 10) || 0));
    const clusterSql = scope.orgId || !group ? '1 = 1' : group.sql;
    const fy = req.query.fy && req.query.fy !== 'all' ? String(req.query.fy) : null;
    const focusId = parseInt(req.query.focusId, 10) || 0;

    const request = (await pool).request();
    request.input('orgId', orgId);
    request.input('fy', fy);
    request.input('focusId', focusId);

    // Organisations in the filter: o is mmt_organisation, X the row's organisation column
    const inOrgs = (col) => `(@orgId = 0 OR ${col} = @orgId) AND ${clusterSql}`;
    const result = await request.query(`
      ;WITH Projects AS (
        SELECT p.csr_project_id, p.organisation_id, p.project_value, p.project_status
        FROM tbl_csr_projects p
        INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
        WHERE ${inOrgs('p.organisation_id')}
          AND (@fy IS NULL OR p.financial_year = @fy)
          AND (@focusId = 0 OR p.csr_focus = @focusId)
      )
      SELECT
        COUNT(*) AS projects,
        SUM(project_value) AS project_value,
        SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS under_implementation,
        SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM Projects;

      -- Expenditure booked in the year on the filtered projects (any project year)
      SELECT SUM(e.csr_expenditure_cost) AS expenditure
      FROM tbl_csr_expenditure e
      INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      WHERE ${inOrgs('p.organisation_id')}
        AND (@focusId = 0 OR p.csr_focus = @focusId)
        AND (@fy IS NULL OR e.year = @fy);

      -- Fund summary (no focus filter: funds have no focus area)
      ;WITH Funds AS (
        SELECT f.organisation_id, f.financial_year, f.net_profit, f.opening_balance_csr, f.csr_fund_alloted_year,
          ROW_NUMBER() OVER (PARTITION BY f.organisation_id ORDER BY f.financial_year) AS year_order
        FROM tbl_csr_fund f
        INNER JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
        WHERE ${inOrgs('f.organisation_id')}
          AND (@fy IS NULL OR f.financial_year = @fy)
      )
      SELECT
        SUM(net_profit) AS net_profit,
        SUM(CASE WHEN year_order = 1 THEN opening_balance_csr ELSE 0 END) AS opening_balance,
        SUM(csr_fund_alloted_year) AS allotted,
        (SELECT SUM(e.csr_expenditure_cost)
           FROM tbl_csr_expenditure e
           INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
           INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
           WHERE ${inOrgs('p.organisation_id')}
             AND (@fy IS NULL OR e.year = @fy)) AS expenditure,
        (SELECT SUM(p.project_value)
           FROM tbl_csr_projects p
           INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
           WHERE ${inOrgs('p.organisation_id')}
             AND (@fy IS NULL OR p.financial_year = @fy)) AS project_value
      FROM Funds;

      -- Projects by status
      SELECT ISNULL(p.project_status, 'Not set') AS status, COUNT(*) AS projects, SUM(p.project_value) AS project_value
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      WHERE ${inOrgs('p.organisation_id')}
        AND (@fy IS NULL OR p.financial_year = @fy)
        AND (@focusId = 0 OR p.csr_focus = @focusId)
      GROUP BY p.project_status;

      -- Projects by organisation, with the expenditure booked on them (as 2.0's distribution chart)
      SELECT o.organisation_id, o.organisation_name, COUNT(*) AS projects, SUM(p.project_value) AS project_value,
        SUM(ISNULL(x.spent, 0)) AS expenditure
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
      OUTER APPLY (SELECT SUM(e.csr_expenditure_cost) AS spent FROM tbl_csr_expenditure e WHERE e.csr_project_id = p.csr_project_id) x
      WHERE ${inOrgs('p.organisation_id')}
        AND (@fy IS NULL OR p.financial_year = @fy)
        AND (@focusId = 0 OR p.csr_focus = @focusId)
      GROUP BY o.organisation_id, o.organisation_name
      ORDER BY COUNT(*) DESC, o.organisation_name;

      -- Year-on-year: fund allotted and expenditure booked per financial year (every year)
      ;WITH Allotted AS (
        SELECT f.financial_year, SUM(f.csr_fund_alloted_year) AS allotted
        FROM tbl_csr_fund f
        INNER JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
        WHERE ${inOrgs('f.organisation_id')}
        GROUP BY f.financial_year
      ),
      Spent AS (
        SELECT e.year AS financial_year, SUM(e.csr_expenditure_cost) AS expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
        INNER JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
        WHERE ${inOrgs('p.organisation_id')}
          AND (@focusId = 0 OR p.csr_focus = @focusId)
        GROUP BY e.year
      )
      SELECT COALESCE(a.financial_year, s.financial_year) AS financial_year,
        ISNULL(a.allotted, 0) AS allotted, ISNULL(s.expenditure, 0) AS expenditure
      FROM Allotted a
      FULL OUTER JOIN Spent s ON s.financial_year = a.financial_year
      WHERE COALESCE(a.financial_year, s.financial_year) IS NOT NULL
      ORDER BY 1;

      -- Organisation name (organisation view) and the last time any of this data changed
      SELECT
        (SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @orgId) AS organisation_name,
        (SELECT MAX(d) FROM (
           SELECT MAX(ISNULL(updated_date, created_date)) AS d FROM tbl_csr_projects
           UNION ALL SELECT MAX(ISNULL(updated_date, created_date)) FROM tbl_csr_fund
           UNION ALL SELECT MAX(ISNULL(updated_date, created_date)) FROM tbl_csr_expenditure) t) AS last_updated;
    `);

    const [kpi, spent, fund, statuses, byOrganisation, trend, meta] = result.recordsets;
    const n = (v) => Number(v) || 0;
    const f = fund[0] || {};
    const fundSummary = {
      netProfit: n(f.net_profit),
      openingBalance: n(f.opening_balance),
      allotted: n(f.allotted),
      projectValue: n(f.project_value),
      expenditure: n(f.expenditure),
    };
    fundSummary.balance = fundSummary.openingBalance + fundSummary.allotted - fundSummary.expenditure;

    return res.json({
      view: scope.orgId ? { level: 'organisation', organisationName: meta[0]?.organisation_name || null } : { level: 'ministry' },
      kpi: {
        fundAllotted: fundSummary.allotted,
        projects: n(kpi[0]?.projects),
        projectValue: n(kpi[0]?.project_value),
        expenditure: n(spent[0]?.expenditure),
        underImplementation: n(kpi[0]?.under_implementation),
        completed: n(kpi[0]?.completed),
      },
      fundSummary,
      statuses: statuses.map((r) => ({ status: r.status, projects: n(r.projects), projectValue: n(r.project_value) })),
      byOrganisation: scope.orgId ? [] : byOrganisation.map((r) => ({
        organisationId: r.organisation_id, organisationName: r.organisation_name,
        projects: n(r.projects), projectValue: n(r.project_value), expenditure: n(r.expenditure),
      })),
      trend: trend.map((r) => ({ financialYear: r.financial_year, allotted: n(r.allotted), expenditure: n(r.expenditure) })),
      lastUpdated: meta[0]?.last_updated || null,
    });
  } catch (err) {
    console.error('CSR dashboard error:', err);
    return res.sendStatus(500);
  }
}

async function getDetailedCSRProjects(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const organisationID = dashboardOrganisation(req);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy : null;
    const stage = req.params.stage && req.params.stage !== 'all' ? req.params.stage : null;
    const focusID = parseInt(req.params.focusID, 10) || 0;

    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("stage", stage);
    request.input("focusID", focusID);

    const sqlQuery = `
      SELECT 
          o.organisation_id,
          o.organisation_name,
          tcp.csr_project_id,
          tcp.project_name,
          tcp.financial_year,
          tcp.project_value,
          tcp.project_status,
          tcp.financial_progress,
          tcp.physical_progress,
          tcp.remarks,
          tcp.commenced_on,
          tcp.completed_on
      FROM tbl_csr_projects tcp
      LEFT JOIN mmt_organisation o ON tcp.organisation_id = o.organisation_id
      WHERE 
          (@organisationID = 0 OR o.organisation_id = @organisationID)
          AND (@financialYear IS NULL OR tcp.financial_year = @financialYear)
          AND (@stage IS NULL OR tcp.project_status = @stage) AND
          (@focusID = 0 OR tcp.csr_focus = @focusID)
      ORDER BY 
          o.organisation_id;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectsFocusWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // organisationId is optional (NULL = all-org MOPSW view). An
    // organisation user must never get that all-org view -- force their
    // own organisation_id instead, same reasoning as Report 1.4.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.6 - CSR Focus/Project Area-wise CSR Projects Summary.
    // "CSR Fund Allotted" doesn't have a direct source here: fund
    // allotment is tracked per organisation+year (tbl_csr_fund), not per
    // focus area -- csr_focus only exists as a field on tbl_csr_projects
    // itself. Using SUM(project_value) per focus area as the closest
    // available match ("value of projects allotted to this focus area"),
    // since there's no other fund figure that can be grouped by focus
    // area at all. Flagging this assumption for confirmation.
    // organisationId scopes the query when provided (for the
    // Organisation-sheet's auto-scoped version of this same report).
    const sqlQuery = `
      SELECT
        csr_focus AS CSR_Focus,
        COUNT(*) AS Total_CSR_Projects,
        SUM(project_value) AS CSR_Fund_Allotted_Lakh,
        SUM(CASE WHEN project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS Approved_By_Board,
        SUM(CASE WHEN project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS Yet_to_Start,
        SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS Under_Implementation,
        SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS Completed
      FROM tbl_csr_projects
      WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
      GROUP BY csr_focus
      ORDER BY csr_focus;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectsOrgWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    const conn = await pool;
    const request = conn.request();

    // Report 1.5 is a cross-organisation summary (one row per org) --
    // MOPSW/ministry-only by design, same reasoning as Reports 1.1/1.2.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.5 - Organisation-wise CSR Projects Summary.
    // One row per organisation with a total project count and the 4
    // stage-wise counts. No fund figures in this report per spec (unlike
    // 1.4 and 1.6, which both include CSR Fund Allotted).
    const sqlQuery = `
      SELECT
        o.organisation_name AS Organisation_Name,
        COUNT(p.csr_project_id) AS Total_CSR_Projects,
        SUM(CASE WHEN p.project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS Approved_By_Board,
        SUM(CASE WHEN p.project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS Yet_to_Start,
        SUM(CASE WHEN p.project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS Under_Implementation,
        SUM(CASE WHEN p.project_status = 'Completed' THEN 1 ELSE 0 END) AS Completed
      FROM tbl_csr_projects p
      INNER JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
      GROUP BY o.organisation_name
      ORDER BY o.organisation_name;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrProjectsYearWiseSummary(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // organisationId is optional (NULL = all-org MOPSW view). An
    // organisation user must never get that all-org view, even if they
    // pass 'all' or omit orgId -- force their own organisation_id instead.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.4 - Financial Year-wise CSR Projects Summary.
    // Total_CSR_Projects and the 4 stage-wise counts come from
    // tbl_csr_projects grouped by the project's own financial_year.
    // CSR_Fund_Allotted_Lakh is a separate aggregate from tbl_csr_fund
    // for that same year -- the two tables are combined by UNIONing
    // their distinct years, since a year could have fund records with
    // no projects yet, or vice versa.
    // organisationId scopes both sides when provided (used for the
    // Organisation-sheet's auto-scoped version of this same report).
    const sqlQuery = `
      WITH AllYears AS (
        SELECT DISTINCT financial_year FROM tbl_csr_projects
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        UNION
        SELECT DISTINCT financial_year FROM tbl_csr_fund
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
      ),
      ProjectCounts AS (
        SELECT
          financial_year,
          COUNT(*) AS total_projects,
          SUM(CASE WHEN project_status = 'Approved by Board' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN project_status = 'Project yet to start' THEN 1 ELSE 0 END) AS yet_to_start_count,
          SUM(CASE WHEN project_status = 'Project Under implementation' THEN 1 ELSE 0 END) AS under_implementation_count,
          SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
        FROM tbl_csr_projects
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        GROUP BY financial_year
      ),
      FundByYear AS (
        SELECT financial_year, SUM(csr_fund_alloted_year) AS total_allotted
        FROM tbl_csr_fund
        WHERE (@organisationId IS NULL OR organisation_id = @organisationId)
        GROUP BY financial_year
      )
      SELECT
        ay.financial_year AS Financial_Year,
        COALESCE(pc.total_projects, 0) AS Total_CSR_Projects,
        COALESCE(fby.total_allotted, 0) AS CSR_Fund_Allotted_Lakh,
        COALESCE(pc.approved_count, 0) AS Approved_By_Board,
        COALESCE(pc.yet_to_start_count, 0) AS Yet_to_Start,
        COALESCE(pc.under_implementation_count, 0) AS Under_Implementation,
        COALESCE(pc.completed_count, 0) AS Completed
      FROM AllYears ay
      LEFT JOIN ProjectCounts pc ON pc.financial_year = ay.financial_year
      LEFT JOIN FundByYear fby ON fby.financial_year = ay.financial_year
      ORDER BY ay.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundOrgTrendReport(req, res) {
  try {
    const scope = csrScope(req.user);
    let organisationId = req.params.orgId && req.params.orgId !== 'all' ? req.params.orgId : null;

    // Report 1.3 is org-facing (matches Organisation-sheet report 1.1) --
    // an organisation user can request any org via the URL param, so we
    // override whatever was requested with their own organisation_id.
    // MOPSW/ministry roles keep whatever org they explicitly asked for.
    if (scope.blocked) {
      return res.status(200).json([]);
    }
    if (scope.orgId) {
      organisationId = String(scope.orgId);
    }

    if (!organisationId) {
      // Report 1.3 explicitly requires an organisation to be selected first
      // ("only if the select organisation - report will be generated").
      return res.status(200).json([]);
    }

    const conn = await pool;
    const request = conn.request();
    request.input("organisationId", organisationId);

    // Report 1.3 - Organisation-wise CSR Fund Trend.
    // Same aggregation as Report 1.1, filtered to a single organisation
    // across all its financial years instead of all organisations within
    // one year.
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        WHERE p.organisation_id = @organisationId
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        f.financial_year AS Financial_Year,
        f.csr_fund_alloted_year AS CSR_Fund_Allotted_Lakh,
        COALESCE(eby.total_expenditure, 0) AS Project_Expenditure_Lakh,
        (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) - COALESCE(eby.total_expenditure, 0)) AS CSR_Fund_Balance_Lakh,
        CASE
          WHEN COALESCE(f.csr_fund_alloted_year, 0) = 0 THEN NULL
          ELSE ROUND((COALESCE(eby.total_expenditure, 0) / f.csr_fund_alloted_year) * 100, 2)
        END AS Utilisation_Percent
      FROM tbl_csr_fund f
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      WHERE f.organisation_id = @organisationId
      ORDER BY f.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundOrgWiseReport(req, res) {
  try {
    const scope = csrScope(req.user);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy : null;

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);

    // Report 1.2 is a cross-organisation summary (one row per org) --
    // MOPSW/ministry-only by design, same reasoning as Report 1.1.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.2 - CSR Fund Organisation Wise Report.
    // One row per organisation, for the selected financial year (the UI
    // defaults this to the current FY, matching the platform's own
    // convention elsewhere). Same expenditure-aggregation logic as
    // Report 1.1, just grouped by organisation instead of by year.
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        o.organisation_name AS Organisation_Name,
        f.opening_balance_csr AS Opening_CSR_Balance_Lakh,
        f.csr_fund_alloted_year AS CSR_Fund_Allotted_Lakh,
        COALESCE(eby.total_expenditure, 0) AS Project_Expenditure_Lakh,
        (COALESCE(f.opening_balance_csr, 0) + COALESCE(f.csr_fund_alloted_year, 0) - COALESCE(eby.total_expenditure, 0)) AS CSR_Fund_Balance_Lakh,
        CASE
          WHEN COALESCE(f.csr_fund_alloted_year, 0) = 0 THEN NULL
          ELSE ROUND((COALESCE(eby.total_expenditure, 0) / f.csr_fund_alloted_year) * 100, 2)
        END AS Utilisation_Percent
      FROM tbl_csr_fund f
      LEFT JOIN mmt_organisation o ON f.organisation_id = o.organisation_id
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      WHERE (@financialYear IS NULL OR f.financial_year = @financialYear)
      ORDER BY o.organisation_name;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getCsrFundYearWiseReport(req, res) {
  try {
    const scope = csrScope(req.user);
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy : null;

    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear);

    // Report 1.1 is a cross-organisation summary (No_of_Organisations, sums
    // across every org) -- MOPSW/ministry-only by design, matching the
    // Organisation-sheet numbering where org users only see Reports 1.3/1.4/1.6.
    // Server-side check (not just a frontend restriction) since this report
    // has no organisation filter to scope by at all.
    if (scope.orgId || scope.blocked) {
      return res.status(200).json([]);
    }

    // Report 1.1 - CSR Fund Year Wise Report.
    // No. of Organisations counts distinct orgs that have a fund record for
    // that year. Project Expenditure sums every project's expenditure rows
    // recorded IN that year (not filtered by when the underlying project was
    // originally approved -- a multi-year project's later-year spending still
    // counts toward that later year's fund utilisation).
    const sqlQuery = `
      WITH ExpenditureByYear AS (
        SELECT
          p.organisation_id,
          e.year AS financial_year,
          SUM(e.csr_expenditure_cost) AS total_expenditure
        FROM tbl_csr_expenditure e
        INNER JOIN tbl_csr_projects p ON e.csr_project_id = p.csr_project_id
        GROUP BY p.organisation_id, e.year
      )
      SELECT
        f.financial_year AS Financial_Year,
        COUNT(DISTINCT f.organisation_id) AS No_of_Organisations,
        SUM(f.csr_fund_alloted_year) AS CSR_Fund_Allotted_Lakh,
        SUM(COALESCE(eby.total_expenditure, 0)) AS Project_Expenditure_Lakh,
        (SUM(f.opening_balance_csr) + SUM(f.csr_fund_alloted_year) - SUM(COALESCE(eby.total_expenditure, 0))) AS CSR_Fund_Balance_Lakh,
        CASE
          WHEN SUM(f.csr_fund_alloted_year) = 0 THEN NULL
          ELSE ROUND((SUM(COALESCE(eby.total_expenditure, 0)) / SUM(f.csr_fund_alloted_year)) * 100, 2)
        END AS Utilisation_Percent
      FROM tbl_csr_fund f
      LEFT JOIN ExpenditureByYear eby
        ON eby.organisation_id = f.organisation_id
        AND eby.financial_year = f.financial_year
      WHERE (@financialYear IS NULL OR f.financial_year = @financialYear)
      GROUP BY f.financial_year
      ORDER BY f.financial_year DESC;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default {createCsrProjects, addNewCsrFileGallery, upload, fileUpload, handleUploadErrors, getCsrProjectslist,
        getUpdateCsrProjectsData, updateCsrProjects, csrProjectDocumentUploader, csrfileDownload, csrfileDelete,
        getCsrExpenditureCost, addCsrExpenditure,  getCsrFileUploadDocument,deleteGalleryFile,updateGalleryFile, 
        uploadMediaGalleryFile, addCsrFundDetails, getCsrFundList, getUpdateFundData,  editCsrFund,csrPdfFileDownload,
        csrProjectsAbstractReport,csrProjectsDetailedReport,csrExpenditureReport,getCSRProjectDashboard,getCsrFundAllocatted,
        getCsrFundYearWiseReport, getCsrFundOrgWiseReport, getCsrFundOrgTrendReport, getCsrProjectsYearWiseSummary, getCsrProjectsOrgWiseSummary, getCsrProjectsFocusWiseSummary,
        getCsrProjectStageWise,getCSRProjectCountWise,getDetailedCSRProjects,getCsrDashboard};







        