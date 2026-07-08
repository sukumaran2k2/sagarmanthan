
import { pool } from "../../db.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';

 // AS ON DATE
 var todayDate = new Date();
 let prevMonthLastDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
 // var prevMonthFirstDate = new Date(todayDate.getFullYear() - (todayDate.getMonth() > 0 ? 0 : 1), (todayDate.getMonth() - 1 + 12) % 12, 1);
 console.log((prevMonthLastDate));
 var formatDateComponent = function(dateComponent) {
 return (dateComponent < 10 ? '0' : '') + dateComponent;
 };

 var formatDate = function(date) {
 return formatDateComponent(date.getFullYear() + '-' + date.getMonth() + 1) + '-' + formatDateComponent(date.getDate()) ;
 };
 let asOnDate = formatDate(prevMonthLastDate);
//    console.log(asOnDate, "asOnDate")


async function underImplementationReport (req, res) 
{
    // const conn = await pool;
    // const schemeType = req.query.schemeType     

    const schemeType = req.params.schemeType;
    const conn = await pool;
    
    const request = conn.request();
    request.input("schemeType", schemeType);

    let milestone0 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) )
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
       `
    if(schemeType != 'null')
    {   
        milestone0 += " AND scheme_id = @schemeType "
    }

    milestone0 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) ) 
        AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone0 += " AND sub_scheme_id = @schemeType "
    }

    milestone0 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date

        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `
    // ********************************************* Column B *********************************************
    let milestone1 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) ) 
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone1 += " AND scheme_id = @schemeType "
    }

    milestone1 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) )  
        AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone1 += " AND sub_scheme_id = @schemeType "
    }

    milestone1 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date
        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column C *********************************************
    let milestone2 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) ) 
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone2 += " AND scheme_id = @schemeType "
    }

    milestone2 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) )
        AND progress_date <= '${asOnDate}' 
    `
    if(schemeType != 'null')
    {   
        milestone2 += " AND sub_scheme_id = @schemeType "
    }

    milestone2 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date

        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column D *********************************************
    let milestone3 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) 
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone3 += " AND scheme_id = @schemeType "
    }

    milestone3 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) 
        AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone3 += " AND sub_scheme_id = @schemeType "
    }

    milestone3 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date

        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column E *********************************************
    let milestone4 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) ) 
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone4 += " AND scheme_id = @schemeType "
    }

    milestone4 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) ) 
        AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone4 += " AND sub_scheme_id = @schemeType "
    }

    milestone4 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date

        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column F *********************************************
    let milestone5 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress, progress_date
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_physical_progress.project_id
            WHERE (physical_progress IS NOT NULL AND physical_progress = 100) 
            AND (sub_project_id = '-1') AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone5 += " AND scheme_id = @schemeType "
    }

    milestone5 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation, progress_date
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress, progress_date
        FROM tbl_project_physical_progress
        INNER JOIN tbl_sub_project on tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        WHERE (physical_progress IS NOT NULL AND physical_progress = 100) AND progress_date <= '${asOnDate}'
    `
    if(schemeType != 'null')
    {   
        milestone5 += " AND sub_scheme_id = @schemeType "
    }

    milestone5 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation, progress_date
        )  AS physical_progress on physical_progress.organisation_id = mmt_organisation.organisation_id
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            physical_progress.physical_progress,
            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column 4 *********************************************
    let column4 = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, mmt_organisation.organisation_name,
        CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(agreementSigned_Table.project_id) as project_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_date.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project_date.sub_stage_id, actual_date

            FROM tbl_project_date
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_date.project_id
            WHERE (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL
                AND sub_project_id = '-1') AND actual_date <= '${asOnDate}'        
        `
    if(schemeType != 'null')
    {   
        column4 += " AND scheme_id = @schemeType"
    }

    column4 += ` UNION
        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_date.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project_date.sub_stage_id, actual_date

        FROM tbl_project_date
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
        WHERE (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL) 
        AND actual_date <= '${asOnDate}' 
    `
        
    if(schemeType != 'null')
    {   
        column4 += " AND sub_scheme_id = @schemeType "
    }

    column4 += `)  AS agreementSigned_Table on agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name       ;`

    // ********************************************* Column 5 *********************************************    
    let column5 = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(agreementSigned_Table.project_id) as project_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_date.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project_date.sub_stage_id, actual_date
            FROM tbl_project_date
            INNER JOIN tbl_project on tbl_project.project_id = tbl_project_date.project_id
            WHERE (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL
                AND sub_project_id = '-1') AND actual_date <= '${asOnDate}'        
        `
    if(schemeType != 'null')
    {   
        column5 += " AND scheme_id = @schemeType"
    }

    column5 += ` UNION
        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_date.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project_date.sub_stage_id, actual_date

        FROM tbl_project_date
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
        WHERE (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND actual_date <= '${asOnDate}'
    `
        
    if(schemeType != 'null')
    {   
        column5 += " AND sub_scheme_id = @schemeType "
    }

    column5 += `)  AS agreementSigned_Table on agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name       ;`



    // old crct one - jan 27 col A to E
    // SELECT mmt_organisation.organisation_id, mmt_organisation.organisation_name,
    // count(*) as milestone_project_count, round(sum(sanctioned_cost), 2) as cost,
    // milestone.milestone_id as milestone_stage_id
    // FROM mmt_organisation 			
    // LEFT JOIN tbl_project on tbl_project.organisation_id = mmt_organisation.organisation_id 
    // LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id
    // LEFT JOIN
    // (SELECT project_id, max(milestone_id) as milestone_id from tbl_project_activity 
    // WHERE end_date is not null group by project_id) milestone on milestone.project_id = tbl_project.project_id
    // -- WHERE (tbl_project.status = 1) AND (on_sub_project_available = 0)
    // -- WHERE ( isnull(tbl_sub_project.sub_status, tbl_project.status) =  1)   
    // GROUP By mmt_organisation.organisation_id, mmt_organisation.organisation_name, milestone.milestone_id
    // ORDER BY mmt_organisation.organisation_name 
    

    try 
    {
        // COLUMN A 
        const getMilestone0 = await request.query( milestone0 );   

        // COLUMN B 
        const getMilestone1 = await request.query( milestone1 );  
        
        // COLUMN C 
        const getMilestone2 = await request.query( milestone2 );  

        // COLUMN D 
        const getMilestone3 = await request.query( milestone3 );  

        // COLUMN E 
        const getMilestone4 = await request.query( milestone4 );  

        // COLUMN F 
        const getMilestone5 = await request.query( milestone5 );  

        // COLUMN 4
        const totalAwardedQuery = await request.query( column4 );
    
        // COLUMN 5
        const agreementSignedQuery = await request.query( column5 );

        // // COLUMN 4 -- not changed 
        // const totSubProjectCountQuery = await request.query(`SELECT mmt_organisation_category.organisation_category_id, mmt_organisation_category.organisation_category_name,
        //     mmt_organisation.organisation_id, mmt_organisation.organisation_name,     
        //     count(tbl_sub_project.sub_project_id) as tot_sub_project_count
            
        //     FROM mmt_organisation
        //     LEFT JOIN tbl_project on tbl_project.organisation_id = mmt_organisation.organisation_id 
        //     LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
        //     LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
        
        //     --WHERE (tbl_sub_project.sub_status = 1 AND on_sub_project_available = 1) 
                    
        //     GROUP By 
        //         mmt_organisation_category.organisation_category_id, mmt_organisation_category.organisation_category_name,
        //         mmt_organisation.organisation_name, mmt_organisation.organisation_id
            
        //     ORDER BY 
        //         mmt_organisation_category.organisation_category_id, 
        //         mmt_organisation_category.organisation_category_name, 
        //         organisation_name 
        // ;`);

//         -- with sub proj- col 4

//   SELECT mmt_organisation.organisation_id, 
//             mmt_organisation.organisation_name, uiMilestoneStageData.milestone_stage,
// 			count(uiMilestoneStageData.project_id) as proj_count,
// 			count(uiMilestoneStageData.sub_project_id) as subProj_count, 		
// 			sum(uiMilestoneStageData.cost) as cost
            
//             FROM mmt_organisation 
// 			LEFT JOIN
// 				(
// 					SELECT tbl_project.organisation_id, tbl_project.project_id, sub_project_id,
// 					tbl_project.sanctioned_cost AS cost, milestone.milestone_id AS milestone_stage
// 					FROM tbl_project 
// 					LEFT OUTER JOIN					
// 						tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id 
// 					LEFT OUTER JOIN
// 					( 
// 						SELECT project_id, MAX(milestone_id) AS milestone_id
// 						FROM tbl_project_activity
// 						WHERE (end_date IS NOT NULL)
// 						GROUP BY project_id
// 					) AS milestone ON milestone.project_id = tbl_project.project_id
// 					WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1) AND (milestone.milestone_id IS NOT NULL)
// 				)
// 			AS uiMilestoneStageData on uiMilestoneStageData.organisation_id = mmt_organisation.organisation_id
// 			group by mmt_organisation.organisation_id, organisation_name, milestone_stage
//             ORDER BY mmt_organisation.organisation_name 
       
   
     
        // res.json(result.recordset);
        const response = { getMilestone0:  getMilestone0.recordset,
            getMilestone1:  getMilestone1.recordset, getMilestone2: getMilestone2.recordset,
            getMilestone3: getMilestone3.recordset,
            getMilestone4: getMilestone4.recordset, getMilestone5: getMilestone5.recordset,
            agreementSigned: agreementSignedQuery.recordset,
            totalAwardedQuery: totalAwardedQuery.recordset ,
           }

        res.json(response);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getDetailsUnderImpReport (req, res) 
{   
    const organisationID = req.params.organisationID;
    const milestoneId = req.params.milestoneId;
    const modOfImp = req.params.modOfImp;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("milestoneId", milestoneId);
    request.input("modOfImp", modOfImp);

    let stageWise = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        project_images.document_name, mmt_organisation.organisation_name, 
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name, sub_project_name, scheme_name, 
        tbl_project_activity.milestone_id, max_stage.milestone_id as max_milestone, max_stage.delay_reason,
        CONVERT(VARCHAR,project_agreement_date.actual_date, 106) as actual_date,
        CONVERT(VARCHAR,start_date, 106) as start_date,
        CONVERT(VARCHAR,end_date, 106) as end_date
    
        FROM tbl_project 
        LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id

        Left JOIN tbl_project_activity on tbl_project_activity.project_id = tbl_project.project_id
        OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT project_id, sub_project_id, actual_date 
            FROM tbl_project_date 
            WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) AND actual_date <= '${asOnDate}'
        ) project_agreement_date ON project_agreement_date.project_id = tbl_project.project_id OR
        project_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
        
        LEFT JOIN
        (
            SELECT project_id, sub_project_id, document_name 
            FROM tbl_project_document 
            WHERE (document_type = 'project_images') 
        ) project_images ON project_images.project_id = tbl_project.project_id
            OR project_images.sub_project_id = tbl_sub_project.sub_project_id
        
        LEFT JOIN  mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
        LEFT JOIN  mmt_scheme ON mmt_scheme.scheme_id = ISNULL(tbl_sub_project.sub_scheme_id, tbl_project.scheme_id)

        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            -- INNER JOIN tbl_project on tbl_project.project_id = tbl_project_activity.project_id
            WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL) AND end_date <= '${asOnDate}'
            --AND (sub_project_id = '-1') 
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage on max_stage.project_id =  tbl_project.project_id
            OR max_stage.sub_project_id = tbl_sub_project.sub_project_id

        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 ) AND
        (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
        AND (tbl_project_activity.milestone_id <= @milestoneId AND max_stage.milestone_id = @milestoneId) 
        AND (end_date IS NOT NULL) AND end_date <= '${asOnDate}'
    `


    // let stageWise = ` SELECT 
    //     ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
    //     ISNULL(sub_project_images.document_name, project_images.document_name) AS document_name,           
    //     mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
    //     project_name, sub_project_name, scheme_name, 
    //     tbl_project_activity.milestone_id, max_stage.delay_reason,
    //     CONVERT(VARCHAR,ISNULL(sub_project_agreement_date.actual_date, project_agreement_date.actual_date), 106) as actual_date,
    //     CONVERT(VARCHAR,start_date, 106) as start_date,
    //     CONVERT(VARCHAR,end_date, 106) as end_date
    
    //     FROM tbl_project 
    //     INNER JOIN tbl_project_activity on tbl_project_activity.project_id = tbl_project.project_id
    //     LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id

    //     LEFT JOIN
    //     (
    //         SELECT project_id,  actual_date 
    //         FROM tbl_project_date 
    //         WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL AND sub_project_id = '-1')
    //     ) project_agreement_date ON project_agreement_date.project_id = tbl_project.project_id
        
    //     LEFT JOIN
    //     (
    //         SELECT sub_project_id,  actual_date 
    //         FROM tbl_project_date 
    //         WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL AND sub_project_id != '-1' )
    //     ) sub_project_agreement_date ON sub_project_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
        

    //     LEFT JOIN
    //     (
    //         SELECT project_id,  document_name 
    //         FROM tbl_project_document 
    //         WHERE (document_type = 'project_images' AND sub_project_id = '-1') 
    //     ) project_images ON project_images.project_id = tbl_project.project_id
        
    //     LEFT JOIN
    //     (
    //         SELECT sub_project_id,  document_name 
    //         FROM tbl_project_document 
    //         WHERE (document_type = 'project_images' AND sub_project_id != '-1') 
    //     ) sub_project_images ON sub_project_images.sub_project_id = tbl_sub_project.sub_project_id
        

    //     LEFT JOIN  mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
    //     LEFT JOIN  mmt_scheme ON mmt_scheme.scheme_id = ISNULL(tbl_sub_project.sub_scheme_id, tbl_project.scheme_id)

    //     LEFT JOIN
    //     (
    //         SELECT 
    //         tbl_project_activity.project_id, delay_reason,
    //         MAX(milestone_id) AS milestone_id
            
    //         FROM tbl_project_activity
    //         INNER JOIN tbl_project on tbl_project.project_id = tbl_project_activity.project_id
    //         WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL AND tbl_project.status = 1)
    //         AND (sub_project_id = '-1') 
    //         GROUP BY tbl_project_activity.project_id, delay_reason
    //     ) AS max_stage on max_stage.project_id =  tbl_project.project_id

    //     WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 )AND
    //     (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
    //     AND  (tbl_project_activity.milestone_id <= @milestoneId AND max_stage.milestone_id = @milestoneId) 
    //     AND (end_date IS NOT NULL)  
    // `

    if(modOfImp == 'PPP+Captive')
    {     
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if(modOfImp == 'EPC+Others')
    {
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }
    // else if(modOfImp == 'TOTAL')
    // {
    //     stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') OR AND (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )
    // }

    stageWise += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    try 
    {

        const getDetailsUIProject = await request.query( stageWise );
   

        // INNER JOIN - LATER HAVE TO CHANGE THIS JOIN QUERY TO INNER JOIN
        // (SELECT project_id, max(sub_stage_id) as sub_stage_id , actual_date 
        //     FROM tbl_project_date WHERE actual_date is not null GROUP BY project_id, actual_date) sub_stage ON sub_stage.project_id = tbl_project.project_id
    
        // const getDetailsUIProject = await request.query(` 
        //     SELECT tbl_project.organisation_id, 
        //     tbl_project_activity.project_id, 
        //     tbl_project.project_name,
        //     tbl_project.mode_of_implememtation,
        //     CONVERT(VARCHAR,sub_stage.actual_date, 5) as actual_date, 
        //     tbl_project_activity.milestone_id,
        //     CONVERT(VARCHAR,start_date, 5) as start_date,
        //     CONVERT(VARCHAR,end_date, 5) as end_date
                        
        //     FROM tbl_project
        //     INNER JOIN tbl_project_activity ON  tbl_project_activity.project_id = tbl_project.project_id
        //     -- LEFT JOIN tbl_project_date ON  tbl_project_date.project_id = tbl_project.project_id
        //     LEFT JOIN
        //     (SELECT project_id, max(sub_stage_id) as sub_stage_id, actual_date 
        //     FROM tbl_project_date WHERE actual_date IS NOT NULL GROUP BY project_id, actual_date) sub_stage
        //     ON sub_stage.project_id = tbl_project.project_id
                    
        //     WHERE (tbl_project_activity.milestone_id = @milestoneId AND end_date IS NOT NULL ) 
        //     AND tbl_project.organisation_id = @organisationID AND sub_project_id = '-1'

        //     UNION
            
        //     SELECT tbl_sub_project.sub_organisation_id, 
        //     tbl_project_activity.sub_project_id, tbl_sub_project.sub_project_name,
        //     tbl_sub_project.sub_mode_of_implememtation,
        //     CONVERT(VARCHAR,sub_stage.actual_date, 5) as actual_date, 
        //     tbl_project_activity.milestone_id,
        //     CONVERT(VARCHAR,start_date, 5) as start_date,
        //     CONVERT(VARCHAR,end_date, 5) as end_date
                        
        //     FROM tbl_sub_project
        //     INNER JOIN tbl_project_activity ON  tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id
        //     LEFT JOIN
        //     (SELECT sub_project_id, max(sub_stage_id) as sub_stage_id, actual_date 
        //     FROM tbl_project_date WHERE actual_date IS NOT NULL GROUP BY sub_project_id, actual_date) sub_stage ON sub_stage.sub_project_id = tbl_sub_project.sub_project_id
                    
        //     WHERE (tbl_project_activity.milestone_id = @milestoneId AND end_date IS NOT NULL ) 
        //     AND tbl_sub_project.sub_organisation_id = @organisationID
            
        // ;`);
       

    //     const getDetailsUIProject = await request.query(` SELECT tbl_user.organisation_id, 
    //     mmt_organisation.organisation_name, scheme_name, tbl_project.project_id, 
    //     tbl_sub_project.sub_project_id, project_name, sub_project_name, 
    //     tbl_project_activity.milestone_id, 
    //         --FORMAT(start_date,'dd-MM-yyyy') AS start_date, 
    //     CONVERT(date,start_date, 5) as start_date,
    //         --FORMAT(end_date,'dd-MM-yyyy') AS end_date,
    //     CONVERT(date,end_date, 5) as end_date, 
    //         -- FORMAT(sub_stage.actual_date,'dd-MM-yyyy') AS actual_date, 
    //     CONVERT(date,sub_stage.actual_date, 5) as actual_date, 
    //     delay_reason

    //     FROM tbl_project 
    //     INNER JOIN tbl_project_activity on tbl_project_activity.project_id = tbl_project.project_id
    //     LEFT JOIN
    //     (SELECT project_id, max(sub_stage_id) as sub_stage_id, actual_date 
    //         FROM tbl_project_date WHERE actual_date is not null GROUP BY project_id, actual_date) sub_stage ON sub_stage.project_id = tbl_project.project_id
    
    //     LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id
    //     LEFT JOIN tbl_user on tbl_user.user_id = tbl_project.submitted_by
    //     LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_user.organisation_id        
    //     LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
    //    -- LEFT JOIN mmt_project_category on mmt_project_category.project_category_id = tbl_project.project_category_id

    //    -- WHERE (tbl_project.status = 1 AND on_sub_project_available = 0) AND
    //     WHERE ( isnull(tbl_sub_project.sub_status, tbl_project.status) =  1)  AND
    //     (tbl_user.organisation_id = @organisationID) AND 
    //     (tbl_project_activity.milestone_id = @milestoneId AND (end_date is not null ) )

    //     ORDER BY tbl_project.project_id, project_name, sub_project_name
    // ;`);
        const response = { getDetailsUIProject:  getDetailsUIProject.recordset }
        res.json(response);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }

};



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uiReportImageDownload(req, res) 
{
    try 
    {
        const fileName = req.params.filename;
        const subProjectID = req.params.subProjectID;

        // console.log(subProjectID, "subProjectID")
        
        let file_path;
        if(subProjectID == null)
        {
            file_path = path.join(__dirname, "../../../fileuploads/Project_Documents/project_images/mainProject", fileName);
        }
        else
        {
            file_path = path.join(__dirname, "../../../fileuploads/Project_Documents/project_images/subProject", fileName);
        }

        try {
            await access(file_path);
            const fileStatus = await stat(file_path);

            res.setHeader('Content-Type', 'image/png');
            // res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            // res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Length', fileStatus.size);

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

export default { underImplementationReport, getDetailsUnderImpReport, uiReportImageDownload };
