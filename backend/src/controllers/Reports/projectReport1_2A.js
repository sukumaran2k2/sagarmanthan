import { pool } from "../../db.js";
import moment from 'moment';
// moment().format();

async function underTenderingReport(req, res) {
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const conn = await pool;

    const request = conn.request();
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    console.log(isSagarmalaFunded, "isSagarmalaFunded")

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

    // ********************************************* Column 4 *********************************************
    let column4 = `  SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(utTotalProjectCount.project_id) AS ut_project_count,
        ROUND(SUM(utTotalProjectCount.sanctioned_cost), 2) AS sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.sanctioned_cost           
            FROM tbl_project
        
            WHERE    (   (tbl_project.status = 1 AND on_sub_project_available = 0) 
          
            AND (
                    tbl_project.project_stage_id = 14 OR 
                    tbl_project.project_stage_id = 11 OR tbl_project.project_stage_id = 3 
                )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

    `

    if (isSagarmalaFunded == 'true') {
        column4 += "AND is_sagarmala_funded =  1"
    }

    column4 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_sanctioned_cost           
        FROM tbl_sub_project

        WHERE   (    (tbl_sub_project.sub_status = 1) 
    
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

    `
    if (isSagarmalaFunded == 'true') {
        column4 += "AND sub_is_sagarmala_funded =  1"
    }

    column4 += ` 
        )  AS utTotalProjectCount on utTotalProjectCount.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `;

    // ******************************************* Column 5,6,7  *******************************************

    let column567 = ` SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(utTotalProjectCount.project_id) AS ut_project_count,
        ROUND(SUM(utTotalProjectCount.sanctioned_cost), 2) AS sanctioned_cost,
        ROUND(SUM(utTotalProjectCount.technical_sanction_cost), 2) AS technical_sanction_cost,
        ROUND(SUM(utTotalProjectCount.award_project_cost), 2) AS award_project_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.sanctioned_cost,
            tbl_project.technical_sanction_cost,
            tbl_project.award_project_cost  
            FROM tbl_project
        
            WHERE    (    (tbl_project.status = 1 AND on_sub_project_available = 0) 
          
            AND (
                    tbl_project.project_stage_id = 14  OR 
                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

    `

    if (isSagarmalaFunded == 'true') {
        column567 += "AND is_sagarmala_funded =  1"
    }

    column567 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_sanctioned_cost,
        tbl_sub_project.sub_technical_sanction_cost,
        tbl_sub_project.sub_award_project_cost  
        FROM tbl_sub_project

        WHERE   (    (tbl_sub_project.sub_status = 1) 
       
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

    `
    if (isSagarmalaFunded == 'true') {
        column567 += "AND sub_is_sagarmala_funded =  1"
    }

    column567 += ` 
        )  AS utTotalProjectCount on utTotalProjectCount.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `;

    // ******************************************* Column A  *******************************************
    let columnA = `	SELECT organisation_category_name,
        mmt_organisation.organisation_id, mmt_organisation.organisation_name,
        CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(UtSubStage.project_id) AS ut_project_count_bystage
        
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        (             
            SELECT  tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation, sub_stage_id, actual_date
            FROM tbl_project

            LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
            
        WHERE   (   (( actual_date IS NULL AND sub_stage_id IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))
        AND (tbl_project.status = 1  ) 
        
        AND (
            tbl_project.project_stage_id = 14  OR 
            tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
        )          
        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

    `

    if (isSagarmalaFunded == 'true') {
        columnA += "AND is_sagarmala_funded =  1"
    }

    columnA += ` 
        UNION				

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation, sub_stage_id, actual_date
        FROM tbl_sub_project
        LEFT JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id
     
        WHERE   (     (( actual_date IS NULL AND sub_stage_id IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))
        AND (tbl_sub_project.sub_status = 1 ) 
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )
        
    `
    if (isSagarmalaFunded == 'true') {
        columnA += "AND sub_is_sagarmala_funded =  1"
    }

    columnA += ` 
        )  AS UtSubStage ON UtSubStage.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name 
    `

    // ******************************************* Column B to H *******************************************
    let utStagewise = ` SELECT organisation_category_name,
        mmt_organisation.organisation_id, mmt_organisation.organisation_name,
        CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        UtSubStage.sub_stage_id, 
        COUNT(UtSubStage.project_id) AS ut_project_count_bystage, 
        SUM(UtSubStage.sanctioned_cost) AS cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

        LEFT JOIN
        ( 
            
            SELECT tbl_project.organisation_id, 
            tbl_project_date.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.sanctioned_cost,
            MAX(sub_stage_id) AS sub_stage_id
            FROM tbl_project_date
            INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
            WHERE  (      (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL AND tbl_project.status = 1)
            AND (sub_project_id = '-1') 
            
            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            )          
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
            )
    `

    if (isSagarmalaFunded == 'true') {
        utStagewise += "AND is_sagarmala_funded =  1"
    }

    utStagewise += ` 
        GROUP BY organisation_id, tbl_project_date.project_id, sanctioned_cost, tbl_project.mode_of_implememtation

        UNION				

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_project_date.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_sanctioned_cost,
        MAX(sub_stage_id) AS sub_stage_id
        FROM tbl_project_date
        INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id 
        WHERE     (      (sub_stage_id IS NOT NULL AND tbl_project_date.actual_date IS NOT NULL AND tbl_sub_project.sub_status = 1)   
        AND (
            tbl_sub_project.sub_project_stage_id = 14  OR 
            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
        ) 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        )
    `
    if (isSagarmalaFunded == 'true') {
        utStagewise += "AND sub_is_sagarmala_funded =  1"
    }

    utStagewise += ` 
            GROUP BY sub_organisation_id, tbl_project_date.sub_project_id,
            sub_sanctioned_cost, tbl_sub_project.sub_mode_of_implememtation

            )  AS UtSubStage ON UtSubStage.organisation_id = mmt_organisation.organisation_id

            WHERE mmt_organisation.organisation_id != 4

            GROUP BY
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                mmt_organisation.organisation_id, 
                organisation_name,
                UtSubStage.sub_stage_id, 
                CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

                
            ORDER BY 
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                organisation_name  
    `;


    try {


        //  COLUMN -A - with sub project
        const columnAQuery = await request.query(columnA);


        //  COLUMN - B to H - with sub project
        const projectDateUTQuery = await request.query(utStagewise);

        // COLUMN 4 - with sub project
        const totalApprovedProject = await request.query(column4);

        //  COLUMN 7 - with sub project
        const totalAwardCostQuery = await request.query(column567
        );


        // res.json(result.recordset);
        const response = {
            columnAQuery: columnAQuery.recordset,
            projectDateUTQuery: projectDateUTQuery.recordset,
            totalAwardCostQuery: totalAwardCostQuery.recordset,
            totalApprovedProject: totalApprovedProject.recordset
        }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaiUnderTenderingReport(req, res) {
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

            with approvedprojects as (

            SELECT 
                    organisation_category_name,
                    mmt_organisation.organisation_id, organisation_name,
                    CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                    --COUNT(utTotalProjectCount.project_id) AS ut_project_count,

                    --utTotalProjectCount.project_id,
                    case when utTotalProjectCount.project_id in (select sub_project_id from tbl_sub_project) 
                    then (select project_id from tbl_sub_project where sub_project_id = utTotalProjectCount.project_id)
                    else utTotalProjectCount.project_id end as og_project_id,
                    ROUND(SUM(utTotalProjectCount.sanctioned_cost), 2) AS sanctioned_cost
                    --utTotalProjectCount.sanctioned_cost
                    FROM mmt_organisation 
                    LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                    JOIN
                    ( 
                        SELECT tbl_project.organisation_id, 
                        tbl_project.project_id,
                        tbl_project.mode_of_implememtation,
                        tbl_project.sanctioned_cost           
                        FROM tbl_project
                    
                        WHERE    (   (tbl_project.status = 1 AND on_sub_project_available = 0) 
                    
                        AND (
                                tbl_project.project_stage_id = 14 OR 
                                tbl_project.project_stage_id = 11 OR tbl_project.project_stage_id = 3 
                            )          
                        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)     )


                        AND is_sagarmala_funded =  @issagarmalafunded

                        
                    UNION		

                    SELECT tbl_sub_project.sub_organisation_id, 
                    tbl_sub_project.sub_project_id,
                    tbl_sub_project.sub_mode_of_implememtation,
                    tbl_sub_project.sub_sanctioned_cost           
                    FROM tbl_sub_project

                    WHERE   (    (tbl_sub_project.sub_status = 1) 
                
                    AND (
                        tbl_sub_project.sub_project_stage_id = 14  OR 
                        tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                    ) 
                    AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)     )

                    AND sub_is_sagarmala_funded =  @issagarmalafunded

                    )  AS utTotalProjectCount on utTotalProjectCount.organisation_id = mmt_organisation.organisation_id

                    WHERE mmt_organisation.organisation_id = @organisation_ID

                    GROUP BY
                        
                        
                        organisation_category_name, 
                        mmt_organisation.organisation_id, 
                        mmt_organisation.organisation_name,            
                        CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                        utTotalProjectCount.project_id

            --     ORDER BY 
                        
            --         organisation_category_name, 
            --         organisation_name ,
                        --og_project_id 
                        ),

                        column567 as (
                        SELECT 
                    organisation_category_name,
                    mmt_organisation.organisation_id, organisation_name,
                    CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                    --COUNT(utTotalProjectCount.project_id) AS ut_project_count,
                    case when utTotalProjectCount.project_id in (select sub_project_id from tbl_sub_project) 
                    then (select project_id from tbl_sub_project where sub_project_id = utTotalProjectCount.project_id)
                    else utTotalProjectCount.project_id end as og_project_id,
                    ROUND(SUM(utTotalProjectCount.sanctioned_cost), 2) AS sanctioned_cost,
                    ROUND(SUM(utTotalProjectCount.technical_sanction_cost), 2) AS technical_sanction_cost,
                    ROUND(SUM(utTotalProjectCount.award_project_cost), 2) AS award_project_cost

                    FROM mmt_organisation 
                    LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                    LEFT JOIN
                    ( 
                        SELECT tbl_project.organisation_id, 
                        tbl_project.project_id,
                        tbl_project.mode_of_implememtation,
                        tbl_project.sanctioned_cost,
                        tbl_project.technical_sanction_cost,
                        tbl_project.award_project_cost  
                        FROM tbl_project
                    
                        WHERE    (    (tbl_project.status = 1 AND on_sub_project_available = 0) 
                    
                        AND (
                                tbl_project.project_stage_id = 14  OR 
                                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                            )          
                        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)     )
                        
                        AND is_sagarmala_funded =  @issagarmalafunded

                        
                    UNION		

                    SELECT tbl_sub_project.sub_organisation_id, 
                    tbl_sub_project.sub_project_id,
                    tbl_sub_project.sub_mode_of_implememtation,
                    tbl_sub_project.sub_sanctioned_cost,
                    tbl_sub_project.sub_technical_sanction_cost,
                    tbl_sub_project.sub_award_project_cost  
                    FROM tbl_sub_project

                    WHERE   (    (tbl_sub_project.sub_status = 1) 
                
                    AND (
                        tbl_sub_project.sub_project_stage_id = 14  OR 
                        tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                    ) 
                    AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate) 

                    AND sub_is_sagarmala_funded =  @issagarmalafunded

                    ))  AS utTotalProjectCount on utTotalProjectCount.organisation_id = mmt_organisation.organisation_id

                    WHERE mmt_organisation.organisation_id = @organisation_ID

                    GROUP BY
                        
                        mmt_organisation_category.organisation_category_id, 
                        organisation_category_name, 
                        mmt_organisation.organisation_id, 
                        mmt_organisation.organisation_name,			
                        CASE WHEN utTotalProjectCount.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                        utTotalProjectCount.project_id

                        --order by og_project_id
                        ),
                        
                        
                    TendercolumnA as (
                                        SELECT organisation_category_name,
                                        mmt_organisation.organisation_id, mmt_organisation.organisation_name,
                                        CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        --COUNT(UtSubStage.project_id) AS ut_project_count_bystage
                                        case when UtSubStage.project_id in (select sub_project_id from tbl_sub_project) 
                                        then (select project_id from tbl_sub_project where sub_project_id = UtSubStage.project_id)
                                        else UtSubStage.project_id end as og_project_id
                                        FROM mmt_organisation 
                                        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                        LEFT JOIN
                                        (             
                                            SELECT  tbl_project.organisation_id, 
                                            tbl_project.project_id,
                                            tbl_project.mode_of_implememtation, sub_stage_id, actual_date
                                            FROM tbl_project

                                            LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
                        
                                        WHERE   (   (( actual_date IS NULL AND sub_stage_id IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))
                                        AND (tbl_project.status = 1  ) 
                    
                                        AND (
                                            tbl_project.project_stage_id = 14  OR 
                                            tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                        )          
                                        AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)     )
                    
                                        AND is_sagarmala_funded =  @issagarmalafunded

                                        UNION				

                                        SELECT tbl_sub_project.sub_organisation_id, 
                                        tbl_sub_project.sub_project_id,
                                        tbl_sub_project.sub_mode_of_implememtation, sub_stage_id, actual_date
                                        FROM tbl_sub_project
                                        LEFT JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id
                
                                        WHERE   (     (( actual_date IS NULL AND sub_stage_id IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))
                                        AND (tbl_sub_project.sub_status = 1 ) 
                                        AND (
                                            tbl_sub_project.sub_project_stage_id = 14  OR 
                                            tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                        ) 
                                        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)     )

                                        AND sub_is_sagarmala_funded =  @issagarmalafunded

                                        )  AS UtSubStage ON UtSubStage.organisation_id = mmt_organisation.organisation_id

                                        WHERE mmt_organisation.organisation_id = @organisation_ID

                                        GROUP BY
                                            mmt_organisation_category.organisation_category_id, 
                                            organisation_category_name, 
                                            mmt_organisation.organisation_id, 
                                            organisation_name,
                                            CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                            UtSubStage.project_id

                                        --ORDER BY 
                                        --    mmt_organisation_category.organisation_category_id, 
                                        --    organisation_category_name, 
                                        --    organisation_name
                        ),
                        BtoI as (

                        
                                        SELECT 
                                        organisation_id,organisation_name,  implementation_group, og_project_id,
                
                                        isnull([3],0) as "TechSactionObtained_B",
                                        isnull([4] ,0) as "TenderDocumentApproved_C",
                                        isnull([5],0) as "TenderNoticeIssued_D",
                                        isnull([6],0) as "TechnicalEvaluationCompleted_E",
                                        isnull([7],0) as "FinancialEvaluationCompleted_F",
                                        isnull([8],0) as "SactionOfComAuthObforAward_G",
                                        isnull([9],0) as "WorkAwaredLOAissued_H",
                                        isnull([10],0) as "ContactAggreSigned_I",
                                            cost
                                        FROM 
                                        (

                                            SELECT organisation_category_name,
                                            mmt_organisation.organisation_id, mmt_organisation.organisation_name,
                                            CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            UtSubStage.sub_stage_id, 
                                            --COUNT(UtSubStage.project_id) AS ut_project_count_bystage, 
                                            case when UtSubStage.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = UtSubStage.project_id)
                                            else UtSubStage.project_id end as og_project_id,
                                            SUM(UtSubStage.sanctioned_cost) AS cost

                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            LEFT JOIN
                                            ( 
                        
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project_date.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project.sanctioned_cost,
                                                MAX(sub_stage_id) AS sub_stage_id
                                                FROM tbl_project_date
                                                INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
                                                WHERE  (      (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL AND tbl_project.status = 1)
                                                AND (sub_project_id = '-1') 
                        
                                                AND (
                                                    tbl_project.project_stage_id = 14  OR 
                                                    tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                                )          
                                                AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN @begindate AND @enddate)
                                                )

                                                AND is_sagarmala_funded =  0

                                                GROUP BY organisation_id, tbl_project_date.project_id, sanctioned_cost, tbl_project.mode_of_implememtation

                                            UNION				

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_project_date.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            tbl_sub_project.sub_sanctioned_cost,
                                            MAX(sub_stage_id) AS sub_stage_id
                                            FROM tbl_project_date
                                            INNER JOIN tbl_sub_project ON tbl_sub_project.sub_project_id = tbl_project_date.sub_project_id 
                                            WHERE     (      (sub_stage_id IS NOT NULL AND tbl_project_date.actual_date IS NOT NULL AND tbl_sub_project.sub_status = 1)   
                                            AND (
                                                tbl_sub_project.sub_project_stage_id = 14  OR 
                                                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
                                            ) 
                                            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN @begindate AND @enddate)
                                            )

                                            AND sub_is_sagarmala_funded =  0

                                            GROUP BY sub_organisation_id, tbl_project_date.sub_project_id,
                                                sub_sanctioned_cost, tbl_sub_project.sub_mode_of_implememtation

                                                )  AS UtSubStage ON UtSubStage.organisation_id = mmt_organisation.organisation_id

                                                WHERE mmt_organisation.organisation_id = @organisation_ID

                                                GROUP BY
                                                    mmt_organisation_category.organisation_category_id, 
                                                    organisation_category_name, 
                                                    mmt_organisation.organisation_id, 
                                                    organisation_name,
                                                    UtSubStage.sub_stage_id, 
                                                    CASE WHEN UtSubStage.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                    UtSubStage.project_id
                                                    ) as st								
                                            PIVOT
                                                (
                                                COUNT(sub_stage_id)
                                                FOR sub_stage_id IN ([1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13])
                                                ) AS PivotTable
                                    
                            )

                        select a.organisation_id,a.organisation_name,b.implementation_group,a.og_project_id, e.project_name, a.Approved_count,
                        a.sanctioned_cost as CostAdminApprove_5 ,
                        -- b.sanctioned_cost,
                        b.technical_sanction_cost as CostTechnianApprove_6,
                        c.tendercount as columnA, 
                        fromBtoI.columnB,
                        fromBtoI.columnC,
                        fromBtoI.columnD,
                        fromBtoI.columnE,
                        fromBtoI.columnF,
                        fromBtoI.columnG,
                        fromBtoI.columnH,
                        fromBtoI.columnI,
                        b.award_project_cost as CostAwardProject_7
                        
                        
                        from 
                        (select distinct organisation_id, organisation_name, implementation_group,og_project_id, count(og_project_id) as Approved_count,
                    ROUND(SUM(sanctioned_cost), 2) AS sanctioned_cost from approvedprojects 
                    group by organisation_id, organisation_name, implementation_group,og_project_id) a 

                    left join 

                    (select distinct organisation_id, organisation_name, implementation_group,og_project_id,
                    ROUND(SUM(sanctioned_cost), 2) AS sanctioned_cost, ROUND(SUM(technical_sanction_cost), 2) AS technical_sanction_cost,
                    ROUND(SUM(award_project_cost), 2) AS award_project_cost 
                    from column567
                    group by organisation_id, organisation_name, implementation_group,og_project_id ) b  

                    on a.og_project_id = b.og_project_id  and a.organisation_id = b.organisation_id and a.implementation_group =b.implementation_group

                    left join 

                    (select distinct organisation_id, organisation_name, implementation_group ,og_project_id ,count(*) as tendercount 
                        from TendercolumnA
                        group by organisation_id, organisation_name, implementation_group ,og_project_id) c
                    on c.organisation_id = a.organisation_id and c.implementation_group = a.implementation_group and c.og_project_id = a.og_project_id

                    left join 

                    (select distinct organisation_id, organisation_name, implementation_group ,og_project_id ,sum(TechSactionObtained_B) as columnB,
                    sum(TenderDocumentApproved_C) as columnC, sum(TenderNoticeIssued_D) as columnD, sum(TechnicalEvaluationCompleted_E) as columnE,
                    sum(FinancialEvaluationCompleted_F) as columnF, sum(SactionOfComAuthObforAward_G) as columnG , sum(WorkAwaredLOAissued_H) as columnH,
                    sum(ContactAggreSigned_I) as columnI 
                    from BtoI
                    group by organisation_id, organisation_name, implementation_group ,og_project_id
                    ) fromBtoI 
                    on fromBtoI.organisation_id = a.organisation_id and fromBtoI.implementation_group = a.implementation_group and fromBtoI.og_project_id = a.og_project_id

                    left join 
                    (
                    select mmt_organisation.organisation_id,mmt_organisation.organisation_name, tbl_project.project_name,tbl_project.project_id from mmt_organisation  join tbl_project on mmt_organisation.organisation_id =  tbl_project.organisation_id 
                    -- for Organisation category 
                    where organisation_category_id = @organisation_categoryID 

                    ) e on e.organisation_id = a.organisation_id  and e.project_id = a.og_project_id


                        where  case when @modeofimp = 'PPP' then 'PPP/Captive' 
                        when @modeofimp = 'EPC' then 'EPC/Others' 
                        else isnull(isnull(isnull (a.implementation_group,b.implementation_group),c.implementation_group),fromBtoI.implementation_group) 
                        end =  isnull(isnull(isnull (a.implementation_group,b.implementation_group),c.implementation_group),fromBtoI.implementation_group)

            end
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
            organisation_name: item['organisation_name'],
            CostAdminApprove_5: item['CostAdminApprove_5'],
            CostTechnianApprove_6: item['CostTechnianApprove_6'],
            CostAwardProject_7: item['CostAwardProject_7'],
            Approved_count: item['Approved_count'],
            columnA: item['columnA'],
            columnB: item['columnB'],
            columnC: item['columnC'],
            columnD: item['columnD'],
            columnE: item['columnE'],
            columnF: item['columnF'],
            columnG: item['columnG'],
            columnH: item['columnH'],
            columnI: item['columnI'],
        };
    });

    res.json({ rowData });


    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
};

