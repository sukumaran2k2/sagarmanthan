import { pool } from "../../db.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import fs from 'fs';
// import mssql from "mssql";

async function getMIVOrgWisePerformanceReport(req, res) {
    try {
        const conn = await pool;

        const userID = Number(req.params.userID);
        console.log("iser",userID)
        if (!userID) {
            return res.status(400).json({ message: "Invalid userID"});
        }

        const userRequest = conn.request();
        userRequest.input("userID", userID);

        const userResult = await userRequest.query(`
            SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const { role_id, organisation_id } = userResult.recordset[0];
        const allOrganisationRoles = [1, 2, 3, 4, 5, 8];

        let result;
        if (allOrganisationRoles.includes(Number(role_id))) {

            const request = conn.request();
            result = await request.query(`
                SELECT
                    mmt.organisation_id AS OrganisationID,
                    mmt.organisation_name AS Organisation,
                    COUNT(ini.initiative_id) AS [Total Initiatives],
                    SUM( ISNULL(ini.total_cost, 0)  ) AS [Total Investment (Cr.)],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Completed'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Completed],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Under Implementation - On Time'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [In Progress - On Time],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Under Implementation - Delayed'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [In Progress - Delayed],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Yet to be Started'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Not Started]

                FROM tbl_initiative ini
                LEFT JOIN mmt_organisation mmt ON ini.organisation_id = mmt.organisation_id
                GROUP BY
                    mmt.organisation_id,
                    mmt.organisation_name

                ORDER BY
                    [Total Initiatives] DESC;
            `);
        } else {

            const request = conn.request();
            request.input( "organisation_id", organisation_id );

            result = await request.query(`
                SELECT
                    mmt.organisation_id AS OrganisationID,
                    mmt.organisation_name AS Organisation,
                    COUNT(ini.initiative_id) AS [Total Initiatives],
                    SUM(
                        ISNULL(ini.total_cost, 0)
                    ) AS [Total Investment (Cr.)],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Completed'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Completed],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Under Implementation - On Time'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [In Progress - On Time],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Under Implementation - Delayed'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [In Progress - Delayed],
                    SUM(
                        CASE
                            WHEN ini.status_current = 'Yet to be Started'
                            THEN 1
                            ELSE 0
                        END
                    ) AS [Not Started]

                FROM tbl_initiative ini
                LEFT JOIN mmt_organisation mmt ON ini.organisation_id = mmt.organisation_id
                WHERE mmt.organisation_id = @organisation_id
                GROUP BY
                    mmt.organisation_id,
                    mmt.organisation_name
                ORDER BY
                    [Total Initiatives] DESC;
            `);
        }

        return res.json({ rows: result.recordset });
    } catch (err) {
        console.error( "Error in getMIVOrgWisePerformanceReport:", err );
        return res.status(500).json({ message: "Internal server error" });
    }
}

//Theme Wise
async function getmmtThemeValues(req,res){
    const conn = await pool;
    try {
        const result = await conn.query(`
        SELECT theme_initiative_id,initiative_name from mmt_theme_initiative
        order by theme_initiative_id

        ;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

//AG GRID THEME WISE CODE
async function getThemeWiseMIVPerformanceReport(req, res) {
    // console.log("function worked!");
    try {
        const conn = await pool;
        const request = conn.request();
        const userID = req.params.userID;

         const userRequest = conn.request();
        userRequest.input("userID", userID);

        const userResult = await userRequest.query(`
            SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const { role_id, organisation_id } = userResult.recordset[0];
        const allOrganisationRoles = [1, 2, 3, 4, 5, 8];

        let result;

        if (allOrganisationRoles.includes(Number(role_id))) {

            const request = conn.request();
            result = await request.query(`
                select mti.initiative_name,

COUNT(ini.initiative_id) AS [Total Initiatives],
    SUM(ISNULL(ini.total_cost, 0)) AS [Total Investment (Cr.)],
    SUM(
        CASE
            WHEN ini.status_current = 'Completed'
            THEN 1
            ELSE 0
        END
    ) AS [Completed],
    SUM(
        CASE
            WHEN ini.status_current = 'Under Implementation - On Time'
            THEN 1
            ELSE 0
        END
    ) AS [In Progress - On Time],
    SUM(
        CASE
            WHEN ini.status_current = 'Under Implementation - Delayed'
            THEN 1
            ELSE 0
        END
    ) AS [In Progress - Delayed],
    SUM(
        CASE
            WHEN ini.status_current = 'Yet to be Started'
            THEN 1
            ELSE 0
        END
    ) AS [Not Started]


from tbl_initiative ini
LEFT JOIN mmt_theme_initiative mti ON ini.theme_Initiative = mti.theme_initiative_id
GROUP BY 
	mti.initiative_name 
            `);

        } else {
            const request = conn.request();
            request.input( "organisation_id", organisation_id );
            result = await request.query(`
            select mti.initiative_name,

COUNT(ini.initiative_id) AS [Total Initiatives],
    SUM(ISNULL(ini.total_cost, 0)) AS [Total Investment (Cr.)],
    SUM(
        CASE
            WHEN ini.status_current = 'Completed'
            THEN 1
            ELSE 0
        END
    ) AS [Completed],
    SUM(
        CASE
            WHEN ini.status_current = 'Under Implementation - On Time'
            THEN 1
            ELSE 0
        END
    ) AS [In Progress - On Time],
    SUM(
        CASE
            WHEN ini.status_current = 'Under Implementation - Delayed'
            THEN 1
            ELSE 0
        END
    ) AS [In Progress - Delayed],
    SUM(
        CASE
            WHEN ini.status_current = 'Yet to be Started'
            THEN 1
            ELSE 0
        END
    ) AS [Not Started]


from tbl_initiative ini
LEFT JOIN mmt_theme_initiative mti ON ini.theme_Initiative = mti.theme_initiative_id
WHERE ini.organisation_id = @organisation_id
GROUP BY 
	mti.initiative_name   
            `);

        }

       return res.json({ rows: result.recordset });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function mivDetailedData (req, res) 
{  
    const organisationID = req.body.organisationID;
    const mivStage       = req.body.mivStage;
    const columnName     = req.body.columnName;

    let mivStages = mivStage.split(",");
    let mivStageLength = mivStages.length;
    
    const mivStagesParam = mivStages.map(stage => `'${stage}'`).join(',');
    // console.log(mivStages)

    // if(Array.isArray(mivStages))
    // {
    //     console.log("array")
    //     mivStages = mivStages.join(",");
    //     // )    
    // }    

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    // request.input("mivStages", mssql.VarChar, mivStages);
    // request.input("columnName", columnName);

    // console.log(mivStages)
    let queryResult;
    if(mivStageLength == 1)
    {
        queryResult = (`SELECT mmt_organisation.organisation_name as [Organisation/Wing], initiative_id as [Initiative ID],
            initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
            status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
            outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], reasons_for_delay as [Reasons for Delay (if Any)], latestImage as [Recent Executive Summary & PPT of Initiative],
            (
                SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
            ) AS [Source of Funding],Feedback,Response
            FROM tbl_initiative 
            INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
            LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
        
            WHERE (tbl_initiative.organisation_id = @organisationID) AND 
            ${columnName} IN ('${mivStages}') ;`);
    }
    else
    {
        queryResult = (`SELECT mmt_organisation.organisation_name as [Organisation/Wing], initiative_id as[Initiative ID],
            initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
            status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
            outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], reasons_for_delay as [Reasons for Delay (if Any)], latestImage as [Recent Executive Summary & PPT of Initiative],
            (
                SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
            ) AS [Source of Funding],Feedback,Response
            FROM tbl_initiative 
            INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
            LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding

            WHERE (tbl_initiative.organisation_id = @organisationID) AND 
            ${columnName} IN (${mivStagesParam});
            ;`);
    }
    //working
    // if(mivStageLength == 1)
    // {
    //     queryResult = (`SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
    //         initiative_name, total_cost, category, 
    //         status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
    //         start_date, completion_date, actual_date, latestImage,
    //         (
    //             SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
    //             FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
    //             JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
    //         ) AS source_of_funding_names
    //         FROM tbl_initiative 
    //         INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
    //         LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
        
    //         WHERE (tbl_initiative.organisation_id = @organisationID) AND 
    //         ${columnName} IN ('${mivStages}') ;`);
    // }

    // SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
    //         initiative_name, total_cost, category, source_of_funding, mmt_source_of_funding.source_of_funding_name, 
    //         status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
    //         start_date, completion_date, actual_date, latestImage
    //         FROM tbl_initiative 
    //         INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
    //         LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
        
    //         WHERE (tbl_initiative.organisation_id = @organisationID) AND 
    //         ${columnName} IN ('${mivStages}') 
   
    // else
    // {
    //     queryResult = (`SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
    //         initiative_name, total_cost, category, 
    //         status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
    //         start_date, completion_date, actual_date, latestImage,
    //         (
    //             SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
    //             FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
    //             JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
    //         ) AS source_of_funding_names
    //         FROM tbl_initiative 
    //         INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
    //         LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding

    //         WHERE (tbl_initiative.organisation_id = @organisationID) AND 
    //         ${columnName} IN (${mivStagesParam});
    //         ;`);
    // }

    // else
    // {
    //     queryResult = (`SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
    //         initiative_name, total_cost, category, 
    //         status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
    //         start_date, completion_date, actual_date, latestImage,
    //         (
    //             SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
    //             FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
    //             JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
    //         ) AS source_of_funding_names
    //         FROM tbl_initiative 
    //         INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
    //         LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding

    //         WHERE (tbl_initiative.organisation_id = @organisationID) AND 
    //         ${columnName} IN (${mivStages.reduce((prev, curr) => {
    //             return `'${prev}','${curr}'`;
    //         })}) ;`);
    // }    

    // SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
    //         initiative_name, total_cost, category, source_of_funding, mmt_source_of_funding.source_of_funding_name,
    //         status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
    //         start_date, completion_date, actual_date, latestImage
    //         FROM tbl_initiative 
    //         INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
    //         LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding

    //         WHERE (tbl_initiative.organisation_id = @organisationID) AND 
    //         ${columnName} IN (${mivStages.reduce((prev, curr) => {
    //             return `'${prev}','${curr}'`;
    //         })})

    try 
    {
        const result = await request.query(queryResult);
       
        // res.json(result.recordset);
        // console.log(result.recordset);
        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        //     field: key,
        // }));

        let columnDefs = [
            {
                headerName: "Organisation/Wing",
                field: "Organisation/Wing",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Initiative ID",
                field: "Initiative ID",
                headerClass : "headerGroup",
            },
            {
                headerName: "Name of Initiative",
                field: "Name of Initiative",
                headerClass : "headerGroup",
            },
            {
                headerName: "Total Cost of Initiatives (In.Cr)",
                field: "Total Cost of Initiatives",
                headerClass : "headerGroup",
            },
            {
                headerName: "Initiative Category",
                field: "Initiative Category",
                headerClass : "headerGroup",
            },
            {
                headerName: "Status as on 1st April 2023",
                field: "Status as on 1st April 2023",
                headerClass : "headerGroup",
            },
            {
                headerName: "Current Status",
                field: "Current Status",
                headerClass : "headerGroup",
            },
            {
                headerName: "Physical progress (In Percentage)",
                field: "Physical progress (In Percentage)",
                headerClass : "headerGroup",
            },{
                headerName: "Timelines",
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "Start Date of Activity",
                        field: "Start Date of Activity",
                        headerClass : "headerGroup",
                    },{
                        headerName: "Target Date of Completion of Initiative as per MIV 2030 document",
                        field: "Target Date of Completion of Initiative as per MIV 2030 document",
                        headerClass : "headerGroup",
                    },
                    {
                        headerName: "Expected/ Actual Date of Competion",
                        field: "Expected/ Actual Date of Competion",
                        headerClass : "headerGroup",
                    }
                ]
            },{
                headerName: "Outcomes",
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "Output / Outcome of the completed initiative",
                        field: "outcomes",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Direct Employment Generated (No. of People)",
                        field: "direct_Emp_Gen",
                        headerClass : "headerGroup",
                        width: 250,
                    },{
                        headerName: "Indirect Employment Generated (No. of People)",
                        field: "inDirect_Emp_Gen",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Direct Investment Created (In. Cr.)",
                        field: "direct_Inv_Created",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Indirect Investment Created (In. Cr.)",
                        field: "inDirect_Inv_Created",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Output/Outcomes Remarks",
                        field: "Outcomes_Remarks",
                        headerClass : "headerGroup",
                        width: 250,
                    }
                ]
            },{
                headerName: "Reasons for Delay (if Any)",
                field: "Reasons for Delay (if Any)",
                headerClass : "headerGroup",
            },{
                headerName: "Recent Executive Summary & PPT of Initiative",
                field: "Recent Executive Summary & PPT of Initiative",
                headerClass : "headerGroup",
            },{
                headerName: "Source of Funding",
                field: "Source of Funding",
                headerClass : "headerGroup",
            },{
                headerName: "Feedback",
                field: "Feedback",
                headerClass : "headerGroup",
            },{
                headerName: "Response",
                field: "Response",
                headerClass : "headerGroup",
            }
        ];

        res.json({ columnDefs, rowData });

    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};


