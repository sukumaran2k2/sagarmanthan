import { pool } from "../../db.js";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const uploadDestination = './fileuploads/One_vision_one_doc';

if (!fs.existsSync(uploadDestination)) {
    fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "./fileuploads/One_vision_one_doc");
    },
    filename: (req, file, callback) => {
        const uniqueFileName = generateUniqueFileName(file.originalname);
        req.uniqueFileName = uniqueFileName;
        callback(null, uniqueFileName);
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// Tree structure
async function getAllResultOVDData(req, res) {
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
    let statusCurrent = req.params.statusCurrent;

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
    request.input("statusCurrent", statusCurrent);    
    
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
        if (statusCurrent !== "0") whereClause.push("tbl_one_vision_doc.current_status = @statusCurrent");

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

         if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id === 8) {
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE tbl_one_vision_doc.delete_status = 0';
        } else {
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE tbl_one_vision_doc.goal_b1 IS NOT NULL AND tbl_one_vision_doc.imp_agency = @organisation_id AND  tbl_one_vision_doc.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE tbl_one_vision_doc.goal_b1 IS NOT NULL AND tbl_one_vision_doc.imp_agency = @organisation_id AND tbl_one_vision_doc.delete_status = 0';
        }

        let result;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id === 8) {
            result = await request.query(`
            with cte as (
            SELECT 
                 tbl_one_vision_doc.id,
				mmt_a1.a1_code,SUBSTRING( mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code, CHARINDEX('-', mmt_a1.a1_code) + 1) + 1,  LEN(mmt_a1.a1_code) ) AS a1order,
                'A1 : ' + mmt_a1.a1_code +' : '+ mmt_a1.goals  AS [Goal (A1)],
				mmt_a2.a2_code, SUBSTRING(mmt_a2.a2_code,  CHARINDEX('.', mmt_a2.a2_code) + 1,  LEN(mmt_a2.a2_code) ) AS a2order,
                'A2 : ' + mmt_a2.a2_code +' : '+ mmt_a2.intervension_name AS [Intervention (A2)],
				mmt_a3.a3_code, SUBSTRING( mmt_a3.a3_code,   CHARINDEX('.',mmt_a3.a3_code, CHARINDEX('.', mmt_a3.a3_code) + 1) + 1, LEN(mmt_a3.a3_code) ) AS a3order ,
                'A3 : ' + mmt_a3.a3_code +' : '+ mmt_a3.action_name AS [Action (A3)],
				mmt_b1.b1_code,SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                'B1 : ' + mmt_b1.b1_code +' : '+ mmt_b1.b1_goals AS [Goal (B1)],
                mmt_b2_b3.b2_code,SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
				'B2 : ' + mmt_b2_b3.b2_code +' : '+ mmt_b2_b3.intervention AS [Intervention (B2)],
                mmt_b3.b3_code, SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order ,
				'B3 : ' + mmt_b3.b3_code +' : '+   mmt_b3.b3_actions AS [Action (B3)],
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
                tbl_one_vision_doc.is_miv AS [Part of MIV],
                tbl_one_vision_doc.is_makv AS [Part of MAKV],
                tbl_one_vision_doc.is_sgos AS [Part of SGOS],
                tbl_one_vision_doc.target_date AS [Target Date],
                tbl_one_vision_doc.expected_date AS [Expected Date],
                tbl_one_vision_doc.progress AS Progress,
                --tbl_one_vision_doc.total_cost AS [Total Cost],
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
				(  SELECT DISTINCT ovod_id, SUM(capital_expenditure) AS capital_expenditure,  
				  STRING_AGG( case when source_of_funding = 'PPP_SPV' then 'PPP/SPV' else source_of_funding end, ', ') AS source_of_funding,
				  SUM(one_year) AS one_year,
				  SUM(three_year) AS three_year,
				  SUM(three_five_year) AS three_five_year,
				  SUM(greater_five_year) AS greater_five_year,
				  SUM(fund_spend) AS fund_spend
				  FROM [tbl_ovod_finance]     
				  GROUP BY ovod_id ) 
				FINANCE ON tbl_one_vision_doc.id = FINANCE.ovod_id
            ${whereCatgeoryCondition} 
            )
            select 
			id,a1_code,[Goal (A1)],a2_code,[Intervention (A2)],a3_code,[Action (A3)],b1_code,[Goal (B1)],b2_code,[Intervention (B2)],
			b3_code,[Action (B3)],Category,Wing,ia_name,mImpCode,Priority,Vibhas,[Part of MIV],[Part of MAKV],[Part of SGOS],[Target Date],[Expected Date],
			Progress,[Reason For Delay],[Last Updated Date],[Total Cost],[Capital Expenditure],[Fund Spend],[Source of Funding],
			[One Year],[Three Years],[Three - Five Years],[ > 5 Years], [Current Status]
			from cte 			
			order by Vibhas, cast(a1order as int),cast(a2order as int), cast(a3order as int), cast(b1order as int),cast(b2order as int), cast(b3order as int)
        `);
        } else {
            result = await request.query(`with cte as (
            SELECT
                 tbl_one_vision_doc.id,            
                mmt_b1.b1_code,SUBSTRING( mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code, CHARINDEX('-', mmt_b1.b1_code) + 1) + 1,  LEN(mmt_b1.b1_code) ) AS b1order,
                'B1 : ' + mmt_b1.b1_code +' : '+ mmt_b1.b1_goals AS [Goal (B1)],
                mmt_b2_b3.b2_code,SUBSTRING(mmt_b2_b3.b2_code,  CHARINDEX('.', mmt_b2_b3.b2_code) + 1,  LEN(mmt_b2_b3.b2_code) ) AS b2order,
                'B2 : ' + mmt_b2_b3.b2_code +' : '+ mmt_b2_b3.intervention AS [Intervention (B2)],
                mmt_b3.b3_code, SUBSTRING( mmt_b3.b3_code,   CHARINDEX('.', mmt_b3.b3_code, CHARINDEX('.', mmt_b3.b3_code) + 1) + 1, LEN(mmt_b3.b3_code) ) AS b3order ,
                'B3 : ' + mmt_b3.b3_code +' : '+   mmt_b3.b3_actions AS [Action (B3)],
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
                tbl_one_vision_doc.is_miv AS [Part of MIV],
                tbl_one_vision_doc.is_makv AS [Part of MAKV],
                tbl_one_vision_doc.is_sgos AS [Part of SGOS],
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
				(  SELECT DISTINCT ovod_id, SUM(capital_expenditure) AS capital_expenditure,  
				  STRING_AGG( case when source_of_funding = 'PPP_SPV' then 'PPP/SPV' else source_of_funding end, ', ') AS source_of_funding,
				  SUM(one_year) AS one_year,
				  SUM(three_year) AS three_year,
				  SUM(three_five_year) AS three_five_year,
				  SUM(greater_five_year) AS greater_five_year,
				  SUM(fund_spend) AS fund_spend
				  FROM [tbl_ovod_finance]     
				  GROUP BY ovod_id ) 
				FINANCE ON tbl_one_vision_doc.id = FINANCE.ovod_id
            ${whereCatgeoryCondition}
            )
            select
            id,b1_code,[Goal (B1)],b2_code,[Intervention (B2)],
            b3_code,[Action (B3)],Category,Wing,ia_name,mImpCode,Priority,Vibhas,[Part of MIV],[Part of MAKV],[Part of SGOS],[Target Date],[Expected Date],
            Progress,[Reason For Delay],[Last Updated Date],[Total Cost],[Capital Expenditure],[Fund Spend],[Source of Funding],
			[One Year],[Three Years],[Three - Five Years],[ > 5 Years], [Current Status]
            from cte  
			order by Vibhas, cast(b1order as int),cast(b2order as int), cast(b3order as int)
        `);
        }

        const rawData = result.recordset;

        if (rawData.length === 0) {
            return res.status(404).json({ error: 'No data available for this selection' });
        }

        let rowData;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id === 8) {
            rowData = rawData.map(item => {
                return {
                    orgHierarchy: [
                        item['Goal (A1)'],
                        item['Intervention (A2)'],
                        item['Action (A3)'],
                        item['Goal (B1)'],
                        item['Intervention (B2)'],
                        item['Action (B3)']
                    ],
                    Id:item['id'],
                    orgCode:item['mImpCode'],
                    jobTitle: item['Category'],
                    employmentType: item['Priority'],
                    wing: item['Wing'],
                    progress: item['Progress'],
                    Vibhas: item['Vibhas'],
                    TargetDate: item['Target Date'],
                    currentStatus: item['Current Status'],
                    totalCost: item['Total Cost'],
                    capitalExpenditure: item['Capital Expenditure'],
                    fundSpend: item['Fund Spend'],
                    sourceOfFunding: item['Source of Funding'],
			        oneYear: item['One Year'],
                    threeYears: item['Three Years'],
                    bet35Year: item['Three - Five Years'],
                    great5Year: item[' > 5 Years']
                };
            });
        } else {
            rowData = rawData.map(item => {
                return {
                    orgHierarchy: [
                        item['Goal (B1)'],
                        item['Intervention (B2)'],
                        item['Action (B3)']
                    ],
                    Id:item['id'],
                    orgCode:item['mImpCode'],
                    jobTitle: item['Category'],
                    employmentType: item['Priority'],
                    wing: item['Wing'],
                    progress: item['Progress'],
                    Vibhas: item['Vibhas'],
                    TargetDate: item['Target Date'],
                    currentStatus: item['Current Status'],
                    totalCost: item['Total Cost'],
                    capitalExpenditure: item['Capital Expenditure'],
                    fundSpend: item['Fund Spend'],
                    sourceOfFunding: item['Source of Funding'],
			        oneYear: item['One Year'],
                    threeYears: item['Three Years'],
                    bet35Year: item['Three - Five Years'],
                    great5Year: item[' > 5 Years']
                };
            });
        }
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        res.json({ rowData });

    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

