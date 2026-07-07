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
            FROM tbl_vip_reference 
            GROUP BY wing) vr ON mmt_wings.wing_id = vr.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_cabinet_notes_mopsw] 
            FROM tbl_cabinet_notes_mopsw 
            GROUP BY wing) cnm ON mmt_wings.wing_id = cnm.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_cabinet_notes_other_ministries]
            FROM tbl_cabinet_notes_ministry 
            GROUP BY wing) cno ON mmt_wings.wing_id = cno.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_audit_para]
            FROM tbl_audit_para 
            GROUP BY wing) ap ON mmt_wings.wing_id = ap.wing
        LEFT JOIN 
            (SELECT wing, COUNT(*) AS [total_bills]
            FROM tbl_bill
            GROUP BY wing) bp ON mmt_wings.wing_id = bp.wing
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

        const result = await request.query(`SELECT * from mmt_chatbot_module where module_group_id = '${groupId}'`);

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

        result = await request.query(`SELECT logical_queries_mail from mmt_chatbot_mail where module_id = '${moduleId}'`);

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

        result = await request.query(`SELECT logical_queries_mail_cc from mmt_chatbot_mail_cc where module_id = '${moduleId}'`);

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

        result = await request.query(`SELECT module_name from mmt_chatbot_module where module_id = '${moduleId}'`);

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
                u.user_id = '${userId}'
        `);
        res.json(result.recordset);
      
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getDashboardGemProAndCapex(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const userID = req.params.userId;
        request.input("userID", userID);
        const financialYear = getCurrentFinancialYear(); 
        request.input("financialYear", financialYear);

        // Get user role and organisation
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        if (!userResult.recordset.length) {
            return res.status(404).json({ error: "User not found" });
        }

        const { role_id, organisation_id } = userResult.recordset[0];

        let query = `
        ;WITH PriorityMonthGoodsCTE AS
        (
            SELECT *
            FROM (
                SELECT 
                    gm.goods_gem_id,
                    g.goods_financial_year,
                    g.goods_organisation_id,
                    month_data.MonthName,
                    month_data.MonthYear,
                    month_data.MonthValue,
                   ROW_NUMBER() OVER (
                    PARTITION BY g.goods_organisation_id
                    ORDER BY 
                        g.goods_financial_year DESC,   
                        month_data.MonthOrder DESC     
                    ) rn
                FROM tbl_gem_procurement_goods_monthly gm
                JOIN tbl_gem_procurement_goods g
                    ON gm.goods_gem_id = g.goods_gem_id
                CROSS APPLY (
                    VALUES
                        ('April', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_april, gm.procurement_outside_gem_april), 1),
                        ('May', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_may, gm.procurement_outside_gem_may), 2),
                        ('June', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_june, gm.procurement_outside_gem_june), 3),
                        ('July', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_july, gm.procurement_outside_gem_july), 4),
                        ('August', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_august, gm.procurement_outside_gem_august), 5),
                        ('September', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_september, gm.procurement_outside_gem_september), 6),
                        ('October', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_october, gm.procurement_outside_gem_october), 7),
                        ('November', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_november, gm.procurement_outside_gem_november), 8),
                        ('December', LEFT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_december, gm.procurement_outside_gem_december), 9),
                        ('January', RIGHT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_january, gm.procurement_outside_gem_january), 10),
                        ('February', RIGHT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_february, gm.procurement_outside_gem_february), 11),
                        ('March', RIGHT(g.goods_financial_year,4), COALESCE(gm.procurement_through_gem_march, gm.procurement_outside_gem_march), 12)
                ) month_data(MonthName, MonthYear, MonthValue, MonthOrder)
                WHERE month_data.MonthValue IS NOT NULL
            ) t WHERE rn = 1
        ),
        PriorityMonthServiceCTE AS
        (
            SELECT *
            FROM (
                SELECT 
                    gm.service_gem_id,
                    g.service_financial_year,
                    g.service_organisation_id,
                    month_data.MonthNameservice,
                    month_data.MonthYearservice,
                    month_data.MonthValueservice,
                    ROW_NUMBER() OVER (
                        PARTITION BY g.service_organisation_id
                        ORDER BY g.service_financial_year DESC,
                        month_data.MonthOrderservice DESC
                    ) rn
                FROM tbl_gem_procurement_service_monthly gm
                JOIN tbl_gem_procurement_service g
                    ON gm.service_gem_id = g.service_gem_id
                CROSS APPLY (
                    VALUES
                        ('April', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_april, gm.procurement_outside_gem_april), 1),
                        ('May', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_may, gm.procurement_outside_gem_may), 2),
                        ('June', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_june, gm.procurement_outside_gem_june), 3),
                        ('July', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_july, gm.procurement_outside_gem_july), 4),
                        ('August', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_august, gm.procurement_outside_gem_august), 5),
                        ('September', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_september, gm.procurement_outside_gem_september), 6),
                        ('October', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_october, gm.procurement_outside_gem_october), 7),
                        ('November', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_november, gm.procurement_outside_gem_november), 8),
                        ('December', LEFT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_december, gm.procurement_outside_gem_december), 9),
                        ('January', RIGHT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_january, gm.procurement_outside_gem_january), 10),
                        ('February', RIGHT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_february, gm.procurement_outside_gem_february), 11),
                        ('March', RIGHT(g.service_financial_year,4), COALESCE(gm.procurement_through_gem_march, gm.procurement_outside_gem_march), 12)
                ) month_data(MonthNameservice, MonthYearservice, MonthValueservice, MonthOrderservice)
                WHERE month_data.MonthValueservice IS NOT NULL
            ) t WHERE rn = 1
        ),
        PriorityMonthWorksCTE AS
        (
            SELECT *
            FROM (
                SELECT 
                    gm.works_gem_id,
                    g.works_financial_year,
                    g.works_organisation_id,
                    month_data.MonthNamework,
                    month_data.MonthYearwork,
                    month_data.MonthValuework,
                    ROW_NUMBER() OVER (
                        PARTITION BY g.works_organisation_id
                        ORDER BY g.works_financial_year DESC,
                        month_data.MonthOrderwork DESC
                    ) rn
                FROM tbl_gem_procurement_works_monthly gm
                JOIN tbl_gem_procurement_works g
                    ON gm.works_gem_id = g.works_gem_id
                CROSS APPLY (
                    VALUES
                        ('April', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_april, gm.procurement_outside_gem_april), 1),
                        ('May', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_may, gm.procurement_outside_gem_may), 2),
                        ('June', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_june, gm.procurement_outside_gem_june), 3),
                        ('July', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_july, gm.procurement_outside_gem_july), 4),
                        ('August', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_august, gm.procurement_outside_gem_august), 5),
                        ('September', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_september, gm.procurement_outside_gem_september), 6),
                        ('October', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_october, gm.procurement_outside_gem_october), 7),
                        ('November', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_november, gm.procurement_outside_gem_november), 8),
                        ('December', LEFT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_december, gm.procurement_outside_gem_december), 9),
                        ('January', RIGHT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_january, gm.procurement_outside_gem_january), 10),
                        ('February', RIGHT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_february, gm.procurement_outside_gem_february), 11),
                        ('March', RIGHT(g.works_financial_year,4), COALESCE(gm.procurement_through_gem_march, gm.procurement_outside_gem_march), 12)
                ) month_data(MonthNamework, MonthYearwork, MonthValuework, MonthOrderwork)
                WHERE month_data.MonthValuework IS NOT NULL
            ) t WHERE rn = 1
        ),
        LatestFY AS (
            SELECT 
                capex_organisation_id,
                MAX(capex_financial_year) AS latest_financial_year
            FROM dbo.tbl_capex
            GROUP BY capex_organisation_id
        ),
        LatestCapexEntryCTE AS (
        SELECT 
                c.capex_organisation_id,
                c.capex_financial_year,
                 CASE 
                    WHEN c.capex_financial_year = @financialYear 
                    THEN c.capex_total_value 
                    ELSE NULL 
                    END AS capex_total_value,
                
                PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1)   -- Month
        + '-' +
        CASE 
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) IN ('January','February','March')
                THEN RIGHT(c.capex_financial_year,4)
                ELSE LEFT(c.capex_financial_year,4)
        END
        
        + '-Week' +
        CAST(REPLACE(PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 2), 'Week', '') AS VARCHAR(2))
        AS LastEntryPeriod

        FROM dbo.tbl_capex c
        INNER JOIN dbo.tbl_capex_monthly m ON c.capex_id = m.capex_id
        


            CROSS APPLY (
                SELECT TOP 1 *
                FROM (VALUES
                ('capex_PPP_Week4_March', capex_PPP_Week4_March),
                ('capex_IEBR_Week4_March', capex_IEBR_Week4_March),
                ('capex_GBS_Week4_March', capex_GBS_Week4_March),
                ('capex_PPP_Week3_March', capex_PPP_Week3_March),
                ('capex_IEBR_Week3_March', capex_IEBR_Week3_March),
                ('capex_GBS_Week3_March', capex_GBS_Week3_March),
                ('capex_PPP_Week2_March', capex_PPP_Week2_March),
                ('capex_IEBR_Week2_March', capex_IEBR_Week2_March),
                ('capex_GBS_Week2_March', capex_GBS_Week2_March),
                ('capex_PPP_Week1_March', capex_PPP_Week1_March),
                ('capex_IEBR_Week1_March', capex_IEBR_Week1_March),
                ('capex_GBS_Week1_March', capex_GBS_Week1_March),

                -- FEBRUARY
                ('capex_PPP_Week4_February', capex_PPP_Week4_February),
                ('capex_IEBR_Week4_February', capex_IEBR_Week4_February),
                ('capex_GBS_Week4_February', capex_GBS_Week4_February),
                ('capex_PPP_Week3_February', capex_PPP_Week3_February),
                ('capex_IEBR_Week3_February', capex_IEBR_Week3_February),
                ('capex_GBS_Week3_February', capex_GBS_Week3_February),
                ('capex_PPP_Week2_February', capex_PPP_Week2_February),
                ('capex_IEBR_Week2_February', capex_IEBR_Week2_February),
                ('capex_GBS_Week2_February', capex_GBS_Week2_February),
                ('capex_PPP_Week1_February', capex_PPP_Week1_February),
                ('capex_IEBR_Week1_February', capex_IEBR_Week1_February),
                ('capex_GBS_Week1_February', capex_GBS_Week1_February),

                -- JANUARY
                ('capex_PPP_Week4_January', capex_PPP_Week4_January),
                ('capex_IEBR_Week4_January', capex_IEBR_Week4_January),
                ('capex_GBS_Week4_January', capex_GBS_Week4_January),
                ('capex_PPP_Week3_January', capex_PPP_Week3_January),
                ('capex_IEBR_Week3_January', capex_IEBR_Week3_January),
                ('capex_GBS_Week3_January', capex_GBS_Week3_January),
                ('capex_PPP_Week2_January', capex_PPP_Week2_January),
                ('capex_IEBR_Week2_January', capex_IEBR_Week2_January),
                ('capex_GBS_Week2_January', capex_GBS_Week2_January),
                ('capex_PPP_Week1_January', capex_PPP_Week1_January),
                ('capex_IEBR_Week1_January', capex_IEBR_Week1_January),
                ('capex_GBS_Week1_January', capex_GBS_Week1_January),

                -- DECEMBER
                ('capex_PPP_Week4_December', capex_PPP_Week4_December),
                ('capex_IEBR_Week4_December', capex_IEBR_Week4_December),
                ('capex_GBS_Week4_December', capex_GBS_Week4_December),
                ('capex_PPP_Week3_December', capex_PPP_Week3_December),
                ('capex_IEBR_Week3_December', capex_IEBR_Week3_December),
                ('capex_GBS_Week3_December', capex_GBS_Week3_December),
                ('capex_PPP_Week2_December', capex_PPP_Week2_December),
                ('capex_IEBR_Week2_December', capex_IEBR_Week2_December),
                ('capex_GBS_Week2_December', capex_GBS_Week2_December),
                ('capex_PPP_Week1_December', capex_PPP_Week1_December),
                ('capex_IEBR_Week1_December', capex_IEBR_Week1_December),
                ('capex_GBS_Week1_December', capex_GBS_Week1_December),


            

                -- NOVEMBER
                ('capex_PPP_Week4_November', capex_PPP_Week4_November),
                ('capex_IEBR_Week4_November', capex_IEBR_Week4_November),
                ('capex_GBS_Week4_November', capex_GBS_Week4_November),
                ('capex_PPP_Week3_November', capex_PPP_Week3_November),
                ('capex_IEBR_Week3_November', capex_IEBR_Week3_November),
                ('capex_GBS_Week3_November', capex_GBS_Week3_November),
                ('capex_PPP_Week2_November', capex_PPP_Week2_November),
                ('capex_IEBR_Week2_November', capex_IEBR_Week2_November),
                ('capex_GBS_Week2_November', capex_GBS_Week2_November),
                ('capex_PPP_Week1_November', capex_PPP_Week1_November),
                ('capex_IEBR_Week1_November', capex_IEBR_Week1_November),
                ('capex_GBS_Week1_November', capex_GBS_Week1_November),

                -- OCTOBER
                ('capex_PPP_Week4_October', capex_PPP_Week4_October),
                ('capex_IEBR_Week4_October', capex_IEBR_Week4_October),
                ('capex_GBS_Week4_October', capex_GBS_Week4_October),
                ('capex_PPP_Week3_October', capex_PPP_Week3_October),
                ('capex_IEBR_Week3_October', capex_IEBR_Week3_October),
                ('capex_GBS_Week3_October', capex_GBS_Week3_October),
                ('capex_PPP_Week2_October', capex_PPP_Week2_October),
                ('capex_IEBR_Week2_October', capex_IEBR_Week2_October),
                ('capex_GBS_Week2_October', capex_GBS_Week2_October),
                ('capex_PPP_Week1_October', capex_PPP_Week1_October),
                ('capex_IEBR_Week1_October', capex_IEBR_Week1_October),
                ('capex_GBS_Week1_October', capex_GBS_Week1_October),

                -- SEPTEMBER
                ('capex_PPP_Week4_September', capex_PPP_Week4_September),
                ('capex_IEBR_Week4_September', capex_IEBR_Week4_September),
                ('capex_GBS_Week4_September', capex_GBS_Week4_September),
                ('capex_PPP_Week3_September', capex_PPP_Week3_September),
                ('capex_IEBR_Week3_September', capex_IEBR_Week3_September),
                ('capex_GBS_Week3_September', capex_GBS_Week3_September),
                ('capex_PPP_Week2_September', capex_PPP_Week2_September),
                ('capex_IEBR_Week2_September', capex_IEBR_Week2_September),
                ('capex_GBS_Week2_September', capex_GBS_Week2_September),
                ('capex_PPP_Week1_September', capex_PPP_Week1_September),
                ('capex_IEBR_Week1_September', capex_IEBR_Week1_September),
                ('capex_GBS_Week1_September', capex_GBS_Week1_September),

                -- AUGUST
                ('capex_PPP_Week4_August', capex_PPP_Week4_August),
                ('capex_IEBR_Week4_August', capex_IEBR_Week4_August),
                ('capex_GBS_Week4_August', capex_GBS_Week4_August),
                ('capex_PPP_Week3_August', capex_PPP_Week3_August),
                ('capex_IEBR_Week3_August', capex_IEBR_Week3_August),
                ('capex_GBS_Week3_August', capex_GBS_Week3_August),
                ('capex_PPP_Week2_August', capex_PPP_Week2_August),
                ('capex_IEBR_Week2_August', capex_IEBR_Week2_August),
                ('capex_GBS_Week2_August', capex_GBS_Week2_August),
                ('capex_PPP_Week1_August', capex_PPP_Week1_August),
                ('capex_IEBR_Week1_August', capex_IEBR_Week1_August),
                ('capex_GBS_Week1_August', capex_GBS_Week1_August),

                -- JULY
                ('capex_PPP_Week4_July', capex_PPP_Week4_July),
                ('capex_IEBR_Week4_July', capex_IEBR_Week4_July),
                ('capex_GBS_Week4_July', capex_GBS_Week4_July),
                ('capex_PPP_Week3_July', capex_PPP_Week3_July),
                ('capex_IEBR_Week3_July', capex_IEBR_Week3_July),
                ('capex_GBS_Week3_July', capex_GBS_Week3_July),
                ('capex_PPP_Week2_July', capex_PPP_Week2_July),
                ('capex_IEBR_Week2_July', capex_IEBR_Week2_July),
                ('capex_GBS_Week2_July', capex_GBS_Week2_July),
                ('capex_PPP_Week1_July', capex_PPP_Week1_July),
                ('capex_IEBR_Week1_July', capex_IEBR_Week1_July),
                ('capex_GBS_Week1_July', capex_GBS_Week1_July),

                -- JUNE
                ('capex_PPP_Week4_June', capex_PPP_Week4_June),
                ('capex_IEBR_Week4_June', capex_IEBR_Week4_June),
                ('capex_GBS_Week4_June', capex_GBS_Week4_June),
                ('capex_PPP_Week3_June', capex_PPP_Week3_June),
                ('capex_IEBR_Week3_June', capex_IEBR_Week3_June),
                ('capex_GBS_Week3_June', capex_GBS_Week3_June),
                ('capex_PPP_Week2_June', capex_PPP_Week2_June),
                ('capex_IEBR_Week2_June', capex_IEBR_Week2_June),
                ('capex_GBS_Week2_June', capex_GBS_Week2_June),
                ('capex_PPP_Week1_June', capex_PPP_Week1_June),
                ('capex_IEBR_Week1_June', capex_IEBR_Week1_June),
                ('capex_GBS_Week1_June', capex_GBS_Week1_June),

                -- MAY
                ('capex_PPP_Week4_May', capex_PPP_Week4_May),
                ('capex_IEBR_Week4_May', capex_IEBR_Week4_May),
                ('capex_GBS_Week4_May', capex_GBS_Week4_May),
                ('capex_PPP_Week3_May', capex_PPP_Week3_May),
                ('capex_IEBR_Week3_May', capex_IEBR_Week3_May),
                ('capex_GBS_Week3_May', capex_GBS_Week3_May),
                ('capex_PPP_Week2_May', capex_PPP_Week2_May),
                ('capex_IEBR_Week2_May', capex_IEBR_Week2_May),
                ('capex_GBS_Week2_May', capex_GBS_Week2_May),
                ('capex_PPP_Week1_May', capex_PPP_Week1_May),
                ('capex_IEBR_Week1_May', capex_IEBR_Week1_May),
                ('capex_GBS_Week1_May', capex_GBS_Week1_May),

                -- APRIL
                ('capex_PPP_Week4_April', capex_PPP_Week4_April),
                ('capex_IEBR_Week4_April', capex_IEBR_Week4_April),
                ('capex_GBS_Week4_April', capex_GBS_Week4_April),
                ('capex_PPP_Week3_April', capex_PPP_Week3_April),
                ('capex_IEBR_Week3_April', capex_IEBR_Week3_April),
                ('capex_GBS_Week3_April', capex_GBS_Week3_April),
                ('capex_PPP_Week2_April', capex_PPP_Week2_April),
                ('capex_IEBR_Week2_April', capex_IEBR_Week2_April),
                ('capex_GBS_Week2_April', capex_GBS_Week2_April),
                ('capex_PPP_Week1_April', capex_PPP_Week1_April),
                ('capex_IEBR_Week1_April', capex_IEBR_Week1_April),
                ('capex_GBS_Week1_April', capex_GBS_Week1_April)
                ) v(LastEnteredField, LastEnteredValue)
                WHERE v.LastEnteredValue IS NOT NULL AND v.LastEnteredValue <> 0
                ORDER BY CASE 
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'March' THEN 12
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'February' THEN 11
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'January' THEN 10
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'December' THEN 9
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'November' THEN 8
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'October' THEN 7
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'September' THEN 6
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'August' THEN 5
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'July' THEN 4
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'June' THEN 3
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'May' THEN 2
            WHEN PARSENAME(REPLACE(v.LastEnteredField, '_', '.'), 1) = 'April' THEN 1
                END DESC,
                    CAST(REPLACE(PARSENAME(REPLACE(v.LastEnteredField,'_','.'),2),'Week','') AS INT) DESC
            ) v
           WHERE c.capex_financial_year = (
            SELECT MAX(capex_financial_year)
            FROM dbo.tbl_capex c2
            WHERE c2.capex_organisation_id = c.capex_organisation_id
        )

        )
         SELECT
        o.organisation_id,
        o.organisation_name,
        o.hr_cluster_id,
        lce.LastEntryPeriod AS capex_last_entry_period,
        lce.capex_total_value,
        pg.MonthName,
        pg.MonthYear,
        pg.MonthValue AS priority_goods_value,
        ps.service_gem_id,
        ps.service_financial_year,
        ps.MonthNameservice,
        ps.MonthYearservice,
        ps.MonthValueservice,
        pw.works_gem_id,
        pw.MonthNamework,
        pw.MonthYearwork,
        pw.MonthValuework
        FROM mmt_organisation o
        LEFT JOIN LatestCapexEntryCTE lce 
            ON o.organisation_id = lce.capex_organisation_id
            AND lce.capex_financial_year = (
                SELECT MAX(capex_financial_year)
                FROM dbo.tbl_capex
                WHERE capex_organisation_id = o.organisation_id
            )

        LEFT JOIN PriorityMonthGoodsCTE pg ON o.organisation_id = pg.goods_organisation_id
        LEFT JOIN PriorityMonthServiceCTE ps ON o.organisation_id = ps.service_organisation_id
        LEFT JOIN PriorityMonthWorksCTE pw ON o.organisation_id = pw.works_organisation_id
                `;

            if (![2, 3, 4, 5].includes(role_id)) {
                query += ` WHERE o.organisation_id = @organisation_id `;
                request.input("organisation_id", organisation_id);
            }

        query += `
        GROUP BY
            o.organisation_id,
            o.organisation_name,
            o.hr_cluster_id,
            lce.LastEntryPeriod,
            pg.goods_gem_id, pg.goods_financial_year,pg.MonthName, pg.MonthYear, pg.MonthValue,
            ps.service_gem_id, ps.service_financial_year, ps.MonthNameservice,ps.MonthYearservice, ps.MonthValueservice,
            pw.works_gem_id, pw.works_financial_year, pw.MonthNamework, pw.MonthYearwork,pw.MonthValuework,lce.capex_total_value
        ORDER BY o.organisation_name
        `;

        const result = await request.query(query);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

function getCurrentFinancialYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; 

    if (month >= 4) {
        return `${year}-${year + 1}`;   
    } else {
        return `${year - 1}-${year}`;   
    }
}

async function getDashboardGemProAndCapexministryView(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const userID = req.params.userId;
        request.input("userID", userID);

        const financialYear = getCurrentFinancialYear();
        request.input("financialYear", financialYear);

        // Get user role and organisation
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        if (!userResult.recordset.length) {
            return res.status(404).json({ error: "User not found" });
        }

        const { role_id, organisation_id } = userResult.recordset[0];

        let query = `
            SELECT 
                o.organisation_id,
                o.organisation_name,
                o.hr_cluster_id,
                @financialYear AS financial_year,
                gp.goods_procurement_potential ,
                sp.service_procurement_potential ,
                wp.works_procurement_potential ,
                cp.capex_total_value AS capex_last_entry_value

            FROM mmt_organisation o

            LEFT JOIN (
                SELECT goods_organisation_id, MAX(goods_procurement_potential) AS goods_procurement_potential
                FROM tbl_gem_procurement_goods
                WHERE goods_financial_year = @financialYear
                GROUP BY goods_organisation_id
            ) gp ON gp.goods_organisation_id = o.organisation_id

            LEFT JOIN (
                SELECT service_organisation_id, MAX(service_procurement_potential) AS service_procurement_potential
                FROM tbl_gem_procurement_service
                WHERE service_financial_year = @financialYear
                GROUP BY service_organisation_id
            ) sp ON sp.service_organisation_id = o.organisation_id

            LEFT JOIN (
                SELECT works_organisation_id, MAX(works_procurement_potential) AS works_procurement_potential
                FROM tbl_gem_procurement_works
                WHERE works_financial_year = @financialYear
                GROUP BY works_organisation_id
            ) wp ON wp.works_organisation_id = o.organisation_id

            LEFT JOIN (
                SELECT capex_organisation_id, MAX(capex_total_value) AS capex_total_value
                FROM tbl_capex
                WHERE capex_financial_year = @financialYear
                GROUP BY capex_organisation_id
            ) cp ON cp.capex_organisation_id = o.organisation_id
        `;

        // Restrict for non-admin roles
        if (![2,3,4,5].includes(role_id)) {
            query += ` WHERE o.organisation_id = @organisation_id `;
            request.input("organisation_id", organisation_id);
        }

        const result = await request.query(query);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
    }
}


// async function getDashboardGemProAndCapexministryView(req, res) {
//     try {
//         const conn = await pool;
//         const request = conn.request();

//         const userID = req.params.userId;
//         request.input("userID", userID);

//         const financialYear = getCurrentFinancialYear(); 
//         request.input("financialYear", financialYear);

//         // Get user role and organisation
//         const userResult = await request.query(`
//             SELECT role_id, organisation_id
//             FROM tbl_user
//             WHERE user_id = @userID
//         `);

