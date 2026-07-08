import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';


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

async function counterAffidavitDocument(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const caseID = req.body.caseID;
        const pathFolder = req.body.path; 

        request.input("caseID", caseID);

        //check if the path is 'Litigation
        if (pathFolder === 'Litigation') {
            const fullPath = path.join(filedestination, pathFolder); 

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
            const existingDocResult = await request.query(`
                SELECT file_of_affidavit FROM tbl_litigation_cases 
                WHERE case_id = @caseID 
            `);
            const existingFileName = existingDocResult.recordset[0]?.file_of_affidavit;
            
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
                return res.status(400).json({ error: "No file uploaded." });
            }

            await request.query(`
                UPDATE tbl_litigation_cases 
                SET file_of_affidavit = @newFileName
                WHERE case_id = @caseID
                `);
                res.status(201).json({ message: "Document uploaded successfully" });
        } else {
            return res.status(400).json({ error: "Invalid path. Document upload is only allowed for 'Litigation'." });
        }
    } catch (error) {
        // console.error("Error in createMinistryIntervention:", error);
        res.status(500).json({ error: "Internal server error" });
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

async function getLitigaitonDomainReport(req, res) {
    try {
        const conn = await pool;
        const result = await conn.query(`
            SELECT 
            -- The domain details from the mmt_domain table or NULL if there is no domain
            mmt_domain.domain_id AS [Domain ID],
            mmt_domain.domain_name AS [Domain Name],
            
            -- Counting cases per organization
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
            
            -- Calculate total count of cases across all organizations
            SUM(
                CASE WHEN mmt_organisation.organisation_name IN 
                    ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                    'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                    'Paradip Port Authority', 'SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex', 'V.O. Chidambaranar Port Authority',
                    'Visakhapatnam Port Authority') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            -- mmt_domain is being left joined with tbl_litigation_cases
            mmt_domain
        LEFT JOIN 
            tbl_litigation_cases ON mmt_domain.domain_id = tbl_litigation_cases.domain  AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
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
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
            SUM(CASE WHEN mmt_organisation.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
            -- Total for NULL domains in tbl_litigation_cases for the specified organizations
            SUM(
                CASE WHEN tbl_litigation_cases.domain IS NULL
                    AND mmt_organisation.organisation_name IN 
                        ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                        'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                        'Paradip Port Authority','SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex', 'V.O. Chidambaranar Port Authority',
                        'Visakhapatnam Port Authority') 
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
            { headerName: 'Chennai Port Authority', field: 'ChPA',width: 280},
            { headerName: 'Cochin Port Authority', field: 'CoPA' },
            { headerName: 'Deendayal Port Authority', field: 'DPA' },
            { headerName: 'Jawaharlal Nehru Port Authority', field: 'JNPA' },
            { headerName: 'Kamarajar Port Limited', field: 'KPL' },   
            { headerName: 'Mormugao Port Authority', field: 'MgPA' },
            { headerName: 'Mumbai Port Authority', field: 'MbPA' },
            { headerName: 'New Mangalore Port Authority', field: 'NMPA'},
            { headerName: 'Paradip Port Authority', field: 'PPA' },
            { headerName: 'SMPA - Kolkata Dock System', field: 'SMPA-KDS'},
            { headerName: 'SMPA - Haldia Dock Complex', field: 'SMPA-HDC'},
            { headerName: 'V.O. Chidambaranar Port Authority', field: 'VoCPA' },
            { headerName: 'Visakhapatnam Port Authority', field: 'VPA' },
            { headerName: 'Total', field: 'Total' },   

        ]}];

    
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}


// SELECT 
// -- Use MIN to select a representative sub_domain_id for the merged "Others" rows
// MIN(mmt_sub_domain.sub_domain_id) AS [Sub Domain ID],  
// -- Merge "Others" into a single row
// CASE 
//     WHEN mmt_sub_domain.sub_domain_name = 'Others' THEN 'Others'
//     ELSE mmt_sub_domain.sub_domain_name
// END AS [Sub Domain Name],

// -- Sum counts per organization
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Syama Prasad Mookeerjii Port' THEN 1 ELSE 0 END) AS [SMPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
// SUM(CASE WHEN mmt_organisation.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],

// -- Calculate total count of cases across all organizations
// SUM(
//     CASE WHEN mmt_organisation.organisation_name IN 
//         ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
//         'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
//         'Paradip Port Authority', 'Syama Prasad Mookeerjii Port', 'V.O. Chidambaranar Port Authority', 
//         'Visakhapatnam Port Authority') 
//     THEN 1 ELSE 0 END
// ) AS [Total]
// FROM 
// mmt_sub_domain
// LEFT JOIN 
// tbl_litigation_cases ON mmt_sub_domain.sub_domain_id = 
//     CASE 
//         WHEN tbl_litigation_cases.sub_domain IS NULL OR tbl_litigation_cases.sub_domain = 'NULL' 
//         THEN 0  -- Handle the NULL or 'NULL' string, replacing with 0 or valid sub_domain_id
//         ELSE CAST(tbl_litigation_cases.sub_domain AS INT)  -- Safely cast sub_domain to INT
//     END
// LEFT JOIN 
// mmt_organisation ON mmt_organisation.organisation_id = tbl_litigation_cases.organisation_id
// GROUP BY 
// -- Group by the CASE expression to merge "Others"
// CASE 
//     WHEN mmt_sub_domain.sub_domain_name = 'Others' THEN 'Others'
//     ELSE mmt_sub_domain.sub_domain_name
// END
// ORDER BY 
// [Sub Domain Name];


async function getLitigaitonSubDomainReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.query(`
                SELECT 
            -- The sub_domain details from the mmt_sub_domain table or NULL if there is no sub_domain
            mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
            mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
            
            -- Counting cases per organization
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
            
            -- Calculate total count of cases across all organizations
            SUM(
                CASE WHEN tbl_litigation_cases.organisation_name IN 
                    ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                    'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                    'Paradip Port Authority','SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex','V.O. Chidambaranar Port Authority',
                    'Visakhapatnam Port Authority') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            -- mmt_sub_domain is being left joined with tbl_litigation_cases
            mmt_sub_domain
        LEFT JOIN 
            tbl_litigation_cases ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain  AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
       
        GROUP BY 
            mmt_sub_domain.sub_domain_id, 
            mmt_sub_domain.sub_domain_name

        -- UNION to include the cases where sub_domain is NULL in the tbl_litigation_cases table
        UNION ALL

        SELECT 
            NULL AS [Domain ID], -- NULL for sub_domain_id
            'NULL' AS [Domain Name], -- 'NULL' as a string for sub_domain_name
            -- For counting NULL sub_domain cases (only for the specified organizations)
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
            SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
            -- Total for NULL domains in tbl_litigation_cases for the specified organizations
            SUM(
                CASE WHEN tbl_litigation_cases.sub_domain IS NULL
                    AND tbl_litigation_cases.organisation_name IN 
                        ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                        'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                        'Paradip Port Authority','SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex','V.O. Chidambaranar Port Authority',
                        'Visakhapatnam Port Authority') 
                THEN 1 ELSE 0 END
            ) AS [Total]
        FROM 
            tbl_litigation_cases
     
        WHERE 
            tbl_litigation_cases.sub_domain IS NULL  AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
        GROUP BY 
            tbl_litigation_cases.sub_domain;

            `);

        // const rowData = result.recordset;

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available' });
        // }

        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        //     field: key,
        // }));

        // res.json({ columnDefs, rowData });
        const rowData = result.recordset;
        // console.log(rowData)

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
            { headerName: 'Chennai Port Authority', field: 'ChPA' },
            { headerName: 'Cochin Port Authority', field: 'CoPA' },
            { headerName: 'Deendayal Port Authority', field: 'DPA' },
            { headerName: 'Jawaharlal Nehru Port Authority', field: 'JNPA' },
            { headerName: 'Kamarajar Port Limited', field: 'KPL' },   
            { headerName: 'Mormugao Port Authority', field: 'MgPA' },
            { headerName: 'Mumbai Port Authority', field: 'MbPA' },
            { headerName: 'New Mangalore Port Authority', field: 'NMPA'},
            { headerName: 'Paradip Port Authority', field: 'PPA' },
            { headerName: 'SMPA - Kolkata Dock System', field: 'SMPA-KDS'},
            { headerName: 'SMPA - Haldia Dock Complex', field: 'SMPA-HDC'},
            { headerName: 'V.O. Chidambaranar Port Authority', field: 'VoCPA' },
            { headerName: 'Visakhapatnam Port Authority', field: 'VPA' },
            { headerName: 'Total', field: 'Total' },   

        ]}];
        

    
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}


// DECLARE @cols AS NVARCHAR(MAX);
//             DECLARE @query AS NVARCHAR(MAX);

//             -- Get the list of specific organization names from tbl_litigation_cases for the required organizations
//             SELECT
//                 @cols = STRING_AGG(QUOTENAME(organisation_name), ',')
//             FROM (
//                 SELECT DISTINCT organisation_name
//                 FROM [sagarmanthan_revamp].[dbo].[tbl_litigation_cases]
//                 WHERE organisation_name IN (
//                     'Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 
//                     'Jawaharlal Nehru Port Authority', 'Kamarajar Port Limited', 'Mormugao Port Authority', 
//                     'Mumbai Port Authority', 'New Mangalore Port Authority', 'Paradip Port Authority', 
//                     'Syama Prasad Mookeerjii Port', 'V.O. Chidambaranar Port Authority', 'Visakhapatnam Port Authority'
//                 ) 
//                 AND organisation_name IS NOT NULL
//             ) AS orgs;

//             -- Construct the dynamic SQL query
//             SET @query = '
//             WITH CaseData AS (
//                 SELECT
//                     d.domain_name AS Domain,
//                     sd.sub_domain_name AS Sub_Domain,
//                     lc.organisation_name AS Organization,
//                     COUNT(lc.case_id) AS case_id
//                 FROM [sagarmanthan_revamp].[dbo].[tbl_litigation_cases] lc
//                 LEFT JOIN [sagarmanthan_revamp].[dbo].[mmt_domain] d
//                     ON TRY_CAST(lc.domain AS INT) = d.domain_id
//                 LEFT JOIN [sagarmanthan_revamp].[dbo].[mmt_sub_domain] sd
//                     ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
//                 WHERE lc.organisation_name IN (
//                     ''Chennai Port Authority'', ''Cochin Port Authority'', ''Deendayal Port Authority'', 
//                     ''Jawaharlal Nehru Port Authority'', ''Kamarajar Port Limited'', ''Mormugao Port Authority'', 
//                     ''Mumbai Port Authority'', ''New Mangalore Port Authority'', ''Paradip Port Authority'', 
//                     ''Syama Prasad Mookeerjii Port'', ''V.O. Chidambaranar Port Authority'', ''Visakhapatnam Port Authority''
//                 )
//                 GROUP BY
//                     d.domain_name,
//                     sd.sub_domain_name,
//                     lc.organisation_name
//             ),
//             PivotData AS (
//                 SELECT
//                     Domain,
//                     Sub_Domain,
//                     ' + @cols + '
//                 FROM CaseData
//                 PIVOT (
//                     SUM(case_id)
//                     FOR Organization IN (' + @cols + ')
//                 ) AS PivotTable
//             )
//             SELECT 
//                 Domain, 
//                 Sub_Domain, 
//                 ' + @cols + ',
//                 -- Calculate the total for each row by summing all the organization columns and handling NULLs
//                 ISNULL([Mormugao Port Authority], 0) + 
//                 ISNULL([New Mangalore Port Authority], 0) + 
//                 ISNULL([Paradip Port Authority], 0) + 
//                 ISNULL([Cochin Port Authority], 0) + 
//                 ISNULL([Kamarajar Port Limited], 0) + 
//                 ISNULL([Deendayal Port Authority], 0) + 
//                 ISNULL([Chennai Port Authority], 0) + 
//                 ISNULL([V.O. Chidambaranar Port Authority], 0) + 
//                 ISNULL([Visakhapatnam Port Authority], 0) + 
//                 ISNULL([Jawaharlal Nehru Port Authority], 0) AS Total
//             FROM PivotData
//             ORDER BY
//                 Domain, Sub_Domain;
//             ';

//             -- Execute the dynamic query
//             EXEC sp_executesql @query;
 
 

async function getLitigaitonDomainAndSubDomainReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.query(`

            SELECT 
                    -- Include Domain ID and Domain Name from the mmt_domain table
                    mmt_domain.domain_id AS [Domain ID], 
                    mmt_domain.domain_name AS [Domain Name],

                    -- The sub_domain details from the mmt_sub_domain table or NULL if there is no sub_domain
                    mmt_sub_domain.sub_domain_id AS [Sub Domain ID],
                    mmt_sub_domain.sub_domain_name AS [Sub Domain Name],
                    
                    -- Counting cases per organization
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
                    
                    -- Calculate total count of cases across all organizations
                    SUM(
                        CASE WHEN tbl_litigation_cases.organisation_name IN 
                            ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                            'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                            'Paradip Port Authority','SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex', 'V.O. Chidambaranar Port Authority',
                            'Visakhapatnam Port Authority') 
                        THEN 1 ELSE 0 END
                    ) AS [Total]
                FROM 
                    -- mmt_sub_domain is being left joined with tbl_litigation_cases
                    mmt_sub_domain
                LEFT JOIN 
                    tbl_litigation_cases 
                    ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain  AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
                LEFT JOIN 
                    mmt_domain 
                    ON mmt_sub_domain.domain_id = mmt_domain.domain_id
                GROUP BY 
                    mmt_domain.domain_id, 
                    mmt_domain.domain_name,
                    mmt_sub_domain.sub_domain_id, 
                    mmt_sub_domain.sub_domain_name

                -- UNION to include the cases where sub_domain is NULL in the tbl_litigation_cases table
                UNION ALL

                SELECT 
                    NULL AS [Domain ID], -- NULL for domain_id
                    'NULL' AS [Domain Name], -- 'NULL' as a string for domain_name

                    -- NULL for sub_domain_id and sub_domain_name
                    NULL AS [Sub Domain ID], -- NULL for sub_domain_id
                    'NULL' AS [Sub Domain Name], -- 'NULL' as a string for sub_domain_name
                    
                    -- For counting NULL sub_domain cases (only for the specified organizations)
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Chennai Port Authority' THEN 1 ELSE 0 END) AS [ChPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Cochin Port Authority' THEN 1 ELSE 0 END) AS [CoPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Deendayal Port Authority' THEN 1 ELSE 0 END) AS [DPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Jawaharlal Nehru Port Authority' THEN 1 ELSE 0 END) AS [JNPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Kamarajar Port Limited' THEN 1 ELSE 0 END) AS [KPL],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mormugao Port Authority' THEN 1 ELSE 0 END) AS [MgPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Mumbai Port Authority' THEN 1 ELSE 0 END) AS [MbPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'New Mangalore Port Authority' THEN 1 ELSE 0 END) AS [NMPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Paradip Port Authority' THEN 1 ELSE 0 END) AS [PPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Kolkata Dock System' THEN 1 ELSE 0 END) AS [SMPA-KDS],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'SMPA - Haldia Dock Complex' THEN 1 ELSE 0 END) AS [SMPA-HDC],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'V.O. Chidambaranar Port Authority' THEN 1 ELSE 0 END) AS [VoCPA],
                    SUM(CASE WHEN tbl_litigation_cases.organisation_name = 'Visakhapatnam Port Authority' THEN 1 ELSE 0 END) AS [VPA],
                    
                    -- Total for NULL sub_domain cases in tbl_litigation_cases for the specified organizations
                    SUM(
                        CASE WHEN tbl_litigation_cases.sub_domain IS NULL
                            AND tbl_litigation_cases.organisation_name IN 
                                ('Chennai Port Authority', 'Cochin Port Authority', 'Deendayal Port Authority', 'Jawaharlal Nehru Port Authority',
                                'Kamarajar Port Limited', 'Mormugao Port Authority', 'Mumbai Port Authority', 'New Mangalore Port Authority', 
                                'Paradip Port Authority','SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex', 'V.O. Chidambaranar Port Authority',
                                'Visakhapatnam Port Authority') 
                        THEN 1 ELSE 0 END
                    ) AS [Total]
                FROM 
                    tbl_litigation_cases
                WHERE 
                    tbl_litigation_cases.sub_domain IS NULL  AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
                GROUP BY 
                    tbl_litigation_cases.sub_domain;

            
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
                width: 350,
                pinned: true
            },
          
            {
                headerName: 'Sub Domain ID', 
                field: 'Sub Domain ID', 
                width: 100,
                hide: true
            },
            { 
                headerName: 'Sub Domain Name', 
                field: 'Sub Domain Name', 
                width: 350,
                pinned: true
            },
               
            
               {
            headerName: "Number of Active Cases",
            headerClass: "headercenter",
            cellStyle: { textAlign: 'center' },

            children: [
            { headerName: 'Chennai Port Authority', field: 'ChPA' },
            { headerName: 'Cochin Port Authority', field: 'CoPA' },
            { headerName: 'Deendayal Port Authority', field: 'DPA' },
            { headerName: 'Jawaharlal Nehru Port Authority', field: 'JNPA' },
            { headerName: 'Kamarajar Port Limited', field: 'KPL' },   
            { headerName: 'Mormugao Port Authority', field: 'MgPA' },
            { headerName: 'Mumbai Port Authority', field: 'MbPA' },
            { headerName: 'New Mangalore Port Authority', field: 'NMPA'},
            { headerName: 'Paradip Port Authority', field: 'PPA' },
            { headerName: 'SMPA - Kolkata Dock System', field: 'SMPA-KDS'},
            { headerName: 'SMPA - Haldia Dock Complex', field: 'SMPA-HDC'},
            { headerName: 'V.O. Chidambaranar Port Authority', field: 'VoCPA' },
            { headerName: 'Visakhapatnam Port Authority', field: 'VPA' },
            { headerName: 'Total', field: 'Total' },   

         ]}];

    
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}