// -----------------------------------------------------------------------------------------------------------------------------------
async function getDetailsUnderTenderingcol4(req, res) {
    const organisationID = req.params.organisationID;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
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
        console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    let utCol4 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name,
        num_ut_tender_calls, award_project_cost

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        
        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 ) 
        AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID ) 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)  BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
            )
        AND (
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14 OR
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 OR
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3
        )    

    `
    if (isSagarmalaFunded == 'true') {
        utCol4 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (modOfImp == 'PPP+Captive') {
        utCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        utCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    utCol4 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryCol4 = await request.query(utCol4);

        // res.json(result.recordset);
        const response = { getMainProjectQueryCol4: getMainProjectQueryCol4.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailsUTbeginStage(req, res) {
    const organisationID = req.params.organisationID;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
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
        console.log(firstDateCurrentFy, lastDateCurrentFy, "firstDateCurrentFy, lastDateCurrentFy")
    }

    // AS ON DATE
    const asOnDate = moment().subtract(1, "month").endOf("month").format('YYYY-MM-DD');

    let stage1 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_project_date1.sub_project_id, tbl_project_date.project_id, 
        project_name, sub_project_name, scheme_name, tbl_project_date.sub_stage_id,
        num_ut_tender_calls

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        
        LEFT OUTER JOIN 	
        (
            SELECT tbl_project.project_id, organisation_id, sub_stage_id, actual_date
        
            FROM tbl_project
            LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE tbl_project.status = 1 AND organisation_id = @organisationID
            AND ((sub_stage_id IS NULL AND actual_date IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))

            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            ) 
              AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        
        ) tbl_project_date ON  tbl_project_date.project_id = tbl_project.project_id


        LEFT OUTER JOIN 	
        (
            SELECT tbl_sub_project.sub_project_id, sub_organisation_id, sub_stage_id, actual_date 
            FROM tbl_sub_project
            LEFT JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id

            WHERE tbl_sub_project.sub_status = 1 AND sub_organisation_id = @organisationID 
            AND ( (sub_stage_id IS NULL AND actual_date IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))

            AND (
                tbl_sub_project.sub_project_stage_id = 14  OR 
                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
            ) 
            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
    
        ) tbl_project_date1 ON tbl_project_date1.sub_project_id = tbl_sub_project.sub_project_id

        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 ) 
        AND (ISNULL(tbl_project_date1.sub_organisation_id, tbl_project_date.organisation_id) = @organisationID ) 
	     
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
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryStage1 = await request.query(stage1);

        // res.json(result.recordset);
        const response = { getMainProjectQueryStage1: getMainProjectQueryStage1.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getDetailsUTStageWise(req, res) {
    const organisationID = req.params.organisationID;
    const subStageId = req.params.subStageId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("subStageId", subStageId);
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
    let stageWise = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
    
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name, tbl_project_date.sub_stage_id,
        CONVERT(VARCHAR,planned_date, 106) as planned_date,
        --FORMAT(actual_date,'dd-MM-yyyy') AS actual_date, 
        CONVERT(VARCHAR,actual_date, 106) as actual_date,
        ISNULL(tbl_sub_project.sub_num_ut_tender_calls, tbl_project.num_ut_tender_calls) AS num_ut_tender_calls, 
        ISNULL(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost) AS award_project_cost

        FROM tbl_project 
		LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
    
        LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
			OR tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
			OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

        LEFT JOIN
        (
            SELECT 
            tbl_project_date.project_id, tbl_project_date.sub_project_id,
            MAX(sub_stage_id) AS sub_stage_id
            FROM tbl_project_date
            --   INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
            WHERE (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL )
                AND tbl_project_date.sub_project_id = '-1'
          
            GROUP BY tbl_project_date.project_id,  tbl_project_date.sub_project_id
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
			--	OR max_stage.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT 
            tbl_project_date.sub_project_id,
            MAX(sub_stage_id) AS sub_stage_id
            FROM tbl_project_date
            WHERE (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL ) 
                        
            GROUP BY tbl_project_date.project_id,  tbl_project_date.sub_project_id
        ) AS max_stage1 ON 
            max_stage1.sub_project_id = tbl_sub_project.sub_project_id

        WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status)= 1 )
        AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )
        AND  ((tbl_project_date.sub_stage_id <= @subStageId AND max_stage.sub_stage_id = @subStageId )
            OR (tbl_project_date.sub_stage_id <= @subStageId AND max_stage1.sub_stage_id = @subStageId)) 
        AND actual_date IS NOT NULL        

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
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQuery = await request.query(stageWise);

        // res.json(result.recordset);
        const response = { getMainProject: getMainProjectQuery.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ---------------------------------------------------------- GRAND TOTAL --------------------------------------------------------
async function getGrandTotalUTcol4(req, res) {
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
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

    let utCol4;

    utCol4 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name,
        num_ut_tender_calls, award_project_cost

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        
    `

    // WHERE CONDITION STARTS
    utCol4 += `   WHERE  ` 
    

    if(orgCategoryFilter != 'nofilter') {      
        utCol4 += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        utCol4 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        utCol4 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        utCol4 += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
  

    utCol4 += `AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 ) 
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)  BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
            )
        AND (
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14 OR
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 11 OR
            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 3
        )    
    `

    if (isSagarmalaFunded == 'true') {
        utCol4 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (modOfImp == 'PPP+Captive') {
        utCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        utCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    utCol4 += `	
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryCol4 = await request.query(utCol4);

        // res.json(result.recordset);
        const response = { getMainProjectQueryCol4: getMainProjectQueryCol4.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};


async function getGrandTotalUTbeginStage(req, res) 
{
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
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

    let stage1;

    stage1 = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
        mmt_organisation.organisation_name, tbl_project_date1.sub_project_id, tbl_project_date.project_id, 
        project_name, sub_project_name, scheme_name, tbl_project_date.sub_stage_id,
        num_ut_tender_calls

        FROM tbl_project
        LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
        
        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
            OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
        
        LEFT OUTER JOIN 	
        (
            SELECT tbl_project.project_id, organisation_id, sub_stage_id, actual_date
        
            FROM tbl_project
            LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

            WHERE tbl_project.status = 1 AND organisation_id != 4
            AND ((sub_stage_id IS NULL AND actual_date IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))

            AND (
                tbl_project.project_stage_id = 14  OR 
                tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
            ) 
              AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
        
        ) tbl_project_date ON  tbl_project_date.project_id = tbl_project.project_id


        LEFT OUTER JOIN 	
        (
            SELECT tbl_sub_project.sub_project_id, sub_organisation_id, sub_stage_id, actual_date 
            FROM tbl_sub_project
            LEFT JOIN tbl_project_date ON tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id

            WHERE tbl_sub_project.sub_status = 1 AND sub_organisation_id != 4 
            AND ( (sub_stage_id IS NULL AND actual_date IS NULL ) OR (sub_stage_id = 3 AND actual_date IS NULL))

            AND (
                tbl_sub_project.sub_project_stage_id = 14  OR 
                tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 
            ) 
            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')
    
        ) tbl_project_date1 ON tbl_project_date1.sub_project_id = tbl_sub_project.sub_project_id

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
    
    
    stage1 += "AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )"

       
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
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQueryStage1 = await request.query(stage1);

        // res.json(result.recordset);
        const response = { getMainProjectQueryStage1: getMainProjectQueryStage1.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};


async function getGrandTotalUTStageWise(req, res) {
    const subStageId = req.params.subStageId;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("subStageId", subStageId);
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

    let stageWise;
    // ----------------------------------------------------------------------------------------------------------------------------------     
    stageWise = ` SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id, 
    
        mmt_organisation.organisation_name, tbl_sub_project.sub_project_id, tbl_project.project_id, 
        project_name, sub_project_name, scheme_name, tbl_project_date.sub_stage_id,
        CONVERT(VARCHAR,planned_date, 106) as planned_date,
        --FORMAT(actual_date,'dd-MM-yyyy') AS actual_date, 
        CONVERT(VARCHAR,actual_date, 106) as actual_date,
        ISNULL(tbl_sub_project.sub_num_ut_tender_calls, tbl_project.num_ut_tender_calls) AS num_ut_tender_calls, 
        ISNULL(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost) AS award_project_cost

        FROM tbl_project 
		LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
    
        LEFT JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
			OR tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN mmt_organisation ON mmt_organisation.organisation_id = tbl_project.organisation_id
			OR mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id

        LEFT JOIN mmt_scheme ON mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

        LEFT JOIN
        (
            SELECT 
            tbl_project_date.project_id, tbl_project_date.sub_project_id,
            MAX(sub_stage_id) AS sub_stage_id
            FROM tbl_project_date
            --   INNER JOIN tbl_project ON tbl_project.project_id = tbl_project_date.project_id
            WHERE (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL )
                AND tbl_project_date.sub_project_id = '-1'
          
            GROUP BY tbl_project_date.project_id,  tbl_project_date.sub_project_id
        ) AS max_stage ON max_stage.project_id =  tbl_project.project_id
			--	OR max_stage.sub_project_id = tbl_sub_project.sub_project_id

        LEFT JOIN
        (
            SELECT 
            tbl_project_date.sub_project_id,
            MAX(sub_stage_id) AS sub_stage_id
            FROM tbl_project_date
            WHERE (sub_stage_id IS NOT NULL AND actual_date IS NOT NULL ) 
                        
            GROUP BY tbl_project_date.project_id,  tbl_project_date.sub_project_id
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
        AND  (
                (tbl_project_date.sub_stage_id <= @subStageId AND max_stage.sub_stage_id = @subStageId )
                OR (tbl_project_date.sub_stage_id <= @subStageId AND max_stage1.sub_stage_id = @subStageId)
            ) 
        AND actual_date IS NOT NULL        

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
        ORDER BY tbl_project.project_id, project_name, sub_project_name  `;

    try {
        const getMainProjectQuery = await request.query(stageWise);

        // res.json(result.recordset);
        const response = { getMainProject: getMainProjectQuery.recordset }

        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default {
    underTenderingReport, getDetailsUnderTenderingcol4, getDetailsUTbeginStage, getDetailsUTStageWise, getGrandTotalUTcol4,
    getGrandTotalUTbeginStage,  getGrandTotalUTStageWise, iwaiUnderTenderingReport
};