//         if (!userResult.recordset.length) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         const { role_id, organisation_id } = userResult.recordset[0];

//         // Organisation list
//         let orgQuery = `SELECT organisation_id, organisation_name, hr_cluster_id FROM mmt_organisation`;
//         if (![2,3,4,5].includes(role_id)) {
//             orgQuery += ` WHERE organisation_id = @organisation_id`;
//             request.input("organisation_id", organisation_id);
//         }

//         const orgResult = await request.query(orgQuery);
//         const orgs = orgResult.recordset;

//         // Fetch ONLY current FY data
//         const [goodsResult, serviceResult, worksResult, capexResult] = await Promise.all([
//             request.query(`
//                 SELECT goods_procurement_potential, goods_organisation_id 
//                 FROM tbl_gem_procurement_goods
//                 WHERE goods_financial_year = @financialYear
//             `),
//             request.query(`
//                 SELECT service_procurement_potential, service_organisation_id 
//                 FROM tbl_gem_procurement_service
//                 WHERE service_financial_year = @financialYear
//             `),
//             request.query(`
//                 SELECT works_procurement_potential, works_organisation_id 
//                 FROM tbl_gem_procurement_works
//                 WHERE works_financial_year = @financialYear
//             `),
//             request.query(`
//                 SELECT capex_total_value, capex_organisation_id 
//                 FROM tbl_capex
//                 WHERE capex_financial_year = @financialYear
//             `)
//         ]);

