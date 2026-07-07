import { pool } from "../../db.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import fs from 'fs';
// import mssql from "mssql";

async function mivAbstractData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const userID = req.params.userID;

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        let result, countResult, iniCountResult, totalCostResult;
        // console.log(role_id);
        if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5 || role_id === 8) {
            result = await request.query(`
                SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
                initiative_name, total_cost, category, source_of_funding, status_on, status_current, 
                physical_progress, reasons_for_drop, reasons_for_delay, start_date, completion_date, actual_date, latestImage
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id                
            ;`);

            countResult = await request.query(`
                SELECT count(meeting_document_id) as meeting_document_id,
                tbl_meeting_document.organisation_id, mmt_organisation.organisation_name
                FROM tbl_meeting_document 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_meeting_document.organisation_id
                Group By tbl_meeting_document.organisation_id, mmt_organisation.organisation_name
            ;`);

            iniCountResult = await request.query(`
                SELECT count(initiative_id) as initiative_id,
                tbl_initiative.organisation_id, mmt_organisation.organisation_name
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                Group By tbl_initiative.organisation_id, mmt_organisation.organisation_name
            ;`);

            totalCostResult = await request.query(`
                SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, 
                sum(total_cost) as total_cost
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                Group By tbl_initiative.organisation_id, mmt_organisation.organisation_name
            ;`);
        } else {
            result = await request.query(`
                SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, initiative_id,
                initiative_name, total_cost, category, source_of_funding, status_on, status_current, 
                physical_progress, reasons_for_drop, reasons_for_delay, start_date, completion_date, actual_date, latestImage
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                WHERE tbl_initiative.organisation_id = ${organisation_id}
            ;`);

            countResult = await request.query(`
                SELECT count(meeting_document_id) as meeting_document_id,
                tbl_meeting_document.organisation_id, mmt_organisation.organisation_name
                FROM tbl_meeting_document 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_meeting_document.organisation_id
                WHERE tbl_meeting_document.organisation_id = ${organisation_id}
                Group By tbl_meeting_document.organisation_id, mmt_organisation.organisation_name
            ;`);

            iniCountResult = await request.query(`
                SELECT count(initiative_id) as initiative_id,
                tbl_initiative.organisation_id, mmt_organisation.organisation_name
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                WHERE tbl_initiative.organisation_id = ${organisation_id}
                Group By tbl_initiative.organisation_id, mmt_organisation.organisation_name
            ;`);

            totalCostResult = await request.query(`
                SELECT tbl_initiative.organisation_id, mmt_organisation.organisation_name, 
                round(sum(total_cost), 2) as total_cost
                FROM tbl_initiative 
                INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
                WHERE tbl_initiative.organisation_id = ${organisation_id}
                Group By tbl_initiative.organisation_id, mmt_organisation.organisation_name
            ;`);
        }

        const response = {
            rows: result.recordset,
            count: countResult.recordset,
            initiative: iniCountResult.recordset,
            totalCost: totalCostResult.recordset
        };

        res.json(response);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
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
async function themeWiseMivAbstractData(req, res) {
    // console.log("function worked!");
    try {
        const conn = await pool;
        const request = conn.request();
        const userID = req.params.userID;

        const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id, organisation_id } = userResult.recordset[0];

        const organisationId = organisation_id; 
        request.input("organisationId", organisationId);

        let result;

        if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 || role_id === 5 || role_id === 8) {
            result = await request.query(`
                WITH DistinctCategories AS (
                    SELECT DISTINCT mmt_theme_initiative.theme_initiative_id, tbl_initiative.category
                    FROM sagarmanthan_revamp.dbo.tbl_initiative
                    JOIN sagarmanthan_revamp.dbo.mmt_theme_initiative ON tbl_initiative.theme_initiative = mmt_theme_initiative.theme_initiative_id
                ), InitiativeData AS (
                    SELECT
                        mmt_theme_initiative.initiative_name AS 'Theme Name',
                        mmt_theme_initiative.theme_initiative_id AS 'Theme ID',
                        (
                            SELECT STRING_AGG(DC.category, ', ')
                            FROM DistinctCategories DC
                            WHERE DC.theme_initiative_id = mmt_theme_initiative.theme_initiative_id
                        ) AS Category,
                        --SUM(CASE WHEN tbl_initiative.status_current IN ('Under Implementation', 'Delayed') THEN 1 ELSE 0 END) AS Number_of_Initiatives_Under_Implementation_Current,
                        SUM(CASE WHEN tbl_initiative.status_current = 'Completed' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Completed,
                        SUM(CASE WHEN tbl_initiative.status_on = 'Under Implementation - On Time' OR tbl_initiative.status_on = 'Under Implementation - Delayed' OR tbl_initiative.status_on = 'Yet to be Started' THEN 1 ELSE 0 END) AS To_be_Completed,
                        SUM(CASE WHEN tbl_initiative.status_current = 'Under Implementation - On Time' THEN 1 ELSE 0 END) AS Current_Under_Implementation_On_Time_Current,
                        SUM(CASE WHEN tbl_initiative.status_current = 'Under Implementation - Delayed' THEN 1 ELSE 0 END) AS Current_Under_Implementation_Delayed_Current,
                        SUM(CASE WHEN tbl_initiative.status_current = 'Yet to be Started' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Yet_to_be_Started_Current,
                        SUM(CASE WHEN tbl_initiative.status_current = 'Dropped' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Dropped_Current,
                        SUM(CASE WHEN tbl_initiative.status_on IN ('Under Implementation', 'Delayed') THEN 1 ELSE 0 END) AS Number_of_Initiatives_Under_Implementation_On,
                        SUM(CASE WHEN tbl_initiative.status_on = 'Completed' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Completed_On,
                        SUM(CASE WHEN tbl_initiative.status_on = 'Under Implementation - On Time' OR tbl_initiative.status_on = 'Under Implementation - Delayed' THEN 1 ELSE 0 END) AS Current_Under_Implementation_On,
                        SUM(CASE WHEN tbl_initiative.status_on = 'Yet to be Started' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Yet_to_be_Started_On,
                        SUM(CASE WHEN tbl_initiative.status_on = 'Dropped' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Dropped_On,
                        COUNT(tbl_initiative.theme_initiative) AS Total_Number_of_Initiatives_Current,
                        SUM(tbl_initiative.total_cost) AS Total_Cost_of_Initiatives_Current,
                        COUNT(CASE WHEN tbl_initiative.status_on IS NOT NULL THEN tbl_initiative.theme_initiative END) AS Total_Number_of_Initiatives_On,
                        SUM(CASE WHEN tbl_initiative.status_on IS NOT NULL THEN tbl_initiative.total_cost ELSE 0 END) AS Total_Cost_of_Initiatives_On
                    FROM
                        sagarmanthan_revamp.dbo.mmt_theme_initiative
                    LEFT JOIN
                        sagarmanthan_revamp.dbo.tbl_initiative ON mmt_theme_initiative.theme_initiative_id = tbl_initiative.theme_initiative
                    GROUP BY
                        mmt_theme_initiative.theme_initiative_id, mmt_theme_initiative.initiative_name
                )
                SELECT
                    ID.[Theme ID] AS 'InitiativeId',
                    ID.[Theme Name] AS 'InitiativeName',
                    ID.Category AS 'TotalInitiativeCategory',
                    ID.Total_Number_of_Initiatives_Current AS 'TotalIniCount',
                    ID.Total_Cost_of_Initiatives_Current AS 'TotalInitiativeCost',
                    ID.Current_Under_Implementation_On AS 'NoOfInitiativeUI',
                    ID.Number_of_Initiatives_Completed_On AS 'Completed',
                    ID.To_be_Completed AS 'NoOfInitiativeToBeCompleted',
                    ID.Current_Under_Implementation_On_Time_Current AS 'CurrentUnderImplementationOnTime',
                    ID.Current_Under_Implementation_Delayed_Current AS 'CurrentUnderImplementationDelayed',
                    ID.Number_of_Initiatives_Completed AS 'CurrentCompleted',
                    ID.Number_of_Initiatives_Yet_to_be_Started_Current AS 'CurrentYetToBeStarted',
                    ID.Number_of_Initiatives_Dropped_Current AS 'CurrentDropped'
                FROM
                    InitiativeData ID;            
            `);

        } else {
            result = await request.query(`
            WITH DistinctCategories AS (
                SELECT DISTINCT mmt_theme_initiative.theme_initiative_id, tbl_initiative.category
                FROM sagarmanthan_revamp.dbo.tbl_initiative
                JOIN sagarmanthan_revamp.dbo.mmt_theme_initiative ON tbl_initiative.theme_initiative = mmt_theme_initiative.theme_initiative_id
            ), InitiativeData AS (
                SELECT
                    mmt_theme_initiative.initiative_name AS 'Theme Name',
                    mmt_theme_initiative.theme_initiative_id AS 'Theme ID',
                    (
                        SELECT STRING_AGG(DC.category, ', ')
                        FROM DistinctCategories DC
                        WHERE DC.theme_initiative_id = mmt_theme_initiative.theme_initiative_id
                    ) AS Category,
                    --SUM(CASE WHEN tbl_initiative.status_current IN ('Under Implementation', 'Delayed') THEN 1 ELSE 0 END) AS Number_of_Initiatives_Under_Implementation_Current,
                    SUM(CASE WHEN tbl_initiative.status_current = 'Completed' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Completed,
                    SUM(CASE WHEN tbl_initiative.status_on = 'Under Implementation - On Time' OR tbl_initiative.status_on = 'Under Implementation - Delayed' OR tbl_initiative.status_on = 'Yet to be Started' THEN 1 ELSE 0 END) AS To_be_Completed,
                    SUM(CASE WHEN tbl_initiative.status_current = 'Under Implementation - On Time' THEN 1 ELSE 0 END) AS Current_Under_Implementation_On_Time_Current,
                    SUM(CASE WHEN tbl_initiative.status_current = 'Under Implementation - Delayed' THEN 1 ELSE 0 END) AS Current_Under_Implementation_Delayed_Current,
                    SUM(CASE WHEN tbl_initiative.status_current = 'Yet to be Started' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Yet_to_be_Started_Current,
                    SUM(CASE WHEN tbl_initiative.status_current = 'Dropped' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Dropped_Current,
                    SUM(CASE WHEN tbl_initiative.status_on IN ('Under Implementation', 'Delayed') THEN 1 ELSE 0 END) AS Number_of_Initiatives_Under_Implementation_On,
                    SUM(CASE WHEN tbl_initiative.status_on = 'Completed' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Completed_On,
                    SUM(CASE WHEN tbl_initiative.status_on = 'Under Implementation - On Time' OR tbl_initiative.status_on = 'Under Implementation - Delayed' THEN 1 ELSE 0 END) AS Current_Under_Implementation_On,
                    SUM(CASE WHEN tbl_initiative.status_on = 'Yet to be Started' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Yet_to_be_Started_On,
                    SUM(CASE WHEN tbl_initiative.status_on = 'Dropped' THEN 1 ELSE 0 END) AS Number_of_Initiatives_Dropped_On,
                    COUNT(tbl_initiative.theme_initiative) AS Total_Number_of_Initiatives_Current,
                    SUM(tbl_initiative.total_cost) AS Total_Cost_of_Initiatives_Current,
                    COUNT(CASE WHEN tbl_initiative.status_on IS NOT NULL THEN tbl_initiative.theme_initiative END) AS Total_Number_of_Initiatives_On,
                    SUM(CASE WHEN tbl_initiative.status_on IS NOT NULL THEN tbl_initiative.total_cost ELSE 0 END) AS Total_Cost_of_Initiatives_On
                FROM
                    sagarmanthan_revamp.dbo.mmt_theme_initiative
                LEFT JOIN
                    sagarmanthan_revamp.dbo.tbl_initiative ON mmt_theme_initiative.theme_initiative_id = tbl_initiative.theme_initiative
                WHERE
                    tbl_initiative.organisation_id = @organisationId 
                GROUP BY
                    mmt_theme_initiative.theme_initiative_id, mmt_theme_initiative.initiative_name
            )
            SELECT
                ID.[Theme ID] AS 'InitiativeId',
                ID.[Theme Name] AS 'InitiativeName',
                ID.Category AS 'TotalInitiativeCategory',
                ID.Total_Number_of_Initiatives_Current AS 'TotalIniCount',
                ID.Total_Cost_of_Initiatives_Current AS 'TotalInitiativeCost',
                ID.Current_Under_Implementation_On AS 'NoOfInitiativeUI',
                ID.Number_of_Initiatives_Completed_On AS 'Completed',
                ID.To_be_Completed AS 'NoOfInitiativeToBeCompleted',
                ID.Current_Under_Implementation_On_Time_Current AS 'CurrentUnderImplementationOnTime',
                ID.Current_Under_Implementation_Delayed_Current AS 'CurrentUnderImplementationDelayed',
                ID.Number_of_Initiatives_Completed AS 'CurrentCompleted',
                ID.Number_of_Initiatives_Yet_to_be_Started_Current AS 'CurrentYetToBeStarted',
                ID.Number_of_Initiatives_Dropped_Current AS 'CurrentDropped'
            FROM
                InitiativeData ID;           
            `);

        }

        const rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const currentDate = new Date();
        // Format the date as "dd-mm-yyyy"
        const formattedDate = currentDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        let columnDefs = [
            { headerName: 'Theme Name', field: 'InitiativeName', },
            { headerName: 'Organisation/Wing ID', field: 'OrganisationID', },
            { headerName: 'Theme ID', field: 'InitiativeId', },
            { headerName: 'Category', field: 'TotalInitiativeCategory', },
            { headerName: 'Total Number of Initiatives', field: 'TotalIniCount', },
            { headerName: 'Total Cost of Initiatives (In.Cr)', field: 'TotalInitiativeCost',
            valueFormatter: params => {
                if (typeof params.value === 'number') {
                return params.value.toFixed(2);
                } else {
                return params.value;
                }
            } },
            {
                headerName: 'Status as on 1st April 2023',
                headerClass : "headercenter",
                children: [
                    { headerName: 'Number of Initiatives Under Implementation', field: 'NoOfInitiativeUI', },
                    { headerName: 'Number of Initiatives Completed', field: 'Completed', },
                ]
            },
            {
                headerName: `Status as on ${formattedDate}`,
                headerClass : "headercenter",
                children: [
                { headerName: 'No. of Initiative To Be Completed', field: 'NoOfInitiativeToBeCompleted', },
                {
                    headerName: 'Number of Initiatives Under Implementation',
                    headerClass : "headercenter",
                    children: [
                        { 
                            headerName: 'Current Under Implementation On Time', 
                            field: 'CurrentUnderImplementationOnTime', 
                            width:250
                        },
                        { 
                            headerName: 'Current Under Implementation Delayed', 
                            field: 'CurrentUnderImplementationDelayed', 
                            width:250
                        }
                    ]
                },{ headerName: 'Number of Initiatives Completed', field: 'CurrentCompleted', },
                { headerName: 'Number of Initiatives Yet to be Started', field: 'CurrentYetToBeStarted', },
                { headerName: 'Number of Initiatives Dropped', field: 'CurrentDropped', },
                ]
            },];

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

