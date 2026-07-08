import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

async function createCourtCase(req, res) {
    const caseNo = req.body.caseNo;
    const caseName = req.body.caseName;
    const caseType = req.body.caseType;
    const courtType = req.body.courtType;
    const filedBy = req.body.filedBy;
    let filedOn = req.body.filedOn;
    const details = req.body.details;
    const description = req.body.description;
    const isMinistryParty = req.body.isMinistryParty;
    const party = req.body.party;
    const ministryRole = req.body.ministryRole;
    const ministryAction = req.body.ministryAction;
    const onBehalfMinistry = req.body.onBehalfMinistry;
    const isInterventionReq = req.body.isInterventionReq;
    const vakalatFiled = req.body.vakalatFiled;
    let vakalatFiledDate = req.body.vakalatFiledDate;
    const parawiseComPrep = req.body.parawiseComPrep;
    let parawiseComPrepDate = req.body.parawiseComPrepDate;
    const counterAffiPrep = req.body.counterAffiPrep;
    let counterAffiPrepDate = req.body.counterAffiPrepDate;
    const counterAffiApproved = req.body.counterAffiApproved;
    let counterAffiApprovedDate = req.body.counterAffiApprovedDate;
    const counterAffiFiled = req.body.counterAffiFiled;
    let counterAffiFiledDate = req.body.counterAffiFiledDate;
    const hearingStarted = req.body.hearingStarted;
    const numberHearingStarted = req.body.numberHearingStarted;
    const hearingStartedRemarks = req.body.hearingStartedRemarks;
    const orderPassed = req.body.orderPassed;
    let orderPassedDate = req.body.orderPassedDate;
    const orderPassedRemarks = req.body.orderPassedRemarks;
    const disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;
    let selectedStage = req.body.selectedStage;
    let financialValueMatter = req.body.financialValueMatter;
    const orgID = req.body.orgID;
    const userID = req.body.userID;

    if (filedOn === "") {
        filedOn = null;
    }

    if (vakalatFiledDate === "") {
        vakalatFiledDate = null;
    }
    if (parawiseComPrepDate === "") {
        parawiseComPrepDate = null;
    }
    if (counterAffiPrepDate === "") {
        counterAffiPrepDate = null;
    }
    if (counterAffiApprovedDate === "") {
        counterAffiApprovedDate = null;
    }
    if (counterAffiFiledDate === "") {
        counterAffiFiledDate = null;
    }
    if (orderPassedDate === "") {
        orderPassedDate = null;
    }
    if (disposedDate === "") {
        disposedDate = null;
    }
    if (financialValueMatter === "") {
        financialValueMatter = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("caseNo", caseNo);
    request.input("caseName", caseName);
    request.input("caseType", caseType);
    request.input("courtType", courtType);
    request.input("filedBy", filedBy);
    request.input("filedOn", filedOn);
    request.input("details", details);
    request.input("description", description);
    request.input("isMinistryParty", isMinistryParty);
    request.input("party", party);
    request.input("ministryRole", ministryRole);
    request.input("ministryAction", ministryAction);
    request.input("onBehalfMinistry", onBehalfMinistry);
    request.input("isInterventionReq", isInterventionReq);
    request.input("vakalatFiled", vakalatFiled);
    request.input("vakalatFiledDate", vakalatFiledDate);
    request.input("parawiseComPrep", parawiseComPrep);
    request.input("parawiseComPrepDate", parawiseComPrepDate);
    request.input("counterAffiPrep", counterAffiPrep);
    request.input("counterAffiPrepDate", counterAffiPrepDate);
    request.input("counterAffiApproved", counterAffiApproved);
    request.input("counterAffiApprovedDate", counterAffiApprovedDate);
    request.input("counterAffiFiled", counterAffiFiled);
    request.input("counterAffiFiledDate", counterAffiFiledDate);
    request.input("hearingStarted", hearingStarted);
    request.input("numberHearingStarted", numberHearingStarted);
    request.input("hearingStartedRemarks", hearingStartedRemarks);
    request.input("orderPassed", orderPassed);
    request.input("orderPassedDate", orderPassedDate);
    request.input("orderPassedRemarks", orderPassedRemarks);
    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);
    request.input("selectedStage", selectedStage);
    request.input("financialValueMatter", financialValueMatter);
    request.input("orgID", orgID);
    request.input("userID", userID);

    try {
        const result = await request.query(`
        INSERT INTO tbl_court_case (
            case_number, case_type, type_of_court, filled_by, filled_date, details, description, 
            is_ministry_a_party, party, is_reply_filed_on_behalf_of_ministry, is_ministry_intervention_required, 
            vakalat_filed, vakalat_filed_date, parawise_comments_prepared, parawise_comments_prepared_date, 
            counter_affidavit_prepared, counter_affidavit_prepared_date, counter_affidavit_approved, 
            counter_affidavit_approved_date, counter_affidavit_filed, counter_affidavit_filed_date, 
            hearing_started, number_of_hearing_completed, hearing_remark, order_passed, 
            order_passed_date, order_passed_remark, disposed, disposed_date, created_date, 
            case_name, ministry_role, ministry_action,stage_id, financial_value_matter,created_by,organisation_id
        )
        OUTPUT INSERTED.court_case_id
        VALUES (
            @caseNo, @caseType, @courtType, @filedBy, @filedOn, @details, @description, 
            @isMinistryParty, @party, @onBehalfMinistry, @isInterventionReq, 
            @vakalatFiled, @vakalatFiledDate, @parawiseComPrep, @parawiseComPrepDate, 
            @counterAffiPrep, @counterAffiPrepDate, @counterAffiApproved, 
            @counterAffiApprovedDate, @counterAffiFiled, @counterAffiFiledDate, 
            @hearingStarted, @numberHearingStarted, @hearingStartedRemarks, @orderPassed, 
            @orderPassedDate, @orderPassedRemarks, @disposed, @disposedDate, 
            GETDATE(), @caseName, @ministryRole, @ministryAction,@selectedStage,@financialValueMatter,@userID,@orgID
        )
    `);          
            const court_case_id = result.recordset[0].court_case_id;
            res.status(201).json({ court_case_id });
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    };

async function updateCourtCase(req, res) {
    const courtCaseID = req.body.courtCaseID;
    const caseNo = req.body.caseNo;
    const caseName = req.body.caseName;
    const caseType = req.body.caseType;
    const courtType = req.body.courtType;
    const filedBy = req.body.filedBy;
    let filedOn = req.body.filedOn;
    const details = req.body.details;
    const description = req.body.description;
    const isMinistryParty = req.body.isMinistryParty;
    const ministryRole = req.body.ministryRole;
    const party = req.body.party;
    const ministryAction = req.body.ministryAction;
    const onBehalfMinistry = req.body.onBehalfMinistry;
    const isInterventionReq = req.body.isInterventionReq;
    const vakalatFiled = req.body.vakalatFiled;
    let vakalatFiledDate = req.body.vakalatFiledDate;
    const parawiseComPrep = req.body.parawiseComPrep;
    let parawiseComPrepDate = req.body.parawiseComPrepDate;
    const counterAffiPrep = req.body.counterAffiPrep;
    let counterAffiPrepDate = req.body.counterAffiPrepDate;
    const counterAffiApproved = req.body.counterAffiApproved;
    let counterAffiApprovedDate = req.body.counterAffiApprovedDate;
    const counterAffiFiled = req.body.counterAffiFiled;
    let counterAffiFiledDate = req.body.counterAffiFiledDate;
    const hearingStarted = req.body.hearingStarted;
    const numberHearingStarted = req.body.numberHearingStarted;
    const hearingStartedRemarks = req.body.hearingStartedRemarks;
    const orderPassed = req.body.orderPassed;
    let orderPassedDate = req.body.orderPassedDate;
    const orderPassedRemarks = req.body.orderPassedRemarks;
    const disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;
    let selectedStage = req.body.selectedStage;
    let financialValueMatter = req.body.financialValueMatter;
    const userID = req.body.userID;

    if (filedOn === "") {
        filedOn = null;
    }
    if (vakalatFiledDate === "") {
        vakalatFiledDate = null;
    }
    if (parawiseComPrepDate === "") {
        parawiseComPrepDate = null;
    }
    if (counterAffiPrepDate === "") {
        counterAffiPrepDate = null;
    }
    if (counterAffiApprovedDate === "") {
        counterAffiApprovedDate = null;
    }
    if (counterAffiFiledDate === "") {
        counterAffiFiledDate = null;
    }
    if (orderPassedDate === "") {
        orderPassedDate = null;
    }
    if (disposedDate === "") {
        disposedDate = null;
    }
    if (financialValueMatter === "") {
        financialValueMatter = null;
    }
    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);
    request.input("caseNo", caseNo);
    request.input("caseName", caseName);
    request.input("caseType", caseType);
    request.input("courtType", courtType);
    request.input("filedBy", filedBy);
    request.input("filedOn", filedOn);
    request.input("details", details);
    request.input("description", description);
    request.input("isMinistryParty", isMinistryParty);
    request.input("ministryRole", ministryRole);
    request.input("party", party);
    request.input("ministryAction", ministryAction);
    request.input("onBehalfMinistry", onBehalfMinistry);
    request.input("isInterventionReq", isInterventionReq);
    request.input("vakalatFiled", vakalatFiled);
    request.input("vakalatFiledDate", vakalatFiledDate);
    request.input("parawiseComPrep", parawiseComPrep);
    request.input("parawiseComPrepDate", parawiseComPrepDate);
    request.input("counterAffiPrep", counterAffiPrep);
    request.input("counterAffiPrepDate", counterAffiPrepDate);
    request.input("counterAffiApproved", counterAffiApproved);
    request.input("counterAffiApprovedDate", counterAffiApprovedDate);
    request.input("counterAffiFiled", counterAffiFiled);
    request.input("counterAffiFiledDate", counterAffiFiledDate);
    request.input("hearingStarted", hearingStarted);
    request.input("numberHearingStarted", numberHearingStarted);
    request.input("hearingStartedRemarks", hearingStartedRemarks);
    request.input("orderPassed", orderPassed);
    request.input("orderPassedDate", orderPassedDate);
    request.input("orderPassedRemarks", orderPassedRemarks);
    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);
    request.input("selectedStage", selectedStage);
    request.input("financialValueMatter", financialValueMatter);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_court_case SET
            stage_id = @selectedStage,
            case_number = @caseNo,
            case_name = @caseName,
            case_type = @caseType,
            type_of_court = @courtType,
            filled_by = @filedBy,
            filled_date = @filedOn,
            details = @details,
            description = @description,
            is_ministry_a_party = @isMinistryParty,
            ministry_role = @ministryRole,
            party = @party,
            ministry_action = @ministryAction,
            is_reply_filed_on_behalf_of_ministry = @onBehalfMinistry,
            is_ministry_intervention_required = @isInterventionReq,
            vakalat_filed = @vakalatFiled,
            vakalat_filed_date = @vakalatFiledDate,
            parawise_comments_prepared = @parawiseComPrep,
            parawise_comments_prepared_date = @parawiseComPrepDate,
            counter_affidavit_prepared = @counterAffiPrep,
            counter_affidavit_prepared_date = @counterAffiPrepDate,
            counter_affidavit_approved = @counterAffiApproved,
            counter_affidavit_approved_date = @counterAffiApprovedDate,
            counter_affidavit_filed = @counterAffiFiled,
            counter_affidavit_filed_date = @counterAffiFiledDate,
            hearing_started = @hearingStarted,
            number_of_hearing_completed = @numberHearingStarted,
            hearing_remark = @hearingStartedRemarks,
            order_passed = @orderPassed,
            order_passed_date = @orderPassedDate,
            order_passed_remark = @orderPassedRemarks,
            disposed = @disposed,
            disposed_date = @disposedDate,
            financial_value_matter = @financialValueMatter,
            updated_by = @userID,
            updated_date = getDate()
            OUTPUT INSERTED.court_case_id
            WHERE court_case_id = @courtCaseID`);

        const court_case_id = result.recordset[0].court_case_id;
        res.status(201).json({ court_case_id });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCourtCase (req, res) 
{
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT * from tbl_court_case
        INNER JOIN mmt_court_case_stage AS stage ON tbl_court_case.stage_id = stage.court_case_id
        INNER JOIN mmt_organisation ON tbl_court_case.organisation_id = mmt_organisation.organisation_id
        ORDER BY stage_id;`);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUpdateCourtCase (req, res)
{
    const courtCaseID = req.params.courtCaseID;

    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);
    try
    {
        const result = await request.query(`SELECT * FROM tbl_court_case WHERE tbl_court_case.court_case_id = @courtCaseID;`);
    
        res.json(result.recordset);
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createCourtCaseStage (req, res)
{
    const courtCaseID = req.body.courtCaseID;
    const stage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();

    request.input("courtCaseID", courtCaseID);
    request.input("stage", stage);

    try {
    
        const checkResult = await request.query(`
        SELECT COUNT(*) AS recordCount
        FROM tbl_court_case_stage
        WHERE court_case_id = @courtCaseID
    `);

    if (checkResult.recordset[0].recordCount > 0) {

        const updateResult = await request.query(`
            UPDATE tbl_court_case_stage
            SET stage_name = @stage
            WHERE court_case_id = @courtCaseID
        `);
    } else {
  
        const insertResult = await request.query(`
            INSERT INTO tbl_court_case_stage (court_case_id, stage_name)
            VALUES (@courtCaseID, @stage);
        `);
    }
    res.sendStatus(201); 
}   

  
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

const uploadDestination = "./fileuploads/Court_Case";

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/Court_Case");
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }
});

