import { pool } from "../../db.js";
import fs from 'fs';
import caDocuments from "./caAppointmentOrderUploader.js";

// An appointment is finished once the contract is signed. Stage 8 is the Contract Signed
// stage, so either marker counts. The Data List, the dashboard and the reports all read this
// one definition, so a record cannot be Pending on one screen and Completed on another.
const COMPLETED_SQL = `(ca.stage_id = 8 OR ca.contract_signed_date IS NOT NULL)`;

// tbl_ca_candidate.consultant_appointment_id is missing on older deployments. Probe once and
// reuse the answer instead of querying INFORMATION_SCHEMA on every request.
let candidateFkSupported = null;
async function hasCandidateFkColumn(conn) {
    if (candidateFkSupported !== null) return candidateFkSupported;
    try {
        const check = await conn.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'tbl_ca_candidate' AND COLUMN_NAME = 'consultant_appointment_id'
        `);
        candidateFkSupported = check.recordset?.length > 0;
    } catch {
        candidateFkSupported = false;
    }
    return candidateFkSupported;
}

// created_by / updated_by and the deletion log must identify the signed-in user. Taking the id
// from the request body or URL instead lets a caller attribute their changes to someone else.
function actingUserId(req) {
    const id = Number(req.user?.userId ?? req.user?.user_id ?? req.user?.id);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Accepts an array or a comma-separated string and keeps only usable positive ids.
function parseCandidateIdList(value) {
    const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
    return raw
        .map(v => parseInt(String(v).trim(), 10))
        .filter(n => Number.isInteger(n) && n > 0);
}

// The candidate reports join on the foreign key, so candidates attached while the appointment
// was first created have to be linked too, not merely listed in candidate_id.
async function linkCandidatesToAppointment(conn, appointmentId, candidateIds) {
    if (!candidateIds.length) return;
    if (!(await hasCandidateFkColumn(conn))) return;
    try {
        const linkReq = conn.request();
        linkReq.input('appointmentId', appointmentId);
        await linkReq.query(`
            UPDATE tbl_ca_candidate
            SET consultant_appointment_id = @appointmentId
            WHERE candidate_id IN (${candidateIds.join(',')})
        `);
    } catch (err) {
        console.error("Error linking candidates to consultant appointment:", err);
    }
}

async function createConsultantAppointment(req, res) {
    try {
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
        const candidateIdList = parseCandidateIdList(req.body.candidateIDs);
        const candidateIDs = candidateIdList.join(',');
        const stageID = req.body.stageID || 1;
        const userID = actingUserId(req);

        if (!userID) {
            return res.status(401).json({ message: "Your session has expired. Please sign in again." });
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
        await linkCandidatesToAppointment(conn, consultant_appointment_id, candidateIdList);
        return res.status(201).json({ consultant_appointment_id });
    } catch (err) {
        console.error("Error creating consultant appointment:", err);
        return res.status(500).json({ message: err.message || "Failed to create consultant appointment." });
    }
}

async function getConsultantAppointment(req, res) {
    const conn = await pool;
    const request = conn.request();

    const {
        page,
        limit,
        search,
        wing,
        division,
        status,
        stage,
        all
    } = req.query;

    const isFetchAll = all === 'true' || limit === 'all';
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNum - 1) * pageSize;

    let baseWhereClauses = [];

    // Search filter
    if (search && search.trim() !== '') {
        request.input('searchTerm', `%${search.trim()}%`);
        baseWhereClauses.push(`(
            w.wing_name LIKE @searchTerm OR 
            d.division_name LIKE @searchTerm OR 
            ca.appointment_type LIKE @searchTerm OR 
            stage.stage_name LIKE @searchTerm
        )`);
    }

    // Wing filter
    if (wing && wing !== 'All' && wing !== 'all' && wing !== '') {
        if (!isNaN(wing)) {
            request.input('wingId', parseInt(wing));
            baseWhereClauses.push(`ca.wing = @wingId`);
        } else {
            request.input('wingName', wing.trim());
            baseWhereClauses.push(`w.wing_name = @wingName`);
        }
    }

    // Division filter
    if (division && division !== 'All' && division !== 'all' && division !== '') {
        if (!isNaN(division)) {
            request.input('divisionId', parseInt(division));
            baseWhereClauses.push(`ca.division = @divisionId`);
        } else {
            request.input('divisionName', division.trim());
            baseWhereClauses.push(`d.division_name = @divisionName`);
        }
    }

    const baseWhereSql = baseWhereClauses.length > 0 ? `WHERE ${baseWhereClauses.join(' AND ')}` : '';

    let whereClauses = [...baseWhereClauses];

    // Status filter (pending vs completed) — same rule as the dashboard, see COMPLETED_SQL
    if (status === 'completed') {
        whereClauses.push(COMPLETED_SQL);
    } else if (status === 'pending') {
        whereClauses.push(`NOT ${COMPLETED_SQL}`);
    }

    // Stage filter
    if (stage && stage !== 'All' && stage !== 'all' && stage !== 'All Stages') {
        request.input('stageParam', stage.trim());
        whereClauses.push(`stage.stage_name = @stageParam`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
        // Query overall counts for tabs
        const countQuery = `
            SELECT
                COUNT(*) AS all_count,
                SUM(CASE WHEN ${COMPLETED_SQL} THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN ${COMPLETED_SQL} THEN 0 ELSE 1 END) AS pending_count
            FROM tbl_consultant_appointment ca
            JOIN mmt_wings w ON ca.wing = w.wing_id
            JOIN mmt_division d ON ca.division = d.division_id
            INNER JOIN mmt_consultant_appointment_stage AS stage ON ca.stage_id = stage.stage_id
            ${baseWhereSql};
        `;

        const countResult = await request.query(countQuery);
        const countRow = countResult.recordset?.[0] || {};
        const allCount = countRow.all_count || 0;
        const completedCount = countRow.completed_count || 0;
        const pendingCount = countRow.pending_count || 0;

        if (isFetchAll) {
            const result = await request.query(`
                SELECT
                    ca.*,
                    w.wing_name,
                    d.division_name,
                    stage.stage_name 
                FROM tbl_consultant_appointment ca
                JOIN mmt_wings w ON ca.wing = w.wing_id
                JOIN mmt_division d ON ca.division = d.division_id
                INNER JOIN mmt_consultant_appointment_stage AS stage ON ca.stage_id = stage.stage_id
                ${whereSql}
                ORDER BY ca.stage_id, ca.consultant_appointment_id DESC;
            `);
            return res.json(result.recordset);
        }

        request.input('offset', offset);
        request.input('pageSize', pageSize);

        const query = `
            SELECT
                ca.*,
                w.wing_name,
                d.division_name,
                stage.stage_name,
                COUNT(*) OVER() AS total_count
            FROM tbl_consultant_appointment ca
            JOIN mmt_wings w ON ca.wing = w.wing_id
            JOIN mmt_division d ON ca.division = d.division_id
            INNER JOIN mmt_consultant_appointment_stage AS stage ON ca.stage_id = stage.stage_id
            ${whereSql}
            ORDER BY ca.stage_id, ca.consultant_appointment_id DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;
        `;

        const result = await request.query(query);
        const rows = result.recordset || [];
        const total = rows.length > 0 ? rows[0].total_count : 0;

        res.json({
            data: rows,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize) || 1,
                allCount,
                pendingCount,
                completedCount
            }
        });
    } catch (err) {
        console.error("Error fetching consultant appointments:", err);
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
        const idList = parseCandidateIdList(caResult.recordset[0]?.candidate_id);

        const hasCol = await hasCandidateFkColumn(conn);

        let whereParts = [];
        if (hasCol) {
            whereParts.push(`c.consultant_appointment_id = @consultantAppointmentID`);
        }
        if (idList.length > 0) {
            whereParts.push(`c.candidate_id IN (${idList.join(',')})`);
        }

        if (whereParts.length === 0) {
            return res.json([]);
        }

        const query = `
            SELECT c.*, doc.appointment_order_document
            FROM tbl_ca_candidate c
            LEFT JOIN tbl_ca_candidate_document doc ON c.candidate_id = doc.candidate_id
            WHERE ${whereParts.join(' OR ')}
            ORDER BY c.candidate_id ASC
        `;

        const result = await request.query(query);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error fetching candidates for CA:", err);
        return res.status(500).json({ message: err.message || "Failed to fetch candidates." });
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
    const userID = actingUserId(req);

    if (!userID) {
        return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }

    // Without this an absent id updates nothing and still answers 200, so the form reports
    // "Changes Saved" for an edit that was never written.
    if (!consultantAppointmentId) {
        return res.status(400).json({ message: "Consultant appointment ID is required for update." });
    }

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

        // candidate_id is deliberately left alone here: candidates are attached and detached
        // through add-consultant-id and the delete endpoints, which keep it and the foreign
        // key in step. Writing a stale list from the form would unlink candidates.
        if (!result.recordset.length) {
            return res.status(404).json({ message: "Consultant appointment not found." });
        }

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
        if (!result.recordset.length) {
            return res.status(404).json({ message: "Consultant appointment not found." });
        }
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
        try {
            await request.query(`
                UPDATE tbl_ca_candidate
                SET consultant_appointment_id = @consultantAppointmentID
                WHERE candidate_id = @candidateID
            `);
        } catch (colErr) {
            // column consultant_appointment_id might not exist in tbl_ca_candidate
        }

        const caRes = await request.query(`
            SELECT candidate_id FROM tbl_consultant_appointment
            WHERE consultant_appointment_id = @consultantAppointmentID
        `);
        let currentIds = caRes.recordset[0]?.candidate_id ? String(caRes.recordset[0].candidate_id).split(',').map(s => s.trim()).filter(Boolean) : [];
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

// Shared deletion log. One timestamped file per deletion, under delete_log/Consultant_Appointment.
function openDeleteLog(prefix) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Local time throughout; the earlier version mixed a UTC date with a local clock time
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const logFolder = `./delete_log/Consultant_Appointment`;
    if (!fs.existsSync(logFolder)) {
        fs.mkdirSync(logFolder, { recursive: true });
    }
    return `${logFolder}/${prefix}_${timestamp}.txt`;
}

async function deleteCACandidateData(req, res) {
    try {
        const consultantAppointmentID = req.params.consultant_appointment_id;
        const userID = actingUserId(req);

        if (!userID) {
            return res.status(401).json({ message: "Your session has expired. Please sign in again." });
        }

        const conn = await pool;
        const request = conn.request();
        request.input('consultantAppointmentID', consultantAppointmentID);

        const result = await request.query(
            `SELECT * FROM tbl_consultant_appointment WHERE consultant_appointment_id = @consultantAppointmentID`
        );

        // Answer 404 instead of dereferencing a row that is not there and failing with a 500
        if (!result.recordset.length) {
            return res.status(404).send("No data found for deletion. Please Contact Administration");
        }

        const resultData = result.recordset[0];
        const existingCaID = resultData.consultant_appointment_id;
        const logFileName = openDeleteLog('deleted_Ca_log');

        // Candidates reachable either through the foreign key or the comma-separated list
        let candidateIds = [];
        if (await hasCandidateFkColumn(conn)) {
            const candFetchReq = conn.request();
            candFetchReq.input('existingCaID', existingCaID);
            const candidateResult = await candFetchReq.query(
                `SELECT candidate_id FROM tbl_ca_candidate WHERE consultant_appointment_id = @existingCaID`
            );
            candidateIds = candidateResult.recordset.map(r => r.candidate_id);
        }
        for (const id of parseCandidateIdList(resultData.candidate_id)) {
            if (!candidateIds.includes(id)) candidateIds.push(id);
        }

        let dbDocDeletions = 0;
        let fileSystemDeletions = 0;
        let dbCandidateDetailsDeletions = 0;

        for (const candidateId of candidateIds) {
            try {
                // Documents are removed by owner, not by filename: two candidates that happen
                // to share a filename would otherwise delete each other's rows
                const docReq = conn.request();
                docReq.input('candidateId', candidateId);
                const docs = await docReq.query(
                    `SELECT appointment_order_document FROM tbl_ca_candidate_document WHERE candidate_id = @candidateId`
                );

                for (const row of docs.recordset) {
                    const fileName = row.appointment_order_document;
                    fs.appendFileSync(logFileName,
                        `Deleted document '${fileName}' from tbl_ca_candidate_document. Deleted by userID -'${userID}'...\n`
                    );
                    if (caDocuments.removeUploadedFile(fileName)) fileSystemDeletions++;
                }

                const docDelReq = conn.request();
                docDelReq.input('candidateId', candidateId);
                const docDel = await docDelReq.query(
                    `DELETE FROM tbl_ca_candidate_document WHERE candidate_id = @candidateId`
                );
                dbDocDeletions += docDel.rowsAffected?.[0] || 0;

                fs.appendFileSync(logFileName,
                    `Deleted candidate '${candidateId}' from tbl_ca_candidate. Deleted by userID -'${userID}'..\n`
                );
                const candDelReq = conn.request();
                candDelReq.input('candidateId', candidateId);
                const candDel = await candDelReq.query(
                    `DELETE FROM tbl_ca_candidate WHERE candidate_id = @candidateId`
                );
                dbCandidateDetailsDeletions += candDel.rowsAffected?.[0] || 0;
            } catch (error) {
                console.error(`Error deleting candidate '${candidateId}' from the database:`, error);
            }
        }

        fs.appendFileSync(logFileName,
            `Deleted record '${JSON.stringify(resultData)}' from tbl_consultant_appointment. Deleted by userID -'${userID}'..\n`
        );

        const deleteReq = conn.request();
        deleteReq.input('consultantAppointmentID', consultantAppointmentID);
        const caDel = await deleteReq.query(
            `DELETE FROM tbl_consultant_appointment WHERE consultant_appointment_id = @consultantAppointmentID`
        );
        const dbDeletions = caDel.rowsAffected?.[0] || 0;

        if (dbDeletions === 0) {
            return res.status(404).send("No data found for deletion. Please Contact Administration");
        }

        let successMessage = `${dbDeletions} record(s) deleted from the database.`;
        if (dbCandidateDetailsDeletions > 0) successMessage += ` ${dbCandidateDetailsDeletions} candidate(s) deleted from the database.`;
        if (dbDocDeletions > 0) successMessage += ` ${dbDocDeletions} document(s) deleted from the database.`;
        if (fileSystemDeletions > 0) successMessage += ` ${fileSystemDeletions} file(s) removed from storage.`;
        return res.status(200).send(successMessage);

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function deleteCACandidateSingle(req, res) {
    try {
        const candidateID = parseInt(req.params.candidate_id, 10);
        const userID = actingUserId(req);

        if (!userID) {
            return res.status(401).json({ message: "Your session has expired. Please sign in again." });
        }
        if (!Number.isInteger(candidateID) || candidateID <= 0) {
            return res.status(400).json({ message: "A valid candidate ID is required." });
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
            caDocuments.removeUploadedFile(doc.appointment_order_document);
        }
        await request.query(`DELETE FROM tbl_ca_candidate_document WHERE candidate_id = @candidateID`);

        // 3. Delete from tbl_ca_candidate
        await request.query(`DELETE FROM tbl_ca_candidate WHERE candidate_id = @candidateID`);

        // 4. Drop the id from each appointment's comma-separated list. LIKE is only a coarse
        //    prefilter — '%1%' also matches '11,21' — so a row is rewritten only when the
        //    parsed list actually loses an entry.
        const caSearchReq = conn.request();
        caSearchReq.input('caSearchPattern', `%${candidateID}%`);
        const caList = await caSearchReq.query(`
            SELECT consultant_appointment_id, candidate_id
            FROM tbl_consultant_appointment
            WHERE candidate_id LIKE @caSearchPattern
        `);
        for (const ca of caList.recordset) {
            const ids = parseCandidateIdList(ca.candidate_id);
            const remaining = ids.filter(id => id !== candidateID);
            if (remaining.length === ids.length) continue;
            const req2 = conn.request();
            req2.input('newIdStr', remaining.join(','));
            req2.input('caId', ca.consultant_appointment_id);
            await req2.query(`
                UPDATE tbl_consultant_appointment
                SET candidate_id = @newIdStr
                WHERE consultant_appointment_id = @caId
            `);
        }

        // 5. Log deletion
        const logFileName = openDeleteLog('deleted_candidate_single_log');
        fs.appendFileSync(logFileName,
            `Deleted candidate ${candidateID} (${JSON.stringify(candData)}) by user ${userID} at ${new Date().toISOString()}\n`
        );

        return res.status(200).json({ message: "Candidate deleted successfully." });
    } catch (err) {
        console.error("Error deleting single candidate:", err);
        return res.status(500).json({ message: err.message || "Failed to delete candidate." });
    }
}

export default { getConsultantAppointment, createConsultantAppointment, addCandidateDetail, updateCandidateDetail, getCandidatesByConsultantAppointmentId, updateConsultantAppointment, 
    getCandidateDetail, getCandidateDetailDocument, getUpdateConsultantAppointmentData, 
    getCandidateID, addConsultantID, deleteCACandidateData, deleteCACandidateSingle };