async function getLitigaitonPendencyPortWiseReport(req, res) {
  try {
    const conn = await pool;
    const result = await conn.query(`
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
        WHERE organisation_name IN (
          'Chennai Port Authority','Cochin Port Authority','Deendayal Port Authority',
          'Jawaharlal Nehru Port Authority','Kamarajar Port Limited','Mormugao Port Authority',
          'Mumbai Port Authority','New Mangalore Port Authority','Paradip Port Authority',
          'SMPA - Kolkata Dock System','SMPA - Haldia Dock Complex',
          'V.O. Chidambaranar Port Authority','Visakhapatnam Port Authority'
        )AND (stage_id IS NULL OR stage_id <> 7)
      ),
      PivotData AS (
        SELECT 
          organisation_name AS port,
          YearGroup,
          COUNT(*) AS CaseCount
        FROM DateRanges
        GROUP BY organisation_name, YearGroup
      )
      SELECT Port, YearGroup, CaseCount
      FROM PivotData
    `);

    const raw = result.recordset;
    if (!raw.length) return res.status(404).json({ error: 'No data available.' });

    // Extract unique YearGroups and Ports
    const years = [...new Set(raw.map(r => r.YearGroup))].sort();
    const ports = [...new Set(raw.map(r => r.Port))].sort();

    const columnDefs = [
  {
    headerName: "Organisation",
    field: "port",
    width: 200,
    pinned: "left"
  },

  {
    headerName: "Number of Active Cases",
    headerClass: "headercenter",
    marryChildren: true,
    children: [
      ...years.map(year => ({
        headerName: year,
        field: year,
        type: 'numericColumn',
        cellStyle: { textAlign: 'center' }
      }))
    ]
  },

  {
    headerName: "Total",
    field: "Total",
    width: 120,
    type: 'numericColumn',
    cellStyle: { textAlign: 'center' }
  }
];

    const rowData = ports.map(port => {
      const row = { port };
      let total = 0;
      years.forEach(year => {
        const rec = raw.find(r => r.Port === port && r.YearGroup === year);
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
    res.status(500).send('Internal Server Error');
  }
  
}



// DECLARE @sql NVARCHAR(MAX);
// DECLARE @year INT;
// DECLARE @dynamic_years NVARCHAR(MAX);

// -- Base part of the query
// SET @sql = N'SELECT ISNULL(md.[domain_name], ''Unknown Domain'') AS [domain_name], ';

// -- Add fixed columns
// SET @sql = @sql + N'
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] IS NULL THEN lc.[case_id] END) AS [No Date Provided], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] < ''2000-01-01'' THEN lc.[case_id] END) AS [Prior to 2000], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2000-01-01'' AND lc.[file_on_date] < ''2010-01-01'' THEN lc.[case_id] END) AS [2000-2010], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2010-01-01'' AND lc.[file_on_date] < ''2016-01-01'' THEN lc.[case_id] END) AS [2010-2015], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2016-01-01'' AND lc.[file_on_date] < ''2021-01-01'' THEN lc.[case_id] END) AS [2016-2020], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2021-01-01'' AND lc.[file_on_date] < ''2023-01-01'' THEN lc.[case_id] END) AS [2021-2022], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2023-01-01'' AND lc.[file_on_date] < ''2025-01-01'' THEN lc.[case_id] END) AS [2023-2024], 
//     COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''2025-01-01'' THEN lc.[case_id] END) AS [2025],';

