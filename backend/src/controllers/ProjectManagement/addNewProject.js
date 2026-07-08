
import multer from 'multer';
import express from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';
import { CONNREFUSED } from 'dns';
import nodemailer from "nodemailer";

async function createNewProject(req, res) 
{
    let projectID = await getProjectID();
    const projectName = req.body.projectName;
    const projectBrief = req.body.projectBrief
    const estimatedProjectCost = req.body.estimatedProjectCost;
    const projectType = req.body.projectType;
    const implementationMode = req.body.implementationMode;
    const implementationType = req.body.implementationType;
    const primaryImplementingAgency = req.body.primaryImplementingAgency;
    let secondaryImplementingAgency = req.body.secondaryImplementingAgency;
    const newImplementingAgencyCode = req.body.newImplementingAgencyCode;
    let projectCategory = req.body.projectCategory;
    const scheme = req.body.scheme;
    let initiative = req.body.initiative;
    let projectInitiatedDate = req.body.projectInitiatedDate;
    let targetCompletionDate = req.body.targetCompletionDate;
    let projectOutput = req.body.projectOutput;
    const newProjectOutputUnits = req.body.newProjectOutputUnits;
    let projectOutcome = req.body.projectOutcome;
    const newProjectOutcomeUnits = req.body.newProjectOutcomeUnits;
    const capacityAddition = req.body.capacityAddition;
    let sourceOfFunding = req.body.sourceOfFunding;
    let gbsComponents = req.body.gbsComponents;
    let iebrComponents = req.body.iebrComponents;
    let pppComponents = req.body.pppComponents;
    let loansComponents = req.body.loansComponents;
    let multiFundComponents = req.body.multiFundComponents;
    let stateGovFundComponents = req.body.stateGovFundComponents;
    let pmmsyComponents = req.body.pmmsyComponents;
    let sagarmalaComponents = req.body.sagarmalaComponents;

    let sagarmalaFunding = req.body.sagarmalaFunding;
    let otherSourceFundingComp = req.body.otherSourceFundingComp;
    const primaryFundingAgency = req.body.primaryFundingAgency;
    let secondaryFundingAgency = req.body.secondaryFundingAgency;
    let state = req.body.state;
    let district = req.body.district;
    const taluka = req.body.taluka;
    const village = req.body.village;
    let mpConstituency = req.body.mpConstituency;
    const onLandAcquistion = req.body.onLandAcquistion;
    const landAreaReq = req.body.landAreaReq;
    const onAcquisitionCompleted = req.body.onAcquisitionCompleted;
    const percentLandAcquired = req.body.percentLandAcquired;
    const selectedStage = req.body.selectedStage;

    const userID = req.body.userID;
    const organisationID = req.body.organisationID;
    const wingID = req.body.wingID;
    // const projectStageID = req.body.projectStageID;

    // Sub projects
    let onSubProjectAvailable = req.body.onSubProjectAvailable;
    const subProjectNum = req.body.subProjectNum;
    const subProjectsTab = req.body.subProjectsTab;

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
    request.input("projectName", projectName);
    request.input("projectBrief", projectBrief);
    request.input("estimatedProjectCost", estimatedProjectCost);
    request.input("projectType", projectType);
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
    request.input("selectedStage", selectedStage);
    request.input("userID", userID);
    request.input("organisationID", organisationID);
    request.input("wingID", wingID);
    // request.input("projectStageID", projectStageID);
    request.input("onSubProjectAvailable", onSubProjectAvailable);
    request.input("subProjectNum", subProjectNum);

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
            VALUES (@projectOutcome, @newProjectOutcomeUnits, @projectOutput)
        `;
        await request.query(query);
        const query1 = "SELECT TOP 1 project_outcome_id FROM mmt_outcome ORDER BY project_outcome_id DESC";
        const result1 = await request.query(query1);
        projectOutcome = result1.recordset[0].project_outcome_id;
    }

    request.input("sagarmalaFunding", sagarmalaFunding);

    let addProjectQuery;

    if (onSubProjectAvailable == 0) {
        addProjectQuery = (`INSERT INTO tbl_project (project_id, organisation_id, wing_id, project_name, project_type,
            on_sub_project_available, sub_projec_num, project_brief, estimated_cost, mode_of_implememtation, implememtation_type, 
            primary_ia_id, secondary_ia_id, project_category_id, scheme_id, initiative_id, target_completion_date, project_output_id, 
            project_outcome_id, capacity_addition, source_of_funding_id, is_sagarmala_funded, gbs_components,iebr_components, 
            ppp_components, loans_components, multilateral_components, state_gov_fund_components, pmmsy_components,
            sagarmala_components, other_source_funding_comp, primary_funding_agency_id, secondary_funding_agency_id, state_id, 
            district_id, taluka_id, village_id, mp_constituency_id, on_land_acquisition, land_area_req, on_acquisition_completed, 
            project_stage_id, current_project_stage_id, project_intiated_date, percent_land_acq, submitted_by ) 
            OUTPUT INSERTED.id, INSERTED.project_id, INSERTED.on_sub_project_available
            VALUES (@projectID, @organisationID, @wingID, @projectName, @projectType, @onSubProjectAvailable, @subProjectNum, @projectBrief, 
            @estimatedProjectCost, @implementationMode, @implementationType, @primaryImplementingAgency, 
            @secondaryImplementingAgency,  @projectCategory, @scheme, @initiative, @targetCompletionDate,
            @projectOutput, @projectOutcome, @capacityAddition, @sourceOfFunding,@sagarmalaFunding, @gbsComponents, @iebrComponents,
            @pppComponents, @loansComponents, @multiFundComponents, @stateGovFundComponents, @pmmsyComponents, @sagarmalaComponents,         
            @otherSourceFundingComp, @primaryFundingAgency, @secondaryFundingAgency, @state, @district, @taluka, @village, 
            @mpConstituency, @onLandAcquistion, @landAreaReq, @onAcquisitionCompleted, @selectedStage, @selectedStage, @projectInitiatedDate,
            @percentLandAcquired, @userID  )`
            //project_stage_id - @projectStageID removed
        )
    }
    else {
        addProjectQuery = (`INSERT INTO tbl_project (project_id, organisation_id, wing_id, project_name, 
        on_sub_project_available, sub_projec_num ) 
        OUTPUT INSERTED.id, INSERTED.project_id, INSERTED.on_sub_project_available
        VALUES (@projectID, @organisationID, @wingID, @projectName,  @onSubProjectAvailable, @subProjectNum )`)

    }

    try 
    {
        console.log("projectOutput,projectOutcome",projectOutput,projectOutcome);
        const result = await request.query(addProjectQuery);
        console.log("END");

        // console.log(result.insertId);
        // const { id, project_id } = result.recordset[0];
        // res.status(200).json({ id, project_id });

        projectID = result.recordset[0].project_id; // Get the ID from the result 
        let on_sub_project_available = result.recordset[0].on_sub_project_available;

        let subProjectID;
        for (let p = 0; p < subProjectsTab.length; p++) {
            subProjectID = await getLastSubPrjectID();
            let subProjectName = subProjectsTab[p].subProjectName

            
            
            request.input(`subProjectName_${p}`, subProjectName);
            request.input(`subProjectID_${p}`, subProjectID);

            // console.log(subProjectName)
            const result = await request.query(`INSERT INTO tbl_sub_project (project_id, sub_project_id, sub_organisation_id, sub_wing_id,
                sub_project_name, sub_project_type, sub_project_brief, sub_estimated_cost, sub_mode_of_implememtation,
                sub_implememtation_type, sub_primary_ia_id, sub_secondary_ia_id, sub_project_category_id,
                sub_scheme_id, sub_initiative_id, sub_target_completion_date, sub_project_output_id,                    
                sub_project_outcome_id, sub_capacity_addition, sub_source_of_funding_id, sub_is_sagarmala_funded, sub_gbs_components,
                sub_iebr_components, sub_ppp_components, sub_loans_components, sub_multilateral_components, 
                sub_state_gov_fund_components, sub_pmmsy_components, sub_sagarmala_components, sub_other_source_funding_comp,
                sub_primary_funding_agency_id, sub_secondary_funding_agency_id, sub_state_id, sub_district_id, sub_taluka_id, sub_village_id,
                sub_mp_constituency_id, sub_on_land_acquisition, sub_land_area_req, 
                sub_on_acquisition_completed, sub_percent_land_acq, sub_submitted_by, sub_project_stage_id, sub_current_project_stage_id,
                sub_project_intiated_date            
                ) 
                VALUES (@projectID, @subProjectID_${p}, @organisationID, @wingID, @subProjectName_${p}, @projectType, @projectBrief, 
                @estimatedProjectCost, @implementationMode, @implementationType, @primaryImplementingAgency, 
                @secondaryImplementingAgency,  @projectCategory, @scheme, @initiative, @targetCompletionDate,
                @projectOutput, @projectOutcome, @capacityAddition, @sourceOfFunding, @sagarmalaFunding, @gbsComponents, @iebrComponents,
                @pppComponents, @loansComponents, @multiFundComponents, @stateGovFundComponents, @pmmsyComponents,
                @sagarmalaComponents, @otherSourceFundingComp,  @primaryFundingAgency, @secondaryFundingAgency, @state, @district, 
                @taluka, @village, @mpConstituency, @onLandAcquistion, @landAreaReq, @onAcquisitionCompleted, 
                @percentLandAcquired, @userID, @selectedStage, @selectedStage, @projectInitiatedDate )`);

        }
        // res.sendStatus(200);
        // res.status(200).json({ projectID, on_sub_project_available });

        if (onSubProjectAvailable == 0) // is not sub proposal 
        {
            subProjectID = -1;
            res.json({ projectID, subProjectID });
        }
        else {
            res.json({ projectID, subProjectID });
        }

    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateSubProject(req, res) 
{
    // let projectID = await getProjectID();
    const projectID = req.body.projectID;
    // Sub projects
    let onSubProjectAvailable = req.body.onSubProjectAvailable;
    const subProjectNum = req.body.subProjectNum;
    const subProjectsTab = req.body.subProjectsTab;
    const userID = req.body.userID;
    const organisationID = req.body.organisationID;
    const wingID = req.body.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);
    request.input("onSubProjectAvailable", onSubProjectAvailable);
    request.input("subProjectNum", subProjectNum);
    request.input("userID", userID);
    request.input("organisationID", organisationID);
    request.input("wingID", wingID);

    console.log(projectID)
    
    const query = await request.query(`
        UPDATE tbl_project SET on_sub_project_available = 1, sub_projec_num = sub_projec_num + @subProjectNum 
        WHERE project_id = @projectID  `);

    try 
    {

        let subProjectID;
        for (let p = 0; p < subProjectsTab.length; p++) 
        {
            subProjectID = await getLastSubPrjectID();
            let subProjectName = subProjectsTab[p].subProjectName

            request.input(`subProjectName_${p}`, subProjectName);
            request.input(`subProjectID_${p}`, subProjectID);

            const result = await request.query(`INSERT INTO tbl_sub_project (project_id, sub_project_id,
                sub_project_name, sub_submitted_by) 
                VALUES (@projectID, @subProjectID_${p}, @subProjectName_${p}, @userID )`);

        }
        res.json({ projectID, subProjectID });
       
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getProjectID() {
    const conn = await pool;

    const result = await conn.query(`SELECT TOP(1) project_id from tbl_project order by project_id DESC;`);

    let projectID;
    if (result.recordset.length > 0) {
        const lastProjectID = result.recordset[0].project_id;
        // console.log("last", lastProjectID)	    

        let lastIndex = parseInt(lastProjectID.slice(2))
        // console.log(lastIndex)

        // let lastIndex = substr(lastProjectID[0], 1);
        let nextIndex = lastIndex + 1;
        if (nextIndex < 10) {
            projectID = "PR000" + nextIndex;
        }
        else if (nextIndex < 100) {
            projectID = "PR00" + nextIndex;
        }
        else if (nextIndex < 1000) {
            projectID = "PR0" + nextIndex;
        }
        else {
            projectID = "PR" + nextIndex;
        }
    }
    else {
        projectID = "PR0001";
    }

    // console.log(projectID)
    return projectID;

};
// getProjectID();

async function getLastSubPrjectID() {
    const conn = await pool;

    const result = await conn.query(`SELECT TOP(1) sub_project_id FROM tbl_sub_project order by sub_project_id DESC;`);

    let subProjectID;
    if (result.recordset.length > 0) {
        const lastSubProjectID = result.recordset[0].sub_project_id;
        // console.log("last", lastSubProjectID)	    

        let lastIndex = parseInt(lastSubProjectID.slice(3))
        // console.log(lastIndex)

        // let lastIndex = substr(lastSubProjectID[0], 1);
        let nextIndex = lastIndex + 1;
        if (nextIndex < 10) {
            subProjectID = "SPR000" + nextIndex;
        }
        else if (nextIndex < 100) {
            subProjectID = "SPR00" + nextIndex;
        }
        else if (nextIndex < 1000) {
            subProjectID = "SPR0" + nextIndex;
        }
        else {
            subProjectID = "SPR" + nextIndex;
        }
    }
    else {
        subProjectID = "SPR0001";
    }

    // console.log(subProjectID)
    return subProjectID;
};

async function getProjectPptDocument(req, res) {
    const projectID = req.params.projectID;
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`
                SELECT * FROM tbl_project_ppt_document
                WHERE project_id = @projectID;
            `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getProjectPertDocument(req, res) {

    const projectID = req.params.projectID;
    
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`
                SELECT * FROM tbl_project_pert_document
                WHERE project_id = @projectID;
            `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getProjectImageDocument(req, res) {

    const projectID = req.params.projectID;
    const conn = await pool;
    const request = conn.request();
    request.input("projectID", projectID);

    try {
        const result = await request.query(`
                SELECT * FROM tbl_project_image
                WHERE project_id = @projectID;
            `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

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
        fs.mkdirSync(subfolderPath, { recursive: true });

        // Create 'mainProject' and 'subProject' folders under each subfolder
        ['mainProject', 'subProject'].forEach((projectType) => {
            const projectPath = `${subfolderPath}/${projectType}`;
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }
        });
    }
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
    limits: { fileSize: 10000000 }
});


export default { createNewProject, updateSubProject, getProjectPptDocument, getProjectPertDocument, getProjectImageDocument, upload };