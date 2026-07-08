import multer from 'multer';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from "../../db.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function downloadSampleDocument(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../DGS_2_2_Template/InPrincipal_Approval_Application.xlsx");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'InPrincipal_Approval_Application.xlsx';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("Sample document not found on the server.");
            res.status(404).send({ message: "Sample document not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}


async function getKpi2_2_List(req, res) {
    const conn = await pool;
    // const userID = req.params.userID;

    try {
        // const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        // const { role_id } = userResult.recordset[0];

        const result = await conn.query(`
            SELECT 
                sr_no,
                unique_application_no,
                shipyard_name,
                no_of_vessels,
                contract_date,
                contract_date_fy,
                contractual_value_inr,
                applicable_rate_of_financial_assistance,
                estimated_financial_assistance,
                expected_date_of_delivery,
                expected_date_of_delivery_fy,
                application_date,
                application_date_fy,
                status,
                current_stage,
                approval_or_rejection_date,
                rejection_date,
                remarks_for_rejections,
                general_remarks
            FROM tbl_kpi_dgs_2_2
            ORDER BY RIGHT(unique_application_no, 3) DESC
        ;`);

        res.json(result.recordset);
        // }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

//-------------------------------------------------------- 2.6 ----------------------------------------------------------------
async function checkData_2_2(req, res) 
{
    const applicationNumber = req.params.applicationNumber;

    const conn = await pool;
    const request = conn.request();
    request.input("applicationNumber", applicationNumber);

    // Check if year, month and applicationNumber are provided
    if (!applicationNumber) {
        return res.status(400).json({ message: "Application number is required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_2 
            WHERE unique_application_no = @applicationNumber 
        `); 
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};


async function addDgsKpi2_2_1Data(req, res) 
{
    const applicationNumber          = req.body.applicationNumber;
    const shipyardName               = req.body.shipyardName;
    let noOfVessels                  = req.body.noOfVessels;
    let contractualValue             = req.body.contractualValue;
    let contractDate                 = req.body.contractDate;
    const contractDateFy             = req.body.contractDateFy;
    let applicablicFinAssistance     = req.body.applicablicFinAssistance;
    let estFinAssistance             = req.body.estFinAssistance;
    let expDateOfDelivery            = req.body.expDateOfDelivery;
    const expDateOfDeliveryFy        = req.body.expDateOfDeliveryFy;
    let applicationDate              = req.body.applicationDate;
    const applicationDateFy          = req.body.applicationDateFy;
    const status                     = req.body.status;
    let approvalDate                 = req.body.approvalDate;
    let rejectionDate                = req.body.rejectionDate;
    const rejectionRemarks           = req.body.rejectionRemarks;
    const generalRemarks             = req.body.generalRemarks;

    if (contractDate == "") {
        contractDate = null;
    }
    if (expDateOfDelivery == "") {
        expDateOfDelivery = null;
    }
    if (applicationDate == "") {
        applicationDate = null;
    }
    if (approvalDate == "") {
        approvalDate = null;
    }
    if (rejectionDate == "") {
        rejectionDate = null;
    }
    if (contractualValue == "") {
        contractualValue = null;
    }  
    if (applicablicFinAssistance == "") {
        applicablicFinAssistance = null;
    }  
    if (estFinAssistance == "") {
        estFinAssistance = null;
    }  
    if (noOfVessels == "") {
        noOfVessels = null;
    }  
    

    const conn = await pool;
    const request = conn.request();

    request.input("applicationNumber", applicationNumber);
    request.input("shipyardName", shipyardName);
    request.input("noOfVessels", noOfVessels);
    request.input("contractualValue", contractualValue);
    request.input("contractDate", contractDate);
    request.input("contractDateFy", contractDateFy);
    request.input("applicablicFinAssistance", applicablicFinAssistance);
    request.input("estFinAssistance", estFinAssistance);
    request.input("expDateOfDelivery", expDateOfDelivery);
    request.input("expDateOfDeliveryFy", expDateOfDeliveryFy);
    request.input("applicationDate", applicationDate);
    request.input("applicationDateFy", applicationDateFy);
    request.input("status", status);
    request.input("approvalDate", approvalDate);
    request.input("rejectionDate", rejectionDate);
    request.input("rejectionRemarks", rejectionRemarks);
    request.input("generalRemarks", generalRemarks);

    try {
       
            const result = await request.query(`INSERT INTO tbl_kpi_dgs_2_2 (unique_application_no, shipyard_name, 
                    no_of_vessels, 
                    contractual_value_inr, 
                    contract_date, 
                    contract_date_fy, 
                    applicable_rate_of_financial_assistance, 
                    estimated_financial_assistance, 
                    expected_date_of_delivery, 
                    expected_date_of_delivery_fy, 
                    application_date, 
                    application_date_fy, 
                    status,
                    approval_or_rejection_date, 
                    rejection_date,
                    remarks_for_rejections, 
                    general_remarks
                )
                VALUES ( @applicationNumber,
                    @shipyardName, 
                    @noOfVessels, 
                    @contractualValue, 
                    @contractDate, 
                    @contractDateFy, 
                    @applicablicFinAssistance, 
                    @estFinAssistance, 
                    @expDateOfDelivery, 
                    @expDateOfDeliveryFy, 
                    @applicationDate, 
                    @applicationDateFy, 
                    @status,
                    @approvalDate, 
                    @rejectionDate, 
                    @rejectionRemarks, 
                    @generalRemarks
                );
            `);

                res.sendStatus(200);
      
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function editDgsKpi2_2_1Data(req, res) 
{
    const applicationNumber          = req.body.applicationNumber;
    const shipyardName               = req.body.shipyardName;
    const noOfVessels                = req.body.noOfVessels;
    const contractualValue           = req.body.contractualValue;
    let contractDate                 = req.body.contractDate;
    const contractDateFy             = req.body.contractDateFy;
    const applicablicFinAssistance   = req.body.applicablicFinAssistance;
    const estFinAssistance           = req.body.estFinAssistance;
    let expDateOfDelivery            = req.body.expDateOfDelivery;
    const expDateOfDeliveryFy        = req.body.expDateOfDeliveryFy;
    let applicationDate              = req.body.applicationDate;
    const applicationDateFy          = req.body.applicationDateFy;
    const status                     = req.body.status;
    let approvalDate                 = req.body.approvalDate;
    let rejectionDate                = req.body.rejectionDate;
    const rejectionRemarks           = req.body.rejectionRemarks;
    const generalRemarks             = req.body.generalRemarks;

    if (contractDate == "") {
        contractDate = null;
    }
    if (expDateOfDelivery == "") {
        expDateOfDelivery = null;
    }
    if (applicationDate == "") {
        applicationDate = null;
    }
    if (approvalDate == "") {
        approvalDate = null;
    }
    if (rejectionDate == "") {
        rejectionDate = null;
    }
    const conn = await pool;
    const request = conn.request();

    request.input("applicationNumber", applicationNumber);
    request.input("shipyardName", shipyardName);
    request.input("noOfVessels", noOfVessels);
    request.input("contractualValue", contractualValue);
    request.input("contractDate", contractDate);
    request.input("contractDateFy", contractDateFy);
    request.input("applicablicFinAssistance", applicablicFinAssistance);
    request.input("estFinAssistance", estFinAssistance);
    request.input("expDateOfDelivery", expDateOfDelivery);
    request.input("expDateOfDeliveryFy", expDateOfDeliveryFy);
    request.input("applicationDate", applicationDate);
    request.input("applicationDateFy", applicationDateFy);
    request.input("status", status);
    request.input("approvalDate", approvalDate);
    request.input("rejectionDate", rejectionDate);
    request.input("rejectionRemarks", rejectionRemarks);
    request.input("generalRemarks", generalRemarks);

    try {
       
            const result = await request.query(`UPDATE tbl_kpi_dgs_2_2 
            SET 
                shipyard_name = @shipyardName, 
                no_of_vessels = @noOfVessels, contractual_value_inr = @contractualValue, contract_date = @contractDate, 
                contract_date_fy = @contractDateFy, applicable_rate_of_financial_assistance = @applicablicFinAssistance, 
                estimated_financial_assistance = @estFinAssistance, expected_date_of_delivery = @expDateOfDelivery, 
                expected_date_of_delivery_fy= @expDateOfDeliveryFy, application_date = @applicationDate, 
                application_date_fy = @applicationDateFy, approval_or_rejection_date = @approvalDate, status = @status,
                rejection_date = @rejectionDate, remarks_for_rejections = @rejectionRemarks, general_remarks = @generalRemarks
           
                WHERE unique_application_no = @applicationNumber`);

                res.sendStatus(200);
      
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUpdateMmd_2_2Data(req, res) 
{
    const uniqueAppId = req.params.uniqueAppId;

    const conn = await pool;
    const request = conn.request();
    request.input("uniqueAppId", uniqueAppId);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_2  
            WHERE unique_application_no = @uniqueAppId ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function downloadFASampleDocument(req, res) {
    try {
        const sampleDocumentPath = path.join(__dirname, "../../../DGS_2_2_Template/InPrincipal_Approval_Application.xlsx");

        if (fs.existsSync(sampleDocumentPath)) {
            const filename = 'InPrincipal_Approval_Application.xlsx';

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(sampleDocumentPath).size);

            // Create a readable stream and pipe it to the response
            const fileStream = fs.createReadStream(sampleDocumentPath);
            fileStream.pipe(res);
        } else {
            console.error("Sample document not found on the server.");
            res.status(404).send({ message: "Sample document not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}


//-------------------------------------------------------- 2.2 Fa ----------------------------------------------------------------
async function checkData_2_2_Fa(req, res) 
{
    const fundApplicationNumber = req.params.fundApplicationNumber;

    const conn = await pool;
    const request = conn.request();
    request.input("fundApplicationNumber", fundApplicationNumber);

    // Check if year, month and applicationNumber are provided
    if (!fundApplicationNumber) {
        return res.status(400).json({ message: "Fund application number is required." });
    }
    
    try {
        const result = await request.query(`
            SELECT COUNT(*) as count
            FROM tbl_kpi_dgs_2_2_fa 
            WHERE fund_application_no = @fundApplicationNumber 
        `); 
    
        if (result.recordset[0].count > 0) {
            // If data already exists, return a 400 response with an error message
            res.sendStatus(205);
        } else {
            // If no data exists, return a 200 response with a success message
            res.sendStatus(201);
        }
    
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "An error occurred while checking the data."});
    }
};

async function addDgsKpi2_2_Fa_Data(req, res) 
{
    const fundApplicationNumber     = req.body.fundApplicationNumber;
    const shipyardName              = req.body.shipyardName;
    let fundApplicationDate         = req.body.fundApplicationDate;
    const fundApplicationDateFy     = req.body.fundApplicationDateFy;
    let actualDeliveryDate          = req.body.actualDeliveryDate;
    const actualDeliveryDateFy      = req.body.actualDeliveryDateFy;
    const actualContractPrice       = req.body.actualContractPrice;
    let noOfVessels                 = req.body.noOfVessels;
    const grossTonnage              = req.body.grossTonnage;
    // const currentStage           = req.body.currentStage;
    const status                    = req.body.status;
    let amountApprovedForRelease   = req.body.amountApprovedForRelease;
    let approvalDate                = req.body.approvalDate;
    const approvalDateFy            = req.body.approvalDateFy;
    let rejectedDate                = req.body.rejectedDate;
    const remarksForRejection       = req.body.remarksForRejection;
    let amountReleased90            = req.body.amountReleased90;
    let releaseDate90               = req.body.releaseDate90;
    const releaseDate90Fy           = req.body.releaseDate90Fy;
    let amountReleased10            = req.body.amountReleased10;
    let releaseDate10               = req.body.releaseDate10;
    const releaseDate10Fy           = req.body.releaseDate10Fy;
    
    if (fundApplicationDate == "") {
        fundApplicationDate = null;
    }
    if (actualDeliveryDate == "") {
        actualDeliveryDate = null;
    }   
    if (approvalDate == "") {
        approvalDate = null;
    }
    if (rejectedDate == "") {
        rejectedDate = null;
    }
    if (releaseDate90 == "") {
        releaseDate90 = null;
    }
    if (releaseDate10 == "") {
        releaseDate10 = null;
    }
    if (amountApprovedForRelease === "") {
        amountApprovedForRelease = null;
    }
    if (amountReleased90 === "") {
        amountReleased90 = null;
    }
    if (amountReleased10 === "") {
        amountReleased10 = null;
    }
    if (noOfVessels === "") {
        noOfVessels = null;
    }
    
    const conn = await pool;
    const request = conn.request();

    // Setting input parameters for the SQL query
    request.input("fundApplicationNumber", fundApplicationNumber);
    request.input("shipyardName", shipyardName);
    request.input("fundApplicationDate", fundApplicationDate);
    request.input("fundApplicationDateFy", fundApplicationDateFy);
    request.input("actualDeliveryDate", actualDeliveryDate);
    request.input("actualDeliveryDateFy", actualDeliveryDateFy);
    request.input("actualContractPrice", actualContractPrice);
    request.input("noOfVessels", noOfVessels);
    request.input("grossTonnage", grossTonnage);
    // request.input("currentStage", currentStage);
    request.input("status", status);
    request.input("amountApprovedForRelease", amountApprovedForRelease);
    request.input("approvalDate", approvalDate);
    request.input("approvalDateFy", approvalDateFy);
    request.input("rejectedDate", rejectedDate);
    request.input("remarksForRejection", remarksForRejection);
    request.input("amountReleased90", amountReleased90);
    request.input("releaseDate90", releaseDate90);
    request.input("releaseDate90Fy", releaseDate90Fy);
    request.input("amountReleased10", amountReleased10);
    request.input("releaseDate10", releaseDate10);
    request.input("releaseDate10Fy", releaseDate10Fy);

    try {
        const result = await request.query(`INSERT INTO tbl_kpi_dgs_2_2_fa
            (
                fund_application_no,
                shipyard_name, 
                fund_application_date, 
                fund_application_date_financial_year,
                actual_delivery_date, 
                actual_delivery_date_financial_year, 
                actual_contract_price,
                no_of_vessels, 
                gross_tonnage, 
                status,
                amount_approved_for_release, 
                approval_date, 
                approval_date_financial_year,
                rejected_date, 
                remarks_for_rejection, 
                amount_released_90, 
                release_date_90, 
                release_date_90_fy,
                amount_released_10, 
                release_date_10, 
                release_date_10_fy 
            )
            VALUES
            (
                @fundApplicationNumber,
                @shipyardName, 
                @fundApplicationDate, 
                @fundApplicationDateFy, 
                @actualDeliveryDate, 
                @actualDeliveryDateFy, 
                @actualContractPrice, 
                @noOfVessels, 
                @grossTonnage, 
                @status,
                @amountApprovedForRelease, 
                @approvalDate, 
                @approvalDateFy, 
                @rejectedDate, 
                @remarksForRejection, 
                @amountReleased90, 
                @releaseDate90, 
                @releaseDate90Fy, 
                @amountReleased10, 
                @releaseDate10, 
                @releaseDate10Fy 
            )


        `);
  
        res.sendStatus(200);
               
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getKpi2_2_FA_List(req, res) {
    const conn = await pool;
    // const userID = req.params.userID;

    try {
        // const userResult = await conn.query(` SELECT role_id FROM tbl_user WHERE user_id = ${userID} `);
        // const { role_id } = userResult.recordset[0];

        const result = await conn.query(`
        SELECT 
            fund_application_no,
            shipyard_name,
            fund_application_date,
            fund_application_date_financial_year,
            actual_delivery_date,
            actual_delivery_date_financial_year,
            actual_contract_price,
            no_of_vessels,
            gross_tonnage,
            current_stage,
            status,
            amount_approved_for_release,
            approval_date,
            approval_date_financial_year,
            rejected_date,
            remarks_for_rejection,
            amount_released_90,
            release_date_90,
            release_date_90_fy,
            amount_released_10,
            release_date_10,
            release_date_10_fy

        FROM tbl_kpi_dgs_2_2_fa;
        
        ;`);

        res.json(result.recordset);
        // }

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function editDgsKpi2_2_Fa_Data(req, res) 
{
    const fundApplicationNumber     = req.body.fundApplicationNumber;
    const shipyardName              = req.body.shipyardName;
    let fundApplicationDate         = req.body.fundApplicationDate;
    const fundApplicationDateFy     = req.body.fundApplicationDateFy;
    let actualDeliveryDate          = req.body.actualDeliveryDate;
    const actualDeliveryDateFy      = req.body.actualDeliveryDateFy;
    const actualContractPrice       = req.body.actualContractPrice;
    const noOfVessels               = req.body.noOfVessels;
    const grossTonnage              = req.body.grossTonnage;
    // const currentStage           = req.body.currentStage;
    let amountApprovedForRelease    = req.body.amntApprovedForRelease;
    let approvalDate                = req.body.approvalDate;
    const approvalDateFy            = req.body.approvalDateFy;
    let rejectedDate                = req.body.rejectedDate;
    const remarksForRejection       = req.body.rejectionRemarks;
    let amountReleased90            = req.body.amntRelease90;
    let releaseDate90               = req.body.releaseDate90;
    const releaseDate90Fy           = req.body.releaseDate90Fy;
    let amountReleased10            = req.body.amntRelease10;
    let releaseDate10               = req.body.releaseDate10;
    const releaseDate10Fy           = req.body.releaseDate10Fy;
    const status                    = req.body.status;
    
    if (fundApplicationDate == "") {
        fundApplicationDate = null;
    }
    if (actualDeliveryDate == "") {
        actualDeliveryDate = null;
    }   
    if (approvalDate == "") {
        approvalDate = null;
    }
    if (rejectedDate == "") {
        rejectedDate = null;
    }
    if (releaseDate90 == "") {
        releaseDate90 = null;
    }
    if (releaseDate10 == "") {
        releaseDate10 = null;
    }
    if (amountApprovedForRelease === "") {
        amountApprovedForRelease = null;
    }
    if (amountReleased90 === "") {
        amountReleased90 = null;
    }
    if (amountReleased10 === "") {
        amountReleased10 = null;
    }
    const conn = await pool;
    const request = conn.request();

    // Setting input parameters for the SQL query
    request.input("fundApplicationNumber", fundApplicationNumber);
    request.input("shipyardName", shipyardName);
    request.input("fundApplicationDate", fundApplicationDate);
    request.input("fundApplicationDateFy", fundApplicationDateFy);
    request.input("actualDeliveryDate", actualDeliveryDate);
    request.input("actualDeliveryDateFy", actualDeliveryDateFy);
    request.input("actualContractPrice", actualContractPrice);
    request.input("noOfVessels", noOfVessels);
    request.input("grossTonnage", grossTonnage);
    // request.input("currentStage", currentStage);
    request.input("amountApprovedForRelease", amountApprovedForRelease);
    request.input("approvalDate", approvalDate);
    request.input("approvalDateFy", approvalDateFy);
    request.input("rejectedDate", rejectedDate);
    request.input("remarksForRejection", remarksForRejection);
    request.input("amountReleased90", amountReleased90);
    request.input("releaseDate90", releaseDate90);
    request.input("releaseDate90Fy", releaseDate90Fy);
    request.input("amountReleased10", amountReleased10);
    request.input("releaseDate10", releaseDate10);
    request.input("releaseDate10Fy", releaseDate10Fy);
    request.input("status", status);


    try {
        const result = await request.query(`
            UPDATE tbl_kpi_dgs_2_2_fa
            SET 
                shipyard_name = @shipyardName, 
                fund_application_date = @fundApplicationDate, 
                fund_application_date_financial_year = @fundApplicationDateFy,
                actual_delivery_date = @actualDeliveryDate, 
                actual_delivery_date_financial_year = @actualDeliveryDateFy, 
                actual_contract_price = @actualContractPrice,
                no_of_vessels = @noOfVessels, 
                gross_tonnage = @grossTonnage, 
                amount_approved_for_release = @amountApprovedForRelease, 
                approval_date = @approvalDate, 
                approval_date_financial_year = @approvalDateFy,
                rejected_date = @rejectedDate,
                remarks_for_rejection = @remarksForRejection,
                amount_released_90 = @amountReleased90, 
                release_date_90 = @releaseDate90, 
                release_date_90_fy = @releaseDate90Fy,
                amount_released_10 = @amountReleased10, 
                release_date_10 = @releaseDate10, 
                release_date_10_fy = @releaseDate10Fy, 
                status = @status
             
            OUTPUT INSERTED.fund_application_no
            WHERE fund_application_no = @fundApplicationNumber
        `);

        const fund_application_no = result.recordset[0].fund_application_no;    
        res.sendStatus(200);
               
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


async function getUpdateMmd_2_2Fa_Data(req, res) {
    const fundAppId = req.params.fundAppId;

    const conn = await pool;
    const request = conn.request();
    request.input("fundAppId", fundAppId);

    try {
        const result = await request.query(`SELECT * FROM tbl_kpi_dgs_2_2_fa  
            WHERE fund_application_no = @fundAppId ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
export default { downloadSampleDocument, getKpi2_2_List, checkData_2_2, addDgsKpi2_2_1Data, editDgsKpi2_2_1Data, getUpdateMmd_2_2Data, 
    downloadFASampleDocument, checkData_2_2_Fa, getKpi2_2_FA_List, addDgsKpi2_2_Fa_Data, editDgsKpi2_2_Fa_Data, getUpdateMmd_2_2Fa_Data };