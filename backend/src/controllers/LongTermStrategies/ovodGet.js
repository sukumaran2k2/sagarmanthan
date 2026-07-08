import { pool } from "../../db.js";
import sql from 'mssql';

// List all data
async function getOVDData(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    const wingId = parseInt(req.params.wingId);

    request.input("wingId", wingId);
    request.input("userID", userID);

    try {
        // Get role_id and organisation_id
        const userResult = await request.query(`SELECT role_id FROM tbl_user WHERE user_id = @userID`);
        const role_id = userResult.recordset[0].role_id;
        const userOrg = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
        const idOrg = userOrg.recordset[0].organisation_id;
        request.input("idOrg", idOrg);
        const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
        const orgCode = orgCodeGet.recordset[0].organisation_code;
        request.input("orgCode", orgCode);
        const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
        const organisation_id = orgMainId.recordset[0].ia_id;  

        let whereClause = [];
        if (wingId !== 0) whereClause.push("tbl_one_vision_doc.wings = @wingId AND tbl_one_vision_doc.action_a3 IS NOT NULL AND tbl_one_vision_doc.imp_agency = 14");

        const whereWingCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE tbl_one_vision_doc.delete_status = 0 ';

        let getQuery;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            getQuery = `WITH cte AS (
            SELECT 
                tbl_one_vision_doc.id,
                SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                mmt_a1.a1_code + ' : ' + mmt_a1.goals AS goal_a1,
                SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                mmt_a2.a2_code + ' : ' + mmt_a2.intervension_name AS intervention_a2,
                SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order,
                mmt_a3.a3_code + ' : ' + mmt_a3.action_name AS action_a3,
                SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                mmt_b1.b1_code + ' : ' + mmt_b1.b1_goals AS goal_b1,
                SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                mmt_b2_b3.b2_code + ' : ' + mmt_b2_b3.intervention AS intervention_b2,
                SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order,
                mmt_b3.b3_code + ' : ' + mmt_b3.b3_actions AS action_b3,
                mmt_ovd_category.category AS category,
                mmt_wings.wing_name AS wings,
                mmt_implementing_agency.ia_name AS ia_name,
                tbl_one_vision_doc.priority AS priority,
                mmt_navic_vibhas.navic_name AS vibhas,
                LTRIM(RTRIM(
                    ISNULL(CASE WHEN tbl_one_vision_doc.miv_chapter != 'NA' THEN CONCAT(CONCAT('MIV ', tbl_one_vision_doc.miv_chapter),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.makv_theme != 'NA' THEN CONCAT(CONCAT('MAKV ', tbl_one_vision_doc.makv_theme),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_sgos = 1 THEN 'SGOS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_gmis = 1 THEN 'GMIS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_additional_item = 1 THEN 'Additional Item,' ELSE '' END, '')
                )) AS source,
                tbl_one_vision_doc.target_date AS target_date,
                tbl_one_vision_doc.expected_date AS expected_date,
                tbl_one_vision_doc.progress AS progress,
                tbl_one_vision_doc.financial_progress AS financial_progress,
                tbl_one_vision_doc.reason_delay AS reason_delay,
                tbl_one_vision_doc.current_status AS current_status,
                tbl_one_vision_doc.response AS response,
                tbl_one_vision_doc.total_cost AS total_cost,
                tbl_one_vision_doc.updated_date AS updated_date
            FROM 
                tbl_one_vision_doc
            LEFT JOIN 
                mmt_a1 ON tbl_one_vision_doc.goal_a1 = mmt_a1.id
            LEFT JOIN 
                mmt_a2 ON tbl_one_vision_doc.intervention_a2 = mmt_a2.id
            LEFT JOIN 
                mmt_a3 ON tbl_one_vision_doc.action_a3 = mmt_a3.id
            LEFT JOIN 
                mmt_b1 ON tbl_one_vision_doc.goal_b1 = mmt_b1.id
            LEFT JOIN 
                mmt_b2_b3 ON tbl_one_vision_doc.intervention_b2 = mmt_b2_b3.id
            LEFT JOIN 
                mmt_b3 ON tbl_one_vision_doc.action_b3 = mmt_b3.id
            LEFT JOIN
                mmt_wings ON tbl_one_vision_doc.wings = mmt_wings.wing_id
            LEFT JOIN 
                mmt_navic_vibhas ON tbl_one_vision_doc.vibhas = mmt_navic_vibhas.id
            LEFT JOIN 
                mmt_ovd_category ON tbl_one_vision_doc.category = mmt_ovd_category.id
            LEFT JOIN 
                mmt_implementing_agency ON tbl_one_vision_doc.imp_agency = mmt_implementing_agency.ia_id
            ${whereWingCondition}

        )
SELECT 
            id, goal_a1,intervention_a2, action_a3,goal_b1,intervention_b2,action_b3,
            category,wings,ia_name,priority,vibhas,target_date,expected_date, progress,
            financial_progress,reason_delay,current_status, response, total_cost, updated_date,
            CASE 
                WHEN LTRIM(RTRIM(
                    CASE 
                        
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
                )) = '' THEN NULL
                ELSE 
                    CASE 
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
            END AS source_value
        FROM cte
        ORDER BY 
            vibhas, cast(a1order as int) , cast(a2order as int), cast(a3order as int), cast(b1order as int ), cast(b2order as int) , cast(b3order as int);`;
        } else {
            getQuery = `WITH cte AS (
            SELECT 
                tbl_one_vision_doc.id,
                SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                mmt_a1.a1_code + ' : ' + mmt_a1.goals AS goal_a1,
                SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                mmt_a2.a2_code + ' : ' + mmt_a2.intervension_name AS intervention_a2,
                SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order,
                mmt_a3.a3_code + ' : ' + mmt_a3.action_name AS action_a3,
                SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                mmt_b1.b1_code + ' : ' + mmt_b1.b1_goals AS goal_b1,
                SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                mmt_b2_b3.b2_code + ' : ' + mmt_b2_b3.intervention AS intervention_b2,
                SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order,
                mmt_b3.b3_code + ' : ' + mmt_b3.b3_actions AS action_b3,
                mmt_ovd_category.category AS category,
                mmt_wings.wing_name AS wings,
                mmt_implementing_agency.ia_name AS ia_name,
                tbl_one_vision_doc.priority AS priority,
                mmt_navic_vibhas.navic_name AS vibhas,
                LTRIM(RTRIM(
                    ISNULL(CASE WHEN tbl_one_vision_doc.miv_chapter != 'NA' THEN CONCAT(CONCAT('MIV ', tbl_one_vision_doc.miv_chapter),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.makv_theme != 'NA' THEN CONCAT(CONCAT('MAKV ', tbl_one_vision_doc.makv_theme),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_sgos = 1 THEN 'SGOS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_gmis = 1 THEN 'GMIS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_additional_item = 1 THEN 'Additional Item,' ELSE '' END, '')
                )) AS source,
                tbl_one_vision_doc.target_date AS target_date,
                tbl_one_vision_doc.expected_date AS expected_date,
                tbl_one_vision_doc.progress AS progress,
                tbl_one_vision_doc.financial_progress AS financial_progress,
                tbl_one_vision_doc.reason_delay AS reason_delay,
                tbl_one_vision_doc.current_status AS current_status,
                tbl_one_vision_doc.response AS response,
                tbl_one_vision_doc.total_cost AS total_cost,
                tbl_one_vision_doc.updated_date AS updated_date
            FROM 
                tbl_one_vision_doc
            LEFT JOIN 
                mmt_a1 ON tbl_one_vision_doc.goal_a1 = mmt_a1.id
            LEFT JOIN 
                mmt_a2 ON tbl_one_vision_doc.intervention_a2 = mmt_a2.id
            LEFT JOIN 
                mmt_a3 ON tbl_one_vision_doc.action_a3 = mmt_a3.id
            LEFT JOIN 
                mmt_b1 ON tbl_one_vision_doc.goal_b1 = mmt_b1.id
            LEFT JOIN 
                mmt_b2_b3 ON tbl_one_vision_doc.intervention_b2 = mmt_b2_b3.id
            LEFT JOIN 
                mmt_b3 ON tbl_one_vision_doc.action_b3 = mmt_b3.id
            LEFT JOIN
                mmt_wings ON tbl_one_vision_doc.wings = mmt_wings.wing_id
            LEFT JOIN 
                mmt_navic_vibhas ON tbl_one_vision_doc.vibhas = mmt_navic_vibhas.id
            LEFT JOIN 
                mmt_ovd_category ON tbl_one_vision_doc.category = mmt_ovd_category.id
            LEFT JOIN 
                mmt_implementing_agency ON tbl_one_vision_doc.imp_agency = mmt_implementing_agency.ia_id
			WHERE 
                tbl_one_vision_doc.goal_b1 IS NOT NULL AND tbl_one_vision_doc.delete_status = 0 AND tbl_one_vision_doc.imp_agency = ${organisation_id}
        )
        SELECT 
            id, goal_a1,intervention_a2, action_a3,goal_b1,intervention_b2,action_b3,
            category,wings,ia_name,priority,vibhas,target_date,expected_date, progress,
            financial_progress,reason_delay,current_status, response, total_cost, updated_date,
            CASE 
                WHEN LTRIM(RTRIM(
                    CASE 
                        
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
                )) = '' THEN NULL
                ELSE 
                    CASE 
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
            END AS source_value
        FROM cte
        ORDER BY 
            vibhas,cast(b1order as int), cast(b2order as int), cast(b3order as int);`
        }

        const result = await request.query(getQuery);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// List vibhas data
async function getOVDVibhasData(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    const wingId = parseInt(req.params.wingId);
    const vibhasId = parseInt(req.params.vibhasId);

    request.input("wingId", wingId);
    request.input("vibhasId", vibhasId);

    try {

        let whereClause = [];
        if (wingId !== 0) whereClause.push("tbl_one_vision_doc.wings = @wingId AND tbl_one_vision_doc.action_a3 IS NOT NULL AND tbl_one_vision_doc.imp_agency = 14");

        const whereWingCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.delete_status = 0 AND tbl_one_vision_doc.vibhas = @vibhasId AND ' + whereClause.join(' AND ') : 'WHERE tbl_one_vision_doc.delete_status = 0 AND tbl_one_vision_doc.vibhas = @vibhasId ';

        let getQuery = `WITH cte AS (
            SELECT 
                tbl_one_vision_doc.id,
                SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                mmt_a1.a1_code + ' : ' + mmt_a1.goals AS goal_a1,
                SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                mmt_a2.a2_code + ' : ' + mmt_a2.intervension_name AS intervention_a2,
                SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order,
                mmt_a3.a3_code + ' : ' + mmt_a3.action_name AS action_a3,
                SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                mmt_b1.b1_code + ' : ' + mmt_b1.b1_goals AS goal_b1,
                SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                mmt_b2_b3.b2_code + ' : ' + mmt_b2_b3.intervention AS intervention_b2,
                SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order,
                mmt_b3.b3_code + ' : ' + mmt_b3.b3_actions AS action_b3,
                mmt_ovd_category.category AS category,
                mmt_wings.wing_name AS wings,
                mmt_implementing_agency.ia_name AS ia_name,
                tbl_one_vision_doc.priority AS priority,
                mmt_navic_vibhas.navic_name AS vibhas,
                LTRIM(RTRIM(
                    ISNULL(CASE WHEN tbl_one_vision_doc.miv_chapter != 'NA' THEN CONCAT(CONCAT('MIV ', tbl_one_vision_doc.miv_chapter),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.makv_theme != 'NA' THEN CONCAT(CONCAT('MAKV ', tbl_one_vision_doc.makv_theme),', ') ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_sgos = 1 THEN 'SGOS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_gmis = 1 THEN 'GMIS,' ELSE '' END, '') +
                    ISNULL(CASE WHEN tbl_one_vision_doc.is_additional_item = 1 THEN 'Additional Item,' ELSE '' END, '')
                )) AS source,
                tbl_one_vision_doc.target_date AS target_date,
                tbl_one_vision_doc.expected_date AS expected_date,
                tbl_one_vision_doc.progress AS progress,
                tbl_one_vision_doc.financial_progress AS financial_progress,
                tbl_one_vision_doc.reason_delay AS reason_delay,
                tbl_one_vision_doc.current_status AS current_status,
                tbl_one_vision_doc.response AS response,
                tbl_one_vision_doc.total_cost AS total_cost,
                tbl_one_vision_doc.updated_date AS updated_date
            FROM 
                tbl_one_vision_doc
            LEFT JOIN 
                mmt_a1 ON tbl_one_vision_doc.goal_a1 = mmt_a1.id
            LEFT JOIN 
                mmt_a2 ON tbl_one_vision_doc.intervention_a2 = mmt_a2.id
            LEFT JOIN 
                mmt_a3 ON tbl_one_vision_doc.action_a3 = mmt_a3.id
            LEFT JOIN 
                mmt_b1 ON tbl_one_vision_doc.goal_b1 = mmt_b1.id
            LEFT JOIN 
                mmt_b2_b3 ON tbl_one_vision_doc.intervention_b2 = mmt_b2_b3.id
            LEFT JOIN 
                mmt_b3 ON tbl_one_vision_doc.action_b3 = mmt_b3.id
            LEFT JOIN
                mmt_wings ON tbl_one_vision_doc.wings = mmt_wings.wing_id
            LEFT JOIN 
                mmt_navic_vibhas ON tbl_one_vision_doc.vibhas = mmt_navic_vibhas.id
            LEFT JOIN 
                mmt_ovd_category ON tbl_one_vision_doc.category = mmt_ovd_category.id
            LEFT JOIN 
                mmt_implementing_agency ON tbl_one_vision_doc.imp_agency = mmt_implementing_agency.ia_id
            ${whereWingCondition}

        )
SELECT 
            id, goal_a1,intervention_a2, action_a3,goal_b1,intervention_b2,action_b3,
            category,wings,ia_name,priority,vibhas,target_date,expected_date, progress,
            financial_progress,reason_delay,current_status, response, total_cost, updated_date,
            CASE 
                WHEN LTRIM(RTRIM(
                    CASE 
                        
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
                )) = '' THEN NULL
                ELSE 
                    CASE 
                        WHEN LEFT(source, 1) = ',' AND RIGHT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source) - 2)
                        WHEN LEFT(source, 1) = ',' THEN 
                            SUBSTRING(source, 2, LEN(source))
                        WHEN RIGHT(source, 1) = ',' THEN 
                            LEFT(source, LEN(source) - 1)
                        ELSE source
                    END
            END AS source_value
        FROM cte
        ORDER BY 
            vibhas, cast(a1order as int) , cast(a2order as int), cast(a3order as int), cast(b1order as int ), cast(b2order as int) , cast(b3order as int);`;
        const result = await request.query(getQuery);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getOVODOrgAllData(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input("userID", userID);
    
    

    try {
        const userResult = await request.query(`SELECT role_id FROM tbl_user WHERE user_id = @userID`);
        const role_id = userResult.recordset[0].role_id;
        const userOrg = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
        const idOrg = userOrg.recordset[0].organisation_id;
        request.input("idOrg", idOrg);
        const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
        const orgCode = orgCodeGet.recordset[0].organisation_code;
        request.input("orgCode", orgCode);
        const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
        const organisation_id = orgMainId.recordset[0].ia_id; 

        request.input("organisation_id", organisation_id);


        let result; 
        
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            result = await conn.query(`
            with cte as (
            SELECT 
                tbl_one_vision_doc.id,
                mmt_a1.a1_code,SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                mmt_a1.a1_code +' : '+ mmt_a1.goals  AS [Goal (A1)],
                mmt_a2.a2_code, SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                mmt_a2.a2_code +' : '+ mmt_a2.intervension_name AS [Intervention (A2)],
                mmt_a3.a3_code, SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order ,
                mmt_a3.a3_code +' : '+ mmt_a3.action_name AS [Action (A3)],
                mmt_b1.b1_code,SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                mmt_b1.b1_code +' : '+ mmt_b1.b1_goals AS [Goal (B1)],
                mmt_b2_b3.b2_code,SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                mmt_b2_b3.b2_code +' : '+ mmt_b2_b3.intervention AS [Intervention (B2)],
                mmt_b3.b3_code, SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order ,
                mmt_b3.b3_code +' : '+   mmt_b3.b3_actions AS [Action (B3)],
                mmt_ovd_category.category AS Category,
                mmt_wings.wing_name AS Wing,
                mmt_implementing_agency.ia_name AS ia_name,
                mmt_implementing_agency.ministry_code AS mImpCode,
                CASE
                    WHEN tbl_one_vision_doc.priority = 1 THEN 'I'
                    WHEN tbl_one_vision_doc.priority = 2 THEN 'II'
                    WHEN tbl_one_vision_doc.priority = 3 THEN 'III'
                    ELSE CAST(tbl_one_vision_doc.priority AS VARCHAR)
                END AS Priority,
                mmt_navic_vibhas.navic_name AS Vibhas,
                CASE
                    WHEN tbl_one_vision_doc.is_miv = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_miv = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_miv AS VARCHAR)
                END AS [Part of MIV],
                CASE
                    WHEN tbl_one_vision_doc.is_makv = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_makv = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_makv AS VARCHAR)
                END AS [Part of MAKV],
                CASE
                    WHEN tbl_one_vision_doc.is_sgos = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_sgos = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_sgos AS VARCHAR)
                END AS [Part of SGOS],
                tbl_one_vision_doc.target_date AS [Target Date],
                tbl_one_vision_doc.expected_date AS [Expected Date],
                tbl_one_vision_doc.progress AS Progress,
                tbl_one_vision_doc.reason_delay AS [Reason For Delay],
                tbl_one_vision_doc.updated_date AS [Last Updated Date],
                tbl_one_vision_doc.total_cost AS [Total Cost],
                tbl_one_vision_doc.current_status AS [Current Status],
                FINANCE.capital_expenditure [Capital Expenditure],
                FINANCE.source_of_funding as [Source of Funding],
                FINANCE.fund_spend as [Fund Spend],
                FINANCE.one_year as [One Year],
                FINANCE.three_year as [Three Years],
                FINANCE.three_five_year as [Three - Five Years],
                FINANCE.greater_five_year as [ > 5 Years] 
            FROM 
                tbl_one_vision_doc
            LEFT JOIN 
                mmt_a1 ON tbl_one_vision_doc.goal_a1 = mmt_a1.id
            LEFT JOIN 
                mmt_a2 ON tbl_one_vision_doc.intervention_a2 = mmt_a2.id
            LEFT JOIN 
                mmt_a3 ON tbl_one_vision_doc.action_a3 = mmt_a3.id
            LEFT JOIN 
                mmt_b1 ON tbl_one_vision_doc.goal_b1 = mmt_b1.id
            LEFT JOIN 
                mmt_b2_b3 ON tbl_one_vision_doc.intervention_b2 = mmt_b2_b3.id
            LEFT JOIN 
                mmt_b3 ON tbl_one_vision_doc.action_b3 = mmt_b3.id
            LEFT JOIN
                mmt_wings ON tbl_one_vision_doc.wings = mmt_wings.wing_id
            LEFT JOIN 
                mmt_navic_vibhas ON tbl_one_vision_doc.vibhas = mmt_navic_vibhas.id
            LEFT JOIN 
                mmt_ovd_category ON tbl_one_vision_doc.category = mmt_ovd_category.id
            LEFT JOIN 
                mmt_implementing_agency ON tbl_one_vision_doc.imp_agency = mmt_implementing_agency.ia_id
            LEFT JOIN
                ( SELECT DISTINCT ovod_id, SUM(capital_expenditure) AS capital_expenditure,  
                  STRING_AGG( case when source_of_funding = 'PPP_SPV' then 'PPP/SPV' else source_of_funding end, ', ') AS source_of_funding,
                  SUM(one_year) AS one_year,
                  SUM(three_year) AS three_year,
                  SUM(three_five_year) AS three_five_year,
                  SUM(greater_five_year) AS greater_five_year,
                  SUM(fund_spend) AS fund_spend
                  FROM [tbl_ovod_finance]     
                  GROUP BY ovod_id ) 
                FINANCE ON tbl_one_vision_doc.id = FINANCE.ovod_id 
            WHERE 
                tbl_one_vision_doc.delete_status = 0
            )
            select 
            [Goal (A1)],[Intervention (A2)],[Action (A3)],[Goal (B1)],[Intervention (B2)],
            [Action (B3)],Category,Wing,ia_name,Priority,Vibhas,[Part of MIV],[Part of MAKV],[Part of SGOS],[Target Date],[Expected Date],
            Progress,[Reason For Delay],[Last Updated Date],[Total Cost],[Capital Expenditure],[Fund Spend],[Source of Funding],
            [One Year],[Three Years],[Three - Five Years],[ > 5 Years], [Current Status]
            from cte            
            order by Vibhas, cast(a1order as int),cast(a2order as int), cast(a3order as int), cast(b1order as int),cast(b2order as int), cast(b3order as int);      
        `);
           
        } else {
            result = await request.query(`
                with cte as (
            SELECT 
                tbl_one_vision_doc.id,
                mmt_a1.a1_code,SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                mmt_a1.a1_code +' : '+ mmt_a1.goals  AS [Goal (A1)],
                mmt_a2.a2_code, SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                mmt_a2.a2_code +' : '+ mmt_a2.intervension_name AS [Intervention (A2)],
                mmt_a3.a3_code, SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order ,
                mmt_a3.a3_code +' : '+ mmt_a3.action_name AS [Action (A3)],
                mmt_b1.b1_code,SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                mmt_b1.b1_code +' : '+ mmt_b1.b1_goals AS [Goal (B1)],
                mmt_b2_b3.b2_code,SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                mmt_b2_b3.b2_code +' : '+ mmt_b2_b3.intervention AS [Intervention (B2)],
                mmt_b3.b3_code, SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order ,
                mmt_b3.b3_code +' : '+   mmt_b3.b3_actions AS [Action (B3)],
                mmt_ovd_category.category AS Category,
                mmt_wings.wing_name AS Wing,
                mmt_implementing_agency.ia_name AS ia_name,
                mmt_implementing_agency.ministry_code AS mImpCode,
                CASE
                    WHEN tbl_one_vision_doc.priority = 1 THEN 'I'
                    WHEN tbl_one_vision_doc.priority = 2 THEN 'II'
                    WHEN tbl_one_vision_doc.priority = 3 THEN 'III'
                    ELSE CAST(tbl_one_vision_doc.priority AS VARCHAR)
                END AS Priority,
                mmt_navic_vibhas.navic_name AS Vibhas,
                CASE
                    WHEN tbl_one_vision_doc.is_miv = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_miv = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_miv AS VARCHAR)
                END AS [Part of MIV],
                CASE
                    WHEN tbl_one_vision_doc.is_makv = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_makv = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_makv AS VARCHAR)
                END AS [Part of MAKV],
                CASE
                    WHEN tbl_one_vision_doc.is_sgos = 1 THEN 'Yes'
                    WHEN tbl_one_vision_doc.is_sgos = 0 THEN 'No'
                    ELSE CAST(tbl_one_vision_doc.is_sgos AS VARCHAR)
                END AS [Part of SGOS],
                tbl_one_vision_doc.target_date AS [Target Date],
                tbl_one_vision_doc.expected_date AS [Expected Date],
                tbl_one_vision_doc.progress AS Progress,
                tbl_one_vision_doc.reason_delay AS [Reason For Delay],
                tbl_one_vision_doc.updated_date AS [Last Updated Date],
                tbl_one_vision_doc.total_cost AS [Total Cost],
                tbl_one_vision_doc.current_status AS [Current Status],
                FINANCE.capital_expenditure [Capital Expenditure],
                FINANCE.source_of_funding as [Source of Funding],
                FINANCE.fund_spend as [Fund Spend],
                FINANCE.one_year as [One Year],
                FINANCE.three_year as [Three Years],
                FINANCE.three_five_year as [Three - Five Years],
                FINANCE.greater_five_year as [ > 5 Years] 
            FROM 
                tbl_one_vision_doc
            LEFT JOIN 
                mmt_a1 ON tbl_one_vision_doc.goal_a1 = mmt_a1.id
            LEFT JOIN 
                mmt_a2 ON tbl_one_vision_doc.intervention_a2 = mmt_a2.id
            LEFT JOIN 
                mmt_a3 ON tbl_one_vision_doc.action_a3 = mmt_a3.id
            LEFT JOIN 
                mmt_b1 ON tbl_one_vision_doc.goal_b1 = mmt_b1.id
            LEFT JOIN 
                mmt_b2_b3 ON tbl_one_vision_doc.intervention_b2 = mmt_b2_b3.id
            LEFT JOIN 
                mmt_b3 ON tbl_one_vision_doc.action_b3 = mmt_b3.id
            LEFT JOIN
                mmt_wings ON tbl_one_vision_doc.wings = mmt_wings.wing_id
            LEFT JOIN 
                mmt_navic_vibhas ON tbl_one_vision_doc.vibhas = mmt_navic_vibhas.id
            LEFT JOIN 
                mmt_ovd_category ON tbl_one_vision_doc.category = mmt_ovd_category.id
            LEFT JOIN 
                mmt_implementing_agency ON tbl_one_vision_doc.imp_agency = mmt_implementing_agency.ia_id
            LEFT JOIN
                ( SELECT DISTINCT ovod_id, SUM(capital_expenditure) AS capital_expenditure,  
                  STRING_AGG( case when source_of_funding = 'PPP_SPV' then 'PPP/SPV' else source_of_funding end, ', ') AS source_of_funding,
                  SUM(one_year) AS one_year,
                  SUM(three_year) AS three_year,
                  SUM(three_five_year) AS three_five_year,
                  SUM(greater_five_year) AS greater_five_year,
                  SUM(fund_spend) AS fund_spend
                  FROM [tbl_ovod_finance]     
                  GROUP BY ovod_id ) 
                FINANCE ON tbl_one_vision_doc.id = FINANCE.ovod_id 
                WHERE 
                    tbl_one_vision_doc.goal_b1 IS NOT NULL 
                    AND tbl_one_vision_doc.imp_agency = @organisation_id
                    AND tbl_one_vision_doc.delete_status = 0
            )
            select 
            [Goal (A1)],[Intervention (A2)],[Action (A3)],[Goal (B1)],[Intervention (B2)],
            [Action (B3)],Category,Wing,ia_name,Priority,Vibhas,[Part of MIV],[Part of MAKV],[Part of SGOS],[Target Date],[Expected Date],
            Progress,[Reason For Delay],[Last Updated Date],[Total Cost],[Capital Expenditure],[Fund Spend],[Source of Funding],
            [One Year],[Three Years],[Three - Five Years],[ > 5 Years], [Current Status]
            from cte            
            order by Vibhas, cast(a1order as int),cast(a2order as int), cast(a3order as int), cast(b1order as int),cast(b2order as int), cast(b3order as int);      
        `);
        }

        res.json(result.recordset);
        
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getDEStatusDetail(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        let type = req.params.type; 
        
        let result;
        if (type=='Vibhas') {
            result = await request.query(`
            SELECT DISTINCT
                    V.NAVIC_NAME AS [VIBHAS Cell],
                    COUNT(DISTINCT A1.A1_CODE) AS [Total A1],
                    COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A1.A1_CODE 
                    END
                    ) AS [Updated A1], COUNT(DISTINCT A2.A2_CODE) AS [Total A2], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A2.A2_CODE 
                    END
                    ) AS [Updated A2], COUNT(DISTINCT A3.A3_CODE) AS [Total A3], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A3.A3_CODE 
                    END
                    ) AS [Updated A3], COUNT(DISTINCT B1.B1_CODE) AS [Total B1], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            B1.B1_CODE 
                    END
                    ) AS [Updated B1], COUNT(DISTINCT B2.B2_CODE) AS [Total B2], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            B2.B2_CODE 
                    END
                    ) AS [Updated B2], COUNT(DISTINCT B3.B3_CODE) AS [Total B3], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            B3.B3_CODE 
                    END
                    ) AS [Updated B3], ISNULL( SUM(D.TOTAL_COST), 0 ) AS [Total Cost (Cr)] 
                    FROM
                    TBL_ONE_VISION_DOC D 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A3] A3 
                        ON D.ACTION_A3 = A3.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A2] A2 
                        ON D.INTERVENTION_A2 = A2.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A1] A1 
                        ON D.GOAL_A1 = A1.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_B3] B3 
                        ON D.ACTION_B3 = B3.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_B2_B3] B2 
                        ON D.INTERVENTION_B2 = B2.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_B1] B1 
                        ON D.GOAL_B1 = B1.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_IMPLEMENTING_AGENCY] IA 
                        ON D.IMP_AGENCY = IA.IA_ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_NAVIC_VIBHAS] V 
                        ON V.ID = D.VIBHAS 
                    GROUP BY
                    V.NAVIC_NAME;
                `);
        } else if(type == 'Ministry') {
            result = await request.query(`
            SELECT DISTINCT
                    W.WING_NAME AS [Wings],
                    COUNT(DISTINCT A1.A1_CODE) AS [Total A1],
                    COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A1.A1_CODE 
                    END
                    ) AS [Updated A1], COUNT(DISTINCT A2.A2_CODE) AS [Total A2], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A2.A2_CODE 
                    END
                    ) AS [Updated A2], COUNT(DISTINCT A3.A3_CODE) AS [Total A3], COUNT( DISTINCT 
                    CASE
                        WHEN
                            D.UPDATED_DATE IS NOT NULL 
                        THEN
                            A3.A3_CODE 
                    END
                    ) AS [Updated A3], ISNULL( SUM(D.TOTAL_COST), 0 ) AS [Total Cost (Cr)] 
                    FROM
                    TBL_ONE_VISION_DOC D 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A3] A3 
                        ON D.ACTION_A3 = A3.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A2] A2 
                        ON D.INTERVENTION_A2 = A2.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_A1] A1 
                        ON D.GOAL_A1 = A1.ID 
                    LEFT JOIN
                        [SAGARMANTHAN_REVAMP].[DBO].[MMT_WINGS] W 
                        ON W.WING_ID = D.WINGS 
                    WHERE
                    D.IMP_AGENCY = 14 
                    GROUP BY
                    W.WING_NAME;
            `);
        }  else if(type == 'Organisation') {
            result = await request.query(`
            SELECT 
                ia.ia_name AS [Organisation Name],
                --d.imp_agency,
                COUNT(DISTINCT b1.b1_code) AS [Total B1],
                COUNT(DISTINCT CASE WHEN d.updated_date IS NOT NULL THEN b1.b1_code END) AS [Updated B1],
                COUNT(DISTINCT b2.b2_code) AS [Total B2],
                COUNT(DISTINCT CASE WHEN d.updated_date IS NOT NULL THEN b2.b2_code END) AS [Updated B2],
                COUNT(DISTINCT b3.b3_code) AS [Total B3],
                COUNT(DISTINCT CASE WHEN d.updated_date IS NOT NULL THEN b3.b3_code END) AS [Updated B3],
                ISNULL(SUM(d.total_cost), 0) AS [Total Cost (Cr)]
            FROM 
                tbl_one_vision_doc d
            LEFT JOIN 
                [sagarmanthan_revamp].[dbo].[mmt_b3] b3 ON d.action_b3 = b3.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_b2_b3] b2 ON d.intervention_b2 = b2.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_b1] b1 ON d.goal_b1 = b1.id
            LEFT JOIN
                [sagarmanthan_revamp].[dbo].[mmt_implementing_agency] ia ON d.imp_agency = ia.ia_id
            WHERE
                ia.ovd_status !=0
            GROUP BY 
                ia.ia_name, 
                d.imp_agency
            `);
        }

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
    } finally {
        await sql.close();
    }

}

async function getOVODDropDownData(req, res) {
    const conn = await pool;
    const request = conn.request();

    const tid = req.params.tid;
    const orgId = req.params.orgId;
    let vibhasID = orgId;

    request.input("orgId", orgId);
    request.input("vibhasID", vibhasID);
   
    
    let query;
    switch (tid) {
        // Org Filter and dropdown
        case "org_b1_filter":
            query = `with cte as(
                SELECT DISTINCT (b.b1_code + ' : ' + b.b1_goals) AS b1_goals, 
                b.b1_code,b.id,b.a2_code,
                SUBSTRING(
                    b.b1_code,
                    CHARINDEX('-', b.b1_code) + 1,                           
                    CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                    - CHARINDEX('-', b.b1_code) - 1                         
                ) AS cell_name,
                cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int) AS b1order 
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b1 b ON a.goal_b1 = b.id
                where goal_b1 is not null AND a.imp_agency = @orgId AND a.delete_status = 0)
                select b1_goals,b1_code,id, a2_code from cte ORDER BY cell_name,  cast( b1order as int);`;
            break;
        case "org_b2_filter":
            query = `(SELECT DISTINCT 
                (b.b2_code + ' : ' + b.intervention) AS intervention,
                b.b2_code,b.b1_code,b.id, 
                    SUBSTRING(
                        b.b1_code,
                        CHARINDEX('-', b.b1_code) + 1,                           
                        CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                        - CHARINDEX('-', b.b1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int)  AS b1order ,
                    cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order
                    FROM tbl_one_vision_doc a 
                    LEFT JOIN mmt_b2_b3 b  
                    ON a.intervention_b2 = b.id
                    WHERE b2_code IS NOT NULL AND a.imp_agency = @orgId AND a.delete_status = 0)
                    order by cell_name , b1order  , b2order ;`;
            break;
        case "org_b3_filter":
            query = `SELECT DISTINCT (b.b3_code + ' : ' + b.b3_actions) AS b3_actions,b.b2_code,b.id,
                SUBSTRING(
                    b.b2_code, 
                    CHARINDEX('-', b.b2_code) + 1, 
                    CHARINDEX('-', b.b2_code, CHARINDEX('-', b.b2_code) + 1) 
                    - CHARINDEX('-', b.b2_code) - 1
                ) AS cell_name,
                                cast(  SUBSTRING(
                    b2_code, 
                    CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) + 1, 
                    CHARINDEX('.', b2_code) - CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) - 1
                ) as int)AS b1order,
                cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order,
                CAST(SUBSTRING( b.b3_code,   CHARINDEX('.', b.b3_code, CHARINDEX('.', b.b3_code) + 1) + 1, LEN(b.b3_code) ) AS int ) AS b3order
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b3 b ON a.action_b3 = b.id
                where b2_code is not null AND a.imp_agency = @orgId AND a.delete_status = 0 ORDER BY cell_name, b1order, b2order,b3order;`;
            break;

        // Dropdown For A level
        case "org_a1_filter_a":
            query = `WITH cte AS (
                SELECT DISTINCT (b.a1_code + ' : ' + b.goals) AS goal_a1,b.a1_code,b.id,
                    SUBSTRING(
                        b.a1_code, 
                        CHARINDEX('-', b.a1_code) + 1, 
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) 
                        - CHARINDEX('-', b.a1_code) - 1
                    ) AS cell_name,
                    SUBSTRING(b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1, LEN(b.a1_code)) AS a1order
                FROM tbl_one_vision_doc a
                LEFT JOIN mmt_a1 b ON a.goal_a1 = b.id
                WHERE a.delete_status = 0 AND a.imp_agency = @orgId AND a.action_a3 is not null)
            SELECT goal_a1, a1_code,id FROM cte ORDER BY cell_name, CAST(a1order AS INT);`;
            break;
        case "org_a2_filter_a":
            query = `SELECT DISTINCT                     
                (b.a2_code + ' : ' + b.intervension_name) AS intervention,
                b.a2_code,b.a1_code,b.id, 
                    SUBSTRING(
                        b.a1_code,
                        CHARINDEX('-', b.a1_code) + 1,                           
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1)   
                        - CHARINDEX('-', b.a1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1,  LEN(b.a1_code) ) as int)  AS a1order ,
                    cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order
                FROM tbl_one_vision_doc a 
                LEFT JOIN mmt_a2 b  
                ON a.intervention_a2 = b.id
                WHERE a2_code IS NOT NULL AND a.imp_agency = @orgId AND a.action_a3 is not null AND a.delete_status = 0
                order by cell_name , a1order  , a2order ;`;
            break;

        // Dropdown For B level
        case "org_a1_filter":
            query = `WITH cte AS (
                SELECT DISTINCT (b.a1_code + ' : ' + b.goals) AS goal_a1,b.a1_code,b.id,
                    SUBSTRING(
                        b.a1_code, 
                        CHARINDEX('-', b.a1_code) + 1, 
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) 
                        - CHARINDEX('-', b.a1_code) - 1
                    ) AS cell_name,
                    SUBSTRING(b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1, LEN(b.a1_code)) AS a1order
                FROM tbl_one_vision_doc a
                LEFT JOIN mmt_a1 b ON a.goal_a1 = b.id
                WHERE a.delete_status = 0 AND a.imp_agency = @orgId AND a.action_a3 is null)
            SELECT goal_a1, a1_code,id FROM cte ORDER BY cell_name, CAST(a1order AS INT);`;
            break;
        case "org_a2_filter":
            query = `SELECT DISTINCT                     
                (b.a2_code + ' : ' + b.intervension_name) AS intervention,
                b.a2_code,b.a1_code,b.id, 
                    SUBSTRING(
                        b.a1_code,
                        CHARINDEX('-', b.a1_code) + 1,                           
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1)   
                        - CHARINDEX('-', b.a1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1,  LEN(b.a1_code) ) as int)  AS a1order ,
                    cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order
                FROM tbl_one_vision_doc a 
                LEFT JOIN mmt_a2 b  
                ON a.intervention_a2 = b.id
                WHERE a2_code IS NOT NULL AND a.imp_agency = @orgId AND a.action_a3 is null AND a.delete_status = 0
                order by cell_name , a1order  , a2order ;`;
            break;     

        // Main Filter 
        case "org_b1_filter_main":
            query = `with cte as(
                SELECT DISTINCT (b.b1_code + ' : ' + b.b1_goals) AS b1_goals, 
                b.b1_code,b.id,b.a2_code,
                SUBSTRING(
                    b.b1_code,
                    CHARINDEX('-', b.b1_code) + 1,                           
                    CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                    - CHARINDEX('-', b.b1_code) - 1                         
                ) AS cell_name,
                cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int) AS b1order 
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b1 b ON a.goal_b1 = b.id
                where goal_b1 is not null AND a.delete_status = 0)
                select b1_goals,b1_code,id, a2_code from cte ORDER BY cell_name,  cast( b1order as int);`;
            break;
        case "org_b2_filter_main":
            query = `(SELECT DISTINCT 
                (b.b2_code + ' : ' + b.intervention) AS intervention,
                b.b2_code,b.b1_code,b.id, 
                    SUBSTRING(
                        b.b1_code,
                        CHARINDEX('-', b.b1_code) + 1,                           
                        CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                        - CHARINDEX('-', b.b1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int)  AS b1order ,
                    cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order
                    FROM tbl_one_vision_doc a 
                    LEFT JOIN mmt_b2_b3 b  
                    ON a.intervention_b2 = b.id
                    WHERE b2_code IS NOT NULL AND a.delete_status = 0)
                    order by cell_name , b1order  , b2order ;`;
            break;
        case "org_b3_filter_main":
            query = `SELECT DISTINCT (b.b3_code + ' : ' + b.b3_actions) AS b3_actions,b.b2_code,b.id,
                SUBSTRING(
                    b.b2_code, 
                    CHARINDEX('-', b.b2_code) + 1, 
                    CHARINDEX('-', b.b2_code, CHARINDEX('-', b.b2_code) + 1) 
                    - CHARINDEX('-', b.b2_code) - 1
                ) AS cell_name,
                                cast(  SUBSTRING(
                    b2_code, 
                    CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) + 1, 
                    CHARINDEX('.', b2_code) - CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) - 1
                ) as int)AS b1order,
                cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order,
                CAST(SUBSTRING( b.b3_code,   CHARINDEX('.', b.b3_code, CHARINDEX('.', b.b3_code) + 1) + 1, LEN(b.b3_code) ) AS int ) AS b3order
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b3 b ON a.action_b3 = b.id
                where b2_code is not null AND a.delete_status = 0 ORDER BY cell_name, b1order, b2order,b3order;`;
            break;
        case "org_a1_filter_main":
            query = `WITH cte AS (
                SELECT DISTINCT (b.a1_code + ' : ' + b.goals) AS goal_a1,b.a1_code,b.id,
                    SUBSTRING(
                        b.a1_code, 
                        CHARINDEX('-', b.a1_code) + 1, 
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) 
                        - CHARINDEX('-', b.a1_code) - 1
                    ) AS cell_name,
                    SUBSTRING(b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1, LEN(b.a1_code)) AS a1order
                FROM tbl_one_vision_doc a
                LEFT JOIN mmt_a1 b ON a.goal_a1 = b.id
                WHERE a.delete_status = 0)
            SELECT goal_a1, a1_code,id FROM cte ORDER BY cell_name, CAST(a1order AS INT);`;
            break;
        case "org_a2_filter_main":
            query = `SELECT DISTINCT                     
                (b.a2_code + ' : ' + b.intervension_name) AS intervention,
                b.a2_code,b.a1_code,b.id, 
                    SUBSTRING(
                        b.a1_code,
                        CHARINDEX('-', b.a1_code) + 1,                           
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1)   
                        - CHARINDEX('-', b.a1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1,  LEN(b.a1_code) ) as int)  AS a1order ,
                    cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order
                FROM tbl_one_vision_doc a 
                LEFT JOIN mmt_a2 b  
                ON a.intervention_b2 = b.id
                WHERE a2_code IS NOT NULL AND a.delete_status = 0
                order by cell_name , a1order  , a2order ;`;
            break;
        case "org_a3_filter_main":
            query = `SELECT DISTINCT (b.a3_code + ' : ' + b.action_name) AS a3_actions,b.a2_code,b.a3_code,
                SUBSTRING(
                        b.a2_code, 
                        CHARINDEX('-', b.a2_code) + 1, 
                        CHARINDEX('-', b.a2_code, CHARINDEX('-', b.a2_code) + 1) 
                        - CHARINDEX('-', b.a2_code) - 1
                    ) AS cell_name,
                    cast(  SUBSTRING(
                        a2_code, 
                        CHARINDEX('-', a2_code, CHARINDEX('-', a2_code) + 1) + 1, 
                        CHARINDEX('.', a2_code) - CHARINDEX('-', a2_code, CHARINDEX('-', a2_code) + 1) - 1
                    ) as int)AS a1order,
                    cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order,
                    CAST(SUBSTRING( b.a3_code,   CHARINDEX('.',b.a3_code, CHARINDEX('.', b.a3_code) + 1) + 1, LEN(b.a3_code) ) AS INT) AS a3order 
                    from tbl_one_vision_doc a
                    LEFT JOIN mmt_a3 b ON a.action_a3 = b.id
                    where a.delete_status = 0 AND b.a3_code IS NOT NULL  ORDER BY cell_name, a1order, a2order, a3order;`;
            break;
        
        // Vibhas Level Filter
        case "org_b1_filter_vibhas":
            query = `with cte as(
                SELECT DISTINCT (b.b1_code + ' : ' + b.b1_goals) AS b1_goals, 
                b.b1_code,b.id,b.a2_code,
                SUBSTRING(
                    b.b1_code,
                    CHARINDEX('-', b.b1_code) + 1,                           
                    CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                    - CHARINDEX('-', b.b1_code) - 1                         
                ) AS cell_name,
                cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int) AS b1order 
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b1 b ON a.goal_b1 = b.id
                where goal_b1 is not null AND a.delete_status = 0 AND a.vibhas = @vibhasID)
                select b1_goals,b1_code,id, a2_code from cte ORDER BY cell_name,  cast( b1order as int);`;
            break;
        case "org_b2_filter_vibhas":
            
            query = `(SELECT DISTINCT 
                (b.b2_code + ' : ' + b.intervention) AS intervention,
                b.b2_code,b.b1_code,b.id, 
                    SUBSTRING(
                        b.b1_code,
                        CHARINDEX('-', b.b1_code) + 1,                           
                        CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1)   
                        - CHARINDEX('-', b.b1_code) - 1                         
                    ) AS cell_name,			
                    cast( SUBSTRING( b.b1_code, CHARINDEX('-', b.b1_code, CHARINDEX('-', b.b1_code) + 1) + 1,  LEN(b.b1_code) ) as int)  AS b1order ,
                    cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order
                    FROM tbl_one_vision_doc a 
                    LEFT JOIN mmt_b2_b3 b  
                    ON a.intervention_b2 = b.id
                    WHERE b2_code IS NOT NULL AND a.delete_status = 0 AND a.vibhas = @vibhasID)
                    order by cell_name , b1order  , b2order ;`;
            break;
        case "org_b3_filter_vibhas":
            query = `SELECT DISTINCT (b.b3_code + ' : ' + b.b3_actions) AS b3_actions,b.b2_code,b.id,
                SUBSTRING(
                    b.b2_code, 
                    CHARINDEX('-', b.b2_code) + 1, 
                    CHARINDEX('-', b.b2_code, CHARINDEX('-', b.b2_code) + 1) 
                    - CHARINDEX('-', b.b2_code) - 1
                ) AS cell_name,
                                cast(  SUBSTRING(
                    b2_code, 
                    CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) + 1, 
                    CHARINDEX('.', b2_code) - CHARINDEX('-', b2_code, CHARINDEX('-', b2_code) + 1) - 1
                ) as int)AS b1order,
                cast(SUBSTRING(b.b2_code,  CHARINDEX('.', b.b2_code) + 1,  LEN(b.b2_code)) as int) AS b2order,
                CAST(SUBSTRING( b.b3_code,   CHARINDEX('.', b.b3_code, CHARINDEX('.', b.b3_code) + 1) + 1, LEN(b.b3_code) ) AS int ) AS b3order
                from tbl_one_vision_doc a
                LEFT JOIN mmt_b3 b ON a.action_b3 = b.id
                where b2_code is not null AND a.delete_status = 0 AND a.vibhas = @vibhasID ORDER BY cell_name, b1order, b2order,b3order;`;
            break;
        case "org_a1_filter_vibhas":
            query = `WITH cte AS (
                SELECT DISTINCT (b.a1_code + ' : ' + b.goals) AS goal_a1,b.a1_code,b.id,
                    SUBSTRING(
                        b.a1_code, 
                        CHARINDEX('-', b.a1_code) + 1, 
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) 
                        - CHARINDEX('-', b.a1_code) - 1
                    ) AS cell_name,
                    SUBSTRING(b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1, LEN(b.a1_code)) AS a1order
                FROM tbl_one_vision_doc a
                LEFT JOIN mmt_a1 b ON a.goal_a1 = b.id
                WHERE a.delete_status = 0 AND a.vibhas = @vibhasID)
            SELECT goal_a1, a1_code,id FROM cte ORDER BY cell_name, CAST(a1order AS INT);`;
            break;
        case "org_a2_filter_vibhas":
            query = `SELECT DISTINCT                     
                (b.a2_code + ' : ' + b.intervension_name) AS intervention,
                b.a2_code,b.a1_code,b.id, 
                    SUBSTRING(
                        b.a1_code,
                        CHARINDEX('-', b.a1_code) + 1,                           
                        CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1)   
                        - CHARINDEX('-', b.a1_code) - 1                         
                    ) AS cell_name,			
                    cast(SUBSTRING( b.a1_code, CHARINDEX('-', b.a1_code, CHARINDEX('-', b.a1_code) + 1) + 1,  LEN(b.a1_code) ) as int)  AS a1order ,
                    cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order
                FROM tbl_one_vision_doc a 
                LEFT JOIN mmt_a2 b  
                ON a.intervention_a2 = b.id
                WHERE a2_code IS NOT NULL AND a.vibhas = @vibhasID AND a.delete_status = 0
                order by cell_name , a1order  , a2order ;`;
            break;
        case "org_a3_filter_vibhas":
            query = `SELECT DISTINCT (b.a3_code + ' : ' + b.action_name) AS a3_actions,b.a2_code,b.a3_code,
                SUBSTRING(
                    b.a2_code, 
                    CHARINDEX('-', b.a2_code) + 1, 
                    CHARINDEX('-', b.a2_code, CHARINDEX('-', b.a2_code) + 1) 
                    - CHARINDEX('-', b.a2_code) - 1
                ) AS cell_name,
                cast(  SUBSTRING(
                    a2_code, 
                    CHARINDEX('-', a2_code, CHARINDEX('-', a2_code) + 1) + 1, 
                    CHARINDEX('.', a2_code) - CHARINDEX('-', a2_code, CHARINDEX('-', a2_code) + 1) - 1
                ) as int)AS a1order,
                cast(SUBSTRING(b.a2_code,  CHARINDEX('.', b.a2_code) + 1,  LEN(b.a2_code)) as int) AS a2order,
                CAST(SUBSTRING( b.a3_code,   CHARINDEX('.',b.a3_code, CHARINDEX('.', b.a3_code) + 1) + 1, LEN(b.a3_code) ) AS INT) AS a3order 
                from tbl_one_vision_doc a
                LEFT JOIN mmt_a3 b ON a.action_a3 = b.id
                where a.delete_status = 0 AND a.vibhas = @vibhasID AND b.a3_code IS NOT NULL  ORDER BY cell_name, a1order, a2order, a3order;`;
            break;   
    }
    try {
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getOVODStatusData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const idOrg = req.params.organisation; 

        request.input("idOrg", idOrg);


        const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
        const orgCode = orgCodeGet.recordset[0].organisation_code;
        request.input("orgCode", orgCode);
        const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
        const organisation_id = orgMainId.recordset[0].ia_id;
        
        request.input("organisation_id", organisation_id);
        
        let result = await request.query(`
            SELECT 
                'Yet to be Started' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Yet to be Started' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'Under Implementation - On Time' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Under Implementation - On Time' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'Under Implementation - Delayed' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Under Implementation - Delayed' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'Completed' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Completed' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'Not Applicable' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Not Applicable' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'Dropped' AS [List],
                COUNT(*) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.current_status = 'Dropped' AND d.imp_agency = @organisation_id AND d.action_a3 IS NULL AND d.delete_status = 0

            UNION ALL

            SELECT 
                'No Update' AS [List],
                COUNT(CASE 
                        WHEN d.current_status IS NULL AND d.action_a3 IS NULL THEN 1 
                        ELSE NULL 
                    END) AS [Total_count]
            FROM 
                tbl_one_vision_doc d
            WHERE
                d.imp_agency = @organisation_id AND d.delete_status = 0;

            `);

        res.json(result.recordset);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    } finally {
        await sql.close();
    }

}

async function getAddOVDData(req, res) {
    const conn = await pool;
    const request = conn.request();


    const goalA1 = req.params.goalA1;
    const a2Intervention = req.params.a2Intervention;
    const goalB1 = req.params.goalB1;
    const interventionB2 = req.params.interventionB2;
    const type = req.params.type;
    const impId = req.params.impId;

    // console.log("goalA1,a2Intervention,goalB1,interventionB2,type,impId",goalA1,a2Intervention,goalB1,interventionB2,type,impId);

    request.input("goalA1", goalA1);
    request.input("a2Intervention", a2Intervention);
    request.input("goalB1", goalB1);
    request.input("interventionB2", interventionB2);
    request.input("type", type);
    request.input("impId", impId);

    let query;
    let queryCode;
    switch (type) {
        case "A3":
            query = `SELECT TOP(1) * FROM tbl_one_vision_doc WHERE goal_a1 = @goalA1 AND intervention_a2 = @a2Intervention AND imp_agency = @impId;`;
            queryCode= `with a3_generate as(
                select MAX( CAST(SUBSTRING(a3_code,  CHARINDEX('.', a3_code, CHARINDEX('.', a3_code) + 1) + 1, 
	            LEN(a3_code) - CHARINDEX('.', a3_code, CHARINDEX('.', a3_code) + 1) ) AS INT ))  AS maxValue, a2_code from mmt_a3 where  primary_id_of_a2 = @a2Intervention group by a2_code)
		        select concat(a2_code +'.', maxValue+1) as new_code from a3_generate;` ;
            break;
        case "B2":
            query = `SELECT TOP(1) * FROM tbl_one_vision_doc WHERE goal_a1 = @goalA1 AND intervention_a2 = @a2Intervention AND goal_b1 = @goalB1 AND imp_agency = @impId`;
            queryCode= `declare @b1id int, @b2max int, @b1code nvarchar(50), @newb2code nvarchar(50)
                set @b1id = @goalB1
                set @b1code = (select  b1_code from mmt_b1 where id =  @b1id  );
                set @b2max = (select count(distinct b2_code) from mmt_b2_b3 where primary_id_of_b1 =  @b1id);
                set @newb2code = CONCAT (@b1code+'.',@b2max+1);
                SELECT @newb2code AS B2Code` ;
            break;
        case "B2Org":
            query = `SELECT TOP(1) * FROM tbl_one_vision_doc WHERE goal_b1 = @goalB1 AND imp_agency = @impId`;
            queryCode= `declare @b1id int, @b2max int, @b1code nvarchar(50), @newb2code nvarchar(50)
                set @b1id = @goalB1
                set @b1code = (select  b1_code from mmt_b1 where id =  @b1id  );
                set @b2max = (select count(distinct b2_code) from mmt_b2_b3 where primary_id_of_b1 =  @b1id);
                set @newb2code = CONCAT (@b1code+'.',@b2max+1);
                SELECT @newb2code AS B2Code` ;
            break;
        case "B3":
            query = `SELECT TOP(1) * FROM tbl_one_vision_doc WHERE goal_a1 = @goalA1 AND intervention_a2 = @a2Intervention AND goal_b1 = @goalB1 AND intervention_b2 = @interventionB2 AND imp_agency = @impId`;
            queryCode= `with b3_generate as(
                select MAX( CAST(SUBSTRING(b3_code,  CHARINDEX('.', b3_code, CHARINDEX('.', b3_code) + 1) + 1, 
                LEN(b3_code) - CHARINDEX('.', b3_code, CHARINDEX('.', b3_code) + 1) ) AS INT ))  AS maxValue, b2_code from mmt_b3 where  b2_id = @interventionB2 group by b2_code)
                select concat(b2_code +'.', maxValue+1) as new_code from b3_generate;` ;
            break;
        default:
            query = `SELECT TOP(1) * FROM tbl_one_vision_doc WHERE goal_b1 = @goalB1 AND intervention_b2 = @interventionB2 AND imp_agency = @impId`;
            queryCode= `with b3_generate as(
                select MAX( CAST(SUBSTRING(b3_code,  CHARINDEX('.', b3_code, CHARINDEX('.', b3_code) + 1) + 1, 
                LEN(b3_code) - CHARINDEX('.', b3_code, CHARINDEX('.', b3_code) + 1) ) AS INT ))  AS maxValue, b2_code from mmt_b3 where  b2_id = @interventionB2 group by b2_code)
                select concat(b2_code +'.', maxValue+1) as new_code from b3_generate;` ;
            break;
    }
    try {
        const result = await request.query(query);
        const newCode  = await request.query(queryCode) || null;

        const combinedResult = {
            result: result.recordset,
            newCode: newCode.recordset
        };
        res.json(combinedResult);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getOVODImpId(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const idOrg = req.params.orgId; 

        request.input("idOrg", idOrg);
    
        const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
        const orgCode = orgCodeGet.recordset[0].organisation_code;
        request.input("orgCode", orgCode);
        const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
        const organisationId = orgMainId.recordset[0].ia_id;
        res.json(organisationId);
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    } 

}

async function getPercentageOVD(req, res) {
    const conn = await pool;
    const request = conn.request();

    const ID = req.params.ID;
    request.input("ID", ID);
    try {
        const result = await request.query(`SELECT * FROM tbl_ovd_percentage_log WHERE tbl_ovd_percentage_log.ovd_id = @ID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getCountInitDetail(req, res){
    const conn = await pool;
    const request = conn.request();

    let userID = req.params.userID;
    let wingID = parseInt(req.params.wingID);
    let orgID = parseInt(req.params.orgID);
    let vision = parseInt(req.params.vision);
    let vibhasID = parseInt(req.params.vibhasID);
    let priority = parseInt(req.params.priority);
    let mivChapterSelect = req.params.mivChapterSelect;
    let makvThemeSelect = req.params.makvThemeSelect;


    if (mivChapterSelect === "0") {
        mivChapterSelect = 0;
    }

    if (makvThemeSelect === "0") {
        makvThemeSelect = 0;
    }

    request.input("wingID", wingID);
    request.input("orgID", orgID);
    request.input("vision", vision);
    request.input("vibhasID", vibhasID);
    request.input("priority", priority);
    request.input("userID", userID);
    request.input("mivChapterSelect", mivChapterSelect);  
    request.input("makvThemeSelect", makvThemeSelect);    


    try {

        const userResult = await request.query(`SELECT role_id FROM tbl_user WHERE user_id = @userID`);
        const role_id = userResult.recordset[0].role_id;

        const userOrg = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
        const idOrg = userOrg.recordset[0].organisation_id;
        request.input("idOrg", idOrg);
        const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
        const orgCode = orgCodeGet.recordset[0].organisation_code;
        request.input("orgCode", orgCode);
        const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
        const organisation_id = orgMainId.recordset[0].ia_id;

        request.input("organisation_id", organisation_id);


        let whereClause = [];
        if (wingID !== 0) whereClause.push("tbl_one_vision_doc.wings = @wingID");
        if (orgID !== 0) whereClause.push("tbl_one_vision_doc.imp_agency = @orgID");
        if (priority !== 0) whereClause.push("tbl_one_vision_doc.priority = @priority");
        if (vibhasID !== 0) whereClause.push("tbl_one_vision_doc.vibhas = @vibhasID");
        if (mivChapterSelect !== 0) whereClause.push("tbl_one_vision_doc.miv_chapter = @mivChapterSelect");
        if (makvThemeSelect !== 0) whereClause.push("tbl_one_vision_doc.makv_theme = @makvThemeSelect");
        if (vision !== 0) {
            switch (vision) {
                case 1:
                    whereClause.push("tbl_one_vision_doc.is_miv = 1");
                    break;
                case 2:
                    whereClause.push("tbl_one_vision_doc.is_makv = 1");
                    break;
                case 3:
                    whereClause.push("tbl_one_vision_doc.is_sgos = 1");
                    break;
                case 4:
                    whereClause.push("tbl_one_vision_doc.is_additional_item = 1");
                    break;
            }
        }

        let whereCatgeoryCondition;

         if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            // whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE (tbl_one_vision_doc.goal_b1 IS NOT NULL OR tbl_one_vision_doc.intervention_b2 IS NOT NULL) AND tbl_one_vision_doc.imp_agency = @organisation_id AND ' + whereClause.join(' AND ') : 'WHERE (tbl_one_vision_doc.goal_b1 IS NULL OR tbl_one_vision_doc.action_a3 IS NOT NULL) AND tbl_one_vision_doc.imp_agency = @organisation_id';
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE tbl_one_vision_doc.delete_status = 0';
        } else {
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.goal_b1 IS NOT NULL AND tbl_one_vision_doc.intervention_b2 IS NOT NULL AND tbl_one_vision_doc.imp_agency = @organisation_id AND tbl_one_vision_doc.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE (tbl_one_vision_doc.goal_b1 IS NOT NULL OR tbl_one_vision_doc.intervention_b2 IS NOT NULL) AND tbl_one_vision_doc.imp_agency = @organisation_id AND tbl_one_vision_doc.delete_status = 0';
        }

        let getQuery;

        if(role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8){
            getQuery = `SELECT 
                COUNT(CASE WHEN current_status = 'Dropped' THEN 1 END) AS Dropped_Count,
                COUNT(CASE WHEN current_status = 'Not Applicable' THEN 1 END) AS Not_Applicable_Count
            FROM 
                tbl_one_vision_doc
            ${whereCatgeoryCondition}; `;
        } else {
            getQuery = `SELECT 
                COUNT(CASE WHEN current_status = 'Dropped' THEN 1 END) AS Dropped_Count,
                COUNT(CASE WHEN current_status = 'Not Applicable' THEN 1 END) AS Not_Applicable_Count
            FROM 
                tbl_one_vision_doc
            ${whereCatgeoryCondition};` 
        }
        const result = await request.query(getQuery);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
        
}


export default {
    getOVDData, getOVDVibhasData, getOVODDropDownData, getOVODOrgAllData, getOVODStatusData, getDEStatusDetail,
    getOVODImpId, getCountInitDetail, getPercentageOVD, getAddOVDData
};