// -- Find years with cases dynamically
// SET @dynamic_years = '';

// -- Loop through the years starting from 2026 and check if they have data
// SET @year = 2026;
// WHILE @year <= 2700
// BEGIN
//     -- Check if there are records for the current year
//     IF EXISTS (SELECT 1 
//                FROM [sagarmanthan_revamp].[dbo].[tbl_litigation_cases] lc
//                WHERE TRY_CAST(lc.[file_on_date] AS DATE) IS NOT NULL
//                  AND YEAR(TRY_CAST(lc.[file_on_date] AS DATE)) = @year)
//     BEGIN
//         SET @dynamic_years = @dynamic_years + N'
//         COUNT(DISTINCT CASE WHEN lc.[file_on_date] >= ''' + CAST(@year AS VARCHAR) + N'-01-01'' AND lc.[file_on_date] < ''' + CAST(@year + 1 AS VARCHAR) + N'-01-01'' THEN lc.[case_id] END) AS [' + CAST(@year AS VARCHAR) + '],' ;
//     END
    
//     SET @year = @year + 1;
// END

// -- Remove the trailing comma from @dynamic_years
// SET @dynamic_years = LEFT(@dynamic_years, LEN(@dynamic_years) - 1);

// -- Add the dynamic years part to the query
// SET @sql = @sql + @dynamic_years;

