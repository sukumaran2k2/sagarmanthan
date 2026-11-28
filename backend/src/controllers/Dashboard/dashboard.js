import { pool } from "../../db.js";

async function getDashboardCourtCaseStatus(req,res){

    const conn = await pool;
    const request = conn.request();
    
    try {
        const result = await request.query(`
    SELECT
        mmt_organisation.organisation_name,
        COUNT(DISTINCT arbitration.id) AS Arbitration_Cases,
        COUNT(DISTINCT conciliation.id) AS Conciliation_Cases,
        COUNT(DISTINCT litigation.id) AS Litigation_Cases
    FROM
        mmt_organisation
        LEFT JOIN
        [dbo].[tbl_arbitration_cases] AS arbitration ON mmt_organisation.organisation_id = arbitration.organisation_id
    LEFT JOIN
        [dbo].[tbl_conciliation_cases] AS conciliation ON mmt_organisation.organisation_id = conciliation.organisation_id
    LEFT JOIN
        tbl_litigation_cases AS litigation ON mmt_organisation.organisation_id = litigation.organisation_id
    WHERE organisation_category_id = 1 OR organisation_category_id = 3

    GROUP BY mmt_organisation.organisation_name;`);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        res.json({ rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDashboardDataEntryStatus(req,res){

    const conn = await pool;
    const request = conn.request();
    
    try {
        const result = await request.query(`
        SELECT 
            --ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No], 
            mmt_wings.wing_id AS [Wing ID],
            mmt_wings.wing_name AS [Wing Name],
            COALESCE(yp.total_young_professional, 0) AS [Young Professional],
            COALESCE(ca.total_consultant_appointment, 0) AS [Consultant Appointment],
            COALESCE(vr.total_vip_reference, 0) AS [Vip Reference],
            COALESCE(cnm.total_cabinet_notes_mopsw, 0) AS [Cabinet Notes Mopsw],
            COALESCE(cno.total_cabinet_notes_other_ministries, 0) AS [Cabinet Notes Other Ministries],
            COALESCE(ap.total_audit_para, 0) AS [Audit Paras],
            COALESCE(bp.total_bills, 0) AS [Bills and Pre Constitution acts],
            COALESCE(pis.total_parliamentary_issue, 0) AS [Parliamentary Issues]
            
        FROM 
            mmt_wings
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS total_young_professional 
            FROM tbl_young_professional 
            GROUP BY wing) yp ON mmt_wings.wing_id = yp.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS total_consultant_appointment 
            FROM tbl_consultant_appointment 
            GROUP BY wing) ca ON mmt_wings.wing_id = ca.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS total_vip_reference 
            FROM tbl_vip_reference_change 
            GROUP BY wing) vr ON mmt_wings.wing_id = vr.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_cabinet_notes_mopsw] 
            FROM tbl_cabinet_notes_mopsw 
            GROUP BY wing) cnm ON mmt_wings.wing_id = cnm.wing
        LEFT JOIN 
            -- Other ministry notes have no owning wing; count each note under the wings it was sent to for comments
            (SELECT w.wing_id AS wing, COUNT(DISTINCT n.cabinet_notes_ministry_id) AS [total_cabinet_notes_other_ministries]
            FROM tbl_cabinet_notes_ministry n
            CROSS APPLY STRING_SPLIT(n.sent_for_comments_wings, ',') s
            JOIN mmt_wings w ON LTRIM(RTRIM(s.value)) IN (CAST(w.wing_id AS NVARCHAR(10)), LTRIM(RTRIM(w.wing_name)))
            GROUP BY w.wing_id) cno ON mmt_wings.wing_id = cno.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_audit_para]
            FROM tbl_audit_para 
            GROUP BY wing) ap ON mmt_wings.wing_id = ap.wing
        LEFT JOIN 
            (SELECT d.wing_id AS wing, COUNT(*) AS [total_bills]
            FROM tbl_bill b
            JOIN mmt_division d ON d.division_id = b.division
            WHERE ISNULL(b.is_deleted, 0) = 0
            GROUP BY d.wing_id) bp ON mmt_wings.wing_id = bp.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_parliamentary_issue]
            FROM tbl_parliamentary_issue
            GROUP BY wing) pis ON mmt_wings.wing_id = pis.wing
        ORDER BY 
            mmt_wings.wing_id;
        `);

        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), 
            field: key,
        }));

        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getChatbotModuleGroups(req, res){
    const conn = await pool;
    const request = conn.request();

    try {

        const result = await request.query(`SELECT * from mmt_chatbot_module_group;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getChatbotModules(req, res){
    const conn = await pool;
    const request = conn.request();

    const groupId = req.params.groupId;

    try {

        const result = await request.input("groupId", groupId).query(`SELECT * from mmt_chatbot_module where module_group_id = @groupId`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getLogicalQueriesEmail(req, res){
    const conn = await pool;
    const request = conn.request();

    const moduleId = req.params.moduleId;
    let result;
    try {

        result = await request.input("moduleId", moduleId).query(`SELECT logical_queries_mail from mmt_chatbot_mail where module_id = @moduleId`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCCEmailsForLogicalQueries(req, res){
    const conn = await pool;
    const request = conn.request();

    const moduleId = req.params.moduleId;
    let result;
    try {

        result = await request.input("moduleId", moduleId).query(`SELECT logical_queries_mail_cc from mmt_chatbot_mail_cc where module_id = @moduleId`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getModuleName(req, res){
    const conn = await pool;
    const request = conn.request();

    const moduleId = req.params.moduleId;
    let result;
    try {

        result = await request.input("moduleId", moduleId).query(`SELECT module_name from mmt_chatbot_module where module_id = @moduleId`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getUserDetailsForMail(req, res) {
    const conn = await pool;
    const request = conn.request();

    const userId = req.params.userId;
    let result;
    try {
        request.input("userId", userId);
        result = await request.query(`
            SELECT 
                u.title,
                u.name,
                u.designation,
                u.email,
                o.organisation_name
            FROM 
                tbl_user u
            JOIN 
                mmt_organisation o ON u.organisation_id = o.organisation_id
            WHERE 
                u.user_id = @userId
        `);
        res.json(result.recordset);
      
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// The old home dashboard handlers were replaced by homeDashboard.js (GET /home-dashboard).
export default { getDashboardDataEntryStatus, getChatbotModuleGroups, getChatbotModules, getLogicalQueriesEmail, getCCEmailsForLogicalQueries, getModuleName, getUserDetailsForMail, getDashboardCourtCaseStatus };
