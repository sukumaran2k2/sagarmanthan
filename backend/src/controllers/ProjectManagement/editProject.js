import multer from 'multer';
import express from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import { CONNREFUSED } from 'dns';


async function addRevisedDate(req, res) 
{
    const projectID                      = req.body.projectID;
    const subProjectID                   = req.body.subProjectID;
    const revisedTargetCompletionDate    = req.body.revisedTargetCompletionDate;

  if (revisedTargetCompletionDate == "") {
        revisedTargetCompletionDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("revisedTargetCompletionDate", revisedTargetCompletionDate);  
    try {
        // if (subProjectID == -1) {
            const result = await request.query(`INSERT INTO tbl_project_target_date_history (project_id, sub_project_id, 
                revised_target_completion_date ) 
                VALUES (@projectID, @subProjectID, @revisedTargetCompletionDate)`
            );

            res.sendStatus(201);

        // }
  
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getRevisedDate(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
console.log(projectID, subProjectID , "gf")

    let getResult;
    if (subProjectID == -1) 
    {
        console.log(subProjectID, "nosubproject")
        
        getResult = (`SELECT  project_id, revised_target_completion_date, revised_on FROM tbl_project_target_date_history
            WHERE project_id = @projectID
            order by revised_on desc;`)
    }
    else 
    {
        console.log(subProjectID, "have subproject")

        getResult = (`SELECT sub_project_id, revised_target_completion_date, revised_on 

            FROM tbl_project_target_date_history
            WHERE sub_project_id = @subProjectID
            order by revised_on desc;
        `)
    }

    try {
        const result = await request.query(getResult);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getEdiProjectData(req, res) 
{
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    let editProjectDetailsData;
    if (subProjectID == -1) 
    {
        // console.log(subProjectID, "nosubproject")
        
        editProjectDetailsData = (`SELECT organisation_id, project_id, project_type, is_sagarmala_funded, project_name, project_brief, sanctioned_cost,
            mode_of_implememtation, implememtation_type, primary_ia_id, secondary_ia_id, project_category_id, scheme_id, initiative_id,
            target_completion_date, project_output_id, project_outcome_id, capacity_addition, source_of_funding_id, gbs_components, 
            iebr_components, ppp_components, loans_components, multilateral_components, state_gov_fund_components, pmmsy_components,
            sagarmala_components, other_source_funding_comp,  estimated_cost, primary_funding_agency_id, secondary_funding_agency_id, 
            state_id, district_id, taluka_id, village_id, mp_constituency_id, on_land_acquisition, land_area_req, 
            on_acquisition_completed, percent_land_acq, submitted_by, project_intiated_date, current_project_stage_id,
            (SELECT TOP 1 revised_target_completion_date 
            FROM tbl_project_target_date_history h 
            WHERE h.project_id = tbl_project.project_id 
            ORDER BY revised_on DESC) AS latest_revised_target_completion_date
        
            FROM tbl_project
            WHERE tbl_project.project_id = @projectID;`)
    }

    // project_intiated_date, removed
    else 
    {
        // console.log(subProjectID, "have subproject")

        editProjectDetailsData = (`SELECT sub_organisation_id AS organisation_id, sub_project_id, project_id, sub_project_type as project_type,
            sub_project_name as project_name, sub_project_brief as project_brief, sub_sanctioned_cost as sanctioned_cost,
            sub_mode_of_implememtation as mode_of_implememtation, sub_is_sagarmala_funded AS is_sagarmala_funded,
            sub_implememtation_type as implememtation_type, sub_primary_ia_id as primary_ia_id, 
            sub_secondary_ia_id as secondary_ia_id, sub_project_category_id as project_category_id, 
            sub_scheme_id as scheme_id, sub_initiative_id as initiative_id, 
            sub_target_completion_date as target_completion_date, sub_project_output_id as project_output_id,
            sub_project_outcome_id as project_outcome_id, sub_capacity_addition as capacity_addition, sub_source_of_funding_id as source_of_funding_id, 
            sub_estimated_cost as estimated_cost, sub_gbs_components as gbs_components, sub_iebr_components as iebr_components, 
            sub_ppp_components as ppp_components, sub_loans_components as loans_components, sub_multilateral_components as multilateral_components, 
            sub_state_gov_fund_components as state_gov_fund_components, sub_pmmsy_components as pmmsy_components,
            sub_sagarmala_components AS sagarmala_components, 
            sub_other_source_funding_comp as other_source_funding_comp, sub_primary_funding_agency_id as primary_funding_agency_id, 
            sub_secondary_funding_agency_id as secondary_funding_agency_id, sub_state_id as state_id, sub_district_id as district_id, 
            sub_taluka_id as taluka_id, sub_village_id as village_id, sub_mp_constituency_id as mp_constituency_id, sub_on_land_acquisition as on_land_acquisition, 
            sub_land_area_req as land_area_req, sub_on_acquisition_completed as on_acquisition_completed, sub_percent_land_acq as percent_land_acq,
            sub_project_intiated_date AS project_intiated_date, sub_current_project_stage_id AS current_project_stage_id,
            (SELECT TOP 1 revised_target_completion_date 
            FROM tbl_project_target_date_history h 
            WHERE h.sub_project_id = tbl_sub_project.sub_project_id 
            ORDER BY revised_on DESC) AS latest_revised_target_completion_date


            FROM tbl_sub_project
            WHERE tbl_sub_project.sub_project_id = @subProjectID;
        `)
    }

    try {
        const result = await request.query(editProjectDetailsData);

        // const result = await request.query(`SELECT * from tbl_project WHERE tbl_project.project_id = @projectID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateViewProjectDetails(req, res) 
{
    const projectID             = req.body.projectID;
    const subProjectID          = req.body.subProjectID;
    const projectName           = req.body.projectName;
    const projectType           = req.body.projectType;
    const projectBrief          = req.body.projectBrief;
    const estimatedProjectCost  = req.body.estimatedProjectCost;
    const implementationMode    = req.body.implementationMode;
    const implementationType    = req.body.implementationType;
    const primaryImplementingAgency   = req.body.primaryImplementingAgency;
    let secondaryImplementingAgency = req.body.secondaryImplementingAgency;
    const newImplementingAgencyCode = req.body.newImplementingAgencyCode;
    let projectCategory          = req.body.projectCategory;
    const scheme                 = req.body.scheme;
    let initiative               = req.body.initiative;
    let projectInitiatedDate     = req.body.projectInitiatedDate;
    let targetCompletionDate     = req.body.targetCompletionDate;
    let projectOutput = req.body.projectOutput;
    const newProjectOutputUnits = req.body.newProjectOutputUnits;
    let projectOutcome = req.body.projectOutcome;
    const newProjectOutcomeUnits = req.body.newProjectOutcomeUnits;
    const capacityAddition       = req.body.capacityAddition;
    let sourceOfFunding          = req.body.sourceOfFunding;
    let gbsComponents            = req.body.gbsComponents;
    let iebrComponents           = req.body.iebrComponents;
    let pppComponents            = req.body.pppComponents;
    let loansComponents          = req.body.loansComponents;
    let multiFundComponents      = req.body.multiFundComponents;
    let stateGovFundComponents   = req.body.stateGovFundComponents;
    let pmmsyComponents          = req.body.pmmsyComponents;
    let sagarmalaComponents      = req.body.sagarmalaComponents;
    let otherSourceFundingComp   = req.body.otherSourceFundingComp;
    const primaryFundingAgency   = req.body.primaryFundingAgency;
    let secondaryFundingAgency   = req.body.secondaryFundingAgency;
    let state                    = req.body.state;
    let district                 = req.body.district;
    const taluka                 = req.body.taluka;
    const village                = req.body.village;
    let mpConstituency           = req.body.mpConstituency;
    const onLandAcquistion       = req.body.onLandAcquistion;
    const landAreaReq            = req.body.landAreaReq;
    const onAcquisitionCompleted = req.body.onAcquisitionCompleted;
    const percentLandAcquired    = req.body.percentLandAcquired;
    let sagarmalaFunding         = req.body.sagarmalaFunding;

    if (gbsComponents == "") {
        gbsComponents = null;
    }
    if (iebrComponents == "") {
        iebrComponents = null;
    }
    if (pppComponents == "") {
        pppComponents = null;
    }
    if (loansComponents == "") {
        loansComponents = null;
    }
    if (multiFundComponents == "") {
        multiFundComponents = null;
    }
    if (stateGovFundComponents == "") {
        stateGovFundComponents = null;
    }
    if (pmmsyComponents == "") {
        pmmsyComponents = null;
    }
    if (sagarmalaComponents == "") {
        sagarmalaComponents = null;
    }
    if (otherSourceFundingComp == "") {
        otherSourceFundingComp = null;
    }
    if (projectInitiatedDate == "") {
        projectInitiatedDate = null;
    }
    if (targetCompletionDate == "") {
        targetCompletionDate = null;
    }
    
    if (Array.isArray(projectCategory)) {
        projectCategory = projectCategory.join(",");
    }

    // console.log(sourceOfFunding) 
    if (Array.isArray(sourceOfFunding)) {
        // console.log(Array.isArray(sourceOfFunding))    
        sourceOfFunding = sourceOfFunding.join(",");
    }

    if (Array.isArray(state)) {
        // console.log(Array.isArray(sourceOfFunding))    
        state = state.join(",");
    }

    if (Array.isArray(district)) {
        // console.log(Array.isArray(sourceOfFunding))    
        district = district.join(",");
    }

    if (Array.isArray(mpConstituency)) {
        // console.log(Array.isArray(sourceOfFunding))    
        mpConstituency = mpConstituency.join(",");
    }

    if (Array.isArray(initiative)) {
        initiative = initiative.join(",");
    }

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("projectName", projectName);
    request.input("projectType", projectType);
    request.input("projectBrief", projectBrief);
    request.input("estimatedProjectCost", estimatedProjectCost);
    request.input("implementationMode", implementationMode);
    request.input("implementationType", implementationType);
    request.input("primaryImplementingAgency", primaryImplementingAgency);
    request.input("secondaryImplementingAgency", secondaryImplementingAgency);
    request.input("newImplementingAgencyCode", newImplementingAgencyCode);
    request.input("projectCategory", projectCategory);
    request.input("scheme", scheme);
    request.input("initiative", initiative);
    request.input("projectInitiatedDate", projectInitiatedDate);
    request.input("targetCompletionDate", targetCompletionDate);  
    request.input("projectOutput", projectOutput);
    request.input("newProjectOutputUnits", newProjectOutputUnits);
    request.input("projectOutcome", projectOutcome);
    request.input("newProjectOutcomeUnits", newProjectOutcomeUnits);
    request.input("capacityAddition", capacityAddition);
    request.input("sourceOfFunding", sourceOfFunding);
    request.input("gbsComponents", gbsComponents);
    request.input("iebrComponents", iebrComponents);
    request.input("pppComponents", pppComponents);
    request.input("loansComponents", loansComponents);
    request.input("multiFundComponents", multiFundComponents);
    request.input("stateGovFundComponents", stateGovFundComponents);
    request.input("pmmsyComponents", pmmsyComponents);
    request.input("sagarmalaComponents", sagarmalaComponents);
    request.input("otherSourceFundingComp", otherSourceFundingComp);
    request.input("primaryFundingAgency", primaryFundingAgency);
    request.input("secondaryFundingAgency", secondaryFundingAgency);
    request.input("state", state);
    request.input("district", district);
    request.input("taluka", taluka);
    request.input("village", village);
    request.input("mpConstituency", mpConstituency);
    request.input("onLandAcquistion", onLandAcquistion);
    request.input("landAreaReq", landAreaReq);
    request.input("onAcquisitionCompleted", onAcquisitionCompleted);
    request.input("percentLandAcquired", percentLandAcquired);

    if (sagarmalaFunding !== null && sagarmalaFunding !== '') {
        sagarmalaFunding = 1;
    }
    else {
        sagarmalaFunding = 0;
    }

    if (isNaN(secondaryImplementingAgency) && secondaryImplementingAgency) {
        const query = `
            INSERT INTO mmt_implementing_agency (ia_name, ia_code) 
            VALUES (@secondaryImplementingAgency, @newImplementingAgencyCode)
        `;
        await request.query(query);
        const query1 = "SELECT TOP 1 ia_id FROM mmt_implementing_agency ORDER BY ia_id DESC";
        const result1 = await request.query(query1);
        secondaryImplementingAgency = result1.recordset[0].ia_id;
    }

    if (isNaN(secondaryFundingAgency) && secondaryFundingAgency) {    
        const query = "INSERT into mmt_funding_agency (fa_name) values (@secondaryFundingAgency)";
        await request.query(query);
    
        const query1 = "SELECT TOP 1 fa_id FROM mmt_funding_agency ORDER BY fa_id DESC";
        const result1 = await request.query(query1);
        secondaryFundingAgency = result1.recordset[0].fa_id;
    }

    if (isNaN(projectOutput) && projectOutput) {
        const query = `
            INSERT INTO mmt_output (project_output_name, project_output_units) 
            VALUES (@projectOutput, @newProjectOutputUnits)
        `;
        await request.query(query);
        const query1 = "SELECT TOP 1 project_output_id FROM mmt_output ORDER BY project_output_id DESC";
        const result1 = await request.query(query1);
        projectOutput = result1.recordset[0].project_output_id;
    }

    if (isNaN(projectOutcome) && projectOutcome) {
        const query = `
            INSERT INTO mmt_outcome (project_outcome_name, project_outcome_units, project_output_id) 
            VALUES (@projectOutcome, @newProjectOutcomeUnits, ${projectOutput})
        `;
        await request.query(query);
        const query1 = "SELECT TOP 1 project_outcome_id FROM mmt_outcome ORDER BY project_outcome_id DESC";
        const result1 = await request.query(query1);
        projectOutcome = result1.recordset[0].project_outcome_id;
    }

    request.input("sagarmalaFunding", sagarmalaFunding);

    try {
        if (subProjectID == -1) {
            const result = await request.query(`UPDATE tbl_project SET project_name = @projectName, project_type = @projectType, project_brief = @projectBrief,
                estimated_cost = @estimatedProjectCost, mode_of_implememtation = @implementationMode, implememtation_type = @implementationType,
                primary_ia_id = @primaryImplementingAgency, secondary_ia_id = ${secondaryImplementingAgency}, 
                project_category_id= @projectCategory, scheme_id = @scheme, initiative_id = @initiative, project_intiated_date = @projectInitiatedDate,
                target_completion_date = @targetCompletionDate, project_output_id = ${projectOutput},
                project_outcome_id = ${projectOutcome}, capacity_addition = @capacityAddition, source_of_funding_id = @sourceOfFunding,
                is_sagarmala_funded = @sagarmalaFunding, gbs_components = @gbsComponents, iebr_components = @iebrComponents, 
                ppp_components= @pppComponents, loans_components = @loansComponents, multilateral_components = @multiFundComponents,
                state_gov_fund_components = @stateGovFundComponents, pmmsy_components = @pmmsyComponents, 
                sagarmala_components = @sagarmalaComponents, other_source_funding_comp = @otherSourceFundingComp,
                primary_funding_agency_id = @primaryFundingAgency, secondary_funding_agency_id = ${secondaryFundingAgency},
                state_id = @state, district_id = @district, taluka_id = @taluka, 
                village_id = @village, mp_constituency_id = @mpConstituency, on_land_acquisition = @onLandAcquistion, 
                land_area_req = @landAreaReq, on_acquisition_completed = @onAcquisitionCompleted, percent_land_acq = @percentLandAcquired, last_updated = getDate()
                OUTPUT INSERTED.id, INSERTED.project_id    
                WHERE project_id = @projectID`);

            const id = result.recordset[0].id;
            const project_id = result.recordset[0].project_id;
            res.status(200).json({ id, project_id });
        }
        else {
            const result = await request.query(`UPDATE tbl_sub_project SET sub_project_name = @projectName, 
                sub_project_type = @projectType, sub_project_brief = @projectBrief, sub_estimated_cost = @estimatedProjectCost, 
                sub_mode_of_implememtation = @implementationMode, sub_implememtation_type = @implementationType, sub_primary_ia_id = @primaryImplementingAgency, 
                sub_secondary_ia_id = ${secondaryImplementingAgency}, sub_project_category_id= @projectCategory, sub_scheme_id = @scheme, 
                sub_initiative_id = @initiative, sub_project_intiated_date = @projectInitiatedDate, sub_target_completion_date = @targetCompletionDate, 
                sub_project_output_id = ${projectOutput}, sub_project_outcome_id = ${projectOutcome}, sub_capacity_addition = @capacityAddition,
                sub_source_of_funding_id = @sourceOfFunding, sub_is_sagarmala_funded = @sagarmalaFunding, sub_gbs_components = @gbsComponents, 
                sub_iebr_components = @iebrComponents, sub_ppp_components= @pppComponents, sub_loans_components = @loansComponents,
                sub_multilateral_components = @multiFundComponents, sub_state_gov_fund_components = @stateGovFundComponents, sub_pmmsy_components = @pmmsyComponents, 
                sub_sagarmala_components = @sagarmalaComponents, sub_other_source_funding_comp = @otherSourceFundingComp,
                sub_primary_funding_agency_id = @primaryFundingAgency, sub_secondary_funding_agency_id = ${secondaryFundingAgency}, 
                sub_state_id = @state, sub_district_id = @district, sub_taluka_id = @taluka, 
                sub_village_id = @village, sub_mp_constituency_id = @mpConstituency, sub_on_land_acquisition = @onLandAcquistion, 
                sub_land_area_req = @landAreaReq, sub_on_acquisition_completed = @onAcquisitionCompleted, sub_percent_land_acq = @percentLandAcquired, sub_last_updated = getDate()
                OUTPUT INSERTED.id, INSERTED.project_id    
                WHERE sub_project_id = @subProjectID`);

            const id = result.recordset[0].id;
            const project_id = result.recordset[0].project_id;
            res.status(200).json({ id, project_id });
        }
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

const uploadDestinationBase = './fileuploads/Project_Documents';

// Ensure the base directory exists
if (!fs.existsSync(uploadDestinationBase)) {
    fs.mkdirSync(uploadDestinationBase, { recursive: true });
}

// Subfolder names
const subfolderNames = [
    'project_ppt',
    'project_pert',
    'project_images'
];

// Create subfolders under the base directory
subfolderNames.forEach((subfolderName) => {
    const subfolderPath = `${uploadDestinationBase}/${subfolderName}`;
    if (!fs.existsSync(subfolderPath)) {
        try {
            fs.mkdirSync(subfolderPath, { recursive: true });
            console.log(`Created subfolder: ${subfolderPath}`);
        } catch (error) {
            console.error(`Error creating subfolder '${subfolderPath}': ${error.message}`);
        }
    }

    // Create 'mainProject' and 'subProject' folders under each subfolder
    ['mainProject', 'subProject'].forEach((projectType) => {
        const projectPath = `${subfolderPath}/${projectType}`;
        if (!fs.existsSync(projectPath)) {
            try {
                fs.mkdirSync(projectPath, { recursive: true });
                console.log(`Created project folder: ${projectPath}`);
            } catch (error) {
                console.error(`Error creating project folder '${projectPath}': ${error.message}`);
            }
        }
    });
});

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const uploadDestination = `${uploadDestinationBase}`;

        callback(null, uploadDestination);
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

async function addProjectDocumentUploader(req, res) {

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }

        const { projectID, subProjectID, folderName } = req.body;

        const filenames = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName);

            let destinationPath;
            console.log("projectID", projectID);
            console.log("subProjectID", subProjectID);
            if (subProjectID == -1) {
                destinationPath = `${uploadDestinationBase}/${folderName}/mainProject/${uniqueFileName}`;
            } else {
                destinationPath = `${uploadDestinationBase}/${folderName}/subProject/${uniqueFileName}`;
            }

            const conn = await pool;
            const request = conn.request();
            request.input("projectID", projectID);
            request.input("subProjectID", subProjectID);
            request.input("documentType", folderName);
            request.input("documentName", uniqueFileName);

            await request.query(`INSERT INTO tbl_project_document (project_id, sub_project_id, document_type, document_name) 
                VALUES (@projectID, @subProjectID, @documentType, @documentName)`);

            fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }

        res.status(200).json({
            message: 'Files uploaded successfully',
            filenames,
            status: 200,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadProjectDocument(req, res) {
    try {
        const projectID = req.params.projectID;
        const subProjectID = req.params.subProjectID;
        const documentName = req.params.documentName;

        const folderName = subProjectID == -1 ? 'mainProject' : 'subProject';

        const conn = await pool;
        const request = conn.request();

        request.input("subProjectID", subProjectID);
        request.input("documentName", documentName);
        request.input("projectID", projectID);

        const result = await request.query(`
            SELECT document_type 
            FROM tbl_project_document 
            WHERE project_id = @projectID AND sub_project_id = @subProjectID AND document_name = @documentName
        `);

        if (result.recordsets.length > 0) {
            const documentType = result.recordsets[0][0].document_type;
            const filePath = path.join(__dirname, `../../../fileuploads/Project_Documents/${documentType}/${folderName}`, documentName);

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${documentName}"`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Length', fs.statSync(filePath).size);

                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            } else {
                console.error("File not found on the server.");
                res.status(404).send({ message: "File not found" });
            }
        } else {
            console.error("File not found for the given project and sub-project ID.");
            res.status(404).send({ message: "File not found" });
        }
    } catch (err) {
        console.error(err);
        await logErrorToFile(err);
        res.status(500).send({ message: err.message });
    }
}

// Define the logs directory and error log file path
const logsDirectory = path.join(__dirname, '../../../fileuploads/logs');
const logFilePath = path.join(logsDirectory, 'error_log.txt');

// Ensure the logs directory exists, and create it if it doesn't
if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory, { recursive: true });
}

// Function to log errors to error_log.txt with a timestamp
async function logErrorToFile(error) {
    const timeStamp = new Date().toISOString(); 
    const errorMessage = `[${timeStamp}] - ${typeof error === 'string' ? error : error.message}\nStack: ${error|| 'No stack available'}\n\n`;

    fs.appendFile(logFilePath, errorMessage, (err) => {
        if (err) {
            console.error("Failed to write error log to file", err);
        }
    });
}

async function downloadErrorLogFile(req, res) {
    try {
        console.log("Entered downloadErrorLogFile function");

        // Construct the correct file path for error_log.txt
        const filePath = path.join(__dirname, '../../../fileuploads/logs', 'error_log.txt');

        // Check if the error_log.txt file exists
        if (fs.existsSync(filePath)) {
            // Set headers for file download
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="error_log.txt"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fs.statSync(filePath).size);

            // Create a readable stream and pipe the file to the response
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            console.error("Error log file not found on the server.");
            res.status(404).send({ message: "Error log file not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}



async function editProjectDocumentUploader(req, res) {

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded or incorrect field name' });
        }

        const { projectID, subProjectID, documentName, documentType, folderName } = req.body;

        const filenames = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName);

            let destinationPath;
            console.log("projectID", projectID);
            console.log("subProjectID", subProjectID);
            if (subProjectID == -1) {
                destinationPath = `${uploadDestinationBase}/${folderName}/mainProject/${uniqueFileName}`;
            } else {
                destinationPath = `${uploadDestinationBase}/${folderName}/subProject/${uniqueFileName}`;
            }

            const conn = await pool;
            const request = conn.request();
            request.input("projectID", projectID);
            request.input("subProjectID", subProjectID);
            request.input("documentType", folderName);
            request.input("newDocumentName", uniqueFileName);
            request.input("documentName", documentName);

            await request.query(`INSERT INTO tbl_project_document (project_id, sub_project_id, document_type, document_name) 
                VALUES (@projectID, @subProjectID, @documentType, @newDocumentName)`);

            await request.query(`DELETE FROM tbl_project_document 
            WHERE project_id = @projectID AND sub_project_id = @subProjectID AND document_name = @documentName`);

            fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }

        res.status(200).json({
            message: 'Files uploaded successfully',
            filenames,
            status: 200,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getProjectDocuments(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    // console.log("projectdatesui", projectID)

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`SELECT * 
            FROM tbl_project_document WHERE project_id = @projectID AND sub_project_id IS NOT NULL;`);
        }
        else {
            result = await request.query(`SELECT *
            FROM tbl_project_document WHERE sub_project_id = @subProjectID AND sub_project_id IS NOT NULL;`);
        }

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteProjectDocument(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;
    const documentName = req.params.documentName;
    // console.log("projectdatesui", projectID)

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);
    request.input("documentName", documentName);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`DELETE FROM tbl_project_document WHERE project_id = @projectID AND document_name = @documentName;`);
        }
        else {
            result = await request.query(`DELETE FROM tbl_project_document WHERE sub_project_id = @subProjectID AND document_name = @documentName;`);
        }

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getBasicInformationCheckPoints(req, res) {
    const projectID = req.params.projectID;
    const subProjectID = req.params.subProjectID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("subProjectID", subProjectID);

    try {
        let result;
        if (subProjectID == -1) {
            result = await request.query(`  SELECT project_type
            FROM tbl_project
            WHERE project_id = @projectID;`);
        } else {
            result = await request.query(` SELECT sub_project_type as project_type
            FROM tbl_sub_project
            WHERE sub_project_id = @subProjectID;`);
        }

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

export default { getEdiProjectData, updateViewProjectDetails, addRevisedDate, getRevisedDate, addProjectDocumentUploader, upload, getProjectDocuments,
    deleteProjectDocument, downloadProjectDocument, editProjectDocumentUploader, getBasicInformationCheckPoints,
     downloadErrorLogFile };
