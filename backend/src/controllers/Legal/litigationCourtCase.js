import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { isWideRole } from "../../middleware/dataScope.js";


async function getLastLitigationCaseNumber(req,res){
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    try {
        const result = await request.query(`SELECT TOP 1 case_id FROM tbl_litigation_cases WHERE organisation_id = @organisationID ORDER BY id DESC`);
        //console.log("result",result.recordset)
        res.json(result.recordset);
        
    }
    catch (err) {
        // console.log("error",err)
        return res.status(500).json({message: 'Internal Server Error'})
    }
}

async function addLitigationPrevConnCases(req, res) {
    const { caseID, prevConnCaseData } = req.body;
    // connectedases
    if (!caseID ||!Array.isArray(prevConnCaseData) || prevConnCaseData.length === 0) {
        return res.status(400).json({ error: "Invalid prevConnCaseData" });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);  

    try {

        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_prev_conn_court_cases WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }
        
        for (const caseData of prevConnCaseData) {
            const request = conn.request(); 

            request.input("caseID", caseID);
            request.input("prevConnectedCourt", caseData.prevConnectedCourt); 
            request.input("prevConnectedCaseNumber", caseData.prevConnectedCaseNumber); 
            request.input("prevConnectedCNRNumber", caseData.prevConnectedCNRNumber); 
            request.input("caseStatus", caseData.caseStatus); 
            request.input("caseDetails", caseData.caseDetails); 

            await request.query(`INSERT INTO tbl_prev_conn_court_cases (case_id, prev_conn_case_court_name, prev_conn_case_no, prev_conn_cnr_no, case_status, details) 
            VALUES (@caseID, @prevConnectedCourt, @prevConnectedCaseNumber, @prevConnectedCNRNumber, @caseStatus, @caseDetails)`);
        }

        return res.status(201).json({ message: "Previous connected cases added successfully." });
    } catch (err) {
        // console.log("prev",err)
        return res.sendStatus(500);
    }
}

async function addLitigationDetailsOfCounsel(req, res) {
    const { caseID, detailsOfCounselData } = req.body;
   
    if (!caseID ||!Array.isArray(detailsOfCounselData) || detailsOfCounselData.length === 0) {
        return res.status(400).json({ error: "Invalid details of counsel" });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_court_cases_counsel_details WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
     
        const checkResult = await request.query(checkCaseId);

            if (checkResult.recordset.length != 0) {
                let deleteExistingData = `DELETE tbl_court_cases_counsel_details WHERE case_id = @caseID`;
                await request.query(deleteExistingData);
            }

        for (const detailData of detailsOfCounselData) {    
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("nameOfCounsel", detailData.nameOfCounsel); 
            request.input("counselContact", detailData.counselContact); 
            request.input("typeCounsel", detailData.typeCounsel); 
            request.input("counselDetails", detailData.counselDetails); 
            await request.query(`
                INSERT INTO tbl_court_cases_counsel_details (case_id, name_of_counsel, contact, type_of_counsel, details) 
                VALUES (@caseID, @nameOfCounsel, @counselContact, @typeCounsel, @counselDetails)
            `);
        }
        return res.status(201).json({ message: "Details of Counsel added successfully." });
    } catch (err) {
        // console.log("err",err)
        return res.status(500).json({error: "Internal server error" });
    }
}

async function addLitigationOtherCourtCaseOrg(req, res) {
    const { otherOrg } = req.body;

    if (!Array.isArray(otherOrg) || otherOrg.length === 0) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const conn = await pool;

    try {
        const existingOrgNames = [];

        //check which organisations already exist in the database
        const placeholders = otherOrg.map((_, index) => `@organisationName${index}`).join(', ');
        const selectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            selectRequest.input(`organisationName${index}`, orgName);
        });

        const result = await selectRequest.query(
            `SELECT organisation_name FROM tbl_court_case_organisations WHERE organisation_name IN (${placeholders})`
        );

        // Extract the existing organisation names from the result
        result.recordset.forEach(row => existingOrgNames.push(row.organisation_name));

        // Insert new organisations that don't already exist
        for (const orgName of otherOrg) {
            if (!existingOrgNames.includes(orgName)) {
                const request = conn.request();
                request.input("organisationName", orgName);
                await request.query(`INSERT INTO tbl_court_case_organisations (organisation_name,status) VALUES (@organisationName ,1) `);
            }
        }

        // Fetch and return the organisation IDs for all input organisations (including both new and existing ones)
        const finalSelectRequest = conn.request();
        otherOrg.forEach((orgName, index) => {
            finalSelectRequest.input(`organisationName${index}`, orgName);
        });

        const finalResult = await finalSelectRequest.query(
            `SELECT organisation_id, organisation_name FROM tbl_court_case_organisations WHERE organisation_name IN (${placeholders})`
        );

        res.json(finalResult.recordset);
    } catch (err) {
        // Log the error for debugging purposes (optional)
        // console.log(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function createLitigationCourtCase(req,res) {
    const {caseID,caseName,courtType,state,district,courtComplex,nameOfCourt,subCourt,highCourtBench,consumerForum,caseType,caseNumber,year,cnrNumber,filedOnDate,domain,subDomain,description,
        deptDivision,prevConnCaseOrNot,counterClaimAmountOrNot,
        claimAmountValue,counterClaimAmountValue,organisationID, userID, organisationName} = req.body;
        console.log(caseName,"casename")

    const conn = await pool;
    const request = conn.request();

    const divisionStr = deptDivision.join(',');

    const checkCaseId = `SELECT * FROM tbl_litigation_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {  
        const checkResult = await request.query(checkCaseId);

        if(checkResult.recordset.length!=0){
            const updateQuery=`
               UPDATE tbl_litigation_cases SET
               case_name = @caseName,
               court_type = @courtType,
               state = @state,
               district =@district,
               court_complex = @courtComplex,
               name_of_court = @nameOfCourt,
               sub_court = @subCourt,
               bench_seat = @highCourtBench,
               consumer_forum = @consumerForum,
               case_type = @caseType,
               case_number = @caseNumber,
               year = @year,
               cnr_number = @cnrNumber,
               file_on_date = @filedOnDate,
               domain = @domain,
               sub_domain = @subDomain,
               case_description = @description,
               dept_division = @deptDivision,
               pre_connected_cases =  @prevConnCaseOrNot,
               counter_claim_amount_or_not = @counterClaimAmountOrNot,
               claim_amount = @claimAmountValue,
               counter_claim_amount = @counterClaimAmountValue,
               updated_date = GETDATE(),
               updated_by = @userID
               WHERE case_id= @caseID
                `;
                await request
                .input("caseName",caseName)
                .input("courtType",courtType)
                .input("subCourt",subCourt)
                .input("state",state)
                .input("district",district)
                .input("courtComplex",courtComplex)
                .input("nameOfCourt",nameOfCourt)
                .input("highCourtBench",highCourtBench)
                .input("consumerForum",consumerForum)
                .input("caseType",caseType)
                .input("caseNumber",caseNumber)
                .input("year",year)
                .input("cnrNumber",cnrNumber)
                .input("filedOnDate",filedOnDate)
                .input("domain",domain)
                .input("subDomain",subDomain)
                .input("description",description)
                .input("deptDivision",divisionStr)
                .input("prevConnCaseOrNot",prevConnCaseOrNot)
                .input("counterClaimAmountOrNot",counterClaimAmountOrNot)
                .input("claimAmountValue",claimAmountValue)
                .input("counterClaimAmountValue",counterClaimAmountValue)
                .input("userID", userID) 
                .query(updateQuery);

                res.status(201).json({ message: "Case updated successfully" });
           
        }else{
        const litigationCaseInsertQuery = `
        INSERT INTO tbl_litigation_cases(
        case_id,case_name,court_type,state,district,court_complex,name_of_court,sub_court,bench_seat,consumer_forum,case_type,case_number,year,cnr_number,file_on_date,domain,sub_domain,case_description,dept_division,pre_connected_cases,
        counter_claim_amount_or_not,claim_amount,counter_claim_amount,created_date,created_by,organisation_id,organisation_name
        )
        OUTPUT INSERTED.case_id
        VALUES (
        @caseID,@caseName,@courtType,@state,@district,@courtComplex,@nameOfCourt,@subCourt,@highCourtBench,@consumerForum,@caseType,@caseNumber,@year,@cnrNumber,@filedOnDate,@domain,@subDomain,@description,@deptDivision,
        @prevConnCaseOrNot,@counterClaimAmountOrNot,@claimAmountValue,@counterClaimAmountValue,GETDATE(),@userID, @organisationID,@organisationName
        );
        `;
        console.log("➡️ Inserting Case:", caseName);

        const result = await request
        .input("caseName",caseName)
        .input("courtType",courtType)
        .input("state",state)
        .input("district",district)
        .input("courtComplex",courtComplex)
        .input("nameOfCourt",nameOfCourt)
        .input("subCourt",subCourt)
        .input("highCourtBench",highCourtBench)
        .input("consumerForum",consumerForum)
        .input("caseType",caseType)
        .input("caseNumber",caseNumber)
        .input("year",year)
        .input("cnrNumber",cnrNumber)
        .input("filedOnDate",filedOnDate)
        .input("domain",domain)
        .input("subDomain",subDomain)
        .input("description",description)
        .input("deptDivision",divisionStr)
        .input("prevConnCaseOrNot",prevConnCaseOrNot)
        .input("counterClaimAmountOrNot",counterClaimAmountOrNot)
        .input("claimAmountValue",claimAmountValue)
        .input("counterClaimAmountValue",counterClaimAmountValue)
        .input("userID", userID)
        .input("organisationID", organisationID)
        .input("organisationName",organisationName) 
        .query(litigationCaseInsertQuery)      

        return res.status(201).json({result});
        }
    } catch (error) { 
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }    
}


async function addMinistryDetailsOfCounsel(req, res) {
    const { caseID, detailsOfCounselMinistryData } = req.body;
 
    // Validate input
    if (!caseID || !Array.isArray(detailsOfCounselMinistryData) || detailsOfCounselMinistryData.length === 0) {
        return res.status(400).json({ error: "Invalid case ID or details of counsel" });
    }

    const conn = await pool;
    const request = conn.request();

    // Check for existing records
    const checkCaseIdQuery = `SELECT * FROM tbl_court_cases_ministry_counsel_details  WHERE case_id = @caseID;`;
    request.input("caseID", caseID);

    try {
        
        const checkResult = await request.query(checkCaseIdQuery);

        // If existing records found, delete them
        if (checkResult.recordset.length != 0) {
            const deleteExistingDataQuery = `DELETE tbl_court_cases_ministry_counsel_details  WHERE case_id = @caseID;`;
            await request.query(deleteExistingDataQuery);
        }

        // Insert new details
        for (const detailsData of detailsOfCounselMinistryData) {
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("nameOfCounselMinistry", detailsData.nameOfCounselMinistry);
            request.input("designationMinistry", detailsData.designationMinistry);
            request.input("ministryContact", detailsData.ministryContact);
            await request.query(`
                INSERT INTO tbl_court_cases_ministry_counsel_details  (case_id, name_of_counsel, designation, contact) 
                VALUES (@caseID, @nameOfCounselMinistry, @designationMinistry, @ministryContact);
            `);
        }

        return res.status(201).json({ message: "Details of Counsel added successfully." });
    } catch (err) {
        // console.log("error",err)
        return res.status(500).json({ error: "Internal server error" });
    }
}
//Generate Uunique File Name

function generateUniquelitigationFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}


const uploadDestination = './fileuploads/filed_document';
if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => { 
        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniquelitigationFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

//ministryUploadDocument
async function ministryUploadDocument(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const caseID = req.body.caseID;
        const pathFolder = req.body.path; 

        request.input("caseID", caseID);
        
        //check path is Litigation
        if(pathFolder === 'Litigation'){
            const fullPath = path.join(uploadDestination, pathFolder); 

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
            const existingDocResult = await request.query(`
                SELECT filed_document FROM tbl_litigation_cases 
                WHERE case_id = @caseID
            `);
            const existingFileName = existingDocResult.recordset[0]?.filed_document;
            if (existingFileName) {
                const existingFilePath = path.join(fullPath, existingFileName);
                if (fs.existsSync(existingFilePath)) {
                    try {
                        fs.unlinkSync(existingFilePath);
                    } catch (err) {
                        console.error("Error deleting file:", err); 
                    }
                }
            }

            const newFileName = req.uniqueFileName;
            const filePath = path.join(fullPath, newFileName);

            request.input("newFileName", newFileName);

            if (req.file && req.file.path) {
                fs.renameSync(req.file.path, filePath); 
            } else {
                console.error("No file found in req.file or req.file.path");
            } 

            await request.query(`
                UPDATE tbl_litigation_cases 
                SET filed_document = @newFileName
                WHERE case_id = @caseID
            `);

            res.status(201).json({ message: "Document uploaded successfully" });
        } else {
            return res.status(400).json({ error: "Invalid path. Document upload is only allowed for 'Arbitration'." });    
        }

    } catch (error) {
        return res.status(500).json({error: "Internal server error" });
    }    
}

async function getMinistryUploadDocument(req,res) {
    const caseID = req.params.caseID;
    try {
        // console.log("caseID",caseID)
        const conn = await pool;
        const request = conn.request();
        request.input("caseID", caseID);

        let result = await request.query(`SELECT case_id,filed_document,file_of_affidavit, filed_intervention_document FROM tbl_litigation_cases WHERE case_id = @caseID ;`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "No data available" });
        }
        return res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({error: "Internal server error" });
    }    
}

async function deleteMinistryInterventionDocument(req, res) {
    const caseID = req.params.caseID;
    const replyFiledDoc = req.params.replyFiledDoc;
    
    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    request.input("replyFiledDoc", replyFiledDoc);

    try {
        const checkResult = await request.query(`SELECT case_id,filed_document FROM tbl_litigation_cases WHERE case_id = @caseID`);
        
        if (checkResult.recordset.length > 0) {
            await request.query(`UPDATE tbl_litigation_cases SET filed_document = NULL WHERE case_id = @caseID AND filed_document = @replyFiledDoc`);
            const fileDeleted = deleteFile(replyFiledDoc);
            if (fileDeleted) {
                return res.status(200).json({ message: "Document and file deleted successfully." });
            } else {
                return res.status(500).json({ error: "File deletion failed" });
            }
        } else {
            const fileDeleted = deleteFile(replyFiledDoc);
            if (fileDeleted) {
                return res.status(200).json({ message: "File deleted successfully" });
            } else {
                return res.status(404).json({ error: "File not found " });
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Internal server error" });
    }
}


function deleteFile(fileName) {
    try{
        if (fileName) {
            const filePath = `./fileuploads/filed_document/Litigation/${fileName}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                return true; 
            }else {
                return false;
            }
        }     
    }catch(err){
        console.error("Error deleting file:", error);
        return false;
    }
}

