import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import moment from 'moment';
import mime from 'mime-types';



const uploadDestination = "./fileuploads/cmec_policeAdvisorynotes";
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

async function addcmecResearchersdata(req, res) {
    const { researchProjectName, reseachProjectoutput,researchProjectcost,researchStatus, userID } = req.body;
    

    try {
        const conn = await pool;
        const request = conn.request();
        
        request.input("researchProjectName",researchProjectName);
        request.input("reseachProjectoutput",reseachProjectoutput);
        request.input("researchProjectcost",researchProjectcost);
        request.input("researchStatus",researchStatus);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_cmec_researchers 
            (research_project_name, research_project_output, research_project_cost,research_project_status, created_by)
            OUTPUT INSERTED.cmec_research_id
            VALUES (@researchProjectName, @reseachProjectoutput, @researchProjectcost,@researchStatus, @userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].cmec_research_id });

    } catch (error) {
        // console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


  async function getcmecResearchList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_cmec_researchers;
        `);
    
        res.json(result.recordset);
    }

    async function getUpdatecmecResearchdata(req, res) 
    {

        const cmecResearchId = req.params.cmecResearchId;
        const conn = await pool;
        const request = conn.request();
        request.input("cmecResearchId", cmecResearchId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_cmec_researchers
                    WHERE cmec_research_id  = @cmecResearchId
            `);

            res.json(result.recordset);
        } catch (err) {
            // console.log(err);
            return res.status(500).send({ error: "Internal Server Error" });
        }
    }

    
async function updatecmecResearchesData(req,res){

    const data = req.body;
    
    const updateProject = req.body.updateProject;
    const updateResearchprojectOutcome = req.body.updateResearchprojectOutcome;
    const  updateResearchprojectcost = req.body.updateResearchprojectcost;
    const  updateresearchProjectstatus = req.body.updateresearchProjectstatus;
    const cmecResearchIdOrg  = req.body.cmecResearchIdOrg ;

    const userID = req.body.userID;
    const conn = await pool;
    const request = conn.request();
    request.input('updateProject',updateProject);
    request.input('updateResearchprojectOutcome',updateResearchprojectOutcome);
    request.input('updateResearchprojectcost',updateResearchprojectcost);
    request.input('updateresearchProjectstatus',updateresearchProjectstatus);
    request.input("userID", userID);
    request.input("cmecResearchIdOrg",cmecResearchIdOrg);

    

    try {
        const result = await request.query(`UPDATE tbl_cmec_researchers SET research_project_name = @updateProject, research_project_output = @updateResearchprojectOutcome,research_project_cost = @updateResearchprojectcost,research_project_status = @updateresearchProjectstatus,updated_by = @userID,updated_date = getDate() WHERE cmec_research_id  = @cmecResearchIdOrg`);
        return res.sendStatus(200);
    }
    catch (err) {
        // console.log(err);
       return res.status(500).send({ error: "Internal Server Error" });
    }
}

