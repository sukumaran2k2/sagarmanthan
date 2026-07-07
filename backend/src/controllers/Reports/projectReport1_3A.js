import { pool } from "../../db.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { access, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import moment from 'moment';
// moment().format();

async function underImplementationReport(req, res) {
    // const conn = await pool;
    // const isSagarmalaFunded = req.query.isSagarmalaFunded     

    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const conn = await pool;

    const request = conn.request();
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];
    // console.log(decadeCurrentDate, "decadeCurrentDate")

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
        // console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")   
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
        // console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")   
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');
    // console.log(asOnDate, "asOnDate");

    // ----------------------------------------------------------------------------------------------------------------------------------     
    let milestone0 = `  SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        -- physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress_tab.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE   ( 
            -- (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) ) AND
            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
            AND (tbl_project_physical_progress.sub_project_id = '-1') 
            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
                )
       `
    if (isSagarmalaFunded == 'true') {
        milestone0 += "AND is_sagarmala_funded =  1"
    }

    milestone0 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress
        
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id

        WHERE (
        -- (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) ) AND
        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)  
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        )
        
    `
    if (isSagarmalaFunded == 'true') {
        milestone0 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone0 += `            
            GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
            sub_mode_of_implememtation

        )  AS physical_progress_tab ON physical_progress_tab.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
        (physical_progress_tab.physical_progress >= 0 AND physical_progress_tab.physical_progress < 20)

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            -- physical_progress.physical_progress,
            CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `
    // ********************************************* Column B *********************************************
    let milestone1 = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        --  physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress_tab.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE (
            --(physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) ) AND 
            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
            AND (tbl_project_physical_progress.sub_project_id = '-1') 
            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone1 += "AND is_sagarmala_funded =  1"
    }

    milestone1 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress

        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
        
        WHERE (
        -- (physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) ) AND
        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone1 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone1 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation
        )  AS physical_progress_tab ON physical_progress_tab.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
        ( physical_progress_tab.physical_progress >= 20 AND physical_progress_tab.physical_progress < 40)

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            -- physical_progress.physical_progress,
            CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `

    // ********************************************* Column C *********************************************
    let milestone2 = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
       -- physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE   (
            -- (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) ) AND
             ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
            AND (tbl_project_physical_progress.sub_project_id = '-1') 
            AND (
            tbl_project.project_stage_id = 14  OR 
            tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
        )          
        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone2 += "AND is_sagarmala_funded =  1"
    }

    milestone2 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress

        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
       
        WHERE (
        -- (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) ) AND
        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
         
    `
    if (isSagarmalaFunded == 'true') {
        milestone2 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone2 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation

        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
        (physical_progress.physical_progress >= 40 AND physical_progress.physical_progress < 60)

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
          --  physical_progress.physical_progress,
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
        -- physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE (
            -- (physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) AND
            (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL) 
            AND (tbl_project_physical_progress.sub_project_id = '-1')  
            AND (
                tbl_project.project_stage_id = 14 OR 
                tbl_project.project_stage_id = 11 OR tbl_project.project_stage_id = 3 
            )          
        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone3 += "AND is_sagarmala_funded =  1"
    }

    milestone3 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress
       
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
        
        WHERE (
        --(physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) AND
        (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone3 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone3 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation

        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
        (physical_progress.physical_progress >= 60 AND physical_progress.physical_progress < 80)

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            -- physical_progress.physical_progress,
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
        -- physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE (
            --(physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) ) AND 
            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
           AND (tbl_project_physical_progress.sub_project_id = '-1') 
           AND (
            tbl_project.project_stage_id = 14  OR 
            tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
        )          
    AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone4 += "AND is_sagarmala_funded =  1"
    }

    milestone4 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress
        
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
       
        WHERE   (
        -- (physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) )  AND
        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone4 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone4 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation

        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
       ( physical_progress.physical_progress >= 80 AND physical_progress.physical_progress < 100)

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
           -- physical_progress.physical_progress,
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
       -- physical_progress.physical_progress AS physical_progress,  
        COUNT(physical_progress.project_id) AS physical_progress_count 
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project_physical_progress.project_id,
            tbl_project.mode_of_implememtation,
            MAX(physical_progress) AS physical_progress
            FROM tbl_project_physical_progress
            
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE (
            -- (physical_progress IS NOT NULL AND physical_progress = 100) AND
            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
            AND (tbl_project_physical_progress.sub_project_id = '-1')
            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            )          
        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `
    if (isSagarmalaFunded == 'true') {
        milestone5 += "AND is_sagarmala_funded =  1"
    }

    milestone5 += ` 
        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
        mode_of_implememtation
        
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_physical_progress.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        MAX(physical_progress) AS physical_progress
        FROM tbl_project_physical_progress
       
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
       
        WHERE (
        -- (physical_progress IS NOT NULL AND physical_progress = 100) AND 
        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        )
       
    `
    if (isSagarmalaFunded == 'true') {
        milestone5 += "AND sub_is_sagarmala_funded =  1"
    }

    milestone5 += ` 
        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
        sub_mode_of_implememtation
        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4 AND
        (physical_progress.physical_progress = 100 )

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
          --  physical_progress.physical_progress,
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
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
            WHERE  (   (tbl_project.status = 1) AND (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL
                AND sub_project_id = '-1') 
                AND (
                    tbl_project.project_stage_id = 14  OR 
                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
        `
    if (isSagarmalaFunded == 'true') {
        column4 += "AND is_sagarmala_funded =  1"
    }

    column4 += ` UNION
        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_date.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project_date.sub_stage_id, actual_date

        FROM tbl_project_date
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
        WHERE   (    (tbl_sub_project.sub_status = 1) AND (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL) 
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        )
    `

    if (isSagarmalaFunded == 'true') {
        column4 += "AND sub_is_sagarmala_funded =  1"
    }

    column4 += `)  AS agreementSigned_Table ON agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

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
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
            WHERE   (     (tbl_project.status = 1) AND (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL
                AND sub_project_id = '-1')  
                AND (
                    tbl_project.project_stage_id = 14  OR 
                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
        `
    if (isSagarmalaFunded == 'true') {
        column5 += "AND is_sagarmala_funded =  1"
    }

    column5 += ` UNION
        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_date.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project_date.sub_stage_id, actual_date

        FROM tbl_project_date
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
        WHERE   (    (tbl_sub_project.sub_status = 1) AND (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        )
    `

    if (isSagarmalaFunded == 'true') {
        column5 += "AND sub_is_sagarmala_funded =  1"
    }

    column5 += `)  AS agreementSigned_Table ON agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4
        
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

    console.log(column4, "column4")


    try {
        // COLUMN A 
        const getMilestone0 = await request.query(milestone0);

        // COLUMN B 
        const getMilestone1 = await request.query(milestone1);

        // COLUMN C 
        const getMilestone2 = await request.query(milestone2);

        // COLUMN D 
        const getMilestone3 = await request.query(milestone3);

        // COLUMN E 
        const getMilestone4 = await request.query(milestone4);

        // COLUMN F 
        const getMilestone5 = await request.query(milestone5);

        // COLUMN 4
        const totalAwardedQuery = await request.query(column4);

        // COLUMN 5
        const agreementSignedQuery = await request.query(column5);

        const response = {
            getMilestone0: getMilestone0.recordset,
            getMilestone1: getMilestone1.recordset, getMilestone2: getMilestone2.recordset,
            getMilestone3: getMilestone3.recordset,
            getMilestone4: getMilestone4.recordset, getMilestone5: getMilestone5.recordset,
            agreementSigned: agreementSignedQuery.recordset,
            totalAwardedQuery: totalAwardedQuery.recordset,
        }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaiUnderImplementationReport(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const organisation_categoryID = req.params.orgCate;
        const organisation_ID = req.params.organisation;
        const category = req.params.category;
        let isSagarmalaFunded = req.params.isSagarmalaFunded;

        if(isSagarmalaFunded == 'true'){
            isSagarmalaFunded = 1;
        } else {
            isSagarmalaFunded = 0 ;
        }

        let currentDate = new Date();
        let currentMonth = currentDate.getMonth() + 1;
        let currentYear = new Date(currentDate).getFullYear();
    
        let  firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
        let  formateFirstDateCurrentFy, formateLastDateCurrentFy, formateLastDatePreviousFy;
    
        // From 2014 to till date (Ten year data)
        let decadeCurrentDate = new Date().toISOString().split('T')[0];
        // console.log(decadeCurrentDate, "decadeCurrentDate")
    
        if(currentMonth <= 3 && currentMonth >= 1)
        {
            firstDateCurrentFy = (currentYear)+"-04-01" ;
            formateFirstDateCurrentFy = "01-04-"+(currentYear) ;
            lastDateCurrentFy = (currentYear + 1)+"-03-31"; 
            formateLastDateCurrentFy = "31-03-"+(currentYear + 1);   
            // GET 31.03.2024
            lastDatePreviousFy = (currentYear - 1)+"-03-31" ; 
            formateLastDatePreviousFy = "31-03-"+(currentYear - 1) ; 
        }
        else
        {
            firstDateCurrentFy = (currentYear)+"-04-01" ;
            formateFirstDateCurrentFy = "01-04-"+(currentYear) ;

            lastDateCurrentFy = (currentYear + 1)+"-03-31"; 
            formateLastDateCurrentFy = "31-03-"+(currentYear + 1);   
            
            // GET 31.03.2025
            lastDatePreviousFy = (currentYear)+"-03-31" ;      
            formateLastDatePreviousFy = "31-03-"+(currentYear) ; 
        }

        let result = await request.query(`
                                
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @currentyearstart date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            set @organisation_ID = ${organisation_ID};
            set @organisation_categoryID = ${organisation_categoryID};
            SET @modeofimp = '${category}';
            SET @og_projectid = '';
            SET @issagarmalafunded = ${isSagarmalaFunded};

            SET @begindate = CASE 
                                WHEN MONTH(GETDATE()) >= 4 
                                    THEN DATEFROMPARTS(YEAR(GETDATE()), 4, 1)  -- April 1st of the current year
                                ELSE 
                                    DATEFROMPARTS(YEAR(GETDATE()) - 1, 4, 1)  -- April 1st of the previous year
                            END;

            SET @enddate = CASE 
                                WHEN MONTH(getdate()) >= 4 
                                    THEN DATEFROMPARTS(YEAR(getdate()) + 1, 3, 31)  -- March 31 of the next year
                                ELSE 
                                    DATEFROMPARTS(YEAR(getdate()), 3, 31)           -- March 31 of the current year
                            END;
            SET @currentyearstart = CASE 
                                        WHEN MONTH(getdate()) >= 4 
                                            THEN DATEFROMPARTS(YEAR(getdate()), 4, 1)  -- Current year start (April 1st)
                                        ELSE 
                                            DATEFROMPARTS(YEAR(getdate()) - 1, 4, 1)  -- Previous year start (April 1st)
                                    END;

            set @previousMonthLastDate = EOMONTH(DATEADD(MONTH, -1, GETDATE()));
            set @currentMonthFirstDate = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0);
            set @financialMonth = CASE 
                                WHEN MONTH(GETDATE()) >= 4 
                                    THEN MONTH(GETDATE()) - 3  -- April to December
                                ELSE 
                                    MONTH(GETDATE()) + 9       -- January to March
                                END ;
            set @currentYearColE = CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-' + CAST(YEAR(GETDATE()) + 1 AS VARCHAR(4));


            begin

                    with columnA as (
                                            SELECT organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            -- physical_progress.physical_progress AS physical_progress,  
                                            --COUNT(physical_progress_tab.project_id) AS physical_progress_count,
                                            case when physical_progress_tab.project_id in (select sub_project_id from tbl_sub_project)
                                            then (select project_id from tbl_sub_project where sub_project_id = physical_progress_tab.project_id)
                                            else physical_progress_tab.project_id end as og_project_id
                    
                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project_physical_progress.project_id,
                                                tbl_project.mode_of_implememtation,
                                                MAX(physical_progress) AS physical_progress
                                                FROM tbl_project_physical_progress
                        
                                                INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                                INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                                WHERE   ( 
                                                -- (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) ) AND
                                                ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                                AND (tbl_project_physical_progress.sub_project_id = '-1') 
                                                AND (
                                                    tbl_project.project_stage_id = 14  OR 
                                                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                                )          
                                                AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                                    )


                                                    AND is_sagarmala_funded =  @issagarmalafunded

                                                GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                            mode_of_implememtation
                    
                                            UNION

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_project_physical_progress.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            MAX(physical_progress) AS physical_progress
                                            FROM tbl_project_physical_progress
                    
                                            INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                            INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id

                                            WHERE (
                                            -- (physical_progress IS NOT NULL AND (physical_progress >= 0 AND physical_progress <= 19) ) AND
                                            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)  
                                            AND (
                                                tbl_sub_project.sub_project_stage_id = 14  OR 
                                                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                            ) 
                                            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                                sub_mode_of_implememtation

                                            )  AS physical_progress_tab ON physical_progress_tab.organisation_id = mmt_organisation.organisation_id
                    
                                            WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                            (physical_progress_tab.physical_progress >= 0 AND physical_progress_tab.physical_progress < 20)

                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                -- physical_progress.physical_progress,
                                                CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                physical_progress_tab.project_id
                    
                                            --ORDER BY 
                                            --    mmt_organisation_category.organisation_category_id, 
                                            --    organisation_category_name, 
                                            --    organisation_name
                                            ),


                    columnB as (
                                SELECT organisation_category_name,
                                mmt_organisation.organisation_id, organisation_name,
                                CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                --  physical_progress.physical_progress AS physical_progress,  
                                --COUNT(physical_progress_tab.project_id) AS physical_progress_count 
                                case when physical_progress_tab.project_id in (select sub_project_id from tbl_sub_project) 
                                then (select project_id from tbl_sub_project where sub_project_id = physical_progress_tab.project_id)
                                else physical_progress_tab.project_id end as og_project_id
                    
                                FROM mmt_organisation 
                                LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                JOIN
                                ( 
                                    SELECT tbl_project.organisation_id, 
                                    tbl_project_physical_progress.project_id,
                                    tbl_project.mode_of_implememtation,
                                    MAX(physical_progress) AS physical_progress
                                    FROM tbl_project_physical_progress
                                    INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                    INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                    WHERE (
                                    --(physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) ) AND 
                                    ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                    AND (tbl_project_physical_progress.sub_project_id = '-1') 
                                    AND (
                                        tbl_project.project_stage_id = 14  OR 
                                        tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                    )          
                                    AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                    )


                                    AND is_sagarmala_funded =  @issagarmalafunded

                                    GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                mode_of_implememtation
                    
                                UNION

                                SELECT tbl_sub_project.sub_organisation_id, 
                                tbl_project_physical_progress.sub_project_id,
                                tbl_sub_project.sub_mode_of_implememtation,
                                MAX(physical_progress) AS physical_progress
                                FROM tbl_project_physical_progress

                                INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
                    
                                WHERE (
                                -- (physical_progress IS NOT NULL AND (physical_progress >= 20 AND physical_progress <= 39) ) AND
                                ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                AND (
                                    tbl_sub_project.sub_project_stage_id = 14  OR 
                                    tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                ) 
                                AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                    )


                                AND sub_is_sagarmala_funded =  @issagarmalafunded

                                GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                sub_mode_of_implememtation
                                )  AS physical_progress_tab ON physical_progress_tab.organisation_id = mmt_organisation.organisation_id
                    
                                WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                ( physical_progress_tab.physical_progress >= 20 AND physical_progress_tab.physical_progress < 40)

                                GROUP BY
                                    mmt_organisation_category.organisation_category_id, 
                                    organisation_category_name, 
                                    mmt_organisation.organisation_id, 
                                    organisation_name,
                                    -- physical_progress.physical_progress,
                                    CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                    physical_progress_tab.project_id
                    
                                --ORDER BY 
                                --    mmt_organisation_category.organisation_category_id, 
                                --    organisation_category_name, 
                                --    organisation_name
                    ),

                    
                    columnC as (

                                    SELECT organisation_category_name,
                                    mmt_organisation.organisation_id, organisation_name,
                                    CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                -- physical_progress.physical_progress AS physical_progress,  
                                    --COUNT(physical_progress.project_id) AS physical_progress_count 
                                    case when physical_progress.project_id in (select sub_project_id from tbl_sub_project) 
                                    then (select project_id from tbl_sub_project where sub_project_id = physical_progress.project_id)
                                    else physical_progress.project_id end as og_project_id
                    
                                    FROM mmt_organisation 
                                    LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                    JOIN
                                    ( 
                                        SELECT tbl_project.organisation_id, 
                                        tbl_project_physical_progress.project_id,
                                        tbl_project.mode_of_implememtation,
                                        MAX(physical_progress) AS physical_progress
                                        FROM tbl_project_physical_progress
                                        INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                        INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                        WHERE   (
                                        -- (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) ) AND
                                        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                        AND (tbl_project_physical_progress.sub_project_id = '-1') 
                                        AND (
                                        tbl_project.project_stage_id = 14  OR 
                                        tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                    )          
                                    AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                        )

                                        AND is_sagarmala_funded =  @issagarmalafunded

                                        GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                    mode_of_implememtation
                    
                                    UNION

                                    SELECT tbl_sub_project.sub_organisation_id, 
                                    tbl_project_physical_progress.sub_project_id,
                                    tbl_sub_project.sub_mode_of_implememtation,
                                    MAX(physical_progress) AS physical_progress
                                    FROM tbl_project_physical_progress

                                    INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                    INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
                
                                    WHERE (
                                    -- (physical_progress IS NOT NULL AND (physical_progress >= 40 AND physical_progress <= 59) ) AND
                                    ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                    AND (
                                        tbl_sub_project.sub_project_stage_id = 14  OR 
                                        tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                    ) 
                                    AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                        )

                                        AND sub_is_sagarmala_funded =  @issagarmalafunded

                                        GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                    sub_mode_of_implememtation

                                    )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
                    
                                    WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                    (physical_progress.physical_progress >= 40 AND physical_progress.physical_progress < 60)

                                    GROUP BY
                                        mmt_organisation_category.organisation_category_id, 
                                        organisation_category_name, 
                                        mmt_organisation.organisation_id, 
                                        organisation_name,
                                    --  physical_progress.physical_progress,
                                        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                        physical_progress.project_id
                    
                                    --ORDER BY 
                                    --    mmt_organisation_category.organisation_category_id, 
                                    --    organisation_category_name, 
                                    --    organisation_name
                    ),
                    columnD as (
                    
                                        SELECT organisation_category_name,
                                        mmt_organisation.organisation_id, organisation_name,
                                        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        -- physical_progress.physical_progress AS physical_progress,  
                                        --COUNT(physical_progress.project_id) AS physical_progress_count 
                                        case when physical_progress.project_id in (select sub_project_id from tbl_sub_project) 
                                        then (select project_id from tbl_sub_project where sub_project_id = physical_progress.project_id)
                                        else physical_progress.project_id end as og_project_id
                    
                                        FROM mmt_organisation 
                                        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                        JOIN
                                        ( 
                                            SELECT tbl_project.organisation_id, 
                                            tbl_project_physical_progress.project_id,
                                            tbl_project.mode_of_implememtation,
                                            MAX(physical_progress) AS physical_progress
                                            FROM tbl_project_physical_progress
                                            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                            WHERE (
                                            -- (physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) AND
                                            (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL) 
                                            AND (tbl_project_physical_progress.sub_project_id = '-1')  
                                            AND (
                                                tbl_project.project_stage_id = 14 OR 
                                                tbl_project.project_stage_id = 11 OR tbl_project.project_stage_id = 3 
                                            )          
                                        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                        mode_of_implememtation
                    
                                        UNION

                                        SELECT tbl_sub_project.sub_organisation_id, 
                                        tbl_project_physical_progress.sub_project_id,
                                        tbl_sub_project.sub_mode_of_implememtation,
                                        MAX(physical_progress) AS physical_progress
                                        FROM tbl_project_physical_progress
                
                                        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
                    
                                        WHERE (
                                        --(physical_progress IS NOT NULL AND (physical_progress >= 60 AND physical_progress <= 79) ) AND
                                        (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                        AND (
                                            tbl_sub_project.sub_project_stage_id = 14  OR 
                                            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                        ) 
                                        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                        sub_mode_of_implememtation

                                        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
                    
                                        WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                        (physical_progress.physical_progress >= 60 AND physical_progress.physical_progress < 80)

                                        GROUP BY
                                            mmt_organisation_category.organisation_category_id, 
                                            organisation_category_name, 
                                            mmt_organisation.organisation_id, 
                                            organisation_name,
                                            -- physical_progress.physical_progress,
                                            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                            physical_progress.project_id
                    
                                        --ORDER BY 
                                        --    mmt_organisation_category.organisation_category_id, 
                                        --    organisation_category_name, 
                                        --    organisation_name
                    
                    ),

                    ColumnE as (
                                        SELECT organisation_category_name,
                                        mmt_organisation.organisation_id, organisation_name,
                                        CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        -- physical_progress.physical_progress AS physical_progress,  
                                        --COUNT(physical_progress.project_id) AS physical_progress_count 
                                        case when physical_progress.project_id in (select sub_project_id from tbl_sub_project) 
                                        then (select project_id from tbl_sub_project where sub_project_id = physical_progress.project_id)
                                        else physical_progress.project_id end as og_project_id
                    
                                        FROM mmt_organisation 
                                        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                        JOIN
                                        ( 
                                            SELECT tbl_project.organisation_id, 
                                            tbl_project_physical_progress.project_id,
                                            tbl_project.mode_of_implememtation,
                                            MAX(physical_progress) AS physical_progress
                                            FROM tbl_project_physical_progress
                                            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                            WHERE (
                                            --(physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) ) AND 
                                            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                        AND (tbl_project_physical_progress.sub_project_id = '-1') 
                                        AND (
                                            tbl_project.project_stage_id = 14  OR 
                                            tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                        )          
                                    AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                        mode_of_implememtation
                    
                                        UNION

                                        SELECT tbl_sub_project.sub_organisation_id, 
                                        tbl_project_physical_progress.sub_project_id,
                                        tbl_sub_project.sub_mode_of_implememtation,
                                        MAX(physical_progress) AS physical_progress
                                        FROM tbl_project_physical_progress
                    
                                        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
                
                                        WHERE   (
                                        -- (physical_progress IS NOT NULL AND (physical_progress >= 80 AND physical_progress <= 99) )  AND
                                        ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                        AND (
                                            tbl_sub_project.sub_project_stage_id = 14  OR 
                                            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                        ) 
                                        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                        sub_mode_of_implememtation

                                        )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
                    
                                        WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                    ( physical_progress.physical_progress >= 80 AND physical_progress.physical_progress < 100)

                                        GROUP BY
                                            mmt_organisation_category.organisation_category_id, 
                                            organisation_category_name, 
                                            mmt_organisation.organisation_id, 
                                            organisation_name,
                                        -- physical_progress.physical_progress,
                                            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                            physical_progress.project_id
                    
                                        --ORDER BY 
                                        --    mmt_organisation_category.organisation_category_id, 
                                        --    organisation_category_name, 
                                        --    organisation_name

                    ),
                    COLUMNF as (
                                            SELECT organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        -- physical_progress.physical_progress AS physical_progress,  
                                            --COUNT(physical_progress.project_id) AS physical_progress_count 
                                            case when physical_progress.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = physical_progress.project_id)
                                            else physical_progress.project_id end as og_project_id
                    
                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project_physical_progress.project_id,
                                                tbl_project.mode_of_implememtation,
                                                MAX(physical_progress) AS physical_progress
                                                FROM tbl_project_physical_progress
                        
                                                INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
                                                INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                                WHERE (
                                                -- (physical_progress IS NOT NULL AND physical_progress = 100) AND
                                                ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                                AND (tbl_project_physical_progress.sub_project_id = '-1')
                                                AND (
                                                    tbl_project.project_stage_id = 14  OR 
                                                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                                )          
                                            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                                )

                                                AND is_sagarmala_funded =  @issagarmalafunded
                                                GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
                                            mode_of_implememtation
                    
                                            UNION

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_project_physical_progress.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            MAX(physical_progress) AS physical_progress
                                            FROM tbl_project_physical_progress
                
                                            INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                                            INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id
                
                                            WHERE (
                                            -- (physical_progress IS NOT NULL AND physical_progress = 100) AND 
                                            ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                            AND (
                                                tbl_sub_project.sub_project_stage_id = 14  OR 
                                                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                            ) 
                                            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
                                            sub_mode_of_implememtation
                                            )  AS physical_progress ON physical_progress.organisation_id = mmt_organisation.organisation_id
                    
                                            WHERE mmt_organisation.organisation_id = @organisation_ID AND
                                            (physical_progress.physical_progress = 100 )

                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                            --  physical_progress.physical_progress,
                                                CASE WHEN physical_progress.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                physical_progress.project_id
                    
                                            --ORDER BY 
                                            --    mmt_organisation_category.organisation_category_id, 
                                            --    organisation_category_name, 
                                            --    organisation_name
                    ),
                    COLUMN4 as (
                                            SELECT organisation_category_name,
                                            mmt_organisation.organisation_id, mmt_organisation.organisation_name,
                                            CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            --COUNT(agreementSigned_Table.project_id) as project_count 
                                            case when agreementSigned_Table.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = agreementSigned_Table.project_id)
                                            else agreementSigned_Table.project_id end as og_project_id
                    
                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project_date.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project_date.sub_stage_id, actual_date

                                                FROM tbl_project_date
                                                INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
                                                WHERE  (   (tbl_project.status = 1) AND (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL
                                                    AND sub_project_id = '-1') 
                                                    AND (
                                                        tbl_project.project_stage_id = 14  OR 
                                                        tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                                    )          
                                                AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                                )

                                                AND is_sagarmala_funded =  @issagarmalafunded

                                                UNION
                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_project_date.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            tbl_project_date.sub_stage_id, actual_date

                                            FROM tbl_project_date
                                            INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
                                            WHERE   (    (tbl_sub_project.sub_status = 1) AND (tbl_project_date.sub_stage_id = 9 AND tbl_project_date.actual_date IS NOT NULL) 
                                            AND (
                                                tbl_sub_project.sub_project_stage_id = 14  OR 
                                                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                            ) 
                                            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )
                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            )  AS agreementSigned_Table ON agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID

                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                agreementSigned_Table.project_id
                    
                                            --ORDER BY 
                                            --    mmt_organisation_category.organisation_category_id, 
                                            --    organisation_category_name, 
                                            --    organisation_name       ;

                    ),
                    COLUMN5 as (
                                            SELECT organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            COUNT(agreementSigned_Table.project_id) as project_count,
                                            case when agreementSigned_Table.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = agreementSigned_Table.project_id)
                                            else agreementSigned_Table.project_id end as og_project_id
                    
                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            LEFT JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project_date.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project_date.sub_stage_id, actual_date
                                                FROM tbl_project_date
                                                INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
                                                WHERE   (     (tbl_project.status = 1) AND (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL
                                                    AND sub_project_id = '-1')  
                                                    AND (
                                                        tbl_project.project_stage_id = 14  OR 
                                                        tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                                    )          
                                                AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                                )

                                                AND is_sagarmala_funded =  @issagarmalafunded

                                                UNION
                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_project_date.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            tbl_project_date.sub_stage_id, actual_date

                                            FROM tbl_project_date
                                            INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id
                                            WHERE   (    (tbl_sub_project.sub_status = 1) AND (tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL)
                                            AND (
                                                tbl_sub_project.sub_project_stage_id = 14  OR 
                                                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                            ) 
                                            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            )  AS agreementSigned_Table ON agreementSigned_Table.organisation_id = mmt_organisation.organisation_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID
                    
                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN agreementSigned_Table.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                agreementSigned_Table.project_id
                    
                                            --ORDER BY 
                                            --    mmt_organisation_category.organisation_category_id, 
                                            --    organisation_category_name, 
                                            --    organisation_name      

                    )

                    
                    select 
                    c4.organisation_id, 
                    c4.organisation_name, 
                    c4.implementation_group,
                    --isnull(isnull(isnull(isnull(milestone0.implementation_group,milestone1.implementation_group),milestone2.implementation_group),milestone3.implementation_group),milestone4.implementation_group)
                    --as implementation_group,
                    --isnull(isnull(isnull(isnull(isnull(milestone0.og_project_id,milestone1.og_project_id),milestone2.og_project_id),milestone3.og_project_id),milestone4.og_project_id),milestone5.og_project_id)
                    --as Project_ID,
                    c4.og_project_id,
                    e.project_name,
                    c4.TotalAwardProject, c5.AggrementSigned,
                    milestone0.Milestone0Count ,milestone1.Milestone1Count,milestone2.Milestone2Count,
                    milestone3.Milestone3Count, milestone4.Milestone4Count,milestone5.FinalMilestoneCount
                    from 

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as TotalAwardProject
                    from COLUMN4
                    group by organisation_id, organisation_name,implementation_group,og_project_id) c4

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as AggrementSigned
                    from COLUMN5
                    group by organisation_id, organisation_name,implementation_group,og_project_id) C5
                    
                    on C5.organisation_id = c4.organisation_id and C5.implementation_group = c4.implementation_group 
                    and C5.og_project_id = c4.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as Milestone0Count
                    from columnA
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone0
                    
                    on milestone0.organisation_id = c4.organisation_id and milestone0.implementation_group = c4.implementation_group 
                    and milestone0.og_project_id = c4.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as Milestone1Count
                    from columnB
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone1

                    on C4.organisation_id = milestone1.organisation_id and C4.implementation_group = milestone1.implementation_group 
                    and C4.og_project_id = milestone1.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as Milestone2Count 
                    from columnC
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone2

                    on C4.organisation_id = milestone2.organisation_id and C4.implementation_group = milestone2.implementation_group 
                    and C4.og_project_id = milestone2.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as Milestone3Count 
                    from columnD
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone3

                    on C4.organisation_id = milestone3.organisation_id and C4.implementation_group = milestone3.implementation_group 
                    and C4.og_project_id = milestone3.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as Milestone4Count 
                    from columnE
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone4

                    on C4.organisation_id = milestone4.organisation_id and C4.implementation_group = milestone4.implementation_group 
                    and C4.og_project_id = milestone4.og_project_id

                    LEFT join

                    (select distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) as FinalMilestoneCount 
                    from COLUMNF
                    group by organisation_id, organisation_name,implementation_group,og_project_id) milestone5

                    on C4.organisation_id = milestone5.organisation_id and c4.implementation_group = milestone5.implementation_group 
                    and C4.og_project_id = milestone5.og_project_id

                    left join 
                    (
                    select mmt_organisation.organisation_id,mmt_organisation.organisation_name, tbl_project.project_name,tbl_project.project_id from mmt_organisation  join tbl_project on mmt_organisation.organisation_id =  tbl_project.organisation_id 
                    -- for Organisation category 
                    where organisation_category_id = @organisation_categoryID 

                    ) e on e.organisation_id = c4.organisation_id  and e.project_id = c4.og_project_id

                    

                    where  
                    case 
                        when @modeofimp = 'PPP' then 'PPP/Captive' 
                        when @modeofimp = 'EPC' then 'EPC/Others' 
                        else 
                        isnull (c4.implementation_group,c5.implementation_group)
                        end =  isnull (c4.implementation_group,c5.implementation_group)

                    order by c4.implementation_group,c4.og_project_id

            end;

    `);
        
      let rowData = result.recordset;  

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        // Format the date as "dd-mm-yyyy"
        const formattedDate = currentDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        rowData = rowData.map(item => {
            return {
                orgHierarchy: [
                    item['implementation_group'],
                    item['project_name'],
                ],
                category: item['implementation_group'],
                org_id: item['organisation_id'],
                og_project_id: item['og_project_id'],
                organisation_name: item['organisation_name'],
                TotalAwardProject: item['TotalAwardProject'],
                AggrementSigned: item['AggrementSigned'],
                Milestone0Count: item['Milestone0Count'],
                Milestone1Count: item['Milestone1Count'],
                Milestone2Count: item['Milestone2Count'],
                Milestone3Count: item['Milestone3Count'],
                Milestone4Count: item['Milestone4Count'],
                FinalMilestoneCount: item['FinalMilestoneCount']
            };
        });
 
        res.json({ rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};

// ***************************************************** GetDetails *******************************************************
async function getDetailsUnderImpColmn45(req, res) {
    const organisationID = req.params.organisationID;
    const modOfImp = req.params.modOfImp;
    const subStage = req.params.subStage;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("modOfImp", modOfImp);
    request.input("subStage", subStage);
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');
    // console.log(asOnDate, "asOnDate");

    // ----------------------------------------------------------------------------------------------------------------------------------     
    let col45 = `SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        project_images.document_name, mmt_organisation.organisation_name, 
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name, sub_project_name, scheme_name, 
        tbl_project_activity.milestone_id, max_stage.milestone_id as max_milestone, max_stage.delay_reason,
        CONVERT(VARCHAR,contract_agreement_date.actual_date, 106) as actual_date,
        CONVERT(VARCHAR,start_date, 106) as start_date,
        CONVERT(VARCHAR,end_date, 106) as end_date

        FROM tbl_project 
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

        Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
        OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

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
            SELECT project_id, sub_project_id, actual_date, sub_stage_id 
            FROM tbl_project_date 
            WHERE (sub_stage_id = @subStage AND actual_date IS NOT NULL ) and sub_project_id = '-1'
        ) contract_agreement_date ON contract_agreement_date.project_id = tbl_project.project_id
    
        LEFT JOIN
        (
            SELECT sub_project_id, actual_date, sub_stage_id 
            FROM tbl_project_date 
            WHERE (sub_stage_id = @subStage AND actual_date IS NOT NULL ) and sub_project_id != '-1'
        ) sub_contract_agreement_date ON
        sub_contract_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
    
        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            WHERE (milestone_id IS NULL OR end_date IS NULL OR start_date is null)
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
            OR max_stage.sub_project_id = tbl_sub_project.sub_project_id
         
        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 ) AND
        (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
 
        AND (( contract_agreement_date.sub_stage_id = @subStage AND contract_agreement_date.actual_date IS NOT NULL)
            or ( sub_contract_agreement_date.sub_stage_id = @subStage AND sub_contract_agreement_date.actual_date IS NOT NULL))
            

        AND ( 
                (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14 )
                OR (  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 )
                OR  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3 ) )   
            )

            AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
            )        
    `
    if (isSagarmalaFunded == 'true') {
        col45 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        col45 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        col45 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    col45 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    try {
        const getDetailsUIProjectStage1 = await request.query(col45);


        const response = { getDetailsUIProjectStage1: getDetailsUIProjectStage1.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// *********************************************** Get grand total Details ***********************************************
async function getGrandTotalUIColmn45(req, res) {
    const modOfImp = req.params.modOfImp;
    const subStage = req.params.subStage;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("modOfImp", modOfImp);
    request.input("subStage", subStage);
    request.input("isSagarmalaFunded", isSagarmalaFunded);
    request.input("orgCategoryFilter", orgCategoryFilter);
    request.input("orgFilter", orgFilter);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');
    // console.log(asOnDate, "asOnDate");

    
    let organisationCategoryId, organisationId;
    if(orgCategoryFilter != 'nofilter') 
    {
        const orgCatQuery = await request.query(
            `SELECT organisation_category_id FROM mmt_organisation_category WHERE organisation_category_name = @orgCategoryFilter`
        );
        const orgCatResult = orgCatQuery.recordset[0];

        organisationCategoryId = orgCatResult.organisation_category_id;
    }

    if(orgFilter != 'nofilter') 
    {
        const orgQuery = await request.query(
            `SELECT organisation_id FROM mmt_organisation WHERE organisation_name = @orgFilter`
        );
        const orgResult = orgQuery.recordset[0];

        organisationId = orgResult.organisation_id;
    }
    // ----------------------------------------------------------------------------------------------------------------------------------     
    let col45 = `SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        project_images.document_name, mmt_organisation.organisation_name, 
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name, sub_project_name, scheme_name, 
        tbl_project_activity.milestone_id, max_stage.milestone_id as max_milestone, max_stage.delay_reason,
        CONVERT(VARCHAR,contract_agreement_date.actual_date, 106) as actual_date,
        CONVERT(VARCHAR,start_date, 106) as start_date,
        CONVERT(VARCHAR,end_date, 106) as end_date

        FROM tbl_project 
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

        Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
        OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT project_id, sub_project_id, document_name 
            FROM tbl_project_document 
            WHERE (document_type = 'project_images') 
        ) project_images ON project_images.project_id = tbl_project.project_id
            OR project_images.sub_project_id = tbl_sub_project.sub_project_id
        
        LEFT JOIN  mmt_organisation ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)
        LEFT JOIN  mmt_scheme ON mmt_scheme.scheme_id = ISNULL(tbl_sub_project.sub_scheme_id, tbl_project.scheme_id)

        LEFT OUTER JOIN
        (
            SELECT project_id, sub_project_id, actual_date, sub_stage_id 
            FROM tbl_project_date 
            WHERE (sub_stage_id = @subStage AND actual_date IS NOT NULL ) and sub_project_id = '-1'
        ) contract_agreement_date ON contract_agreement_date.project_id = tbl_project.project_id
    
        LEFT OUTER JOIN
        (
            SELECT sub_project_id, actual_date, sub_stage_id 
            FROM tbl_project_date 
            WHERE (sub_stage_id = @subStage AND actual_date IS NOT NULL ) and sub_project_id != '-1'
        ) sub_contract_agreement_date ON
        sub_contract_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
    
        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            WHERE (milestone_id IS NULL OR end_date IS NULL OR start_date is null)
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
            OR max_stage.sub_project_id = tbl_sub_project.sub_project_id
         
    `

    // WHERE CONDITION STARTS
    col45 += `   WHERE  ` 


    if(orgCategoryFilter != 'nofilter') {      
        col45 += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        col45 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        col45 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        col45 += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    

    col45 += ` AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 )
    AND (( contract_agreement_date.sub_stage_id = @subStage AND contract_agreement_date.actual_date IS NOT NULL)
        or ( sub_contract_agreement_date.sub_stage_id = @subStage AND sub_contract_agreement_date.actual_date IS NOT NULL))
        

    AND ( 
            (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14 )
            OR (  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 )
            OR  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3 ) )   
        )

        AND (
            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
            OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
        )
    `
       
    if (isSagarmalaFunded == 'true') {
        col45 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        col45 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        col45 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    col45 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    console.log(col45, "col45")

    try {
        const getDetailsUIProjectStage1 = await request.query(col45);


        const response = { getDetailsUIProjectStage1: getDetailsUIProjectStage1.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ************************************************************************************************************************
async function getDetailsUnderImpStage1Report(req, res) {
    const organisationID = req.params.organisationID;
    const milestoneId = req.params.milestoneId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("milestoneId", milestoneId);
    request.input("modOfImp", modOfImp);
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    // ----------------------------------------------------------------------------------------------------------------------------------     
    let stage1 = `SELECT 
    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
    project_images.document_name, mmt_organisation.organisation_name, 
    tbl_project.project_id, tbl_sub_project.sub_project_id, 
    project_name, sub_project_name, scheme_name, 
    tbl_project_activity.milestone_id, max_stage.milestone_id as max_milestone, max_stage.delay_reason,
    CONVERT(VARCHAR,project_agreement_date.actual_date, 106) as actual_date,
    CONVERT(VARCHAR,start_date, 106) as start_date,
    CONVERT(VARCHAR,end_date, 106) as end_date

    FROM tbl_project 
    LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

    Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
    OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

    
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
        SELECT project_id, sub_project_id, actual_date, sub_stage_id 
        FROM tbl_project_date 
        WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) and sub_project_id = '-1'
    ) project_agreement_date ON project_agreement_date.project_id = tbl_project.project_id
   --  OR project_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
  
     LEFT JOIN
    (
        SELECT sub_project_id, actual_date, sub_stage_id 
        FROM tbl_project_date 
        WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) and  sub_project_id != '-1'
    ) project_agreement_date1 ON
    --project_agreement_date.project_id = tbl_project.project_id OR
    project_agreement_date1.sub_project_id = tbl_sub_project.sub_project_id
  

    LEFT JOIN
    (
        SELECT 
        tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
        MAX(milestone_id) AS milestone_id
        
        FROM tbl_project_activity
         WHERE (milestone_id IS NULL OR end_date IS NULL OR start_date is null)
        --AND (sub_project_id = '-1') 
        GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
    ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
        OR max_stage.sub_project_id = tbl_sub_project.sub_project_id

        
        LEFT JOIN
        ( 
            SELECT tbl_project_physical_progress.project_id, tbl_project_physical_progress.sub_project_id,
            MAX(physical_progress) AS physical_progress, tbl_project.organisation_id
            FROM tbl_project_physical_progress
            Left join tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id

            where tbl_project_physical_progress.sub_project_id = '-1' AND organisation_id = @organisationID
        
           
            Group by tbl_project_physical_progress.project_id, 
            tbl_project_physical_progress.sub_project_id, organisation_id

        ) AS tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id
          --  OR tbl_project_physical_progress.sub_project_id = tbl_sub_project.sub_project_id

          
          LEFT JOIN
          ( 
              SELECT tbl_project_physical_progress.project_id, tbl_project_physical_progress.sub_project_id,
              MAX(physical_progress) AS physical_progress, tbl_sub_project.sub_organisation_id
              FROM tbl_project_physical_progress
  
          --	Left join tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
              Left join tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
              
              where tbl_project_physical_progress.sub_project_id != '-1' AND sub_organisation_id = @organisationID
              --AND (physical_progress >= 0 AND physical_progress <= 19)
              Group by tbl_project_physical_progress.project_id,
              tbl_project_physical_progress.sub_project_id, sub_organisation_id
  
  
          ) AS tbl_project_physical_progress1 ON tbl_project_physical_progress1.sub_project_id = tbl_sub_project.sub_project_id
          

        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 ) AND
        (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
 
        AND (( project_agreement_date.sub_stage_id = 10 AND project_agreement_date.actual_date IS NOT NULL)
            or ( project_agreement_date1.sub_stage_id = 10 AND project_agreement_date1.actual_date IS NOT NULL))
        AND (start_date is null OR end_date IS NULL  ) 
        AND ( (tbl_project_physical_progress.physical_progress >= 0 AND tbl_project_physical_progress.physical_progress <= 19) 
                OR            
                (tbl_project_physical_progress1.physical_progress >= 0 AND tbl_project_physical_progress1.physical_progress <= 19) 
            )

        AND ( 
                (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) != 14 )
                AND (  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 )
                OR  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3 ) )   
            )           
    `
    if (isSagarmalaFunded == 'true') {
        stage1 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        stage1 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        stage1 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    stage1 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    try {
        const getDetailsUIProjectStage1 = await request.query(stage1);


        const response = { getDetailsUIProjectStage1: getDetailsUIProjectStage1.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


// ************************************************************************************************************************
async function getDetailsUIStage1GrTotal(req, res) 
{
    const milestoneId = req.params.milestoneId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("milestoneId", milestoneId);
    request.input("modOfImp", modOfImp);
    request.input("isSagarmalaFunded", isSagarmalaFunded);
    request.input("orgCategoryFilter", orgCategoryFilter);
    request.input("orgFilter", orgFilter);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    
    let organisationCategoryId, organisationId;
    if(orgCategoryFilter != 'nofilter') 
    {
        const orgCatQuery = await request.query(
            `SELECT organisation_category_id FROM mmt_organisation_category WHERE organisation_category_name = @orgCategoryFilter`
        );
        const orgCatResult = orgCatQuery.recordset[0];

        organisationCategoryId = orgCatResult.organisation_category_id;
    }

    if(orgFilter != 'nofilter') 
    {
        const orgQuery = await request.query(
            `SELECT organisation_id FROM mmt_organisation WHERE organisation_name = @orgFilter`
        );
        const orgResult = orgQuery.recordset[0];

        organisationId = orgResult.organisation_id;
    }

    // ----------------------------------------------------------------------------------------------------------------------------------     
    let stage1 = `SELECT 
    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
    project_images.document_name, mmt_organisation.organisation_name, 
    tbl_project.project_id, tbl_sub_project.sub_project_id, 
    project_name, sub_project_name, scheme_name, 
    tbl_project_activity.milestone_id, max_stage.milestone_id as max_milestone, max_stage.delay_reason,
    CONVERT(VARCHAR,project_agreement_date.actual_date, 106) as actual_date,
    CONVERT(VARCHAR,start_date, 106) as start_date,
    CONVERT(VARCHAR,end_date, 106) as end_date

    FROM tbl_project 
    LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

    Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
    OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

    
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
        SELECT project_id, sub_project_id, actual_date, sub_stage_id 
        FROM tbl_project_date 
        WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) and sub_project_id = '-1'
    ) project_agreement_date ON project_agreement_date.project_id = tbl_project.project_id
   --  OR project_agreement_date.sub_project_id = tbl_sub_project.sub_project_id
  
     LEFT JOIN
    (
        SELECT sub_project_id, actual_date, sub_stage_id 
        FROM tbl_project_date 
        WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) and  sub_project_id != '-1'
    ) project_agreement_date1 ON
    --project_agreement_date.project_id = tbl_project.project_id OR
    project_agreement_date1.sub_project_id = tbl_sub_project.sub_project_id
  

    LEFT JOIN
    (
        SELECT 
        tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
        MAX(milestone_id) AS milestone_id
        
        FROM tbl_project_activity
         WHERE (milestone_id IS NULL OR end_date IS NULL OR start_date is null)
    
        GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
    ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
        OR max_stage.sub_project_id = tbl_sub_project.sub_project_id

        
        LEFT JOIN
        ( 
            SELECT tbl_project_physical_progress.project_id, tbl_project_physical_progress.sub_project_id,
            MAX(physical_progress) AS physical_progress, tbl_project.organisation_id
            FROM tbl_project_physical_progress
            Left join tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id

            where tbl_project_physical_progress.sub_project_id = '-1' AND organisation_id != 4
        
           
            Group by tbl_project_physical_progress.project_id, 
            tbl_project_physical_progress.sub_project_id, organisation_id

        ) AS tbl_project_physical_progress ON tbl_project_physical_progress.project_id = tbl_project.project_id
                  
          LEFT JOIN
          ( 
                SELECT tbl_project_physical_progress.project_id, tbl_project_physical_progress.sub_project_id,
                MAX(physical_progress) AS physical_progress, tbl_sub_project.sub_organisation_id
                FROM tbl_project_physical_progress
                Left join tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
                
                where tbl_project_physical_progress.sub_project_id != '-1' AND sub_organisation_id != 4
                Group by tbl_project_physical_progress.project_id,
                tbl_project_physical_progress.sub_project_id, sub_organisation_id
  
  
          ) AS tbl_project_physical_progress1 ON tbl_project_physical_progress1.sub_project_id = tbl_sub_project.sub_project_id
          
    `

    // WHERE CONDITION STARTS
    stage1 += `   WHERE  ` 
    

    if(orgCategoryFilter != 'nofilter') {      
        stage1 += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        stage1 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        stage1 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        stage1 += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    

    stage1 += `   AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 )
        AND (( project_agreement_date.sub_stage_id = 10 AND project_agreement_date.actual_date IS NOT NULL)
            or ( project_agreement_date1.sub_stage_id = 10 AND project_agreement_date1.actual_date IS NOT NULL))
        AND (start_date is null OR end_date IS NULL  ) 
        AND ( (tbl_project_physical_progress.physical_progress >= 0 AND tbl_project_physical_progress.physical_progress <= 19) 
                OR            
                (tbl_project_physical_progress1.physical_progress >= 0 AND tbl_project_physical_progress1.physical_progress <= 19) 
            )

        AND ( 
                (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) != 14 )
                AND (  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 )
                OR  (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3 ) )   
            )       
        `



    if (isSagarmalaFunded == 'true') {
        stage1 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        stage1 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        stage1 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    stage1 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    try {
        const getDetailsUIProjectStage1 = await request.query(stage1);


        const response = { getDetailsUIProjectStage1: getDetailsUIProjectStage1.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ************************************************************************************************************************
async function getDetailsUIColumnBtoFReport(req, res) {
    const organisationID = req.params.organisationID;
    const milestoneId = req.params.milestoneId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("milestoneId", milestoneId);
    request.input("modOfImp", modOfImp);
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');
    // console.log(asOnDate, "asOnDate");

    // ----------------------------------------------------------------------------------------------------------------------------------     
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
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

        Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
        OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT project_id, sub_project_id, actual_date 
            FROM tbl_project_date 
            WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) 
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

        INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
			OR tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id


        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            -- INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_activity.project_id
            WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL) 
                AND (sub_project_id = '-1') 
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
            --OR max_stage.sub_project_id = tbl_sub_project.sub_project_id
    
    
        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL) 
            AND (sub_project_id != '-1') 
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage1 ON 
        --max_stage.project_id =  tbl_project.project_id OR
                max_stage1.sub_project_id = tbl_sub_project.sub_project_id
       

        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 ) AND
        (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
        AND ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL) AND
        (end_date IS NOT NULL)  
        AND ( (tbl_project_activity.milestone_id <= @milestoneId AND max_stage.milestone_id = @milestoneId) 
        OR ( tbl_project_activity.milestone_id <= @milestoneId AND max_stage1.milestone_id = @milestoneId) )
        
        
        AND	(
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 14
            OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 11
            OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 3
        )
        AND (
            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
            OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)  BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
        ) 

    `

    if (isSagarmalaFunded == 'true') {
        stageWise += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (modOfImp == 'PPP+Captive') {
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    stageWise += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name `;

    try {

        const getDetailsUIProject = await request.query(stageWise);

        const response = { getDetailsUIProject: getDetailsUIProject.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

// ************************************************Grand Total ***************************************************************
async function getDetailsGrTotalUIColumnBtoF(req, res) {
    const milestoneId = req.params.milestoneId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("milestoneId", milestoneId);
    request.input("modOfImp", modOfImp);
    request.input("isSagarmalaFunded", isSagarmalaFunded);
    request.input("orgCategoryFilter", orgCategoryFilter);
    request.input("orgFilter", orgFilter);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];

    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2025
        lastDatePreviousFy = (currentYear) + "-03-31";
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');
    // console.log(asOnDate, "asOnDate");

    
    let organisationCategoryId, organisationId;
    if(orgCategoryFilter != 'nofilter') 
    {
        const orgCatQuery = await request.query(
            `SELECT organisation_category_id FROM mmt_organisation_category WHERE organisation_category_name = @orgCategoryFilter`
        );
        const orgCatResult = orgCatQuery.recordset[0];

        organisationCategoryId = orgCatResult.organisation_category_id;
    }

    if(orgFilter != 'nofilter') 
    {
        const orgQuery = await request.query(
            `SELECT organisation_id FROM mmt_organisation WHERE organisation_name = @orgFilter`
        );
        const orgResult = orgQuery.recordset[0];

        organisationId = orgResult.organisation_id;
    }
    // ----------------------------------------------------------------------------------------------------------------------------------     
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
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id

        Left JOIN tbl_project_activity ON tbl_project_activity.project_id = tbl_project.project_id
        OR tbl_project_activity.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT project_id, sub_project_id, actual_date 
            FROM tbl_project_date 
            WHERE (sub_stage_id = 10 AND actual_date IS NOT NULL ) 
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

        INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
			OR tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id


        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            -- INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_activity.project_id
            WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL) 
                AND (sub_project_id = '-1') 
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
          
    
        LEFT JOIN
        (
            SELECT 
            tbl_project_activity.project_id, tbl_project_activity.sub_project_id, delay_reason,
            MAX(milestone_id) AS milestone_id
            
            FROM tbl_project_activity
            WHERE (milestone_id IS NOT NULL AND end_date IS NOT NULL) 
            AND (sub_project_id != '-1') 
            GROUP BY tbl_project_activity.project_id, delay_reason, sub_project_id 
        ) AS max_stage1 ON 
            max_stage1.sub_project_id = tbl_sub_project.sub_project_id

    `

    // WHERE CONDITION STARTS
    stageWise += `   WHERE  ` 


    if(orgCategoryFilter != 'nofilter') {      
        stageWise += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        stageWise += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        stageWise += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        stageWise += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    

    stageWise += ` AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 ) 
        AND ( tbl_project_date.sub_stage_id = 10 AND tbl_project_date.actual_date IS NOT NULL) AND
        (end_date IS NOT NULL)  
        AND ( 
                (tbl_project_activity.milestone_id <= @milestoneId AND max_stage.milestone_id = @milestoneId) 
                OR ( tbl_project_activity.milestone_id <= @milestoneId AND max_stage1.milestone_id = @milestoneId) 
            )
        
        
        AND	(
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 14
            OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 11
            OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 3
        )
        AND (
            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
            OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)  BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
        ) 
    `
       
    if (isSagarmalaFunded == 'true') {
        stageWise += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (modOfImp == 'PPP+Captive') {
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        stageWise += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    stageWise += `	
        ORDER BY tbl_project.project_id `;
        console.log(stageWise, "stageWise")

    try {

        const getDetailsUIProject = await request.query(stageWise);

        const response = { getDetailsUIProject: getDetailsUIProject.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

// ******************************************************** Download image ********************************************************

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uiReportImageDownload(req, res) {
    try {
        const fileName = req.params.filename;
        const subProjectID = req.params.subProjectID;

        // console.log(subProjectID, "subProjectID")

        let file_path;
        if (subProjectID == "null") {
            file_path = path.join(__dirname, "../../../fileuploads/Project_Documents/project_images/mainProject", fileName);
        }
        else {
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
            console.error("File not found ON the server.");
            res.status(404).send({ message: "File not found" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
}

export default {
    underImplementationReport, getDetailsUnderImpStage1Report, getDetailsUIStage1GrTotal, getDetailsUnderImpColmn45, 
    getGrandTotalUIColmn45, getDetailsUIColumnBtoFReport, getDetailsGrTotalUIColumnBtoF, uiReportImageDownload,
    iwaiUnderImplementationReport
};