async function deleteMinistryInterventionDoc(req, res) {
    const caseID = req.params.caseID;
    const intrevenDoc = req.params.intrevenDoc;
    
    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    request.input("intrevenDoc", intrevenDoc);

    try {
        const checkResult = await request.query(`SELECT case_id,filed_intervention_document FROM tbl_litigation_cases WHERE case_id = @caseID`);
        
        if (checkResult.recordset.length > 0) {
            await request.query(`UPDATE tbl_litigation_cases SET filed_intervention_document = NULL WHERE case_id = @caseID AND filed_intervention_document = @intrevenDoc`);
            const fileDeleted = deleteInterventionDocFile(intrevenDoc);
            if (fileDeleted) {
                return res.status(200).json({ message: "Document and file deleted successfully." });
            } else {
                return res.status(500).json({ error: "File deletion failed" });
            }
        } else {
            const fileDeleted = deleteInterventionDocFile(intrevenDoc);
            if (fileDeleted) {
                return res.status(200).json({ message: "File deleted successfully" });
            } else {
                return res.status(404).json({ error: "File not found " });
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Internal server error" });
    }
}

function deleteInterventionDocFile(fileName) {
    try{
        if (fileName) {
            const filePath = `./fileuploads/filed_intervention_document/Litigation/${fileName}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                return true; 
            }else {
                return false;
            }
        }     
    }catch(error){
        console.error("Error deleting file:", error);
        return false;
    }
}


async function deletecounterAffiDocument(req, res) {
    const caseID = req.params.caseID;
    const affidavitFile = req.params.affidavitFile;
    
    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    request.input("affidavitFile", affidavitFile);

    try {
        const checkResult = await request.query(`SELECT case_id,file_of_affidavit FROM tbl_litigation_cases WHERE case_id = @caseID`);
        
        if (checkResult.recordset.length > 0) {
            await request.query(`UPDATE tbl_litigation_cases SET file_of_affidavit = NULL WHERE case_id = @caseID AND file_of_affidavit = @affidavitFile`);
            const fileDeleted = deletecounterAffiFile(affidavitFile);
            if (fileDeleted) {
                return res.status(200).json({ message: "Document and file deleted successfully." });
            } else {
                return res.status(500).json({ error: "File deletion failed" });
            }
        } else {
            const fileDeleted = deletecounterAffiFile(affidavitFile);
            if (fileDeleted) {
                return res.status(200).json({ message: "File deleted successfully" });
            } else {
                return res.status(404).json({ error: "File not found " });
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Internal server error" });
    }
}

function deletecounterAffiFile(fileName) {
    try{
        if (fileName) {
            const filePath = `./fileuploads/file_of_affidavit/Litigation/${fileName}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
                return true; 
            }else {
                return false;
            }
        }     
    }catch(error){
        console.error("Error deleting file:", error);
        return false;
    }
}

async function addCourtCaseOMDetails(req,res){

    const { caseID, courtCaseOMDetailsData } = req.body;

    if (!Array.isArray(courtCaseOMDetailsData) || courtCaseOMDetailsData.length === 0) {
        return res.status(400).json({ error: "Invalid details of court OM case " });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_court_case_om WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        
        const checkResult = await request.query(checkCaseId);

            if (checkResult.recordset.length > 0) {
                let deleteExistingData = `DELETE tbl_court_case_om WHERE case_id = @caseID`;
                await request.query(deleteExistingData);
            }

        for (const detailsData of courtCaseOMDetailsData) {
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("ministryDept", detailsData.ministryDept); 
            request.input("OMNumber", detailsData.OMNumber); 
            request.input("omDate", detailsData.omDate); 
           
            await request.query(`
            INSERT INTO tbl_court_case_om (case_id, ministry,om_number,om_date) 
                VALUES (@caseID, @ministryDept, @OMNumber, @omDate)`);
        }
        
        return res.status(201).json({ message: "court Case OM Details Data  added successfully" });
    } catch (err) {
        // console.log("err",err)
        return res.status(500).json({error: "Internal server error" });
    }


}

//file upload ministry
const fileUploadDestination = './fileuploads/filed_intervention_document';

if (!fs.existsSync(fileUploadDestination)) {
    fs.mkdirSync(fileUploadDestination, { recursive: true });
}

let fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, fileUploadDestination );
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniquelitigationFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const fileUpload= multer({
    storage: fileStorage,
    limits: { fileSize: 10000000}
});

async function ministryInterventionDocument(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const caseID = req.body.caseID;
        const pathFolder = req.body.path; 

        request.input("caseID", caseID);

        //check if the path is 'Litigation
        if (pathFolder === 'Litigation') {

            const fullPath = path.join(fileUploadDestination, pathFolder); 
        
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
            const existingDocResult = await request.query(`
                SELECT filed_intervention_document FROM tbl_litigation_cases 
                WHERE case_id = @caseID
            `);
            const existingFileName = existingDocResult.recordset[0]?.filed_intervention_document;
            
            if (existingFileName) {
                const existingFilePath = path.join(fullPath, existingFileName);
                if(existingFilePath)
                if (fs.existsSync(existingFilePath)) {
                    try {
                        fs.unlinkSync(existingFilePath);
                    } catch (err) {
                        return res.status(400).json({ error: "Error deleting file:" });
                    }
                }
            }

            const newFileName = req.uniqueFileName; 
            const filePath = path.join(fullPath, newFileName);

            request.input("newFileName", newFileName);
         
            if (req.file && req.file.path) {
                fs.renameSync(req.file.path, filePath); 
            } else {
                return res.status(400).json({ error: "No file uploaded." });
            }

            await request.query(`
                UPDATE tbl_litigation_cases 
                SET filed_intervention_document = @newFileName 
                WHERE case_id = @caseID
                `);
                res.status(201).json({ message: "Document uploaded successfully" });
        } else {
            return res.status(400).json({ error: "Invalid path. Document upload is only allowed for 'Litigation'." });
        } 
    } catch (error) {
        // console.log("error",error)
        res.status(500).json({ error: "Internal server error" });
    }
}