// -- Finish the query
// SET @sql = @sql + N'
// FROM 
//     [sagarmanthan_revamp].[dbo].[tbl_litigation_cases] lc
// LEFT JOIN 
//     [sagarmanthan_revamp].[dbo].[mmt_domain] md ON lc.[domain] = md.[domain_id]
// WHERE 
//     (lc.[is_final_order_or_judgement_passed] = 0 OR lc.[is_final_order_or_judgement_passed] IS NULL)
// GROUP BY 
//     md.[domain_name]
// ORDER BY 
//     [domain_name];';

// -- Execute the dynamic SQL
// EXEC sp_executesql @sql;


// WITH DateRanges AS (
//     SELECT 
//         -- Static Date Ranges
//         CASE 
//             WHEN tbl_litigation_cases.file_on_date IS NULL THEN 'No Date Provided'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2000-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2010-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2016-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2021-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2023-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2025-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2026-01-01' THEN '2025'
//             ELSE 'Invalid Date'
//         END AS [Date Range],

//         -- Dynamic domain count logic
//         SUM(CASE WHEN mmt_domain.domain_name = 'Service Matters' THEN 1 ELSE 0 END) AS [Service Matters],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Land Related' THEN 1 ELSE 0 END) AS [Land Related],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Admiralty Suits' THEN 1 ELSE 0 END) AS [Admiralty Suits],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Vigilance' THEN 1 ELSE 0 END) AS [Vigilance],
//         SUM(CASE WHEN mmt_domain.domain_name = 'PPP' THEN 1 ELSE 0 END) AS [PPP],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Tax Matters' THEN 1 ELSE 0 END) AS [Tax Matters],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Public Interest Litigation' THEN 1 ELSE 0 END) AS [Public Interest Litigation],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Commercial Matters' THEN 1 ELSE 0 END) AS [Commercial Matters],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Student Matters' THEN 1 ELSE 0 END) AS [Student Matters],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Others' THEN 1 ELSE 0 END) AS [Others],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Maritime Training' THEN 1 ELSE 0 END) AS [Maritime Training],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Seafarers' THEN 1 ELSE 0 END) AS [Seafarers],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Safety & Navigation' THEN 1 ELSE 0 END) AS [Safety & Navigation],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Directorate General of Shipping (Hqs)' THEN 1 ELSE 0 END) AS [DG Shipping Hqs],
//         SUM(CASE WHEN mmt_domain.domain_name = 'HR' THEN 1 ELSE 0 END) AS [HR],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Policy' THEN 1 ELSE 0 END) AS [Policy],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Contract' THEN 1 ELSE 0 END) AS [Contract],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Compensation' THEN 1 ELSE 0 END) AS [Compensation],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Consumer Dispute' THEN 1 ELSE 0 END) AS [Consumer Dispute],
//         SUM(CASE WHEN mmt_domain.domain_name = 'Criminal Matters' THEN 1 ELSE 0 END) AS [Criminal Matters],