async function addCaseDocumentUploader(req, res) {
    try {
        const conn = await pool;
        const request = conn.request(); 

        if (!req.files || req.files.length === 0 ) {
            return res.status(400).json({ error: "No files uploaded" });
        }
       
        const { courtCaseID } = req.body;

        const filenames = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;

            const uniqueFileName = generateUniqueFileName(originalFileName);

            const fileNameParam = `fileName${index}`;

            request.input(fileNameParam, uniqueFileName);
            request.input('courtCaseID', courtCaseID); 

            const result = await request.query(`
                INSERT INTO tbl_court_case_document (court_id, file_name)
                OUTPUT INSERTED.court_id
                VALUES (@courtCaseID, '${uniqueFileName}')
            `);

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }

        res.status(200).json({ message: "Court case documents created successfully",
            filenames, status: 200  });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
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

async function getCaseDocuments(req, res) {
    const courtCaseID = req.params.courtCaseID;

    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);

    try {
        let result = await request.query(`SELECT * 
        FROM tbl_court_case_document WHERE court_id = @courtCaseID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteCaseDocuments(req, res) {
    try {

        const courtID = req.params.courtID;
        const conn = await pool;

        const result = await conn.query(
            `SELECT ID,file_name FROM tbl_court_case_document WHERE ID = ${courtID}`
        );
        
        // console.log("result",result);

        const fileName = result.recordset[0].file_name; 
        
        //const fileResult = await conn.query(`SELECT id FROM tbl_attendance WHERE file_name = '${fileName}'`);
        //const fileId = fileResult.recordset[0].id;

        if (fs.existsSync(`./fileuploads/Court_Case/${fileName}`)) {
        
            fs.unlink(`./fileuploads/Court_Case/${fileName}`, (err) => {
                if (err) {
                    // Handle the error gracefully
                    console.error("Error deleting file:", err);
                }
            });
        } else {
            console.log("File does not exist, no deletion needed");
        }

        let results = await conn.query(`DELETE FROM tbl_court_case_document WHERE ID = ${courtID}`);
        
        res.status(201).send({ message: 'File and data deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

    async function downloadCaseDocument(req, res) {
        try {
            const courtID = req.params.courtID;
            const conn = await pool;
            
            const result = await conn.query(`SELECT file_name FROM tbl_court_case_document WHERE ID = ${courtID}`);
            const fileName = result.recordset[0].file_name;
            const file_path = path.join(__dirname, "../../../fileuploads/Court_Case", fileName);
            
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


export default { createCourtCase, getCourtCase, getUpdateCourtCase, 
                 updateCourtCase, createCourtCaseStage,
                 addCaseDocumentUploader, upload, getCaseDocuments,
                 deleteCaseDocuments, downloadCaseDocument }