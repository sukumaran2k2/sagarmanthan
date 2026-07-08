import { pool } from "../../db.js";
import fs from 'fs';

async function createConsultantAppointment(req, res) {
    const wing = req.body.wing;
    const division = req.body.division;
    const numberOfResources = req.body.resourceNumber;
    const appointmentType = req.body.appointmentType;
    const adminApprovalForNKGConsultant = req.body.adminApproval;
    let adminApprovalForNKGConsultantDate = req.body.adminApprovalDate;
    const tenderPublished = req.body.tenderPublished;
    let tenderPublishedDate = req.body.tenderPublishedDate;
    const preBidQueriesResponded = req.body.preBidQueriesResponded;
    let preBidQueriesRespondedDate = req.body.preBidQueriesRespondedDate;
    const bidReceived = req.body.bidReceived;
    let bidReceivedDate = req.body.bidReceivedDate;
    const technicalBidFinalized = req.body.technicalBidFinalized;
    let technicalBidFinalizedDate = req.body.technicalBidFinalizedDate;
    const financialBidFinalized = req.body.financialBidFinalized;
    let financialBidFinalizedDate = req.body.financialBidFinalizedDate;
    const workOrderIssued = req.body.workOrderIssued;
    let workOrderIssuedDate = req.body.workOrderIssuedDate;
    const contractSigned = req.body.contractSigned;
    let contractSignedDate = req.body.contractSignedDate;
    const nameOfConsultingFirm = req.body.consultingFirmName;
    let candidateIDs = req.body.candidateIDs;
    candidateIDs = candidateIDs.join(',');
    const stageID = req.body.stageID;
    const userID = req.body.userID;


    if (adminApprovalForNKGConsultantDate === "") {
        adminApprovalForNKGConsultantDate = null;
    }

    if (tenderPublishedDate === "") {
        tenderPublishedDate = null;
    }

    if (preBidQueriesRespondedDate === "") {
        preBidQueriesRespondedDate = null;
    }

    if (bidReceivedDate === "") {
        bidReceivedDate = null;
    }

    if (technicalBidFinalizedDate === "") {
        technicalBidFinalizedDate = null;
    }

    if (financialBidFinalizedDate === "") {
        financialBidFinalizedDate = null;
    }

    if (workOrderIssuedDate === "") {
        workOrderIssuedDate = null;
    }

    if (contractSignedDate === "") {
        contractSignedDate = null;
    }

    if (!wing || !division || !numberOfResources || !appointmentType) {
        return res.status(400).json({ message: "Required fields are missing." });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("wing", wing);
    request.input("division", division);
    request.input("numberOfResources", numberOfResources);
    request.input("appointmentType", appointmentType);
    request.input("adminApprovalForNKGConsultant", adminApprovalForNKGConsultant);
    request.input("adminApprovalForNKGConsultantDate", adminApprovalForNKGConsultantDate);
    request.input("tenderPublished", tenderPublished);
    request.input("tenderPublishedDate", tenderPublishedDate);
    request.input("preBidQueriesResponded", preBidQueriesResponded);
    request.input("preBidQueriesRespondedDate", preBidQueriesRespondedDate);
    request.input("bidReceived", bidReceived);
    request.input("bidReceivedDate", bidReceivedDate);
    request.input("technicalBidFinalized", technicalBidFinalized);
    request.input("technicalBidFinalizedDate", technicalBidFinalizedDate);
    request.input("financialBidFinalized", financialBidFinalized);
    request.input("financialBidFinalizedDate", financialBidFinalizedDate);
    request.input("workOrderIssued", workOrderIssued);
    request.input("workOrderIssuedDate", workOrderIssuedDate);
    request.input("contractSigned", contractSigned);
    request.input("contractSignedDate", contractSignedDate);
    request.input("nameOfConsultingFirm", nameOfConsultingFirm);
    request.input("candidateIDs", candidateIDs);
    request.input("stageID", stageID);
    request.input("userID", userID);

    try {
        const result = await request.query(`
            INSERT INTO tbl_consultant_appointment (
                wing, division, number_of_resources, appointment_type,
                admin_approval_for_nkg_consultant, admin_approval_for_nkg_consultant_date,
                tender_published, tender_published_date, pre_bid_queries_responded,
                pre_bid_queries_responded_date, bid_received, bid_received_date,
                technical_bid_finalized, technical_bid_finalized_date, financial_bid_finalized,
                financial_bid_finalized_date, work_order_issued, work_order_issued_date,
                contract_signed, contract_signed_date, name_of_consulting_firm, candidate_id, stage_id, created_by
            )
            OUTPUT INSERTED.consultant_appointment_id
            VALUES (
                @wing, @division, @numberOfResources, @appointmentType,
                @adminApprovalForNKGConsultant, @adminApprovalForNKGConsultantDate,
                @tenderPublished, @tenderPublishedDate, @preBidQueriesResponded,
                @preBidQueriesRespondedDate, @bidReceived, @bidReceivedDate,
                @technicalBidFinalized, @technicalBidFinalizedDate, @financialBidFinalized,
                @financialBidFinalizedDate, @workOrderIssued, @workOrderIssuedDate,
                @contractSigned, @contractSignedDate, @nameOfConsultingFirm, @candidateIDs, @stageID, @userID
            )
        `);

        const consultant_appointment_id = result.recordset[0].consultant_appointment_id;

        res.status(201).json({ consultant_appointment_id });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getConsultantAppointment(req, res) {
    const conn = await pool;

    try {

        const result = await conn.query(`SELECT
        ca.*,
        w.wing_name,
        d.division_name,
        stage.stage_name 
    FROM
        tbl_consultant_appointment ca
    JOIN
        mmt_wings w ON ca.wing = w.wing_id
    JOIN
        mmt_division d ON ca.division = d.division_id
    INNER JOIN
        mmt_consultant_appointment_stage AS stage ON ca.stage_id = stage.stage_id
    ORDER BY stage_id;   
    `);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function addCandidateDetail(req, res) {
    const name = req.body.name;
    const qualification = req.body.qualification;
    const workExperience = req.body.workExperience;
    const salary = req.body.salary;
    const category = req.body.category;
    const appointmentDate = req.body.appointmentDate;
    const skillSet = req.body.skillSet;

    const conn = await pool;
    const request = conn.request();

    request.input('name', name);
    request.input('qualification', qualification);
    request.input('workExperience', workExperience);
    request.input('salary', salary);
    request.input('category', category);
    request.input('appointmentDate', appointmentDate);
    request.input('skillSet', skillSet);

    try {
        const result = await request.query(`
            INSERT INTO tbl_ca_candidate 
            (name, qualification, work_experience, salary, category, date_of_appointment, skill_set) 
            OUTPUT INSERTED.candidate_id
            VALUES (@name, @qualification, @workExperience, @salary, @category, @appointmentDate, @skillSet)
        `);

        const candidate_id = result.recordset[0].candidate_id;

        res.status(201).json({ candidate_id });
    } catch (err) {
        if (err.number === 2627) {
            return res.status(409).json({});
        } else {
            console.error(err);
            return res.sendStatus(500);
        }
    }
}

async function updateConsultantAppointment(req, res) {
    const consultantAppointmentId = req.body.consultantAppointmentID;
    const wing = req.body.wing;
    const division = req.body.division;
    const appointmentType = req.body.appointmentType;
    const adminApprovalForNKGConsultant = req.body.adminApproval;
    let adminApprovalForNKGConsultantDate = req.body.adminApprovalDate;
    const tenderPublished = req.body.tenderPublished;
    let tenderPublishedDate = req.body.tenderPublishedDate;
    const preBidQueriesResponded = req.body.preBidQueriesResponded;
    let preBidQueriesRespondedDate = req.body.preBidQueriesRespondedDate;
    const bidReceived = req.body.bidReceived;
    let bidReceivedDate = req.body.bidReceivedDate;
    const technicalBidFinalized = req.body.technicalBidFinalized;
    let technicalBidFinalizedDate = req.body.technicalBidFinalizedDate;
    const financialBidFinalized = req.body.financialBidFinalized;
    let financialBidFinalizedDate = req.body.financialBidFinalizedDate;
    const workOrderIssued = req.body.workOrderIssued;
    let workOrderIssuedDate = req.body.workOrderIssuedDate;
    const contractSigned = req.body.contractSigned;
    let contractSignedDate = req.body.contractSignedDate;
    const consultingFirmName = req.body.consultingFirmName;
    const stageID = req.body.stageID;
    const userID = req.body.userID;
    if (adminApprovalForNKGConsultantDate === "") {
        adminApprovalForNKGConsultantDate = null;
    }

    if (tenderPublishedDate === "") {
        tenderPublishedDate = null;
    }

    if (preBidQueriesRespondedDate === "") {
        preBidQueriesRespondedDate = null;
    }

    if (bidReceivedDate === "") {
        bidReceivedDate = null;
    }

    if (technicalBidFinalizedDate === "") {
        technicalBidFinalizedDate = null;
    }

    if (financialBidFinalizedDate === "") {
        financialBidFinalizedDate = null;
    }

    if (workOrderIssuedDate === "") {
        workOrderIssuedDate = null;
    }

    if (contractSignedDate === "") {
        contractSignedDate = null;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("id", consultantAppointmentId);
    request.input("wing", wing);
    request.input("division", division);
    request.input("appointmentType", appointmentType);
    request.input("adminApprovalForNKGConsultant", adminApprovalForNKGConsultant);
    request.input("adminApprovalForNKGConsultantDate", adminApprovalForNKGConsultantDate);
    request.input("tenderPublished", tenderPublished);
    request.input("tenderPublishedDate", tenderPublishedDate);
    request.input("preBidQueriesResponded", preBidQueriesResponded);
    request.input("preBidQueriesRespondedDate", preBidQueriesRespondedDate);
    request.input("bidReceived", bidReceived);
    request.input("bidReceivedDate", bidReceivedDate);
    request.input("technicalBidFinalized", technicalBidFinalized);
    request.input("technicalBidFinalizedDate", technicalBidFinalizedDate);
    request.input("financialBidFinalized", financialBidFinalized);
    request.input("financialBidFinalizedDate", financialBidFinalizedDate);
    request.input("workOrderIssued", workOrderIssued);
    request.input("workOrderIssuedDate", workOrderIssuedDate);
    request.input("stageID", stageID);
    request.input("contractSigned", contractSigned);
    
    request.input("contractSignedDate", contractSignedDate);
    request.input("consultingFirmName", consultingFirmName);
    request.input("userID", userID);

    try {
        const result = await request.query(`
        UPDATE tbl_consultant_appointment
        SET wing = @wing,
            division = @division,
            appointment_type = @appointmentType,
            admin_approval_for_nkg_consultant = @adminApprovalForNKGConsultant,
            admin_approval_for_nkg_consultant_date = @adminApprovalForNKGConsultantDate,
            tender_published = @tenderPublished,
            tender_published_date = @tenderPublishedDate,
            pre_bid_queries_responded = @preBidQueriesResponded,
            pre_bid_queries_responded_date = @preBidQueriesRespondedDate,
            bid_received = @bidReceived,
            bid_received_date = @bidReceivedDate,
            technical_bid_finalized = @technicalBidFinalized,
            technical_bid_finalized_date = @technicalBidFinalizedDate,
            financial_bid_finalized = @financialBidFinalized,
            financial_bid_finalized_date = @financialBidFinalizedDate,
            work_order_issued = @workOrderIssued,
            work_order_issued_date = @workOrderIssuedDate,
            contract_signed = @contractSigned,
            contract_signed_date = @contractSignedDate,
            name_of_consulting_firm = @consultingFirmName,
            stage_id = @stageID,
            updated_by = @userID,
            updated_date = getDate()
            OUTPUT INSERTED.candidate_id, INSERTED.consultant_appointment_id
        WHERE consultant_appointment_id = @id
        `);

        const candidate_id = result.recordset[0].candidate_id;
        const consultant_appointment_id = result.recordset[0].consultant_appointment_id;

        res.status(201).json({ candidate_id, consultant_appointment_id });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCandidateDetail(req, res) {
    const Id = req.params.Id;
    const conn = await pool;
    const request = conn.request();
    request.input("Id", Id);

    try {

        const result = await request.query(`SELECT * FROM tbl_ca_candidate WHERE candidate_id = @Id`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCandidateDetailDocument(req, res) {
    const Id = req.params.Id;
    const conn = await pool;
    const request = conn.request();
    request.input("Id", Id);

    try {

        const result = await request.query(`SELECT * FROM tbl_ca_candidate_document WHERE candidate_id = @Id`);
        res.json(result.recordset);

    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function createConsultantAppointmentStage(req, res) {
    const consultantAppointmentID = req.body.consultantAppointmentID;
    const stage = req.body.selectedStage;

    const conn = await pool;
    const request = conn.request();

    request.input("consultantAppointmentID", consultantAppointmentID);
    request.input("stage", stage);

    try {

        const checkResult = await request.query(`
        SELECT COUNT(*) AS recordCount
        FROM tbl_consultant_appointment_stage
        WHERE consultant_appointment_id = @consultantAppointmentID
    `);

        if (checkResult.recordset[0].recordCount > 0) {

            const updateResult = await request.query(`
            UPDATE tbl_consultant_appointment_stage
            SET stage_name = @stage
            WHERE consultant_appointment_id = @consultantAppointmentID
        `);
        } else {

            const insertResult = await request.query(`
            INSERT INTO tbl_consultant_appointment_stage (consultant_appointment_id, stage_name)
            VALUES (@consultantAppointmentID, @stage);
        `);
        }
        res.sendStatus(201);
    }

    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getUpdateConsultantAppointmentData(req, res) {
    const consultantAppointmentID = req.params.consultantAppointmentID;

    const conn = await pool;
    const request = conn.request();
    request.input("consultantAppointmentID", consultantAppointmentID);

    try {
        const result = await request.query(`SELECT * FROM tbl_consultant_appointment WHERE tbl_consultant_appointment.consultant_appointment_id = @consultantAppointmentID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCandidateID(req, res) {
    const consultantAppointmentID = req.params.consultantAppointmentID;
    const conn = await pool;
    const request = conn.request();
    request.input("consultantAppointmentID", consultantAppointmentID);

    try {
        const result = await request.query(`SELECT candidate_id FROM tbl_consultant_appointment WHERE tbl_consultant_appointment.consultant_appointment_id = @consultantAppointmentID;`);
        const candidate_id = result.recordset[0].candidate_id;
        res.json({ candidate_id });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function addConsultantID(req, res) {
    const candidateID = req.body.candidateID;
    const consultantAppointmentID = req.body.consultantAppointmentID;

    if (!candidateID || !consultantAppointmentID) {
        return res.status(400).json({ message: "Required fields are missing." });
    }

    const conn = await pool;
    const request = conn.request();
    request.input("candidateID", candidateID);
    request.input("consultantAppointmentID", consultantAppointmentID);

    try {
        await request.query(`
            UPDATE tbl_ca_candidate
            SET consultant_appointment_id = @consultantAppointmentID
            WHERE candidate_id = @candidateID
        `);

        res.status(200).json({ message: "Consultant ID added successfully." });
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteCACandidateData(req, res) 
{    
    try {
        const consultantAppointmentID = req.params.consultant_appointment_id;
        const userID = req.params.userID;

        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
        const hourPart = String(now.getHours()).padStart(2, '0'); 
        const minutePart = String(now.getMinutes()).padStart(2, '0'); 
        const secondPart = String(now.getSeconds()).padStart(2, '0'); 
        const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
        const logFolder = `./delete_log/Consultant_Appointment`;
        const logFileName = `${logFolder}/deleted_Ca_log_${timestamp}.txt`;

        const conn = await pool;
        const request = conn.request();        
        request.input('consultantAppointmentID', consultantAppointmentID );

        const result = await request.query(
            `SELECT * FROM tbl_consultant_appointment WHERE consultant_appointment_id = @consultantAppointmentID`
        );
        
        // console.log("result",result);
        const existingCaID = result.recordset[0].consultant_appointment_id;

        //delete query for tbl_ca_candidate
        
        request.input('existingCaID', existingCaID);
        const candidateResult = await request.query(`SELECT * FROM tbl_ca_candidate WHERE consultant_appointment_id = @existingCaID`);
        // console.log("candidateResult",candidateResult);
        const candidateResultarray = candidateResult.recordset.length > 0 ? candidateResult.recordset.map(record => record.candidate_id) : [];
        // console.log("candidate Result array", candidateResultarray);

        //Fetching the document name based on candidate id from candidate_table and deletin the document from DB and local storage
        let DocFileResult;
        if (candidateResultarray.length > 0) {
            DocFileResult = await conn.query(`SELECT * FROM tbl_ca_candidate_document WHERE candidate_id IN (${candidateResultarray.join(', ')})`);
        } else {
            DocFileResult = []; 
        }   

        let DocfileNamearray = [];
        if (DocFileResult && DocFileResult.recordset) {
            DocfileNamearray = DocFileResult.recordset.map(record => record.appointment_order_document);
        } else {
            // Handle the case where DocFileResult is undefined or doesn't contain recordset
            console.error('DocFileResult is undefined or does not contain recordset.');
        }
        // console.log("Document file Name array",DocfileNamearray);
        
        let dbDeletions = 0;
        let dbDocDeletions = 0;
        let dbCandidateDetailsDeletions = 0;
        let fileSystemDeletions = 0;

        for (const fileName of DocfileNamearray) {

            const logMessage = `Deleted document '${fileName}' from tbl_ca_candidate_document. Deleted by userID -'${userID}'...\n`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });

            request.input('fileName', fileName);
            const docDeleteQuery = `DELETE FROM tbl_ca_candidate_document WHERE appointment_order_document = @fileName`;
            
            try{
                const result = await request.query(docDeleteQuery);
                // console.log(`Record with fileName '${fileName}' deleted from the database successfully.`);
                dbDocDeletions++;

                const filePath = `./fileuploads/Consultant_Appointment/${fileName}`;
                
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) {

                            console.error("Error deleting file:", err);
                        } else {
                            console.log(`File '${fileName}' deleted from the file system successfully.`);
                            fileSystemDeletions++;
                        }
                    });
                } else {
                    // console.log(`File '${fileName}' does not exist, no deletion needed.`);
                }

            }catch (error) {
                console.error(`Error deleting record with fileName '${fileName}' from the database:`, error);
            }
        }

        const candidateResultData = candidateResult.recordset[0];
        for (const candidates of candidateResultarray) {

            const logMessage = `Deleted candidate details '${JSON.stringify(candidateResultData)}' from tbl_ca_candidate. Deleted by userID -'${userID}'..\n`;
            fs.appendFile(logFileName, logMessage, (err) => {
                if (err) {
                    console.error('Error writing to delete_logs.txt:', err);
                }
            });
            request.input('candidates',candidates);
            const candidateDeleteQuery = `DELETE FROM tbl_ca_candidate WHERE candidate_id = @candidates`;
            
            try{
                
                const result = await request.query(candidateDeleteQuery);
                console.log(`Record with candidate_id candidate '${candidates}' deleted from the database successfully.`);
                dbCandidateDetailsDeletions++;

            }catch (error) {
                console.error(`Error deleting record with candidates '${candidates}' from the database:`, error);
            }
        }

        const resultData = result.recordset[0];
        const logMessage = `Deleted document '${JSON.stringify(resultData)}' from tbl_consultant_appointment. Deleted by userID -'${userID}'..\n`;
        fs.appendFile(logFileName, logMessage, (err) => {
            if (err) {
                console.error('Error writing to delete_logs.txt:', err);
            }
        });

        //delete ca record from db
       
        const deleteExisCaID = await request.query(
            `DELETE FROM tbl_consultant_appointment WHERE consultant_appointment_id = @consultantAppointmentID`
        );
        // console.log('deleteExisCaID', deleteExisCaID);
        dbDeletions++;

        // console.log("Record Details deleted successfully.");
        // console.log('db record Deletions are ', dbDeletions, 'db Documents Deletions are ', dbDocDeletions, 'file System Deletions are ', fileSystemDeletions);


        //sending status accordingly
        if (dbDeletions > 0 && dbDocDeletions > 0 && fileSystemDeletions > 0 && dbCandidateDetailsDeletions > 0) {

            // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            return res.status(201).send(`${dbDeletions} records deleted from the database and ${dbCandidateDetailsDeletions} candidate deleted from database and ${dbDocDeletions} Document deleted from the database.`);

        } else if (dbDeletions > 0) {

            let successMessage = `${dbDeletions} records deleted from the database.`;

            if (dbDocDeletions > 0) {
                successMessage += ` ${dbDocDeletions} documents deleted from the database.`;
            }

            if (dbCandidateDetailsDeletions > 0) {
                successMessage += ` ${dbCandidateDetailsDeletions} candidates deleted from the database.`;
            }

            if (fileSystemDeletions > 0) {
                // console.log(`${fileSystemDeletions} Document deleted from the file system.`);
            }

            return res.status(201).send(successMessage);
        } else {

            return res.status(404).send("No data found for deletion. Please Contact Administration");

        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

export default { getConsultantAppointment, createConsultantAppointment, addCandidateDetail, updateConsultantAppointment, 
    getCandidateDetail, getCandidateDetailDocument, createConsultantAppointmentStage, getUpdateConsultantAppointmentData, 
    getCandidateID, addConsultantID, deleteCACandidateData };