//         -- Handle cases where domain is NULL but file_on_date is not NULL
//         SUM(CASE WHEN mmt_domain.domain_id IS NULL AND tbl_litigation_cases.file_on_date IS NOT NULL THEN 1 ELSE 0 END) AS [NULL],

//         -- Total count of cases across all domains
//         SUM(CASE WHEN mmt_domain.domain_name IN ('Service Matters', 'Land Related', 'Admiralty Suits', 'Vigilance', 'PPP', 
//                                                 'Tax Matters', 'Public Interest Litigation', 'Commercial Matters', 'Student Matters', 
//                                                 'Others', 'Maritime Training', 'Seafarers', 'Safety & Navigation', 'Directorate General of Shipping (Hqs)', 
//                                                 'HR', 'Policy', 'Contract', 'Compensation', 'Consumer Dispute', 'Criminal Matters') 
//                 THEN 1 ELSE 0 END) AS [Total]

//     FROM 
//         tbl_litigation_cases
//     LEFT JOIN mmt_domain ON tbl_litigation_cases.domain = mmt_domain.domain_id
//     GROUP BY
//         CASE 
//             WHEN tbl_litigation_cases.file_on_date IS NULL THEN 'No Date Provided'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2000-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2010-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2016-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2021-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2023-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
//             WHEN TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) >= '2025-01-01' AND TRY_CAST(tbl_litigation_cases.file_on_date AS DATE) < '2026-01-01' THEN '2025'
//             ELSE 'Invalid Date'
//         END
// ),
// DynamicYears AS (
//     -- Identify dynamic years starting from 2026 based on file_on_date and excluding those without data
//     SELECT DISTINCT YEAR(TRY_CAST(tbl_litigation_cases.file_on_date AS DATE)) AS Year
//     FROM tbl_litigation_cases
//     WHERE YEAR(TRY_CAST(tbl_litigation_cases.file_on_date AS DATE)) >= 2026
// )
// SELECT * FROM DateRanges

// -- Add dynamic years starting from 2026 only if data exists for those years
// UNION ALL
// SELECT
//     CAST(DynamicYears.Year AS VARCHAR(4)) AS [Date Range],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Service Matters' THEN 1 ELSE 0 END) AS [Service Matters],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Land Related' THEN 1 ELSE 0 END) AS [Land Related],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Admiralty Suits' THEN 1 ELSE 0 END) AS [Admiralty Suits],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Vigilance' THEN 1 ELSE 0 END) AS [Vigilance],
//     SUM(CASE WHEN mmt_domain.domain_name = 'PPP' THEN 1 ELSE 0 END) AS [PPP],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Tax Matters' THEN 1 ELSE 0 END) AS [Tax Matters],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Public Interest Litigation' THEN 1 ELSE 0 END) AS [Public Interest Litigation],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Commercial Matters' THEN 1 ELSE 0 END) AS [Commercial Matters],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Student Matters' THEN 1 ELSE 0 END) AS [Student Matters],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Others' THEN 1 ELSE 0 END) AS [Others],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Maritime Training' THEN 1 ELSE 0 END) AS [Maritime Training],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Seafarers' THEN 1 ELSE 0 END) AS [Seafarers],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Safety & Navigation' THEN 1 ELSE 0 END) AS [Safety & Navigation],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Directorate General of Shipping (Hqs)' THEN 1 ELSE 0 END) AS [DG Shipping Hqs],
//     SUM(CASE WHEN mmt_domain.domain_name = 'HR' THEN 1 ELSE 0 END) AS [HR],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Policy' THEN 1 ELSE 0 END) AS [Policy],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Contract' THEN 1 ELSE 0 END) AS [Contract],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Compensation' THEN 1 ELSE 0 END) AS [Compensation],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Consumer Dispute' THEN 1 ELSE 0 END) AS [Consumer Dispute],
//     SUM(CASE WHEN mmt_domain.domain_name = 'Criminal Matters' THEN 1 ELSE 0 END) AS [Criminal Matters],
//     -- Handle cases where domain is NULL but file_on_date is not NULL
//     SUM(CASE WHEN mmt_domain.domain_id IS NULL AND tbl_litigation_cases.file_on_date IS NOT NULL THEN 1 ELSE 0 END) AS [NULL],
//     SUM(CASE 
//         WHEN mmt_domain.domain_name IN ('Service Matters', 'Land Related', 'Admiralty Suits', 'Vigilance', 'PPP', 
//                                         'Tax Matters', 'Public Interest Litigation', 'Commercial Matters', 'Student Matters', 
//                                         'Others', 'Maritime Training', 'Seafarers', 'Safety & Navigation', 'Directorate General of Shipping (Hqs)', 
//                                         'HR', 'Policy', 'Contract', 'Compensation', 'Consumer Dispute', 'Criminal Matters') 
//         THEN 1 ELSE 0 END
//     ) AS [Total]
// FROM 
//     tbl_litigation_cases
// LEFT JOIN mmt_domain ON tbl_litigation_cases.domain = mmt_domain.domain_id
// JOIN DynamicYears ON YEAR(TRY_CAST(tbl_litigation_cases.file_on_date AS DATE)) = DynamicYears.Year
// GROUP BY DynamicYears.Year
// ORDER BY [Date Range];


async function getLitigaitonPendencyDomainWiseReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.query(`
            -- Generate the dynamic pivot query
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @domainList AS NVARCHAR(MAX);
            DECLARE @yearList AS NVARCHAR(MAX);
            DECLARE @pivotColumns AS NVARCHAR(MAX);

            -- Domains
            SELECT @domainList = STRING_AGG('''' + domain_name + '''', ', ')
            FROM mmt_domain;

            -- Date Ranges
            SELECT @yearList = STRING_AGG('[' + [Date Range] + ']', ', ')
            FROM (
                SELECT DISTINCT
                    CASE 
                        WHEN file_on_date IS NULL THEN 'No Date Provided'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2026-01-01' THEN '2025'
                        ELSE 'Invalid Date'
                    END AS [Date Range]
                FROM tbl_litigation_cases
            ) AS years;

            -- Build final SQL with pivot
            SET @sql = '
            SELECT *
            FROM (
                SELECT 
                    ISNULL(mmt_domain.domain_name, ''NULL'') AS domain,
                    CASE 
                        WHEN file_on_date IS NULL THEN ''No Date Provided''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2000-01-01'' THEN ''2000 or Earlier''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2010-01-01'' THEN ''2000-2010''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2016-01-01'' THEN ''2010-2015''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2021-01-01'' THEN ''2016-2020''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2023-01-01'' THEN ''2021-2022''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2025-01-01'' THEN ''2023-2024''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2026-01-01'' THEN ''2025''
                        ELSE ''Invalid Date''
                    END AS [Date Range]
                FROM tbl_litigation_cases
                LEFT JOIN mmt_domain ON tbl_litigation_cases.domain = mmt_domain.domain_id
                WHERE tbl_litigation_cases.organisation_id IN (1,2,3,4,5,6,7,8,9,10,11,12,54,55) AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
            ) AS SourceTable
            PIVOT (
                COUNT([Date Range])
                FOR [Date Range] IN (' + @yearList + ')
            ) AS PivotTable
            ORDER BY domain;
            ';

            EXEC sp_executesql @sql;


            `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }

        // extract dynamic domain names from the row data
        const domainColumns = Object.keys(rowData[0]).filter(column => column !== 'Date Range' && column !== 'NULL' && column !== 'Total');
        
        // Sort domain columns alphabetically
        const sortedDomainColumns = domainColumns.sort();

        // Create column definitions dynamically
       const yearColumns = Object.keys(rowData[0]).filter(col => col !== 'domain').sort();

      
        const columnDefs = [
        {
            headerName: 'Domain',
            field: 'domain',
            width: 200,
            pinned: 'left',
            sortable: true,
            filter: true
        },

        {
            headerName: "Number of Active Cases",
            headerClass: "headercenter",
            marryChildren: true,
            cellStyle: { textAlign: 'center' },
            children: [
            ...yearColumns.map(year => ({
                headerName: year,
                field: year,
                sortable: true,
                filter: true,
                type: 'numericColumn',
                cellStyle: { textAlign: 'center' }
            }))
            ]
        }
        ];
            
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}


