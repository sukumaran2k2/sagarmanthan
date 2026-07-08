import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

async function createCourtCase(req, res) {

    const caseNo = req.body.caseNo;
    const caseName = req.body.caseName;
    const caseType = req.body.caseType;
    const OtherCaseType = req.body.OtherCaseType;
    const courtType = req.body.courtType;
    const OtherCourtType = req.body.OtherCourtType;
    const filedBy = req.body.filedBy;
    let filedOn = req.body.filedOn;
    const respondent = req.body.respondent;
    const petitionersAppellant = req.body.petitionersAppellant;
    const description = req.body.description;
    const details = req.body.details;
    const financialValueMatter = req.body.financialValueMatter;

    const isMinistryParty = req.body.isMinistryParty;
    const ministryRole = req.body.ministryRole;
    const party = req.body.party;
    const ministryAction = req.body.ministryAction;

    const isMinistryChallenged = req.body.isMinistryChallenged; //with uploader
    const ministryActAndRule = req.body.ministryActAndRule;
    const ministryActAndRuleOtherDetail = req.body.ministryActAndRuleOtherDetail

    const onBehalfMinistry = req.body.onBehalfMinistry;
    const isInterventionReq = req.body.isInterventionReq;
    const interventionDescription = req.body.interventionDescription;

    // const vakalatFiled = req.body.vakalatFiled;
    // let vakalatFiledDate = req.body.vakalatFiledDate;
    // const parawiseComPrep = req.body.parawiseComPrep;
    // let parawiseComPrepDate = req.body.parawiseComPrepDate;
    // const counterAffiPrep = req.body.counterAffiPrep;
    // let counterAffiPrepDate = req.body.counterAffiPrepDate;
    // const counterAffiApproved = req.body.counterAffiApproved;
    // let counterAffiApprovedDate = req.body.counterAffiApprovedDate;

    const counterAffiFiled = req.body.counterAffiFiled;
    const detailedNextStepDescription = req.body.detailedNextStepDescription;
    let counterAffiFiledDate = req.body.counterAffiFiledDate;
    const detailsofCurrentStatusDescription = req.body.detailsofCurrentStatusDescription;

    const hearingStarted = req.body.hearingStarted;
    const numberHearingStarted = req.body.numberHearingStarted;
    let hearingStartedRemarks = req.body.hearingStartedRemarks;
    const summaryofhearing = req.body.summaryofhearing;
    let FirstDateOfHearing = req.body.FirstDateOfHearing;

    const orderChallenged = req.body.orderChallenged; //new
    let lastCompExecutionDate = req.body.lastCompExecutionDate; //new
    const detailRequiredforExecution = req.body.detailRequiredforExecution; //new
    const detailsofHighAdj = req.body.detailsofHighAdj; //new
    const datebyWhichChallenge = req.body.datebyWhichChallenge; //new
    const currentStatusofActionTaken = req.body.currentStatusofActionTaken; //new   

    const executionAction = req.body.executionAction; //new
    const detailexecutionAction = req.body.detailexecutionAction; //new      

    const orderPassed = req.body.orderPassed;
    let orderPassedDate = req.body.orderPassedDate;

    let disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;
    const selectedStage = req.body.selectedStage;
    const orgID = req.body.orgID;
    const userID = req.body.userID;

    if (filedOn === "") {
        filedOn = null;
    }

    if (counterAffiFiledDate === "") {
        counterAffiFiledDate = null;
    }

    if (FirstDateOfHearing === "") {
        FirstDateOfHearing = null;
    }

    if (hearingStartedRemarks === "") {
        hearingStartedRemarks = null;
    }

    if (lastCompExecutionDate === "") {
        lastCompExecutionDate = null;
    }

    if (orderPassedDate === "") {
        orderPassedDate = null;
    }

    if (disposedDate === "") {
        disposedDate = null;
    }

    if (disposed === "" || disposed === undefined || disposed === 'NULL') {
        disposed = 0;
    }
    console.log('disposed', disposed);

    const conn = await pool;
    const request = conn.request();
    request.input("caseNo", caseNo);
    request.input("caseName", caseName);
    request.input("caseType", caseType);
    request.input("OtherCaseType", OtherCaseType);
    request.input("courtType", courtType);
    request.input("OtherCourtType", OtherCourtType);
    request.input("filedBy", filedBy);
    request.input("filedOn", filedOn);
    request.input("respondent", respondent);
    request.input("petitionersAppellant", petitionersAppellant);
    request.input("description", description);
    request.input("details", details);
    request.input("financialValueMatter", financialValueMatter);

    request.input("isMinistryParty", isMinistryParty);
    request.input("party", party);
    request.input("ministryRole", ministryRole);
    request.input("ministryAction", ministryAction);

    request.input("isMinistryChallenged", isMinistryChallenged);
    request.input("ministryActAndRule", ministryActAndRule);
    request.input("ministryActAndRuleOtherDetail", ministryActAndRuleOtherDetail);
    request.input("onBehalfMinistry", onBehalfMinistry);
    request.input("isInterventionReq", isInterventionReq);
    request.input("interventionDescription", interventionDescription);

    request.input("counterAffiFiled", counterAffiFiled);
    request.input("detailedNextStepDescription", detailedNextStepDescription);
    request.input("counterAffiFiledDate", counterAffiFiledDate);
    request.input("detailsofCurrentStatusDescription", detailsofCurrentStatusDescription);

    request.input("hearingStarted", hearingStarted);
    request.input("numberHearingStarted", numberHearingStarted);
    request.input("hearingStartedRemarks", hearingStartedRemarks);
    request.input("summaryofhearing", summaryofhearing);
    request.input("FirstDateOfHearing", FirstDateOfHearing);

    request.input("orderChallenged", orderChallenged);
    request.input("lastCompExecutionDate", lastCompExecutionDate);
    request.input("detailRequiredforExecution", detailRequiredforExecution);
    request.input("detailsofHighAdj", detailsofHighAdj);
    request.input("datebyWhichChallenge", datebyWhichChallenge);
    request.input("currentStatusofActionTaken", currentStatusofActionTaken);

    request.input("executionAction", executionAction);
    request.input("detailexecutionAction", detailexecutionAction);

    request.input("orderPassed", orderPassed);
    request.input("orderPassedDate", orderPassedDate);

    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);

    request.input("selectedStage", selectedStage);
    request.input("orgID", orgID);
    request.input("userID", userID);

    // @vakalatFiled, @vakalatFiledDate, @parawiseComPrep, @parawiseComPrepDate, 
    //             @counterAffiPrep, @counterAffiPrepDate, @counterAffiApproved, 
    //             @counterAffiApprovedDate,
    // vakalat_filed, vakalat_filed_date, parawise_comments_prepared, parawise_comments_prepared_date, 
    //             counter_affidavit_prepared, counter_affidavit_prepared_date, counter_affidavit_approved, 
    //             counter_affidavit_approved_date,
    try {
        const result = await request.query(`
        INSERT INTO tbl_court_case (
            case_number, case_type, Other_Case_Type, type_of_court, other_court_type, filled_by, filled_date, respondents, petitioners_Appellant, details, description, 
            is_ministry_a_party, party, ministry_action, is_reply_filed_on_behalf_of_ministry, is_ministry_intervention_required, intervention_Description,
            is_Ministry_Challenged, ministry_ActAndRule, ministryActAndRuleOtherDetail,
            counter_affidavit_filed, counter_affidavit_filed_description, counter_affidavit_filed_date, details_of_current_status_desc,
            hearing_started, number_of_hearing_completed, hearing_remark, summary_hearing, firstDate_Hearing,
            order_challenged_at_court, last_date_compl_Execution, detail_required_compl_execution, details_HighAdj, date_WhichChallenge, currentStatus_ActionTaken,
            execution_action_from_ministry, detail_action_from_ministry,
            order_passed, order_passed_date, 
            disposed, disposed_date, created_date, 
            case_name, ministry_role, stage_id, financial_value_matter, created_by, organisation_id
        )
        OUTPUT INSERTED.court_case_id             
        VALUES (
            @caseNo, @caseType, @OtherCaseType ,@courtType, @OtherCourtType, @filedBy, @filedOn, @respondent, @petitionersAppellant, @details, @description, 
            @isMinistryParty, @party, @ministryAction, @onBehalfMinistry, @isInterventionReq, @interventionDescription,
            @isMinistryChallenged, @ministryActAndRule, @ministryActAndRuleOtherDetail,
            @counterAffiFiled, @detailedNextStepDescription, @counterAffiFiledDate, @detailsofCurrentStatusDescription,
            @hearingStarted, @numberHearingStarted, @hearingStartedRemarks, @summaryofhearing, @FirstDateOfHearing,
            @orderChallenged, @lastCompExecutionDate, @detailRequiredforExecution, @detailsofHighAdj, @datebyWhichChallenge, @currentStatusofActionTaken,
            @executionAction, @detailexecutionAction,
            @orderPassed, @orderPassedDate, 
            @disposed, @disposedDate, GETDATE(), 
            @caseName, @ministryRole, @selectedStage, @financialValueMatter, @userID, @orgID
        );`);
        // console.log('query ', query);
        // console.log('result ', result);
        const court_case_id = result.recordset[0].court_case_id;
        res.status(201).json({ court_case_id });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function updateCourtCase(req, res) {

    const body = req.body;
    // console.log(body);

    const courtCaseID = req.body.courtCaseID;
    console.log('courtCaseID', courtCaseID);
    const caseNo = req.body.caseNo;
    const caseName = req.body.caseName;
    const caseType = req.body.caseType;
    const OtherCaseType = req.body.OtherCaseType;
    const courtType = req.body.courtType;
    const OtherCourtType = req.body.OtherCourtType;
    const filedBy = req.body.filedBy;
    let filedOn = req.body.filedOn;
    const respondent = req.body.respondent;
    const petitionersAppellant = req.body.petitionersAppellant;
    const details = req.body.details;
    const description = req.body.description;

    let financialValueMatter = req.body.financialValueMatter;

    const isMinistryParty = req.body.isMinistryParty;
    const party = req.body.party;
    const ministryRole = req.body.ministryRole;
    const ministryAction = req.body.ministryAction;

    const isMinistryChallenged = req.body.isMinistryChallenged;//with uploader
    const ministryActAndRule = req.body.ministryActAndRule;
    // console.log('ministryActAndRule:',ministryActAndRule);
    const ministryActAndRuleOtherDetail = req.body.ministryActAndRuleOtherDetail;
    // console.log('ministryActAndRuleOtherDetail',ministryActAndRuleOtherDetail);

    const onBehalfMinistry = req.body.onBehalfMinistry;
    const isInterventionReq = req.body.isInterventionReq;
    const interventionDescription = req.body.interventionDescription;

    const counterAffiFiled = req.body.counterAffiFiled;
    const detailedNextStepDescription = req.body.detailedNextStepDescription;
    let counterAffiFiledDate = req.body.counterAffiFiledDate;
    const detailsofCurrentStatusDescription = req.body.detailsofCurrentStatusDescription;

    const hearingStarted = req.body.hearingStarted;
    const numberHearingStarted = req.body.numberHearingStarted;
    let hearingStartedRemarks = req.body.hearingStartedRemarks;
    const summaryofhearing = req.body.summaryofhearing;
    let FirstDateOfHearing = req.body.FirstDateOfHearing;

    const orderChallenged = req.body.orderChallenged; //new
    let lastCompExecutionDate = req.body.lastCompExecutionDate; //new
    const detailRequiredforExecution = req.body.detailRequiredforExecution; //new
    const detailsofHighAdj = req.body.detailsofHighAdj; //new
    const datebyWhichChallenge = req.body.datebyWhichChallenge; //new
    const currentStatusofActionTaken = req.body.currentStatusofActionTaken; //new  

    const executionAction = req.body.executionAction; //new
    const detailexecutionAction = req.body.detailexecutionAction; //new  

    const orderPassed = req.body.orderPassed;
    let orderPassedDate = req.body.orderPassedDate;

    const disposed = req.body.disposed;
    let disposedDate = req.body.disposedDate;

    let selectedStage = req.body.selectedStage;
    const userID = req.body.userID;

    if (filedOn === "") {
        filedOn = null;
    }

    if (counterAffiFiledDate === "") {
        counterAffiFiledDate = null;
    }

    if (FirstDateOfHearing === "") {
        FirstDateOfHearing = null;
    }

    if (hearingStartedRemarks === "") {
        hearingStartedRemarks = null;
    }

    if (lastCompExecutionDate === "") {
        lastCompExecutionDate = null;
    }

    if (orderPassedDate === "") {
        orderPassedDate = null;
    }

    if (disposedDate === "") {
        disposedDate = null;
    }

    const conn = await pool;
    const request = conn.request();

    request.input("courtCaseID", courtCaseID);

    request.input("caseNo", caseNo);
    request.input("caseName", caseName);
    request.input("caseType", caseType);
    request.input("OtherCaseType", OtherCaseType);
    request.input("courtType", courtType);
    request.input("OtherCourtType", OtherCourtType);
    request.input("filedBy", filedBy);
    request.input("filedOn", filedOn);
    request.input("respondent", respondent);
    request.input("petitionersAppellant", petitionersAppellant);
    request.input("description", description);
    request.input("details", details);
    request.input("financialValueMatter", financialValueMatter);

    request.input("isMinistryParty", isMinistryParty);
    request.input("party", party);
    request.input("ministryRole", ministryRole);
    request.input("ministryAction", ministryAction);

    request.input("isMinistryChallenged", isMinistryChallenged);
    request.input("ministryActAndRule", ministryActAndRule);
    request.input("ministryActAndRuleOtherDetail", ministryActAndRuleOtherDetail);
    request.input("onBehalfMinistry", onBehalfMinistry);
    request.input("isInterventionReq", isInterventionReq);
    request.input("interventionDescription", interventionDescription);

    request.input("counterAffiFiled", counterAffiFiled);
    request.input("detailedNextStepDescription", detailedNextStepDescription);
    request.input("counterAffiFiledDate", counterAffiFiledDate);
    request.input("detailsofCurrentStatusDescription", detailsofCurrentStatusDescription);

    request.input("hearingStarted", hearingStarted);
    request.input("numberHearingStarted", numberHearingStarted);
    request.input("hearingStartedRemarks", hearingStartedRemarks);
    request.input("summaryofhearing", summaryofhearing);
    request.input("FirstDateOfHearing", FirstDateOfHearing);

    request.input("orderChallenged", orderChallenged);
    request.input("lastCompExecutionDate", lastCompExecutionDate);
    request.input("detailRequiredforExecution", detailRequiredforExecution);
    request.input("detailsofHighAdj", detailsofHighAdj);
    request.input("datebyWhichChallenge", datebyWhichChallenge);
    request.input("currentStatusofActionTaken", currentStatusofActionTaken);

    request.input("executionAction", executionAction);
    request.input("detailexecutionAction", detailexecutionAction);

    request.input("orderPassed", orderPassed);
    request.input("orderPassedDate", orderPassedDate);

    request.input("disposed", disposed);
    request.input("disposedDate", disposedDate);

    request.input("selectedStage", selectedStage);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            UPDATE tbl_court_case SET
            stage_id = @selectedStage, 
            case_number = @caseNo, 
            case_name = @caseName, 
            case_type = @caseType, 
            Other_Case_Type = @OtherCaseType,
            type_of_court = @courtType, 
            other_court_type = @OtherCourtType,
            filled_by = @filedBy, 
            filled_date = @filedOn, 
            respondents  = @respondent,
            petitioners_Appellant  = @petitionersAppellant,
            description = @description, 
            details = @details, 
            financial_value_matter = @financialValueMatter,
            
            is_ministry_a_party = @isMinistryParty, 
            party = @party,
            ministry_role = @ministryRole,  
            ministry_action = @ministryAction,
            
            is_Ministry_Challenged = @isMinistryChallenged,
            ministry_ActAndRule = @ministryActAndRule,
            ministryActAndRuleOtherDetail = @ministryActAndRuleOtherDetail,

            is_reply_filed_on_behalf_of_ministry = @onBehalfMinistry,
            is_ministry_intervention_required = @isInterventionReq, 
            intervention_Description = @interventionDescription,

            counter_affidavit_filed = @counterAffiFiled, 
            counter_affidavit_filed_description = @detailedNextStepDescription,
            counter_affidavit_filed_date = @counterAffiFiledDate, 
            details_of_current_status_desc = @detailsofCurrentStatusDescription,

            hearing_started = @hearingStarted,
            number_of_hearing_completed = @numberHearingStarted,
            hearing_remark = @hearingStartedRemarks,
            summary_hearing = @summaryofhearing,
            firstDate_Hearing = @FirstDateOfHearing,

            order_challenged_at_court = @orderChallenged, 
            last_date_compl_Execution = @lastCompExecutionDate, 
            detail_required_compl_execution = @detailRequiredforExecution, 
            details_HighAdj = @detailsofHighAdj,
            date_WhichChallenge = @datebyWhichChallenge,
            currentStatus_ActionTaken = @currentStatusofActionTaken,

            execution_action_from_ministry = @executionAction, 
            detail_action_from_ministry = @detailexecutionAction,                
                
            order_passed = @orderPassed,
            order_passed_date = @orderPassedDate,

            disposed = @disposed,
            disposed_date = @disposedDate,

            updated_date = getDate(),
            updated_by = @userID    
            
            OUTPUT INSERTED.court_case_id
            WHERE court_case_id = @courtCaseID`);

        if (result.recordset.length > 0) {
            const court_case_id = result.recordset[0].court_case_id;
            res.status(201).json({ court_case_id });
        } else {
            console.log("No court case ID returned from the query.");
            return res.sendStatus(500);
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCourtCase(req, res) {
    const conn = await pool;

    try {

        const result = await conn.query(`
        SELECT 
            tbl_court_case.court_case_id,
			tbl_court_case.case_number,
			tbl_court_case.case_type,
			tbl_court_case.description,
			tbl_court_case.updated_date,
			mmt_organisation.organisation_name,
			stage.court_case_stage_name
        from tbl_court_case
            INNER JOIN mmt_court_case_stage AS stage ON tbl_court_case.stage_id = stage.court_case_id
            INNER JOIN mmt_organisation ON tbl_court_case.organisation_id = mmt_organisation.organisation_id
        ORDER BY stage_id;
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUpdateCourtCase(req, res) {
    const courtCaseID = req.params.courtCaseID;

    const conn = await pool;
    const request = conn.request();
    request.input("courtCaseID", courtCaseID);
    try {
        const result = await request.query(`SELECT * FROM tbl_court_case WHERE tbl_court_case.court_case_id = @courtCaseID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createCourtCaseStage(req, res) {
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


    catch (err) {
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
        // console.log("Received files:", req.files);

        // const body = req.body;
        // console.log(body);

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const { courtCaseID } = req.body;

        const filenames = [];
        request.input('courtCaseID', courtCaseID);

        console.log('req.body', req.body);
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const originalFileName = file.originalname;
            console.log('req.body.buttonId', req.body.buttonId[index]);
            const buttonId = req.body.buttonId[index];
            if (buttonId === undefined) {
                console.error("Button ID is missing for file at index:", index);
                continue;
            }

            const uniqueFileName = generateUniqueFileName(originalFileName);

            const fileNameParam = `fileName${index}`;
            const buttonIdParam = `buttonId${index}`;

            request.input(fileNameParam, uniqueFileName);
            request.input(buttonIdParam, buttonId);

            const result = await request.query(`
                INSERT INTO tbl_court_case_document (court_id, file_name, document_field)
                OUTPUT INSERTED.court_id
                VALUES (@courtCaseID, @${fileNameParam}, @${buttonIdParam})
            `, {
                courtCaseID: courtCaseID,
                [fileNameParam]: uniqueFileName,
                [buttonIdParam]: buttonId
            });

            const destinationPath = `${uploadDestination}/${uniqueFileName}`;
            fs.renameSync(file.path, destinationPath);
            filenames.push(uniqueFileName);
        }

        res.status(200).json({
            message: "Court case documents created successfully",
            filenames, status: 200
        });
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


async function getCourtCaseReport(req, res) {
    try {
        const conn = await pool;

        const result = await conn.query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY org.organisation_id) AS [S No],
                    org.organisation_id AS [organisation_id],
                    org.organisation_name AS [Organisation],
                    COUNT(CASE WHEN cc.filled_date IS NOT NULL THEN 1 ELSE NULL END) AS [Total Cases],
                    SUM(CASE WHEN cc.disposed = 0 THEN 1 ELSE 0 END) AS [Live Cases],
                    SUM(CASE WHEN cc.disposed = 1 THEN 1 ELSE 0 END) AS [Disposed Cases],
                    SUM(CASE WHEN cc.is_ministry_a_party = 1 AND party = 'Main' THEN 1 ELSE 0 END) AS [Main Party],
                    SUM(CASE WHEN cc.is_ministry_a_party = 1 AND party = 'Proforma' THEN 1 ELSE 0 END) AS [Proforma Party],                    
                    --SUM(CASE WHEN cc.type_of_court = 'Supreme' THEN 1 ELSE 0 END) AS [SC Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'high' THEN 1 ELSE 0 END) AS [HC Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'District and Sessions' THEN 1 ELSE 0 END) AS [District And Session],
                    --SUM(CASE WHEN cc.type_of_court = 'Civil' THEN 1 ELSE 0 END) AS [Civil Court Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'Magistrate' THEN 1 ELSE 0 END) AS [Magistrate Court Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'Revenue' THEN 1 ELSE 0 END) AS [Revenue Court Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'Consumer' THEN 1 ELSE 0 END) AS [Consumer Court Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'Alternative Dispute Resolution' THEN 1 ELSE 0 END) AS [Alternative Dispute Resolution Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'Special' THEN 1 ELSE 0 END) AS [Special Court Cases],
                    --SUM(CASE WHEN cc.type_of_court = 'CBI' THEN 1 ELSE 0 END) AS [CBI Court Cases],
                    --SUM(CASE WHEN DATEDIFF(year, cc.filled_date, GETDATE()) > 5 AND cc.disposed = 0 THEN 1 ELSE 0 END) AS [Cases > 5 Years],
                    --SUM(CASE WHEN DATEDIFF(year, cc.filled_date, GETDATE()) > 10 AND cc.disposed = 0 THEN 1 ELSE 0 END) AS [Cases > 10 Years],
                    SUM(CASE WHEN cc.financial_value_matter > 1000000000 THEN 1 ELSE 0 END) AS [Financial Implication of than 100 Crores],
                    SUM(CASE WHEN cc.filled_date IS NOT NULL AND MONTH(cc.filled_date) = MONTH(GETDATE()) AND YEAR(cc.filled_date) = YEAR(GETDATE()) THEN 1 ELSE 0 END) AS [Matters Listed This Month]
                FROM 
                    mmt_organisation org
                LEFT JOIN 
                    tbl_court_case cc ON org.organisation_id = cc.organisation_id
                GROUP BY 
                    org.organisation_id, org.organisation_name;  
            `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

}


async function getDetailCourtCaseReport(req, res) {
    try {
        const Organisationid = req.params.organisationid;
        const type = req.params.type;
        let typeofcourt = req.params.typeofcourt;

        let typeofparty;
        console.log('type', type);
        if (type === "0") {
            typeofparty = 'Proforma';
        } else if (type === "1") {
            typeofparty = 'Main';
        } else { }

        const conn = await pool;
        const request = conn.request();

        request.input("Organisationid", Organisationid);
        request.input("typeofcourt", typeofcourt);

        let whereCondition = "";

        if (type !== undefined && type !== 'null') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                    AND cc.party = '${typeofparty}'`;
        }
        else if (typeofcourt === 'all') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid`;

        } else if (typeofcourt === 'liveCases') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                AND cc.disposed = 0`;

        } else if (typeofcourt === 'disposedCases') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                AND cc.disposed = 1`;

        } else if (typeofcourt === 'greaterThanFiveyears') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                AND cc.disposed = 0
                AND DATEDIFF(year, cc.filled_date, GETDATE()) > 5`;
        } else if (typeofcourt === 'greaterThanTenyears') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                AND cc.disposed = 0
                AND DATEDIFF(year, cc.filled_date, GETDATE()) > 10`;
        }
        else if (typeofcourt === 'moreThanHundredCrore') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid
                AND cc.financial_value_matter > 1000000000`;
        }
        else if (typeofcourt === 'mattersListedThisMonth') {
            whereCondition += ` WHERE cc.organisation_id = @Organisationid 
                AND cc.filled_date IS NOT NULL AND MONTH(cc.filled_date) = MONTH(GETDATE()) 
                AND YEAR(cc.filled_date) = YEAR(GETDATE())`;
        }
        else if (typeofcourt && typeofcourt !== undefined && typeofcourt !== 'null') {

            const courtTypeMappings = {
                "scCases": "Supreme",
                "hcCases": "high",
                "districtAndSession": "District and Sessions",
                "civilCourtCases": "Civil",
                "magistrateCourtCases": "Magistrate",
                "revenueCourtCases": "Revenue",
                "consumerCourtCases": "Consumer",
                "alternativeDisputeResolutionCases": "Alternative Dispute Resolution",
                "specialCourtCases": "Special",
                "cbiCourtCases": "CBI"
            };

            const mappedCourtType = courtTypeMappings[typeofcourt];

            if (mappedCourtType) {
                request.input("typeofcourtMapped", mappedCourtType);

                whereCondition += ` WHERE cc.organisation_id = @Organisationid
                        AND cc.type_of_court = @typeofcourtMapped`;
            }
        }
        else {
            return res.status(404).json({ error: 'please come back later' });
        }

        // else if (typeofcourt !== undefined && typeofcourt !== 'null') {
        //     const courtTypeMappings = {
        //         "scCases": "Supreme",
        //         "hcCases": "high",
        //         "districtAndSession": "District and Sessions",
        //         "civilCourtCases": "Civil",
        //         "magistrateCourtCases": "Magistrate",
        //         "revenueCourtCases": "Revenue",
        //         "consumerCourtCases": "Consumer",
        //         "alternativeDisputeResolutionCases": "Alternative Dispute Resolution",
        //         "specialCourtCases": "Special",
        //         "cbiCourtCases": "CBI"
        //     };

        //     const mappedCourtType = courtTypeMappings[typeofcourt];

        //     if(mappedCourtType) {
        //         request.input("typeofcourtMapped", mappedCourtType);

        //         whereCondition += ` WHERE cc.organisation_id = @Organisationid
        //             AND cc.type_of_court = @typeofcourtMapped`;
        //     }

        // whereCondition += ` WHERE cc.organisation_id = @Organisationid
        //     AND cc.type_of_court = @typeofcourt`;
        //}

        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY cc.court_case_id) AS [S No],
                cc.court_case_id AS [Court Case Id],
                --mo.organisation_name AS [Organisation Name],
                cc.type_of_court AS [Court Name],
                cc.case_type AS [Case Type],
                cc.case_number AS [Case Number],
                cc.description AS [Case Summary],
                cc.financial_value_matter AS [Financial Implication],
                stage.court_case_stage_name AS [Case Status],
                cc.hearing_remark AS [Next Date of Hearing],
                cc.details AS [Advocate Name]
                --cc.filled_by AS [Filled By],
                --CONVERT(varchar, cc.filled_date, 120) AS [Filled Date], --style code 120 for 'yyyy-MM-dd'
                
                --cc.ministry_role AS [Ministry Role],
                --cc.party AS [Party],
                --cc.ministry_action AS [Ministry Action],
                --CONVERT(varchar, cc.counter_affidavit_filed_date, 120) AS [Counter Affidavit Filed Date],
                --cc.number_of_hearing_completed AS [Number Of Hearing Completed],
                
                --CONVERT(varchar, cc.order_passed_date, 120) AS [Order Passed Date],
                --CONVERT(varchar, cc.disposed_date, 120) AS [Disposed Date],
                
                --cc.case_name AS [Case Name],
                --cc.intervention_description AS [Intervention Description],
                --cc.ministry_ActAndRule AS [Ministry Act And Rule],
                --cc.ministryActAndRuleOtherDetail AS [Ministry Act And Rule Other Detail],
                --CONVERT(varchar, cc.last_date_compl_execution, 120) AS [Last Date for Completing Execution],
                --cc.detail_required_compl_execution AS [Detail Required Compl Execution],
                --cc.detail_action_from_ministry AS [Detail Action From Ministry],
                --cc.counter_affidavit_filed_description AS [Counter Affidavit Filed Description]
            FROM 
                tbl_court_case AS cc
            LEFT JOIN 
                mmt_organisation AS mo ON cc.organisation_id = mo.organisation_id
            LEFT JOIN 
                mmt_court_case_stage stage ON cc.stage_id = stage.court_case_id
            ${whereCondition};
            `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
        }));

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
}

async function deleteCourtCaseData(req, res) {
    try {

        const courtCaseId = req.params.court_case_id;
        const userID = req.params.userID;
        const reasonForDeletion = req.params.reasonForDeletion;

        // console.log("courtCaseId",courtCaseId);
        // console.log("userID",userID);
        // console.log("reasonForDeletion",reasonForDeletion);

        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hourPart = String(now.getHours()).padStart(2, '0');
        const minutePart = String(now.getMinutes()).padStart(2, '0');
        const secondPart = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
        const logFolder = `./delete_log/Court_Case`;
        const logFileName = `${logFolder}/deleted_court_case_log_${timestamp}.txt`;

        const conn = await pool;

        const result = await conn.query(
            `SELECT * FROM tbl_court_case WHERE court_case_id = ${courtCaseId}`
        );
        console.log("result", result);

        const existingCCID = result.recordset[0].court_case_id;
        console.log('existingCCID', existingCCID);

        const DocFileResult = await conn.query(`SELECT file_name FROM tbl_court_case_document WHERE court_id = '${existingCCID}'`);
        console.log("DocFileResult", DocFileResult);

        const DocfileNamearray = DocFileResult.recordset.length > 0 ? DocFileResult.recordset.map(record => record.file_name) : [];
        console.log("Document file Name array", DocfileNamearray);

        let dbDeletions = 0;
        let dbDocDeletions = 0;
        let fileSystemDeletions = 0;

        // if(userID && courtCaseId){
        //     let successMessage = "received the parameter successfully";
        //     return res.status(201).send(successMessage);
        // }

        for (const fileName of DocfileNamearray) {

            const logMessage = `Deleting document '${fileName}' from tbl_court_case_document...\n Deleted by userID -'${userID}'... \n Reason:'${reasonForDeletion}'`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });

            const docDeleteQuery = `DELETE FROM tbl_court_case_document WHERE court_id = '${courtCaseId}'`;

            try {
                const result = await conn.query(docDeleteQuery);
                console.log(`Record with fileName '${fileName}' deleted from the database successfully.`);
                dbDocDeletions++;

                const filePath = `./fileuploads/Court_Case/${fileName}`;

                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) {

                            console.error("Error deleting file:", err);
                        } else {
                            // console.log(`File '${fileName}' deleted from the file system successfully.`);
                            fileSystemDeletions++;
                        }
                    });
                } else {
                    console.log(`File '${fileName}' does not exist, no deletion needed.`);
                }

            } catch (error) {
                console.error(`Error deleting record with fileName '${fileName}' from the database:`, error);
            }
        }

        // console.log("Documents deleted successfully!");
        const resultData = result.recordset[0];
        const logMessage = `Deleting document '${JSON.stringify(resultData)}' from tbl_court_case...\n Deleted by userID -'${userID}'... \n Reason:'${reasonForDeletion}'`;
        fs.appendFile(logFileName, logMessage, (err) => {
            if (err) {
                console.error('Error writing to delete_logs.txt:', err);
            }
        });

        const deleteexistMopswCabinetID = await conn.query(
            `DELETE FROM tbl_court_case WHERE court_case_id = ${courtCaseId}`
        );
        dbDeletions++;

        // console.log("Record Details deleted successfully.");
        // console.log('db record Deletions are ', dbDeletions, 'db Documents Deletions are ', dbDocDeletions, 'file System Deletions are ', fileSystemDeletions);

        if (dbDeletions > 0 && dbDocDeletions > 0 && fileSystemDeletions > 0) {

            // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbDocDeletions} Document deleted from the database.`);

        } else if (dbDeletions > 0) {

            if (dbDocDeletions > 0) {
                return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbDocDeletions} Document deleted from the database`);
            }

            return res.status(201).send(`${dbDeletions} records deleted from the database, but no files available in document.`);

        } else {

            return res.status(404).send("No data found for deletion. Please Contact Administration");

        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}


async function getActDropDownData(req, res) {
    const conn = await pool;
    const request = conn.request();

    try {
        let result = await request.query(`SELECT * 
            FROM mmt_court_case_acts`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getRuleDropDownData(req, res) {
    const actID = req.params.actID;
    const conn = await pool;
    const request = conn.request();
    request.input("actID", actID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_case_rules WHERE act_id = @actID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getSubCourtTypeDropDown(req, res) {
    const courtTypeID = req.params.courtTypeID;
    const conn = await pool;
    const request = conn.request();
    request.input("courtTypeID", courtTypeID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_sub_type WHERE court_type_id = @courtTypeID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getConsumerForumDropDown(req, res) {
    const consumerTypeID = req.params.consumerTypeID;
    const conn = await pool;
    const request = conn.request();
    request.input("consumerTypeID", consumerTypeID);
    try {
        let result = await request.query(`SELECT * 
        FROM mmt_court_consumer_sub_type WHERE consumer_type_id = @consumerTypeID ;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

export default {
    createCourtCase, getCourtCase, getUpdateCourtCase,
    updateCourtCase, createCourtCaseStage,
    addCaseDocumentUploader, upload, getCaseDocuments,
    deleteCaseDocuments, downloadCaseDocument,
    getCourtCaseReport, getDetailCourtCaseReport,
    deleteCourtCaseData, getActDropDownData, getRuleDropDownData, getSubCourtTypeDropDown, getConsumerForumDropDown
}