//Normal data table code 
// async function themeWiseMivAbstractData(req, res) {
//     // console.log("function worked!");
//     try {
//         const conn = await pool;
//         const request = conn.request();
//         const userID = req.params.userID;

//         const userResult = await request.query(` SELECT role_id, organisation_id FROM tbl_user
//             WHERE user_id = ${userID}
//         `);

//         const { role_id, organisation_id } = userResult.recordset[0];

//         let result, themeInitiativeResult, categoryResult;

//         if (role_id === 1 || role_id === 2 || role_id === 3 || role_id === 4 ||role_id === 6) {
//             // console.log('if query worked');
//             result = await request.query(`
//                 SELECT 
//                     mti.theme_initiative_id, 
//                     mti.initiative_name AS theme_Name,
//                     ti.total_cost,
//                     ti.status_on,
//                     ti.status_current,
//                     ti.organisation_id,
//                     ti.initiative_name,
//                     mo.organisation_name
//                 FROM 
//                     mmt_theme_initiative mti
//                 LEFT JOIN 
//                     tbl_initiative ti ON mti.theme_initiative_id = ti.theme_Initiative
//                 LEFT JOIN 
//                     mmt_organisation mo ON mo.organisation_id = ti.organisation_id
//                 ORDER BY 
//                     mti.theme_initiative_id
//             `);