async function addcmecMaritimetalksdata(req, res) {
    const { financialYear, cmecMaritimenmonth,maritimeTalks,publiclectures,newsletters, userID } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();
        
        request.input("financialYear",financialYear);

        // Check if financial year already exists
            const result = await request.query(`
                SELECT COUNT(*) AS count FROM tbl_cmec_maritime_talks_newsletters WHERE financial_year = @financialYear
            `);
    
            if (result.recordset[0].count > 0) {
                return res.status(205).json({ error: "Data already exists for the selected financial year!" });
            } 

            
        request.input("cmecMaritimenmonth",cmecMaritimenmonth);
        request.input("maritimeTalks",maritimeTalks);
        request.input("publiclectures",publiclectures);
        request.input("newsletters",newsletters);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_cmec_maritime_talks_newsletters 
            (financial_year,maritime_month,maritime_talks,public_lectures,news_letters,created_by)
            OUTPUT INSERTED.maritime_talks_id
            VALUES (@financialYear, @cmecMaritimenmonth, @maritimeTalks,@publiclectures,@newsletters, @userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].maritime_talks_id });

    } catch (error) {
        // console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
async function getcmecmaritimedataList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_cmec_maritime_talks_newsletters;
        `);
    
        res.json(result.recordset);
    }


    async function getUpdatecmecMaritimedata(req, res) 
    {

        const cmecmaritimeId = req.params.cmecmaritimeId;
        const conn = await pool;
        const request = conn.request();
        request.input("cmecmaritimeId",cmecmaritimeId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_cmec_maritime_talks_newsletters
                    WHERE maritime_talks_id  = @cmecmaritimeId
            `);

            res.json(result.recordset);
        } catch (err) {
            // console.log(err);
            return res.sendStatus(500);
        }
    }

     async function updatecmecMaritimeTalksData(req,res){
    
        const data = req.body;
        
        const updatefinancialYear = req.body.updatefinancialYear;
        const updatecmecMaritimenmonth = req.body.updatecmecMaritimenmonth;
        const  updateMaritimetalks = req.body.updateMaritimetalks;
        const  updatePubliclectures = req.body.updatePubliclectures;
        const  updateNewsletters = req.body.updateNewsletters;
        const cmecmaritimeIdOrg  = req.body.cmecmaritimeIdOrg ;
    
        const userID = req.body.userID;
    
    
        const conn = await pool;
        const request = conn.request();
        request.input('updatefinancialYear',updatefinancialYear);
        request.input('updatecmecMaritimenmonth',updatecmecMaritimenmonth);
        request.input('updateMaritimetalks',updateMaritimetalks);
        request.input('updatePubliclectures',updatePubliclectures);
        request.input('updateNewsletters',updateNewsletters);
        request.input("userID", userID);
        request.input("cmecmaritimeIdOrg",cmecmaritimeIdOrg);
    
        
    
        try {
            const result = await request.query(`UPDATE tbl_cmec_maritime_talks_newsletters SET financial_year = @updatefinancialYear, maritime_month = @updatecmecMaritimenmonth,maritime_talks = @updateMaritimetalks,public_lectures = @updatePubliclectures,news_letters = @updateNewsletters,updated_by = @userID,updated_date = getDate() WHERE maritime_talks_id = @cmecmaritimeIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            // console.log(err);
            return res.sendStatus(500);
        }
    }

async function addcmecPublicationdata(req, res) {
    const { publicationNo,title,description,author,userID } = req.body;

    try {
        const conn = await pool;
        const request = conn.request();
        
        request.input("publicationNo",publicationNo);     
        request.input("title",title);
        request.input("description",description);
        request.input("author", author);
        request.input("userID", userID);

        const insertResult = await request.query(`
            INSERT INTO tbl_cmec_publications 
            (publication_number,publication_title,Description,author,created_by)
            OUTPUT INSERTED.publication_id
            VALUES (@publicationNo,@title,@description,@author,@userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].publication_id});

    } catch (error) {
        // console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
async function getcPublicationsdataList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_cmec_publications;
        `);
    
        res.json(result.recordset);
 }
async function getUpdatecmecPublicationsdata(req, res) 
    {

        const cmecPublicationsId = req.params.cmecPublicationsId;
        const conn = await pool;
        const request = conn.request();
        request.input("cmecPublicationsId",cmecPublicationsId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_cmec_publications
                    WHERE publication_id  = @cmecPublicationsId
            `);
            res.json(result.recordset);
        } catch (err) {
            // console.log(err);
            return res.sendStatus(500);
        }
    }

