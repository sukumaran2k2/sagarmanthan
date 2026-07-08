import { pool } from "../../db.js";
import moment from 'moment';

async function projectHistoryAbstractData (req, res) 
{
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const conn = await pool;
    
    const request = conn.request();
    request.input("isSagarmalaFunded", isSagarmalaFunded);

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth() + 1;
    let currentYear = new Date(currentDate).getFullYear();

    let  firstDateCurrentFy, lastDateCurrentFy, lastDatePreviousFy;


    // From 2014 to till date (Ten year data)
    let decadeCurrentDate = new Date().toISOString().split('T')[0];
    // console.log(decadeCurrentDate, "decadeCurrentDate")

    if(currentMonth <= 3 && currentMonth >= 1)
    {
        firstDateCurrentFy = (currentYear)+"-04-01" ;
        lastDateCurrentFy = (currentYear + 1)+"-03-31";      
        
        // GET 31.03.2024
        lastDatePreviousFy = (currentYear - 1)+"-03-31" ; 
    }
    else
    {
        firstDateCurrentFy = (currentYear)+"-04-01" ;
        lastDateCurrentFy = (currentYear + 1)+"-03-31";       
        
        // GET 31.03.2025
        lastDatePreviousFy = (currentYear)+"-03-31" ;
  
        // console.log(firstDateCurrentFy, "firstDateCurrentFy", lastDateCurrentFy, "lastDateCurrentFy", lastDatePreviousFy, "lastDatePreviousFy") 
    }

    // ********************************************* Column 4 *********************************************
    let column4 = ` SELECT 
       organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN projectAsOnDate_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(projectAsOnDate_count.project_id) as project_count,
        ROUND(SUM(projectAsOnDate_count.sanctioned_cost), 2) as sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
        
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
            FROM tbl_project
            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
           
            WHERE ( ( (on_sub_project_available = 0) AND
                (tbl_project.project_intiated_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}') )
                OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')  )       
    `
   
    // if(isSagarmalaFunded != 'null')
    // {   
    //      column4 += " AND scheme_id = @schemeType "
    // }
    if(isSagarmalaFunded == 'true')
    {   
        column4 += "AND is_sagarmala_funded =  1"
    }

    column4 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost          

        FROM tbl_sub_project
        LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  

        WHERE  (  (tbl_sub_project.sub_project_intiated_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}') 
            OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')   )     
    `
     if(isSagarmalaFunded == 'true')
    {   
        column4 += " AND sub_is_sagarmala_funded =  1"
    }

    column4 += ` 
        )  AS projectAsOnDate_count on projectAsOnDate_count.organisation_id = mmt_organisation.organisation_id

        --WHERE mmt_organisation.organisation_id != 4
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
           
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN projectAsOnDate_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name           
    `

    // ********************************************* Column 5 *********************************************
    let column5 = `   SELECT 
       organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN dropped_projectAsonDate.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(dropped_projectAsonDate.project_id) as dropped_project_count,
        ROUND(SUM(dropped_projectAsonDate.sanctioned_cost), 2) as sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
        
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost         
            FROM tbl_project
            INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id           

            WHERE ( (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}') 
            AND ( tbl_project.status = 0 AND on_sub_project_available = 0)  )
    `

    if(isSagarmalaFunded == 'true')
    {   
        column5 += "AND is_sagarmala_funded =  1"
    }

    column5 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

        FROM tbl_sub_project
        INNER JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id           

        WHERE ( (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}') 
        AND (tbl_sub_project.sub_status = 0 )  )
    `
     if(isSagarmalaFunded == 'true')
    {   
        column5 += " AND sub_is_sagarmala_funded =  1"
    }

    column5 += ` 
        )  AS dropped_projectAsonDate on dropped_projectAsonDate.organisation_id = mmt_organisation.organisation_id

        --WHERE mmt_organisation.organisation_id != 4
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
           
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN dropped_projectAsonDate.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `

    // ********************************************* Column 6,7 *********************************************
    let column67 = `  SELECT 
       organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN completedProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(completedProject.project_id) as completed_project_count,
        ROUND(SUM(completedProject.closure_cost), 2) as closure_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
        

        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.closure_cost           
            FROM tbl_project
        
            WHERE (  (tbl_project.project_stage_id = 14) AND 
            (tbl_project.actual_date_of_completion BETWEEN '2014-04-01' AND '${lastDatePreviousFy}') 
            AND ( tbl_project.status = 1 AND on_sub_project_available = 0)   )
    `

     if(isSagarmalaFunded == 'true')
    {   
        column67 += "AND is_sagarmala_funded =  1"
    }

    column67 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_closure_cost           
        FROM tbl_sub_project
        
        WHERE (     (tbl_sub_project.sub_project_stage_id = 14) AND 
        (tbl_sub_project.sub_actual_date_of_completion BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')   )
        
        AND (tbl_sub_project.sub_status = 1 )
    `
     if(isSagarmalaFunded == 'true')
    {   
        column67 += " AND sub_is_sagarmala_funded =  1"
    }

    column67 += ` 
        )  AS completedProject on completedProject.organisation_id = mmt_organisation.organisation_id

        --WHERE mmt_organisation.organisation_id != 4
        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
           
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN completedProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `

    // ********************************************* Column 8,9 *********************************************
    let column89 = `  SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(onGoingProject.project_id) as onGoing_project_count,
        ROUND(SUM(onGoingProject.sanctioned_cost), 2) as sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
        
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                  
            FROM tbl_project    
            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id     

            WHERE  (  (on_sub_project_available = 0  AND project_intiated_date < '${firstDateCurrentFy}' 
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion > '${lastDatePreviousFy}') )
            OR (tbl_project_drop_request.drop_date <= '${lastDatePreviousFy}')      )   
    `

     if(isSagarmalaFunded == 'true')
    {   
        column89 += "AND is_sagarmala_funded =  1"
    }

    column89 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

        FROM tbl_sub_project
        LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id 

        WHERE   (    ( (sub_project_intiated_date < '${firstDateCurrentFy}') 
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion > '${lastDatePreviousFy}') )
        OR (tbl_project_drop_request.drop_date <= '${lastDatePreviousFy}')      ) 
    `
    if(isSagarmalaFunded == 'true')
    {   
        column89 += " AND sub_is_sagarmala_funded =  1"
    }

    column89 += ` 
        )  AS onGoingProject on onGoingProject.organisation_id = mmt_organisation.organisation_id

        --WHERE mmt_organisation.organisation_id != 4
        WHERE mmt_organisation.organisation_id != 4
        
        GROUP BY           
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `;

    try 
    {
        // COLUMN 4
        const column4Query = await request.query(column4);
       
        // COLUMN 5
        const column5Query =  await request.query(column5);

        // Completed Decade wise - COLUMN 6,7
        const column67Query = await request.query( column67 ); 

        // COLUMN 8,9 
        const column89Query = await request.query( column89 );
      
        const response = { 
            proposalTakenDeacade:  column4Query.recordset, 
            droppedProposalDecade: column5Query.recordset,
            completedProposalDecade: column67Query.recordset, 
            noOfProjectinBeginingYear:  column89Query.recordset, 

        }
        res.json(response);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaiProjectHistoryAbstractData (req, res) {
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
    
        let decadeCurrentDate = new Date().toISOString().split('T')[0];
    
        if(currentMonth <= 3 && currentMonth >= 1)
        {
            firstDateCurrentFy = (currentYear)+"-04-01" ;
            formateFirstDateCurrentFy = "01-04-"+(currentYear) ;
            lastDateCurrentFy = (currentYear + 1)+"-03-31"; 
            formateLastDateCurrentFy = "31-03-"+(currentYear + 1);   
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
        @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
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
        SET @lastDatePreviousFy = CASE 
                                    WHEN MONTH(GETDATE()) >= 4 
                                        THEN DATEFROMPARTS(YEAR(GETDATE()), 3, 31) -- March 31st of the current year
                                    ELSE 
                                        DATEFROMPARTS(YEAR(GETDATE()) - 1, 3, 31) -- March 31st of the previous year
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

        BEGIN

        with allprojectsubproject as ( 

                                        select organisation_category_name,
                                        mmt_organisation.organisation_id, organisation_name,
                                        CASE WHEN physical_progress_tab.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        physical_progress_tab.project_id,
                                        physical_progress_tab.project_name,
                                        case when physical_progress_tab.project_id in (select sub_project_id from tbl_sub_project)
                                        then (select project_id from tbl_sub_project where sub_project_id = physical_progress_tab.project_id)
                                        else physical_progress_tab.project_id end as og_project_id,

                                        case when physical_progress_tab.project_id in (select sub_project_id from tbl_sub_project)
                                        then (select project_name from tbl_project where project_id in ( select project_id from tbl_sub_project where sub_project_id = physical_progress_tab.project_id))
                                        else (select Project_name from tbl_project where project_id in( physical_progress_tab.project_id)) end as og_project_name

                                    
                                        
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
                                            
                                            
                                            --(tbl_project_physical_progress.sub_project_id = '-1') 
                                            --AND (
                                            --	tbl_project.project_stage_id = 14  OR 
                                            --	tbl_project.project_stage_id = 11  OR tbl_project.project_stage_id = 3 
                                            --)    AND      
                                            
                                                


                                                is_sagarmala_funded =  @issagarmalafunded

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
                                            --(tbl_sub_project.sub_project_stage_id = 14  OR 
                                            --tbl_sub_project.sub_project_stage_id = 11  OR tbl_sub_project.sub_project_stage_id = 3 ) AND	


                                        sub_is_sagarmala_funded =  @issagarmalafunded

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
        
        taken_up as (
        SELECT 
            organisation_category_name,
                mmt_organisation.organisation_id, organisation_name,
                --projectAsOnDate_count.project_id,
                case when projectAsOnDate_count.project_id in (select sub_project_id from tbl_sub_project) 
                then (select project_id from tbl_sub_project where sub_project_id = projectAsOnDate_count.project_id)
                else projectAsOnDate_count.project_id end as og_project_id,
                CASE WHEN projectAsOnDate_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                COUNT(projectAsOnDate_count.project_id) as project_count,
                ROUND(SUM(projectAsOnDate_count.sanctioned_cost), 2) as sanctioned_cost

                FROM mmt_organisation 
                LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
                
                JOIN
                ( 
                    SELECT tbl_project.organisation_id, 
                    tbl_project.project_id,
                    tbl_project.mode_of_implememtation,
                    tbl_project.actual_date_of_completion,
                    ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                    FROM tbl_project
                    LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                
                    WHERE on_sub_project_available = 0 AND
                        (tbl_project.project_intiated_date BETWEEN '2014-04-01' AND @lastDatePreviousFy
                        OR tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy)       
        
        
        AND is_sagarmala_funded =  @issagarmalafunded



                UNION		

                SELECT tbl_sub_project.sub_organisation_id, 
                tbl_sub_project.sub_project_id,
                tbl_sub_project.sub_mode_of_implememtation,
                tbl_sub_project.sub_actual_date_of_completion ,
                ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost          

                FROM tbl_sub_project
                LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  

                WHERE  (  (tbl_sub_project.sub_project_intiated_date BETWEEN '2014-04-01' AND @lastDatePreviousFy) 
                    OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy)   )     
            
            
            AND sub_is_sagarmala_funded =  @issagarmalafunded AND tbl_sub_project.sub_status = 1


                )  AS projectAsOnDate_count on projectAsOnDate_count.organisation_id = mmt_organisation.organisation_id

                --WHERE mmt_organisation.organisation_id != 4
                WHERE 
                
                mmt_organisation.organisation_id = @organisation_ID

                GROUP BY
                
                    mmt_organisation_category.organisation_category_id, 
                    organisation_category_name, 
                    mmt_organisation.organisation_id, 
                    organisation_name,
                    projectAsOnDate_count.project_id,
                    CASE WHEN projectAsOnDate_count.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

            ),

        completeddate as (
        SELECT     
                distinct
                mmt_organisation.organisation_id, mmt_organisation.organisation_name,
                CASE WHEN completedProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                completedProject.project_id,
                case when completedProject.project_id in (select sub_project_id from tbl_sub_project) 
                then (select project_id from tbl_sub_project where sub_project_id = completedProject.project_id)
                else completedProject.project_id end as og_project_id,
                COUNT(completedProject.project_id) as completed_project_count,
                ROUND(SUM(completedProject.closure_cost), 2) as closure_cost

                FROM mmt_organisation 
                LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
                

                JOIN
                ( 
                    SELECT tbl_project.organisation_id, 
                    tbl_project.project_id,
                    tbl_project.mode_of_implememtation,
                    tbl_project.closure_cost           
                    FROM tbl_project
                
                    WHERE (  (tbl_project.project_stage_id = 14) AND 
                    (tbl_project.actual_date_of_completion BETWEEN '2014-04-01' AND @lastDatePreviousFy) 
                    AND ( tbl_project.status = 1 AND on_sub_project_available = 0)   )
        
        AND is_sagarmala_funded =  @issagarmalafunded


                UNION		

                SELECT tbl_sub_project.sub_organisation_id, 
                tbl_sub_project.sub_project_id,		
                tbl_sub_project.sub_mode_of_implememtation,
                tbl_sub_project.sub_closure_cost           
                FROM tbl_sub_project
                
                WHERE (     (tbl_sub_project.sub_project_stage_id = 14) AND 
                (tbl_sub_project.sub_actual_date_of_completion BETWEEN '2014-04-01' AND @lastDatePreviousFy)   )
                
                AND (tbl_sub_project.sub_status = 1 )
            
            
            AND sub_is_sagarmala_funded =  @issagarmalafunded


                )  AS completedProject on completedProject.organisation_id = mmt_organisation.organisation_id

                --WHERE mmt_organisation.organisation_id != 4
                WHERE mmt_organisation.organisation_id = @organisation_ID

                GROUP BY
                    
                    
                    mmt_organisation.organisation_id, mmt_organisation.organisation_name ,           
                    CASE WHEN completedProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,			
                    completedProject.project_id
                    
                    ),



                ongoingprojectcount as (
		SELECT         
        mmt_organisation.organisation_id,
        CASE WHEN onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
		onGoingProject.project_id,
		case when onGoingProject.project_id in (select sub_project_id from tbl_sub_project) 
		then (select project_id from tbl_sub_project where sub_project_id = onGoingProject.project_id)
		else onGoingProject.project_id end as og_project_id,
        COUNT(onGoingProject.project_id) as onGoing_project_count,
        ROUND(SUM(onGoingProject.sanctioned_cost), 2) as sanctioned_cost

 
        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
         JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
            FROM tbl_project    
            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id     
 
            WHERE  (on_sub_project_available = 0  AND project_intiated_date < @begindate 
            AND (actual_date_of_completion IS NULL OR actual_date_of_completion > @lastDatePreviousFy))
            --OR tbl_project_drop_request.drop_date <= @lastDatePreviousFy)    

	AND is_sagarmala_funded =  @issagarmalafunded
 
 
        UNION		
 
        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

 
        FROM tbl_sub_project
        LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id
 
        WHERE  sub_project_intiated_date < @begindate
        AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion > @lastDatePreviousFy)
        --OR tbl_project_drop_request.drop_date <= @lastDatePreviousFy)
		and tbl_sub_project.sub_status = 1

	AND sub_is_sagarmala_funded =  @issagarmalafunded

 
        )  AS onGoingProject on onGoingProject.organisation_id = mmt_organisation.organisation_id
 
        --WHERE mmt_organisation.organisation_id != 4
        WHERE mmt_organisation.organisation_id = @organisation_ID
        GROUP BY           
            mmt_organisation.organisation_id,             
			onGoingProject.project_id,
            CASE WHEN onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END),			
                    
                    
                droppedproject as (
                SELECT 
                mmt_organisation.organisation_id, organisation_name,
                CASE WHEN dropped_projectAsonDate.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                dropped_projectAsonDate.project_id,
                case when dropped_projectAsonDate.project_id in (select sub_project_id from tbl_sub_project) 
                then (select project_id from tbl_sub_project where sub_project_id = dropped_projectAsonDate.project_id)
                else dropped_projectAsonDate.project_id end as og_project_id,
                COUNT(dropped_projectAsonDate.project_id) as dropped_project_count,
                ROUND(SUM(dropped_projectAsonDate.sanctioned_cost), 2) as sanctioned_cost

                FROM mmt_organisation 
                LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
                
                JOIN
                ( 
                    SELECT tbl_project.organisation_id, 
                    tbl_project.project_id,
                    tbl_project.mode_of_implememtation,
                    ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost         
                    FROM tbl_project
                    INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id           

                    WHERE ( (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy) 
                    AND ( tbl_project.status = 0 AND on_sub_project_available = 0)  )
            
            
            AND is_sagarmala_funded =  @issagarmalafunded


                UNION		

                SELECT tbl_sub_project.sub_organisation_id, 
                tbl_sub_project.sub_project_id,
                tbl_sub_project.sub_mode_of_implememtation,
                ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

                FROM tbl_sub_project
                INNER JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id           

                WHERE ( (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy) 
                AND (tbl_sub_project.sub_status = 0 )  )
        
        AND sub_is_sagarmala_funded =  @issagarmalafunded


                )  AS dropped_projectAsonDate on dropped_projectAsonDate.organisation_id = mmt_organisation.organisation_id

                --WHERE mmt_organisation.organisation_id != 4
                WHERE mmt_organisation.organisation_id = @organisation_ID

                GROUP BY
                
                
                    mmt_organisation.organisation_id, 
                    organisation_name,
                    CASE WHEN dropped_projectAsonDate.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                    dropped_projectAsonDate.project_id) 

        /* Final tables  */

            select * from (
                    select distinct
                    allprojectsubproject.organisation_id, allprojectsubproject.organisation_name, allprojectsubproject.implementation_group as category, allprojectsubproject.og_project_id  , allprojectsubproject.og_project_name,
                    column4.taken_up, column5.dropped_project_count ,column6.completed_project_count, column6.closure_cost as total_cost,column8.ongoing_project_count,column8.sanctioned_cost as estimated_cost
                    from 

                    allprojectsubproject 

                    left join

                    ( select 
                        --distinct organisation_id, organisation_name, og_project_id, implementation_group,count(project_count) 
                        distinct taken_up.organisation_id,  implementation_group,
                    taken_up.og_project_id,
                    count(*) as taken_up
            
                        from taken_up  where taken_up.og_project_id is not null
                        group by organisation_id, organisation_name, og_project_id, implementation_group

                    ) column4 on allprojectsubproject.organisation_id = column4.organisation_id and allprojectsubproject.og_project_id = column4.og_project_id and allprojectsubproject.implementation_group = column4.implementation_group

                    left join 
                    --GO

                    --completed & cost 
                    (
                    select distinct organisation_id,organisation_name,implementation_group,og_project_id, sum(completed_project_count) as completed_project_count,sum(closure_cost) as closure_cost 
                    from completeddate where completeddate.og_project_id is not null group by organisation_id,organisation_name,implementation_group,og_project_id

                    ) column6 on allprojectsubproject.organisation_id = column6.organisation_id and allprojectsubproject.og_project_id = column6.og_project_id and allprojectsubproject.implementation_group = column6.implementation_group


                    left join
                    (
                            select distinct organisation_id,implementation_group,og_project_id, sum(ongoing_project_count) as ongoing_project_count ,sum(sanctioned_cost)  as sanctioned_cost
                            from ongoingprojectcount where ongoingprojectcount.og_project_id is not null group by organisation_id,implementation_group,og_project_id
                    ) column8 on allprojectsubproject.organisation_id = column8.organisation_id and allprojectsubproject.og_project_id = column8.og_project_id and allprojectsubproject.implementation_group = column8.implementation_group

                    left join 

                    (
                    select distinct organisation_id,implementation_group,og_project_id,sum(dropped_project_count) as dropped_project_count from droppedproject where droppedproject.og_project_id is not null
                    group by organisation_id,implementation_group,og_project_id
                    ) column5 on allprojectsubproject.organisation_id = column5.organisation_id and allprojectsubproject.og_project_id = column5.og_project_id and allprojectsubproject.implementation_group = column5.implementation_group



                    where  
                            case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                when @modeofimp = 'EPC' then 'EPC/Others' 
                                else 
                                allprojectsubproject.implementation_group
                                end =  allprojectsubproject.implementation_group 
                                

                    ) P1_0_Abstract 
                        where P1_0_Abstract.taken_up is not null or P1_0_Abstract.dropped_project_count is not null 
                            or P1_0_Abstract.completed_project_count is not null or P1_0_Abstract.total_cost is not null 
                            or P1_0_Abstract.ongoing_project_count is not null or P1_0_Abstract.estimated_cost is not null

                        order by P1_0_Abstract.category, P1_0_Abstract.og_project_id

                    
        END;
        
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
                    item['category'],
                    item['og_project_name'],
                ],
                category: item['category'],
                org_id: item['organisation_id'],
                organisation_name: item['organisation_name'],
                taken_up: item['taken_up'],
                dropped_project_count: item['dropped_project_count'],
                completed_project_count: item['completed_project_count'],
                total_cost: item['total_cost'],
                ongoing_project_count: item['ongoing_project_count'],
                estimated_cost: item['estimated_cost'],
                og_project_id: item['og_project_id'],
            };
        });

        // let columnDefs = [
        //     {
        //         headerName: 'Category',
        //         field: 'category',
        //         width: 150,
        //         rowGroup: true, 
        //         hide: true
        //     },
        //     { headerName: 'Organisation Name', field: 'organisation_name', },
        //     {
        //         headerName: `01-04-2014 to ${formateLastDatePreviousFy}`,
        //         headerClass : "headercenter",
        //         children: [
        //             { 
        //                 headerName: 'Name of the Project', 
        //                 field: 'project_name', 
        //                 width:250
        //             },
        //             { 
        //                 headerName: 'No. of Projects including SubProjects taken up', 
        //                 field: 'taken_up', 
        //                 width:250
        //             },
        //             { 
        //                 headerName: 'No. of Projects including SubProjects dropped', 
        //                 field: 'dropped_project_count', 
        //                 width:250
        //             },
        //             { 
        //                 headerName: 'No. of Projects including SubProjects completed', 
        //                 field: 'completed_project_count', 
        //                 width:250
        //             },
        //             { 
        //                 headerName: 'Total Cost of completed Projecs including SubProjects (In Cr.)', 
        //                 field: 'total_cost', 
        //                 width:250
        //             }
        //         ]
        //     },
        //     { headerName: `No.of. Balance ongoing Projects including SubProjects at the beginning of the year ${formateFirstDateCurrentFy}`, field: 'ongoing_project_count', },
        //     { headerName: 'Total Estimated cost of balance ongoing Projects including SubProjects (In Cr.)', field: 'estimated_cost', },
        //     { headerName: 'Project Id', field: 'og_project_id', hide:true }
        // ];
        
        res.json({ rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
}

// **************************************************** Get Details ****************************************************
async function getDetailsHistoryData(req, res) 
{
    const organisationID = req.params.organisationID;
    const proposalStage = req.params.proposalStage;
    const modOfImp = req.params.modOfImp;
    const columnNo = req.params.columnNo;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;  
    
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("proposalStage", proposalStage);
    request.input("modOfImp", modOfImp);
    request.input("columnNo", columnNo);
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

    let projectHistoryData;

    projectHistoryData = `  SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
        mmt_organisation.organisation_name, 
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name, sub_project_name,  scheme_name,
        ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) AS project_stage_id,
        ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,         
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost, 
        ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id) AS primary_ia_id,
        ISNULL(tbl_sub_project.sub_secondary_ia_id, tbl_project.secondary_ia_id) AS secondary_ia_id,
        mmt_implementing_agency.ia_name AS primary_ia_name, 
        
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS project_intiated_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS prefeasibility_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS dpr_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS chairman_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS ministry_submission_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS da_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS ifw_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS imc_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS response_com_rec_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS sfc_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
        sec_imp_agency.ia_name AS sec_imp_agency

        FROM tbl_project 
        LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                
        LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
            OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
    
        LEFT JOIN 
        (	SELECT ia_id, ia_name from mmt_implementing_agency 
        ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                        
            
        LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
            OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
        
        LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
    `

    if(columnNo == 8 || columnNo == 4)
    {
        projectHistoryData += ` LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }

    if(columnNo == 5)
    {
        projectHistoryData += ` INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }


    // WHERE CONDITION STARTS
    projectHistoryData += `   WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )  `  

    if(isSagarmalaFunded == 'true') {
        projectHistoryData += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    } 

    if(columnNo == 8)
    {
        projectHistoryData += `
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                    OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
                )

            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < '${firstDateCurrentFy}' 
                )         
        `
    }
    if (columnNo == 4) {
        projectHistoryData += `    
            AND (
                    (
                        ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) BETWEEN '2014-04-01' AND '${lastDatePreviousFy}' 
                    )  
                    
                    OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')  
                )   
        `
    }

    if (columnNo == 5) {
        projectHistoryData += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
            AND (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')  
        `
    }

    if (columnNo == 6) {
        projectHistoryData += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
            AND 
            (
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
            )
            AND 
            (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '2014-04-01' AND '${lastDatePreviousFy}'
            )          
        `
    }
   
   
    if (modOfImp == 'PPP+Captive') {
        projectHistoryData += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        projectHistoryData += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }


    projectHistoryData += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;


    try {
        const getHistoryDetails = await request.query(projectHistoryData);

        const response = { getHistoryDetails: getHistoryDetails.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getIwaiDetailsHistoryData(req, res) {
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
        if (columnNo == 4) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
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
            SET @lastDatePreviousFy = CASE 
                                        WHEN MONTH(GETDATE()) >= 4 
                                            THEN DATEFROMPARTS(YEAR(GETDATE()), 3, 31) -- March 31st of the current year
                                        ELSE 
                                            DATEFROMPARTS(YEAR(GETDATE()) - 1, 3, 31) -- March 31st of the previous year
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

            SELECT * FROM (
                    SELECT  distinct         
                            tbl_project.project_id, 
                            tbl_sub_project.sub_project_id, 
                            project_name, sub_project_name, 
                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,        
                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,                
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS Projects_including_Sub_Projects_initiated,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS Preliminary_Feasibility_TEFR_Report_prepared,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS Estimate_DPR_prepared,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS Chairman_Board_Approval,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS Submitted_to_Ministry_for_approval,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS DA_concurrence_obtained,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS IFW_concurrence_obtained,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS Circulated_for_IMC,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS Response_to_Comments_received,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS Appraisal_by_SFC_DIB_EFC_PIB_DIB_PPPAC,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
                            ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost 
            

                            FROM tbl_project 
                            INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
                            LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                        
                            LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
                                OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
            
                            LEFT JOIN 
                            (	SELECT ia_id, ia_name from mmt_implementing_agency 
                            ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                                    OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                                
                    
                            LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
                                OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
                
                            LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
                                OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

                    ---------------------------------------------------------------
                            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                                                OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   


                            WHERE 
                            mmt_organisation.organisation_id = @organisation_ID
                

                    
                                AND (
                                        (
                                            ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) BETWEEN '2014-04-01' AND @lastDatePreviousFy 
                                        )  
                            
                                        OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy)  
                                    )

                                AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded
                                and tbl_project.project_id = @og_projectid AND tbl_sub_project.sub_status = 1
                                AND ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) BETWEEN '2014-04-01' AND @lastDatePreviousFy

                

                
                ) TA
                    WHERE 
                
                        case when @modeofimp = 'PPP' then 'PPP/Captive' 
                            when @modeofimp = 'EPC' then 'EPC/Others' 
                            else 
                                TA.implementation_group
                            end =  TA.implementation_group 
                            
                        order by TA.implementation_group, TA.project_id, TA.sub_project_id,
                            TA.project_name,TA.sub_project_name
        end`;
        }

        if (columnNo == 6) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
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
            SET @lastDatePreviousFy = CASE 
                                        WHEN MONTH(GETDATE()) >= 4 
                                            THEN DATEFROMPARTS(YEAR(GETDATE()), 3, 31) -- March 31st of the current year
                                        ELSE 
                                            DATEFROMPARTS(YEAR(GETDATE()) - 1, 3, 31) -- March 31st of the previous year
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

            select * from (
                SELECT  distinct
                    
                    tbl_project.project_id, tbl_sub_project.sub_project_id, 
                    project_name, sub_project_name, 
                    CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                        in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,             
                    ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,           
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS Projects_including_Sub_Projects_initiated,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS Preliminary_Feasibility_TEFR_Report_prepared,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS Estimate_DPR_prepared,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS Chairman_Board_Approval,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS Submitted_to_Ministry_for_approval,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS DA_concurrence_obtained,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS IFW_concurrence_obtained,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS Circulated_for_IMC,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS Response_to_Comments_received,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS Appraisal_by_SFC_DIB_EFC_PIB_DIB_PPPAC,
                    CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
                    ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost 

                    FROM tbl_project 
                    LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                            
                    LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
                        OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
                
                    LEFT JOIN 
                    (	SELECT ia_id, ia_name from mmt_implementing_agency 
                    ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                            OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                                    
                        
                    LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
                        OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
                    
                    LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
                        OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

            ---------------------------------------------------------------
                    

                    WHERE  mmt_organisation.organisation_id = @organisation_ID

                    AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
                        AND 
                        (
                            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
                        )
                        AND 
                        (
                            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '2014-04-01' AND @lastDatePreviousFy
                        ) 

            ---------------------------------------------------------------------------------------------------

                    AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded
                    and tbl_project.project_id = @og_projectid	

                    ) comp
                        WHERE 
                    
                            case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                when @modeofimp = 'EPC' then 'EPC/Others' 
                                else 
                                    comp.implementation_group
                                end =  comp.implementation_group 

                            ORDER BY  
                    comp.project_id, comp.sub_project_id, 
                    comp.project_name,  comp.sub_project_name 

            end`;
        }

        if (columnNo == 8) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
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
            SET @lastDatePreviousFy = CASE 
                                        WHEN MONTH(GETDATE()) >= 4 
                                            THEN DATEFROMPARTS(YEAR(GETDATE()), 3, 31) -- March 31st of the current year
                                        ELSE 
                                            DATEFROMPARTS(YEAR(GETDATE()) - 1, 3, 31) -- March 31st of the previous year
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

                select * from (
                        SELECT distinct 
                                
                                tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                project_name, sub_project_name, 		
                                CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                    in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group, 
                                ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,    
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS Projects_including_Sub_Projects_initiated,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS Preliminary_Feasibility_TEFR_Report_prepared,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS Estimate_DPR_prepared,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS Chairman_Board_Approval,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS Submitted_to_Ministry_for_approval,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS DA_concurrence_obtained,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS IFW_concurrence_obtained,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS Circulated_for_IMC,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS Response_to_Comments_received,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS Appraisal_by_SFC_DIB_EFC_PIB_DIB_PPPAC,
                                CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
                                ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost 
                                FROM tbl_project 
                                INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id
                                LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                            
                                LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
                                    OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
                
                                LEFT JOIN 
                                (	SELECT ia_id, ia_name from mmt_implementing_agency 
                                ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                                        OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                                    
                        
                                LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
                                    OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
                    
                                LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
                                    OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

                        ---------------------------------------------------------------
                                LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                                                    OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id 

                                WHERE 
                                mmt_organisation.organisation_id = @organisation_ID

                    
                                    AND (
                                            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                                            OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) >  @lastDatePreviousFy
                                        )

                                    AND (
                                            ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < @begindate
                                        ) 

                    
                        ---------------------------------------------------------------------------------------------------

                                AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded
                                and tbl_project.project_id = @og_projectid AND tbl_sub_project.sub_status = 1

                                ) ong
                                WHERE 
                    
                                case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                    when @modeofimp = 'EPC' then 'EPC/Others' 
                                    else 
                                        ong.implementation_group
                                    end =  ong.implementation_group 

                                

                                ORDER BY  
                                    ong.project_id, ong.sub_project_id, 
                                    ong.project_name,  ong.sub_project_name 


                        
            end`;
        }

        if (columnNo == 5) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
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
            SET @lastDatePreviousFy = CASE 
                                        WHEN MONTH(GETDATE()) >= 4 
                                            THEN DATEFROMPARTS(YEAR(GETDATE()), 3, 31) -- March 31st of the current year
                                        ELSE 
                                            DATEFROMPARTS(YEAR(GETDATE()) - 1, 3, 31) -- March 31st of the previous year
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
            select * from (
                    SELECT  distinct 
            
                            tbl_project.project_id, tbl_sub_project.sub_project_id, 
                            project_name, sub_project_name, 
            
                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                            in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group, 
            
                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost, 
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS Projects_including_Sub_Projects_initiated,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS Preliminary_Feasibility_TEFR_Report_prepared,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS Estimate_DPR_prepared,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS Chairman_Board_Approval,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS Submitted_to_Ministry_for_approval,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS DA_concurrence_obtained,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS IFW_concurrence_obtained,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS Circulated_for_IMC,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS Response_to_Comments_received,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS Appraisal_by_SFC_DIB_EFC_PIB_DIB_PPPAC,
                            CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
                            ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost 
                            FROM tbl_project 
                            LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                    
                            LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
                                OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id
        
                            LEFT JOIN 
                            (	SELECT ia_id, ia_name from mmt_implementing_agency 
                            ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                                    OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                            
                
                            LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
                                OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
            
                            LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
                                OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id

                    ---------------------------------------------------------------
                        INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                                                OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  

                        WHERE mmt_organisation.organisation_id = @organisation_ID

                        AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
                                AND (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND @lastDatePreviousFy)  

            
                    ---------------------------------------------------------------------------------------------------

                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded
                            and tbl_project.project_id = @og_projectid
            ) DPP

            WHERE 
            
                    case when @modeofimp = 'PPP' then 'PPP/Captive' 
                        when @modeofimp = 'EPC' then 'EPC/Others' 
                        else 
                            DPP.implementation_group
                        end =  DPP.implementation_group 

                                    ORDER BY  
                            DPP.project_id, DPP.sub_project_id, 
                            DPP.project_name,  DPP.sub_project_name 

            end`;
        }

        // Execute the SQL query
        const result = await request.query(projectHistoryData);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }
    
        let columnDefs = [
            { headerName: 'Project ID',field: 'project_id'},
            {
                headerName: 'Name of',
                headerClass : "headercenter",
                children: [
                    { 
                        headerName: 'Project', 
                        field: 'project_name', 
                        width:250
                    },
                    { 
                        headerName: 'Sub Project', 
                        field: 'sub_project_name', 
                        width:250
                    }
                ]
            },
            { headerName: 'Estimated Cost of Projects including Sub Projects', field: 'estimated_cost', },
            {
                headerName: "Date on Which",
                headerClass : "headercenter",
                children: [
                    {
                        headerName: "Projects including Sub Projects initiated",
                        field: "project_initiated_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_project_initiated_date, params.data.project_initiated_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Preliminary Feasibility/TEFR Report prepared",
                        field: "prefeasibility_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_prefeasibility_actual_date, params.data.prefeasibility_actual_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Estimate / DPR prepared",
                        field: "dpr_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_dpr_actual_date, params.data.dpr_actual_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Chairman / Board Approval",
                        field: "chairman_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_chairman_approval_date, params.data.chairman_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Submitted to Ministry for approval (If required)",
                        field: "ministry_submission_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_ministry_submission_date, params.data.ministry_submission_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "DA concurrence obtained",
                        field: "da_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_da_approval_date, params.data.da_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "IFW concurrence obtained",
                        field: "ifw_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_ifw_approval_date, params.data.ifw_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Circulated for IMC",
                        field: "imc_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_imc_approval_date, params.data.imc_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Response to Comments received",
                        field: "response_com_rec_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_response_com_rec_approval_date, params.data.response_com_rec_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Appraisal by SFC/DIB/EFC/PIB/DIB/PPPAC",
                        field: "sfc_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_sfc_approval_date, params.data.sfc_approval_date) : '';
                        },
                        width: 200
                    },
                    {
                        headerName: "Admn. Approval / Estimate Sanction by Comp. Authority",
                        field: "admin_approval_approval_date", 
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_admin_approval_approval_date, params.data.admin_approval_approval_date) : '';
                        },
                        width: 200
                    }
                ]
            },
            { headerName: 'Sanctioned cost', field: 'sanctioned_cost'}
        ];

    
        res.json({ columnDefs, rowData });
    
    } catch (error) {
        console.error("Error executing SQL query:", error);
        res.status(500).send("Internal Server Error");
    }
}