//         // Convert to maps for faster lookup
//         const goodsMap = Object.fromEntries(goodsResult.recordset.map(g => [g.goods_organisation_id, g.goods_procurement_potential]));
//         const serviceMap = Object.fromEntries(serviceResult.recordset.map(s => [s.service_organisation_id, s.service_procurement_potential]));
//         const worksMap = Object.fromEntries(worksResult.recordset.map(w => [w.works_organisation_id, w.works_procurement_potential]));
//         const capexMap = Object.fromEntries(capexResult.recordset.map(c => [c.capex_organisation_id, c.capex_total_value]));

//         // Final response
//         const data = orgs.map(org => ({
//             organisation_id: org.organisation_id,
//             organisation_name: org.organisation_name,
//             hr_cluster_id: org.hr_cluster_id,
//             financial_year: financialYear,
//             priority_goods_value: goodsMap[org.organisation_id] ?? null,
//             priority_service_value: serviceMap[org.organisation_id] ?? null,
//             priority_works_value: worksMap[org.organisation_id] ?? null,
//             capex_last_entry_value: capexMap[org.organisation_id] ?? null
//         }));

//         return res.status(200).json(data);

//     } catch (error) {
//         console.error("Error:", error);
//         return res.status(500).json({ error: error.message });
//     }
// }