//             themeInitiativeResult = await request.query(`
//                 SELECT 
//                     mti.theme_initiative_id,
//                     mti.initiative_name,
//                     COUNT(ti.theme_initiative) AS total_theme_initiative_count,
//                     SUM(ti.total_cost) AS total_cost
//                 FROM 
//                     mmt_theme_initiative mti
//                 LEFT JOIN 
//                     tbl_initiative ti ON mti.theme_initiative_id = ti.theme_initiative
//                 GROUP BY 
//                     mti.theme_initiative_id, mti.initiative_name
//             ;`);

//             categoryResult = await request.query(`
//                 SELECT 
//                 mti.theme_initiative_id,
//                 mti.initiative_name AS theme_Name,
//                 STRING_AGG(ti.category, ', ') AS categories
//             FROM 
//                 mmt_theme_initiative mti
//             LEFT JOIN 
//                 tbl_initiative ti ON mti.theme_initiative_id = ti.theme_Initiative
//             GROUP BY 
//                 mti.theme_initiative_id, mti.initiative_name
//             ;`);

//         } else {

//             // console.log('else query worked');
//             result = await request.query(`
//                 SELECT
//                     initiative_id,
//                     theme_Initiative AS initiative_name,
//                     SUM(total_cost) AS total_cost,
//                     mmt_organisation.organisation_id,
//                     mmt_organisation.organisation_name,
//                     status_on,
//                     status_current
//                 FROM
//                     tbl_initiative
//                 INNER JOIN
//                     mmt_organisation ON mmt_organisation.organisation_id = tbl_initiative.organisation_id
//                 WHERE
//                     tbl_initiative.organisation_id = ${organisation_id}
//                 GROUP BY
//                     initiative_id, theme_Initiative, mmt_organisation.organisation_id, mmt_organisation.organisation_name, status_on, status_current
//             ;`);

