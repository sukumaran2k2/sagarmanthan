import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import moment from 'moment';
import mime from 'mime-types';


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
    limits: { fileSize: 52428800 }  //50MB
});

async function createCsrProjects(req, res) 
{
    const organisationID = req.body.organisationID;
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
    const userID = req.body.userID;
    let uniqueFileName = req.body.csrDocumentFileName;  // Use req.uniqueFileName here
    let focusID = req.body.focusID;
    const csrExpenditureTab = req.body.csrExpenditureTab || [];
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
                created_by, project_completion_doc
            )
            OUTPUT INSERTED.csr_project_id
            VALUES (
                @organisationID, @csrfocus, @nameofproject, @projectReceived, @impactproject, @targetbeneficiaries,
                @projectvalue, @projectstatus, @financialYear, @commencedon, @completedon, @finiancialprogresssofar, @physicalprogresssofar,
                @remarksoftheproject, @userID, @uniqueFileName
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
        
                let query = ` 
                    INSERT INTO tbl_csr_expenditure (csr_project_id, year, csr_expenditure_cost) 
                    VALUES (@csrProjectId, @expenditureFinancialYear, @expenditureCost);
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
    limits: { fileSize: 10000000}
});

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
        const filename = req.params.fileName;

        if (!filename) {
            return res.status(400).send("File name is required");
        }
        const conn = await pool;

        const result = await conn.request()
        .input('filename', filename) 
        .query('SELECT * FROM tbl_csr_image WHERE document_name = @filename');

        if (result.recordset.length === 0) {
            return res.status(404).send({ message: "File not found in database" });
        }

        const fileName = result.recordset[0].document_name;

        // Base folder path
        const uploadDestinationBase = './fileuploads/CSR_Projects';
        
        const filePath = path.join(uploadDestinationBase, fileName); 

        if (fs.existsSync(filePath)) {
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(filePath).size);
        
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
        res.status(404).send({ message: "File not found" });
        }
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

        const uploadDestination = './fileuploads/CSR_Projects'; // Base directory
        const filePath = path.join(uploadDestination, fileName); // Construct the correct file path

        // Update the database to set projectcompletion to NULL
        const conn = await pool;
        const request = conn.request();
        request.input('fileName', fileName);

        const result = await request.query(`
            UPDATE tbl_csr_projects
            SET project_completion_doc = NULL
            WHERE project_completion_doc = @fileName
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
    const userID = req.params.userID;
    const conn = await pool; 
    const request = conn.request();

    try 
    {    
        request.input('userID', userID);

        const userResult = await request.query(` SELECT role_id FROM tbl_user WHERE user_id = @userID `);
        const { role_id } = userResult.recordset[0];
    
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) 
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
            const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
            const organisationID = orgResult.recordset[0].organisation_id;

            request.input("organisationID", organisationID);

            const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            const query  = `
            SELECT csr_project_id, tbl_csr_projects.organisation_id, mmt_organisation.organisation_name, csr_focus, 
                project_name, project_received_from, impact_possible_outcome, target_beneficiaries, project_value, project_status, 
                financial_year, commenced_on, completed_on, financial_progress, physical_progress, remarks, created_by, project_completion_doc

                FROM tbl_csr_projects 
                INNER JOIN mmt_organisation ON tbl_csr_projects.organisation_id = mmt_organisation.organisation_id

                WHERE tbl_csr_projects.created_by IN (${userIDs.join(',')})
                ORDER BY financial_year DESC, 
                CASE 
                    WHEN project_status = 'Approved by Board' THEN 1
                    WHEN project_status = 'Project yet to start' THEN 2
                    WHEN project_status = 'Project Under implementation' THEN 3
                    WHEN project_status = 'Completed' THEN 4
                    ELSE 5 
                END 
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
    const userID = req.body.userID;

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

    const conn = await pool;
    
    try 
    {
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

            let query;

            // if (recordCount > 0) 
            if(csrExpenditureId && csrProjectId)
            {
                query =   ` UPDATE tbl_csr_expenditure 
                    SET  csr_expenditure_cost = @expenditureCost 
                    WHERE csr_project_id = @csrProjectId AND year = @financialYear`;
            }
            else 
            {
                query = ` INSERT INTO tbl_csr_expenditure ( csr_project_id, year, csr_expenditure_cost) 
                        VALUES ( @csrProjectId, @financialYear, @expenditureCost)            
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
        if (!fileName) {
            return res.status(400).send({ error: "File name is required" });
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
        const request = conn.request();

        const filenames = [];

        const csrProjectId = req.params.csrProjectId;
    
        if (!csrProjectId) {
            return res.status(400).json({ error: 'Missing csrProjectId' });
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
        await request
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
    const organisationID = req.body.organisationID;
    const financialYear = req.body.financialYear;
    const netProfit = req.body.netProfit;
    const csrFundAllotedForYear = req.body.csrFundAllotedForYear;
    const openingBalanceCSR = req.body.openingBalanceCSR;   
    const userID = req.body.userID;
   
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
                organisation_id, financial_year, net_profit, csr_fund_alloted_year, opening_balance_csr, created_by
            )
            OUTPUT INSERTED.csr_fund_id
            VALUES (
                @organisationID, @financialYear, @netProfit, @csrFundAllotedForYear, @openingBalanceCSR, @userID
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
    const userID = req.params.userID;
    console.log(userID)
    const conn = await pool; 
    const request = conn.request();

    try {
        request.input('userID', userID);
        const userResult = await request.query(` SELECT role_id FROM tbl_user WHERE user_id = @userID `);
        console.log(userResult.recordset);
        const { role_id } = userResult.recordset[0]; 
    if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8)



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
          const orgResult = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
           const organisationID = orgResult.recordset[0].organisation_id;

           request.input("organisationID", organisationID);

           const usersResult = await request.query(`SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

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

                WHERE tbl_csr_fund.created_by IN (${userIDs.join(',')})

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
const userID = req.body.userID;

const conn = await pool;
const request = conn.request();
request.input("csrFundId", csrFundId);
request.input("financialYear", financialYear);
request.input("netProfit", netProfit);
request.input("csrFundAllotedForYear", csrFundAllotedForYear);
request.input("openingBalanceCSR", openingBalanceCSR);
request.input("userID", userID);

try {
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
    const { fileName } = req.query;

    // Base folder path
    const uploadDestinationBase = './fileuploads/CSR_Projects';
    // Construct the file path by directly joining the base path and fileName
    const filePath = path.join(uploadDestinationBase, fileName); // Correct file path construction

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(500).send("Internal Server Error");
        } else {
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.setHeader('Content-type', 'application/pdf');
            res.send(data);
        }
    });
}

async function csrProjectsAbstractReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const userID = req.params.userID;

        request.input("userID", userID);

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);
        
        const { role_id, organisation_id } = userResult.recordset[0];

        let result;

        if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5) {
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
        WHERE
            ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed')
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
                    org.organisation_id = @organisation_id AND
                    ac.project_status IN ('Approved by Board', 'Project yet to start', 'Project Under implementation', 'Completed')
                GROUP BY
                    org.organisation_id, org.organisation_name
                ORDER BY
                    org.organisation_id;
                `);
        }

        const rowData = result.recordset;

        // console.log("rowData",rowData)

        if(rowData.length === 0 ){
            return res.status(404).json({ message: 'No data available', columnDefs,rowData })
        }
        
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

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
        res.json({ columnDefs, rowData })

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

        request.input("organisationID",  organisationID);
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
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

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
                // width:180,
                cellStyle: { textAlign: 'center' },
            },
            {
                headerName: "Physical Progress",
                field: "Physical Progress",
                // width:180,
                cellStyle: { textAlign: 'center' },
            },
            
        ];
        res.json({ columnDefs, rowData })

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

        const userID = req.params.userID;
        request.input("userID", userID);

        let financialYear = req.query.financialYear || getCurrentFinancialYear();
        request.input("financialYear", financialYear);

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        let result;
        if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5) {
        result = await request.query(`
          WITH ProjectExpenditure AS (
            -- Aggregating project expenditure at project level
            SELECT 
                p.organisation_id,  -- Get organisation_id via tbl_csr_projects
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_csr_expenditure] e
            JOIN 
                [sagarmanthan_revamp].[dbo].[tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id  -- Linking projects to organisations
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],

                -- Corrected Project Expenditure Calculation
                ROUND(
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [Project Expenditure],

                -- Corrected CSR Fund Balance Calculation
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
                fund.financial_year = @financialYear
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
            -- Aggregating project expenditure at project level
            SELECT 
                p.organisation_id,  -- Get organisation_id via tbl_csr_projects
                e.year AS financial_year,  
                SUM(e.csr_expenditure_cost) AS total_expenditure
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_csr_expenditure] e
            JOIN 
                [sagarmanthan_revamp].[dbo].[tbl_csr_projects] p 
                ON e.csr_project_id = p.csr_project_id  -- Linking projects to organisations
            GROUP BY 
                p.organisation_id, e.year
        ),
        CTE AS (
            SELECT 
                org.organisation_id AS [organisationID],
                org.organisation_name AS [Organisation Name],
                fund.financial_year AS [Financial Year],
                fund.csr_fund_alloted_year AS [CSR Fund Allotted Year],

                -- Corrected Project Expenditure Calculation
                ROUND(
                    COALESCE(SUM(pe.total_expenditure), 0), 2
                ) AS [Project Expenditure],

                -- Corrected CSR Fund Balance Calculation
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
                fund.financial_year = @financialYear AND org.organisation_id = @organisationID
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
        //  (ft.csr_fund_alloted_year + ft.net_profit) - ft.opening_balance_csr AS [CSR Fund Balance],
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
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
        res.json({ columnDefs, rowData })
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getCSRProjectDashboard(req, res) {
    try {
        const clusterID = parseInt(req.params.clusterID, 10) || 0;
        const organisationID = parseInt(req.params.organisationID, 10) || 0;
        const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
        const focusID = parseInt(req.params.focusID, 10) || 0;

        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("financialYear", financialYear);
        request.input("focusID", focusID);

        const combinedQuery = `
        SELECT
            COUNT(DISTINCT tc.csr_project_id) AS total_csr_projects,
            ROUND(SUM(tcf.csr_fund_alloted_year) / 100.0, 2) AS csr_fund,
            ROUND(SUM(tc.project_value) / 100.0, 2) AS total_project_value,
            ROUND(
                SUM(
                    CASE 
                        WHEN tce.year = tcf.financial_year
                            AND tc.organisation_id = tcf.organisation_id
                        THEN tce.csr_expenditure_cost
                        ELSE 0
                    END
                )/ 100.0, 
            2) AS total_expenditure
        FROM tbl_csr_projects tc
        LEFT JOIN tbl_csr_fund tcf ON tc.financial_year = tcf.financial_year AND tc.organisation_id = tcf.organisation_id
        LEFT JOIN tbl_csr_expenditure tce ON tc.csr_project_id = tce.csr_project_id
        INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
        INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
        WHERE
            (@clusterID = 0 OR o.hr_cluster_id = @clusterID) AND
            (@organisationID = 0 OR o.organisation_id = @organisationID) AND
            (@financialYear IS NULL OR @financialYear = '' OR tc.financial_year = @financialYear)AND 
            (@focusID = 0 OR tc.csr_focus = @focusID)
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
    const organisationID = parseInt(req.params.organisationID, 10) || 0;
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
        tcf.financial_year,

        ROUND(SUM(tcf.csr_fund_alloted_year) / 100.0, 2) AS total_fund_allocated,
        ROUND(
            SUM(
                CASE 
                    WHEN tce.year = tcf.financial_year
                        AND tc.organisation_id = tcf.organisation_id
                    THEN tce.csr_expenditure_cost
                    ELSE 0
                END
            ) / 100.0,
        2) AS total_expenditure

    FROM tbl_csr_fund tcf
    LEFT JOIN tbl_csr_projects tc ON tcf.financial_year = tc.financial_year AND tcf.organisation_id = tc.organisation_id
    LEFT JOIN tbl_csr_expenditure tce ON tc.csr_project_id = tce.csr_project_id
    INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
    WHERE
        (@organisationID = 0 OR tc.organisation_id = @organisationID)
        AND (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
        AND (@financialYear IS NULL OR @financialYear = '' OR tcf.financial_year = @financialYear) AND
        (@focusID = 0 OR tc.csr_focus = @focusID)
    GROUP BY tcf.financial_year
    ORDER BY tcf.financial_year;

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
    const organisationID = parseInt(req.params.organisationID, 10) || 0;
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
    INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
    WHERE
        (@clusterID = 0 OR cid.hr_cluster_id = @clusterID)
        AND (@organisationID = 0 OR o.organisation_id = @organisationID)
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
    const organisationID = parseInt(req.params.organisationID, 10) || 0;
    const financialYear = req.params.fy && req.params.fy !== 'all' ? req.params.fy: null;
    const focusID = parseInt(req.params.focusID, 10) || 0;

    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("financialYear", financialYear);
    request.input("focusID", focusID);

    const sqlQuery = `
    select 
	  o.organisation_id,
	  o.organisation_name,
      o.organisation_label,
      --tcp.financial_year,
	   COUNT(DISTINCT tcp.csr_project_id) AS Total_Projects,
       ROUND(ISNULL(SUM(tce.csr_expenditure_cost),0)/100.0,2) AS stage_wise_cost

	FROM tbl_csr_projects tcp
    LEFT JOIN tbl_csr_expenditure tce 
    ON tcp.csr_project_id = tce.csr_project_id
	  LEFT JOIN mmt_organisation o ON tcp.organisation_id = o.organisation_id
      LEFT JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
	WHERE 
          (@clusterID = 0 OR cid.hr_cluster_id = @clusterID)
          AND (@organisationID = 0 OR o.organisation_id = @organisationID)
         AND (@financialYear IS NULL OR @financialYear = '' OR tcp.financial_year = @financialYear) AND
         (@focusID = 0 OR tcp.csr_focus = @focusID)
	GROUP BY o.organisation_id,o.organisation_name,o.organisation_label
     ORDER BY o.organisation_id,o.organisation_name,o.organisation_label;
    `;

    const { recordset } = await request.query(sqlQuery);
    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getDetailedCSRProjects(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const organisationID = parseInt(req.params.organisationID, 10) || 0;
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
      LEFT JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
      WHERE 
          (@clusterID = 0 OR cid.hr_cluster_id = @clusterID)
          AND (@organisationID = 0 OR o.organisation_id = @organisationID)
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

export default {createCsrProjects, addNewCsrFileGallery, upload, fileUpload, getCsrProjectslist,
        getUpdateCsrProjectsData, updateCsrProjects, csrProjectDocumentUploader, csrfileDownload, csrfileDelete,
        getCsrExpenditureCost, addCsrExpenditure,  getCsrFileUploadDocument,deleteGalleryFile,updateGalleryFile, 
        uploadMediaGalleryFile, addCsrFundDetails, getCsrFundList, getUpdateFundData,  editCsrFund,csrPdfFileDownload,
        csrProjectsAbstractReport,csrProjectsDetailedReport,csrExpenditureReport,getCSRProjectDashboard,getCsrFundAllocatted,
        getCsrProjectStageWise,getCSRProjectCountWise,getDetailedCSRProjects};







        