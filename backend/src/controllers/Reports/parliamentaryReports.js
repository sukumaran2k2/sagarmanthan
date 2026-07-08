
import { pool } from "../../db.js";

async function assuranceWingWiseReports (req, res) 
{   
    const conn = await pool;
    try 
    {
        const result = await conn.query(` 
            SELECT
                ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
                mmt_wings.wing_id AS [Wing Id],
                mmt_wings.wing_name AS [Wing Name],
                COUNT(tbl_parliamentary_issue.stage_id) AS [No of Assurance],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 1 THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 2 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 3 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 4 THEN tbl_parliamentary_issue.stage_id END) AS [Extension Of Time Sought],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 5 THEN tbl_parliamentary_issue.stage_id END) AS [Implementation Report Furnished / Request For Dropping],
                COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 6 THEN tbl_parliamentary_issue.stage_id END) AS [Matter Disposed]
            FROM
                mmt_wings
            LEFT JOIN
                tbl_parliamentary_issue ON mmt_wings.wing_id = tbl_parliamentary_issue.wing
            LEFT JOIN
                mmt_parliamentary_stage ON tbl_parliamentary_issue.stage_id = mmt_parliamentary_stage.parlia_stage_id
            WHERE 
                tbl_parliamentary_issue.parliamentary_issue_type = 'Assurance' OR tbl_parliamentary_issue.parliamentary_issue_type IS NULL
            GROUP BY
            mmt_wings.wing_id,
            mmt_wings.wing_name;
        ;`);
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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function assuranceDivisionWiseReports (req, res) 
{   
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try 
    {
        const result = await request.query(` 
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_division.division_id AS [Division Id],
            mmt_division.division_name AS [Division Name],
            COUNT(tbl_parliamentary_issue.stage_id) AS [No of Assurance],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 1 THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 2 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 3 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 4 THEN tbl_parliamentary_issue.stage_id END) AS [Extension Of Time Sought],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 5 THEN tbl_parliamentary_issue.stage_id END) AS [Implementation Report Furnished / Request For Dropping],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 6 THEN tbl_parliamentary_issue.stage_id END) AS [Matter Disposed]
        FROM
            mmt_division
        LEFT JOIN
            tbl_parliamentary_issue ON mmt_division.division_id = tbl_parliamentary_issue.division
        LEFT JOIN
            mmt_parliamentary_stage ON tbl_parliamentary_issue.stage_id = mmt_parliamentary_stage.parlia_stage_id
        WHERE
            mmt_division.wing_id = @wingID AND parliamentary_issue_type = 'Assurance' OR mmt_division.division_id IS NULL
        GROUP BY
            mmt_division.division_id,
            mmt_division.division_name
        Order BY
            mmt_division.division_id
        ;`);

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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getAssuranceWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    const parliamentaryStage = req.params.parliamentaryStage;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("parliamentaryStage", parliamentaryStage);
    // console.log('wingID', wingID);
    // console.log('parliamentaryStage', parliamentaryStage);
    let query;
    try 
    {
        // query = `
        //         SELECT subject AS [Subject], file_number AS [File Number], assurance_number AS [Assurance Number],
        //         parliament_house AS [Parliament House], name_of_mp AS [Name of the MP(s)] , extension_sought_date AS [Extension Sought up to],
        //         received_at_ministry_date AS [Received At Ministry],
        //         comment_soughted_date AS [Comments Sought], comment_received_date AS [Comments Received],
        //         comment_soughted_wings AS [Extension Of Time Sought], implementation_report_furnished_date AS [Implementation Report Furnished / Request For Dropping],
        //         matter_disposed_date AS [Matter Disposed], updated_date AS [Last Updated Date]       
        //     FROM tbl_parliamentary_issue 
        //         left JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
        //         left JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
        //         left JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
        //     WHERE 
        //         (wing = ${wingID}) AND (parliamentary_issue_type = 'Assurance' AND tbl_parliamentary_issue.stage_id = ${parliamentaryStage}) ;
        //     `;

        //     console.log('query', query);

        const result = await request.query(`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No], 
            subject AS [Subject], 
            file_number AS [File Number], 
            assurance_number AS [Assurance Number],
            parliament_house AS [Parliament House], 
            name_of_mp AS [Name of the MP(s)], 
            CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
            CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry],
            CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought],
            CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],
            comment_soughted_wings AS [Extension Of Time Sought], 
            CONVERT(varchar(10), implementation_report_furnished_date, 101) AS [Implementation Report Furnished / Request For Dropping],
            CONVERT(varchar(10), matter_disposed_date, 101) AS [Matter Disposed], 
            CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]       
        FROM 
            tbl_parliamentary_issue 
        LEFT JOIN 
            mmt_wings ON mmt_wings.wing_id = tbl_parliamentary_issue.wing
        LEFT JOIN 
            mmt_division ON mmt_division.division_id = tbl_parliamentary_issue.division
        LEFT JOIN 
            mmt_parliamentary_stage ON mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
        WHERE 
            (wing = ${wingID}) 
            AND (parliamentary_issue_type = 'Assurance' AND tbl_parliamentary_issue.stage_id = ${parliamentaryStage});

        `);
        // res.json(result.recordset);
        const rowData = result.recordset; 
        console.log('rowData',rowData); 

        if (rowData.length === 0) {
            return res.json(result.recordset);
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });
        
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

// SELECT mmt_wings.wing_name, mmt_division.division_name, 
//         wing, division, subject, file_number, parliamentary_issue_type, assurance_number, 
//         parliament_house, name_of_mp, extension_sought_date,
//         received_at_ministry, received_at_ministry_date,
//         comment_soughted, comment_soughted_date, comment_received, comment_received_date,
//         comment_soughted_wings, shipping, shipping_date, vigilance, vigilance_date, ports, ports_date, iwt, iwt_date, administration, 
//         administration_date, coord_I, coord_I_date, coord_II, coord_II_date, dgll_parliament_and_trw, 
//         dgll_parliament_and_trw_date, development, development_date, finance, finance_date, sagarmala, sagarmala_date, extension_time_soughted, extension_time_soughted_date, reply_send, 
//         reply_send_date, debated_in_parliament, debated_in_parliament_date, implementation_report_furnished, implementation_report_furnished_date,
//         matter_disposed, matter_disposed_date, remarks, tbl_parliamentary_issue.stage_id, updated_date
        
//         FROM tbl_parliamentary_issue 
//         INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
//         INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
//         INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
        
//         WHERE (wing = @wingID) AND (parliamentary_issue_type = 'Assurance' AND tbl_parliamentary_issue.stage_id = @parliamentaryStage) ;`);

async function getAssuranceDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const parliamentaryStage = req.params.parliamentaryStage;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("parliamentaryStage", parliamentaryStage);

    try 
    {
        const result = await request.query(`
            SELECT  
                ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No],
                subject AS [Subject], 
                file_number AS [File Number], 
                assurance_number AS [Assurance Number], 
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry], 
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought], 
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],  
                CONVERT(varchar(10), extension_time_soughted_date, 101) AS [Extension Of Time Sought], 
                CONVERT(varchar(10), implementation_report_furnished_date, 101) AS [Implementation Report Furnished / Request For Dropping],
                CONVERT(varchar(10), matter_disposed_date, 101) AS [Matter Disposed], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NOT NULL THEN 'Finance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
                ) AS [Comments yet to be received From],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NULL THEN ',Development ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NULL THEN ',Finance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
                ) AS [Comments not yet to be received From]
            FROM tbl_parliamentary_issue 
                LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
                LEFT JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
                LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id        
            WHERE (division = @divisionID) AND (parliamentary_issue_type = 'Assurance' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage);
        `);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
    
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));
    
        res.json({ columnDefs, rowData });
}
catch(err) 
{
    console.log(err);
    return res.sendStatus(500);
}

};

// SELECT mmt_wings.wing_name, mmt_division.division_name, 
//         wing, division, subject, file_number, parliamentary_issue_type, assurance_number, 
//         parliament_house, name_of_mp, extension_sought_date,
//         received_at_ministry, received_at_ministry_date, 
//         comment_soughted, comment_soughted_date, comment_received, comment_received_date,
//         comment_soughted_wings, shipping, shipping_date, vigilance, vigilance_date, ports, ports_date, iwt, iwt_date, administration, 
//         administration_date, coord_I, coord_I_date, coord_II, coord_II_date, dgll_parliament_and_trw, 
//         dgll_parliament_and_trw_date, development, development_date, finance, finance_date, sagarmala, sagarmala_date, extension_time_soughted, extension_time_soughted_date, reply_send, 
//         reply_send_date, debated_in_parliament, debated_in_parliament_date, implementation_report_furnished, implementation_report_furnished_date,
//         matter_disposed, matter_disposed_date, remarks, tbl_parliamentary_issue.stage_id, updated_date
        
//         FROM tbl_parliamentary_issue 
//         INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
//         INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
//         INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
        
//         WHERE (division = @divisionID) AND (parliamentary_issue_type = 'Assurance' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage) ;




// --------------------------------------------------- Matter Raised ----------------------------------------------------------
async function parliaMatterRaisedWingWise (req, res) 
{   
    const issueType = req.params.issueType;
    
    const conn = await pool;
    const request = conn.request();
    request.input("issueType", issueType);
    // console.log('issueType', issueType);
    try 
    {
        const result = await request.query(
        `SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id AS [Wing Id],
            mmt_wings.wing_name AS [Wing Name],
            COUNT(tbl_parliamentary_issue.stage_id) AS [No of Matter Raised],

            COUNT(CASE WHEN 
                mmt_parliamentary_stage.parlia_stage_id = 8 OR 
                mmt_parliamentary_stage.parlia_stage_id = 14 OR 
                mmt_parliamentary_stage.parlia_stage_id = 20 
            THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],

            COUNT(CASE WHEN 
                mmt_parliamentary_stage.parlia_stage_id = 9 OR 
                mmt_parliamentary_stage.parlia_stage_id = 15 OR 
                mmt_parliamentary_stage.parlia_stage_id = 21 
            THEN tbl_parliamentary_issue.stage_id END) AS [Debated in Parliament],

            COUNT(CASE WHEN 
                mmt_parliamentary_stage.parlia_stage_id = 10 OR 
                mmt_parliamentary_stage.parlia_stage_id = 16 OR 
                mmt_parliamentary_stage.parlia_stage_id = 22 
            THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],

            COUNT(CASE WHEN 
                mmt_parliamentary_stage.parlia_stage_id = 11 OR 
                mmt_parliamentary_stage.parlia_stage_id = 17 OR 
                mmt_parliamentary_stage.parlia_stage_id = 23 
            THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],

            COUNT(CASE WHEN 
                mmt_parliamentary_stage.parlia_stage_id = 12 OR 
                mmt_parliamentary_stage.parlia_stage_id = 18 OR 
                mmt_parliamentary_stage.parlia_stage_id = 24
            THEN tbl_parliamentary_issue.stage_id END) AS [Replay Sent]
            
        FROM
            mmt_wings
        LEFT JOIN
            tbl_parliamentary_issue ON mmt_wings.wing_id = tbl_parliamentary_issue.wing
        LEFT JOIN
            mmt_parliamentary_stage ON tbl_parliamentary_issue.stage_id = mmt_parliamentary_stage.parlia_stage_id
        WHERE 
            tbl_parliamentary_issue.parliamentary_issue_type = @issueType
            OR tbl_parliamentary_issue.parliamentary_issue_type IS NULL
        GROUP BY
            mmt_wings.wing_id,
            mmt_wings.wing_name
        ;`);

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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function parliaMatterDivisionWise (req, res) 
{   
    const wingID = req.params.wingID;
    const issueType = req.params.issueType;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("issueType", issueType);
    try 
    {
        const result = await request.query(` 
            SELECT 
                ROW_NUMBER() OVER (ORDER BY mmt_division.division_name) AS [S No], 
                mmt_division.division_id AS [Division ID], 
                mmt_division.division_name AS [Division Name], 
                count(tbl_parliamentary_issue.parliamentary_issue_id) as [No of Matter Raised], 
                COUNT(CASE WHEN 
                    mmt_parliamentary_stage.parlia_stage_id = 8 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 14 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 20 
                THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],
    
                COUNT(CASE WHEN 
                    mmt_parliamentary_stage.parlia_stage_id = 9 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 15 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 21 
                THEN tbl_parliamentary_issue.stage_id END) AS [Debated in Parliament],
    
                COUNT(CASE WHEN 
                    mmt_parliamentary_stage.parlia_stage_id = 10 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 16 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 22 
                THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],
    
                COUNT(CASE WHEN 
                    mmt_parliamentary_stage.parlia_stage_id = 11 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 17 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 23 
                THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],
    
                COUNT(CASE WHEN 
                    mmt_parliamentary_stage.parlia_stage_id = 12 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 18 OR 
                    mmt_parliamentary_stage.parlia_stage_id = 24
                THEN tbl_parliamentary_issue.stage_id END) AS [Reply sent]

            FROM mmt_division 

            LEFT JOIN tbl_parliamentary_issue on tbl_parliamentary_issue.division = mmt_division.division_id 
            LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id

            WHERE wing = @wingID AND parliamentary_issue_type = @issueType
            GROUP BY 
                mmt_division.division_id,  
                mmt_division.division_name
            ORDER BY    
                mmt_division.division_id
        ;`);
        // res.json(result.recordset);
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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getMatterWingWise (req, res) 
{ 
    const wingID = req.params.wingID;
    const parliamentaryStage = req.params.parliamentaryStage;
    const IssueType = req.params.IssueType;

    console.log('wingID',wingID);
    console.log('parliamentaryStage',parliamentaryStage);

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("parliamentaryStage", parliamentaryStage);
    request.input("IssueType", IssueType);
    
    let query, whereCondition;
    if(IssueType === 'Matter Raised In Zero Hours'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 12) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 11) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 10) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 9) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 8) ;`
        }else {
            return res.sendStatus(500);
        }
    }else if(IssueType === 'Matter Raised Under Rule 377'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 18) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 17) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 16) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 15) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 14) ;`
        }else {
            return res.sendStatus(500);
        }
    }else if(IssueType === 'Special Mention In Rajya Sabha'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 24) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 23) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 22) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 21) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (wing = @wingID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 20) ;`
        }else {
            return res.sendStatus(500);
        }
    }

    try 
    {
        if(parliamentaryStage == 4){
            query = `
            SELECT 
                subject AS [Subject], 
                file_number AS [File Number], 
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry],
                CONVERT(varchar(10), debated_in_parliament_date, 101) AS [Debated in Parliament],
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought],
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NOT NULL THEN 'Finance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
                ) AS [Comments yet to be received From],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NULL THEN ',Development ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NULL THEN ',Finance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
                ) AS [Comments not yet to be received From],
                CONVERT(varchar(10), reply_send_date, 101) AS [Reply Send], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date] 
    
            FROM tbl_parliamentary_issue 
                INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
                INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
                INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
            ${whereCondition}`
        }else{
            query = `
            SELECT 
                subject AS [Subject], 
                file_number AS [File Number], 
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry],
                CONVERT(varchar(10), debated_in_parliament_date, 101) AS [Debated in Parliament],
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought],
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],
                CONVERT(varchar(10), reply_send_date, 101) AS [Reply Send], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
            FROM tbl_parliamentary_issue 
                INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
                INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
                INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
            ${whereCondition}`
        }

        const result = await request.query(query);
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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getMatterDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    const parliamentaryStage = req.params.parliamentaryStage;
    const IssueType = req.params.IssueType;
    
    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("parliamentaryStage", parliamentaryStage);
    request.input("IssueType", IssueType);

    let query, whereCondition;
    if(IssueType === 'Matter Raised In Zero Hours'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 12) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 11) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 10) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 9) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 8) ;`
        }else {
            return res.sendStatus(500);
        }
    }else if(IssueType === 'Matter Raised Under Rule 377'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 18) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 17) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 16) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 15) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 14) ;`
        }else {
            return res.sendStatus(500);
        }
    }else if(IssueType === 'Special Mention In Rajya Sabha'){
        if(parliamentaryStage == 5){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 24) ;`
        }else if(parliamentaryStage == 4){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 23) ;`
        }else if(parliamentaryStage == 3){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 22) ;`
        }else if(parliamentaryStage == 2){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 21) ;`
        }else if(parliamentaryStage == 1){
            whereCondition = `WHERE (division = @divisionID) AND (parliamentary_issue_type = @IssueType AND  tbl_parliamentary_issue.stage_id = 20) ;`
        }else {
            return res.sendStatus(500);
        }
    }

    try 
    {
        if(parliamentaryStage == 4){
            query = `
            SELECT 
                subject AS [Subject], 
                file_number AS [File Number], 
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry],
                CONVERT(varchar(10), debated_in_parliament_date, 101) AS [Debated in Parliament],
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought],
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NOT NULL THEN 'Finance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
                ) AS [Comments yet to be received From],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NULL THEN ',Development ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NULL THEN ',Finance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
                ) AS [Comments not yet to be received From],
                CONVERT(varchar(10), reply_send_date, 101) AS [Reply Send], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]      
            
            FROM tbl_parliamentary_issue 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
            INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
            
            ${whereCondition}`
        }else{
            query = `
            SELECT 
                subject AS [Subject], 
                file_number AS [File Number], 
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry],
                CONVERT(varchar(10), debated_in_parliament_date, 101) AS [Debated in Parliament],
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought],
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],
                CONVERT(varchar(10), reply_send_date, 101) AS [Reply Send], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]      
            
            FROM tbl_parliamentary_issue 
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
            INNER JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id
            
            ${whereCondition}`
        }
        const result = await request.query(query);
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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

// --------------------------------------------------- PSN Report ----------------------------------------------------------
async function getPsnReportsData (req, res) 
{   
    const conn = await pool;
    try 
    {
        const result = await conn.query(`       
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id AS [Wing Id],
            mmt_wings.wing_name AS [Wing],
            COUNT(tbl_parliamentary_issue.stage_id) AS [No of PSC Report],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 26 THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 27 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 28 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 29 THEN tbl_parliamentary_issue.stage_id END) AS [Reply sent]
        FROM
            mmt_wings
        LEFT JOIN
            tbl_parliamentary_issue ON mmt_wings.wing_id = tbl_parliamentary_issue.wing
        LEFT JOIN
            mmt_parliamentary_stage ON tbl_parliamentary_issue.stage_id = mmt_parliamentary_stage.parlia_stage_id
        WHERE 
            tbl_parliamentary_issue.parliamentary_issue_type = 'PSC Report'
        GROUP BY
            mmt_wings.wing_id,
            mmt_wings.wing_name;`);

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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function parliaPscDivisionWise (req, res) 
{   
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try 
    {
        const result = await request.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_division.division_id AS [Division Id],
            mmt_division.division_name AS [Division Name],
            COUNT(tbl_parliamentary_issue.stage_id) AS [No of PSC Report],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 26 THEN tbl_parliamentary_issue.stage_id END) AS [Received At Ministry],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 27 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Sought],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 28 THEN tbl_parliamentary_issue.stage_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_parliamentary_stage.parlia_stage_id = 29 THEN tbl_parliamentary_issue.stage_id END) AS [Reply sent]
        FROM
            mmt_division
        LEFT JOIN
            tbl_parliamentary_issue ON mmt_division.division_id = tbl_parliamentary_issue.division
        LEFT JOIN
            mmt_parliamentary_stage ON tbl_parliamentary_issue.stage_id = mmt_parliamentary_stage.parlia_stage_id
        WHERE 
            tbl_parliamentary_issue.wing = @wingID AND tbl_parliamentary_issue.parliamentary_issue_type = 'PSC Report'
        GROUP BY
            mmt_division.division_id,
            mmt_division.division_name   
        ;`);
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
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getPscWingWise (req, res) 
{   
    const wingID = req.params.wingID;
    let parliamentaryStage = req.params.parliamentaryStage;

    if(parliamentaryStage == 4){
        parliamentaryStage = 29;
    }else if(parliamentaryStage == 3){
        parliamentaryStage = 28;
    }else if(parliamentaryStage == 2){
        parliamentaryStage = 27;
    }else if(parliamentaryStage == 1){
        parliamentaryStage = 26;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("parliamentaryStage", parliamentaryStage);

    let query;
    if(parliamentaryStage == 28){
        query = `
        SELECT  
            ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No],
            subject AS [Subject], 
            file_number AS [File Number],  
            parliament_house AS [Parliament House], 
            name_of_mp AS [Name of the MP(s)], 
            CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
            CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry], 
            CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought], 
            CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],  
            CONCAT(
                CASE WHEN tbl_parliamentary_issue.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.finance IS NOT NULL THEN 'Finance, ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
            ) AS [Comments yet to be received From],
            CONCAT(
                CASE WHEN tbl_parliamentary_issue.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.development_date IS NULL THEN ',Development ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.finance IS NULL THEN ',Finance ' ELSE '' END,
                CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
            ) AS [Comments not yet to be received From],
            CONVERT(varchar(10), extension_time_soughted_date, 101) AS [Extension Of Time Sought], 
            CONVERT(varchar(10), implementation_report_furnished_date, 101) AS [Implementation Report Furnished / Request For Dropping],
            CONVERT(varchar(10), matter_disposed_date, 101) AS [Matter Disposed], 
            CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
            
        FROM tbl_parliamentary_issue 
            LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
            LEFT JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
            LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id        
        WHERE (wing = @wingID) AND (parliamentary_issue_type = 'PSC Report' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage) 
        ;`
    }else{
        query = `
        SELECT  
            ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No],
            subject AS [Subject], 
            file_number AS [File Number],  
            parliament_house AS [Parliament House], 
            name_of_mp AS [Name of the MP(s)], 
            CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
            CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry], 
            CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought], 
            CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],  
            CONVERT(varchar(10), reply_send_date, 101) AS [Reply Sent], 
            CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
        FROM tbl_parliamentary_issue 
            LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
            LEFT JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
            LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id        
        WHERE (wing = @wingID) AND (parliamentary_issue_type = 'PSC Report' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage)
        ;`
    }

    try 
    {
        const result = await request.query(query);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.json(result.recordset);
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getPscDivisionWise (req, res) 
{   
    const divisionID = req.params.divisionID;
    let parliamentaryStage = req.params.parliamentaryStage;

    if(parliamentaryStage == 4){
        parliamentaryStage = 29;
    }else if(parliamentaryStage == 3){
        parliamentaryStage = 28;
    }else if(parliamentaryStage == 2){
        parliamentaryStage = 27;
    }else if(parliamentaryStage == 1){
        parliamentaryStage = 26;
    }

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("parliamentaryStage", parliamentaryStage);

    let query;
    try 
    {
        if(parliamentaryStage == 29){
            query = `
            SELECT  
                ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No],
                subject AS [Subject], 
                file_number AS [File Number],  
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry], 
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought], 
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],  
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NOT NULL THEN 'Shipping, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NOT NULL THEN 'Vigilance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NOT NULL THEN 'Ports, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NOT NULL THEN 'IWT, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NOT NULL THEN 'Administration, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NOT NULL THEN 'Coord_I, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NOT NULL THEN 'Coord_II, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NOT NULL THEN 'DGLL Parliament & TRW, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NOT NULL THEN 'Development, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NOT NULL THEN 'Finance, ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NOT NULL THEN 'Sagarmala, ' ELSE '' END
                ) AS [Comments yet to be received From],
                CONCAT(
                    CASE WHEN tbl_parliamentary_issue.shipping_date IS NULL THEN 'Shipping ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.vigilance_date IS NULL THEN ',Vigilance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.ports_date IS NULL THEN ',Ports ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.iwt_date IS NULL THEN ',IWT ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.administration_date IS NULL THEN ',Administration ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_I_date IS NULL THEN ',Coord_I ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.coord_II_date IS NULL THEN ',Coord_II ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.dgll_parliament_and_trw_date IS NULL THEN ',DGLL Parliament & TRW ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.development_date IS NULL THEN ',Development ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.finance IS NULL THEN ',Finance ' ELSE '' END,
                    CASE WHEN tbl_parliamentary_issue.sagarmala_date IS NULL THEN ',Sagarmala ' ELSE '' END
                ) AS [Comments not yet to be received From],
                CONVERT(varchar(10), extension_time_soughted_date, 101) AS [Extension Of Time Sought], 
                CONVERT(varchar(10), implementation_report_furnished_date, 101) AS [Implementation Report Furnished / Request For Dropping],
                CONVERT(varchar(10), matter_disposed_date, 101) AS [Matter Disposed], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
                
            FROM tbl_parliamentary_issue 
                LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
                LEFT JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
                LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id        
            WHERE (division = @divisionID) AND (parliamentary_issue_type = 'PSC Report' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage)
            ;`
        }else{
            query = `
            SELECT  
                ROW_NUMBER() OVER (ORDER BY tbl_parliamentary_issue.subject) AS [S No],
                subject AS [Subject], 
                file_number AS [File Number],  
                parliament_house AS [Parliament House], 
                name_of_mp AS [Name of the MP(s)], 
                CONVERT(varchar(10), extension_sought_date, 101) AS [Extension Sought up to],
                CONVERT(varchar(10), received_at_ministry_date, 101) AS [Received At Ministry], 
                CONVERT(varchar(10), comment_soughted_date, 101) AS [Comments Sought], 
                CONVERT(varchar(10), comment_received_date, 101) AS [Comments Received],  
                CONVERT(varchar(10), reply_send_date, 101) AS [Reply Sent], 
                CONVERT(varchar(10), updated_date, 101) AS [Last Updated Date]
            FROM tbl_parliamentary_issue 
                LEFT JOIN mmt_wings on mmt_wings.wing_id = tbl_parliamentary_issue.wing
                LEFT JOIN mmt_division on mmt_division.division_id = tbl_parliamentary_issue.division
                LEFT JOIN mmt_parliamentary_stage on mmt_parliamentary_stage.parlia_stage_id = tbl_parliamentary_issue.stage_id        
            WHERE (division = @divisionID) AND (parliamentary_issue_type = 'PSC Report' AND  tbl_parliamentary_issue.stage_id = @parliamentaryStage)
        ;`
        }

        const result = await request.query(query);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.json(result.recordset);
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));

        res.json({ columnDefs, rowData });
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { assuranceWingWiseReports, assuranceDivisionWiseReports, getAssuranceWingWise, getAssuranceDivisionWise,
    parliaMatterRaisedWingWise, parliaMatterDivisionWise, getMatterWingWise, getMatterDivisionWise,
    getPsnReportsData, parliaPscDivisionWise, getPscWingWise, getPscDivisionWise };