import { pool } from "../../db.js";
import moment from 'moment';


async function delayedProjectReport (req, res)
{
     try {
        const conn = await pool;
        const request = conn.request();
        function getFinancialYears(baseDate = new Date()) {
            const currentMonth = baseDate.getMonth(); // 0-indexed
            const currentYear = baseDate.getFullYear();

            const startYear1 = currentMonth >= 3 ? currentYear : currentYear - 1;
            const endYear = startYear1 + 1;

            const currentFinancialYear = `${startYear1}-${endYear}`;
            const previousFinancialYear = `${startYear1 - 1}-${startYear1}`;

            return { startYear1, endYear, currentFinancialYear, previousFinancialYear };
        }

        const { startYear1, endYear, currentFinancialYear, previousFinancialYear } = getFinancialYears();
        console.log(startYear1)

        let result = await request.query(` SELECT Distinct
            -- Identifiers
            -- p.project_id as projectID,
            -- sp.sub_project_id as subProjectID,
            ISNULL(sp.sub_project_id, p.project_id) AS projectID,

            -- Names
            p.project_name As projectName,
            sp.sub_project_name as subProjectName,
         --   ISNULL(sp.sub_project_name, p.project_name) AS project_name,

            -- Organisation IDs
            p.organisation_id AS organisationID,

            -- Organisations
            o.organisation_name AS organisationName,

            -- Mode of Implementation and Award Cost (fallbacks)
            ISNULL(sp.sub_mode_of_implememtation, p.mode_of_implememtation) AS modeOfImplememtation,
            ISNULL(sp.sub_award_project_cost, p.award_project_cost) AS awardProjectCost,

            -- Target Completion Date (fallback)
            ISNULL(sp.sub_target_completion_date, p.target_completion_date) AS targetCompletionDate,

            -- Actual Completion Date (sub-project or project) using COALESCE
            COALESCE(sp.sub_actual_date_of_completion, p.actual_date_of_completion) AS expectedCompletionDate,

            -- Delay in days (compare target or actual completion date with current date)
            DATEDIFF(
                DAY,
                COALESCE(sp.sub_actual_date_of_completion, sp.sub_target_completion_date, p.actual_date_of_completion, p.target_completion_date),
                GETDATE()
            ) AS delayedDays,

            -- Current Stage Name (fallback from sub-project to project)
            ISNULL(sps.stage_name, ps.stage_name) AS currentStage

        FROM tbl_project p
        LEFT JOIN tbl_sub_project sp ON p.project_id = sp.project_id

        -- Organisation joins
        LEFT JOIN mmt_organisation o ON p.organisation_id = o.organisation_id
        LEFT JOIN mmt_organisation so ON sp.sub_organisation_id = so.organisation_id

        -- Project and Sub-project stage names
        LEFT JOIN tbl_project_stage ps ON p.project_stage_id = ps.stage_id
        LEFT JOIN tbl_project_stage sps ON sp.sub_project_stage_id = sps.stage_id

        -- Max physical progress per sub-project
        LEFT JOIN (
            SELECT sub_project_id, MAX(physical_progress) AS max_physical_progress
            FROM tbl_project_physical_progress
            GROUP BY sub_project_id
        ) pp_sub ON sp.sub_project_id = pp_sub.sub_project_id

        -- Max physical progress per project
        LEFT JOIN (
            SELECT project_id, MAX(physical_progress) AS max_physical_progress
            FROM tbl_project_physical_progress
            GROUP BY project_id
        ) pp_proj ON p.project_id = pp_proj.project_id

        -- Filters: Exclude projects or sub-projects with stage 14 and delays > 100 days
        WHERE 
            ISNULL(sp.sub_project_stage_id, p.project_stage_id) != 14
            AND DATEDIFF(
                DAY,
                COALESCE(sp.sub_actual_date_of_completion, sp.sub_target_completion_date, p.actual_date_of_completion, p.target_completion_date),
                GETDATE()
            ) > 100;


        `);     
    
                
        const rowData = result.recordset;  
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear(); 

        // Calculate month -2 (two months ago) and month -3 (three months ago)
        const monthMinus2 = new Date(currentDate);
        monthMinus2.setMonth(currentDate.getMonth() - 1); 
        const monthMinus2Year = monthMinus2.getFullYear();

        const monthMinus3 = new Date(currentDate);
        monthMinus3.setMonth(currentDate.getMonth() - 2); 
        const monthMinus3Year = monthMinus3.getFullYear();

        // Get full month name for month -2
        const monthMinus2Name = monthMinus2.toLocaleString('default', { month: 'long' });
        // const monthMinus2Year = (monthMinus2.getMonth() + 1) <= 12 ? monthMinus2.getFullYear() : monthMinus2.getFullYear() - 1;


        // Get the last date of month -2
        const lastDateOfMonthMinus2 = new Date(monthMinus2Year, monthMinus2.getMonth() + 1, 0);
        const lastDateOfMonthMinus2Formatted = lastDateOfMonthMinus2.toLocaleDateString('en-GB');

        // Get the last date of month -3
        const currentMonth = currentDate.getMonth() + 1; // 1-indexed: Jan=1, ..., Dec=12
        const lastDateOfMonthMinus3 = new Date(monthMinus3Year, monthMinus3.getMonth() + 1, 0);
        const lastDateOfMonthMinus3Formatted = (currentMonth === 5)
            ? ''
            : lastDateOfMonthMinus3.toLocaleDateString('en-GB');


        let columnDefs = [
            { 
                headerName: 'organisationID', field: 'organisationID', headerClass : "headercenter", hide: true,
                children: [
                    {
                        headerName: "A", field: "organisationID", hide: true,
                    }
                ] 
            },
            { 
                headerName: 'Organisation Name', field: 'organisationName', headerClass : "headercenter", pinned:true,
                children: [
                    {
                        headerName: "A", field: "organisationName", pinned:true,
                    }
                ] 
            },           
            { 
                headerName: 'Project ID', field: 'projectID', headerClass : "headercenter",
                children: [
                    {
                        headerName: "C", field: "projectID", 
                    }
                ] 
            },
          
            { 
                headerName: 'Project Name', field: 'projectName', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "D", field: "projectName", width: 250,
                    }
                ] 
            },
            { 
                headerName: 'Sub Project Name', field: 'subProjectName', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "E", field: "subProjectName", width: 250,
                    }
                ] 
            },
            { 
                headerName: 'Mode of Implementation', field: 'modeOfImplememtation', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "E", field: "modeOfImplememtation", width: 250,
                    }
                ] 
            },
            { 
                headerName: 'Awarded Cost (In Cr.)', field: 'awardProjectCost', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "E", field: "awardProjectCost", width: 250,
                    }
                ] 
            },
            
            { 
                headerName: 'Target Completion Date', field: 'targetCompletionDate', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "E", field: "targetCompletionDate", width: 250,
                    }
                ] 
            },
            { 
                headerName: 'Delayed Date', field: 'delayedDays', headerClass : "headercenter", width: 250,
                children: [
                    {
                        headerName: "E", field: "delayedDays", width: 250,
                    }
                ] 
            },
            
          
            

            
         
            
        ];
        
        res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};


export default { delayedProjectReport };