const moduleConfig = {
  "Young Professional": {
    table: "tbl_young_professional",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN yp.created_date > yp.updated_date 
        THEN yp.created_date 
        ELSE yp.updated_date 
      END
    `,
    alias: "yp",
    noDataStatus: "None Engaged"
  },

  "Consultant Appoinment": {
    table: "tbl_consultant_appointment",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN ca.created_date > ca.updated_date 
        THEN ca.created_date 
        ELSE ca.updated_date 
      END
    `,
    alias: "ca",
    noDataStatus: "None Appointed",
    completionColumn: "contract_signed_date"

  },

  "VIP Reference": {
    table: "tbl_vip_reference",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN vip.created_date > vip.updated_date 
        THEN vip.created_date 
        ELSE vip.updated_date 
      END
    `,
    alias: "vip",
    noDataStatus: "No Active References",
    completionColumn: "disposed_date"
  },
  "Cabinet Notes-Other Ministry": {
    table: "tbl_cabinet_notes_ministry",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN com.created_date > com.updated_date 
        THEN com.created_date 
        ELSE com.updated_date 
      END
    `,
    alias: "com"
  },

  "Cabinet Notes-MoPSW": {
    table: "tbl_cabinet_notes_mopsw",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN cnm.created_date > cnm.updated_date 
        THEN cnm.created_date 
        ELSE cnm.updated_date 
      END
    `,
    alias: "cnm",
    noDataStatus: "No Active Notes",
    completionColumn: "completed_date"
  },
  "Audit Para": {
    table: "tbl_audit_para",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN ap.created_date > ap.updated_date 
        THEN ap.created_date 
        ELSE ap.updated_date 
      END
    `,
    alias: "ap",
    noDataStatus: "No Active Paras",
    completionColumn: "disposed_date"
  },
  "Bills/PreConstitutions Act": {
    table: "tbl_bill",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN bpa.created_date > bpa.updated_date 
        THEN bpa.created_date 
        ELSE bpa.updated_date 
      END
    `,
    alias: "bpa",
    noDataStatus: "No Active Matters",
    completionColumn: "completed_date"
  },
  "MOM OF PSW Meetings": {
    table: "tbl_psw_meeting",
    wingColumn: "wings",
    dateExpression: "mpm.created_at",
    alias: "mpm"
  },
  "Promotion of Indian Flagged Ships": {
    table: "tbl_flagged_ship",
    // wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN pif.created_date > pif.updated_date 
        THEN pif.created_date 
        ELSE pif.updated_date 
      END
    `,
    alias: "pif"
  },
  "Parliamentary Issues": {
    table: "tbl_parliamentary_issue",
    wingColumn: "wing",
    dateExpression: `
      CASE 
        WHEN iss.created_date > iss.updated_date 
        THEN iss.created_date 
        ELSE iss.updated_date 
      END
    `,
    alias: "iss",
    noDataStatus: "No Active Matters",
    completionColumns: [
        "matter_disposed_date",
        "Reply_send_date"
    ]
  },
  "Review Items": {
    table: "tbl_review_items",
    wingColumn: "primary_coord_wing",
    dateExpression: `
      CASE 
        WHEN ri.created_date > ri.updated_date 
        THEN ri.created_date 
        ELSE ri.updated_date 
      END
    `,
    alias: "ri"
  },

  "Foreign Visit": {
  table: "tbl_official_foreign_visit",
//   wingColumn: "wing",
  dateExpression: `
    CASE
      WHEN ofv.created_date > ofv.updated_date
      THEN ofv.created_date
      ELSE ofv.updated_date
    END
  `,
  alias: "ofv"
}


};

