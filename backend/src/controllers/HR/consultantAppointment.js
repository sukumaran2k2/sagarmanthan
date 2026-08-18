import { pool } from "../../db.js";
import fs from 'fs';
import path from 'path';
import sql from 'mssql';

function toBit(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return value ? 1 : 0;
    const n = String(value).trim().toLowerCase();
    if (n === "yes" || n === "1" || n === "true") return 1;
    if (n === "no" || n === "0" || n === "false") return 0;
    return null;
}

async function createConsultantAppointment(req, res) {
    try {
        console.log("createConsultantAppointment payload:", req.body);
        const wing = req.body.wing;
        const division = req.body.division;
        const numberOfResources = req.body.resourceNumber || req.body.numberOfResources || 1;
        const appointmentType = req.body.appointmentType || 'Full Time';
        
        const adminApprovalDate = req.body.adminApprovalDate || null;
        const adminApprovalRemarks = req.body.adminApprovalRemarks || req.body.remarks?.adminApproval || null;
        
        const tenderPublishedDate = req.body.tenderPublishedDate || null;
        const tenderPublishedRemarks = req.body.tenderPublishedRemarks || req.body.remarks?.tenderPublished || null;
        
        const preBidQueriesRespondedDate = req.body.preBidQueriesRespondedDate || req.body.preBidQueriesDate || null;
        const preBidQueriesRespondedRemarks = req.body.preBidQueriesRespondedRemarks || req.body.remarks?.preBidQueries || null;
        
        const bidReceivedDate = req.body.bidReceivedDate || null;
        const bidReceivedRemarks = req.body.bidReceivedRemarks || req.body.remarks?.bidReceived || null;
        
        const technicalBidFinalizedDate = req.body.technicalBidFinalizedDate || req.body.techBidFinalizedDate || null;
        const technicalBidFinalizedRemarks = req.body.technicalBidFinalizedRemarks || req.body.remarks?.techBidFinalized || null;
        
        const financialBidFinalizedDate = req.body.financialBidFinalizedDate || req.body.finBidFinalizedDate || null;
        const financialBidFinalizedRemarks = req.body.financialBidFinalizedRemarks || req.body.remarks?.finBidFinalized || null;
        
        const workOrderIssuedDate = req.body.workOrderIssuedDate || null;
        const workOrderIssuedRemarks = req.body.workOrderIssuedRemarks || req.body.remarks?.workOrderIssued || null;
        
        const contractSignedDate = req.body.contractSignedDate || null;
        const contractSignedRemarks = req.body.contractSignedRemarks || req.body.remarks?.contractSigned || null;
        
        const nameOfConsultingFirm = req.body.consultingFirmName || '';
        let candidateIDs = req.body.candidateIDs;
        if (Array.isArray(candidateIDs)) {
            candidateIDs = candidateIDs.join(',');
        } else {
            candidateIDs = candidateIDs ? String(candidateIDs) : '';
        }
        const stageID = req.body.stageID || 1;
        const userID = req.body.userID || 1;

        if (!wing || !division || !numberOfResources || !appointmentType) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        const conn = await pool;
        const request = conn.request();
        request.input("wing", wing);
        request.input("division", division);
        request.input("numberOfResources", numberOfResources);
        request.input("appointmentType", appointmentType);
        request.input("adminApprovalDate", adminApprovalDate);
        request.input("adminApprovalRemarks", adminApprovalRemarks);
        request.input("tenderPublishedDate", tenderPublishedDate);
        request.input("tenderPublishedRemarks", tenderPublishedRemarks);
        request.input("preBidQueriesRespondedDate", preBidQueriesRespondedDate);
        request.input("preBidQueriesRespondedRemarks", preBidQueriesRespondedRemarks);
        request.input("bidReceivedDate", bidReceivedDate);
        request.input("bidReceivedRemarks", bidReceivedRemarks);
        request.input("technicalBidFinalizedDate", technicalBidFinalizedDate);
        request.input("technicalBidFinalizedRemarks", technicalBidFinalizedRemarks);
        request.input("financialBidFinalizedDate", financialBidFinalizedDate);
        request.input("financialBidFinalizedRemarks", financialBidFinalizedRemarks);
        request.input("workOrderIssuedDate", workOrderIssuedDate);
        request.input("workOrderIssuedRemarks", workOrderIssuedRemarks);
        request.input("contractSignedDate", contractSignedDate);
        request.input("contractSignedRemarks", contractSignedRemarks);
        request.input("nameOfConsultingFirm", nameOfConsultingFirm);
        request.input("candidateIDs", candidateIDs);
        request.input("stageID", stageID);
        request.input("userID", userID);

        const result = await request.query(`
            INSERT INTO tbl_consultant_appointment (
                wing, division, number_of_resources, appointment_type,
                admin_approval_for_nkg_consultant_date, admin_approval_for_nkg_consultant_remarks,
                tender_published_date, tender_published_remarks,
                pre_bid_queries_responded_date, pre_bid_queries_responded_remarks,
                bid_received_date, bid_received_remarks,
                technical_bid_finalized_date, technical_bid_finalized_remarks,
                financial_bid_finalized_date, financial_bid_finalized_remarks,
                work_order_issued_date, work_order_issued_remarks,
                contract_signed_date, contract_signed_remarks,
                name_of_consulting_firm, candidate_id, stage_id, created_by, created_date
            )
            OUTPUT INSERTED.consultant_appointment_id
            VALUES (
                @wing, @division, @numberOfResources, @appointmentType,
                @adminApprovalDate, @adminApprovalRemarks,
                @tenderPublishedDate, @tenderPublishedRemarks,
                @preBidQueriesRespondedDate, @preBidQueriesRespondedRemarks,
                @bidReceivedDate, @bidReceivedRemarks,
                @technicalBidFinalizedDate, @technicalBidFinalizedRemarks,
                @financialBidFinalizedDate, @financialBidFinalizedRemarks,
                @workOrderIssuedDate, @workOrderIssuedRemarks,
                @contractSignedDate, @contractSignedRemarks,
                @nameOfConsultingFirm, @candidateIDs, @stageID, @userID, GETDATE()
            )
        `);

        const consultant_appointment_id = result.recordset[0].consultant_appointment_id;
        return res.status(201).json({ consultant_appointment_id });
    } catch (err) {
        console.error("Error creating consultant appointment:", err);
        return res.status(500).json({ message: err.message || "Failed to create consultant appointment." });
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
    ORDER BY ca.consultant_appointment_id DESC;   
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

async function updateCandidateDetail(req, res) {
    const candidate_id = req.body.candidate_id || req.body.candidateID;
    const name = req.body.name;
    const qualification = req.body.qualification;
    const workExperience = req.body.workExperience;
    const salary = req.body.salary;
    const category = req.body.category;
    const appointmentDate = req.body.appointmentDate;
    const skillSet = req.body.skillSet;

    if (!candidate_id) {
        return res.status(400).json({ message: "Candidate ID is required for update." });
    }

    const conn = await pool;
    const request = conn.request();

    request.input('candidate_id', candidate_id);
    request.input('name', name);
    request.input('qualification', qualification);
    request.input('workExperience', workExperience);
    request.input('salary', salary);
    request.input('category', category);
    request.input('appointmentDate', appointmentDate);
    request.input('skillSet', skillSet);

    try {
        await request.query(`
            UPDATE tbl_ca_candidate 
            SET name = @name,
                qualification = @qualification,
                work_experience = @workExperience,
                salary = @salary,
                category = @category,
                date_of_appointment = @appointmentDate,
                skill_set = @skillSet
            WHERE candidate_id = @candidate_id
        `);

        res.status(200).json({ message: "Candidate details updated successfully", candidate_id });
    } catch (err) {
        console.error("Error updating candidate detail:", err);
        return res.status(500).json({ message: "Failed to update candidate details." });
    }
}

async function getCandidatesByConsultantAppointmentId(req, res) {
    const consultantAppointmentID = req.params.consultantAppointmentID;
    const conn = await pool;
    const request = conn.request();
    request.input("consultantAppointmentID", consultantAppointmentID);

    try {
        const caResult = await request.query(`
            SELECT candidate_id FROM tbl_consultant_appointment 
            WHERE consultant_appointment_id = @consultantAppointmentID
        `);
        const caCandidateIdStr = caResult.recordset[0]?.candidate_id || '';
        const idList = caCandidateIdStr
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);

        let query = `
            SELECT c.*, doc.appointment_order_document
            FROM tbl_ca_candidate c
            LEFT JOIN tbl_ca_candidate_document doc ON c.candidate_id = doc.candidate_id
            WHERE c.consultant_appointment_id = @consultantAppointmentID
        `;

        if (idList.length > 0) {
            query += ` OR c.candidate_id IN (${idList.join(',')})`;
        }

        query += ` ORDER BY c.candidate_id ASC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching candidates for CA:", err);
        return res.sendStatus(500);
    }
}

async function updateConsultantAppointment(req, res) {
    const consultantAppointmentId = req.body.consultantAppointmentID;
    const wing = req.body.wing;
    const division = req.body.division;
    const numberOfResources = req.body.resourceNumber || req.body.numberOfResources;
    const appointmentType = req.body.appointmentType || 'Full Time';
    
    const adminApprovalDate = req.body.adminApprovalDate || null;
    const adminApprovalRemarks = req.body.adminApprovalRemarks || req.body.remarks?.adminApproval || null;
    
    const tenderPublishedDate = req.body.tenderPublishedDate || null;
    const tenderPublishedRemarks = req.body.tenderPublishedRemarks || req.body.remarks?.tenderPublished || null;
    
    const preBidQueriesRespondedDate = req.body.preBidQueriesRespondedDate || req.body.preBidQueriesDate || null;
    const preBidQueriesRespondedRemarks = req.body.preBidQueriesRespondedRemarks || req.body.remarks?.preBidQueries || null;
    
    const bidReceivedDate = req.body.bidReceivedDate || null;
    const bidReceivedRemarks = req.body.bidReceivedRemarks || req.body.remarks?.bidReceived || null;
    
    const technicalBidFinalizedDate = req.body.technicalBidFinalizedDate || req.body.techBidFinalizedDate || null;
    const technicalBidFinalizedRemarks = req.body.technicalBidFinalizedRemarks || req.body.remarks?.techBidFinalized || null;
    
    const financialBidFinalizedDate = req.body.financialBidFinalizedDate || req.body.finBidFinalizedDate || null;
    const financialBidFinalizedRemarks = req.body.financialBidFinalizedRemarks || req.body.remarks?.finBidFinalized || null;
    
    const workOrderIssuedDate = req.body.workOrderIssuedDate || null;
    const workOrderIssuedRemarks = req.body.workOrderIssuedRemarks || req.body.remarks?.workOrderIssued || null;
    
    const contractSignedDate = req.body.contractSignedDate || null;
    const contractSignedRemarks = req.body.contractSignedRemarks || req.body.remarks?.contractSigned || null;
    
    const consultingFirmName = req.body.consultingFirmName || '';
    const stageID = req.body.stageID || 1;
    const userID = req.body.userID || 1;

    const conn = await pool;
    const request = conn.request();
    request.input("id", consultantAppointmentId);
    request.input("wing", wing);
    request.input("division", division);
    request.input("numberOfResources", numberOfResources);
    request.input("appointmentType", appointmentType);
    request.input("adminApprovalDate", adminApprovalDate);
    request.input("adminApprovalRemarks", adminApprovalRemarks);
    request.input("tenderPublishedDate", tenderPublishedDate);
    request.input("tenderPublishedRemarks", tenderPublishedRemarks);
    request.input("preBidQueriesRespondedDate", preBidQueriesRespondedDate);
    request.input("preBidQueriesRespondedRemarks", preBidQueriesRespondedRemarks);
    request.input("bidReceivedDate", bidReceivedDate);
    request.input("bidReceivedRemarks", bidReceivedRemarks);
    request.input("technicalBidFinalizedDate", technicalBidFinalizedDate);
    request.input("technicalBidFinalizedRemarks", technicalBidFinalizedRemarks);
    request.input("financialBidFinalizedDate", financialBidFinalizedDate);
    request.input("financialBidFinalizedRemarks", financialBidFinalizedRemarks);
    request.input("workOrderIssuedDate", workOrderIssuedDate);
    request.input("workOrderIssuedRemarks", workOrderIssuedRemarks);
    request.input("contractSignedDate", contractSignedDate);
    request.input("contractSignedRemarks", contractSignedRemarks);
    request.input("consultingFirmName", consultingFirmName);
    request.input("stageID", stageID);
    request.input("userID", userID);

    try {
        const result = await request.query(`
        UPDATE tbl_consultant_appointment
        SET wing = @wing,
            division = @division,
            number_of_resources = COALESCE(@numberOfResources, number_of_resources),
            appointment_type = @appointmentType,
            admin_approval_for_nkg_consultant_date = @adminApprovalDate,
            admin_approval_for_nkg_consultant_remarks = @adminApprovalRemarks,
            tender_published_date = @tenderPublishedDate,
            tender_published_remarks = @tenderPublishedRemarks,
            pre_bid_queries_responded_date = @preBidQueriesRespondedDate,
            pre_bid_queries_responded_remarks = @preBidQueriesRespondedRemarks,
            bid_received_date = @bidReceivedDate,
            bid_received_remarks = @bidReceivedRemarks,
            technical_bid_finalized_date = @technicalBidFinalizedDate,
            technical_bid_finalized_remarks = @technicalBidFinalizedRemarks,
            financial_bid_finalized_date = @financialBidFinalizedDate,
            financial_bid_finalized_remarks = @financialBidFinalizedRemarks,
            work_order_issued_date = @workOrderIssuedDate,
            work_order_issued_remarks = @workOrderIssuedRemarks,
            contract_signed_date = @contractSignedDate,
            contract_signed_remarks = @contractSignedRemarks,
            name_of_consulting_firm = @consultingFirmName,
            stage_id = @stageID,
            updated_by = @userID,
            updated_date = GETDATE()
            OUTPUT INSERTED.candidate_id, INSERTED.consultant_appointment_id
        WHERE consultant_appointment_id = @id
        `);

        const candidate_id = result.recordset[0]?.candidate_id;
        const consultant_appointment_id = result.recordset[0]?.consultant_appointment_id;

        res.status(200).json({ candidate_id, consultant_appointment_id });
    } catch (err) {
        console.error("Error updating consultant appointment:", err);
        return res.status(500).json({ message: err.message || "Failed to update consultant appointment." });
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

        const caRes = await request.query(`
            SELECT candidate_id FROM tbl_consultant_appointment
            WHERE consultant_appointment_id = @consultantAppointmentID
        `);
        let currentIds = caRes.recordset[0]?.candidate_id ? caRes.recordset[0].candidate_id.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!currentIds.includes(String(candidateID))) {
            currentIds.push(String(candidateID));
            const newIdStr = currentIds.join(',');
            const req2 = conn.request();
            req2.input("newIdStr", newIdStr);
            req2.input("consultantAppointmentID", consultantAppointmentID);
            await req2.query(`
                UPDATE tbl_consultant_appointment
                SET candidate_id = @newIdStr
                WHERE consultant_appointment_id = @consultantAppointmentID
            `);
        }

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

async function deleteCACandidateSingle(req, res) {
    try {
        const candidateID = req.params.candidate_id;
        const userID = req.params.userID || 1;

        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); 
        const hourPart = String(now.getHours()).padStart(2, '0'); 
        const minutePart = String(now.getMinutes()).padStart(2, '0'); 
        const secondPart = String(now.getSeconds()).padStart(2, '0'); 
        const timestamp = `${datePart}_${hourPart}${minutePart}${secondPart}`;
        const logFolder = `./delete_log/Consultant_Appointment`;
        const logFileName = `${logFolder}/deleted_candidate_single_log_${timestamp}.txt`;

        if (!fs.existsSync(logFolder)) {
            fs.mkdirSync(logFolder, { recursive: true });
        }

        const conn = await pool;
        const request = conn.request();
        request.input('candidateID', candidateID);

        // 1. Fetch Candidate details for logging
        const candResult = await request.query(`SELECT * FROM tbl_ca_candidate WHERE candidate_id = @candidateID`);
        const candData = candResult.recordset[0];
        if (!candData) {
            return res.status(404).json({ message: "Candidate not found." });
        }

        // 2. Fetch and delete candidate document
        const docResult = await request.query(`SELECT * FROM tbl_ca_candidate_document WHERE candidate_id = @candidateID`);
        for (const doc of docResult.recordset) {
            const fileName = doc.appointment_order_document;
            if (fileName) {
                const filePath = path.resolve('./fileuploads/Consultant_Appointment', fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (e) {
                        console.error('Error removing document file:', e);
                    }
                }
            }
        }
        await request.query(`DELETE FROM tbl_ca_candidate_document WHERE candidate_id = @candidateID`);

        // 3. Delete from tbl_ca_candidate
        await request.query(`DELETE FROM tbl_ca_candidate WHERE candidate_id = @candidateID`);

        // 4. Clean up candidate_id in tbl_consultant_appointment if present
        const caList = await conn.request().query(`
            SELECT consultant_appointment_id, candidate_id 
            FROM tbl_consultant_appointment 
            WHERE candidate_id LIKE '%${candidateID}%'
        `);
        for (const ca of caList.recordset) {
            const ids = (ca.candidate_id || '')
                .split(',')
                .map(s => s.trim())
                .filter(id => id && id !== String(candidateID));
            const newIdStr = ids.join(',');
            const req2 = conn.request();
            req2.input('newIdStr', newIdStr);
            req2.input('caId', ca.consultant_appointment_id);
            await req2.query(`
                UPDATE tbl_consultant_appointment 
                SET candidate_id = @newIdStr 
                WHERE consultant_appointment_id = @caId
            `);
        }

        // 5. Log deletion
        const logMsg = `Deleted candidate ${candidateID} (${JSON.stringify(candData)}) by user ${userID} at ${new Date().toISOString()}\n`;
        fs.appendFile(logFileName, logMsg, () => {});

        return res.status(200).json({ message: "Candidate deleted successfully." });
    } catch (err) {
        console.error("Error deleting single candidate:", err);
        return res.status(500).json({ message: err.message || "Failed to delete candidate." });
    }
}

export default { getConsultantAppointment, createConsultantAppointment, addCandidateDetail, updateCandidateDetail, getCandidatesByConsultantAppointmentId, updateConsultantAppointment, 
    getCandidateDetail, getCandidateDetailDocument, createConsultantAppointmentStage, getUpdateConsultantAppointmentData, 
    getCandidateID, addConsultantID, deleteCACandidateData, deleteCACandidateSingle };