// Get data for Update
async function getUpdateOVD(req, res) {
    const conn = await pool;
    const request = conn.request();

    const ID = req.params.ID;
    request.input("ID", ID);
    try {
        const result = await request.query(`SELECT * FROM tbl_one_vision_doc WHERE tbl_one_vision_doc.id = @ID;`);

        const financeResult = await request.query(`SELECT * FROM tbl_ovod_finance WHERE tbl_ovod_finance.ovod_id = @ID;`);
        
        const progressLogResult = await request.query(`SELECT * FROM tbl_ovod_progress_log WHERE ovod_id = @ID ORDER BY id ASC;`);
        let finalProgressLogs = progressLogResult.recordset;

        if (finalProgressLogs.length === 0) {
            const oldLogsResult = await request.query(`SELECT * FROM tbl_ovd_percentage_log WHERE ovd_id = @ID ORDER BY id ASC;`);
            finalProgressLogs = oldLogsResult.recordset.map(log => {
                let progressDate = "";
                if (log.updated_date) {
                    try {
                        const dateObj = new Date(log.updated_date);
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = String(dateObj.getFullYear()).slice(-2);
                        progressDate = `${month}-${year}`;
                    } catch (e) {
                        progressDate = "";
                    }
                }
                return {
                    id: log.id,
                    ovod_id: log.ovd_id,
                    physical_progress: log.completed_percentage,
                    financial_progress: 0,
                    progress_date: progressDate
                };
            });
        }

        const combinedResult = {
            result: result.recordset,
            financeResult: financeResult.recordset,
            progressLogResult: finalProgressLogs
        };

        res.json(combinedResult);
        
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

// Ministry Dashboard
async function getMinistryOVDChart(req, res) {
    const conn = await pool;
    const request = conn.request();

    const wingID = parseInt(req.params.wingID);
    const orgID = parseInt(req.params.orgID);
    const vision = parseInt(req.params.vision);
    const vibhasID = parseInt(req.params.vibhasID);
    const priority = parseInt(req.params.priority);
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
    request.input("mivChapterSelect", mivChapterSelect);  
    request.input("makvThemeSelect", makvThemeSelect);    
    
    let whereClause = [];
    if (wingID !== 0) whereClause.push("d.wings = @wingID");
    if (orgID !== 0) whereClause.push("d.imp_agency = @orgID");
    if (priority !== 0) whereClause.push("d.priority = @priority");
    if (vibhasID !== 0) whereClause.push("d.vibhas = @vibhasID");
    if (mivChapterSelect !== 0) whereClause.push("d.miv_chapter = @mivChapterSelect");
    if (makvThemeSelect !== 0) whereClause.push("d.makv_theme = @makvThemeSelect");

    if (vision !== 0) {
        switch (vision) {
            case 1:
                whereClause.push("d.is_miv = 1");
                break;
            case 2:
                whereClause.push("d.is_makv = 1");
                break;
            case 3:
                whereClause.push("d.is_sgos = 1");
                break;
            case 4:
                whereClause.push("d.is_additional_item = 1");
                break;
        }
    }
    const whereTotalCondition = whereClause.length > 0 ? ' WHERE d.delete_status = 0 AND ' + whereClause.join(' AND ') : ' WHERE d.delete_status = 0';
    const whereProgressCondition = whereClause.length > 0 ? ' WHERE d.delete_status = 0 AND ' + whereClause.join(' AND ') : ' WHERE d.delete_status = 0';
    

    try {
        const totalOVDResult = await request.query(`SELECT 
                COUNT(DISTINCT a1.a1_code) AS goals,
                COUNT(DISTINCT a2.a2_code) AS intervention,
                COUNT(DISTINCT a3.a3_code) AS action,
                ISNULL(SUM(d.total_cost), 0) AS total_cost
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
            LEFT JOIN 
                [sagarmanthan_revamp].[dbo].[mmt_a3] a3 ON d.action_a3 = a3.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_a2] a2 ON d.intervention_a2 = a2.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_a1] a1 ON d.goal_a1 = a1.id
            ${whereTotalCondition};
        `);

        const progressResult = await request.query(`
        WITH Progress_Calculation AS (
            SELECT DISTINCT
                d.intervention_a2,
                d.category,
                SUM(ISNULL(d.progress, 0)) AS total_progress,
                COUNT(*) AS progress_count
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
            ${whereProgressCondition}
            GROUP BY 
                d.intervention_a2, d.category
        ),
        Progress_Percentage AS (
            SELECT 
                intervention_a2,
                category,
                CASE 
                    WHEN progress_count = 0 THEN 0
                    ELSE (total_progress / progress_count)
                END AS avg_progress_percentage
            FROM 
                Progress_Calculation
        ),
        Progress_Groups AS (
            SELECT
                category,
                COUNT(CASE WHEN avg_progress_percentage >= 0 AND avg_progress_percentage < 20 THEN 1 END) AS [0_19],
                COUNT(CASE WHEN avg_progress_percentage >= 20 AND avg_progress_percentage < 40 THEN 1 END) AS [20_39],
                COUNT(CASE WHEN avg_progress_percentage >= 40 AND avg_progress_percentage < 60 THEN 1 END) AS [40_59],
                COUNT(CASE WHEN avg_progress_percentage >= 60 AND avg_progress_percentage < 80 THEN 1 END) AS [60_79],
                COUNT(CASE WHEN avg_progress_percentage >= 80 AND avg_progress_percentage < 100 THEN 1 END) AS [80_99],
                COUNT(CASE WHEN avg_progress_percentage = 100 THEN 1 END) AS [100]
            FROM
                Progress_Percentage
            GROUP BY
                category
        ),
        Category_Interventions AS (
            SELECT 
                d.category,
                COUNT(DISTINCT d.intervention_a2) AS intervention_count
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
            ${whereProgressCondition}
            GROUP BY 
                d.category
        ),
        Category_Aggregate AS (
            SELECT 
                mc.category,
                ISNULL(ci.intervention_count, 0) AS intervention_count,
                ISNULL(pg.[0_19], 0) AS [0_19],
                ISNULL(pg.[20_39], 0) AS [20_39],
                ISNULL(pg.[40_59], 0) AS [40_59],
                ISNULL(pg.[60_79], 0) AS [60_79],
                ISNULL(pg.[80_99], 0) AS [80_99],
                ISNULL(pg.[100], 0) AS [100]
            FROM 
                mmt_ovd_category mc
                LEFT JOIN Category_Interventions ci ON ci.category = mc.id
                LEFT JOIN Progress_Groups pg ON pg.category = mc.id
            GROUP BY 
                mc.category, ci.intervention_count, pg.[0_19], pg.[20_39], pg.[40_59], pg.[60_79], pg.[80_99], pg.[100]
        )
        SELECT 
            category,
            intervention_count,
            [0_19],
            [20_39],
            [40_59],
            [60_79],
            [80_99],
            [100]
        FROM 
            Category_Aggregate
        ORDER BY 
            category;
        `);

        const combinedResult = {
            total: totalOVDResult.recordset,
            categories: progressResult.recordset,
        };

        res.json(combinedResult);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Organisation Dashboard
async function getOrganisationOVDChart(req, res) {
    const conn = await pool;
    const request = conn.request();

    const userID = req.params.userID;
    request.input("userID", userID);

    const userOrg = await request.query(`SELECT organisation_id FROM tbl_user WHERE user_id = @userID`);
    const idOrg = userOrg.recordset[0].organisation_id;
    request.input("idOrg", idOrg);
    const orgCodeGet = await request.query(`SELECT organisation_code FROM mmt_organisation WHERE organisation_id = @idOrg`);
    const orgCode = orgCodeGet.recordset[0].organisation_code;
    request.input("orgCode", orgCode);
    const orgMainId = await request.query(`SELECT ia_id FROM mmt_implementing_agency WHERE ia_code = @orgCode`);
    const orgID = orgMainId.recordset[0].ia_id;    
    const vision = parseInt(req.params.vision);
    const vibhasID = parseInt(req.params.vibhasID);
    const priority = parseInt(req.params.priority);
    let mivChapterSelect = req.params.mivChapterSelect;
    let makvThemeSelect = req.params.makvThemeSelect;

    request.input("orgID", orgID);

    if (mivChapterSelect === "0") {
        mivChapterSelect = 0;
    }

    if (makvThemeSelect === "0") {
        makvThemeSelect = 0;
    }

    request.input("vision", vision);
    request.input("vibhasID", vibhasID);
    request.input("priority", priority);
    request.input("mivChapterSelect", mivChapterSelect);    
    request.input("makvThemeSelect", makvThemeSelect);    

    let whereClause = [];
    if (priority !== 0) whereClause.push("d.priority = @priority");
    if (vibhasID !== 0) whereClause.push("d.vibhas = @vibhasID");
    if (mivChapterSelect !== 0) whereClause.push("d.miv_chapter = @mivChapterSelect");
    if (makvThemeSelect !== 0) whereClause.push("d.makv_theme = @makvThemeSelect");

    if (vision !== 0) {
        switch (vision) {
            case 1:
                whereClause.push("d.is_miv = 1");
                break;
            case 2:
                whereClause.push("d.is_makv = 1");
                break;
            case 3:
                whereClause.push("d.is_sgos = 1");
                break;
            case 4:
                whereClause.push("d.is_additional_item = 1");
                break;
                
        }
    }
    const whereTotalCondition = whereClause.length > 0 ? ' AND d.delete_status = 0 AND ' + whereClause.join(' AND ') : ' AND d.delete_status = 0';
    // const whereCatgeoryCondition = whereClause.length > 0 ?  ' AND ' + whereClause.join(' AND ') : 'WHERE d.delete_status = 0';
    const whereProgressCondition = whereClause.length > 0 ? ' AND d.delete_status = 0 AND ' + whereClause.join(' AND ') : ' AND d.delete_status = 0';

    try {
        const totalOVDResult = await request.query(`SELECT 
            COUNT(DISTINCT b1.b1_code) AS goals,
            COUNT(DISTINCT b2.b2_code) AS intervention,
            COUNT(DISTINCT b3.b3_code) AS action,
            ISNULL(SUM(d.total_cost), 0) AS total_cost
        FROM 
            tbl_one_vision_doc d
        LEFT JOIN 
            [sagarmanthan_revamp].[dbo].[mmt_b3] b3 ON d.action_b3 = b3.id
        LEFT JOIN  
            [sagarmanthan_revamp].[dbo].[mmt_b2_b3] b2 ON d.intervention_b2 = b2.id
        LEFT JOIN  
            [sagarmanthan_revamp].[dbo].[mmt_b1] b1 ON d.goal_b1 = b1.id
        WHERE 
            (d.goal_b1 IS NOT NULL OR d.intervention_b2 IS NOT NULL)
            AND d.imp_agency = @orgID
            ${whereTotalCondition}
        `);        

        const progressResult = await request.query(`
           WITH Progress_Calculation AS (
                SELECT 
                    d.intervention_b2,
                    d.category,
                    SUM(ISNULL(d.progress, 0)) AS total_progress,
                    COUNT(*) AS progress_count
                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
                LEFT JOIN
                    [sagarmanthan_revamp].[dbo].[mmt_b2_b3] b2 ON d.intervention_b2 = b2.id
                WHERE 
                    (d.goal_b1 IS NOT NULL OR d.intervention_b2 IS NOT NULL) 
                    AND d.imp_agency = @orgID 
                    ${whereProgressCondition}
                GROUP BY 
                    d.intervention_b2, d.category
            ),
            Progress_Percentage AS (
                SELECT 
                    intervention_b2,
                    category,
                    CASE 
                        WHEN progress_count = 0 THEN 0
                        ELSE (total_progress / progress_count)
                    END AS avg_progress_percentage
                FROM 
                    Progress_Calculation
            ),
            Progress_Groups AS (
                SELECT
                    category,
                    COUNT(CASE WHEN avg_progress_percentage >= 0 AND avg_progress_percentage < 20 THEN 1 END) AS [0_19],
                    COUNT(CASE WHEN avg_progress_percentage >= 20 AND avg_progress_percentage < 40 THEN 1 END) AS [20_39],
                    COUNT(CASE WHEN avg_progress_percentage >= 40 AND avg_progress_percentage < 60 THEN 1 END) AS [40_59],
                    COUNT(CASE WHEN avg_progress_percentage >= 60 AND avg_progress_percentage < 80 THEN 1 END) AS [60_79],
                    COUNT(CASE WHEN avg_progress_percentage >= 80 AND avg_progress_percentage <= 100 THEN 1 END) AS [80_99],
                    COUNT(CASE WHEN avg_progress_percentage = 100 THEN 1 END) AS [100]
                FROM
                    Progress_Percentage
                GROUP BY
                    category
            ),
            Category_Interventions AS (
                SELECT 
                    d.category,
                    COUNT(DISTINCT b2.b2_code) AS intervention_count
                FROM 
                    [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
                LEFT JOIN
                    [sagarmanthan_revamp].[dbo].[mmt_b2_b3] b2 ON d.intervention_b2 = b2.id
                WHERE 
                    (d.goal_b1 IS NOT NULL OR d.intervention_b2 IS NOT NULL) 
                    AND d.imp_agency = @orgID 
                    ${whereProgressCondition}
                GROUP BY 
                    d.category
            ),
            Category_Aggregate AS (
                SELECT 
                    mc.category,
                    ISNULL(ci.intervention_count, 0) AS intervention_count,
                    ISNULL(pg.[0_19], 0) AS [0_19],
                    ISNULL(pg.[20_39], 0) AS [20_39],
                    ISNULL(pg.[40_59], 0) AS [40_59],
                    ISNULL(pg.[60_79], 0) AS [60_79],
                    ISNULL(pg.[80_99], 0) AS [80_99],
                    ISNULL(pg.[100], 0) AS [100]
                FROM 
                    mmt_ovd_category mc
                LEFT JOIN Category_Interventions ci ON ci.category = mc.id
                LEFT JOIN Progress_Groups pg ON pg.category = mc.id
                GROUP BY 
                    mc.category, ci.intervention_count, pg.[0_19], pg.[20_39], pg.[40_59], pg.[60_79], pg.[80_99], pg.[100]
            )
            SELECT 
                category,
                intervention_count,
                [0_19],
                [20_39],
                [40_59],
                [60_79],
                [80_99],
                [100]
            FROM 
                Category_Aggregate
            ORDER BY 
                category;
        `);

        const combinedResult = {
            total: totalOVDResult.recordset,
            categories: progressResult.recordset
        };

        res.json(combinedResult);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function createOVDData(req, res) {
    try {
        // const {
        //     goalA1, interventionA2, goalB1, interventionB2, financialProgress,
        //     actionB3, actionableA3, category,implementingAgency, statusCurrent,
        //     wings, priority, ViBhas, partOfMIV2030, totalCost,
        //     partOfMAKV2047, partOfSGoS2,completedPercentage,Delay,
        //     directEmpGen, inDirectEmpGen, 
        //     directInvCreated, inDirectInvCreated, outcomes, OutcomesRemarks,
        //     Response, Feedback, userID
        // } = req.body;

        const {
            goalA1, a2Intervention, goalB1, interventionB2, actionB3, b3ActionCode,
            actionableA3, a3ActionsCode, category, implementingAgency, wings, priority, ViBhas,
            partOfMIV2030, partOfMAKV2047, partOfSGoS2, partOfGMIS, partOfAddItem, party1, party2,
            mivChapterSelect, makvThemeSelect, Remarks, userID, type
        } = req.body;

        let actualDate = req.body.actualDate;
        let completionDate = req.body.completionDate;

        if(actualDate == ""|| !actualDate){
            actualDate = null;
        }

        if(completionDate == "" || !completionDate){
            completionDate = null;
        }

        const conn = await pool;
        const request = conn.request();

        request.input('goalA1', goalA1);
        request.input('a2Intervention', a2Intervention);
        request.input('goalB1', goalB1);
        request.input('interventionB2', interventionB2);
        request.input('actionB3', actionB3);
        request.input('b3ActionCode',b3ActionCode);
        request.input('actionableA3', actionableA3);
        request.input('a3ActionsCode', a3ActionsCode);
        request.input('category', category);      
        request.input('implementingAgency', implementingAgency);
        request.input('wings', wings);
        request.input('priority', priority);
        request.input('ViBhas', ViBhas);
        request.input('mivChapterSelect', mivChapterSelect);
        request.input('makvThemeSelect', makvThemeSelect);
        request.input('partOfMIV2030', partOfMIV2030);
        request.input('partOfMAKV2047', partOfMAKV2047);
        request.input('partOfSGoS2', partOfSGoS2);
        request.input('partOfGMIS', partOfGMIS);
        request.input('partOfAddItem', partOfAddItem);
        request.input('party1', party1);
        request.input('party2', party2);
        request.input('Remarks', Remarks);
        request.input('completionDate', completionDate);
        request.input('actualDate', actualDate);
        request.input('userID', userID);

        // request.input('statusCurrent', statusCurrent);
        // request.input('completedPercentage', completedPercentage);
        // request.input('Delay', Delay);
        // request.input('financialProgress', financialProgress);
        // request.input('totalCost', totalCost);
        // request.input('Response', Response);

        // await request.query(`
        //     INSERT INTO tbl_one_vision_doc (
        //         goal_a1, intervention_a2, goal_b1, intervention_b2, action_b3, action_a3, current_status, reason_drop,
        //         category, total_cost, wings, priority, vibhas, is_miv, is_makv, is_sgos, progress, reason_delay, 
        //         target_date, expected_date, imp_agency, outcomes, direct_Emp_Gen, inDirect_Emp_Gen, financial_progress,
        //         direct_Inv_Created, inDirect_Inv_Created, Outcomes_Remarks, Feedback, Response, created_by
        //     ) VALUES (
        //         @goalA1, @a2Intervention, @goalB1, @interventionB2, @actionB3, @actionableA3, @statusCurrent, @reasonsForDrop,
        //         @category, @totalCost, @wings, @priority, @ViBhas, @partOfMIV2030, @partOfMAKV2047, @partOfSGoS2, @completedPercentage, @Delay, 
        //         @completionDate, @actualDate, @implementingAgency, @outcomes, @directEmpGen, @inDirectEmpGen, @financialProgress,
        //         @directInvCreated, @inDirectInvCreated, @OutcomesRemarks, @Feedback, @Response, @userID
        //     )
        // `);

        let actionableA3ID = null;
        let actionB3ID = null;

        if(type == 'A3'){

            const A2Data = await request.query(`SELECT a2_code FROM mmt_a2 WHERE id = @a2Intervention`);

            const a2Code = A2Data.recordset[0].a2_code;

            request.input("a2Code", a2Code);

            await request.query(`
                INSERT INTO mmt_a3 (
                    a3_code,action_name,imp_agency,wings,category,miv_chapter,makv_theme,part_of_miv,
                    part_of_akv,part_of_sgos,part_of_gmis,is_additional_item,priority,
                    vibhas,target_date,expected_actual_date,a2_code,primary_id_of_a2
                ) VALUES (
                    @a3ActionsCode, @actionableA3, @implementingAgency, @wings, @category, @mivChapterSelect, @makvThemeSelect,  
                    @partOfMIV2030, @partOfMAKV2047, @partOfSGoS2, @partOfGMIS, @partOfAddItem, @priority, @ViBhas,
                    @completionDate, @actualDate,@a2Code,@a2Intervention
                )
            `);

            const lastRecord = await conn.query(`SELECT TOP 1 id
            FROM mmt_a3 ORDER BY id DESC`);

            actionableA3ID = lastRecord.recordset[0].id;
        } else {

            const B2Data = await request.query(`SELECT b2_code
                FROM mmt_b2_b3 WHERE id = @interventionB2`);

            const b2Code = B2Data.recordset[0].b2_code;

            request.input("b2Code", b2Code);

            await request.query(`
                INSERT INTO mmt_b3 (
                    b3_code,b3_actions,imp_agency,wings,category,miv_chapter,makv_theme,part_of_miv,part_of_akv,
                    part_of_gmis,part_of_sgos,is_additional_item,priority,vibhas,target_date,expected_actual_date,
                    b2_code,b2_id,party_1,party_2,remarks
                ) VALUES (
                    @b3ActionCode, @actionB3, @implementingAgency, @wings, @category, @mivChapterSelect, @makvThemeSelect,  
                    @partOfMIV2030, @partOfMAKV2047, @partOfGMIS, @partOfSGoS2, @partOfAddItem, @priority, @ViBhas,@completionDate, @actualDate,  
                    @b2Code,@interventionB2,@party1, @party2, @Remarks
                )
            `);

            const lastRecord = await conn.query(`SELECT TOP 1 id
            FROM mmt_b3 ORDER BY id DESC`);

            actionB3ID = lastRecord.recordset[0].id;
        }

        request.input('actionableA3ID', actionableA3ID);
        request.input('actionB3ID', actionB3ID);

        await request.query(`
            INSERT INTO tbl_one_vision_doc (
                goal_a1, intervention_a2, goal_b1, intervention_b2, action_b3, action_a3,
                category, wings, priority, vibhas, is_miv, is_makv, is_sgos, is_additional_item, is_gmis,
                miv_chapter, makv_theme, target_date, expected_date, imp_agency, party_1, party_2,
                Response, created_by
            ) VALUES (
                @goalA1, @a2Intervention, @goalB1, @interventionB2, @actionB3ID, @actionableA3ID, 
                @category, @wings, @priority, @ViBhas, @partOfMIV2030, @partOfMAKV2047, @partOfSGoS2, @partOfAddItem, @partOfGMIS,
                @mivChapterSelect, @makvThemeSelect, @completionDate, @actualDate, @implementingAgency, @party1, @party2,
                @Remarks, @userID
            )
        `);

        // const lastRecord = await conn.query(`SELECT TOP 1 id
        //     FROM tbl_one_vision_doc ORDER BY id DESC`);

        // const ID = lastRecord.recordset[0].id;

        // request.input("ID", ID);
        // await request.query(`
        //     INSERT INTO tbl_ovd_percentage_log (ovd_id,completed_percentage,updated_date) VALUES (@ID,@completedPercentage,getdate());
        // `);

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function createOVDL2Data(req, res) {
    try {
        // const {
        //     goalA1, interventionA2, goalB1, interventionB2, financialProgress,
        //     actionB3, actionableA3, category,implementingAgency, statusCurrent,
        //     wings, priority, ViBhas, partOfMIV2030, totalCost,
        //     partOfMAKV2047, partOfSGoS2,completedPercentage,Delay,
        //     directEmpGen, inDirectEmpGen, 
        //     directInvCreated, inDirectInvCreated, outcomes, OutcomesRemarks,
        //     Response, Feedback, userID
        // } = req.body;

        const {
            goalA1, a2Intervention, goalB1, interventionB2, interventionB2Code, actionB3,
            category, implementingAgency, wings, priority, ViBhas,
            partOfMIV2030, partOfMAKV2047, partOfSGoS2, partOfGMIS, partOfAddItem, party1, party2,
            mivChapterSelect, makvThemeSelect, Remarks, userID
        } = req.body;

        let actualDate = req.body.actualDate;
        let completionDate = req.body.completionDate;

        if(actualDate == ""|| !actualDate){
            actualDate = null;
        }

        if(completionDate == "" || !completionDate){
            completionDate = null;
        }

        const conn = await pool;
        const request = conn.request();

        request.input('goalA1', goalA1);
        request.input('a2Intervention', a2Intervention);
        request.input('goalB1', goalB1);
        request.input('interventionB2', interventionB2);
        request.input('interventionB2Code', interventionB2Code);
        

        const B1Data = await request.query(`SELECT b1_code FROM mmt_b1 WHERE id = @goalB1`);
        const b1Code = B1Data.recordset[0].b1_code;
        request.input("b1Code", b1Code);

        await request.query(`
            INSERT INTO mmt_b2_b3 (b2_code,intervention,primary_id_of_b1,b1_code) VALUES (@interventionB2Code,@interventionB2,@goalB1,@b1Code);
        `);

        const B2Data = await conn.query(`SELECT TOP(1) * FROM mmt_b2_b3 ORDER BY id DESC;`);

        const b2Code = B2Data.recordset[0].b2_code;
        const b2Id = B2Data.recordset[0].id;

        if (actionB3 && actionB3.length > 0) {

            for (const row of actionB3) {
                let actionRequest = conn.request();
                let actionableA3ID = null;
                let actionB3ID = null; 
                let actionCode = row.actionCode;
                let actionDes = row.actionDes;

                actionRequest.input('goalA1', goalA1);
                actionRequest.input('a2Intervention', a2Intervention);
                actionRequest.input('actionableA3ID', actionableA3ID);
                actionRequest.input('goalB1', goalB1);
                actionRequest.input("b2Code", b2Code);
                actionRequest.input("b2Id", b2Id);
                actionRequest.input("actionCode",actionCode);
                actionRequest.input("actionDes",actionDes);
                actionRequest.input('category', category);      
                actionRequest.input('implementingAgency', implementingAgency);
                actionRequest.input('wings', wings);
                actionRequest.input('priority', priority);
                actionRequest.input('ViBhas', ViBhas);
                actionRequest.input('mivChapterSelect', mivChapterSelect);
                actionRequest.input('makvThemeSelect', makvThemeSelect);
                actionRequest.input('partOfMIV2030', partOfMIV2030);
                actionRequest.input('partOfMAKV2047', partOfMAKV2047);
                actionRequest.input('partOfSGoS2', partOfSGoS2);
                actionRequest.input('partOfGMIS', partOfGMIS);
                actionRequest.input('partOfAddItem', partOfAddItem);
                actionRequest.input('party1', party1);
                actionRequest.input('party2', party2);
                actionRequest.input('Remarks', Remarks);
                actionRequest.input('completionDate', completionDate);
                actionRequest.input('actualDate', actualDate);
                actionRequest.input('userID', userID);

                await actionRequest.query(`
                    INSERT INTO mmt_b3 (
                        b3_code,b3_actions,imp_agency,wings,category,miv_chapter,makv_theme,part_of_miv,part_of_akv,
                        part_of_gmis,part_of_sgos,is_additional_item,priority,vibhas,target_date,expected_actual_date,
                        b2_code,b2_id,party_1,party_2,remarks
                    ) VALUES (
                        @actionCode, @actionDes, @implementingAgency, @wings, @category, @mivChapterSelect, @makvThemeSelect,  
                        @partOfMIV2030, @partOfMAKV2047, @partOfGMIS, @partOfSGoS2, @partOfAddItem, @priority, @ViBhas,@completionDate, @actualDate,  
                        @b2Code,@b2Id,@party1, @party2, @Remarks
                    )
                `);

                const lastRecord = await conn.query(`SELECT TOP 1 id FROM mmt_b3 ORDER BY id DESC`);
            
                actionB3ID = lastRecord.recordset[0].id;
                actionRequest.input('actionB3ID', actionB3ID);

        
                await actionRequest.query(`
                    INSERT INTO tbl_one_vision_doc (
                        goal_a1, intervention_a2, goal_b1, intervention_b2, action_b3, action_a3,
                        category, wings, priority, vibhas, is_miv, is_makv, is_sgos, is_additional_item, is_gmis,
                        miv_chapter, makv_theme, target_date, expected_date, imp_agency, party_1, party_2,
                        Response, created_by
                    ) VALUES (
                        @goalA1, @a2Intervention, @goalB1, @b2Id, @actionB3ID, @actionableA3ID, 
                        @category, @wings, @priority, @ViBhas, @partOfMIV2030, @partOfMAKV2047, @partOfSGoS2, @partOfAddItem, @partOfGMIS,
                        @mivChapterSelect, @makvThemeSelect, @completionDate, @actualDate, @implementingAgency, @party1, @party2,
                        @Remarks, @userID
                    )
                `);
            }
            
        }

        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function updateOVDData(req, res) {
    try {
        const {
            // partOfMIV2030, partOfMAKV2047, partOfSGoS2,
            completedPercentage,
            directEmpGen, inDirectEmpGen, directInvCreated, inDirectInvCreated,financialProgress,percentageMile,
            statusCurrent, outcomes, OutcomesRemarks, Response, Feedback, userID, ID
        } = req.body;

        let actualDate = req.body.actualDate;
        let completionDate = req.body.completionDate;
        let Delay = req.body.Delay;
        let reasonsForDrop = req.body.reasonsForDrop;
        let totalCost = req.body.totalCost;
        let ovodFinanceData =  req.body.ovodFinanceData;
        let ovodProgressLogData = req.body.ovodProgressLogData;

        if(!totalCost || totalCost ==''){
            totalCost = null;
        }

        // let {
        //     activity0PlannedDate,activity0ActualDate,
        //     activity1PlannedDate,activity1ActualDate,
        //     activity2PlannedDate,activity2ActualDate,
        //     activity3PlannedDate,activity3ActualDate,
        //     activity4PlannedDate,activity4ActualDate,
        //     activity5PlannedDate,activity5ActualDate,
        // }  = req.body;

        // if(!activity0PlannedDate || activity0PlannedDate==""){
        //     activity0PlannedDate = null;
        // }
        // if(!activity0ActualDate || activity0ActualDate==""){
        //     activity0ActualDate = null;
        // }
        // if(!activity1PlannedDate || activity1PlannedDate==""){
        //     activity1PlannedDate = null;
        // }
        // if(!activity1ActualDate || activity1ActualDate==""){
        //     activity1ActualDate = null;
        // }
        // if(!activity2PlannedDate || activity2PlannedDate==""){
        //     activity2PlannedDate = null;
        // }
        // if(!activity2ActualDate || activity2ActualDate==""){
        //     activity2ActualDate = null;
        // }
        // if(!activity3PlannedDate || activity3PlannedDate==""){
        //     activity3PlannedDate = null;
        // }
        // if(!activity3ActualDate || activity3ActualDate==""){
        //     activity3ActualDate = null;
        // }
        // if(!activity4PlannedDate || activity4PlannedDate==""){
        //     activity4PlannedDate = null;
        // }
        // if(!activity4ActualDate || activity4ActualDate==""){
        //     activity4ActualDate = null;
        // }
        // if(!activity5PlannedDate || activity5PlannedDate==""){
        //     activity5PlannedDate = null;
        // }
        // if(!activity5ActualDate || activity5ActualDate==""){
        //     activity5ActualDate = null;
        // }

        if(!Delay || Delay==""){
            Delay = null;
        }

        if(!reasonsForDrop || reasonsForDrop==""){
            reasonsForDrop = null;
        }


        if(actualDate == ""|| !actualDate){
            actualDate = null;
        }

        if(completionDate == "" || !completionDate){
            completionDate = null;
        }

        const conn = await pool;
        const request = conn.request();

        request.input('ID', ID);
        // request.input('partOfMIV2030', partOfMIV2030);
        request.input('completedPercentage', completedPercentage);
        // request.input('partOfMAKV2047', partOfMAKV2047);
        // request.input('partOfSGoS2', partOfSGoS2);
        request.input('totalCost', totalCost);
        request.input('statusCurrent', statusCurrent);
        request.input('percentageMile', percentageMile);

        request.input('Delay', Delay);
        request.input('actualDate', actualDate);
        request.input('completionDate', completionDate);

        request.input('directEmpGen', directEmpGen);
        request.input('inDirectEmpGen', inDirectEmpGen);
        request.input('directInvCreated', directInvCreated);
        request.input('inDirectInvCreated', inDirectInvCreated);
        request.input('outcomes', outcomes);
        request.input('OutcomesRemarks', OutcomesRemarks);
        request.input('Response', Response);
        request.input('Feedback', Feedback);
        request.input('financialProgress', financialProgress);
        // request.input('activity0PlannedDate',activity0PlannedDate);
        // request.input('activity0ActualDate',activity0ActualDate);
        // request.input('activity1PlannedDate',activity1PlannedDate);
        // request.input('activity1ActualDate',activity1ActualDate);
        // request.input('activity2PlannedDate',activity2PlannedDate);
        // request.input('activity2ActualDate',activity2ActualDate);
        // request.input('activity3PlannedDate',activity3PlannedDate);
        // request.input('activity3ActualDate',activity3ActualDate);
        // request.input('activity4PlannedDate',activity4PlannedDate);
        // request.input('activity4ActualDate',activity4ActualDate);
        // request.input('activity5PlannedDate',activity5PlannedDate);
        // request.input('activity5ActualDate',activity5ActualDate);
        request.input('reasonsForDrop', reasonsForDrop);
        request.input('userID', userID);

        await request.query(`
            UPDATE tbl_one_vision_doc
            SET  
                expected_date = @actualDate,current_status = @statusCurrent,target_date = @completionDate,
                reason_delay = @Delay, reason_drop = @reasonsForDrop,
                direct_Emp_Gen = @directEmpGen, inDirect_Emp_Gen = @inDirectEmpGen,
                direct_Inv_Created = @directInvCreated, inDirect_Inv_Created = @inDirectInvCreated,
                mile_percentage = @percentageMile, progress = @completedPercentage, 
                --activity0_planned_date= @activity0PlannedDate,activity0_actual_date = @activity0ActualDate,
                --activity1_planned_date= @activity1PlannedDate,activity1_actual_date = @activity1ActualDate,
                --activity2_planned_date= @activity2PlannedDate,activity2_actual_date = @activity2ActualDate,
                --activity3_planned_date= @activity3PlannedDate,activity3_actual_date = @activity3ActualDate,
                --activity4_planned_date= @activity4PlannedDate,activity4_actual_date = @activity4ActualDate,
                --activity5_planned_date= @activity5PlannedDate,activity5_actual_date = @activity5ActualDate,
                outcomes = @outcomes, Outcomes_Remarks = @OutcomesRemarks, total_cost = @totalCost, financial_progress = @financialProgress,
                Response = @Response, Feedback = @Feedback, updated_by = @userID, updated_date = getdate()
            WHERE id = @ID
        `);

        const checkProgress = await request.query(`
            Select id,completed_percentage from tbl_ovd_percentage_log WHERE ovd_id = @ID;
        `);

        const checkProgressCompletion = checkProgress.length;
        const existingRecords = checkProgress.recordset;

        if(!checkProgressCompletion){
            
            const matchingRecord = existingRecords.find(record => record.completed_percentage === completedPercentage);

            if (!matchingRecord) {
                // await request
                //     .input('IDOVD', matchingRecord.id)
                //     .query(`
                //         UPDATE tbl_ovd_percentage_log 
                //         SET updated_date = GETDATE() 
                //         WHERE id = @IDOVD;
                //     `);
                await request.query(`
                    INSERT INTO tbl_ovd_percentage_log (ovd_id,completed_percentage,updated_date) VALUES (@ID,@completedPercentage,getdate());
                `);
            } 
            // else {
            //     await request.query(`
            //         INSERT INTO tbl_ovd_percentage_log (ovd_id,completed_percentage,updated_date) VALUES (@ID,@completedPercentage,getdate());
            //     `);
            // }

        } else {
            await request.query(`
                INSERT INTO tbl_ovd_percentage_log (ovd_id,completed_percentage,updated_date) VALUES (@ID,@completedPercentage,getdate());
            `);
        }

        if (ovodFinanceData && ovodFinanceData.length > 0) {
            const checkFinance = await conn.request()
                .input("ID", ID)
                .query(`
                    SELECT COUNT(*) AS totalNumber FROM [tbl_ovod_finance] WHERE ovod_id = @ID;
                `);

            const number = checkFinance.recordset[0].totalNumber;

            if (number > 0) {
                await conn.request()
                    .input("ID", ID)
                    .query(`
                        DELETE FROM [tbl_ovod_finance] WHERE ovod_id = @ID;
                    `);
            }

            for (const row of ovodFinanceData) {
                if (
                    !row.capExpenditure &&
                    !row.sourceOfFund &&
                    !row.fundSpend &&
                    !row.oneYear &&
                    !row.threeYear &&
                    !row.threeFiveYear &&
                    !row.greaterFive &&
                    !row.detailedBreakUp
                ) {
                    continue;
                }
            
                await conn.request()
                    .input("ID", ID)
                    .input("capExpenditure", row.capExpenditure || null) 
                    .input("sourceOfFund", row.sourceOfFund || null)
                    .input("fundSpend", row.fundSpend || null)
                    .input("oneYear", row.oneYear || null)
                    .input("threeYear", row.threeYear || null)
                    .input("threeFiveYear", row.threeFiveYear || null)
                    .input("greaterFive", row.greaterFive || null)
                    .input("detailedBreakUp", row.detailedBreakUp || null)
                    .query(`
                        INSERT INTO [tbl_ovod_finance] 
                        ([ovod_id], [capital_expenditure], [source_of_funding], [fund_spend], [one_year], [three_year], [three_five_year], [greater_five_year], [detail_breakup])
                        VALUES (@ID, @capExpenditure, @sourceOfFund, @fundSpend, @oneYear, @threeYear, @threeFiveYear, @greaterFive, @detailedBreakUp);
                    `);
            }
            
        }

        if (ovodProgressLogData) {
            const existingLogsResult = await conn.request()
                .input("ID", ID)
                .query(`
                    SELECT progress_date, physical_progress, financial_progress 
                    FROM [tbl_ovod_progress_log] 
                    WHERE ovod_id = @ID 
                    ORDER BY id ASC;
                `);
            const existingLogs = existingLogsResult.recordset;

            const incomingLogs = (ovodProgressLogData || []).filter(row => 
                row.progressDate && row.physicalProgress !== '' && row.financialProgress !== ''
            );

            let hasChanges = false;
            if (existingLogs.length !== incomingLogs.length) {
                hasChanges = true;
            } else {
                for (let i = 0; i < existingLogs.length; i++) {
                    const ext = existingLogs[i];
                    const inc = incomingLogs[i];
                    
                    const extPhys = parseFloat(ext.physical_progress) || 0;
                    const incPhys = parseFloat(inc.physicalProgress) || 0;
                    const extFin = parseFloat(ext.financial_progress) || 0;
                    const incFin = parseFloat(inc.financialProgress) || 0;
                    
                    if (ext.progress_date !== inc.progressDate || extPhys !== incPhys || extFin !== incFin) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            if (hasChanges) {
                await conn.request()
                    .input("ID", ID)
                    .query(`
                        DELETE FROM [tbl_ovod_progress_log] WHERE ovod_id = @ID;
                    `);

                for (const row of incomingLogs) {
                    await conn.request()
                        .input("ID", ID)
                        .input("progressDate", row.progressDate)
                        .input("physicalProgress", parseFloat(row.physicalProgress) || 0)
                        .input("financialProgress", parseFloat(row.financialProgress) || 0)
                        .query(`
                            INSERT INTO [tbl_ovod_progress_log] 
                            ([ovod_id], [progress_date], [physical_progress], [financial_progress], [created_date])
                            VALUES (@ID, @progressDate, @physicalProgress, @financialProgress, GETDATE());
                        `);
                }
            }
        }

        
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function updateOVODActions(req, res) {
    try {
        const {
            actionInput,a3Actions,b3Actions,b2Intervention,bType
        } = req.body;

        const conn = await pool;
        const request = conn.request();

        request.input('actionInput', actionInput);
        request.input('a3Actions', a3Actions);
        request.input('b3Actions', b3Actions);
        request.input('b2Intervention', b2Intervention);
        request.input('bType', bType);
    
        if(a3Actions){
            await request.query(`
                UPDATE mmt_a3
                SET  
                    action_name = @actionInput 
                WHERE id = @a3Actions
            `);
        } else if(bType == "B3") {
            await request.query(`
                UPDATE mmt_b3
                SET  
                    b3_actions = @actionInput 
                WHERE id = @b3Actions
            `);
        } else if(bType == "B2") {
            await request.query(`
                UPDATE mmt_b2_b3
                SET  
                    intervention = @actionInput 
                WHERE id = @b2Intervention
            `);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

//CHECKED
async function getOvdCount(req,res){
    const conn = await pool;
    const request = conn.request();

    const userID = req.params.userID;
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
        if (wingID !== 0) whereClause.push("d.wings = @wingID");
        if (orgID !== 0) whereClause.push("d.imp_agency = @orgID");
        if (priority !== 0) whereClause.push("d.priority = @priority");
        if (vibhasID !== 0) whereClause.push("d.vibhas = @vibhasID");
        if (mivChapterSelect !== 0) whereClause.push("d.miv_chapter = @mivChapterSelect");
        if (makvThemeSelect !== 0) whereClause.push("d.makv_theme = @makvThemeSelect");
        if (vision !== 0) {
            switch (vision) {
                case 1:
                    whereClause.push("d.is_miv = 1");
                    break;
                case 2:
                    whereClause.push("d.is_makv = 1");
                    break;
                case 3:
                    whereClause.push("d.is_sgos = 1");
                    break;
                case 4:
                    whereClause.push("d.is_additional_item = 1");
                    break;
            }
        }

        let whereCatgeoryCondition;

         if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id === 8) {
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE d.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE d.delete_status = 0 ';
        } else {
            whereCatgeoryCondition = whereClause.length > 0 ? 'WHERE (d.goal_b1 IS NOT NULL OR d.intervention_b2 IS NOT NULL) AND d.imp_agency = @organisation_id AND d.delete_status = 0 AND ' + whereClause.join(' AND ') : 'WHERE (d.goal_b1 IS NOT NULL OR d.intervention_b2 IS NOT NULL) AND d.imp_agency = @organisation_id AND d.delete_status = 0 ';
        }

        let getQuery;

        if(role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id === 8){
            getQuery = `SELECT 
                COUNT(DISTINCT a1.a1_code) AS goals,
                COUNT(DISTINCT a2.a2_code) AS intervention,
                COUNT(DISTINCT a3.a3_code) AS action,
                ISNULL(SUM(d.total_cost), 0) AS total_cost
            FROM 
                [sagarmanthan_revamp].[dbo].[tbl_one_vision_doc] d
            LEFT JOIN 
                [sagarmanthan_revamp].[dbo].[mmt_a3] a3 ON d.action_a3 = a3.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_a2] a2 ON d.intervention_a2 = a2.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_a1] a1 ON d.goal_a1 = a1.id
            ${whereCatgeoryCondition};`
        } else {
            getQuery = `SELECT 
                COUNT(DISTINCT b1.b1_code) AS goals,
                COUNT(DISTINCT b2.b2_code) AS intervention,
                COUNT(DISTINCT b3.b3_code) AS action,
                ISNULL(SUM(d.total_cost), 0) AS total_cost
            FROM 
                tbl_one_vision_doc d
            LEFT JOIN 
                [sagarmanthan_revamp].[dbo].[mmt_b3] b3 ON d.action_b3 = b3.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_b2_b3] b2 ON d.intervention_b2 = b2.id
            LEFT JOIN  
                [sagarmanthan_revamp].[dbo].[mmt_b1] b1 ON d.goal_b1 = b1.id
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

async function ovdUploadDocument(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const ID = parseInt(req.body.ID);
        request.input("ID", ID);
        request.input("fileName", req.uniqueFileName);
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let sqlQuery;
        if (ID === -1) {
            const lastRecord = await conn.query(`SELECT TOP 1 id
                FROM tbl_one_vision_doc
                ORDER BY id DESC`);

            const OVD_ID = lastRecord.recordset[0].id;

            request.input("OVD_ID", OVD_ID);

            sqlQuery = `
                INSERT INTO tbl_one_vision_doc_file (ovd_id, file_name)
                VALUES (@OVD_ID, @fileName)
            `;
           
        } else {

            const checkRecord = await request.query(`
                SELECT COUNT(*) AS recordCount
                FROM tbl_one_vision_doc_file
                WHERE ovd_id = @ID
            `);

            const recordCount = checkRecord.recordset[0].recordCount;

            if (recordCount === 1) {
                const docName = await request.query(`
                    SELECT file_name as name
                    FROM tbl_one_vision_doc_file
                    WHERE ovd_id = @ID
                `);

                const name = docName.recordset[0].name;
                if (name) {
                    deleteFile(name);
                }

                sqlQuery = `
                    UPDATE tbl_one_vision_doc_file
                    SET file_name = @fileName
                    WHERE ovd_id = @ID
                `;
            } else {
                sqlQuery = `
                    INSERT INTO tbl_one_vision_doc_file (ovd_id, file_name)
                    VALUES (@ID, @fileName)
                `;
            }
        }

        await request.query(sqlQuery);

        res.status(201).json({ message: "Document uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

function deleteFile(fileName) {
    if (fileName) {
        const filePath = `./fileuploads/One_vision_one_doc/${fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }
    }
}
//done

function generateUniqueFileName(originalFileName) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    // Add time
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');

    const fileExtension = originalFileName.split('.').pop();
    const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return `${baseFileName}_${day}${month}${year}_${hours}${minutes}${seconds}.${fileExtension}`;
}
  
async function getInterventionDocuments(req, res) {
    const ID = req.params.ID;
    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);

    try {
        
            let result = await request.query(`SELECT * 
            FROM tbl_one_vision_doc_file WHERE ovd_id = @ID ;`);
       
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function deleteInterventionDocument(req, res) {
    const ID = req.params.ID;
    const nameDoc = req.params.nameDoc;

    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);
    request.input("nameDoc", nameDoc);

    try {
        const checkResult = await request.query(`SELECT * FROM tbl_one_vision_doc_file WHERE id = @ID`);
        
        if (checkResult.recordset.length > 0) {
            await request.query(`DELETE FROM tbl_one_vision_doc_file WHERE id = @ID`);
            deleteFile(nameDoc);
            return res.sendStatus(200); 
        } else {
            const fileDeleted = deleteFile(nameDoc);
            if (fileDeleted) {
                return res.status(200);
            } else {
                return res.status(404);
            }
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

//---------------------------------------------------------------------------- Download logic ----------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadInterventionDocument(req, res) {
    try {
        const id = req.params.ID;
        const conn = await pool;
        const request = conn.request();

        request.input("id", id);
        
        const result = await request.query(`SELECT file_name FROM tbl_one_vision_doc_file WHERE id = @id`);
        const fileName = result.recordset[0].file_name;

        const file_path = path.join(__dirname, "../../../fileuploads/One_vision_one_doc", fileName);
        
        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(file_path).size);

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

//-----------------------------Finance document  ------------------
async function ovodFinanceDocument(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const ID = parseInt(req.body.ID);
        const sourceOfFund = req.body.sourceOfFund;

        request.input("ID", ID);
        request.input("sourceOfFund", sourceOfFund);

        request.input("fileName", req.uniqueFileName);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let sqlQuery;
   
        const checkRecord = await request.query(`
            SELECT COUNT(*) AS recordCount
            FROM tbl_ovod_finance_doc
            WHERE ovod_id = @ID AND sof_type = @sourceOfFund;
        `);

        const recordCount = checkRecord.recordset[0].recordCount;

        if (recordCount === 1) {
            const docName = await request.query(`
                SELECT file_name as name
                FROM tbl_ovod_finance_doc
                WHERE ovod_id = @ID AND sof_type = @sourceOfFund;
            `);

            const name = docName.recordset[0].name;
            if (name) {
                deleteFile(name);
            }

            sqlQuery = `
                UPDATE tbl_ovod_finance_doc
                SET file_name = @fileName
                WHERE ovod_id = @ID AND sof_type = @sourceOfFund;
            `;
        } else {
            sqlQuery = `
                INSERT INTO tbl_ovod_finance_doc (ovod_id, file_name, sof_type)
                VALUES (@ID, @fileName, @sourceOfFund)
            `;
        }

        // Execute the SQL query
        await request.query(sqlQuery);

        res.status(201).json({ message: "Document uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getFinanceDocuments(req, res) {
    const ID = req.params.ID;
    const sourceOfFundList = req.params.sourceOfFundList;

    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);
    request.input("sourceOfFundList", sourceOfFundList);


    try {
        
        let result = await request.query(`SELECT * 
        FROM tbl_ovod_finance_doc WHERE ovod_id = @ID AND sof_type = @sourceOfFundList;`);
       
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function downloadFinanceDocument(req, res) {
    try {
        const id = req.params.ID;

        const conn = await pool;
        const request = conn.request();
        const result = await request.query(`SELECT file_name FROM tbl_ovod_finance_doc WHERE id = @id`);

        const fileName = result.recordset[0].file_name;

        const file_path = path.join(__dirname, "../../../fileuploads/One_vision_one_doc", fileName);
        
        if (fs.existsSync(file_path)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); 
            res.setHeader('Content-Length', fs.statSync(file_path).size);

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

async function deleteFinanceDocument(req, res) {
    const ID = req.params.ID;
    const nameDoc = req.params.nameDoc;

    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);
    request.input("nameDoc", nameDoc);

    try {
        const checkResult = await request.query(`SELECT * FROM tbl_ovod_finance_doc WHERE id = @ID`);
        
        if (checkResult.recordset.length > 0) {
            await request.query(`DELETE FROM tbl_ovod_finance_doc WHERE id = @ID`);
            deleteFile(nameDoc);
            return res.sendStatus(200); 
        } else {
            const fileDeleted = deleteFile(nameDoc);
            if (fileDeleted) {
                return res.status(200);
            } else {
                return res.status(404);
            }
        }
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function updateOVDProgressLog(req, res) {
    try {
        const ID = req.params.ID;
        const { ovodProgressLogData } = req.body;
        const conn = await pool;
        
        await conn.request()
            .input("ID", ID)
            .query(`
                DELETE FROM [tbl_ovod_progress_log] WHERE ovod_id = @ID;
            `);

        if (ovodProgressLogData && ovodProgressLogData.length > 0) {
            for (const row of ovodProgressLogData) {
                if (!row.progressDate || row.physicalProgress === '' || row.financialProgress === '') {
                    continue;
                }
            
                await conn.request()
                    .input("ID", ID)
                    .input("progressDate", row.progressDate)
                    .input("physicalProgress", parseFloat(row.physicalProgress) || 0)
                    .input("financialProgress", parseFloat(row.financialProgress) || 0)
                    .query(`
                        INSERT INTO [tbl_ovod_progress_log] 
                        ([ovod_id], [progress_date], [physical_progress], [financial_progress], [created_date])
                        VALUES (@ID, @progressDate, @physicalProgress, @financialProgress, GETDATE());
                    `);
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function deleteOVODAction(req, res) {
    const ID = req.params.ID;
    const userID = req.params.userID;
    const conn = await pool;
    const request = conn.request();
    request.input("ID", ID);
    request.input("userID", userID);

    try {
        const actionData = await request.query(`SELECT * From tbl_one_vision_doc WHERE id = @ID`);
        const actionA3 = actionData.recordset[0].action_a3;
        const actionB3 = actionData.recordset[0].action_b3;

        if(!actionB3){
            request.input("actionA3", actionA3);
            await request.query(`UPDATE mmt_a3 SET delete_status = 1 WHERE id = @actionA3`);
        } else if (!actionA3) {
            request.input("actionB3", actionA3);
            await request.query(`UPDATE mmt_b3 SET delete_status = 1 WHERE id = @actionB3`);
        }

        await request.query(`UPDATE tbl_one_vision_doc SET delete_status = 1, updated_by = @userID, updated_date = getdate()  WHERE id = @ID`);

        return res.status(200).json({ message: "Record deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "An error occurred while processing your request." });
    }
}

const OVDTab = {
    getUpdateOVD, createOVDData, createOVDL2Data, updateOVDData, 
    upload, getOvdCount, getAllResultOVDData, ovdUploadDocument, 
    getOrganisationOVDChart, getInterventionDocuments, getMinistryOVDChart,
    deleteInterventionDocument, downloadInterventionDocument, ovodFinanceDocument,
    downloadFinanceDocument, deleteFinanceDocument, getFinanceDocuments, updateOVODActions,
    deleteOVODAction, updateOVDProgressLog
};

export default OVDTab;