function escapeSql(value) {
  return value.replace(/'/g, "''");
}

// function buildWingCases(wings, module) {
//   return wings.map(wing => `
//     MAX(
//       CASE 
//         WHEN wing.wing_name = '${escapeSql(wing)}'
//         THEN ${module.dateExpression}
//       END
//     ) AS [${escapeSql(wing)}]
//   `).join(",\n");
// }


// function buildWingCases(wings, module) {
//   return wings.map(wing => {

//     if (module.completionColumn) {
//       return `
//         CASE

//           -- Completed record
//           WHEN MAX(
//             CASE
//               WHEN wing.wing_name = '${escapeSql(wing)}'
//               THEN ${module.alias}.${module.completionColumn}
//             END
//           ) IS NOT NULL
//           THEN '${escapeSql(module.noDataStatus || "No Data")}'

//           -- No records
//           WHEN MAX(
//             CASE
//               WHEN wing.wing_name = '${escapeSql(wing)}'
//               THEN ${module.dateExpression}
//             END
//           ) IS NULL
//           THEN '${escapeSql(module.noDataStatus || "No Data")}'

//             -- Active pending record
//             ELSE CONVERT(VARCHAR(30),
//                 MAX(
//                 CASE
//                     WHEN wing.wing_name = '${escapeSql(wing)}'
//                     THEN ${module.dateExpression}
//                 END
//                 ), 126
//             )

//         END AS [${escapeSql(wing)}]
//       `;
//     }

//     return `
//       CASE
//         WHEN MAX(
//           CASE
//             WHEN wing.wing_name = '${escapeSql(wing)}'
//             THEN ${module.dateExpression}
//           END
//         ) IS NULL
//         THEN '${escapeSql(module.noDataStatus || "No Data")}'

       
//         ELSE CONVERT(VARCHAR(30),
//             MAX(
//             CASE
//                 WHEN wing.wing_name = '${escapeSql(wing)}'
//                 THEN ${module.dateExpression}
//             END
//             ), 126
//         )

//       END AS [${escapeSql(wing)}]
//     `;
//   }).join(",\n");
// }

function buildWingCases(wings, module) {

  return wings.map(wing => {

    // Multiple completion columns
    // Example: Parliamentary Issues
    if (module.completionColumns) {

      const completionCheck = module.completionColumns.map(col => `
        MAX(
          CASE
            WHEN wing.wing_name = '${escapeSql(wing)}'
            THEN ${module.alias}.${col}
          END
        ) IS NOT NULL
      `).join(' OR ');

      return `
        CASE

          -- Completed issue:
          -- matter_disposed_date OR Reply_send_date filled
          WHEN (${completionCheck})
          THEN '${escapeSql(module.noDataStatus || "No Data")}'

          -- No records found for this wing
          WHEN MAX(
            CASE
              WHEN wing.wing_name = '${escapeSql(wing)}'
              THEN ${module.dateExpression}
            END
          ) IS NULL
          THEN '${escapeSql(module.noDataStatus || "No Data")}'

          -- Active record:
          -- completion dates empty, show latest activity date
          ELSE CONVERT(
            VARCHAR(30),
            MAX(
              CASE
                WHEN wing.wing_name = '${escapeSql(wing)}'
                THEN ${module.dateExpression}
              END
            ),
            126
          )

        END AS [${escapeSql(wing)}]
      `;
    }

    // Single completion column
    // Example: VIP, Audit, Bills, Cabinet Notes, Consultant
    if (module.completionColumn) {

      return `
        CASE

          -- Completed record:
          -- disposed/completed/contract signed date filled
          WHEN MAX(
            CASE
              WHEN wing.wing_name = '${escapeSql(wing)}'
              THEN ${module.alias}.${module.completionColumn}
            END
          ) IS NOT NULL
          THEN '${escapeSql(module.noDataStatus || "No Data")}'

          -- No records found for this wing
          WHEN MAX(
            CASE
              WHEN wing.wing_name = '${escapeSql(wing)}'
              THEN ${module.dateExpression}
            END
          ) IS NULL
          THEN '${escapeSql(module.noDataStatus || "No Data")}'

          -- Active pending record:
          -- completion date empty, show latest activity date
          ELSE CONVERT(
            VARCHAR(30),
            MAX(
              CASE
                WHEN wing.wing_name = '${escapeSql(wing)}'
                THEN ${module.dateExpression}
              END
            ),
            126
          )

        END AS [${escapeSql(wing)}]
      `;
    }

    // Modules without completion columns
    // Example: Young Professional, Review Items, Foreign Visit, etc.
    return `
      CASE

        -- No records found for this wing
        WHEN MAX(
          CASE
            WHEN wing.wing_name = '${escapeSql(wing)}'
            THEN ${module.dateExpression}
          END
        ) IS NULL
        THEN '${escapeSql(module.noDataStatus || "No Data")}'

        -- Show latest activity date
        ELSE CONVERT(
          VARCHAR(30),
          MAX(
            CASE
              WHEN wing.wing_name = '${escapeSql(wing)}'
              THEN ${module.dateExpression}
            END
          ),
          126
        )

      END AS [${escapeSql(wing)}]
    `;

  }).join(",\n");
}


function buildModuleQuery(moduleName, module, wings) {
  const wingCases = buildWingCases(wings, module);

  const joinClause = module.wingColumn
    ? `LEFT JOIN ${module.table} ${module.alias}
       ON wing.wing_id = ${module.alias}.${module.wingColumn}`
    : `LEFT JOIN ${module.table} ${module.alias}
       ON 1 = 1`; // fallback when no wing column exists

  return `
    SELECT 
      '${moduleName}' AS [Module Name],
      ${wingCases}
    FROM mmt_wings wing
    ${joinClause}
  `;
}


async function getDashboardWingWise(req, res) {
  try {
    const conn = await pool;
    const request = conn.request();

    const wingsResult = await request.query(
      `SELECT wing_name FROM mmt_wings where wing_id != 13`
    );

    const wings = wingsResult.recordset.map(w => w.wing_name);
    if (!wings.length) {
      return res.status(404).json({ error: "No wings found" });
    }
    
    const queries = Object.entries(moduleConfig)
      .map(([moduleName, config]) =>
        buildModuleQuery(moduleName, config, wings)
      )
      .join(" UNION ALL ");

    const result = await request.query(queries);

    return res.status(200).json(result.recordset);

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getDashboardorganisationview(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
 
        const userID = req.params.userId;
        request.input("userID", userID);
 
        const userResult = await request.query(`
            SELECT role_id, organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);
 
        if (!userResult.recordset.length) {
            return res.status(404).json({ error: "User not found" });
        }
 
        const { role_id, organisation_id } = userResult.recordset[0];
 
        let query = `
            SELECT
                o.organisation_id,
                o.organisation_name,
                o.hr_cluster_id,
                MAX(p.last_updated) AS max_last_updated_date,

                dgs.dgs_last_updated_date,
                csl.csl_last_updated_date,
                dgll.dgll_last_updated_date,
                sci.sci_last_updated_date,
                imu.imu_last_updated_date,
                cmec.cmec_last_updated_date,
                ofv.ofv_last_updated_date,

                csr.max_csr_updated_date,
                emp_last.last_transaction_date AS emp_last_transaction_date,
                lc.codeCases_max_updated_date,
                mi.miv_max_updated_date,
                am.amritkaal_max_updated_date,
                gm.gmis_max_updated_date,
                ovd.ovd_last_updated_date,
                cp.last_cruise_update_date,
                sm.last_social_media_date
            FROM mmt_organisation o
 
            -- Project last updated
            LEFT JOIN tbl_project p
                ON p.organisation_id = o.organisation_id
                AND p.project_stage_id <> 14
 
            -- CSR last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(updated_date) AS max_csr_updated_date
                FROM [sagarmanthan_revamp].[dbo].[tbl_csr_projects]
                WHERE ISNULL(project_status, '') <> 'Completed'
                GROUP BY organisation_id
            ) csr
                ON csr.organisation_id = o.organisation_id

 
            -- HR management last transaction
            LEFT JOIN (
                SELECT o.organisation_id,
                       COALESCE(oth.uploaded_date, emp.last_emp_transaction_date) AS last_transaction_date
                FROM mmt_organisation o
                LEFT JOIN (
                    SELECT emp_working_org_id AS organisation_id, MAX(created_date) AS last_emp_transaction_date
                    FROM tbl_employee_transaction_details
                    GROUP BY emp_working_org_id
                ) emp
                    ON emp.organisation_id = o.organisation_id
                LEFT JOIN (
                    SELECT organisation_id, MAX(uploaded_date) AS uploaded_date
                    FROM tbl_hr_other_org_vacancy_file_details
                    GROUP BY organisation_id
                ) oth
                    ON oth.organisation_id = o.organisation_id
            ) emp_last
                ON emp_last.organisation_id = o.organisation_id
 
            -- Litigation cases last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(updated_date) AS codeCases_max_updated_date
                FROM [sagarmanthan_revamp].[dbo].[tbl_litigation_cases]
                WHERE ISNULL(stage_id, '') <> 7
                GROUP BY organisation_id
            ) lc
                ON lc.organisation_id = o.organisation_id
 
            -- MIV last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(updated_date) AS miv_max_updated_date
                FROM [sagarmanthan_revamp].[dbo].[tbl_initiative]
                WHERE ISNULL(status_current, '') <> 'Completed'
                GROUP BY organisation_id
            ) mi
                ON mi.organisation_id = o.organisation_id
 
            -- Amritkaal last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(updated_date) AS amritkaal_max_updated_date
                FROM [sagarmanthan_revamp].[dbo].[tbl_amritkaal]
                GROUP BY organisation_id
            ) am
                ON am.organisation_id = o.organisation_id
 
            -- GMIS last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(updated_on) AS gmis_max_updated_date
                FROM [sagarmanthan_revamp].[dbo].[tbl_gmis_mou]
                WHERE ISNULL(present_status, '') <> 'Work completed'
                GROUP BY organisation_id
            ) gm
                ON gm.organisation_id = o.organisation_id
 
            -- OVD last updated via implementing agency
            LEFT JOIN (
                SELECT ia.ia_id AS organisation_id, MAX(ovd.updated_date) AS ovd_last_updated_date
                FROM [sagarmanthan_revamp].[dbo].[mmt_implementing_agency] ia
                LEFT JOIN [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] ovd
                    ON ovd.imp_agency = ia.ia_id
                    AND ISNULL(ovd.current_status, '') <> 'Completed'
                GROUP BY ia.ia_id
            ) ovd
                ON ovd.organisation_id = o.organisation_id
                
            -- Cruise Ports last updated
            LEFT JOIN (
                SELECT organisation_id, MAX(CAST(EOMONTH(DATEFROMPARTS(financial_year, month, 1)) AS datetime)) AS last_cruise_update_date
                FROM tbl_cruise_ports
                GROUP BY organisation_id
            ) cp
                ON cp.organisation_id = o.organisation_id

            -- Social Media last updated
                -- Social Media last updated