async function createMinistryIntervention(req, res) {
    const { caseID, isMinistryOrNot, typeOfParty, roleOfMinistry, isBehalfMinistryOrNot, 
            isMinistryChallengedOrNot, ministryChallenged, ministryInvoked, ministryDetails, 
            ministryInvokedDetails, act,otherAct, rule, ministryInterventionOrNot, natureOfAction, 
            description, interventionofRequestDate, typeofClarification, typeOfApproval, otherInv, 
            IsNatureOfExecutionOrNot, IsNatureOfExecution, otherNatureExecution, userID } = req.body;

    const conn = await pool;
    const request = conn.request();

    const checkCaseId = `SELECT * FROM tbl_litigation_cases WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try { 
        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length !== 0) {
            // Case exists, so prepare for updating
            const updateQuery = `
                UPDATE tbl_litigation_cases 
                SET
                    is_ministry_party = @isMinistryOrNot,
                    type_of_party = @typeOfParty,
                    role_of_ministry = @roleOfMinistry,
                    is_behalf_of_ministry = @isBehalfMinistryOrNot,
                    is_ministry_challenged = @isMinistryChallengedOrNot,
                    document_challenged = @ministryChallenged,
                    document_invoked = @ministryInvoked,
                    details = @ministryDetails,
                    invoked_details = @ministryInvokedDetails,
                    acts = @act,
                    other_act = @otherAct,
                    rules = @rule,
                    is_ministry_intervention_required = @ministryInterventionOrNot,
                    nature_of_action_required = @natureOfAction,
                    intervention_description = @description,
                    type_of_clarification = @typeofClarification,
                    type_of_approval = @typeOfApproval,
                    other_lnv = @otherInv,
                    date_of_intervention_required = @interventionofRequestDate,
                    is_execution_required = @IsNatureOfExecutionOrNot,
                    nature_of_execution = @IsNatureOfExecution,
                    other_nature_execution = @otherNatureExecution,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE case_id = @caseID
            `;


            // Set input values for the update query
            
                request.input("isMinistryOrNot", isMinistryOrNot)
                request.input("typeOfParty", typeOfParty)
                request.input("roleOfMinistry", roleOfMinistry)
                request.input("isBehalfMinistryOrNot", isBehalfMinistryOrNot)
                request.input("isMinistryChallengedOrNot", isMinistryChallengedOrNot)
                request.input("ministryChallenged", ministryChallenged)
                request.input("ministryInvoked", ministryInvoked)
                request.input("ministryDetails", ministryDetails)
                request.input("ministryInvokedDetails", ministryInvokedDetails)
                request.input("act", act)
                request.input("otherAct",otherAct)
                request.input("rule", rule)
                request.input("ministryInterventionOrNot", ministryInterventionOrNot)
                request.input("natureOfAction", natureOfAction)
                request.input("description", description)
                request.input("interventionofRequestDate", interventionofRequestDate)
                request.input("typeofClarification", typeofClarification)
                request.input("typeOfApproval", typeOfApproval)
                request.input("otherInv", otherInv)
                request.input("IsNatureOfExecutionOrNot", IsNatureOfExecutionOrNot)
                request.input("IsNatureOfExecution", IsNatureOfExecution)
                request.input("otherNatureExecution", otherNatureExecution)
                request.input("userID", userID)
                // await request.query(updateQuery);

            // Execute the update query
            const result = await request.query(updateQuery);

            // Return a response with the result
            res.status(201).json({ result });
        } else {
            res.status(404).json({ error: "Case not found" });
        }

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

//addCourtCaseHearingDetails
async function addCourtCaseHearingDetails(req,res) {
    const { caseID, detailsOfCourtCaseHearingData } = req.body;
   
    if (!Array.isArray(detailsOfCourtCaseHearingData) || detailsOfCourtCaseHearingData.length === 0) {
        return res.status(400).json({ error: "Invalid details of court case hearing data " });
    }

    const conn = await pool;
    const request = conn.request();

    const checkCaseIdQuery = `SELECT * FROM tbl_court_case_hearing WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseIdQuery);

        // If existing records found, delete them
        if (checkResult.recordset.length > 0) {
            const deleteExistingDataQuery = `
                DELETE FROM tbl_court_case_hearing WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const detailsData of detailsOfCourtCaseHearingData) {
            const request = conn.request();  
        
            request.input("caseID", caseID);
            request.input("hearingDate", detailsData.hearingDate); 
            request.input("detailsOfHearing", detailsData.detailsOfHearing); 
            request.input("nextHearingDate", detailsData.nextHearingDate);
            request.input("outcomeOfHearing", detailsData.outcomeOfHearing); 
            await request.query(`
             INSERT INTO tbl_court_case_hearing (case_id, date_of_hearing,details_of_hearing,next_date_of_hearing,outcome_of_hearing) 
                VALUES (@caseID, @hearingDate, @detailsOfHearing, ${detailsData.nextHearingDate ? '@nextHearingDate' : 'NULL'} ,@outcomeOfHearing)
            `);
        }

        return res.status(201).json({ message: "Details of court case hearing added successfully." });
    } catch (err) {
        return res.status(500).json({error: "Internal server error" });
    }
    
}
//addCourtCaseInterimDetails
async function addCourtCaseInterimDetails(req,res) {
    const { caseID, detailsOfCourtCaseInterimData } = req.body;

    if (!Array.isArray(detailsOfCourtCaseInterimData) || detailsOfCourtCaseInterimData.length === 0) {
        return res.status(400).json({ error: "Invalid details of court case Interim data " });
    }

    const conn = await pool;
    const request = conn.request();

    // Check for existing records
    const checkCaseIdQuery = `SELECT * FROM tbl_court_case_interim_order WHERE case_id = @caseID;`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseIdQuery);

        // If existing records found, delete them
        if (checkResult.recordset.length > 0) {
            const deleteExistingDataQuery = `DELETE FROM tbl_court_case_interim_order WHERE case_id = @caseID`;
            await request.query(deleteExistingDataQuery);
        }

        for (const detailsData of detailsOfCourtCaseInterimData) {
            const complianceBit =
                detailsData.complianceReq === true ||
                detailsData.complianceReq === 1 ||
                detailsData.complianceReq === "1" ||
                (typeof detailsData.complianceReq === "string" &&
                ["yes", "true"].includes(detailsData.complianceReq.toLowerCase()))
                    ? 1
                    : 0;
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("natureInterimOrder", detailsData.natureInterimOrder); 
            request.input("dateOfInterimOrder", detailsData.dateOfInterimOrder); 
            request.input("detailsOfInterimOrder", detailsData.detailsOfInterimOrder);
            request.input("complianceReq", complianceBit);
            request.input("lastDateOfDoingAction", detailsData.lastDateOfDoingAction); 
           
            await request.query(`
                INSERT INTO tbl_court_case_interim_order (case_id, nature_of_interim_order,date_of_interim_order,details_of_interim_order,is_action_req_complaince,last_date_for_complaince) 
                VALUES (@caseID, @natureInterimOrder, @dateOfInterimOrder, @detailsOfInterimOrder,@complianceReq, ${detailsData.lastDateOfDoingAction ? '@lastDateOfDoingAction' : 'NULL'})
            `);
        }

        return res.status(201).json({ message: "Details of court case Interim added successfully." });
    } catch (err) {
        console.log("err",err);
        return res.status(500).json({error: "Internal server error" });
    }
}

//Counter Affidavit Filed
const filedestination = './fileuploads/file_of_affidavit';

if (!fs.existsSync(filedestination)) {
    fs.mkdirSync(filedestination, { recursive: true });
}

let filestorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/file_of_affidavit" );
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniquelitigationFileName(file.originalname);
        req.uniqueFileName = uniqueFileName; 
        callback(null, uniqueFileName); 
    },
});

const fileupload= multer({
    storage: filestorage,
    limits: { fileSize: 10000000}
});

async function counterAffidavitDocument(req, res) {
    try {
        const caseID = req.body.caseID;
        const pathFolder = req.body.path;

        if (!caseID) return res.status(400).json({ error: "Invalid case ID" });
        if (pathFolder !== "Litigation")
            return res.status(400).json({ error: "Invalid path. Document upload is only allowed for 'Litigation'." });
        if (!req.file || !req.file.path)
            return res.status(400).json({ error: "No file uploaded." });   // checked BEFORE touching the old file

        const fullPath = path.join(filedestination, pathFolder);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });

        const conn = await pool;
        const existing = await conn.request()
            .input("caseID", caseID)
            .query(`SELECT file_of_affidavit FROM tbl_litigation_cases WHERE case_id = @caseID`);
        const oldFileName = existing.recordset[0]?.file_of_affidavit;

        const newFileName = req.uniqueFileName;
        fs.renameSync(req.file.path, path.join(fullPath, newFileName));

        await conn.request()
            .input("caseID", caseID)
            .input("newFileName", newFileName)
            .query(`UPDATE tbl_litigation_cases SET file_of_affidavit = @newFileName WHERE case_id = @caseID`);

        // remove the old file only after the new one is saved
        if (oldFileName && oldFileName !== newFileName) {
            const oldPath = path.join(fullPath, oldFileName);
            try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); }
            catch (err) { console.error("Error deleting old file:", err); }
        }

        return res.status(201).json({ message: "Document uploaded successfully" });
    } catch (error) {
        console.error("counterAffidavitDocument error:", error);   // your catch hid the real error
        return res.status(500).json({ error: "Internal server error" });
    }
}

//submit Case Status
async function submitCaseStatus(req,res) {
    
    const {caseID,isCounterFiledOrNot,isHearingStartedOrNot,isInterimOrderOrNot,isfinalJudgementOrNot,finalJudgementDate,natureOfJudgement,amountAnyAwarded, 
        amountAnyAwardedClaimAmount,amountAnyAwardedCounterClaimAmount,briefJudgement,isActionReqComOrNot,lastDateForComplaince,whetJudgeAccept,iswhetJudgeAcceptOrNot,dateOfComplaince,
        detailsOfComplaince,reasonForNonComplaince,appealRevCaseNumber,appealRevCourtName,appealRevCNRNumber,appealRevFillingDate,
        userID ,stageID,stage} = req.body;

        const conn = await pool;
        const request = conn.request();
   
        let checkCaseId = `SELECT * FROM tbl_litigation_cases WHERE case_id = @caseID`;
        request.input("caseID",caseID);

    try {

        const checkResult = await request.query(checkCaseId);

        if(checkResult.recordset.length!=0){
            const updateQuery =`
            UPDATE tbl_litigation_cases 
            SET
            is_counter_affidavit_filed = @isCounterFiledOrNot,
            is_hearing_started = @isHearingStartedOrNot,
            is_interim_order = @isInterimOrderOrNot,
            is_final_order_or_judgement_passed = @isfinalJudgementOrNot,
            date_of_final_order = @finalJudgementDate,
            nature_of_judgement = @natureOfJudgement,
            amounts_of_any_rewarded = @amountAnyAwarded,
            amounts_if_any_rewarded_claim_amount = @amountAnyAwardedClaimAmount,
            amounts_if_any_rewarded_counter_claim_amount = @amountAnyAwardedCounterClaimAmount,
            brief_of_judgement = @briefJudgement,
            is_action_required_for_complaince = @isActionReqComOrNot,
            last_date_for_complaince = @lastDateForComplaince,
            judgement_accepted = @whetJudgeAccept,
            is_order_complied = @iswhetJudgeAcceptOrNot,
            date_of_complied = @dateOfComplaince,
            details_of_complaince = @detailsOfComplaince,
            reason_for_non_complaince = @reasonForNonComplaince,
            appeal_rev_case_number = @appealRevCaseNumber,
            appeal_rev_court_name = @appealRevCourtName,
            appeal_rev_cnr_number = @appealRevCNRNumber,
            appeal_rev_filling_date = @appealRevFillingDate,
            stage_id = @stageID,
            stage = @stage,
            updated_date = GETDATE(),
            updated_by = @userID
            WHERE case_id= @caseID
            `;
            await request

            .input("isCounterFiledOrNot",isCounterFiledOrNot)
            .input("isHearingStartedOrNot",isHearingStartedOrNot)
            .input("isInterimOrderOrNot",isInterimOrderOrNot)
            .input("isfinalJudgementOrNot",isfinalJudgementOrNot)
            .input("finalJudgementDate",finalJudgementDate)
            .input("natureOfJudgement",natureOfJudgement)
            .input("amountAnyAwarded",amountAnyAwarded)
            .input("amountAnyAwardedClaimAmount",amountAnyAwardedClaimAmount)
            .input("amountAnyAwardedCounterClaimAmount",amountAnyAwardedCounterClaimAmount)
            .input("briefJudgement",briefJudgement)
            .input("isActionReqComOrNot",isActionReqComOrNot)
            .input("lastDateForComplaince",lastDateForComplaince)
            .input("whetJudgeAccept",whetJudgeAccept)
            .input("iswhetJudgeAcceptOrNot",iswhetJudgeAcceptOrNot)
            .input("dateOfComplaince",dateOfComplaince)
            .input("detailsOfComplaince",detailsOfComplaince)
            .input("reasonForNonComplaince",reasonForNonComplaince)
            .input("appealRevCaseNumber",appealRevCaseNumber)
            .input("appealRevCNRNumber",appealRevCNRNumber)
            .input("appealRevCourtName",appealRevCourtName)
            .input("appealRevFillingDate",appealRevFillingDate)
            .input("stageID", stageID)
            .input("stage",stage)
            .input("userID", userID)
            .query(updateQuery);

            const result = await request.query(updateQuery);  
            res.status(201).json(result); 
        }
     } catch (error) {   
        console.error("Error ", error);
        res.status(500).json({ error: "Internal server error" });
    }       
}

async function addProfessionalFeeDetails(req,res) {
    const { caseID, detailsOfProfessionalData } = req.body;

    if (!Array.isArray(detailsOfProfessionalData) || detailsOfProfessionalData.length === 0) {
        return res.status(400).json({ error: "Invalid details of ProfessionalData " });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_litigation_court_case_fee_expenses WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {

        const checkResult = await request.query(checkCaseId);

        if (checkResult.recordset.length != 0) {
            let deleteExistingData = `DELETE tbl_litigation_court_case_fee_expenses WHERE case_id = @caseID`;
            await request.query(deleteExistingData);
        }

        for (const detailsData of detailsOfProfessionalData) {
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("name", detailsData.name); 
            request.input("nature", detailsData.nature); 
            request.input("amount", detailsData.amount);
            request.input("date", detailsData.date); 
          
            await request.query(`
                INSERT INTO tbl_litigation_court_case_fee_expenses (case_id, name_of_advocate,nature_of_claim,prof_fee_amount,date_of_payment) 
                VALUES (@caseID, @name, @nature, @amount,  ${detailsData.date ? '@date' : 'NULL'})
            `);
        }

        return res.status(201).json({ message: "Details of ProfessionalData added successfully." });
    } catch (err) {
        // console.log("prof error",err)
        return res.status(500).json({error: "failed to add details of professional data" });
    }
    
}

async function addOtherExpensesDetails(req,res) {
    const { caseID, detailsOfOtherExpensesData } = req.body;

    if ( !Array.isArray(detailsOfOtherExpensesData) || detailsOfOtherExpensesData.length === 0) {
        return res.status(400).json({ error: "Invalid details of detailsOfOtherExpensesData " });
    }

    const conn = await pool;
    const request = conn.request(); 

    const checkCaseId = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
    request.input("caseID", caseID);

    try {
        const checkResult = await request.query(checkCaseId);

            if (checkResult.recordset.length != 0) {
                let deleteExistingData = `DELETE tbl_court_case_other_expense WHERE case_id = @caseID`;
                await request.query(deleteExistingData);
            }

        for (const detailsData of detailsOfOtherExpensesData) {
            const request = conn.request();    
            
            request.input("caseID", caseID);
            request.input("paymentMadeTo", detailsData.paymentMadeTo); 
            request.input("natureOfExpense", detailsData.natureOfExpense); 
            request.input("totalExpenses", detailsData.totalExpenses);
            request.input("otherExpDateOfPay", detailsData.otherExpDateOfPay); 
          
            await request.query(`
                INSERT INTO tbl_court_case_other_expense (case_id, payment_made_to,nature_of_expense,other_expense_amount,date_of_payment) 
                VALUES (@caseID, @paymentMadeTo, @natureOfExpense, @totalExpenses, ${detailsData.otherExpDateOfPay ? '@otherExpDateOfPay' : 'NULL'})
            `);
        }

        return res.status(201).json({ message: "Details of otherExpenses Data added successfully." });
    } catch (err) {
        // console.log("other prof error",err)
        return res.status(500).json({error: "failed to add details of otherExpenses Data" });
    }
    
}


async function submitLitigationExpenditure(req,res) {

    const {caseID,userID } =req.body;

    const conn = await pool;
    const request = conn.request();

    try {
        let checkQuery = `SELECT * FROM tbl_litigation_cases WHERE case_id = @caseID`;
        request.input("caseID", caseID);

        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length != 0){
            try{
                const updateQuery = `
                UPDATE tbl_litigation_cases
                SET updated_by = @userID,
                updated_date = GETDATE()
                WHERE case_id = @caseID
                `;

                await conn.request()
                .input("userID", userID)
                .input("caseID", caseID)
                .query(updateQuery);
            } catch (error) {
                return res.status(500).json({error: "Failed updating data"})
            }
        }
         res.status(201).json({ message: "updated litigation expenditure successfully." });
        } catch (error) {
            //console.log("error",error)
            res.status(500).json({ error: "failed to create litigation expenditure" });
        }
    }

    
async function getSubTableCourtCasesData(req,res){
    let typeName = req.params.typeName;
    const caseID = req.params.caseID;

    if (!typeName || !caseID || typeName == null || caseID == null) {
        return res.status(400).json({ error: "Invalid type name or case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("typeName", typeName);
    request.input("caseID", caseID);

    let caseQuery;
    try {
       if(typeName == 'PCC'){
            caseQuery = `SELECT * FROM tbl_prev_conn_court_cases WHERE case_id = @caseID`;
        }else if(typeName == 'Interim'){
            caseQuery = `SELECT * FROM tbl_court_case_interim_order WHERE case_id = @caseID`;
        }else if(typeName == 'Hearing'){
            caseQuery = `SELECT * FROM tbl_court_case_hearing WHERE case_id = @caseID`;
        }else if(typeName == 'profExp'){
            caseQuery = `SELECT * FROM tbl_litigation_court_case_fee_expenses WHERE case_id = @caseID`;
        }else if(typeName == 'otherExp'){
            caseQuery = `SELECT * FROM tbl_court_case_other_expense WHERE case_id = @caseID`;
        }else if(typeName == 'DOC'){
            caseQuery = `SELECT * FROM tbl_court_cases_counsel_details WHERE case_id = @caseID`;
        }else if(typeName == 'MDOC'){
            caseQuery = `SELECT * FROM tbl_court_cases_ministry_counsel_details  WHERE case_id = @caseID`;
        }else if(typeName == 'OMS'){
            caseQuery = `SELECT * FROM tbl_court_case_om WHERE case_id = @caseID`
        }

        const result = await request.query(caseQuery);
        res.json(result.recordset);
    }
    catch (err) {
        // console.error("Error ", err);
        res.status(500).json({ error: "failed to fetch sub table data" });
    }
}


// --------------------------------------------------------- Report --------------------------------------------------------


async function getLitigationDomainReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);

    const userResult = await request.query(`
      SELECT role_id, organisation_id
      FROM tbl_user
      WHERE user_id = @userID
    `);

    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { role_id, organisation_id } = userResult.recordset[0];

    const wide = await isWideRole(role_id);

    let visiblePorts = MAJOR_PORTS;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);

      const orgRow = await request.query(`
        SELECT organisation_name
        FROM mmt_organisation
        WHERE organisation_id = @organisation_id
      `);

      const myName = orgRow.recordset[0]?.organisation_name;

      visiblePorts = MAJOR_PORTS.filter(
        (o) => o.name === myName
      );

      if (!visiblePorts.length) {
        return res.status(403).json({
          error: 'This report is not available for your organisation.'
        });
      }

      orgFilter = `
        AND tbl_litigation_cases.organisation_id = @organisation_id
      `;
    }

    // 3. Generate organisation-wise count columns
    const countCols = MAJOR_PORTS.map(
      (o) => `
        SUM(
          CASE
            WHEN tbl_litigation_cases.organisation_name = '${o.name}'
            THEN 1 ELSE 0
          END
        ) AS [${o.key}]
      `
    ).join(',\n');

    const nameList = MAJOR_PORTS
      .map((o) => `'${o.name}'`)
      .join(', ');

    // 4. Fetch domain-wise active litigation cases
    const result = await request.query(`
      SELECT
        mmt_domain.domain_id AS [Domain ID],
        mmt_domain.domain_name AS [Domain Name],

        ${countCols},

        SUM(
          CASE
            WHEN tbl_litigation_cases.organisation_name IN (${nameList})
            THEN 1 ELSE 0
          END
        ) AS [Total]

      FROM mmt_domain

      LEFT JOIN tbl_litigation_cases
        ON mmt_domain.domain_id = tbl_litigation_cases.domain
        AND (
          tbl_litigation_cases.stage_id IS NULL
          OR tbl_litigation_cases.stage_id <> 7
        )
        ${orgFilter}

      GROUP BY
        mmt_domain.domain_id,
        mmt_domain.domain_name

      UNION ALL

      SELECT
        NULL AS [Domain ID],
        'NULL' AS [Domain Name],

        ${countCols},

        SUM(
          CASE
            WHEN tbl_litigation_cases.organisation_name IN (${nameList})
            THEN 1 ELSE 0
          END
        ) AS [Total]

      FROM tbl_litigation_cases

      WHERE tbl_litigation_cases.domain IS NULL
        AND (
          tbl_litigation_cases.stage_id IS NULL
          OR tbl_litigation_cases.stage_id <> 7
        )
        ${orgFilter}

      GROUP BY
        tbl_litigation_cases.domain;
    `);

    const rowData = result.recordset;

    if (!rowData.length) {
      return res.status(404).json({
        error: 'No data available for this.'
      });
    }

    // 5. Generate columns based on user permissions
    const columnDefs = [
      {
        headerName: 'Domain ID',
        field: 'Domain ID',
        width: 100,
        hide: true
      },
      {
        headerName: 'Domain Name',
        field: 'Domain Name',
        width: 350
      },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        cellStyle: { textAlign: 'center' },
        children: [
          ...visiblePorts.map((o) => ({
            headerName: o.name,
            field: o.key
          })),
          {
            headerName: 'Total',
            field: 'Total'
          }
        ]
      }
    ];

    return res.json({
      columnDefs,
      rowData
    });

  } catch (err) {
    console.error('getLitigationDomainReport error:', err);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

async function getLitigationSubDomainReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all ports; a port user sees only their own port
    const wide = await isWideRole(role_id);
    let visiblePorts = MAJOR_PORTS;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);
      const orgRow = await request.query(
        `SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisation_id`
      );
      const myName = orgRow.recordset[0]?.organisation_name;
      visiblePorts = MAJOR_PORTS.filter((o) => o.name === myName);

      // a non-port organisation (or unknown org) has no data in this report
      if (!visiblePorts.length) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgFilter = 'AND tbl_litigation_cases.organisation_id = @organisation_id';
    }

    // 3. build the SQL (names come from the constant list above, not from the user)
    const countCols = MAJOR_PORTS.map(
      (o) => `SUM(CASE WHEN tbl_litigation_cases.organisation_name = '${o.name}' THEN 1 ELSE 0 END) AS [${o.key}]`
    ).join(',\n');
    const nameList = MAJOR_PORTS.map((o) => `'${o.name}'`).join(', ');

    const result = await request.query(`
      SELECT
        mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
        mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM mmt_sub_domain
      LEFT JOIN tbl_litigation_cases
        ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      GROUP BY mmt_sub_domain.sub_domain_id, mmt_sub_domain.sub_domain_name

      UNION ALL

      SELECT
        NULL AS [Sub Domain ID],
        'NULL' AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM tbl_litigation_cases
      WHERE tbl_litigation_cases.sub_domain IS NULL
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      GROUP BY tbl_litigation_cases.sub_domain;
    `);

    const rowData = result.recordset;
    if (rowData.length === 0) {
      return res.status(404).json({ error: 'No data available for this.' });
    }

    // 4. columns: admin gets all 13 ports, a port user gets only theirs
    const columnDefs = [
      { headerName: 'Sub Domain ID', field: 'Sub Domain ID', width: 100, hide: true },
      { headerName: 'Sub Domain Name', field: 'Sub Domain Name', width: 350 },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        cellStyle: { textAlign: 'center' },
        children: [
          ...visiblePorts.map((o) => ({ headerName: o.name, field: o.key })),
          { headerName: 'Total', field: 'Total' },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const MAJOR_PORTS = [
  { key: 'ChPA',     name: 'Chennai Port Authority' },
  { key: 'CoPA',     name: 'Cochin Port Authority' },
  { key: 'DPA',      name: 'Deendayal Port Authority' },
  { key: 'JNPA',     name: 'Jawaharlal Nehru Port Authority' },
  { key: 'KPL',      name: 'Kamarajar Port Limited' },
  { key: 'MgPA',     name: 'Mormugao Port Authority' },
  { key: 'MbPA',     name: 'Mumbai Port Authority' },
  { key: 'NMPA',     name: 'New Mangalore Port Authority' },
  { key: 'PPA',      name: 'Paradip Port Authority' },
  { key: 'SMPA-KDS', name: 'SMPA - Kolkata Dock System' },
  { key: 'SMPA-HDC', name: 'SMPA - Haldia Dock Complex' },
  { key: 'VoCPA',    name: 'V.O. Chidambaranar Port Authority' },
  { key: 'VPA',      name: 'Visakhapatnam Port Authority' },
];

async function getLitigationDomainAndSubDomainReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all ports; a port user sees only their own port
    const wide = await isWideRole(role_id);
    let visiblePorts = MAJOR_PORTS;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);
      const orgRow = await request.query(
        `SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisation_id`
      );
      const myName = orgRow.recordset[0]?.organisation_name;
      visiblePorts = MAJOR_PORTS.filter((o) => o.name === myName);

      // a non-port organisation (or unknown org) has no data in this report
      if (!visiblePorts.length) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgFilter = 'AND tbl_litigation_cases.organisation_id = @organisation_id';
    }

    // 3. build the SQL (names come from the constant list above, not from the user)
    const countCols = MAJOR_PORTS.map(
      (o) => `SUM(CASE WHEN tbl_litigation_cases.organisation_name = '${o.name}' THEN 1 ELSE 0 END) AS [${o.key}]`
    ).join(',\n');
    const nameList = MAJOR_PORTS.map((o) => `'${o.name}'`).join(', ');

    const result = await request.query(`
      SELECT
        mmt_domain.domain_id AS [Domain ID],
        mmt_domain.domain_name AS [Domain Name],
        mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
        mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM mmt_sub_domain
      LEFT JOIN tbl_litigation_cases
        ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      LEFT JOIN mmt_domain ON mmt_sub_domain.domain_id = mmt_domain.domain_id
      GROUP BY mmt_domain.domain_id, mmt_domain.domain_name,
               mmt_sub_domain.sub_domain_id, mmt_sub_domain.sub_domain_name

      UNION ALL

      SELECT
        NULL AS [Domain ID],
        'NULL' AS [Domain Name],
        NULL AS [Sub Domain ID],
        'NULL' AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM tbl_litigation_cases
      WHERE tbl_litigation_cases.sub_domain IS NULL
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      GROUP BY tbl_litigation_cases.sub_domain;
    `);

    const rowData = result.recordset;
    if (rowData.length === 0) {
      return res.status(404).json({ error: 'No data available for this.' });
    }

    // 4. columns: admin gets all 13 ports, a port user gets only theirs
    const columnDefs = [
      { headerName: 'Domain ID', field: 'Domain ID', width: 100, hide: true },
      { headerName: 'Domain Name', field: 'Domain Name', width: 350, pinned: true },
      { headerName: 'Sub Domain ID', field: 'Sub Domain ID', width: 100, hide: true },
      { headerName: 'Sub Domain Name', field: 'Sub Domain Name', width: 350, pinned: true },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        cellStyle: { textAlign: 'center' },
        children: [
          ...visiblePorts.map((o) => ({ headerName: o.name, field: o.key })),
          { headerName: 'Total', field: 'Total' },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const MAJOR_PORT_NAMES = [
  'Chennai Port Authority',
  'Cochin Port Authority',
  'Deendayal Port Authority',
  'Jawaharlal Nehru Port Authority',
  'Kamarajar Port Limited',
  'Mormugao Port Authority',
  'Mumbai Port Authority',
  'New Mangalore Port Authority',
  'Paradip Port Authority',
  'SMPA - Kolkata Dock System',
  'SMPA - Haldia Dock Complex',
  'V.O. Chidambaranar Port Authority',
  'Visakhapatnam Port Authority',
];

async function getLitigationPendencyPortWiseReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all ports; a port user sees only their own port
    const wide = await isWideRole(role_id);
    let visiblePorts = MAJOR_PORT_NAMES;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);
      const orgRow = await request.query(
        `SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisation_id`
      );
      const myName = orgRow.recordset[0]?.organisation_name;
      visiblePorts = MAJOR_PORT_NAMES.filter((n) => n === myName);

      // a non-port organisation (or unknown org) has no data in this report
      if (!visiblePorts.length) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgFilter = 'AND organisation_id = @organisation_id';
    }

    // names come from the constant list above, not from the user
    const nameList = visiblePorts.map((n) => `'${n}'`).join(', ');

    // 3. query
    const result = await request.query(`
      WITH DateRanges AS (
        SELECT
          CASE
            WHEN file_on_date IS NULL THEN 'No Date Provided'
            WHEN TRY_CAST(file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
            WHEN TRY_CAST(file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
            WHEN TRY_CAST(file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
            WHEN TRY_CAST(file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
            WHEN TRY_CAST(file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
            WHEN TRY_CAST(file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
            WHEN TRY_CAST(file_on_date AS DATE) < '2026-01-01' THEN '2025'
            WHEN TRY_CAST(file_on_date AS DATE) IS NOT NULL THEN CAST(YEAR(TRY_CAST(file_on_date AS DATE)) AS VARCHAR)
            ELSE 'Invalid Date'
          END AS YearGroup,
          organisation_name
        FROM tbl_litigation_cases
        WHERE organisation_name IN (${nameList})
          AND (stage_id IS NULL OR stage_id <> 7)
          ${orgFilter}
      ),
      PivotData AS (
        SELECT organisation_name AS Port, YearGroup, COUNT(*) AS CaseCount
        FROM DateRanges
        GROUP BY organisation_name, YearGroup
      )
      SELECT Port, YearGroup, CaseCount FROM PivotData
    `);

    const raw = result.recordset;
    if (!raw.length) return res.status(404).json({ error: 'No data available.' });

    // 4. build columns and rows
    const years = [...new Set(raw.map((r) => r.YearGroup))].sort();
    const ports = [...new Set(raw.map((r) => r.Port))].sort();

    const columnDefs = [
      { headerName: 'Organisation', field: 'port', width: 200, pinned: 'left' },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        marryChildren: true,
        children: years.map((year) => ({
          headerName: year,
          field: year,
          type: 'numericColumn',
          cellStyle: { textAlign: 'center' },
        })),
      },
      { headerName: 'Total', field: 'Total', width: 120, type: 'numericColumn', cellStyle: { textAlign: 'center' } },
    ];

    const rowData = ports.map((port) => {
      const row = { port };
      let total = 0;
      years.forEach((year) => {
        const rec = raw.find((r) => r.Port === port && r.YearGroup === year);
        const cnt = rec ? rec.CaseCount : 0;
        row[year] = cnt;
        total += cnt;
      });
      row.Total = total;
      return row;
    });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const MAJOR_PORT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 54, 55];

async function getLitigationPendencyDomainWiseReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all major ports; a port user sees only their own port
    const wide = await isWideRole(role_id);
    let orgIds = MAJOR_PORT_IDS;

    if (!wide) {
      // a non-port organisation (or unknown org) has no data in this report
      if (!MAJOR_PORT_IDS.includes(Number(organisation_id))) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgIds = [Number(organisation_id)];
    }

    // ids come from the constant list / the user's own record, and are cast to numbers
    const idList = orgIds.map(Number).join(', ');

    // 3. plain grouped query (no dynamic PIVOT SQL), pivoted below in JS
    const result = await request.query(`
      WITH Src AS (
        SELECT
          ISNULL(d.domain_name, 'NULL') AS domain,
          CASE
            WHEN c.file_on_date IS NULL THEN 'No Date Provided'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2026-01-01' THEN '2025'
            WHEN TRY_CAST(c.file_on_date AS DATE) IS NOT NULL THEN CAST(YEAR(TRY_CAST(c.file_on_date AS DATE)) AS VARCHAR)
            ELSE 'Invalid Date'
          END AS YearGroup
        FROM tbl_litigation_cases c
        LEFT JOIN mmt_domain d ON c.domain = d.domain_id
        WHERE c.organisation_id IN (${idList})
          AND (c.stage_id IS NULL OR c.stage_id <> 7)
      )
      SELECT domain, YearGroup, COUNT(*) AS CaseCount
      FROM Src
      GROUP BY domain, YearGroup
    `);

    const raw = result.recordset;
    if (!raw.length) {
      return res.status(404).json({ error: 'No data available for this.' });
    }

    // 4. pivot in JS
    const years = [...new Set(raw.map((r) => r.YearGroup))].sort();
    const domains = [...new Set(raw.map((r) => r.domain))].sort();

    const columnDefs = [
      { headerName: 'Domain', field: 'domain', width: 200, pinned: 'left', sortable: true, filter: true },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        marryChildren: true,
        cellStyle: { textAlign: 'center' },
        children: years.map((year) => ({
          headerName: year,
          field: year,
          sortable: true,
          filter: true,
          type: 'numericColumn',
          cellStyle: { textAlign: 'center' },
        })),
      },
    ];

    const rowData = domains.map((domain) => {
      const row = { domain };
      years.forEach((year) => {
        const rec = raw.find((r) => r.domain === domain && r.YearGroup === year);
        row[year] = rec ? rec.CaseCount : 0;
      });
      return row;
    });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
async function getAllLitigationData(req, res) {
  try {
    const conn = await pool;
    const userID = req.params.userID;

    // parameterised user lookup (no string concatenation in SQL)
    const userResult = await conn.request()
      .input("userID", userID)
      .query(`SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`);

    if (!userResult.recordset.length) {
      return res.status(404).json({ error: "User not found" });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // wide roles see every organisation, others only their own
    const request = conn.request();
    let orgFilter = "";
    if (!(await isWideRole(role_id))) {
      request.input("organisation_id", organisation_id);
      orgFilter = "WHERE lc.organisation_id = @organisation_id";
    }

    const result = await request.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY lc.case_id) AS [S No],
        lc.case_id AS [Case ID],
        lc.organisation_id AS [Organisation ID],
        lc.organisation_name AS [Organisation Name],
        ct.court_type_name AS [Court Type],
        st.court_sub_type_name AS [Sub Court],
        caty.case_type_name AS [Case Type],
        bench.bench_name AS [Bench Seat],
        con.consumer_sub_type_name AS [Consumer Forum],
        lc.case_number AS [Case Number],
        lc.year AS [Case Year],
        lc.cnr_number AS [CNR Number],
        lc.name_of_court AS [Name of Court],
        lc.file_on_date AS [Filing Date],
        lps.petitioners AS [Petitioners],
        lps.respondents AS [Respondents],
        COALESCE(d.domain_name, '') AS [Legal Domain],
        COALESCE(sd.sub_domain_name, '') AS [Legal Sub-Domain],
        de.department_name AS [Department/Division],
        lc.case_description AS [Case Description],
        CASE
          WHEN lc.pre_connected_cases = 1 THEN 'Yes'
          WHEN lc.pre_connected_cases = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Pre-connected Cases],
        CASE
          WHEN lc.counter_claim_amount_or_not = 1 THEN 'Yes'
          WHEN lc.counter_claim_amount_or_not = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Counter Claim Filed?],
        lc.counter_claim_amount AS [Counter Claim Amount],
        lc.claim_amount AS [Claim Amount],
        CASE
          WHEN lc.is_ministry_party = 1 THEN 'Yes'
          WHEN lc.is_ministry_party = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Ministry a Party?],
        lc.type_of_party AS [Type of Party],
        lc.role_of_ministry AS [Role of Ministry],
        CASE
          WHEN lc.is_behalf_of_ministry = 1 THEN 'Yes'
          WHEN lc.is_behalf_of_ministry = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is the Case Filed on Behalf of the Ministry?],
        CASE
          WHEN lc.is_ministry_challenged = 1 THEN 'Challenged'
          WHEN lc.is_ministry_challenged = 2 THEN 'Invoked'
          WHEN lc.is_ministry_challenged = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Ministry Challenged?],
        lc.document_challenged AS [Challenged Document],
        lc.document_invoked AS [Invoked Document],
        lc.details AS [Document Details],
        CASE
          WHEN lc.is_ministry_intervention_required = 1 THEN 'Yes'
          WHEN lc.is_ministry_intervention_required = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Ministry Intervention Required?],
        lc.nature_of_action_required AS [Nature of Action Required],
        lc.intervention_description AS [Intervention Description],
        lc.date_of_intervention_required AS [Intervention Required By Date],
        CASE
          WHEN lc.is_execution_required = 1 THEN 'Yes'
          WHEN lc.is_execution_required = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Execution Required?],
        lc.nature_of_execution AS [Nature of Execution],
        lc.type_of_clarification AS [Type of Clarification Required],
        lc.type_of_approval AS [Type of Approval Required],
        act.act_name AS [Relevant Acts],
        rul.rule_name AS [Relevant Rules],
        stat.state_name AS [State],
        dis.district_name AS [District],
        lc.other_act AS [Other Applicable Act],
        lc.other_lnv AS [Other Legal Notices/Views],
        lc.other_nature_execution AS [Other Nature of Execution],
        CASE
          WHEN lc.is_counter_affidavit_filed = 1 THEN 'Yes'
          WHEN lc.is_counter_affidavit_filed = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Counter Affidavit Filed?],
        CASE
          WHEN lc.is_hearing_started = 1 THEN 'Yes'
          WHEN lc.is_hearing_started = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Hearing Started?],
        CASE
          WHEN lc.is_interim_order = 1 THEN 'Yes'
          WHEN lc.is_interim_order = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Interim Order Passed?],
        CASE
          WHEN lc.is_final_order_or_judgement_passed = 1 THEN 'Yes'
          WHEN lc.is_final_order_or_judgement_passed = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Final Order/Judgement Passed?],
        lc.date_of_final_order AS [Date of Final Order],
        lc.nature_of_judgement AS [Nature of Judgement],
        CASE
          WHEN lc.amounts_of_any_rewarded IN ('1', 'No Amount')     THEN 'No Amount'
          WHEN lc.amounts_of_any_rewarded IN ('2', 'Claim')         THEN 'Claim'
          WHEN lc.amounts_of_any_rewarded IN ('3', 'Counter Claim') THEN 'Counter Claim'
          ELSE 'N/A'
        END AS [Total Rewarded Amounts],
        CASE
          WHEN lc.is_action_required_for_complaince = 1 THEN 'Yes'
          WHEN lc.is_action_required_for_complaince = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Action Required for Compliance?],
        lc.last_date_for_complaince AS [Compliance Deadline],
        lc.judgement_accepted AS [Is Judgement Accepted?],
        CASE
          WHEN lc.is_order_complied = 1 THEN 'Yes'
          WHEN lc.is_order_complied = 0 THEN 'No'
          ELSE 'N/A'
        END AS [Is Order Complied?],
        lc.date_of_complied AS [Date of Compliance],
        lc.details_of_complaince AS [Details of Compliance],
        lc.reason_for_non_complaince AS [Reason for Non-Compliance],
        lc.amounts_if_any_rewarded_claim_amount AS [Rewarded Claim Amount],
        lc.amounts_if_any_rewarded_counter_claim_amount AS [Rewarded Counter Claim Amount],
        lc.appeal_rev_case_number AS [Appeal/Review Case Number],
        lc.appeal_rev_court_name AS [Appeal/Review Court Name],
        lc.appeal_rev_cnr_number AS [Appeal/Review CNR Number],
        lc.appeal_rev_filling_date AS [Appeal/Review Filing Date],
        lc.court_complex AS [Court Complex],
        lc.case_status_case_number AS [Case Status Case Number],
        lc.case_status_court_ AS [Case Status Court],
        lc.case_status_cnr_number AS [Case Status CNR Number],
        lc.case_status_filled_date AS [Case Status Filing Date],
        lc.invoked_details AS [Invoked Details],
        lc.stage AS [Case Stage],
        lc.created_date AS [Date Created],
        lc.updated_date AS [Date Updated],
        lc.created_by AS [Created By],
        lc.updated_by AS [Updated By]
      FROM tbl_litigation_cases lc
      LEFT JOIN mmt_domain d ON lc.domain = d.domain_id
      LEFT JOIN mmt_sub_domain sd ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
      LEFT JOIN mmt_court_type ct ON lc.court_type = ct.court_type_id
      LEFT JOIN mmt_court_sub_type st ON lc.sub_court = st.court_sub_type_id
      LEFT JOIN mmt_court_case_type caty ON lc.case_type = caty.case_type_id
      LEFT JOIN tbl_court_case_departments de ON TRY_CAST(lc.dept_division AS INT) = de.department_id
      LEFT JOIN mmt_bench_seat bench ON lc.bench_seat = bench.bench_id
      LEFT JOIN mmt_court_consumer_sub_type con ON lc.consumer_forum = con.consumer_sub_type_id
      LEFT JOIN mmt_court_case_acts act ON lc.acts = act.act_id
      LEFT JOIN mmt_court_case_rules rul ON lc.rules = rul.rule_id
      LEFT JOIN mmt_state stat ON lc.state = stat.state_id
      LEFT JOIN mmt_district dis ON lc.district = dis.district_id
      LEFT JOIN (
        SELECT case_id,
               STRING_AGG(CAST(petitioners AS NVARCHAR(MAX)), ', ') AS petitioners,
               STRING_AGG(CAST(respondents AS NVARCHAR(MAX)), ', ') AS respondents
        FROM tbl_litigation_pettioners_respondents
        GROUP BY case_id
      ) lps ON lc.case_id = lps.case_id
      ${orgFilter}
      ORDER BY lc.case_id;
    `);

    return res.json(result.recordset);
  } catch (error) {
    console.error("getAllLitigationData error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function addLitigationPetitionerAndRespondent(req, res) {
    const { caseID, petitioners, respondents } = req.body;

    const conn = await pool;
    const request = conn.request();

    const petitionerStr = petitioners.join('|');
    const respondentStr = respondents.join('|');

    try {
        const checkCaseIdQuery = `SELECT * FROM tbl_litigation_pettioners_respondents WHERE case_id = @caseID`;
        request.input("caseID", caseID);
        const checkResult = await request.query(checkCaseIdQuery);

        // If data exists for this caseID, delete it
        if (checkResult.recordset.length > 0) {
            const deleteQuery = `DELETE FROM tbl_litigation_pettioners_respondents WHERE case_id = @caseID`;
            await request.query(deleteQuery);
        }

        const insertQuery = `
            INSERT INTO tbl_litigation_pettioners_respondents (case_id, petitioners, respondents)
            VALUES (@caseID, @petitioners, @respondents)
        `;
        await request
            .input("petitioners", petitionerStr)
            .input("respondents", respondentStr)
            .query(insertQuery);

        return res.status(201).json({ message: "Inserted successfully" });

    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function getLitigationPetitionerAndRespondent(req,res){
    const caseID = req.params.caseID;
    
    if (!caseID || caseID == null) {
        return res.status(400).json({ error: "Invalid case ID" });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("caseID", caseID);
    try{
    let caseQuery = `SELECT * FROM tbl_litigation_pettioners_respondents WHERE case_id = @caseID`;
      
    const result = await request.query(caseQuery);
    res.json(result.recordset);
    }catch (err) {
        // console.error("Error ", err);
        res.status(500).json({ error: "failed to fetch table data" });
    }
}

async function getLitigationDomainByOtherOrgReport(req, res) {
    try {
        const conn = await pool;
        const result = await conn.query(`SELECT 
            -- The domain details from the mmt_domain table or NULL if there is no domain
            mmt_domain.domain_id AS [Domain ID],
            mmt_domain.domain_name AS [Domain Name],
            
            -- Counting cases per organization
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Andaman, Lakshadweep Harbour Works' THEN 1 ELSE 0 END) AS [ALHW],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Cochin Shipyard Limited' THEN 1 ELSE 0 END) AS [CSL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Dredging Corporation of India' THEN 1 ELSE 0 END) AS [DCI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Directorate General of Lighthouses and Lightships' THEN 1 ELSE 0 END) AS [DGLL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Directorate General of Shipping, Mumbai' THEN 1 ELSE 0 END) AS [DGS],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Indian Maritime University' THEN 1 ELSE 0 END) AS [IMU],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Indian Ports Rail Corporation Limited' THEN 1 ELSE 0 END) AS [IPRCL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Inland Waterways Authority of India' THEN 1 ELSE 0 END) AS [IWAI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Shipping Corporation of India' THEN 1 ELSE 0 END) AS [SCI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Sagarmala Development Company Limited' THEN 1 ELSE 0 END) AS [SDCL],
            
            -- Calculate total count of cases across all organizations
            SUM(
                CASE WHEN mmt_organisation.organisation_name IN 
                    ('Andaman, Lakshadweep Harbour Works', 'Cochin Shipyard Limited', 'Dredging Corporation of India', 'Directorate General of Lighthouses and Lightships',
                    'Directorate General of Shipping, Mumbai', 'Indian Maritime University', 'Indian Ports Rail Corporation Limited', 'Inland Waterways Authority of India', 
                    'Shipping Corporation of India', 'Sagarmala Development Company Limited') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            -- mmt_domain is being left joined with tbl_litigation_cases
            mmt_domain
        LEFT JOIN 
            tbl_litigation_cases ON mmt_domain.domain_id = tbl_litigation_cases.domain AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        LEFT JOIN 
            mmt_organisation ON mmt_organisation.organisation_id = tbl_litigation_cases.organisation_id
        GROUP BY 
            mmt_domain.domain_id, 
            mmt_domain.domain_name

        -- UNION to include the cases where domain is NULL in the tbl_litigation_cases table
        UNION ALL

        SELECT 
            NULL AS [Domain ID], -- NULL for domain_id
            'NULL' AS [Domain Name], -- 'NULL' as a string for domain_name
            -- For counting NULL domain cases (only for the specified organizations)
             SUM(CASE WHEN mmt_organisation.organisation_name = 'Andaman, Lakshadweep Harbour Works' THEN 1 ELSE 0 END) AS [ALHW],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Cochin Shipyard Limited' THEN 1 ELSE 0 END) AS [CSL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Dredging Corporation of India' THEN 1 ELSE 0 END) AS [DCI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Directorate General of Lighthouses and Lightships' THEN 1 ELSE 0 END) AS [DGLL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Directorate General of Shipping, Mumbai' THEN 1 ELSE 0 END) AS [DGS],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Indian Maritime University' THEN 1 ELSE 0 END) AS [IMU],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Indian Ports Rail Corporation Limited' THEN 1 ELSE 0 END) AS [IPRCL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Inland Waterways Authority of India' THEN 1 ELSE 0 END) AS [IWAI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Shipping Corporation of India' THEN 1 ELSE 0 END) AS [SCI],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Sagarmala Development Company Limited' THEN 1 ELSE 0 END) AS [SDCL],
            -- Total for NULL domains in tbl_litigation_cases for the specified organizations
            SUM(
                CASE WHEN tbl_litigation_cases.domain IS NULL
                    AND mmt_organisation.organisation_name IN 
                       ('Andaman, Lakshadweep Harbour Works', 'Cochin Shipyard Limited', 'Dredging Corporation of India', 'Directorate General of Lighthouses and Lightships',
                    'Directorate General of Shipping, Mumbai', 'Indian Maritime University', 'Indian Ports Rail Corporation Limited', 'Inland Waterways Authority of India', 
                    'Shipping Corporation of India', 'Sagarmala Development Company Limited') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            tbl_litigation_cases
        LEFT JOIN 
            mmt_organisation ON mmt_organisation.organisation_id = tbl_litigation_cases.organisation_id
        WHERE 
            tbl_litigation_cases.domain IS NULL AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        GROUP BY 
            tbl_litigation_cases.domain;
    `);
        
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }
    
        let columnDefs = [
                
                {
                    headerName: 'Domain ID', 
                    field: 'Domain ID', 
                    width: 100,
                    hide: true
                },
                { 
                    headerName: 'Domain Name', 
                    field: 'Domain Name',           
                },
                {

                headerName: "Number of Active Cases",
                headerClass: "headercenter",
                cellStyle: { textAlign: 'center' },

                children: [
              
   
            { headerName: 'Andaman, Lakshadweep Harbour Works', field: 'ALHW',width: 400 },
            { headerName: 'Cochin Shipyard Limited', field: 'CSL',width: 280  },
            { headerName: 'Dredging Corporation of India', field: 'DCI',width: 280  },
            { headerName: 'Directorate General of Lighthouses and Lightships', field: 'DGLL',width: 400   },
            { headerName: 'Directorate General of Shipping, Mumbai', field: 'DGS',width: 400   },   
            { headerName: 'Indian Maritime University', field: 'IMU',width: 280 },
            { headerName: 'Indian Ports Rail Corporation Limited', field: 'IPRCL',width: 400 },
            { headerName: 'Inland Waterways Authority of India', field: 'IWAI',width: 400 },
            { headerName: 'Shipping Corporation of India', field: 'SCI',width: 280 },
            { headerName: 'Sagarmala Development Company Limited', field: 'SDCL',width: 400  },  
            { headerName: 'Total', field: 'Total',width: 280},   
         ]}];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}

async function getLitigationSubDomainByOtherOrgReport(req,res) {
     try {
        const conn = await pool;

        const result = await conn.query(`
                SELECT 
            -- The sub_domain details from the mmt_sub_domain table or NULL if there is no sub_domain
            mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
            mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
            
            -- Counting cases per organization
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Andaman, Lakshadweep Harbour Works' THEN 1 ELSE 0 END) AS [ALHW],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Shipyard Limited' THEN 1 ELSE 0 END) AS [CSL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Dredging Corporation of India' THEN 1 ELSE 0 END) AS [DCI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Directorate General of Lighthouses and Lightships' THEN 1 ELSE 0 END) AS [DGLL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Directorate General of Shipping, Mumbai' THEN 1 ELSE 0 END) AS [DGS],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Indian Maritime University' THEN 1 ELSE 0 END) AS [IMU],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Indian Ports Rail Corporation Limited' THEN 1 ELSE 0 END) AS [IPRCL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Inland Waterways Authority of India' THEN 1 ELSE 0 END) AS [IWAI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Shipping Corporation of India' THEN 1 ELSE 0 END) AS [SCI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Sagarmala Development Company Limited' THEN 1 ELSE 0 END) AS [SDCL],
            
            -- Calculate total count of cases across all organizations
            SUM(
                CASE WHEN tbl_litigation_cases.organisation_name IN 
                    ('Andaman, Lakshadweep Harbour Works', 'Cochin Shipyard Limited', 'Dredging Corporation of India', 'Directorate General of Lighthouses and Lightships',
                    'Directorate General of Shipping, Mumbai', 'Indian Maritime University', 'Indian Ports Rail Corporation Limited', 'Inland Waterways Authority of India', 
                    'Shipping Corporation of India', 'Sagarmala Development Company Limited') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            -- mmt_sub_domain is being left joined with tbl_litigation_cases
            mmt_sub_domain
        LEFT JOIN 
            tbl_litigation_cases ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
       
        GROUP BY 
            mmt_sub_domain.sub_domain_id, 
            mmt_sub_domain.sub_domain_name

        -- UNION to include the cases where sub_domain is NULL in the tbl_litigation_cases table
        UNION ALL

        SELECT 
            NULL AS [Domain ID], -- NULL for sub_domain_id
            'NULL' AS [Domain Name], -- 'NULL' as a string for sub_domain_name
            -- For counting NULL sub_domain cases (only for the specified organizations)
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Andaman, Lakshadweep Harbour Works' THEN 1 ELSE 0 END) AS [ALHW],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Shipyard Limited' THEN 1 ELSE 0 END) AS [CSL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Dredging Corporation of India' THEN 1 ELSE 0 END) AS [DCI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Directorate General of Lighthouses and Lightships' THEN 1 ELSE 0 END) AS [DGLL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Directorate General of Shipping, Mumbai' THEN 1 ELSE 0 END) AS [DGS],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Indian Maritime University' THEN 1 ELSE 0 END) AS [IMU],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Indian Ports Rail Corporation Limited' THEN 1 ELSE 0 END) AS [IPRCL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Inland Waterways Authority of India' THEN 1 ELSE 0 END) AS [IWAI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Shipping Corporation of India' THEN 1 ELSE 0 END) AS [SCI],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Sagarmala Development Company Limited' THEN 1 ELSE 0 END) AS [SDCL],
            
            -- Total for NULL domains in tbl_litigation_cases for the specified organizations
            SUM(
                CASE WHEN tbl_litigation_cases.sub_domain IS NULL
                    AND tbl_litigation_cases.organisation_name IN 
                        ('Andaman, Lakshadweep Harbour Works', 'Cochin Shipyard Limited', 'Dredging Corporation of India', 'Directorate General of Lighthouses and Lightships',
                    'Directorate General of Shipping, Mumbai', 'Indian Maritime University', 'Indian Ports Rail Corporation Limited', 'Inland Waterways Authority of India', 
                    'Shipping Corporation of India', 'Sagarmala Development Company Limited') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            tbl_litigation_cases
     
        WHERE 
            tbl_litigation_cases.sub_domain IS NULL AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        GROUP BY 
            tbl_litigation_cases.sub_domain;

            `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }
    
        let columnDefs = [
                
                {
                    headerName: 'Sub Domain ID', 
                    field: 'Sub Domain ID', 
                    width: 100,
                    hide: true
                },
                { 
                    headerName: 'Sub Domain Name', 
                    field: 'Sub Domain Name', 
                    width: 350
                },

                {
            headerName: "Number of Active Cases",
            headerClass: "headercenter",
            cellStyle: { textAlign: 'center' },

            children: [
            { headerName: 'Andaman, Lakshadweep Harbour Works', field: 'ALHW',width: 400 },
            { headerName: 'Cochin Shipyard Limited', field: 'CSL',width: 400 },
            { headerName: 'Dredging Corporation of India', field: 'DCI',width: 400 },
            { headerName: 'Directorate General of Lighthouses and Lightships', field: 'DGLL',width: 400 },
            { headerName: 'Directorate General of Shipping, Mumbai', field: 'DGS',width: 400 },   
            { headerName: 'Indian Maritime University', field: 'IMU',width: 400 },
            { headerName: 'Indian Ports Rail Corporation Limited', field: 'IPRCL',width: 400 },
            { headerName: 'Inland Waterways Authority of India', field: 'IWAI',width: 400},
            { headerName: 'Shipping Corporation of India', field: 'SCI',width: 400 },
            { headerName: 'Sagarmala Development Company Limited', field: 'SDCL',width: 400 },  
            { headerName: 'Total', field: 'Total' },   
           ]}];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}

const OTHER_ORGS = [
  { key: 'ALHW',  name: 'Andaman, Lakshadweep Harbour Works' },
  { key: 'CSL',   name: 'Cochin Shipyard Limited' },
  { key: 'DCI',   name: 'Dredging Corporation of India' },
  { key: 'DGLL',  name: 'Directorate General of Lighthouses and Lightships' },
  { key: 'DGS',   name: 'Directorate General of Shipping, Mumbai' },
  { key: 'IMU',   name: 'Indian Maritime University' },
  { key: 'IPRCL', name: 'Indian Ports Rail Corporation Limited' },
  { key: 'IWAI',  name: 'Inland Waterways Authority of India' },
  { key: 'SCI',   name: 'Shipping Corporation of India' },
  { key: 'SDCL',  name: 'Sagarmala Development Company Limited' },
];

async function getLitigationDomainAndSubDomainByOtherOrgReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all; an organisation user sees only their own organisation
    const wide = await isWideRole(role_id);
    let visibleOrgs = OTHER_ORGS;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);
      const orgRow = await request.query(
        `SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisation_id`
      );
      const myName = orgRow.recordset[0]?.organisation_name;
      visibleOrgs = OTHER_ORGS.filter((o) => o.name === myName);

      // a major port (or unknown org) has no data in this report
      if (!visibleOrgs.length) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgFilter = 'AND tbl_litigation_cases.organisation_id = @organisation_id';
    }

    // 3. build the SQL (names come from the constant list above, not from the user)
    const countCols = OTHER_ORGS.map(
      (o) => `SUM(CASE WHEN tbl_litigation_cases.organisation_name = '${o.name}' THEN 1 ELSE 0 END) AS [${o.key}]`
    ).join(',\n');
    const nameList = OTHER_ORGS.map((o) => `'${o.name}'`).join(', ');

    const result = await request.query(`
      SELECT
        mmt_domain.domain_id AS [Domain ID],
        mmt_domain.domain_name AS [Domain Name],
        mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
        mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM mmt_sub_domain
      LEFT JOIN tbl_litigation_cases
        ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      LEFT JOIN mmt_domain ON mmt_sub_domain.domain_id = mmt_domain.domain_id
      GROUP BY mmt_domain.domain_id, mmt_domain.domain_name,
               mmt_sub_domain.sub_domain_id, mmt_sub_domain.sub_domain_name

      UNION ALL

      SELECT
        NULL AS [Domain ID],
        'NULL' AS [Domain Name],
        NULL AS [Sub Domain ID],
        'NULL' AS [Sub Domain Name],
        ${countCols},
        SUM(CASE WHEN tbl_litigation_cases.organisation_name IN (${nameList}) THEN 1 ELSE 0 END) AS [Total]
      FROM tbl_litigation_cases
      WHERE tbl_litigation_cases.sub_domain IS NULL
        AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        ${orgFilter}
      GROUP BY tbl_litigation_cases.sub_domain;
    `);

    const rowData = result.recordset;
    if (rowData.length === 0) {
      return res.status(404).json({ error: 'No data available for this.' });
    }

    // 4. columns: admin gets all 10 organisations, an organisation user gets only theirs
    const columnDefs = [
      { headerName: 'Domain ID', field: 'Domain ID', width: 100, hide: true },
      { headerName: 'Domain Name', field: 'Domain Name', width: 350, pinned: true },
      { headerName: 'Sub Domain ID', field: 'Sub Domain ID', width: 100, hide: true },
      { headerName: 'Sub Domain Name', field: 'Sub Domain Name', width: 350, pinned: true },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        cellStyle: { textAlign: 'center' },
        children: [
          ...visibleOrgs.map((o) => ({ headerName: o.name, field: o.key, width: 400 })),
          { headerName: 'Total', field: 'Total' },
        ],
      },
    ];

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLitigatonPendencyOtherOrgWiseReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all; an organisation user sees only their own organisation
    const wide = await isWideRole(role_id);
    let visibleOrgs = OTHER_ORGS;
    let orgFilter = '';

    if (!wide) {
      request.input('organisation_id', organisation_id);
      const orgRow = await request.query(
        `SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisation_id`
      );
      const myName = orgRow.recordset[0]?.organisation_name;
      visibleOrgs = OTHER_ORGS.filter((o) => o.name === myName);

      // a major port (or unknown org) has no data in this report
      if (!visibleOrgs.length) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgFilter = 'AND organisation_id = @organisation_id';
    }

    // names come from the constant list above, not from the user
    const nameList = visibleOrgs.map((o) => `'${o.name}'`).join(', ');

    // 3. query
    const result = await request.query(`
      WITH DateRanges AS (
        SELECT
          CASE
            WHEN file_on_date IS NULL THEN 'No Date Provided'
            WHEN TRY_CAST(file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
            WHEN TRY_CAST(file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
            WHEN TRY_CAST(file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
            WHEN TRY_CAST(file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
            WHEN TRY_CAST(file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
            WHEN TRY_CAST(file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
            WHEN TRY_CAST(file_on_date AS DATE) < '2026-01-01' THEN '2025'
            WHEN TRY_CAST(file_on_date AS DATE) IS NOT NULL THEN CAST(YEAR(TRY_CAST(file_on_date AS DATE)) AS VARCHAR)
            ELSE 'Invalid Date'
          END AS YearGroup,
          organisation_name
        FROM tbl_litigation_cases
        WHERE organisation_name IN (${nameList})
          AND (stage_id IS NULL OR stage_id <> 7)
          ${orgFilter}
      ),
      PivotData AS (
        SELECT organisation_name AS Port, YearGroup, COUNT(*) AS CaseCount
        FROM DateRanges
        GROUP BY organisation_name, YearGroup
      )
      SELECT Port, YearGroup, CaseCount FROM PivotData
    `);

    const raw = result.recordset;
    if (!raw.length) return res.status(404).json({ error: 'No data available.' });

    // 4. build columns and rows
    const years = [...new Set(raw.map((r) => r.YearGroup))].sort();
    const ports = [...new Set(raw.map((r) => r.Port))].sort();

    const columnDefs = [
      { headerName: 'Organisation', field: 'port', width: 180, pinned: 'left' },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        marryChildren: true,
        cellStyle: { textAlign: 'center' },
        children: years.map((year) => ({
          headerName: year,
          field: year,
          type: 'numericColumn',
          cellStyle: { textAlign: 'center' },
        })),
      },
      { headerName: 'Total', field: 'Total', width: 120, type: 'numericColumn', cellStyle: { textAlign: 'center' } },
    ];

    const rowData = ports.map((port) => {
      const row = { port };
      let total = 0;
      years.forEach((year) => {
        const rec = raw.find((r) => r.Port === port && r.YearGroup === year);
        const cnt = rec ? rec.CaseCount : 0;
        row[year] = cnt;
        total += cnt;
      });
      row.Total = total;
      return row;
    });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const OTHER_ORG_IDS = [23, 18, 27, 19, 21, 25, 20, 17, 15, 225];

async function getLitigatonPendencyDomainWiseOtherOrgReport(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input('userID', userID);
    const userResult = await request.query(
      `SELECT role_id, organisation_id FROM tbl_user WHERE user_id = @userID`
    );
    if (!userResult.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { role_id, organisation_id } = userResult.recordset[0];

    // 2. admin sees all other organisations; an organisation user sees only their own
    const wide = await isWideRole(role_id);
    let orgIds = OTHER_ORG_IDS;

    if (!wide) {
      // a major port (or unknown org) has no data in this report
      if (!OTHER_ORG_IDS.includes(Number(organisation_id))) {
        return res.status(403).json({ error: 'This report is not available for your organisation.' });
      }
      orgIds = [Number(organisation_id)];
    }

    // ids come from the constant list / the user's own record, and are cast to numbers
    const idList = orgIds.map(Number).join(', ');

    // 3. plain grouped query (no dynamic PIVOT SQL), pivoted below in JS
    const result = await request.query(`
      WITH Src AS (
        SELECT
          ISNULL(d.domain_name, 'NULL') AS domain,
          CASE
            WHEN c.file_on_date IS NULL THEN 'No Date Provided'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
            WHEN TRY_CAST(c.file_on_date AS DATE) < '2026-01-01' THEN '2025'
            WHEN TRY_CAST(c.file_on_date AS DATE) IS NOT NULL THEN CAST(YEAR(TRY_CAST(c.file_on_date AS DATE)) AS VARCHAR)
            ELSE 'Invalid Date'
          END AS YearGroup
        FROM tbl_litigation_cases c
        LEFT JOIN mmt_domain d ON c.domain = d.domain_id
        WHERE c.organisation_id IN (${idList})
          AND (c.stage_id IS NULL OR c.stage_id <> 7)
      )
      SELECT domain, YearGroup, COUNT(*) AS CaseCount
      FROM Src
      GROUP BY domain, YearGroup
    `);

    const raw = result.recordset;
    if (!raw.length) {
      return res.status(404).json({ error: 'No data available for this.' });
    }

    // 4. pivot in JS
    const years = [...new Set(raw.map((r) => r.YearGroup))].sort();
    const domains = [...new Set(raw.map((r) => r.domain))].sort();

    const columnDefs = [
      { headerName: 'Domain', field: 'domain', width: 200, pinned: 'left', sortable: true, filter: true },
      {
        headerName: 'Number of Active Cases',
        headerClass: 'headercenter',
        marryChildren: true,
        cellStyle: { textAlign: 'center' },
        children: years.map((year) => ({
          headerName: year,
          field: year,
          sortable: true,
          filter: true,
          type: 'numericColumn',
          cellStyle: { textAlign: 'center' },
        })),
      },
    ];

    const rowData = domains.map((domain) => {
      const row = { domain };
      years.forEach((year) => {
        const rec = raw.find((r) => r.domain === domain && r.YearGroup === year);
        row[year] = rec ? rec.CaseCount : 0;
      });
      return row;
    });

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkCaseNumberExists(req, res) {
    const organisationID = req.params.organisationID;
    const caseNumber = req.params.caseNumber;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);
    request.input("caseNumber", caseNumber);

    try {
        const result = await request.query(`
            SELECT TOP 1 case_id
            FROM tbl_litigation_cases
            WHERE organisation_id = @organisationID 
              AND case_number = @caseNumber
        `);

        if (result.recordset && result.recordset.length > 0) {
            // Case number exists
            return res.sendStatus(205);  // You can also return a JSON if needed
        } else {
            // Case number does not exist
            return res.sendStatus(200);
        }

    } catch (err) {
        console.error("Error: ", err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export default {submitCaseStatus,getSubTableCourtCasesData,fileupload,counterAffidavitDocument,addCourtCaseInterimDetails,addCourtCaseHearingDetails,upload,fileUpload,getLastLitigationCaseNumber,addLitigationOtherCourtCaseOrg,
    addLitigationPrevConnCases,addLitigationDetailsOfCounsel,createLitigationCourtCase,addMinistryDetailsOfCounsel,
    ministryUploadDocument,ministryInterventionDocument,createMinistryIntervention,addCourtCaseOMDetails,addProfessionalFeeDetails,addOtherExpensesDetails,
    submitLitigationExpenditure,getMinistryUploadDocument,deleteMinistryInterventionDocument,deleteMinistryInterventionDoc,
    deletecounterAffiDocument, getLitigationDomainReport, getLitigationSubDomainReport, getLitigationDomainAndSubDomainReport,
    getLitigationPendencyPortWiseReport, getLitigationPendencyDomainWiseReport,  getAllLitigationData,addLitigationPetitionerAndRespondent,getLitigationPetitionerAndRespondent,
getLitigationDomainByOtherOrgReport,getLitigationSubDomainByOtherOrgReport,getLitigationDomainAndSubDomainByOtherOrgReport,getLitigatonPendencyOtherOrgWiseReport,
getLitigatonPendencyDomainWiseOtherOrgReport,checkCaseNumberExists
}