async function getAllLitigationData(req,res) {
    
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    request.input("userID",userID );
    try {
        const userResult = await conn.query(` SELECT role_id,organisation_id FROM tbl_user WHERE user_id = ${userID} `);
        const { role_id,organisation_id  } = userResult.recordset[0];
        let result;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            result = await conn.query(`SELECT
            ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
            org.organisation_id AS [organisation_id],
            org.organisation_name AS [Organisation Name],
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
                WHEN lc.amounts_of_any_rewarded = 1 THEN 'No Amount'
                WHEN lc.amounts_of_any_rewarded = 2 THEN 'Claim'
                WHEN lc.amounts_of_any_rewarded = 3 THEN 'Counter Claim'
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
        FROM mmt_organisation org
        INNER JOIN tbl_litigation_cases lc ON org.organisation_id = lc.organisation_id  
        LEFT JOIN mmt_domain d ON lc.domain = d.domain_id 
        LEFT JOIN mmt_sub_domain sd ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
        LEFT JOIN mmt_court_type ct ON lc.court_type = ct.court_type_id
        LEFT JOIN mmt_court_sub_type st ON lc.sub_court = st.court_sub_type_id
        LEFT JOIN mmt_court_case_type caty ON lc.case_type = caty.case_type_id
        LEFT JOIN tbl_court_case_organisations pe ON TRY_CAST(lc.petitioners AS INT) = pe.organisation_id
        LEFT JOIN tbl_court_case_organisations res ON TRY_CAST(lc.respondents AS INT) = res.organisation_id
        LEFT JOIN tbl_court_case_departments de ON TRY_CAST(lc.dept_division AS INT) = de.department_id
        LEFT JOIN mmt_bench_seat bench ON lc.bench_seat = bench.bench_id
        LEFT JOIN mmt_court_consumer_sub_type con ON lc.consumer_forum = con.consumer_sub_type_id
        LEFT JOIN mmt_court_case_acts act ON lc.acts = act.act_id
        LEFT JOIN mmt_court_case_rules rul ON lc.rules = rul.rule_id
        LEFT JOIN mmt_state stat ON lc.state = stat.state_id
        LEFT JOIN mmt_district dis ON lc.district = dis.district_id
        LEFT JOIN tbl_litigation_pettioners_respondents lps ON lc.case_id = lps.case_id
        ORDER BY org.organisation_id;
    `);
        }else{
            request.input("organisation_id", organisation_id);
            result = await request.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisation Id],
                    org.organisation_name AS [Organisation Name],
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
                    case 
                        WHEN lc.pre_connected_cases = 1 THEN 'Yes'
                        WHEN lc.pre_connected_cases = 0 THEN 'No'
                        END AS [Pre-connected Cases],
                    case 
                        WHEN lc.counter_claim_amount_or_not = 1 THEN 'Yes'
                        WHEN lc.counter_claim_amount_or_not = 0 THEN 'No'
                        END AS [Is Counter Claim Filed?],
                    lc.counter_claim_amount AS [Counter Claim Amount],
                    lc.claim_amount AS [Claim Amount],
                    case 
                        WHEN lc.is_ministry_party = 1 THEN 'Yes'
                        WHEN lc.is_ministry_party = 0 THEN 'No'
                        END AS [Is Ministry a Party?],
                    lc.type_of_party AS [Type of Party],
                    lc.role_of_ministry AS [Role of Ministry],
                    case 
                        WHEN lc.is_behalf_of_ministry = 1 THEN 'Yes'
                        WHEN lc.is_behalf_of_ministry = 0 THEN 'No'
                        END AS [Is the Case Filed on Behalf of the Ministry?],
                    case 
                        WHEN lc.is_ministry_challenged = 1 THEN 'Challenged'
                        WHEN lc.is_ministry_challenged = 2 THEN 'Invoked'
                        WHEN lc.is_ministry_challenged = 0 THEN 'No'
                        END AS [Is Ministry Challenged?],
                    lc.document_challenged AS [Challenged Document],
                    lc.document_invoked AS [Invoked Document],
                    lc.details AS [Document Details],
                    case 
                        WHEN lc.is_ministry_intervention_required = 1 THEN 'Yes'
                        WHEN lc.is_ministry_intervention_required = 0 THEN 'No'
                        END AS [Is Ministry Intervention Required?],
                    lc.nature_of_action_required AS [Nature of Action Required],
                    lc.intervention_description AS[Intervention Description],
                    lc.date_of_intervention_required AS [Intervention Required By Date],
                    case 
                        WHEN lc.is_execution_required = 1 THEN 'Yes'
                        WHEN lc.is_execution_required = 0 THEN 'No'
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
                    case 
                        WHEN lc.is_counter_affidavit_filed = 1 THEN 'Yes'
                        WHEN lc.is_counter_affidavit_filed = 0 THEN 'No'
                        END AS [Is Counter Affidavit Filed?],
                    case 
                        WHEN lc.is_hearing_started = 1 THEN 'Yes'
                        WHEN lc.is_hearing_started = 0 THEN 'No'
                        END AS [Is Hearing Started?],
                    case 
                        WHEN lc.is_interim_order = 1 THEN 'Yes'
                        WHEN lc.is_interim_order = 0 THEN 'No'
                        END AS [Is Interim Order Passed?],

                    CASE 
                        WHEN lc.is_final_order_or_judgement_passed = 1 THEN 'Yes'
                        WHEN lc.is_final_order_or_judgement_passed = 0 THEN 'No'
                        END AS [Is Final Order/Judgement Passed?],
                    lc.date_of_final_order AS [Date of Final Order],
                    lc.nature_of_judgement AS [Nature of Judgement],
                    CASE 
                        WHEN lc.amounts_of_any_rewarded = 1 THEN 'No Amount'
                        WHEN lc.amounts_of_any_rewarded = 2 THEN 'Claim'
                        WHEN lc.amounts_of_any_rewarded = 3 THEN 'Counter Claim'
                        END AS [Total Rewarded Amounts],
                    CASE 
                        WHEN lc.is_action_required_for_complaince = 1 THEN 'Yes'
                        WHEN lc.is_action_required_for_complaince = 0 THEN 'No'
                        END AS [Is Action Required for Compliance?],
                    lc.last_date_for_complaince AS [Compliance Deadline],
                    lc.judgement_accepted AS [Is Judgement Accepted?],
                    CASE 
                        WHEN lc.is_order_complied = 1 THEN 'Yes'
                        WHEN lc.is_order_complied = 0 THEN 'No'
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
                    lc.court_complex AS [Court Complex] ,
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
                    FROM mmt_organisation org
                    LEFT JOIN tbl_litigation_cases lc ON org.organisation_id = lc.organisation_id 
                    LEFT JOIN mmt_domain d ON lc.domain = d.domain_id 
                    LEFT JOIN mmt_sub_domain sd ON TRY_CAST(lc.sub_domain AS INT) = sd.sub_domain_id
                    LEFT JOIN mmt_court_type ct ON lc.court_type = ct.court_type_id
                    LEFT JOIN mmt_court_sub_type st ON lc.sub_court = st.court_sub_type_id
                    LEFT JOIN mmt_court_case_type caty ON lc.case_type = caty.case_type_id
                    LEFT JOIN tbl_court_case_organisations pe ON TRY_CAST(lc.petitioners AS INT) = pe.organisation_id
                    LEFT JOIN tbl_court_case_organisations res ON TRY_CAST(lc.respondents AS INT) = res.organisation_id
                    LEFT JOIN tbl_court_case_departments de ON TRY_CAST(lc.dept_division AS INT) = de.department_id
                    LEFT JOIN mmt_bench_seat bench ON lc.bench_seat = bench.bench_id
                    LEFT JOIN mmt_court_consumer_sub_type con ON lc.consumer_forum = con.consumer_sub_type_id
                    LEFT JOIN mmt_court_case_acts act ON lc.acts = act.act_id
                    LEFT JOIN mmt_court_case_rules rul ON lc.rules = rul.rule_id
                    LEFT JOIN mmt_state stat ON lc.state = stat.state_id
                    LEFT JOIN mmt_district dis ON lc.district = dis.district_id
                    LEFT JOIN tbl_litigation_pettioners_respondents lps ON lc.case_id = lps.case_id
                WHERE org.organisation_id = @organisation_id
            `); 
        }
        res.json(result.recordset);
        console.log(result.recordset,"record")
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({error: "Internal Server Error" });
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

async function getLitigaitonDomainByOtherOrgReport(req, res) {
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

async function getLitigaitonSubDomainByOtherOrgReport(req,res) {
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
async function getLitigaitonDomainAndSubDomainByOtherOrgReport(req,res) {
    try {
        const conn = await pool;

        const result = await conn.query(`

            SELECT 
                    -- Include Domain ID and Domain Name from the mmt_domain table
                    mmt_domain.domain_id AS [Domain ID], 
                    mmt_domain.domain_name AS [Domain Name],

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
                    tbl_litigation_cases 
                    ON mmt_sub_domain.sub_domain_id = tbl_litigation_cases.sub_domain AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
                LEFT JOIN 
                    mmt_domain 
                    ON mmt_sub_domain.domain_id = mmt_domain.domain_id
                GROUP BY 
                    mmt_domain.domain_id, 
                    mmt_domain.domain_name,
                    mmt_sub_domain.sub_domain_id, 
                    mmt_sub_domain.sub_domain_name

                -- UNION to include the cases where sub_domain is NULL in the tbl_litigation_cases table
                UNION ALL

                SELECT 
                    NULL AS [Domain ID], -- NULL for domain_id
                    'NULL' AS [Domain Name], -- 'NULL' as a string for domain_name

                    -- NULL for sub_domain_id and sub_domain_name
                    NULL AS [Sub Domain ID], -- NULL for sub_domain_id
                    'NULL' AS [Sub Domain Name], -- 'NULL' as a string for sub_domain_name
                    
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
                    
                    -- Total for NULL sub_domain cases in tbl_litigation_cases for the specified organizations
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
                headerName: 'Domain ID', 
                field: 'Domain ID', 
                width: 100,
                hide: true
            },
            { 
                headerName: 'Domain Name', 
                field: 'Domain Name', 
                width: 350,
                pinned: true
            },
          
            {
                headerName: 'Sub Domain ID', 
                field: 'Sub Domain ID', 
                width: 100,
                hide: true
            },
            { 
                headerName: 'Sub Domain Name', 
                field: 'Sub Domain Name', 
                width: 350,
                pinned: true
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

async function getLitigaitonPendencyOtherOrgWiseReport(req,res) {
    try {
    const conn = await pool;
    const result = await conn.query(`
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
        WHERE organisation_name IN (
          'Andaman, Lakshadweep Harbour Works', 'Cochin Shipyard Limited', 'Dredging Corporation of India', 'Directorate General of Lighthouses and Lightships',
        'Directorate General of Shipping, Mumbai', 'Indian Maritime University', 'Indian Ports Rail Corporation Limited', 'Inland Waterways Authority of India', 
        'Shipping Corporation of India', 'Sagarmala Development Company Limited'
        ) AND (stage_id IS NULL OR stage_id <> 7)
      ),
      PivotData AS (
        SELECT 
          organisation_name AS port,
          YearGroup,
          COUNT(*) AS CaseCount
        FROM DateRanges
        GROUP BY organisation_name, YearGroup
      )
      SELECT Port, YearGroup, CaseCount
      FROM PivotData
    `);

    const raw = result.recordset;
    if (!raw.length) return res.status(404).json({ error: 'No data available.' });

    // Extract unique YearGroups and Ports
    const years = [...new Set(raw.map(r => r.YearGroup))].sort();
    const ports = [...new Set(raw.map(r => r.Port))].sort();

    // Build columns and data
   const columnDefs = [
  {
    headerName: 'Organisation',
    field: 'port',
    width: 180,
    pinned: 'left'
  },

  {
    headerName: "Number of Active Cases",
    headerClass: "headercenter",
    marryChildren: true,
    cellStyle: { textAlign: 'center' },
    children: [
      ...years.map(year => ({
        headerName: year,
        field: year,
        type: 'numericColumn',
        cellStyle: { textAlign: 'center' }
      }))
    ]
  },

  {
    headerName: 'Total',
    field: 'Total',
    width: 120,
    type: 'numericColumn',
    cellStyle: { textAlign: 'center' }
  }
];

    const rowData = ports.map(port => {
      const row = { port };
      let total = 0;
      years.forEach(year => {
        const rec = raw.find(r => r.Port === port && r.YearGroup === year);
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
    res.status(500).send('Internal Server Error');
  }
}

async function getLitigaitonPendencyDomainWiseOtherOrgReport(req,res) {
   try {
        const conn = await pool;

        const result = await conn.query(`
            -- Generate the dynamic pivot query
            DECLARE @sql AS NVARCHAR(MAX);
            DECLARE @domainList AS NVARCHAR(MAX);
            DECLARE @yearList AS NVARCHAR(MAX);
            DECLARE @pivotColumns AS NVARCHAR(MAX);

            -- Domains
            SELECT @domainList = STRING_AGG('''' + domain_name + '''', ', ')
            FROM mmt_domain;

            -- Date Ranges
            SELECT @yearList = STRING_AGG('[' + [Date Range] + ']', ', ')
            FROM (
                SELECT DISTINCT
                    CASE 
                        WHEN file_on_date IS NULL THEN 'No Date Provided'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2000-01-01' THEN '2000 or Earlier'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2010-01-01' THEN '2000-2010'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2016-01-01' THEN '2010-2015'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2021-01-01' THEN '2016-2020'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2023-01-01' THEN '2021-2022'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2025-01-01' THEN '2023-2024'
                        WHEN TRY_CAST(file_on_date AS DATE) < '2026-01-01' THEN '2025'
                        ELSE 'Invalid Date'
                    END AS [Date Range]
                FROM tbl_litigation_cases
            ) AS years;

            -- Build final SQL with pivot
            SET @sql = '
            SELECT *
            FROM (
                SELECT 
                    ISNULL(mmt_domain.domain_name, ''NULL'') AS domain,
                    CASE 
                        WHEN file_on_date IS NULL THEN ''No Date Provided''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2000-01-01'' THEN ''2000 or Earlier''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2010-01-01'' THEN ''2000-2010''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2016-01-01'' THEN ''2010-2015''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2021-01-01'' THEN ''2016-2020''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2023-01-01'' THEN ''2021-2022''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2025-01-01'' THEN ''2023-2024''
                        WHEN TRY_CAST(file_on_date AS DATE) < ''2026-01-01'' THEN ''2025''
                        ELSE ''Invalid Date''
                    END AS [Date Range]
                FROM tbl_litigation_cases
                LEFT JOIN mmt_domain ON tbl_litigation_cases.domain = mmt_domain.domain_id
                WHERE tbl_litigation_cases.organisation_id IN (23,18,27,19,21,25,20,17,15,225) AND (tbl_litigation_cases.stage_id IS NULL OR tbl_litigation_cases.stage_id <> 7)
            ) AS SourceTable
            PIVOT (
                COUNT([Date Range])
                FOR [Date Range] IN (' + @yearList + ')
            ) AS PivotTable
            ORDER BY domain;
            ';

            EXEC sp_executesql @sql;
            `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }

        // extract dynamic domain names from the row data (assuming these columns come in the result)
        const domainColumns = Object.keys(rowData[0]).filter(column => column !== 'Date Range' && column !== 'NULL' && column !== 'Total');

        // Sort domain columns alphabetically
        const sortedDomainColumns = domainColumns.sort();

        // Create column definitions dynamically
       const yearColumns = Object.keys(rowData[0]).filter(col => col !== 'domain').sort();
        const columnDefs = [
        {
            headerName: 'Domain',
            field: 'domain',
            width: 200,
            pinned: 'left',
            sortable: true,
            filter: true
        },

        {
            headerName: "Number of Active Cases",
            headerClass: "headercenter",
            marryChildren: true,
            cellStyle: { textAlign: 'center' },
            children: [
            ...yearColumns.map(year => ({
                headerName: year,
                field: year,
                sortable: true,
                filter: true,
                type: 'numericColumn',
                cellStyle: { textAlign: 'center' }
            }))
            ]
        }
        ];
    
        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
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
    deletecounterAffiDocument, getLitigaitonDomainReport, getLitigaitonSubDomainReport, getLitigaitonDomainAndSubDomainReport,
    getLitigaitonPendencyPortWiseReport, getLitigaitonPendencyDomainWiseReport,  getAllLitigationData,addLitigationPetitionerAndRespondent,getLitigationPetitionerAndRespondent,
getLitigaitonDomainByOtherOrgReport,getLitigaitonSubDomainByOtherOrgReport,getLitigaitonDomainAndSubDomainByOtherOrgReport,getLitigaitonPendencyOtherOrgWiseReport,
getLitigaitonPendencyDomainWiseOtherOrgReport,checkCaseNumberExists
}