-- Social Media last updated
LEFT JOIN (
    SELECT 
        organisation_id,

        MAX(
            CAST(
                EOMONTH(
                    DATEFROMPARTS(
                        CAST(LEFT(financial_year, 4) AS INT),
                        
                        CASE LTRIM(RTRIM(month))
                            WHEN 'January' THEN 1
                            WHEN 'February' THEN 2
                            WHEN 'March' THEN 3
                            WHEN 'April' THEN 4
                            WHEN 'May' THEN 5
                            WHEN 'June' THEN 6
                            WHEN 'July' THEN 7
                            WHEN 'August' THEN 8
                            WHEN 'September' THEN 9
                            WHEN 'October' THEN 10
                            WHEN 'November' THEN 11
                            WHEN 'December' THEN 12
                        END,

                        1
                    )
                ) AS DATETIME
            )
        ) AS last_social_media_date

    FROM tbl_social_media

    GROUP BY organisation_id

) sm
    ON sm.organisation_id = o.organisation_id












                 -- =========================
        -- MODULES FIXED (IMPORTANT)
        -- =========================



        -- DGS
        LEFT JOIN (
            SELECT MAX(final_date) AS dgs_last_updated_date
            FROM (
                SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_kpi_dgs_entry_exit
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_dgs_entry_exit_log
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_incident_prev_curr_year
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_incident_year_wise
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_incident_country_wise
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_vessel_incident
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_vessel_survey
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM mmt_mti
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM mmt_mti_course
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_dgs_2_9_capacity_utilisation
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_dgs_2_9_placement_record
            ) x
        ) dgs ON 1 = 1


        -- CSL
        LEFT JOIN (
            SELECT MAX(final_date) AS csl_last_updated_date
            FROM (
                SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_csl_vessels_built
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_csl_ship_building_orders
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_csl_ship_delivery_performance
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_csl_capacity_utilization
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_csl_fabrication_of_steels
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_csl_ships_repaired
            ) x
        ) csl ON 1 = 1

        -- DGLL
        LEFT JOIN (
            SELECT MAX(final_date) AS dgll_last_updated_date
            FROM (
                SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_light_house_master
          --      UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_hydrographic_surveys
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_nais_uptime
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_vtms_integration
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_dgll_3_5_1
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_kpi_dgll_3_5_2
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_dgll_k_3_6

            ) x
        ) dgll ON 1 = 1

        -- SCI
       LEFT JOIN (
        SELECT MAX(final_date) AS sci_last_updated_date
        FROM (
            SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_sci_vessel_availability
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_time_voyage_bulk
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_time_voyage_tanker
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_time_voyage_offshore
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_vessel_availability_linear
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_vessel_procurement
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_secondhand_vessel_procurement
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_ship_dry_docking
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_repair_and_maintanace
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_sale_and_recycling_oldvessels
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_sale_and_recycling_oldvessels_green_recycling
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_manning_of_owned_ships
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_sci_ship_management_business
        ) x
    ) sci ON 1 = 1

        -- IMU
        LEFT JOIN (
            SELECT MAX(final_date) AS imu_last_updated_date
            FROM (
                SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_imu_k_5_1
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_imu_k_5_2
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_imu_k_5_3
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_imu_k_5_4
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_imu_k_5_5
                UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_imu_k_5_1_1
            ) x
        ) imu ON 1 = 1

        -- CMEC
        LEFT JOIN (
        SELECT MAX(final_date) AS cmec_last_updated_date
        FROM (
            SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_cmec_researchers
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_cmec_maritime_talks_newsletters
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_cmec_publications
            UNION ALL SELECT MAX(COALESCE(updated_date, created_date)) FROM tbl_cmec_policy_advisory_notes
        ) x
    ) cmec ON 1 = 1

      -- Foreign Visit
        LEFT JOIN (
        SELECT MAX(final_date) AS ofv_last_updated_date
        FROM (
            SELECT MAX(COALESCE(updated_date, created_date)) AS final_date FROM tbl_official_foreign_visit
        ) x
    ) ofv ON 1 = 1


        `;
 
        if (![2, 3, 4, 5].includes(role_id)) {
            query += ` WHERE o.organisation_id = @organisation_id `;
            request.input("organisation_id", organisation_id);
        }
 
        query += `
            GROUP BY
                o.organisation_id,
                o.organisation_name,
                o.hr_cluster_id,
                csr.max_csr_updated_date,
                
                dgs.dgs_last_updated_date,
                csl.csl_last_updated_date,
                dgll.dgll_last_updated_date,
                sci.sci_last_updated_date,
                imu.imu_last_updated_date,
                cmec.cmec_last_updated_date,
                ofv.ofv_last_updated_date,


                emp_last.last_transaction_date,
                lc.codeCases_max_updated_date,
                mi.miv_max_updated_date,
                am.amritkaal_max_updated_date,
                gm.gmis_max_updated_date,
                ovd.ovd_last_updated_date,
                cp.last_cruise_update_date,
                sm.last_social_media_date

                ORDER BY o.organisation_name
        `;
 
        const result = await request.query(query);
        const rowData = result.recordset;
        
        if (!rowData || rowData.length === 0) {
            return res.status(404).json({ error: "No data available" });
        }
 
        return res.status(200).json(rowData);
 
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export default { getDashboardDataEntryStatus, getChatbotModuleGroups, getChatbotModules, getLogicalQueriesEmail, getCCEmailsForLogicalQueries, getModuleName, getUserDetailsForMail, getDashboardCourtCaseStatus,
    getDashboardGemProAndCapex,getDashboardorganisationview,getDashboardWingWise,getDashboardGemProAndCapexministryView
};