//             themeInitiativeResult = await request.query(`
//                 SELECT 
//                     mti.theme_initiative_id,
//                     mti.initiative_name,
//                     COUNT(ti.theme_initiative) AS total_theme_initiative_count
//                 FROM 
//                     mmt_theme_initiative mti
//                 LEFT JOIN 
//                     tbl_initiative ti ON mti.theme_initiative_id = ti.theme_initiative
//                 GROUP BY 
//                     mti.theme_initiative_id, mti.initiative_name
//                 WHERE tbl_initiative.organisation_id = ${organisation_id}
//             ;`);
//             categoryResult = await request.query(`
//                 SELECT 
//                 mti.theme_initiative_id,
//                 mti.initiative_name,
//                 STRING_AGG(ti.category, ', ') AS categories
//             FROM 
//                 mmt_theme_initiative mti
//             LEFT JOIN 
//                 tbl_initiative ti ON mti.theme_initiative_id = ti.theme_Initiative
//             GROUP BY 
//                 mti.theme_initiative_id, mti.initiative_name
//             WHERE tbl_initiative.organisation_id = ${organisation_id}
//             ;`);
//         }

//         const response = {
//             rows: result.recordset,
//             themeinitiative: themeInitiativeResult.recordset,
//             category: categoryResult.recordset
//         };

//         res.json(response);
//     } catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }

// SELECT tbl_initiative.source_of_funding,
// 	 stuff(
//                    (SELECT
//                         ', ' + mmt_source_of_funding.source_of_funding_name  --use this if you want quotes around the names:  ', ''' + p2.name+''''
//                         FROM  mmt_source_of_funding
//                         WHERE mmt_source_of_funding.source_of_funding_id=tbl_initiative.source_of_funding
                      
//                         FOR XML PATH('') 
//                    )
//                    ,1,2, ''
//                ) AS Names,


// status_on, status_current, physical_progress, reasons_for_drop, reasons_for_delay,
// start_date, completion_date, actual_date, latestImage
// FROM tbl_initiative 
// INNER JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_initiative.organisation_id
// LEFT JOIN mmt_source_of_funding on mmt_source_of_funding.source_of_funding_id = tbl_initiative.source_of_funding
        
// WHERE (tbl_initiative.organisation_id = 12)


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

export default { mivDetailedData, mivThemeDetailedData, mivAbstractData, downloadDocument, themeWiseMivAbstractData , getmmtThemeValues, deleteMeeting};