// **************************************************** Get Grand TotalDetails ****************************************************
async function getGrandTotalHistoryData(req, res) 
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


    // console.log(orgCategoryFilter, "orgCategoryFilter")

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

    let projectHistoryData;

    projectHistoryData = `  SELECT 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
        mmt_organisation.organisation_name, 
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name, sub_project_name,  scheme_name,
        ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) AS project_stage_id,
        ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,         
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost, 
        ISNULL(tbl_sub_project.sub_primary_ia_id, tbl_project.primary_ia_id) AS primary_ia_id,
        ISNULL(tbl_sub_project.sub_secondary_ia_id, tbl_project.secondary_ia_id) AS secondary_ia_id,
        mmt_implementing_agency.ia_name AS primary_ia_name, 
        
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date), 106) AS project_intiated_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date), 106) AS prefeasibility_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date), 106) AS dpr_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date), 106) AS chairman_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date), 106) AS ministry_submission_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date), 106) AS da_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date), 106) AS ifw_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_imc_approval_date, tbl_project.imc_approval_date), 106) AS imc_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date), 106) AS response_com_rec_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date), 106) AS sfc_approval_date,
        CONVERT(VARCHAR,ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date), 106) AS admin_approval_approval_date,
        sec_imp_agency.ia_name AS sec_imp_agency

        FROM tbl_project 
        LEFT JOIN tbl_sub_project on tbl_sub_project.project_id = tbl_project.project_id   
                
        LEFT JOIN mmt_implementing_agency ON mmt_implementing_agency.ia_id = tbl_project.primary_ia_id
            OR mmt_implementing_agency.ia_id = tbl_sub_project.sub_primary_ia_id

        LEFT JOIN 
        (	SELECT ia_id, ia_name from mmt_implementing_agency 
        ) sec_imp_agency ON sec_imp_agency.ia_id = tbl_project.secondary_ia_id
                OR  sec_imp_agency.ia_id = tbl_sub_project.sub_secondary_ia_id
                        
            
        LEFT JOIN mmt_organisation on mmt_organisation.organisation_id = tbl_project.organisation_id
            OR  mmt_organisation.organisation_id = tbl_sub_project.sub_organisation_id
        
        LEFT JOIN mmt_scheme on mmt_scheme.scheme_id = tbl_project.scheme_id
            OR mmt_scheme.scheme_id = tbl_sub_project.sub_scheme_id
    `

    if(columnNo == 8 || columnNo == 4)
    {
        projectHistoryData += ` LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }

    if(columnNo == 5)
    {
        projectHistoryData += ` INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }


    // WHERE CONDITION STARTS
    projectHistoryData += `   WHERE  ` 
    

    if(orgCategoryFilter != 'nofilter')
    {      
        projectHistoryData += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        projectHistoryData += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        projectHistoryData += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
         projectHistoryData += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }




    if(isSagarmalaFunded == 'true') {
        projectHistoryData += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    } 

    if(columnNo == 8)
    {
        projectHistoryData += `
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                    OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
                )

            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < '${firstDateCurrentFy}' 
                )         
        `
    }
    if (columnNo == 4) {
        projectHistoryData += `    
            AND (
                    (
                        ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) BETWEEN '2014-04-01' AND '${lastDatePreviousFy}' 
                    )  
                    
                    OR (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')  
                )   
        `
    }

    if (columnNo == 5) {
        projectHistoryData += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
            AND (tbl_project_drop_request.drop_date BETWEEN '2014-04-01' AND '${lastDatePreviousFy}')  
        `
    }

    if (columnNo == 6) {
        projectHistoryData += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
            AND 
            (
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = 14
            )
            AND 
            (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '2014-04-01' AND '${lastDatePreviousFy}'
            )          
        `
    }


    if (modOfImp == 'PPP+Captive') {
        projectHistoryData += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        projectHistoryData += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }


    projectHistoryData += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;
        // console.log(projectHistoryData, "projectHistoryData")
   
    try {
        const getHistoryDetails = await request.query(projectHistoryData);

        const response = { getHistoryDetails: getHistoryDetails.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { projectHistoryAbstractData, getDetailsHistoryData, getGrandTotalHistoryData, iwaiProjectHistoryAbstractData, getIwaiDetailsHistoryData };
