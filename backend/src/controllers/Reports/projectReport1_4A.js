import { pool } from "../../db.js";
import moment from 'moment';

async function financialProgressReport(req, res) 
{
    // const conn = await pool;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const conn = await pool;

    const request = conn.request();
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy, currentYearColE;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    let financialMonth;
    // console.log("currentMonth", currentMonth, financialMonth)

    if (currentMonth == 4) {
        financialMonth = 1;
    }
    else if (currentMonth == 5) {
        financialMonth = 2;
    }
    else if (currentMonth == 6) {
        financialMonth = 3;
    }
    else if (currentMonth == 7) {
        financialMonth = 4;
    }
    else if (currentMonth == 8) {
        financialMonth = 5;
    }
    else if (currentMonth == 9) {
        financialMonth = 6;
    }
    else if (currentMonth == 10) {
        financialMonth = 7;
    }
    else if (currentMonth == 11) {
        financialMonth = 8;
    }
    else if (currentMonth == 12) {
        financialMonth = 9;
    }
    else if (currentMonth == 1) {
        financialMonth = 10;
    } else if (currentMonth == 2) {
        financialMonth = 11;
    }
    else if (currentMonth == 3) {
        financialMonth = 12;
    }


    //  lastdate previous year - COLUMN -3,4,5
    // Add month prefix 0 before 9 month Eg: 09 month
    console.log(currentMonth, "currentMonth")
    if (currentMonth < 10) {
        currentMonth = "0" + currentMonth;
    }

    // From 1st April of the Current FY till the beginning of the month - column D
    if (currentMonth <= 3 && currentMonth >= 1) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
        lastDateCurrentFy = currentYear + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1) + "-03-31";
        // console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")  

        // Eg:${currentYearColE} For Column E
        currentYearColE = (currentYear - 1) + "-" + currentYear;

    }
    else {
        firstDateCurrentFy = (currentYear) + "-04-01";
        lastDateCurrentFy = (currentYear + 1) + "-03-31";

        // GET 31.03.2024
        lastDatePreviousFy = (currentYear) + "-03-31";
        // console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy", lastDatePreviousFy, "lastDatePreviousFy") 

        // Eg:2024-2024 - For Column E
        currentYearColE = (currentYear) + "-" + (currentYear + 1);
        // console.log(currentYearColE, "currentYearColE2132")
    }

    // Today date
    let todayDate = new Date().toISOString().split('T')[0];

    const currentMonthFirstDate = moment().startOf('month').format('YYYY-MM-DD');

    // During the month - Last date - Eg: 2024-12-01 (Using Moment)
    const previousMonthLastDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    // ******************************************* Column 4 ******************************************

    let column4 = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.sanctioned_cost
        
            FROM tbl_project
            --INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
            WHERE   (  (admin_approval_approval_date <= '${lastDatePreviousFy}' OR chairman_approval_date <= '${lastDatePreviousFy}') 
            AND ( tbl_project.status = 1)       )
       `

    if(isSagarmalaFunded == 'true') {
        column4 += "AND is_sagarmala_funded =  1"
    }

    column4 += ` 
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_sanctioned_cost
    
        FROM tbl_sub_project
        --INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
        WHERE   (    (sub_admin_approval_approval_date <= '${lastDatePreviousFy}' OR sub_chairman_approval_date <= '${lastDatePreviousFy}' ) 
        AND tbl_sub_project.sub_status = 1  )
    `
    if(isSagarmalaFunded == 'true') {
        column4 += "AND sub_is_sagarmala_funded =  1"
    }

    column4 += ` 
        )  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
                
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column 5 *********************************************
    let column5 = `SELECT organisation_category_name,
    mmt_organisation.organisation_id, organisation_name,
    CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
    ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
    
    FROM mmt_organisation 
    LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

    LEFT JOIN
    ( 
        SELECT tbl_project.organisation_id, 
        tbl_project.project_id,
        tbl_project.mode_of_implememtation,
        tbl_project.award_project_cost
      
        FROM tbl_project
        INNER JOIN tbl_project_date on tbl_project_date.project_id = tbl_project.project_id
        WHERE    (    (sub_stage_id = 9 AND actual_date is NOT NULL AND actual_date <= '${lastDatePreviousFy}' ) 
           AND ( tbl_project.status = 1 AND sub_project_id = '-1')  )
    `

    if(isSagarmalaFunded == 'true') {
        column5 += "AND is_sagarmala_funded =  1"
    }

    column5 += ` 
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost
    
        FROM tbl_sub_project
        INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id
        WHERE (   (sub_stage_id = 9 AND actual_date is NOT NULL AND actual_date <= '${lastDatePreviousFy}' )  
        AND tbl_sub_project.sub_status = 1      )
    `
    if(isSagarmalaFunded == 'true') {
        column5 += "AND sub_is_sagarmala_funded =  1"
    }

    column5 += ` 
        )  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
                
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column 6 *********************************************  

    let column6 = `SELECT organisation_category_name,
    mmt_organisation.organisation_id, organisation_name,
    CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
    financialStatuse_beginingYear.total_expenditure AS total_expenditure
    
    FROM mmt_organisation 
    LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

    LEFT JOIN
    ( 
        SELECT tbl_project.organisation_id, 
        tbl_project.project_id,
        tbl_project.mode_of_implememtation,
        SUM(tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + 
                tbl_project_expenditure.ppp_components + 
                tbl_project_expenditure.loans_components + 
                tbl_project_expenditure.multilateral_components +  tbl_project_expenditure.state_gov_fund_components +
                tbl_project_expenditure.pmmsy_components + tbl_project_expenditure.sagarmala_components +
                tbl_project_expenditure.other_source_funding_comp) AS total_expenditure

        FROM tbl_project
        INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
        WHERE   (  (expenditure_date <= '${lastDatePreviousFy}' AND tbl_project.status = 1 ) 
           AND (sub_project_id = '-1')      )
       `

    if(isSagarmalaFunded == 'true') {
        column6 += "AND is_sagarmala_funded =  1"
    }

    column6 += ` 
        GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
        tbl_project.award_project_cost, tbl_project.sanctioned_cost

        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        SUM(tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + 
            tbl_project_expenditure.ppp_components + 
            tbl_project_expenditure.loans_components + 
            tbl_project_expenditure.multilateral_components + tbl_project_expenditure.state_gov_fund_components + 
            tbl_project_expenditure.pmmsy_components + tbl_project_expenditure.sagarmala_components +
            tbl_project_expenditure.other_source_funding_comp) AS total_expenditure
        FROM tbl_sub_project
        INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
        WHERE   (    (expenditure_date <= '${lastDatePreviousFy}' AND tbl_sub_project.sub_status = 1)   )
    `
    if(isSagarmalaFunded == 'true') {
        column6 += "AND sub_is_sagarmala_funded =  1"
    }

    column6 += ` 
        GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

        )  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            financialStatuse_beginingYear.total_expenditure, 
            CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column A *********************************************    
    let columnA = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN columnA_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(columnA_complete_count.project_id) AS completion_project_fy_count,
        ROUND(SUM(columnA_complete_count.award_project_cost), 2) AS award_project_cost
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.award_project_cost        

            FROM tbl_project
            WHERE    (    (actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}') AND
                ( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)   )
       `

    if(isSagarmalaFunded == 'true') {
        columnA += "AND is_sagarmala_funded =  1"
    }

    columnA += ` 
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost

        FROM tbl_sub_project
        WHERE   ( (sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}') AND
        ( sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )       )
    `
    if(isSagarmalaFunded == 'true') {
        columnA += "AND sub_is_sagarmala_funded =  1"
    }

    columnA += ` 
        )  AS columnA_complete_count on columnA_complete_count.organisation_id = mmt_organisation.organisation_id
          
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN columnA_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column B *********************************************    
    let columnB = `SELECT organisation_category_name,
       mmt_organisation.organisation_id, organisation_name,
       CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
       COUNT(columnB_complete_count.project_id) AS current_month_completion_count,
       ROUND(SUM(columnB_complete_count.award_project_cost), 2) AS award_project_cost
       FROM mmt_organisation 
       LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

       LEFT JOIN
       ( 
           SELECT tbl_project.organisation_id, 
           tbl_project.project_id,
           tbl_project.mode_of_implememtation,
           tbl_project.award_project_cost        

           FROM tbl_project
           WHERE    (    (actual_date_of_completion BETWEEN '${currentMonthFirstDate}' AND '${todayDate}') AND
               ( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)        ) 
      `

    if(isSagarmalaFunded == 'true') {
        columnB += "AND is_sagarmala_funded =  1"
    }

    columnB += ` 
       UNION

       SELECT tbl_sub_project.sub_organisation_id, 
       tbl_sub_project.sub_project_id,
       tbl_sub_project.sub_mode_of_implememtation,
       tbl_sub_project.sub_award_project_cost

       FROM tbl_sub_project
       WHERE    (    (sub_actual_date_of_completion BETWEEN '${currentMonthFirstDate}' AND '${todayDate}') AND
        (sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )        )  
   `
   if(isSagarmalaFunded == 'true') {
        columnB += "AND sub_is_sagarmala_funded =  1"
    }

    columnB += ` 
        )  AS columnB_complete_count on columnB_complete_count.organisation_id = mmt_organisation.organisation_id
            
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
   `;


    // ********************************************* Column A *********************************************    
    let columnD = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN columnD_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(columnD_complete_count.project_id) AS completion_project_fy_count,
        ROUND(SUM(columnD_complete_count.closure_cost), 2) AS closure_cost
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.closure_cost        

            FROM tbl_project
            WHERE   (    (actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}') AND
                ( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)       ) 
        `

    if(isSagarmalaFunded == 'true') {
        columnD += "AND is_sagarmala_funded =  1"
    }

    columnD += ` 
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_closure_cost

        FROM tbl_sub_project
        WHERE   (        (sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}') AND
        ( sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )   )
    `
    if(isSagarmalaFunded == 'true') {
        columnD += "AND sub_is_sagarmala_funded =  1"
    }

    columnD += ` 
        )  AS columnD_complete_count ON columnD_complete_count.organisation_id = mmt_organisation.organisation_id
            
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN columnD_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column E *********************************************    
    let columnE = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN proportionate_Data.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        SUM(proportionate_Data.total_outlay) AS total_outlay,
        SUM ( (proportionate_Data.total_outlay/12) * ${financialMonth - 1} ) AS proportionate_value	

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project_expenditure_outlay.year,
            expenditure_outlay AS total_outlay

            FROM tbl_project
            INNER JOIN tbl_project_expenditure_outlay on tbl_project_expenditure_outlay.project_id = tbl_project.project_id
            WHERE   (  (year = '${currentYearColE}' AND tbl_project.status = 1) 
            AND (sub_project_id = '-1')  )
       `

    if(isSagarmalaFunded == 'true') {
        columnE += "AND is_sagarmala_funded =  1"
    }

    columnE += ` 
        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project_expenditure_outlay.year,
        expenditure_outlay AS total_outlay
    
        FROM tbl_sub_project
        INNER JOIN tbl_project_expenditure_outlay ON tbl_project_expenditure_outlay.sub_project_id = tbl_sub_project.sub_project_id
        WHERE   (  (year = '${currentYearColE}' AND tbl_sub_project.sub_status = 1)  )
         
    `
    if(isSagarmalaFunded == 'true') {
        columnE += "AND sub_is_sagarmala_funded =  1"
    }

    columnE += ` 
        )  AS proportionate_Data on proportionate_Data.organisation_id = mmt_organisation.organisation_id
           
        WHERE mmt_organisation.organisation_id != 4
        
        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name, 
            CASE WHEN proportionate_Data.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    // ********************************************* Column f *********************************************    
    let columnF = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
 
        ROUND(SUM(financialStatuse_beginingYear.total_expenditure), 2) AS total_expenditure,
        ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost,
        ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.award_project_cost, tbl_project.sanctioned_cost,
            SUM(`;

        if (isSagarmalaFunded == 'true') {
            columnF += `COALESCE(tbl_project_expenditure.sagarmala_components, 0)`;
        } else {
            columnF += `COALESCE(tbl_project_expenditure.gbs_components, 0) + COALESCE(tbl_project_expenditure.iebr_components, 0) + COALESCE(tbl_project_expenditure.ppp_components, 0) + COALESCE(tbl_project_expenditure.sagarmala_components, 0) + COALESCE(tbl_project_expenditure.pmmsy_components, 0)`;
        }       

        columnF += `) AS total_expenditure

            FROM tbl_project
            INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
            WHERE   (     ( (tbl_project_expenditure.expenditure_date BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}')
                AND tbl_project.status = 1 ) 
            AND (sub_project_id = '-1')         )
    `

    if(isSagarmalaFunded == 'true') {
        columnF += "AND is_sagarmala_funded =  1"
    }

    columnF += ` 
        GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
        tbl_project.award_project_cost, tbl_project.sanctioned_cost

        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost,
         SUM(`;

        if (isSagarmalaFunded == 'true') {
            columnF += `COALESCE(tbl_project_expenditure.sagarmala_components, 0)`;
        } else {
            columnF += `COALESCE(tbl_project_expenditure.gbs_components, 0) + COALESCE(tbl_project_expenditure.iebr_components, 0) + COALESCE(tbl_project_expenditure.ppp_components, 0) + COALESCE(tbl_project_expenditure.sagarmala_components, 0) + COALESCE(tbl_project_expenditure.pmmsy_components, 0)`;
        }

        columnF += `) AS total_expenditure
        FROM tbl_sub_project
        INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
        WHERE   (   ((tbl_project_expenditure.expenditure_date BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}')
                AND tbl_sub_project.sub_status = 1)         )
    `
    if(isSagarmalaFunded == 'true') {
        columnF += "AND sub_is_sagarmala_funded =  1"
    }

    columnF += ` 
        GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

        )  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;



    // ********************************************* Column G *********************************************    
    let columnG = `SELECT organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
 
         ROUND(SUM(financialStatuse_beginingYear.total_expenditure), 2) AS total_expenditure,
        ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost,
        ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.award_project_cost, tbl_project.sanctioned_cost,
            SUM(`;

        if (isSagarmalaFunded == 'true') {
            columnG += `COALESCE(tbl_project_expenditure.sagarmala_components, 0)`;
        } else {
            columnG += `COALESCE(tbl_project_expenditure.gbs_components, 0) + COALESCE(tbl_project_expenditure.iebr_components, 0) + COALESCE(tbl_project_expenditure.ppp_components, 0) + COALESCE(tbl_project_expenditure.sagarmala_components, 0) + COALESCE(tbl_project_expenditure.pmmsy_components, 0)`;
        }

        columnG += `) AS total_expenditure
            FROM tbl_project
            INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
            WHERE    (    ( (tbl_project_expenditure.expenditure_date BETWEEN '${currentMonthFirstDate}' AND '${todayDate}')
                 AND tbl_project.status = 1 ) 
            AND (sub_project_id = '-1')         )
    `

    if(isSagarmalaFunded == 'true') {
        columnG += "AND is_sagarmala_funded =  1"
    }

    columnG += ` 
        GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
        tbl_project.award_project_cost, tbl_project.sanctioned_cost

        UNION

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost,
        SUM(`;

        if (isSagarmalaFunded == 'true') {
            columnG += `COALESCE(tbl_project_expenditure.sagarmala_components, 0)`;
        } else {
            columnG += `COALESCE(tbl_project_expenditure.gbs_components, 0) + COALESCE(tbl_project_expenditure.iebr_components, 0) + COALESCE(tbl_project_expenditure.ppp_components, 0) + COALESCE(tbl_project_expenditure.sagarmala_components, 0) + COALESCE(tbl_project_expenditure.pmmsy_components, 0)`;
        }

        columnG += `) AS total_expenditure
        FROM tbl_sub_project
        INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
        WHERE   (        ( (tbl_project_expenditure.expenditure_date BETWEEN '${currentMonthFirstDate}' AND '${todayDate}')
                 AND tbl_sub_project.sub_status = 1)        )
    `
    if(isSagarmalaFunded == 'true') {
        columnG += "AND sub_is_sagarmala_funded =  1"
    }

    columnG += ` 
        GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
        tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

        )  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,                 
            CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
        
        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name
    `;

    console.log(columnE)

    try {

        const column4Query = await request.query(column4);

        const column5Query = await request.query(column5);

        const column6Query = await request.query(column6);

        // COLUMN A
        const projectCompletionFYQuery = await request.query(columnA);

        // COLUMN B
        const proCompletionDuringCurrentMonth = await request.query(columnB);

        // COLUMN D
        const fyValueofCompletedProQuery = await request.query(columnD);

        // COLUMN E
        const proportionateValQuery = await conn.query(columnE);

        // COLUMN F
        const financialProgressFYQuery = await conn.query(columnF);

        const finProgDuringCurrentMonthy = await request.query(columnG);

        // res.json(result.recordset);
        const response = {
            column4Query: column4Query.recordset, column5Query: column5Query.recordset,
            column6Query: column6Query.recordset,
            projectCompletionFY: projectCompletionFYQuery.recordset,
            projectCompletionDuringMonth: proCompletionDuringCurrentMonth.recordset,
            fyValueofCompletedProQuery: fyValueofCompletedProQuery.recordset,
            proportionateValQuery: proportionateValQuery.recordset,
            financialProgressFYQuery: financialProgressFYQuery.recordset,
            finProgDuringCurrentMonthy: finProgDuringCurrentMonthy.recordset
        }
        res.json(response);

    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaiFinancialProgressReport(req, res) 
{
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
    
        let financialMonth;
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


            set @organisation_categoryID = ${organisation_categoryID};
            set @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalaFunded};
            SET @og_projectid = '';
            SET @modeofimp = '${category}';
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

with allprojectsubproject as ( 

								SELECT organisation_category_name,
								mmt_organisation.organisation_id, organisation_name,
								CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
								physical_progress_tab.project_id,
								physical_progress_tab.project_name,
								case when physical_progress_tab.project_id in (SELECT sub_project_id from tbl_sub_project)
								then (SELECT project_id from tbl_sub_project WHERE sub_project_id = physical_progress_tab.project_id)
								else physical_progress_tab.project_id end as og_project_id,

								case when physical_progress_tab.project_id in (SELECT sub_project_id from tbl_sub_project)
								then (SELECT project_name from tbl_project WHERE project_id in ( SELECT project_id from tbl_sub_project WHERE sub_project_id = physical_progress_tab.project_id))
								else (SELECT Project_name from tbl_project WHERE project_id in( physical_progress_tab.project_id)) end as og_project_name

							
								
								FROM mmt_organisation 
								LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

								JOIN
								( 
									SELECT tbl_project.organisation_id, 
									tbl_project_physical_progress.project_id,
									tbl_project.mode_of_implememtation,
									tbl_project.project_name
									FROM tbl_project_physical_progress
            
									INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_physical_progress.project_id
									INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

									WHERE   
									
									
									 (tbl_project_physical_progress.sub_project_id = '-1') 
									AND (
										tbl_project.project_stage_id = 14  OR 
										tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
									)          
									
									AND is_sagarmala_funded =  @issagarmalafunded

									GROUP BY organisation_id, tbl_project_physical_progress.project_id, 
								    mode_of_implememtation,project_name
        
								UNION

								SELECT tbl_sub_project.sub_organisation_id, 
								tbl_project_physical_progress.sub_project_id,
								tbl_sub_project.sub_mode_of_implememtation,
								tbl_sub_project.sub_project_name
								FROM tbl_project_physical_progress
        
								INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_physical_progress.sub_project_id
								INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id

								WHERE 
									(tbl_sub_project.sub_project_stage_id = 14  OR 
									tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 )
								
								

								AND sub_is_sagarmala_funded =  @issagarmalafunded

								GROUP BY sub_organisation_id, tbl_project_physical_progress.sub_project_id, 
									sub_mode_of_implememtation,sub_project_name

								)  AS physical_progress_tab ON physical_progress_tab.organisation_id = mmt_organisation.organisation_id
        
								WHERE mmt_organisation.organisation_id = @organisation_ID
								
								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
									project_name,
									CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									physical_progress_tab.project_id
),

costofSanctionedProjects as (
							   SELECT organisation_category_name,
								mmt_organisation.organisation_id, organisation_name,
								CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
								financialStatuse_beginingYear.project_id,
								case when financialStatuse_beginingYear.project_id in (SELECT sub_project_id from tbl_sub_project) 
								then (SELECT project_id from tbl_sub_project WHERE sub_project_id = financialStatuse_beginingYear.project_id)
								else financialStatuse_beginingYear.project_id end as og_project_id,
								ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost
        
								FROM mmt_organisation 
								LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

								 JOIN
								( 
									SELECT tbl_project.organisation_id, 
									tbl_project.project_id,
									tbl_project.mode_of_implememtation,
									tbl_project.sanctioned_cost
        
									FROM tbl_project
									
									WHERE   (  (admin_approval_approval_date <= @currentyearstart OR chairman_approval_date <= @currentyearstart) 
									AND ( tbl_project.status = 1)       )
       

						   AND is_sagarmala_funded =  @issagarmalafunded


								UNION

								SELECT tbl_sub_project.sub_organisation_id, 
								tbl_sub_project.sub_project_id,
								tbl_sub_project.sub_mode_of_implememtation,
								tbl_sub_project.sub_sanctioned_cost
    
								FROM tbl_sub_project
								
								WHERE   (    (sub_admin_approval_approval_date <= @currentyearstart OR sub_chairman_approval_date <= @currentyearstart ) 
								AND tbl_sub_project.sub_status = 1  )

							AND sub_is_sagarmala_funded =  @issagarmalafunded

								)  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
                
								WHERE mmt_organisation.organisation_id = @organisation_ID

								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
									CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									financialStatuse_beginingYear.project_id

        ),
		costofAwardedProjects as (
		
										SELECT organisation_category_name,
									mmt_organisation.organisation_id, organisation_name,
									CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
									case when financialStatuse_beginingYear.project_id in (SELECT sub_project_id from tbl_sub_project) 
									then (SELECT project_id from tbl_sub_project WHERE sub_project_id = financialStatuse_beginingYear.project_id)
									else financialStatuse_beginingYear.project_id end as og_project_id,
									ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
    
									FROM mmt_organisation 
									LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

									 JOIN
									( 
										SELECT tbl_project.organisation_id, 
										tbl_project.project_id,
										tbl_project.mode_of_implememtation,
										tbl_project.award_project_cost
      
										FROM tbl_project
										INNER JOIN tbl_project_date on tbl_project_date.project_id = tbl_project.project_id
										WHERE    (    (sub_stage_id = 9 AND actual_date is NOT NULL AND actual_date <= @currentyearstart ) 
										   AND ( tbl_project.status = 1 AND sub_project_id = '-1')  )
    
									AND is_sagarmala_funded =  @issagarmalafunded

										UNION

										SELECT tbl_sub_project.sub_organisation_id, 
										tbl_sub_project.sub_project_id,
										tbl_sub_project.sub_mode_of_implememtation,
										tbl_sub_project.sub_award_project_cost
    
										FROM tbl_sub_project
										INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id
										WHERE (   (sub_stage_id = 9 AND actual_date is NOT NULL AND actual_date <= @currentyearstart )  
										AND tbl_sub_project.sub_status = 1      )
    
									AND sub_is_sagarmala_funded =  @issagarmalafunded

										)  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
                
										WHERE mmt_organisation.organisation_id = @organisation_ID

										GROUP BY
											mmt_organisation_category.organisation_category_id, 
											organisation_category_name, 
											mmt_organisation.organisation_id, 
											organisation_name,
											CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
											financialStatuse_beginingYear.project_id

    

		),
		ExpenditureTillDate as (
		
								SELECT organisation_category_name,
							mmt_organisation.organisation_id, organisation_name,
							CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
							case when financialStatuse_beginingYear.project_id in (SELECT sub_project_id from tbl_sub_project) 
							then (SELECT project_id from tbl_sub_project WHERE sub_project_id = financialStatuse_beginingYear.project_id)
							else financialStatuse_beginingYear.project_id end as og_project_id,
							sum(financialStatuse_beginingYear.total_expenditure) AS total_expenditure
    
							FROM mmt_organisation 
							LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

							 JOIN
							( 
								SELECT tbl_project.organisation_id, 
								tbl_project.project_id,
								tbl_project.mode_of_implememtation,
								SUM(tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + 
										tbl_project_expenditure.ppp_components + 
										tbl_project_expenditure.loans_components + 
										tbl_project_expenditure.multilateral_components +  tbl_project_expenditure.state_gov_fund_components +
										tbl_project_expenditure.pmmsy_components + tbl_project_expenditure.sagarmala_components +
										tbl_project_expenditure.other_source_funding_comp) AS total_expenditure

								FROM tbl_project
								INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
								WHERE   (  (expenditure_date < @currentyearstart AND tbl_project.status = 1 ) 
       
							   AND is_sagarmala_funded =  @issagarmalafunded )

								GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
								tbl_project.award_project_cost, tbl_project.sanctioned_cost

								UNION

								SELECT tbl_sub_project.sub_organisation_id, 
								tbl_sub_project.sub_project_id,
								tbl_sub_project.sub_mode_of_implememtation,
								SUM(tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + 
									tbl_project_expenditure.ppp_components + 
									tbl_project_expenditure.loans_components + 
									tbl_project_expenditure.multilateral_components + tbl_project_expenditure.state_gov_fund_components + 
									tbl_project_expenditure.pmmsy_components + tbl_project_expenditure.sagarmala_components +
									tbl_project_expenditure.other_source_funding_comp) AS total_expenditure
								FROM tbl_sub_project
								INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
   

                                WHERE   (  (expenditure_date < @currentyearstart AND tbl_sub_project.sub_status = 1 ) 
       
							   AND sub_is_sagarmala_funded =  @issagarmalafunded )


								GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
								tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

								)  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
								WHERE mmt_organisation.organisation_id = @organisation_ID

								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
									financialStatuse_beginingYear.total_expenditure, 
									CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									financialStatuse_beginingYear.project_id
		),
		CmpdProjectsFYtoPreMonth as (
		
								 SELECT organisation_category_name,
								mmt_organisation.organisation_id, organisation_name,
								CASE WHEN ColumnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
								
								case when ColumnB_complete_count.project_id in (SELECT sub_project_id from tbl_sub_project) 
							    then (SELECT project_id from tbl_sub_project WHERE sub_project_id = ColumnB_complete_count.project_id)
							    else ColumnB_complete_count.project_id end as og_project_id,
								ROUND(SUM(ColumnB_complete_count.award_project_cost), 2) AS award_project_cost
								FROM mmt_organisation 
								LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

								 JOIN
								( 
									SELECT tbl_project.organisation_id, 
									tbl_project.project_id,
									tbl_project.mode_of_implememtation,
									tbl_project.award_project_cost        

									FROM tbl_project
									WHERE    (    (actual_date_of_completion BETWEEN @begindate AND @previousMonthLastDate) AND
										( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)   )
       

						  AND is_sagarmala_funded =  @issagarmalafunded

								UNION

								SELECT tbl_sub_project.sub_organisation_id, 
								tbl_sub_project.sub_project_id,
								tbl_sub_project.sub_mode_of_implememtation,
								tbl_sub_project.sub_award_project_cost

								FROM tbl_sub_project
								WHERE   ( (sub_actual_date_of_completion BETWEEN @begindate AND @previousMonthLastDate) AND
								( sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )       )
    
							AND sub_is_sagarmala_funded =  @issagarmalafunded

								)  AS ColumnB_complete_count on ColumnB_complete_count.organisation_id = mmt_organisation.organisation_id
          
								WHERE mmt_organisation.organisation_id = @organisation_ID

								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
									CASE WHEN ColumnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									ColumnB_complete_count.project_id
        
       
    
		),

		CmpdProjectsThisMonth as (
		
							   SELECT organisation_category_name,
							   mmt_organisation.organisation_id, organisation_name,
							   CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
							   
							   case when columnB_complete_count.project_id in (SELECT sub_project_id from tbl_sub_project) 
								then (SELECT project_id from tbl_sub_project WHERE sub_project_id = columnB_complete_count.project_id)
							   else columnB_complete_count.project_id end as og_project_id,
							   ROUND(SUM(columnB_complete_count.award_project_cost), 2) AS award_project_cost
							   FROM mmt_organisation 
							   LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

							    JOIN
							   ( 
								   SELECT tbl_project.organisation_id, 
								   tbl_project.project_id,
								   tbl_project.mode_of_implememtation,
								   tbl_project.award_project_cost        

								   FROM tbl_project
								   WHERE    (    (actual_date_of_completion BETWEEN @currentMonthFirstDate AND @todayDate) AND
									   ( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)        ) 
      

							  AND is_sagarmala_funded =  @issagarmalafunded

							   UNION

							   SELECT tbl_sub_project.sub_organisation_id, 
							   tbl_sub_project.sub_project_id,
							   tbl_sub_project.sub_mode_of_implememtation,
							   tbl_sub_project.sub_award_project_cost

							   FROM tbl_sub_project
							   WHERE    (    (sub_actual_date_of_completion BETWEEN @currentMonthFirstDate AND @todayDate) AND
								(sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )        )
		
								AND sub_is_sagarmala_funded =  @issagarmalafunded

								)  AS columnB_complete_count on columnB_complete_count.organisation_id = mmt_organisation.organisation_id
            
								WHERE mmt_organisation.organisation_id = @organisation_ID

								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
									CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									columnB_complete_count.project_id
		),

		ValueOfCmpdProjectFY as (
		
							SELECT organisation_category_name,
							mmt_organisation.organisation_id, organisation_name,
							CASE WHEN columnD_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
							
							case when columnD_complete_count.project_id in (SELECT sub_project_id from tbl_sub_project) 
							then (SELECT project_id from tbl_sub_project WHERE sub_project_id = columnD_complete_count.project_id)
						   else columnD_complete_count.project_id end as og_project_id,
							ROUND(SUM(columnD_complete_count.closure_cost), 2) AS closure_cost
							FROM mmt_organisation 
							LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

							 JOIN
							( 
								SELECT tbl_project.organisation_id, 
								tbl_project.project_id,
								tbl_project.mode_of_implememtation,
								tbl_project.closure_cost        

								FROM tbl_project
								WHERE   (    (actual_date_of_completion BETWEEN @begindate AND @enddate) AND
									( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)       ) 
       
						   AND is_sagarmala_funded =  @issagarmalafunded

							UNION

							SELECT tbl_sub_project.sub_organisation_id, 
							tbl_sub_project.sub_project_id,
							tbl_sub_project.sub_mode_of_implememtation,
							tbl_sub_project.sub_closure_cost

							FROM tbl_sub_project
							WHERE   (        (sub_actual_date_of_completion BETWEEN @begindate AND @enddate) AND
							( sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )   )
   
					   AND sub_is_sagarmala_funded =  @issagarmalafunded

							)  AS columnD_complete_count ON columnD_complete_count.organisation_id = mmt_organisation.organisation_id
            
							WHERE mmt_organisation.organisation_id = @organisation_ID

							GROUP BY
								mmt_organisation_category.organisation_category_id, 
								organisation_category_name, 
								mmt_organisation.organisation_id, 
								organisation_name,
								CASE WHEN columnD_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
								columnD_complete_count.project_id
		),

		ProportionateTargetFY as (

							SELECT organisation_category_name,
							mmt_organisation.organisation_id, organisation_name,
							CASE WHEN proportionate_Data.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
							case when proportionate_Data.project_id in (SELECT sub_project_id from tbl_sub_project) 
							then (SELECT project_id from tbl_sub_project WHERE sub_project_id = proportionate_Data.project_id)
							else proportionate_Data.project_id end as og_project_id,
							proportionate_Data.total_outlay AS total_outlay,
		
						   
						   ( (proportionate_Data.total_outlay/12) * (@financialMonth - 1) ) AS proportionate_value	

							FROM mmt_organisation 
							LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

							 JOIN
							( 
								SELECT tbl_project.organisation_id, 
								tbl_project.project_id,
								tbl_project.mode_of_implememtation,
								tbl_project_expenditure_outlay.year,
								expenditure_outlay AS total_outlay

								FROM tbl_project
								INNER JOIN tbl_project_expenditure_outlay on tbl_project_expenditure_outlay.project_id = tbl_project.project_id
								WHERE   (    (year = @currentYearColE AND tbl_project.status = 1) 
								AND (sub_project_id = '-1')     )
      
						  AND is_sagarmala_funded =  @issagarmalafunded

							UNION

							SELECT tbl_sub_project.sub_organisation_id, 
							tbl_sub_project.sub_project_id,
							tbl_sub_project.sub_mode_of_implememtation,
							tbl_project_expenditure_outlay.year,
							expenditure_outlay AS total_outlay
    
							FROM tbl_sub_project
							INNER JOIN tbl_project_expenditure_outlay ON tbl_project_expenditure_outlay.sub_project_id = tbl_sub_project.sub_project_id
							WHERE   (    (year = @currentYearColE AND tbl_sub_project.sub_status = 1)    )
   
					   AND sub_is_sagarmala_funded =  @issagarmalafunded

							)  AS proportionate_Data on proportionate_Data.organisation_id = mmt_organisation.organisation_id
           
							WHERE mmt_organisation.organisation_id = @organisation_ID
        
							GROUP BY
								mmt_organisation_category.organisation_category_id, 
								organisation_category_name, 
								mmt_organisation.organisation_id, 
								organisation_name,
										proportionate_Data.total_outlay, 
								CASE WHEN proportionate_Data.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
								proportionate_Data.project_id

		),
		ExpenditureFYtoPreMonth as ( 

							   SELECT organisation_category_name,
								mmt_organisation.organisation_id, organisation_name,
								CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
								--financialStatuse_beginingYear.project_id,
								case when financialStatuse_beginingYear.project_id in (SELECT sub_project_id from tbl_sub_project) 
								then (SELECT project_id from tbl_sub_project WHERE sub_project_id = financialStatuse_beginingYear.project_id)
								else financialStatuse_beginingYear.project_id end as og_project_id,
								ROUND(SUM(financialStatuse_beginingYear.total_expenditure), 2) AS total_expenditure,       

								ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost,
								ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
								FROM mmt_organisation 
								LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

								 JOIN
								( 
									SELECT tbl_project.organisation_id, 
									tbl_project.project_id,
									tbl_project.mode_of_implememtation,
									tbl_project.award_project_cost, tbl_project.sanctioned_cost,
									SUM(

								   case when(@issagarmalafunded = 1) then tbl_project_expenditure.sagarmala_components
									else
									tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + tbl_project_expenditure.ppp_components
									end ) AS total_expenditure

									FROM tbl_project
									INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
									WHERE   (     ( (tbl_project_expenditure.expenditure_date BETWEEN @begindate AND @previousMonthLastDate)
										AND tbl_project.status = 1 ) 
									AND (sub_project_id = '-1')         )
    
									AND is_sagarmala_funded =  @issagarmalafunded

								GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
								tbl_project.award_project_cost, tbl_project.sanctioned_cost

								UNION

								SELECT tbl_sub_project.sub_organisation_id, 
								tbl_sub_project.sub_project_id,
								tbl_sub_project.sub_mode_of_implememtation,
								tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost,
								 SUM(
								   case when(@issagarmalafunded = 1) then tbl_project_expenditure.sagarmala_components
									else
									tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + tbl_project_expenditure.ppp_components
									end) AS total_expenditure
								FROM tbl_sub_project
								INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
								WHERE   (   ((tbl_project_expenditure.expenditure_date BETWEEN @begindate AND @previousMonthLastDate)
										AND tbl_sub_project.sub_status = 1)         )
    
								AND sub_is_sagarmala_funded =  @issagarmalafunded

								GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
								tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

								)  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
								WHERE mmt_organisation.organisation_id = @organisation_ID

								GROUP BY
									mmt_organisation_category.organisation_category_id, 
									organisation_category_name, 
									mmt_organisation.organisation_id, 
									organisation_name,
											financialStatuse_beginingYear.total_expenditure, 
									CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
									financialStatuse_beginingYear.project_id
					),

		ExpenditureThisMonth as (
							SELECT organisation_category_name,
							mmt_organisation.organisation_id, organisation_name,
							CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
							financialStatuse_beginingYear.total_expenditure AS total_expenditure,  
							case when financialStatuse_beginingYear.project_id in (SELECT sub_project_id from tbl_sub_project) 
							then (SELECT project_id from tbl_sub_project WHERE sub_project_id = financialStatuse_beginingYear.project_id)
							else financialStatuse_beginingYear.project_id end as og_project_id,
							ROUND(SUM(financialStatuse_beginingYear.sanctioned_cost), 2) AS sanctioned_cost,
							ROUND(SUM(financialStatuse_beginingYear.award_project_cost), 2) AS award_project_cost
							FROM mmt_organisation 
							LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

							 JOIN
							( 
								SELECT tbl_project.organisation_id, 
								tbl_project.project_id,
								tbl_project.mode_of_implememtation,
								tbl_project.award_project_cost, tbl_project.sanctioned_cost,
								SUM( case when(@issagarmalafunded = 1)  then tbl_project_expenditure.sagarmala_components
														else
														tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + tbl_project_expenditure.ppp_components
														end ) AS total_expenditure
								FROM tbl_project
								INNER JOIN tbl_project_expenditure on tbl_project_expenditure.project_id = tbl_project.project_id
								WHERE    (    ( (tbl_project_expenditure.expenditure_date BETWEEN @currentMonthFirstDate AND @todayDate)
									 AND tbl_project.status = 1 ) 
								AND (sub_project_id = '-1')         )
   
							  AND is_sagarmala_funded =  @issagarmalafunded

							GROUP BY organisation_id, tbl_project.project_id, mode_of_implememtation,
							tbl_project.award_project_cost, tbl_project.sanctioned_cost

							UNION

							SELECT tbl_sub_project.sub_organisation_id, 
							tbl_sub_project.sub_project_id,
							tbl_sub_project.sub_mode_of_implememtation,
							tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost,
							SUM(case when(@issagarmalafunded = 1)  then tbl_project_expenditure.sagarmala_components
														else
														tbl_project_expenditure.gbs_components + tbl_project_expenditure.iebr_components + tbl_project_expenditure.ppp_components
														end) AS total_expenditure
							FROM tbl_sub_project
							INNER JOIN tbl_project_expenditure ON tbl_project_expenditure.sub_project_id = tbl_sub_project.sub_project_id
							WHERE   (        ( (tbl_project_expenditure.expenditure_date BETWEEN @currentMonthFirstDate AND @todayDate)
									 AND tbl_sub_project.sub_status = 1)        )
   
							AND sub_is_sagarmala_funded =  @issagarmalafunded
    
	
							GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, sub_mode_of_implememtation,
							tbl_sub_project.sub_award_project_cost, tbl_sub_project.sub_sanctioned_cost

							)  AS financialStatuse_beginingYear on financialStatuse_beginingYear.organisation_id = mmt_organisation.organisation_id
        
							WHERE mmt_organisation.organisation_id = @organisation_ID

							GROUP BY
								mmt_organisation_category.organisation_category_id, 
								organisation_category_name, 
								mmt_organisation.organisation_id, 
								organisation_name,
								financialStatuse_beginingYear.total_expenditure, 
								CASE WHEN financialStatuse_beginingYear.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
								financialStatuse_beginingYear.project_id


			)

		SELECT  distinct

		allprojectsubproject.organisation_id,
		allprojectsubproject.organisation_name,
		allprojectsubproject.implementation_group,
		allprojectsubproject.og_project_id,
		allprojectsubproject.og_project_name,
		Column_4.sanctioned_cost as costSanctionedProject_4,
		Column_5.award_project_cost as costAwaredProject_5,
		Column_6.total_expenditure as expenditure_6, 
		Column_5.award_project_cost - ISNULL(Column_6.total_expenditure, 0) as BalanceExpenditure_7,
		ISNULL(Column_A.ColumnB,0) as columnA, 
		ISNULL(Column_B.columnB,0) as ColumnB, ISNULL(Column_A.ColumnB,0) + ISNULL(Column_B.columnB,0) as columnC, 
		ISNULL(Column_D.columnD,0) as ColumnD , round(Column_E.ColumnE,2) as ColumnE,
		ISNULL(Column_F.total_expenditure,0) as columnF,
		ISNULL(Column_G.award_project_cost,0) as columnG,
		ISNULL(Column_F.total_expenditure,0) + ISNULL(Column_G.award_project_cost,0) AS columnH,
        (case when @organisation_ID = 17 THEN lumpsum.lumpsumCost END )as lumpsumCost,
		ISNULL(Column_F.total_expenditure,0) + ISNULL(Column_G.award_project_cost,0) + ISNULL(lumpsum.lumpsumCost, 0) AS totalInclusivelumpsum

		from 
		allprojectsubproject 

		LEFT JOIN  

		(SELECT distinct organisation_id, organisation_name,implementation_group, og_project_id,ROUND(SUM(sanctioned_cost), 2) AS sanctioned_cost
		from costofSanctionedProjects 
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_4
		
		on allprojectsubproject.organisation_id = Column_4.organisation_id and allprojectsubproject.implementation_group = Column_4.implementation_group and allprojectsubproject.og_project_id = Column_4.og_project_id

		LEFT JOIN

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,ROUND(SUM(award_project_cost), 2) AS award_project_cost
		from costofAwardedProjects
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_5

		on allprojectsubproject.organisation_id = Column_5.organisation_id and allprojectsubproject.implementation_group = Column_5.implementation_group and allprojectsubproject.og_project_id = Column_5.og_project_id

		LEFT JOIN

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,ROUND(SUM(total_expenditure), 2) AS total_expenditure
		from ExpenditureTillDate
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_6

		on allprojectsubproject.organisation_id = Column_6.organisation_id and allprojectsubproject.implementation_group = Column_6.implementation_group and allprojectsubproject.og_project_id = Column_6.og_project_id

		LEFT JOIN

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) AS ColumnB
		from CmpdProjectsFYtoPreMonth
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_A

		on allprojectsubproject.organisation_id = Column_A.organisation_id and allprojectsubproject.implementation_group = Column_A.implementation_group and allprojectsubproject.og_project_id = Column_A.og_project_id

		LEFT JOIN

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,count(*) AS columnB
		from CmpdProjectsThisMonth
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_B

		on allprojectsubproject.organisation_id = Column_B.organisation_id and allprojectsubproject.implementation_group = Column_B.implementation_group and allprojectsubproject.og_project_id = Column_B.og_project_id

		LEFT JOIN

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,ROUND(SUM(closure_cost), 2) AS columnD
		from ValueOfCmpdProjectFY
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_D

		on allprojectsubproject.organisation_id = Column_D.organisation_id and allprojectsubproject.implementation_group = Column_D.implementation_group and allprojectsubproject.og_project_id = Column_D.og_project_id

		LEFT JOIN 

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,ROUND(SUM(total_outlay), 2) AS total_outlay,
		CAST(ROUND(SUM(proportionate_value), 2) AS DECIMAL(10, 2)) AS ColumnE
		from ProportionateTargetFY
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_E

		on allprojectsubproject.organisation_id = Column_E.organisation_id and allprojectsubproject.implementation_group = Column_E.implementation_group and allprojectsubproject.og_project_id = Column_E.og_project_id

		LEFT JOIN 

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,ROUND(SUM(total_expenditure), 2) AS total_expenditure,
		ROUND(SUM(sanctioned_cost), 2) AS sanctioned_cost, ROUND(SUM(award_project_cost), 2) AS award_project_cost from ExpenditureFYtoPreMonth
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_F

		on allprojectsubproject.organisation_id = Column_F.organisation_id and allprojectsubproject.implementation_group = Column_F.implementation_group and allprojectsubproject.og_project_id = Column_F.og_project_id

		LEFT JOIN 

		(SELECT distinct organisation_id, organisation_name,implementation_group,og_project_id,
		ROUND(SUM(sanctioned_cost), 2) AS sanctioned_cost, ROUND(SUM(award_project_cost), 2) AS award_project_cost from ExpenditureThisMonth
		GROUP BY organisation_id, organisation_name,implementation_group,og_project_id) Column_G

		on allprojectsubproject.organisation_id = Column_G.organisation_id and allprojectsubproject.implementation_group = Column_G.implementation_group and allprojectsubproject.og_project_id = Column_G.og_project_id

        LEFT JOIN

        (SELECT distinct project_id, sum(activity_cost) AS lumpsumCost from tbl_lump_sum 
            WHERE activity_date <= @previousMonthLastDate GROUP BY project_id) lumpsum 
        on lumpsum.project_id = allprojectsubproject.og_project_id

		WHERE  
			--allprojectsubproject.og_project_id = @og_projectid and

			case when @modeofimp = 'PPP' then 'PPP/Captive' 
			when @modeofimp = 'EPC' then 'EPC/Others' 
			else 
			allprojectsubproject.implementation_group
			end =  allprojectsubproject.implementation_group 
			order by allprojectsubproject.implementation_group,allprojectsubproject.og_project_id
    

end;`);
        
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
                    item['og_project_name'],
                ],
                category: item['implementation_group'],
                ProjectId: item['og_project_id'],
                org_id: item['organisation_id'],
                organisation_name: item['organisation_name'],
                CostSanctionedProject: item['costSanctionedProject_4'],
                costAwaredProject: item['costAwaredProject_5'],
                Expenditure: item['expenditure_6'],
                BalanceExpenditure: item['BalanceExpenditure_7'],
                columnA: item['columnA'],
                columnB: item['ColumnB'],
                columnC: item['columnC'],
                columnD: item['ColumnD'],
                columnE: item['ColumnE'],
                columnF: item['columnF'],
                columnG: item['columnG'],
                lumpsumCost: item['lumpsumCost'],
                columnH: item['columnH'],
                totalInclusivelumpsum: item['totalInclusivelumpsum'],

                
               
            };
        });

        res.json({ rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};

async function getDetailsFinancialReport(req, res)
{
    const organisationID = req.params.organisationID;
    const modOfImp = req.params.modOfImp;
    const columnNo = req.params.columnNo;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;     

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("modOfImp", modOfImp);
    request.input("columnNo", columnNo);
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // Today date
    let todayDate = new Date().toISOString().split('T')[0];

    const currentMonthFirstDate = moment().startOf('month').format('YYYY-MM-DD');

    // During the month - Last date - Eg: 2024-12-01 (Using Moment)
    const previousMonthLastDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

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
        console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    let getColumn8 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name, num_ut_tender_calls,    
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost, 
        ISNULL(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost) AS award_project_cost, 
        ISNULL(tbl_sub_project.sub_closure_cost, tbl_project.closure_cost) AS closure_cost

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        
        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 ) 
        AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID ) 
        
        AND (
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
            )    

    `

    if(isSagarmalaFunded == 'true') {
        getColumn8 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    
    if(columnNo == 8)
    {
        getColumn8 += ` 
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}'
                )  `
    }
    if(columnNo == 9)
    {
        getColumn8 += ` 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${currentMonthFirstDate}' AND '${todayDate}'
           
            ) `
    }
    if(columnNo == 10)
    {
        getColumn8 += ` 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${todayDate}'
            
            ) `
    }

    if (modOfImp == 'PPP+Captive') {
        getColumn8 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        getColumn8 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    getColumn8 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryColABC = await request.query(getColumn8);

        // res.json(result.recordset);
        const response = { getMainProjectQueryColABC: getMainProjectQueryColABC.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailsIwaiFinancialReport(req, res) {
    try {
        // Extract parameters from the request
        const organisation_ID = req.params.organisationID;
        const modOfImp = req.params.modOfImp;
        const columnNo = req.params.columnNo;
        
        // Convert isSagarmalaFunded to a boolean value
        const isSagarmalaFunded = req.params.isSagarmalaFunded === 'true' ? 1 : 0;
        const projectId = req.params.projectId;

        const conn = await pool;
        const request = conn.request();

        // Calculate current financial year dates
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
        if (currentMonth <= 3) {
            firstDateCurrentFy = `${currentYear}-04-01`;
            lastDateCurrentFy = `${currentYear + 1}-03-31`;
            lastDatePreviousFy = `${currentYear - 1}-03-31`;
        } else {
            firstDateCurrentFy = `${currentYear}-04-01`;
            lastDateCurrentFy = `${currentYear + 1}-03-31`;
            lastDatePreviousFy = `${currentYear}-03-31`;
        }

        const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

        let projectHistoryData;

        // SQL Query building based on columnNo
        if (columnNo == 1) {
            projectHistoryData = `
            
        DECLARE
        @issagarmalafunded bit, @begindate date, @enddate date, @currentyearstart date ,
        @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
        @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

        set @organisation_categoryID = 3;
        set @organisation_ID = ${organisation_ID};
        SET @issagarmalafunded = ${isSagarmalaFunded};
        SET @og_projectid = '${projectId}';
        SET @modeofimp = '${modOfImp}';
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



        SELECT ColumnA.project_id as ProjectCode, ISNULL(ColumnA.project_name,'-') as MainProject, ISNULL(ColumnA.sub_project_name,'-') as SubProject, ColumnA.sanctioned_cost , ColumnA.award_project_cost, ColumnA.closure_cost from (
                
        SELECT 
                ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
                mmt_organisation.organisation_name, 
                tbl_sub_project.sub_mode_of_implememtation,
                CASE WHEN tbl_sub_project.sub_mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                tbl_sub_project.sub_project_id, tbl_project.project_id, 
                project_name, sub_project_name, scheme_name, num_ut_tender_calls,  
                tbl_sub_project.sub_actual_date_of_completion  ,
                ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost, 
                ISNULL(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost) AS award_project_cost, 
                ISNULL(tbl_sub_project.sub_closure_cost, tbl_project.closure_cost) AS closure_cost

                FROM tbl_project
                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                
                LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
                    OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

                LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
                    OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
                
                WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 ) 
                AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisation_ID ) 
                
                AND (
                        ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
                    )    



                    AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded

                    and

                    tbl_project.project_id = @og_projectid

                    and

                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN @begindate AND @previousMonthLastDate
                    
                    

                    ) ColumnA

                    WHERE 
                    ColumnA.implementation_group in ( 
                    
                    case 
                            when UPPER(@modeofimp) = 'EPC' then 'EPC/Others' 
                            when  Upper(@modeofimp) = 'PPP' then 'PPP/Captive' 
                            when  Upper(@modeofimp) not in ('EPC','PPP') then ColumnA.implementation_group					
                            end )


                end;`;
        }

        if (columnNo == 2) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @currentyearstart date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 


            SET @organisation_categoryID = 3;
            SET @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalaFunded};
            SET @og_projectid = '${projectId}';
            SET @modeofimp = '${modOfImp}';
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

            with
            CmpdProjectsThisMonth as (
                    
                                        SELECT organisation_category_name,
                                        mmt_organisation.organisation_id, organisation_name,
                                        CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        COUNT(columnB_complete_count.project_id) AS current_month_completion_count,
                                        columnB_complete_count.project_id,
                                        columnB_complete_count.project_name,

                                        case when columnB_complete_count.project_id in (SELECT sub_project_id from tbl_sub_project) 
                                            then (SELECT project_id from tbl_sub_project WHERE sub_project_id = columnB_complete_count.project_id)
                                        else columnB_complete_count.project_id end as og_project_id,

                                            case when columnB_complete_count.project_id in (SELECT sub_project_id from tbl_sub_project)
                                            then (SELECT project_name from tbl_project WHERE project_id in ( SELECT project_id from tbl_sub_project WHERE sub_project_id = columnB_complete_count.project_id))
                                            else (SELECT Project_name from tbl_project WHERE project_id in( columnB_complete_count.project_id)) end as og_project_name,

                                        ROUND(SUM(columnB_complete_count.award_project_cost), 2) AS award_project_cost,
                                        ROUND(SUM(columnB_complete_count.closure_cost), 2) AS closure_cost,
                                        ROUND(SUM(columnB_complete_count.sanctioned_cost), 2) AS sanctioned_cost

                                        FROM mmt_organisation 
                                        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                        ( 
                                            SELECT tbl_project.organisation_id, 
                                            tbl_project.project_id,
                                            tbl_project.project_name,
                                            tbl_project.mode_of_implememtation,
                                            tbl_project.award_project_cost,
                                            tbl_project.closure_cost,
                                            tbl_project.sanctioned_cost

                                            FROM tbl_project
                                            WHERE    (    (actual_date_of_completion BETWEEN @currentMonthFirstDate AND @todaydate) AND
                                                ( project_stage_id = 14  AND tbl_project.status = 1 AND on_sub_project_available = 0)        ) 
                

                                        AND is_sagarmala_funded =  @issagarmalafunded

                                        UNION

                                        SELECT tbl_sub_project.sub_organisation_id, 
                                        tbl_sub_project.sub_project_id,
                                        tbl_sub_project.sub_project_name,
                                        tbl_sub_project.sub_mode_of_implememtation,
                                        tbl_sub_project.sub_award_project_cost,
                                        tbl_sub_project.sub_closure_cost,
                                        tbl_sub_project.sub_sanctioned_cost

                                        FROM tbl_sub_project
                                        WHERE    (    (sub_actual_date_of_completion BETWEEN @currentMonthFirstDate AND @todaydate) AND
                                            (sub_project_stage_id = 14  AND tbl_sub_project.sub_status = 1 )        )
                    
                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            )  AS columnB_complete_count on columnB_complete_count.organisation_id = mmt_organisation.organisation_id
                        
                                            WHERE mmt_organisation.organisation_id = @organisation_ID

                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN columnB_complete_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                columnB_complete_count.project_id,
                                                columnB_complete_count.project_name
                    )

            SELECT  distinct 
            organisation_id,implementation_group, project_id as ProjectCode, og_project_name as MainProject, project_name as SubProject,  sanctioned_cost , award_project_cost, closure_cost
            from CmpdProjectsThisMonth 
                        WHERE 
                        CmpdProjectsThisMonth.og_project_id = @og_projectid 
                        and
                        CmpdProjectsThisMonth.implementation_group in ( 
                        
                        case 
                                when UPPER(@modeofimp) = 'EPC' then 'EPC/Others' 
                                when  Upper(@modeofimp) = 'PPP' then 'PPP/Captive' 
                                when  Upper(@modeofimp) not in ('EPC','PPP') then CmpdProjectsThisMonth.implementation_group					
                                end );`;
        }

        if (columnNo == 3) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @currentyearstart date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            SET @organisation_categoryID = 3;
            SET @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalaFunded};
            SET @og_projectid = '${projectId}';
            SET @modeofimp = '${modOfImp}';
            SET
            @BEGINDATE = 
            CASE
                WHEN
                    MONTH(GETDATE()) >= 4 
                THEN
                    DATEFROMPARTS(YEAR(GETDATE()), 4, 1) 			-- April 1st of the current year
                ELSE
                    DATEFROMPARTS(YEAR(GETDATE()) - 1, 4, 1) 			-- April 1st of the previous year
            END
            ;
            SET
            @ENDDATE = 
            CASE
                WHEN
                    MONTH(GETDATE()) >= 4 
                THEN
                    DATEFROMPARTS(YEAR(GETDATE()) + 1, 3, 31) 			-- March 31 of the next year
                ELSE
                    DATEFROMPARTS(YEAR(GETDATE()), 3, 31) 			-- March 31 of the current year
            END
            ;
            SET
            @CURRENTYEARSTART = 
            CASE
                WHEN
                    MONTH(GETDATE()) >= 4 
                THEN
                    DATEFROMPARTS(YEAR(GETDATE()), 4, 1) 			-- Current year start (April 1st)
                ELSE
                    DATEFROMPARTS(YEAR(GETDATE()) - 1, 4, 1) 			-- Previous year start (April 1st)
            END
            ;
            SET
            @PREVIOUSMONTHLASTDATE = EOMONTH(DATEADD(MONTH, - 1, GETDATE()));
            SET
            @CURRENTMONTHFIRSTDATE = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0);
            SET
            @FINANCIALMONTH = 
            CASE
                WHEN
                    MONTH(GETDATE()) >= 4 
                THEN
                    MONTH(GETDATE()) - 3 			-- April to December
                ELSE
                    MONTH(GETDATE()) + 9 			-- January to March
            END
            ;
            SET
            @CURRENTYEARCOLE = CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-' + CAST(YEAR(GETDATE()) + 1 AS VARCHAR(4));
            WITH CMPDPROJECTSTHISMONTH AS 
            (
            SELECT
                ORGANISATION_CATEGORY_NAME,
                MMT_ORGANISATION.ORGANISATION_ID,
                ORGANISATION_NAME,
                CASE
                    WHEN
                        COLUMNB_COMPLETE_COUNT.MODE_OF_IMPLEMEMTATION IN 
                        (
                        'EPC',
                        'OTHERS'
                        )
                    THEN
                        'EPC/Others' 
                    ELSE
                        'PPP/Captive' 
                END
                AS IMPLEMENTATION_GROUP, COUNT(COLUMNB_COMPLETE_COUNT.PROJECT_ID) AS CURRENT_MONTH_COMPLETION_COUNT, COLUMNB_COMPLETE_COUNT.PROJECT_ID, COLUMNB_COMPLETE_COUNT.PROJECT_NAME, 
                CASE
                    WHEN
                        COLUMNB_COMPLETE_COUNT.PROJECT_ID IN 
                        (
                        SELECT
                            SUB_PROJECT_ID 
                        FROM
                            TBL_SUB_PROJECT
                        )
                    THEN
            (
                        SELECT
                        PROJECT_ID 
                        FROM
                        TBL_SUB_PROJECT 
                        WHERE
                        SUB_PROJECT_ID = COLUMNB_COMPLETE_COUNT.PROJECT_ID) 
                        ELSE
                        COLUMNB_COMPLETE_COUNT.PROJECT_ID 
                END
                AS OG_PROJECT_ID,
                CASE
                    WHEN
                        COLUMNB_COMPLETE_COUNT.PROJECT_ID IN 
                        (
                        SELECT
                            SUB_PROJECT_ID 
                        FROM
                            TBL_SUB_PROJECT
                        )
                    THEN
            (
                        SELECT
                        PROJECT_NAME 
                        FROM
                        TBL_PROJECT 
                        WHERE
                        PROJECT_ID IN 
                        (
                            SELECT
                                PROJECT_ID 
                            FROM
                                TBL_SUB_PROJECT 
                            WHERE
                                SUB_PROJECT_ID = COLUMNB_COMPLETE_COUNT.PROJECT_ID
                        )
            ) 
                        ELSE
            (
                        SELECT
                            PROJECT_NAME 
                        FROM
                            TBL_PROJECT 
                        WHERE
                            PROJECT_ID IN
                            (
                                COLUMNB_COMPLETE_COUNT.PROJECT_ID
                            )
            ) 
                END
                AS OG_PROJECT_NAME,
                ROUND(SUM(COLUMNB_COMPLETE_COUNT.AWARD_PROJECT_COST), 2) AS AWARD_PROJECT_COST,
                ROUND(SUM(COLUMNB_COMPLETE_COUNT.CLOSURE_COST), 2) AS CLOSURE_COST,
                ROUND(SUM(COLUMNB_COMPLETE_COUNT.SANCTIONED_COST), 2) AS SANCTIONED_COST 
                        FROM
                            MMT_ORGANISATION 
                            LEFT JOIN
                                MMT_ORGANISATION_CATEGORY 
                                ON MMT_ORGANISATION_CATEGORY.ORGANISATION_CATEGORY_ID = MMT_ORGANISATION.ORGANISATION_CATEGORY_ID 
                            JOIN
                                (
                                    SELECT
                                    TBL_PROJECT.ORGANISATION_ID,
                                    TBL_PROJECT.PROJECT_ID,
                                    TBL_PROJECT.PROJECT_NAME,
                                    TBL_PROJECT.MODE_OF_IMPLEMEMTATION,
                                    TBL_PROJECT.AWARD_PROJECT_COST,
                                    TBL_PROJECT.CLOSURE_COST,
                                    TBL_PROJECT.SANCTIONED_COST 
                                    FROM
                                    TBL_PROJECT 
                                    WHERE
                                    (
            (ACTUAL_DATE_OF_COMPLETION BETWEEN @BEGINDATE AND @TODAYDATE) 
                                        AND 
                                        (
                                            PROJECT_STAGE_ID = 14 
                                            AND TBL_PROJECT.STATUS = 1 
                                            AND ON_SUB_PROJECT_AVAILABLE = 0
                                        )
                                    )
                                    AND IS_SAGARMALA_FUNDED = @ISSAGARMALAFUNDED 
                                    UNION
                                    SELECT
                                    TBL_SUB_PROJECT.SUB_ORGANISATION_ID,
                                    TBL_SUB_PROJECT.SUB_PROJECT_ID,
                                    TBL_SUB_PROJECT.SUB_PROJECT_NAME,
                                    TBL_SUB_PROJECT.SUB_MODE_OF_IMPLEMEMTATION,
                                    TBL_SUB_PROJECT.SUB_AWARD_PROJECT_COST,
                                    TBL_SUB_PROJECT.SUB_CLOSURE_COST,
                                    TBL_SUB_PROJECT.SUB_SANCTIONED_COST 
                                    FROM
                                    TBL_SUB_PROJECT 
                                    WHERE
                                    (
            (SUB_ACTUAL_DATE_OF_COMPLETION BETWEEN @BEGINDATE AND @TODAYDATE) 
                                        AND 
                                        (
                                            SUB_PROJECT_STAGE_ID = 14 
                                            AND TBL_SUB_PROJECT.SUB_STATUS = 1 
                                        )
                                    )
                                    AND SUB_IS_SAGARMALA_FUNDED = @ISSAGARMALAFUNDED 
                                )
                                AS COLUMNB_COMPLETE_COUNT 
                                ON COLUMNB_COMPLETE_COUNT.ORGANISATION_ID = MMT_ORGANISATION.ORGANISATION_ID 
                        WHERE
                            MMT_ORGANISATION.ORGANISATION_ID = @ORGANISATION_ID 
                        GROUP BY
                            MMT_ORGANISATION_CATEGORY.ORGANISATION_CATEGORY_ID,
                            ORGANISATION_CATEGORY_NAME,
                            MMT_ORGANISATION.ORGANISATION_ID,
                            ORGANISATION_NAME,
                            CASE
                                WHEN
                                    COLUMNB_COMPLETE_COUNT.MODE_OF_IMPLEMEMTATION IN 
                                    (
                                    'EPC',
                                    'OTHERS'
                                    )
                                THEN
                                    'EPC/Others' 
                                ELSE
                                    'PPP/Captive' 
                            END
            , COLUMNB_COMPLETE_COUNT.PROJECT_ID, COLUMNB_COMPLETE_COUNT.PROJECT_NAME 
            )
            SELECT DISTINCT
            ORGANISATION_ID,
            IMPLEMENTATION_GROUP,
            PROJECT_ID AS ProjectCode,
            OG_PROJECT_NAME AS MainProject,
            PROJECT_NAME AS SubProject,
            SANCTIONED_COST AS sanctioned_cost,
            AWARD_PROJECT_COST AS award_project_cost,
            CLOSURE_COST AS closure_cost 
            FROM
            CMPDPROJECTSTHISMONTH 
            WHERE
            CMPDPROJECTSTHISMONTH.OG_PROJECT_ID = @OG_PROJECTID 
            AND CMPDPROJECTSTHISMONTH.IMPLEMENTATION_GROUP IN 
            (
                CASE
                    WHEN
                        UPPER(@MODEOFIMP) = 'EPC' 
                    THEN
                        'EPC/Others' 
                    WHEN
                        UPPER(@MODEOFIMP) = 'PPP' 
                    THEN
                        'PPP/Captive' 
                    WHEN
                        UPPER(@MODEOFIMP) NOT IN 
                        (
                        'EPC', 'PPP'
                        )
                    THEN
                        CMPDPROJECTSTHISMONTH.IMPLEMENTATION_GROUP 
                END
            );`;
        }

        // Execute the SQL query
        const result = await request.query(projectHistoryData);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }
    
        let columnDefs = [
            { headerName: 'Project Code',field: 'ProjectCode'},
            {
                headerName: 'Name of',
                headerClass : "headercenter",
                children: [
                    { 
                        headerName: 'Main Project', 
                        field: 'MainProject', 
                        width:250
                    },
                    { 
                        headerName: 'Sub-Project', 
                        field: 'SubProject', 
                        width:250
                    }
                ]
            },
            { headerName: 'Santioned Cost', field: 'sanctioned_cost', },
            { headerName: 'Awarded Cost', field: 'award_project_cost', },
            { headerName: 'Closure Cost', field: 'closure_cost'}
        ];

    
        res.json({ columnDefs, rowData });
    
    } catch (error) {
        console.error("Error executing SQL query:", error);
        res.status(500).send("Internal Server Error");
    }
};

async function getGrandTotalFinancialReport(req, res)
{
    const modOfImp = req.params.modOfImp;
    const columnNo = req.params.columnNo;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;     
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("modOfImp", modOfImp);
    request.input("columnNo", columnNo);
    request.input("isSagarmalaFunded", isSagarmalaFunded);
    request.input("orgCategoryFilter", orgCategoryFilter);
    request.input("orgFilter", orgFilter);

    let firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    // Today date
    let todayDate = new Date().toISOString().split('T')[0];

    const currentMonthFirstDate = moment().startOf('month').format('YYYY-MM-DD');

    // During the month - Last date - Eg: 2024-12-01 (Using Moment)
    const previousMonthLastDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

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
        console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")
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

    let getColumn8;
    getColumn8 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name, num_ut_tender_calls,    
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost, 
        ISNULL(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost) AS award_project_cost, 
        ISNULL(tbl_sub_project.sub_closure_cost, tbl_project.closure_cost) AS closure_cost

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        `

        // WHERE CONDITION STARTS
        getColumn8 += `   WHERE  ` 
        

        if(orgCategoryFilter != 'nofilter') {      
            getColumn8 += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
        }
    
        //No orgCat filter and Org filter
        if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
            getColumn8 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
        } 
        //No orgCat filter 
        else  if(orgCategoryFilter == 'nofilter') {
            getColumn8 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
        }
        // orgCat filter and Org filter appplied
        else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
            getColumn8 += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
        }
        

        getColumn8 += `AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )         
        
        AND (
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
            )    
    `

    if(isSagarmalaFunded == 'true') {
        getColumn8 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    
    if(columnNo == 8)
    {
        getColumn8 += ` 
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${previousMonthLastDate}'
                )  `
    }
    if(columnNo == 9)
    {
        getColumn8 += ` 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${currentMonthFirstDate}' AND '${todayDate}'
           
            ) `
    }
    if(columnNo == 10)
    {
        getColumn8 += ` 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${todayDate}'
            
            ) `
    }

    if (modOfImp == 'PPP+Captive') {
        getColumn8 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        getColumn8 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    getColumn8 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryColABC = await request.query(getColumn8);

        // res.json(result.recordset);
        const response = { getMainProjectQueryColABC: getMainProjectQueryColABC.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

export default { financialProgressReport, getDetailsFinancialReport, getGrandTotalFinancialReport, iwaiFinancialProgressReport, getDetailsIwaiFinancialReport };