//MIV THEME WISE DETAILED REPORT
async function mivThemeDetailedData (req, res) 
{  
    try {
        const conn = await pool;
        const request = conn.request();
        const mivStage            = req.body.mivStage;
        const columnName          = req.body.columnName;
        const initiativeThemeID   = req.body.initiative_theme_ID;
        const userID              = req.body.userID;

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        const organisationID = organisation_id;

        // console.log("mivStage",mivStage);
        // console.log("columnName",columnName);
        // console.log("initiativeThemeID",initiativeThemeID);

        let mivStages = mivStage.split(",");
        // console.log(mivStage);
        let mivStageLength = mivStages.length;
        // console.log("mivStages",mivStages)
    
        request.input("organisationID", organisationID);
        request.input('initiativeThemeID', initiativeThemeID);
        const mivStagesParam = mivStages.map(stage => `'${stage}'`).join(',');
        

        // console.log(mivStages)
        let query;

        if(mivStageLength == 1)
        {
            if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5 || role_id === 8) {
                query = await request.query(`
                    SELECT  mmt_organisation.organisation_name as [Organisation/Wing], initiative_id  as [Initiative ID],
                        initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
                        status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
                        start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], 
                        outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,reasons_for_delay as [Reasons for Delay (if Any)],
                        latestImage AS [Recent Executive Summary & PPT of Initiative],
                        (
                            SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                            FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                            JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
                        ) AS [Source of Funding],Feedback,Response
                        FROM tbl_initiative 
                        INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                        LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
                    
                    WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND
                    ${columnName} IN ('${mivStages}');
                `);
            } else {
                query = await request.query(`
                SELECT  mmt_organisation.organisation_name as [Organisation/Wing], initiative_id  as [Initiative ID],
                    initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
                    status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
                    start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], 
                    outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,reasons_for_delay as [Reasons for Delay (if Any)],
                    latestImage AS [Recent Executive Summary & PPT of Initiative],
                    (
                        SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                        JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
                    ) AS [Source of Funding],Feedback,Response
                    FROM tbl_initiative 
                    INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                    LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
                
                WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND (tbl_initiative.organisation_id = @organisationID) AND 
                ${columnName} IN ('${mivStages}');
            `);
            }
            
        }
        else
        {
            if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5 || role_id === 8) {
                query = await request.query(`
                    SELECT mmt_organisation.organisation_name as [Organisation/Wing], initiative_id  as [Initiative ID],
                        initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
                        status_on  as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
                        start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], 
                        outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,reasons_for_delay as [Reasons for Delay (if Any)], latestImage AS [Recent Executive Summary & PPT of Initiative],
                        (
                            SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                            FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                            JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
                        ) AS [Source of Funding],Feedback,Response
                        FROM tbl_initiative 
                        INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
                        LEFT JOIN mmt_source_of_funding ON mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
                    WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND
                    ${columnName} IN (${mivStagesParam});
                `);
            } else {
                query = await request.query(`
                SELECT mmt_organisation.organisation_name as [Organisation/Wing], initiative_id  as [Initiative ID],
                    initiative_name as [Name of Initiative], total_cost as [Total Cost of Initiatives], category as [Initiative Category], 
                    status_on  as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)],
                    start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], 
                    outcomes,direct_Emp_Gen,inDirect_Emp_Gen,direct_Inv_Created,inDirect_Inv_Created,Outcomes_Remarks,reasons_for_delay as [Reasons for Delay (if Any)], latestImage AS [Recent Executive Summary & PPT of Initiative],
                    (
                        SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
                        FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
                        JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
                    ) AS [Source of Funding],Feedback,Response
                    FROM tbl_initiative 
                    INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
                    LEFT JOIN mmt_source_of_funding ON mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
                WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND (tbl_initiative.organisation_id = @organisationID) AND
                ${columnName} IN (${mivStagesParam});
            `);
            }
            
        }   

        // if(mivStageLength == 1)
        // {
        //     query = await request.query(`
        //         SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name as [Organisation/Wing], initiative_id as [Initiative ID],
        //             initiative_name as [Name of Initiative], tbl_initiative.total_cost as [Total Cost of Initiatives (Rs.Cr.)], category as [Initiative Category], 
        //             status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)], reasons_for_drop, reasons_for_delay as [Reasons for Delay (if Any)],
        //             start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], latestImage as [Recent Executive Summary & PPT of Initiative],
        //             (
        //                 SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
        //                 FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
        //                 JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
        //             ) AS [Source of Funding]
        //             FROM tbl_initiative 
        //             INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
        //             LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
                
        //         WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND
        //         ${columnName} IN ('${mivStages}');
        //     `);
            
        // }
        // else
        // {
        //     query = await request.query(`
        //         SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name as [Organisation/Wing], initiative_id as [Initiative ID],
        //             initiative_name as [Name of Initiative], tbl_initiative.total_cost as [Total Cost of Initiatives (Rs.Cr.)], category as [Initiative Category], 
        //             status_on as [Status as on 1st April 2023], status_current as [Current Status], physical_progress as [Physical progress (In Percentage)], reasons_for_delay as [Reasons for Delay (if Any)],
        //             start_date as [Start Date of Activity], completion_date as [Target Date of Completion of Initiative as per MIV 2030 document], actual_date as [Expected/ Actual Date of Competion], latestImage as [Recent Executive Summary & PPT of Initiative],
        //             (
        //                 SELECT STRING_AGG(mmt_source_of_funding.source_of_funding_name, ', ')
        //                 FROM STRING_SPLIT(CONVERT(varchar(max), CONVERT(nvarchar(max), tbl_initiative.source_of_funding)), ',') AS ssf
        //                 JOIN mmt_source_of_funding ON TRY_CAST(ssf.value AS int) = mmt_source_of_funding.source_of_funding_id
        //             ) AS [Source of Funding]
        //             FROM tbl_initiative 
        //             INNER JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
        //             LEFT JOIN mmt_source_of_funding ON mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
        //         WHERE (tbl_initiative.theme_initiative = @initiativeThemeID) AND
        //         ${columnName} IN (${mivStagesParam});
        //     `);
            
        // }   

        // console.log('initiativeThemeID',initiativeThemeID);
        // console.log('columnName', columnName);
        // console.log('mivstges', mivStagesParam);
        // // console.log(`${mivStages.reduce((prev, curr) => `'${prev}','${curr}'`)}) ;`);
        // console.log('Query:', query);

        const rowData = query.recordset; 

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [
            {
                headerName: "Organisation/Wing",
                field: "Organisation/Wing",
                headerClass : "headerGroup",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Initiative ID",
                field: "Initiative ID",
                headerClass : "headerGroup",
            },
            {
                headerName: "Name of Initiative",
                field: "Name of Initiative",
                headerClass : "headerGroup",
            },
            {
                headerName: "Total Cost of Initiatives (In.Cr)",
                field: "Total Cost of Initiatives",
                headerClass : "headerGroup",
            },
            {
                headerName: "Initiative Category",
                field: "Initiative Category",
                headerClass : "headerGroup",
            },
            {
                headerName: "Status as on 1st April 2023",
                field: "Status as on 1st April 2023",
                headerClass : "headerGroup",
            },
            {
                headerName: "Current Status",
                field: "Current Status",
                headerClass : "headerGroup",
            },
            {
                headerName: "Physical progress (In Percentage)",
                field: "Physical progress (In Percentage)",
                headerClass : "headerGroup",
            },{
                headerName: "Timelines",
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "Start Date of Activity",
                        field: "Start Date of Activity",
                        headerClass : "headerGroup",
                    },{
                        headerName: "Target Date of Completion of Initiative as per MIV 2030 document",
                        field: "Target Date of Completion of Initiative as per MIV 2030 document",
                        headerClass : "headerGroup",
                        width: 350,
                    },
                    {
                        headerName: "Expected/ Actual Date of Competion",
                        field: "Expected/ Actual Date of Competion",
                        headerClass : "headerGroup",
                        width: 220,
                    }
                ]
            },{
                headerName: "Outcomes",
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "Output / Outcome of the completed initiative",
                        field: "outcomes",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Direct Employment Generated (No. of People)",
                        field: "direct_Emp_Gen",
                        headerClass : "headerGroup",
                        width: 250,
                    },{
                        headerName: "Indirect Employment Generated (No. of People)",
                        field: "inDirect_Emp_Gen",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Direct Investment Created (In.Cr)",
                        field: "direct_Inv_Created",
                        headerClass : "headerGroup",
                        width: 200,
                    },
                    {
                        headerName: "Indirect Investment Created (In.Cr)",
                        field: "inDirect_Inv_Created",
                        headerClass : "headerGroup",
                        width: 250,
                    },
                    {
                        headerName: "Output/Outcomes Remarks",
                        field: "Outcomes_Remarks",
                        headerClass : "headerGroup",
                    }
                ]
            },{
                headerName: "Reasons for Delay (if Any)",
                field: "Reasons for Delay (if Any)",
                headerClass : "headerGroup",
            },{
                headerName: "Recent Executive Summary & PPT of Initiative",
                field: "Recent Executive Summary & PPT of Initiative",
                headerClass : "headerGroup",
            },{
                headerName: "Source of Funding",
                field: "Source of Funding",
                headerClass : "headerGroup",
            },{
                headerName: "Feedback",
                field: "Feedback",
                headerClass : "headerGroup",
            },{
                headerName: "Response",
                field: "Response",
                headerClass : "headerGroup",
            }
        ];
        
        // const columnDefs = Object.keys(rowData[0]).map(key => ({
        //     headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
        //     field: key,
        // }));

        res.json({ columnDefs, rowData });


    } catch (err) {
        console.error('Error:', err);
        res.sendStatus(500);
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadDocument(req, res) 
{
    try 
    {
        const fileName = req.params.filename;
        const file_path = path.join(__dirname, "../../../fileuploads/MIV/initiatives", fileName);

        try {
            await access(file_path);
            const fileStats = await stat(file_path);

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fileStats.size);

            // Create a readable stream and pipe it to the response
            const fileStream = createReadStream(file_path);
            fileStream.pipe(res);

        } catch (error) {
            console.error("File not found on the server.");
            res.status(404).send({ message: "File not found" });
        }
    } 
    catch (err) 
    {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

//-----------------------------------------------------------------------Delete logic--------------------------------------------------------------------------
async function deleteMeeting(req, res) {
    try {
        const id = req.params.id;
        const conn = await pool;

        const result = await conn.query(
            `SELECT file_name FROM tbl_meeting_document WHERE meeting_document_id = ${id}`
        );
        
        const fileName = result.recordset[0].file_name;
        
       if(fileName){
            if (fs.existsSync(`./fileuploads/MIV/meeting/${fileName}`)) {
            
                fs.unlink(`./fileuploads/MIV/meeting/${fileName}`, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                    }
                });
            } 
       }

        const deleteRecord = await conn.query(`Delete FROM tbl_meeting_document WHERE meeting_document_id = ${id}`);
        
        res.status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

async function getCategoryWiseMIVPerformanceReport(req,res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const userID = req.params.userID;

         const userRequest = conn.request();
        userRequest.input("userID", userID);

        const userResult = await userRequest.query(`
            SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = @userID
        `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const { role_id, organisation_id } = userResult.recordset[0];
        const allOrganisationRoles = [1, 2, 3, 4, 5, 8];

        let result;

        if (allOrganisationRoles.includes(Number(role_id))) {

            const request = conn.request();
            result = await request.query(`
            select ini.category,

            COUNT(ini.initiative_id) AS [Total Initiatives],
                SUM(ISNULL(ini.total_cost, 0)) AS [Total Investment (Cr.)],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Completed],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Under Implementation - On Time'
                        THEN 1
                        ELSE 0
                    END
                ) AS [In Progress - On Time],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Under Implementation - Delayed'
                        THEN 1
                        ELSE 0
                    END
                ) AS [In Progress - Delayed],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Yet to be Started'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Not Started]


            from tbl_initiative ini
            GROUP BY 
                ini.category
            `);

        } else {
            const request = conn.request();
            request.input( "organisation_id", organisation_id );
            result = await request.query(`
            select ini.category,

            COUNT(ini.initiative_id) AS [Total Initiatives],
                SUM(ISNULL(ini.total_cost, 0)) AS [Total Investment (Cr.)],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Completed],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Under Implementation - On Time'
                        THEN 1
                        ELSE 0
                    END
                ) AS [In Progress - On Time],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Under Implementation - Delayed'
                        THEN 1
                        ELSE 0
                    END
                ) AS [In Progress - Delayed],
                SUM(
                    CASE
                        WHEN ini.status_current = 'Yet to be Started'
                        THEN 1
                        ELSE 0
                    END
                ) AS [Not Started]


            from tbl_initiative ini
            WHERE ini.organisation_id = @organisation_id
            GROUP BY 
                ini.category
            `);

        }

       return res.json({ rows: result.recordset });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const ALL_ORGANISATION_ROLES = [1, 2, 3, 4, 5, 8];


// ============================================================
// REPORT 1.4
// SUMMARY REPORT - DELAYED / OVERDUE INITIATIVES
// ============================================================

async function getSummaryReportOverdueInitiatives(req, res) {
    try {
        const conn = await pool;

        const userID = Number(req.params.userID);

        // ------------------------------------------------------
        // Validate userID
        // ------------------------------------------------------

        if (!Number.isInteger(userID) || userID <= 0) {
            return res.status(400).json({
                message: "Invalid userID"
            });
        }

        // ------------------------------------------------------
        // Get user role + organisation
        // ------------------------------------------------------

        const userRequest = conn.request();

        userRequest.input("userID", userID);

        const userResult = await userRequest.query(`
            SELECT
                role_id,
                organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const {
            role_id,
            organisation_id
        } = userResult.recordset[0];

        const userRoleId = Number(role_id);
        const userOrganisationId = Number(organisation_id);

        const canViewAllOrganisations =
            ALL_ORGANISATION_ROLES.includes(userRoleId);

        // ------------------------------------------------------
        // Organisation validation
        // ------------------------------------------------------

        if (
            !canViewAllOrganisations &&
            (!Number.isInteger(userOrganisationId) ||
                userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }

        // ------------------------------------------------------
        // Query
        // ------------------------------------------------------

        const request = conn.request();

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );
        }

        /*
         * IMPORTANT
         *
         * We calculate overdue days using:
         *
         * actual_date -> today
         *
         * This is the same logic used by Report 1.5.
         */

        const organisationFilter = canViewAllOrganisations
            ? ""
            : `
                AND ini.organisation_id = @organisation_id
            `;

        const result = await request.query(`
            WITH InitiativeDelay AS (
                SELECT
                    ini.initiative_id,

                    ini.organisation_id,

                    mmt.organisation_name,

                    ini.actual_date,

                    ISNULL(
                        ini.total_cost,
                        0
                    ) AS total_cost,

                    DATEDIFF(
                        DAY,
                        ini.actual_date,
                        CAST(GETDATE() AS DATE)
                    ) AS delay_days

                FROM tbl_initiative ini

                INNER JOIN mmt_organisation mmt
                    ON ini.organisation_id =
                       mmt.organisation_id

                WHERE
                    ini.actual_date IS NOT NULL

                    ${organisationFilter}
            )

            SELECT
                organisation_id,

                organisation_name,

                /*
                 * Total delayed initiatives
                 */
                COUNT(
                    CASE
                        WHEN delay_days > 0
                        THEN 1
                    END
                ) AS total_delayed_initiatives,

                /*
                 * Delayed < 6 Months
                 */
                COUNT(
                    CASE
                        WHEN delay_days > 0
                         AND delay_days < 180
                        THEN 1
                    END
                ) AS delayed_less_than_6_months,

                /*
                 * Delayed 6-12 Months
                 */
                COUNT(
                    CASE
                        WHEN delay_days >= 180
                         AND delay_days < 365
                        THEN 1
                    END
                ) AS delayed_6_12_months,

                /*
                 * Severely Delayed > 1 Year
                 */
                COUNT(
                    CASE
                        WHEN delay_days >= 365
                        THEN 1
                    END
                ) AS severely_delayed_more_than_1_year,

                /*
                 * Total cost of delayed initiatives
                 */
                SUM(
                    CASE
                        WHEN delay_days > 0
                        THEN total_cost
                        ELSE 0
                    END
                ) AS total_cost

            FROM InitiativeDelay

            /*
             * Only organisations having
             * at least one delayed initiative
             */
            GROUP BY
                organisation_id,
                organisation_name

            HAVING
                COUNT(
                    CASE
                        WHEN delay_days > 0
                        THEN 1
                    END
                ) > 0

            ORDER BY
                organisation_name;
        `);

        // ------------------------------------------------------
        // Response
        // ------------------------------------------------------

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {

        console.error(
            "getSummaryReportOverdueInitiatives Error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}


// ============================================================
// REPORT 1.5
// DETAILED REPORT - DELAYED / OVERDUE INITIATIVES
// ============================================================

async function detailedReportDelayedOverdueInitiatives(req, res) {
    try {
        const conn = await pool;

        const userID = Number(req.params.userID);

        // ------------------------------------------------------
        // Validate userID
        // ------------------------------------------------------

        if (!Number.isInteger(userID) || userID <= 0) {
            return res.status(400).json({
                message: "Invalid userID"
            });
        }

        // ------------------------------------------------------
        // Get user role + organisation
        // ------------------------------------------------------

        const userRequest = conn.request();

        userRequest.input("userID", userID);

        const userResult = await userRequest.query(`
            SELECT
                role_id,
                organisation_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const {
            role_id,
            organisation_id
        } = userResult.recordset[0];

        const userRoleId = Number(role_id);
        const userOrganisationId = Number(organisation_id);

        const canViewAllOrganisations =
            ALL_ORGANISATION_ROLES.includes(userRoleId);

        // ------------------------------------------------------
        // Organisation validation
        // ------------------------------------------------------

        if (
            !canViewAllOrganisations &&
            (!Number.isInteger(userOrganisationId) ||
                userOrganisationId <= 0)
        ) {
            return res.status(403).json({
                message: "User is not mapped to an organisation"
            });
        }

        // ------------------------------------------------------
        // Request
        // ------------------------------------------------------

        const request = conn.request();

        if (!canViewAllOrganisations) {
            request.input(
                "organisation_id",
                userOrganisationId
            );
        }

        // ------------------------------------------------------
        // Organisation filter
        // ------------------------------------------------------

        const organisationFilter = canViewAllOrganisations
            ? ""
            : `
                AND ini.organisation_id = @organisation_id
            `;

        // ------------------------------------------------------
        // Detailed query
        // ------------------------------------------------------

        const result = await request.query(`
            SELECT

                ROW_NUMBER() OVER (
                    ORDER BY
                        mmt.organisation_name,
                        ini.actual_date,
                        ini.initiative_id
                ) AS sno,

                /*
                 * Organisation
                 */
                mmt.organisation_name
                    AS organisation_name,

                /*
                 * Initiative
                 */
                ini.initiative_id
                    AS initiative_id,

                ini.initiative_name
                    AS initiative_name,

                /*
                 * Category
                 */
                ini.category
                    AS category,

                /*
                 * Cost
                 */
                ISNULL(
                    ini.total_cost,
                    0
                ) AS total_cost,

                /*
                 * Expected / Actual completion date
                 */
                ini.actual_date
                    AS expected_actual_completion_date,

                /*
                 * Days overdue
                 */
                DATEDIFF(
                    DAY,
                    ini.actual_date,
                    CAST(GETDATE() AS DATE)
                ) AS days_overdue,

                /*
                 * Reason for delay
                 */
                ISNULL(
                    ini.reasons_for_delay,
                    '-'
                ) AS reason_for_delay,

                /*
                 * Severity
                 */
                CASE

                    WHEN DATEDIFF(
                        DAY,
                        ini.actual_date,
                        CAST(GETDATE() AS DATE)
                    ) < 180
                    THEN 'Delayed < 6 Months'

                    WHEN DATEDIFF(
                        DAY,
                        ini.actual_date,
                        CAST(GETDATE() AS DATE)
                    ) < 365
                    THEN 'Delayed 6-12 Months'

                    ELSE
                        'Severely Delayed > 1 Year'

                END AS severity_status

            FROM tbl_initiative ini

            INNER JOIN mmt_organisation mmt
                ON ini.organisation_id =
                   mmt.organisation_id

            WHERE

                /*
                 * Completion / expected date exists
                 */
                ini.actual_date IS NOT NULL

                /*
                 * Only overdue initiatives
                 */
                AND ini.actual_date <
                    CAST(GETDATE() AS DATE)

                /*
                 * Organisation restriction
                 */
                ${organisationFilter}

            ORDER BY
                mmt.organisation_name,
                ini.actual_date,
                ini.initiative_id;
        `);

        // ------------------------------------------------------
        // Response
        // ------------------------------------------------------

        return res.status(200).json({
            rows: result.recordset
        });

    } catch (err) {

        console.error(
            "detailedReportDelayedOverdueInitiatives Error:",
            err
        );

        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
}

export default { mivDetailedData, mivThemeDetailedData, downloadDocument,  getmmtThemeValues, deleteMeeting,
   getMIVOrgWisePerformanceReport,getThemeWiseMIVPerformanceReport, getCategoryWiseMIVPerformanceReport,getSummaryReportOverdueInitiatives,detailedReportDelayedOverdueInitiatives
};