async function updatecmecPublicationsData(req,res){
    
        const data = req.body;
        
        const updatepublications = req.body.updatepublications;
        const updateTitle = req.body.updateTitle;
        const updateDescription = req.body.updateDescription;
        const updateAuthor = req.body.updateAuthor;
        const cmecPublicationIdOrg  = req.body.cmecPublicationIdOrg ;
        const userID = req.body.userID;
    
    
        const conn = await pool;
        const request = conn.request();
        request.input('updatepublications',updatepublications);
        request.input('updateTitle',updateTitle);
        request.input('updateDescription',updateDescription);
        request.input('updateAuthor',updateAuthor);
        request.input("userID", userID);
        request.input("cmecPublicationIdOrg",cmecPublicationIdOrg);
    
        
    
        try {
            const result = await request.query(`UPDATE tbl_cmec_publications SET publication_number = @updatepublications, publication_title = @updateTitle,Description = @updateDescription,author = @updateAuthor,updated_by = @userID,updated_date = getDate() WHERE publication_id = @cmecPublicationIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            // console.log(err);
            return res.sendStatus(500);
        }
    }


    
async function addcmecPolicyAdvisoryNotes(req, res) {
    const { documentTitle,policyAdvisory,dateOfPublications,userID } = req.body;
    let uniqueFileName = req.body.cmecDocumentFileName;  // Use req.uniqueFileName here

    try {
        const conn = await pool;
        const request = conn.request();
        
        request.input("documentTitle",documentTitle);     
        request.input("policyAdvisory",policyAdvisory);
        request.input("dateOfPublications",dateOfPublications);
        request.input("uniqueFileName", uniqueFileName);
        request.input("userID", userID);

        if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
        }

        const insertResult = await request.query(`
            INSERT INTO tbl_cmec_policy_advisory_notes 
            (document_title,policy_advisory_note,date_of_publications,document_uploader,created_by)
            OUTPUT INSERTED.policy_advisory_id
            VALUES (@documentTitle,@policyAdvisory,@dateOfPublications,@uniqueFileName,@userID)
        `);

        res.status(201).json({ insertedYPId: insertResult.recordset[0].policy_advisory_id});

    } catch (error) {
        // console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function addNewcmecFileupload(req, res) 
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

        const createDir = `./fileuploads/cmec_policeAdvisorynotes`;
       

        const destinationPath = `${createDir}/${uniqueFileName}`;

        // fs.renameSync(req.file.path, destinationPath);
        res.status(200).json({ status: 'success', uniqueFileName });
    } catch (err) {
        // console.error("Error in file upload:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

//file upload 
const fileUploadDestination = './fileuploads/cmec_policeAdvisorynotes';

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


async function getcmecpolicyAdvisorydataList(req, res) {

        const conn = await pool;
        const request = conn.request();
    
        const result = await request.query(`
            SELECT * FROM tbl_cmec_policy_advisory_notes;
        `);
    
        res.json(result.recordset);
    }

  async function getUpdateCmecAdvisoryData(req, res) 
    {

        const cmecAdvisoryId = req.params.cmecAdvisoryId;
        const conn = await pool;
        const request = conn.request();
        request.input("cmecAdvisoryId", cmecAdvisoryId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_cmec_policy_advisory_notes
                    WHERE policy_advisory_id  = @cmecAdvisoryId
            `);

            res.json(result.recordset);
        } catch (err) {
            // console.log(err);
            res.status(500).send({ error: "Internal Server Error" });
        }
    }

    async function cmecPdfFileDownload(req, res) 
    {
        const { fileName } = req.query;
    
        // Base folder path
        const uploadDestinationBase = './fileuploads/cmec_policeAdvisorynotes';
        // Construct the file path by directly joining the base path and fileName
        const filePath = path.join(uploadDestinationBase, fileName); // Correct file path construction
    
        fs.readFile(filePath, (err, data) => {
            if (err) {
                // console.error("Error reading file:", err);
                res.status(500).send({ error: "Internal Server Error" });
            } else {
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'application/pdf');
                res.send(data);
            }
        });
    }

    
    async function cmecfileDelete(req, res) 
    {
        try {
            const { fileName } = req.query;
            // console.log("Received fileName:", fileName);
    
            if (!fileName) {
                return res.status(400).send({ error: "File name is required" });
            }
    
            const uploadDestination = './fileuploads/cmec_policeAdvisorynotes'; // Base directory
            const filePath = path.join(uploadDestination, fileName); // Construct the correct file path
    
            // Update the database to set projectcompletion to NULL
            const conn = await pool;
            const request = conn.request();
            request.input('fileName', fileName);
    
            const result = await request.query(`
                UPDATE tbl_cmec_policy_advisory_notes
                SET document_uploader = NULL
                WHERE document_uploader = @fileName
            `);
    
            if (result.rowsAffected[0] > 0) {
                // console.log(`Database updated. File ${fileName} removed from document_uploader.`);
                res.status(200).send({ message: "File deleted successfully and database updated" });
            } else {
                // console.log(`No database record found for file ${fileName}.`);
                res.status(404).send({ error: "No matching database record found" });
            }
        } catch (err) {
            // console.error("Error deleting file or updating database:", err);
            res.status(500).send({ error: "Internal Server Error" });
        }
    }

    
     async function updatecmecpolicyAdvisorydata(req,res){
    
        const data = req.body;
        
        const updatedocumentActivity = req.body.updatedocumentActivity;
        const updatepolicyAdvisory = req.body.updatepolicyAdvisory;
        const updatePublicationdate = req.body.updatePublicationdate;
        
        const cmecAdvisoryIdOrg  = req.body.cmecAdvisoryIdOrg;
         let uniqueFileName = req.body.uniqueFileName;
        const userID = req.body.userID;
       
        if (!uniqueFileName || uniqueFileName === "") {
        uniqueFileName = null;
    }
    
        const conn = await pool;
        const request = conn.request();
        request.input('updatedocumentActivity',updatedocumentActivity);
        request.input('updatepolicyAdvisory',updatepolicyAdvisory);
        request.input('updatePublicationdate',updatePublicationdate);
        request.input("userID", userID);
        request.input("cmecAdvisoryIdOrg",cmecAdvisoryIdOrg);
        request.input("uniqueFileName", uniqueFileName);
    
        
    
        try {
            const result = await request.query(`UPDATE tbl_cmec_policy_advisory_notes SET document_title = @updatedocumentActivity, policy_advisory_note = @updatepolicyAdvisory,date_of_publications = @updatePublicationdate,document_uploader = @uniqueFileName,updated_by = @userID,updated_date = getDate() WHERE policy_advisory_id = @cmecAdvisoryIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            // console.log(err);
            return res.sendStatus(500);
        }
    }
async function getCmecYearWiseReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.query(`
            SELECT
                'Policy / Advisory Notes' AS Metric,
                COUNT(*) AS Count
            FROM tbl_cmec_policy_advisory_notes

            UNION ALL

            SELECT
            'Maritime Talks' AS Metric,
            SUM(CASE WHEN maritime_talks IS NOT NULL AND maritime_talks <> '' THEN 1 ELSE 0 END) AS Count
            FROM tbl_cmec_maritime_talks_newsletters

            UNION ALL

            SELECT
                'Public Lectures' AS Metric,
                SUM(CASE WHEN public_lectures IS NOT NULL AND public_lectures <> '' THEN 1 ELSE 0 END) AS Count
            FROM tbl_cmec_maritime_talks_newsletters

            UNION ALL

            SELECT
                'Newsletters' AS Metric,
                SUM(CASE WHEN news_letters IS NOT NULL AND news_letters <> '' THEN 1 ELSE 0 END) AS Count
            FROM tbl_cmec_maritime_talks_newsletters

            UNION ALL

            SELECT
                'Publications' AS Metric,
                COUNT(*) AS Count
            FROM tbl_cmec_publications

             UNION ALL

            SELECT
                'Researchers' AS Metric,
                COUNT(*) AS Count
            FROM tbl_cmec_researchers
        `);

        const rowData = result.recordset;

        const columnDefs = [
            {
                headerName: "Metric",
                field: "Metric",
                minWidth: 300,
                cellStyle: { textAlign: "center" }
            },
            {
                headerName: "Count",
                field: "Count",
                cellStyle: { textAlign: "center" }
            }
        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

    
export default{addcmecResearchersdata,getcmecResearchList,getUpdatecmecResearchdata,updatecmecResearchesData,addcmecMaritimetalksdata,getcmecmaritimedataList,addcmecPublicationdata,getUpdatecmecMaritimedata,updatecmecMaritimeTalksData,getcPublicationsdataList,getUpdatecmecPublicationsdata,updatecmecPublicationsData,addcmecPolicyAdvisoryNotes,addNewcmecFileupload,
    upload,fileUpload,getcmecpolicyAdvisorydataList,getUpdateCmecAdvisoryData,cmecPdfFileDownload,cmecfileDelete,updatecmecpolicyAdvisorydata, getCmecYearWiseReport};