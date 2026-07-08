
import { pool } from "../../db.js";
import moment from 'moment';
// moment().format();

async function proposalAbstractReportData(req, res) {
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
    console.log(lastDatePreviousFy, firstDateCurrentFy, lastDateCurrentFy)

    // ********************************************* Column 4 *********************************************
    let column4 = `  SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(decadeOnGoingProjects.project_id) AS project_count_decadeOngoing,
        ROUND(SUM(decadeOnGoingProjects.sanctioned_cost), 2) AS sanctioned_cost

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
        
            WHERE   (     (on_sub_project_available = 0  AND project_intiated_date < '${firstDateCurrentFy}' 
                AND (actual_date_of_completion IS NULL OR actual_date_of_completion > '${lastDatePreviousFy}') )
                OR (tbl_project_drop_request.drop_date <= '${lastDatePreviousFy}')         )      
    `

    if (isSagarmalaFunded == 'true') {
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

        WHERE   (    ( (sub_project_intiated_date < '${firstDateCurrentFy}') 
            AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion > '${lastDatePreviousFy}') )
            OR (tbl_project_drop_request.drop_date <= '${lastDatePreviousFy}')  )
    `
    if (isSagarmalaFunded == 'true') {
        column4 += "AND sub_is_sagarmala_funded =  1"
    }

    column4 += ` 
        )  AS decadeOnGoingProjects on decadeOnGoingProjects.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `;

    // ********************************************* Column 5 *********************************************
    let column5 = ` SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(FY_onGoingProject.project_id) AS currentFy_project_count,
        ROUND(SUM(FY_onGoingProject.sanctioned_cost), 2) AS sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
    
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                   
            FROM tbl_project
                
            WHERE   (    (tbl_project.project_intiated_date >= '${firstDateCurrentFy}')
                AND ( on_sub_project_available = 0 )    )
    `

    if (isSagarmalaFunded == 'true') {
        column5 += "AND is_sagarmala_funded =  1"
    }

    column5 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation, 
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

        FROM tbl_sub_project

        WHERE (     (tbl_sub_project.sub_project_intiated_date >= '${firstDateCurrentFy}')      )
       
    `
    if (isSagarmalaFunded == 'true') {
        column5 += "AND sub_is_sagarmala_funded =  1"
    }

    column5 += ` 
        )  AS FY_onGoingProject on FY_onGoingProject.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name           
    `

    // ********************************************* Column 6 *********************************************
    let column6 = `  SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN dropProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        COUNT(dropProject.project_id) AS drop_project_count,
        ROUND(SUM(dropProject.sanctioned_cost), 2) AS sanctioned_cost

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
         
            WHERE   (    (tbl_project_drop_request.drop_date BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}') 
            AND ( tbl_project.status = 0 AND on_sub_project_available = 0)  )
    `

    if (isSagarmalaFunded == 'true') {
        column6 += "AND is_sagarmala_funded =  1"
    }

    column6 += ` 
        UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost
        
        FROM tbl_sub_project
        INNER JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id 

        WHERE (     (tbl_project_drop_request.drop_date BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}') 
        AND (tbl_sub_project.sub_status = 0 )       )
    `
    if (isSagarmalaFunded == 'true') {
        column6 += "AND sub_is_sagarmala_funded =  1"
    }

    column6 += ` 
        )  AS dropProject on dropProject.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name,
            CASE WHEN dropProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name  
    `
    // ********************************************* Column A, B, C *********************************************
    let columnAtoL = `  SELECT 
        organisation_category_name,
        mmt_organisation.organisation_id, organisation_name,
        CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
        FY_onGoingProject.project_stage_id AS project_stage_id,
        COUNT(FY_onGoingProject.project_id) AS project_stagewise_count,
        ROUND(SUM(FY_onGoingProject.sanctioned_cost), 2) AS sanctioned_cost

        FROM mmt_organisation 
        LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
    
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.project_stage_id, 
            ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                
            FROM tbl_project            
            WHERE  (  ( tbl_project.status = 1 AND on_sub_project_available = 0  )  
            AND (actual_date_of_completion is NULL or actual_date_of_completion BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')     
            )
    `

    if (isSagarmalaFunded == 'true') {
        columnAtoL += "AND is_sagarmala_funded =  1"
    }

    columnAtoL += ` UNION		

        SELECT tbl_sub_project.sub_organisation_id, 
        tbl_sub_project.sub_project_id,
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_sub_project.sub_project_stage_id, 
        ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost
         
        FROM tbl_sub_project
        WHERE ( ( tbl_sub_project.sub_status = 1 )
        AND (sub_actual_date_of_completion is NULL or sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')    
       ) 
    `
    if (isSagarmalaFunded == 'true') {
        columnAtoL += "AND sub_is_sagarmala_funded =  1"
    }

    columnAtoL += ` 
        )  AS FY_onGoingProject on FY_onGoingProject.organisation_id = mmt_organisation.organisation_id

        WHERE mmt_organisation.organisation_id != 4

        GROUP BY
            
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            mmt_organisation.organisation_id, 
            organisation_name, project_stage_id,
            CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

        ORDER BY 
            mmt_organisation_category.organisation_category_id, 
            organisation_category_name, 
            organisation_name       
    `

    // ********************************************* Column N *********************************************
    let columnM = `  SELECT 
       organisation_category_name,
       mmt_organisation.organisation_id, organisation_name,
       CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
       COUNT(decadeOnGoingProjects.project_id) AS completed_project_fy,
       ROUND(SUM(decadeOnGoingProjects.sanctioned_cost), 2) AS sanctioned_cost
   
       FROM mmt_organisation 
       LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
     
        LEFT JOIN
        ( 
            SELECT tbl_project.organisation_id, 
            tbl_project.project_id,
            tbl_project.mode_of_implememtation,
            tbl_project.sanctioned_cost           
            FROM tbl_project
            
            WHERE   (    (tbl_project.status = 1 AND on_sub_project_available = 0)
            -- AND (tbl_project.project_stage_id = 14 )
            AND (actual_date_of_completion BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')      )
        `

    if (isSagarmalaFunded == 'true') {
        columnM += "AND is_sagarmala_funded =  1"
    }

    columnM += ` 
            UNION		
    
            SELECT tbl_sub_project.sub_organisation_id, 
            tbl_sub_project.sub_project_id,
            tbl_sub_project.sub_mode_of_implememtation,
            tbl_sub_project.sub_sanctioned_cost           
            FROM tbl_sub_project
    
            WHERE    (   (tbl_sub_project.sub_status = 1) 
            -- AND (tbl_sub_project.sub_project_stage_id = 14 )
            AND (sub_actual_date_of_completion BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')  )
    
        `
    if (isSagarmalaFunded == 'true') {
        columnM += "AND sub_is_sagarmala_funded =  1"
    }

    columnM += ` 
            )  AS decadeOnGoingProjects on decadeOnGoingProjects.organisation_id = mmt_organisation.organisation_id
    
            WHERE mmt_organisation.organisation_id != 4
    
            GROUP BY
                
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                mmt_organisation.organisation_id, 
                organisation_name,
                CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END
    
            ORDER BY 
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                organisation_name  
        `;

    // ******************************************* Column O  no restriction for project initiation date*******************************************
    let columnO = `  SELECT 
            organisation_category_name,
            mmt_organisation.organisation_id, organisation_name,
            CASE WHEN santionedCostColumn.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
            COUNT(santionedCostColumn.project_id) AS project_count,
            ROUND(SUM(santionedCostColumn.sanctioned_cost), 2) AS sanctioned_cost

            FROM mmt_organisation 
            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

            LEFT JOIN
            ( 
                SELECT tbl_project.organisation_id, 
                tbl_project.project_id,
                tbl_project.mode_of_implememtation,
                tbl_project.sanctioned_cost           
                FROM tbl_project
            
                WHERE   (    (tbl_project.status = 1 AND on_sub_project_available = 0) 
              
                AND (
                    tbl_project.project_stage_id = 14 OR 
                    tbl_project.project_stage_id = 11 OR tbl_project.project_stage_id = 3 
                ) 
                AND (actual_date_of_completion IS NULL OR actual_date_of_completion BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')     )

        `

    if (isSagarmalaFunded == 'true') {
        columnO += "AND is_sagarmala_funded =  1"
    }

    columnO += ` 
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
        columnO += "AND sub_is_sagarmala_funded =  1"
    }

    columnO += ` 
            )  AS santionedCostColumn on santionedCostColumn.organisation_id = mmt_organisation.organisation_id

            WHERE mmt_organisation.organisation_id != 4

            GROUP BY
                
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                mmt_organisation.organisation_id, 
                organisation_name,
                CASE WHEN santionedCostColumn.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END

            ORDER BY 
                mmt_organisation_category.organisation_category_id, 
                organisation_category_name, 
                organisation_name  
        `;

    try {
        // COLUMN 4 
        const column4ProjectQuery = await request.query(column4);

        // COLUMN 5        
        const column5ProjectQuery = await request.query(column5);

        // COLUMN 6
        const column6ProjectQuery = await request.query(column6);

        // COLUMN 78  
        // const column78ProjectQuery =  await request.query(column78_a);

        // COLUMN A to I - Not changed       
        const columnAtoLquery = await request.query(columnAtoL);
        const columnMquery = await request.query(columnM);

        //  COLUMN 7 - with sub project
        const columnOquery = await request.query(columnO);

        // const columnMQuery = await request.query(columnM);
        const response = {
            column4ProjectQuery: column4ProjectQuery.recordset,
            column5ProjectQuery: column5ProjectQuery.recordset,
            column6ProjectQuery: column6ProjectQuery.recordset,
            // column78ProjectQuery: column78ProjectQuery.recordset,   

            columnAtoLquery: columnAtoLquery.recordset,
            columnMquery: columnMquery.recordset,
            columnOquery: columnOquery.recordset,
        }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaiProposalAbstractReportData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const organisation_categoryID = req.params.orgCate;
        const organisation_ID = req.params.organisation;
        const category = req.params.category;
        let isSagarmalaFunded = req.params.isSagarmalaFunded;
        let og_projectid = req.params.projectId;

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
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            set @organisation_ID = ${organisation_ID};
            set @organisation_categoryID = ${organisation_categoryID};
            SET @modeofimp = '${category}';
            SET @og_projectid = '${og_projectid}';
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
                                            select 
                                            
                                            organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN AllProjectSubProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            AllProjectSubProject.project_id,
                                            AllProjectSubProject.project_name,
                                            case when AllProjectSubProject.project_id in (select sub_project_id from tbl_sub_project)
                                            then (select project_id from tbl_sub_project where sub_project_id = AllProjectSubProject.project_id)
                                            else AllProjectSubProject.project_id end as og_project_id,

                                            case when AllProjectSubProject.project_id in (select sub_project_id from tbl_sub_project)
                                            then (select project_name from tbl_project where project_id in ( select project_id from tbl_sub_project where sub_project_id = AllProjectSubProject.project_id))
                                            else (select Project_name from tbl_project where project_id in( AllProjectSubProject.project_id)) end as og_project_name							
                                            
                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project.project_name
                                                FROM  tbl_project 
                                                INNER JOIN tbl_project_date ON tbl_project_date.project_id = tbl_project.project_id

                                                WHERE   						
                                                


                                                    is_sagarmala_funded =  @issagarmalafunded

                                                GROUP BY organisation_id, tbl_project.project_id, 
                                            mode_of_implememtation,project_name
                    
                                            UNION

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_sub_project.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            tbl_sub_project.sub_project_name
                                            FROM  tbl_sub_project 
                                            INNER JOIN tbl_project_date ON tbl_project_date.sub_project_id= tbl_sub_project.sub_project_id

                                            WHERE 


                                            sub_is_sagarmala_funded =  @issagarmalafunded

                                            GROUP BY sub_organisation_id, tbl_sub_project.sub_project_id, 
                                                sub_mode_of_implememtation,sub_project_name

                                            )  AS AllProjectSubProject ON AllProjectSubProject.organisation_id = mmt_organisation.organisation_id
                    
                                            WHERE mmt_organisation.organisation_id = @organisation_ID
                                            
                                            GROUP BY
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                project_name,
                                                CASE WHEN AllProjectSubProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                AllProjectSubProject.project_id
                                            
            ),


            BalanceOngoingProject as (
                                    SELECT 
                                            organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            decadeOnGoingProjects.project_id,
                                            case when decadeOnGoingProjects.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = decadeOnGoingProjects.project_id)
                                            else decadeOnGoingProjects.project_id end as og_project_id, 								
                                            ROUND(SUM(decadeOnGoingProjects.sanctioned_cost), 2) AS Estimated_cost

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
                    
                                                WHERE   (     (on_sub_project_available = 0  AND project_intiated_date < @begindate 
                                                    AND (actual_date_of_completion IS NULL OR actual_date_of_completion > @lastDatePreviousFy) )  )
                                                    AND tbl_project.status = 1
            
                                            AND is_sagarmala_funded =  @issagarmalafunded

                                            UNION		

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_sub_project.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost
                    
                                            FROM tbl_sub_project
                                            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  

                                            WHERE   (    ( (sub_project_intiated_date < @begindate) 
                                                AND (sub_actual_date_of_completion IS NULL OR sub_actual_date_of_completion > @lastDatePreviousFy) ) )
                        
                                                AND sub_is_sagarmala_funded =  @issagarmalafunded
                                                and tbl_sub_project.sub_status = 1


                                            )  AS decadeOnGoingProjects on decadeOnGoingProjects.organisation_id = mmt_organisation.organisation_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID

                                            GROUP BY
                        
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN decadeOnGoingProjects.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                decadeOnGoingProjects.project_id

                ),

                ProjectTakenUp as (

                                        SELECT 
                                                organisation_category_name,
                                                mmt_organisation.organisation_id, organisation_name,
                                                CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                                FY_onGoingProject.project_id,
                                                case when FY_onGoingProject.project_id in (select sub_project_id from tbl_sub_project) 
                                                then (select project_id from tbl_sub_project where sub_project_id = FY_onGoingProject.project_id)
                                                else FY_onGoingProject.project_id end as og_project_id,
                                                ROUND(SUM(FY_onGoingProject.sanctioned_cost), 2) AS sanctioned_cost

                                                FROM mmt_organisation 
                                                LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
                
                                                JOIN
                                                ( 
                                                    SELECT tbl_project.organisation_id, 
                                                    tbl_project.project_id,
                                                    tbl_project.mode_of_implememtation,
                                                    ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                            
                                                    FROM tbl_project
                            
                                                    WHERE   (    (tbl_project.project_intiated_date >= @begindate))
            
                                        AND is_sagarmala_funded =  @issagarmalafunded

                                                UNION		

                                                SELECT tbl_sub_project.sub_organisation_id, 
                                                tbl_sub_project.sub_project_id,
                                                tbl_sub_project.sub_mode_of_implememtation, 
                                                ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost

                                                FROM tbl_sub_project

                                                WHERE (     (tbl_sub_project.sub_project_intiated_date >= @begindate)      )
                
                
                                            AND sub_is_sagarmala_funded =  @issagarmalafunded

                                                )  AS FY_onGoingProject on FY_onGoingProject.organisation_id = mmt_organisation.organisation_id

                                                WHERE mmt_organisation.organisation_id = @organisation_ID

                                                GROUP BY
                        
                                                    mmt_organisation_category.organisation_category_id, 
                                                    organisation_category_name, 
                                                    mmt_organisation.organisation_id, 
                                                    organisation_name,
                                                    CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                    FY_onGoingProject.project_id

                

                ),
                ProjectsDropped as (
                                            SELECT 
                                            organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN dropProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            dropProject.project_id,
                                            case when dropProject.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = dropProject.project_id)
                                            else dropProject.project_id end as og_project_id,
                                            ROUND(SUM(dropProject.sanctioned_cost), 2) AS sanctioned_cost

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
                    
                                                WHERE   (    (tbl_project_drop_request.drop_date BETWEEN @begindate AND @enddate) 
                                                AND ( tbl_project.status = 0 AND on_sub_project_available = 0)  )
                

                                        AND is_sagarmala_funded =  @issagarmalafunded
            

                                            UNION		

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_sub_project.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost
                    
                                            FROM tbl_sub_project
                                            INNER JOIN tbl_project_drop_request on tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id 

                                            WHERE (     (tbl_project_drop_request.drop_date BETWEEN @begindate AND @enddate) 
                                            AND (tbl_sub_project.sub_status = 0 )       )
                    
                                            AND isnull(sub_is_sagarmala_funded,0) =  @issagarmalafunded

                                            )  AS dropProject on dropProject.organisation_id = mmt_organisation.organisation_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID

                                            GROUP BY
                        
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN dropProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                dropProject.project_id
                ),
                        ColumnAtoM as (			
                                    SELECT 
                                        organisation_id,organisation_name, og_project_id, implementation_group,stage_name,
                
                                        isnull([0],0) as "ProjectInitiated_A",
                                        isnull([1],0) as "PreFeasibility_B",
                                        isnull([2],0) as "DPR_C",
                                        isnull([3],0) as "ChairmanBoardApproval_D",
                                        isnull([5],0) as "SubmittedtoMinistryforapproval_E",
                                        isnull([6],0) as "DAConcurrence_F",
                                        isnull([7],0) as "IFWConcurrence_G",
                                        isnull([8],0) as "CiruculatedforImc_H",
                                        isnull([9],0) as "ResponsetoCommentsreceived_I",
                                        isnull([10],0) as "ApprovedRecommendedbyDIB_SFC_EFC_J",
                                        isnull([11],0) as "AdmnApprovalEstimateSanctionbyCompAuthority_L",	
                                        isnull([14],0) as "Completed_M"
                                            
                                        FROM 
                                        (

                                            SELECT 
                                            organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                
                                            FY_onGoingProject.project_id,
                                            case when FY_onGoingProject.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = FY_onGoingProject.project_id)
                                            else FY_onGoingProject.project_id end as og_project_id,

                                            FY_onGoingProject.project_stage_id AS project_stage_id,
                                            tbl_project_stage.stage_name
                                            

                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         
                
                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project.project_stage_id, 
                                                ISNULL(tbl_project.sanctioned_cost, tbl_project.estimated_cost) AS sanctioned_cost
                            
                                                FROM tbl_project            
                                                WHERE  (  ( tbl_project.status = 1 AND on_sub_project_available = 0  )  
                                                AND (actual_date_of_completion is NULL or actual_date_of_completion BETWEEN @begindate and @enddate)     
                                                )
            
                                            AND is_sagarmala_funded =  @issagarmalafunded
            
                                        UNION		

                                            SELECT tbl_sub_project.sub_organisation_id, 
                                            tbl_sub_project.sub_project_id,
                                            tbl_sub_project.sub_mode_of_implememtation,
                                            tbl_sub_project.sub_project_stage_id, 
                                            ISNULL(tbl_sub_project.sub_sanctioned_cost, tbl_sub_project.sub_estimated_cost) AS sub_sanctioned_cost
                    
                                            FROM tbl_sub_project
                                            WHERE ( ( tbl_sub_project.sub_status = 1 )
                                            AND (sub_actual_date_of_completion is NULL or sub_actual_date_of_completion BETWEEN @begindate and @enddate)   ) 
            
                                        AND sub_is_sagarmala_funded =  @issagarmalafunded

                                            )  AS FY_onGoingProject on FY_onGoingProject.organisation_id = mmt_organisation.organisation_id

                                            join tbl_project_stage on FY_onGoingProject.project_stage_id = tbl_project_stage.stage_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID
                                            
                                            GROUP BY
                        
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name, project_stage_id,
                                                CASE WHEN FY_onGoingProject.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                FY_onGoingProject.project_id,
                                                tbl_project_stage.stage_name

                                                ) AS SourceTable
                                            PIVOT
                                                (
                                                COUNT(project_stage_id)
                                                FOR project_stage_id IN ([0],[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13],[14])
                                                ) 
                                                AS PivotTable
                                                ),
                    ColumnNO as(	

                                            SELECT 
                                            organisation_category_name,
                                            mmt_organisation.organisation_id, organisation_name,
                                            CASE WHEN santionedCostColumn.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            santionedCostColumn.project_id,
                                            case when santionedCostColumn.project_id in (select sub_project_id from tbl_sub_project) 
                                            then (select project_id from tbl_sub_project where sub_project_id = santionedCostColumn.project_id)
                                            else santionedCostColumn.project_id end as og_project_id,
                                            ROUND(SUM(santionedCostColumn.sanctioned_cost), 2) AS sanctioned_cost

                                            FROM mmt_organisation 
                                            LEFT JOIN mmt_organisation_category ON mmt_organisation_category.organisation_category_id = mmt_organisation.organisation_category_id         

                                            JOIN
                                            ( 
                                                SELECT tbl_project.organisation_id, 
                                                tbl_project.project_id,
                                                tbl_project.mode_of_implememtation,
                                                tbl_project.sanctioned_cost           
                                                FROM tbl_project
                        
                                                WHERE   (    (tbl_project.status = 1 AND on_sub_project_available = 0) 
                        
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


                                            )  AS santionedCostColumn on santionedCostColumn.organisation_id = mmt_organisation.organisation_id

                                            WHERE mmt_organisation.organisation_id = @organisation_ID

                                            GROUP BY
                            
                                                mmt_organisation_category.organisation_category_id, 
                                                organisation_category_name, 
                                                mmt_organisation.organisation_id, 
                                                organisation_name,
                                                CASE WHEN santionedCostColumn.mode_of_implememtation in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END,
                                                santionedCostColumn.project_id
                )
                
                
                
            ----------------------------------------------------------------------------------
                
                --select distinct * from allprojectsubproject
                
                    select * from (
                                    select distinct allprojectsubproject.organisation_id, allprojectsubproject.organisation_name,
                                    allprojectsubproject.implementation_group as Category,
                                    allprojectsubproject.og_project_id, 
                                    allprojectsubproject.og_project_name,
                                    BalOnGoPro.NoofBalOnGoPro,
                                    NoProjectTakenUp.taken_upcount as NoofProjectsTakenUp, 
                                    NoProjectsDropped.droppedcount as NoofProjectsDropped,  
                                    case
							when cast(round( isnull(BalOnGoPro.NoofBalOnGoPro,0) + (isnull(NoProjectTakenUp.taken_upcount,0)), 2) as int) = 0
							then NULL 
							else
								case
								when cast(round( isnull(BalOnGoPro.NoofBalOnGoPro,0) + (isnull(NoProjectTakenUp.taken_upcount,0)), 2) as int) < 0
								then 0
								else cast(round( isnull(BalOnGoPro.NoofBalOnGoPro,0) + (isnull(NoProjectTakenUp.taken_upcount,0)), 2) as int)
								end
							end
							as TotalNoofProjectsOnDateincludeSubProject, 
						case 
							when (isnull(BalOnGoPro.Estimated_cost_bal,0) + isnull(NoProjectTakenUp.estimated_cost_takenup,0) - isnull(NoProjectsDropped.estimated_cost_dropped,0)) = 0
							then NULL 
							else 
							(isnull(BalOnGoPro.Estimated_cost_bal,0) + isnull(NoProjectTakenUp.estimated_cost_takenup,0) - isnull(NoProjectsDropped.estimated_cost_dropped,0)) 
							end as TotalEstimatedCost,columnsAtoM.columnA as Projects_including_Subprojects_initiated, columnsAtoM.ColumnB as Preliminary_Feasibility_Report, 
                                    columnsAtoM.ColumnC as Estimate_DPR_prepared, columnsAtoM.ColumnD as Chairman_Board_Approval, 
                                    columnsAtoM.ColumnE as Submitted_Ministry_for_approval, columnsAtoM.ColumnF as DA_concurrence_obtained, 
                                    columnsAtoM.ColumnG as IFW_concurrence_obtained,
                                    columnsAtoM.ColumnH as Circulated_for_IMC, columnsAtoM.ColumnI AS Response_to_Comments_received, 
                                    columnsAtoM.ColumnJ AS Appraisal_by_SFC, columnsAtoM.ColumnL AS Admn_Approval_Estimate, 
                                    columnsAtoM.ColumnM AS Completed_Current_Fy, columnsNO.columnN as TotalNoProjApprovalDone, 
                                    columnsNO.columnO as SanctionedCost
                                    from 
                                    allprojectsubproject 
                
                                    left join 

                                    (select distinct organisation_id, organisation_name, implementation_group , og_project_id ,count(*) as NoofBalOnGoPro, 
                                    ROUND(SUM(BalanceOngoingProject.Estimated_cost), 2) AS Estimated_cost_bal 
                                    from BalanceOngoingProject
                                    group by  organisation_id, organisation_name, implementation_group,og_project_id) BalOnGoPro

                                    on BalOnGoPro.organisation_id = allprojectsubproject.organisation_id and BalOnGoPro.og_project_id = allprojectsubproject.og_project_id and BalOnGoPro.implementation_group = allprojectsubproject.implementation_group

                                    left join 

                                    (select distinct organisation_id, organisation_name, implementation_group , og_project_id , count(*) as taken_upcount
                                    , ROUND(SUM(ProjectTakenUp.sanctioned_cost), 2) AS estimated_cost_takenup 
                                    from ProjectTakenUp
                                    group by  organisation_id, organisation_name, implementation_group, og_project_id) NoProjectTakenUp

                                    on allprojectsubproject.organisation_id = NoProjectTakenUp.organisation_id and allprojectsubproject.implementation_group = NoProjectTakenUp.implementation_group and allprojectsubproject.og_project_id = NoProjectTakenUp.og_project_id

                                    left join 

                                    (select distinct organisation_id, organisation_name, implementation_group , og_project_id , count(*) as droppedcount,
                                    ROUND(SUM(ProjectsDropped.sanctioned_cost), 2) AS estimated_cost_dropped 
                                    from ProjectsDropped
                                    group by  organisation_id, organisation_name, implementation_group,og_project_id) NoProjectsDropped

                                    on allprojectsubproject.organisation_id = NoProjectsDropped.organisation_id and allprojectsubproject.implementation_group = NoProjectsDropped.implementation_group and allprojectsubproject.og_project_id = NoProjectsDropped.og_project_id

                                    left join 

                                    (select distinct organisation_id, organisation_name, implementation_group , og_project_id , 							
                                                                                ROUND(SUM(isnull(ProjectInitiated_A,0)), 2) AS columnA,
                                                                                ROUND(SUM(isnull(PreFeasibility_B,0)), 2) AS ColumnB,
                                                                                ROUND(SUM(isnull(DPR_C,0)), 2) AS ColumnC,
                                                                                ROUND(SUM(isnull(ChairmanBoardApproval_D,0)), 2) AS ColumnD,
                                                                                ROUND(SUM(isnull(SubmittedtoMinistryforapproval_E,0)), 2) AS ColumnE,
                                                                                ROUND(SUM(isnull(DAConcurrence_F,0)), 2) AS columnF,
                                                                                ROUND(SUM(isnull(IFWConcurrence_G,0)), 2) AS columnG,
                                                                                ROUND(SUM(isnull(CiruculatedforImc_H,0)), 2) AS columnH,
                                                                                ROUND(SUM(isnull(ResponsetoCommentsreceived_I,0)), 2) AS columnI,
                                                                                ROUND(SUM(isnull(ApprovedRecommendedbyDIB_SFC_EFC_J,0)), 2) AS columnJ,
                                                                                ROUND(SUM(isnull(AdmnApprovalEstimateSanctionbyCompAuthority_L,0)), 2) AS columnL,
                                                                                ROUND(SUM(isnull(Completed_M,0)), 2) AS columnM						
                                                                                from ColumnAtoM
                                                        group by  organisation_id, organisation_name, implementation_group, og_project_id ) columnsAtoM

                                    on allprojectsubproject.organisation_id = columnsAtoM.organisation_id and allprojectsubproject.implementation_group = columnsAtoM.implementation_group and allprojectsubproject.og_project_id = columnsAtoM.og_project_id

                                    left join 

                                    (select distinct organisation_id, organisation_name, implementation_group , og_project_id ,count(*) as columnN, ROUND(SUM(ColumnNO.sanctioned_cost), 2) AS columnO 
                                    from ColumnNO
                                    group by  organisation_id, organisation_name, implementation_group,og_project_id) columnsNO

                                    on allprojectsubproject.organisation_id = columnsNO.organisation_id and allprojectsubproject.implementation_group = columnsNO.implementation_group and allprojectsubproject.og_project_id = columnsNO.og_project_id

                                    left join 
                                    (
                                    select mmt_organisation.organisation_id,mmt_organisation.organisation_name, tbl_project.project_name,tbl_project.project_id 
                                    from mmt_organisation  join tbl_project on mmt_organisation.organisation_id =  tbl_project.organisation_id 
                                    -- for Organisation category 
                                    where organisation_category_id = @organisation_categoryID 

                                    ) e on e.organisation_id = allprojectsubproject.organisation_id  and e.project_id = allprojectsubproject.og_project_id

                                    where  
                                        case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                            when @modeofimp = 'EPC' then 'EPC/Others' 
                                            else 
                                            allprojectsubproject.implementation_group
                                            end =  allprojectsubproject.implementation_group 
                                            

                            ) P1_1_Abstract 
                            where P1_1_Abstract.NoofBalOnGoPro is not null or P1_1_Abstract.NoofProjectsTakenUp is not null 
                                or P1_1_Abstract.NoofProjectsDropped is not null or P1_1_Abstract.TotalNoofProjectsOnDateincludeSubProject is not null 
                                or P1_1_Abstract.TotalEstimatedCost is not null or P1_1_Abstract.Projects_including_Subprojects_initiated is not null 
                                or P1_1_Abstract.Preliminary_Feasibility_Report is not null or P1_1_Abstract.Estimate_DPR_prepared is not null
                                or P1_1_Abstract.Chairman_Board_Approval is not null or P1_1_Abstract.Submitted_Ministry_for_approval is not null 
                                or P1_1_Abstract.DA_concurrence_obtained is not null or P1_1_Abstract.IFW_concurrence_obtained is not null
                                or P1_1_Abstract.Circulated_for_IMC is not null or P1_1_Abstract.Response_to_Comments_received is not null
                                or P1_1_Abstract.Appraisal_by_SFC is not null or P1_1_Abstract.Admn_Approval_Estimate is not null
                                or P1_1_Abstract.Completed_Current_Fy is not null 
                                
                            order by P1_1_Abstract.Category, P1_1_Abstract.og_project_id
                    
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
                    item['Category'],
                    item['og_project_name'],
                ],
                category: item['Category'],
                org_id: item['organisation_id'],
                organisation_name: item['organisation_name'],
                column4: item['NoofBalOnGoPro'],
                column5: item['NoofProjectsTakenUp'],
                column6: item['NoofProjectsDropped'],
                column7: item['TotalNoofProjectsOnDateincludeSubProject'],
                column8: item['TotalEstimatedCost'],
                columnA: item['Projects_including_Subprojects_initiated'],
                columnB: item['Preliminary_Feasibility_Report'],
                columnC: item['Estimate_DPR_prepared'],
                columnD: item['Chairman_Board_Approval'],
                columnE: item['Submitted_Ministry_for_approval'],
                columnF: item['DA_concurrence_obtained'],
                columnG: item['IFW_concurrence_obtained'],
                columnH: item['Circulated_for_IMC'],
                columnI: item['Response_to_Comments_received'],
                columnJ: item['Appraisal_by_SFC'],
                columnL: item['Admn_Approval_Estimate'],
                columnM: item['Completed_Current_Fy'],
                columnN: item['TotalNoProjApprovalDone'],
                columnO: item['SanctionedCost'],
                og_project_id: item['og_project_id'],
            };
        });

        res.json({ rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    } 
};

// **************************************************** Get Details ****************************************************
async function getDetailsProposalCol4(req, res) {
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

    let proposalCol4;

    proposalCol4 = `  SELECT 
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

    if (columnNo == 4) {
        proposalCol4 += ` LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }

    if (columnNo == 6) {
        proposalCol4 += ` INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }


    // WHERE CONDITION STARTS
    proposalCol4 += `   WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID )  `

    if (isSagarmalaFunded == 'true') {
        proposalCol4 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (columnNo == 4) {
        proposalCol4 += `
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                    OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
                )

            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < '${firstDateCurrentFy}' 
                )         
        `
    }
    if (columnNo == 5) {
        proposalCol4 += `-- AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )    
            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) >= '${firstDateCurrentFy}' 
                )     
        `
    }

    if (columnNo == 6) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
            AND (tbl_project_drop_request.drop_date BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')  
        `
    }

    if (columnNo == 7) {
        proposalCol4 += ` AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
            )
        `
    }

    if (columnNo == 19) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
            AND (ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')
        `
    }

    if (columnNo == 20) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )            
            AND	(
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 14
                OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 11
                OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 3
            )
            AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
            )
        `
    }
    console.log(proposalCol4)

    if (modOfImp == 'PPP+Captive') {
        proposalCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        proposalCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    proposalCol4 += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;

    try {
        const getProposalDetailsCol4 = await request.query(proposalCol4);

        const response = { getProposalDetailsCol4: getProposalDetailsCol4.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function iwaigetDetailsProposal(req, res) {
    try {
        const organisation_ID = req.params.organisationID;
        // const  = req.params.proposalStage;
        const modOfImp = req.params.modOfImp;
        const columnNo = req.params.columnNo;
        let isSagarmalafunded = req.params.isSagarmalaFunded;
        const proposalStage = req.params.stageId;  
        const projectId = req.params.projectId;  
        
        if(isSagarmalafunded == 'true'){
            isSagarmalafunded = 1;
        } else {
            isSagarmalafunded = 0 ;
        }


        const conn = await pool;
        const request = conn.request();
        // request.input("organisation_ID", organisation_ID);
        // request.input("proposalStage", proposalStage);
        // request.input("modOfImp", modOfImp);
        // request.input("isSagarmalafunded", isSagarmalafunded);
        // request.input("stageId", stageId);
        // request.input("organisation_categoryID", 3);


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
            projectHistoryData = `DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            set @organisation_ID = ${organisation_ID};
            set @organisation_categoryID = 3 ;
            SET @modeofimp = '${modOfImp}';
            SET @og_projectid = '${projectId}';
            SET @issagarmalafunded = ${isSagarmalafunded};

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
                            SELECT * FROM (
                                                SELECT distinct
                                            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                            mmt_organisation.organisation_name, 
                                            tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                            project_name, sub_project_name, 								
                                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                            in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) AS project_stage_id,
                                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,         
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
                                                    ---------------------------------------------------------------------------------------------
                                            LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                                                                OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  
                    
                                            WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) =  @organisation_ID) 

                                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded 

                                            and

                                            (ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                                                        OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > @lastDatePreviousFy)

                                            and

                                            ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < @begindate
                    

                                            and tbl_project.project_id = @og_projectid and tbl_sub_project.sub_status = 1
                                ) NoofBalOnGoPro
                                    WHERE 
                    
                                        case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                            when @modeofimp = 'EPC' then 'EPC/Others' 
                                            else 
                                                NoofBalOnGoPro.implementation_group
                                            end =  NoofBalOnGoPro.implementation_group 
                                
                                        order by NoofBalOnGoPro.implementation_group, NoofBalOnGoPro.project_id, NoofBalOnGoPro.sub_project_id,
                                            NoofBalOnGoPro.project_name,NoofBalOnGoPro.sub_project_name
                    END;`;
        }

        if (columnNo == 5) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 


            set @organisation_categoryID = 3;
            set @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalafunded};
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

                    BEGIN
                            SELECT * FROM (
                                                SELECT distinct
                                            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                            mmt_organisation.organisation_name, 
                                            tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                            project_name, sub_project_name,
                                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                            in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,   
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
                                                    ---------------------------------------------------------------------------------------------
                                            
                    
                                            WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) =  @organisation_ID) 

                                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded 

                                            
                                            AND (
                                                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) >= @begindate 
                                                )     
                    

                                            and tbl_project.project_id = @og_projectid
                                ) NoofProjectsTakenUp
                                WHERE 
                    
                                    case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                        when @modeofimp = 'EPC' then 'EPC/Others' 
                                        else 
                                            NoofProjectsTakenUp.implementation_group
                                        end =  NoofProjectsTakenUp.implementation_group 
                                
                                    order by NoofProjectsTakenUp.implementation_group, NoofProjectsTakenUp.project_id, NoofProjectsTakenUp.sub_project_id,
                                        NoofProjectsTakenUp.project_name,NoofProjectsTakenUp.sub_project_name
                    END;`;
        }

        if (columnNo == 6) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 


            set @organisation_categoryID = 3;
            set @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalafunded};
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

                    BEGIN
                            SELECT * FROM (
                                                SELECT distinct
                                            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                            mmt_organisation.organisation_name, 
                                            tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                            project_name, sub_project_name, 
                                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                            in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,
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
                                                    ---------------------------------------------------------------------------------------------
                                            INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                                                OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id  
                                                    ---------------------------------------------------------------------------------------------
                                            WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) =  @organisation_ID) 

                                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded 

                                                    ---------------------------------------------------------------------------------------------
                                            
                                            AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
                                                AND (tbl_project_drop_request.drop_date BETWEEN @begindate AND @enddate) 

                                            and tbl_project.project_id = @og_projectid
                                ) NoofProjectsDropped
                                WHERE 
                    
                                    case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                        when @modeofimp = 'EPC' then 'EPC/Others' 
                                        else 
                                            NoofProjectsDropped.implementation_group
                                        end =  NoofProjectsDropped.implementation_group 
                                
                                    order by NoofProjectsDropped.implementation_group, NoofProjectsDropped.project_id, NoofProjectsDropped.sub_project_id,
                                        NoofProjectsDropped.project_name,NoofProjectsDropped.sub_project_name
                    END;`;
        }

        if (columnNo == 7) {
            projectHistoryData = `
            DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 


            set @organisation_categoryID = 3;
            set @organisation_ID = ${organisation_ID};
            SET @issagarmalafunded = ${isSagarmalafunded};
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

                    BEGIN
                            SELECT * FROM (
                                                SELECT distinct
                                            ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                            mmt_organisation.organisation_name, 
                                            tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                            project_name, sub_project_name, 
                                            CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                            in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,								
                                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,       
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
                                                    ---------------------------------------------------------------------------------------------
                                            
                                                    ---------------------------------------------------------------------------------------------
                                            WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) =  @organisation_ID) 

                                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded 

                                                    ---------------------------------------------------------------------------------------------
                                            
                                            AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
                                            AND (
                                                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                                                    OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > @lastDatePreviousFy
                                                )
                                            --AND (
                                            --		ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) >= @begindate 
                                            --	) 

                                            and tbl_project.project_id = @og_projectid
                                ) NoofProjectsDropped
                                WHERE 
                    
                                    case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                        when @modeofimp = 'EPC' then 'EPC/Others' 
                                        else 
                                            NoofProjectsDropped.implementation_group
                                        end =  NoofProjectsDropped.implementation_group 
                                
                                    order by NoofProjectsDropped.implementation_group, NoofProjectsDropped.project_id, NoofProjectsDropped.sub_project_id,
                                        NoofProjectsDropped.project_name,NoofProjectsDropped.sub_project_name
                    END;`;
        }

        const validColumns = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M']);

        if (validColumns.has(columnNo)) {
            projectHistoryData = `DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int, @proposalStage int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            set @organisation_ID = ${organisation_ID};
            set @organisation_categoryID = 3 ;
            SET @modeofimp = '${modOfImp}';
            SET @og_projectid = '${projectId}';
            SET @issagarmalafunded = ${isSagarmalafunded};
            SET @proposalStage = ${proposalStage};
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
                        SELECT * FROM (
                                        SELECT DISTINCT
                                        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                        mmt_organisation.organisation_name, 
                                        tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                        project_name, sub_project_name,
                                        
                                        CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                                                in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,
                                        ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) AS project_stage_id,
                                        ISNULL((select sub_stage_name from tbl_project_sub_stage where sub_stage_id in (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id))),
                                        (select stage_name from tbl_project_stage where stage_id in (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)))) as project_stage_name,		
                                        ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,         	
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
                    
                                            WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
                                            AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisation_ID ) 
                                            AND (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = @proposalStage )

                                            AND (
                                                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                                                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN @begindate AND @enddate
                                            )

                                            AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded

                                            and tbl_project.project_id = @og_projectid
                                ) columnAtoM


                                WHERE 
                        
                                case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                        when @modeofimp = 'EPC' then 'EPC/Others' 
                                        else 
                                            columnAtoM.implementation_group
                                        end =  columnAtoM.implementation_group 

                        
                    END;`;
        }

        if (columnNo == 'N') {
            projectHistoryData = `DECLARE
            @issagarmalafunded bit, @begindate date, @enddate date, @lastDatePreviousFy date ,
            @previousMonthLastDate date ,  @currentMonthFirstDate date , @todaydate date = getdate(), @financialMonth int, @proposalStage int,
            @currentYearColE nvarchar(50), @organisation_categoryID int ,  @organisation_ID int, @og_projectid nvarchar(50), @modeofimp nvarchar(50) 

            set @organisation_ID = ${organisation_ID};
            set @organisation_categoryID = 3 ;
            SET @modeofimp = '${modOfImp}';
            SET @og_projectid = '${projectId}';
            SET @issagarmalafunded = ${isSagarmalafunded};
            SET @proposalStage = ${proposalStage};
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
                    SELECT * FROM (
                                        SELECT distinct
                                    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) AS organisation_id,
                                    mmt_organisation.organisation_name, 
                                    tbl_project.project_id, tbl_sub_project.sub_project_id, 
                                    project_name, sub_project_name, 
                                    CASE WHEN ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) 
                                                    in ('EPC', 'OTHERS') THEN 'EPC/Others' ELSE 'PPP/Captive' END AS implementation_group,								
                                    ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,       
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
                                            ---------------------------------------------------------------------------------------------
                                    
                                            ---------------------------------------------------------------------------------------------
                                    WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) =  @organisation_ID) 

                                    AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = @issagarmalafunded 

                                            ---------------------------------------------------------------------------------------------
                                    
                                    AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )            
                                    AND	(
                                        ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 14
                                        OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 11
                                        OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 3
                                    )
                                    AND (
                                        ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                                        OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > @lastDatePreviousFy
                                    )
                                
                                    and tbl_project.project_id = @og_projectid
                        ) TotalNoOfSubProjectsApproved
                        WHERE 
            
                            case when @modeofimp = 'PPP' then 'PPP/Captive' 
                                when @modeofimp = 'EPC' then 'EPC/Others' 
                                else 
                                    TotalNoOfSubProjectsApproved.implementation_group
                                end =  TotalNoOfSubProjectsApproved.implementation_group 
                        
                            order by TotalNoOfSubProjectsApproved.implementation_group, TotalNoOfSubProjectsApproved.project_id, TotalNoOfSubProjectsApproved.sub_project_id,
                                TotalNoOfSubProjectsApproved.project_name,TotalNoOfSubProjectsApproved.sub_project_name
            END;`;
        }


        // Execute the SQL query
        const result = await request.query(projectHistoryData);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available for this.' });
        }
    
        let columnDefs = [
            { headerName: 'Project ID',field: 'sub_project_id'},
            {
                headerName: 'Name of',
                headerClass : "headercenter",
                children: [
                    { 
                        headerName: 'Project', 
                        field: 'project_name', 
                        width: 350
                    },
                    { 
                        headerName: 'Sub Project', 
                        field: 'sub_project_name', 
                        width: 350
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
                        field: "project_intiated_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_project_initiated_date, params.data.project_initiated_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Preliminary Feasibility/TEFR Report prepared",
                        field: "prefeasibility_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_prefeasibility_actual_date, params.data.prefeasibility_actual_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Estimate / DPR prepared",
                        field: "dpr_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_dpr_actual_date, params.data.dpr_actual_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Chairman / Board Approval",
                        field: "chairman_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_chairman_approval_date, params.data.chairman_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Submitted to Ministry for approval (If required)",
                        field: "ministry_submission_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_ministry_submission_date, params.data.ministry_submission_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "DA concurrence obtained",
                        field: "da_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_da_approval_date, params.data.da_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "IFW concurrence obtained",
                        field: "ifw_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_ifw_approval_date, params.data.ifw_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Circulated for IMC",
                        field: "imc_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_imc_approval_date, params.data.imc_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Response to Comments received",
                        field: "response_com_rec_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_response_com_rec_approval_date, params.data.response_com_rec_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Appraisal by SFC/DIB/EFC/PIB/DIB/PPPAC",
                        field: "sfc_approval_date",
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_sfc_approval_date, params.data.sfc_approval_date) : '';
                        },
                        width: 250
                    },
                    {
                        headerName: "Admn. Approval / Estimate Sanction by Comp. Authority",
                        field: "admin_approval_approval_date", 
                        valueGetter: params => {
                            return params.data ? CONVERTDate(params.data.sub_admin_approval_approval_date, params.data.admin_approval_approval_date) : '';
                        },
                        width: 250
                    }
                ]
            },
            { headerName: 'Sanctioned cost', field: 'sanctioned_cost'}
        ];

    
        res.json({ columnDefs, rowData });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

// ----------------------------------------------------------------------------------------------------------------------------------     
async function getDataProposalReportStageWise(req, res) {
    const organisationID = req.params.organisationID;
    const proposalStage = req.params.proposalStage;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;

    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);
    request.input("proposalStage", proposalStage);
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
    let proposalStageAtoH = `    SELECT 
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
          
            WHERE (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
            AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID ) 
            AND (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = @proposalStage )

            AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
            )
     
    `

    if (isSagarmalaFunded == 'true') {
        proposalStageAtoH += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        proposalStageAtoH += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        proposalStageAtoH += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }


    proposalStageAtoH += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;
    try {


        const getProposalDetailsQuery = await request.query(proposalStageAtoH);


        const response = { getProposalDetailsQuery: getProposalDetailsQuery.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};


// ----------------------------------------------------------GRAND TOTAL -------------------------------------------------------------     
async function getGrandTotalProposalStagewise(req, res) {
    const proposalStage = req.params.proposalStage;
    const modOfImp = req.params.modOfImp;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter; 

    const conn = await pool;
    const request = conn.request();
    request.input("proposalStage", proposalStage);
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

    let proposalStageAtoH;
    // ----------------------------------------------------------------------------------------------------------------------------------
    proposalStageAtoH = `    SELECT 
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

    // WHERE CONDITION STARTS
    proposalStageAtoH += `   WHERE  ` 
        

    if(orgCategoryFilter != 'nofilter') {      
        proposalStageAtoH += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') {  
        proposalStageAtoH += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') {
        proposalStageAtoH += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        proposalStageAtoH += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }


    proposalStageAtoH += `	 AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
        AND (ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id) = @proposalStage )

        AND (
            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
            OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}'
        )  `



    if (isSagarmalaFunded == 'true') {
        proposalStageAtoH += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }
    if (modOfImp == 'PPP+Captive') {
        proposalStageAtoH += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        proposalStageAtoH += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }


    proposalStageAtoH += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;
    try {


        const getProposalDetailsQuery = await request.query(proposalStageAtoH);


        const response = { getProposalDetailsQuery: getProposalDetailsQuery.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getGrandTotalProposalCol4(req, res) {
    const proposalStage = req.params.proposalStage;
    const modOfImp = req.params.modOfImp;
    const columnNo = req.params.columnNo;
    const isSagarmalaFunded = req.params.isSagarmalaFunded;
    const orgCategoryFilter = req.params.orgCategoryFilter;  
    const orgFilter = req.params.orgFilter;  
    
    const conn = await pool;
    const request = conn.request();
    request.input("proposalStage", proposalStage);
    request.input("modOfImp", modOfImp);
    request.input("columnNo", columnNo);
    request.input("isSagarmalaFunded", isSagarmalaFunded);
    request.input("orgCategoryFilter", orgCategoryFilter);
    request.input("orgFilter", orgFilter);

    console.log(orgCategoryFilter, "orgCategoryFilter")

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

    let proposalCol4;

    proposalCol4 = `  SELECT 
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

    if (columnNo == 4) {
        proposalCol4 += ` LEFT JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }

    if (columnNo == 6) {
        proposalCol4 += ` INNER JOIN tbl_project_drop_request on tbl_project_drop_request.project_id = tbl_project.project_id  
                            OR tbl_project_drop_request.sub_project_id = tbl_sub_project.sub_project_id   `
    }


    // // WHERE CONDITION STARTS
    // proposalCol4 += `   WHERE (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )  `


    // WHERE CONDITION STARTS
    proposalCol4 += `   WHERE  ` 

    if(orgCategoryFilter != 'nofilter')
    {      
        proposalCol4 += `((mmt_organisation.organisation_category_id) = ${organisationCategoryId}) `
    }

    //No orgCat filter and Org filter
    if(orgCategoryFilter == 'nofilter' && orgFilter == 'nofilter') { 
        proposalCol4 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) != 4 )`
    } 
    //No orgCat filter 
    else  if(orgCategoryFilter == 'nofilter') { 
        proposalCol4 += `(ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
    // orgCat filter and Org filter appplied
    else  if(orgCategoryFilter != 'nofilter' && orgFilter != 'nofilter') { 
        proposalCol4 += `AND (ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = ${organisationId} )`
    }
 

    if (isSagarmalaFunded == 'true') {
        proposalCol4 += "AND ISNULL(tbl_sub_project.sub_is_sagarmala_funded, tbl_project.is_sagarmala_funded) = 1"
    }

    if (columnNo == 4) {
        proposalCol4 += `
            AND (
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                    OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
                )

            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) < '${firstDateCurrentFy}' 
                )         
        `
    }
    if (columnNo == 5) {
        proposalCol4 += `-- AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )    
            AND (
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date) >= '${firstDateCurrentFy}' 
                )     
        `
    }

    if (columnNo == 6) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 0 )
            AND (tbl_project_drop_request.drop_date BETWEEN '${firstDateCurrentFy}' AND '${lastDateCurrentFy}')  
        `
    }

    if (columnNo == 7) {
        proposalCol4 += ` AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
        AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
            )
        `
    }

    if (columnNo == 19) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )
            AND (ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) BETWEEN '${firstDateCurrentFy}' and '${lastDateCurrentFy}')
        `
    }

    if (columnNo == 20) {
        proposalCol4 += `  AND (ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1 )            
            AND	(
                ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 14
                OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 11
                OR ISNULL(tbl_sub_project.sub_project_stage_id, tbl_project.project_stage_id)= 3
            )
            AND (
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) IS NULL
                OR ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion) > '${lastDatePreviousFy}'
            )
        `
    }
    console.log(proposalCol4)

    if (modOfImp == 'PPP+Captive') {
        proposalCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'PPP' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Captive') )"
    }
    else if (modOfImp == 'EPC+Others') {
        proposalCol4 += " AND ( (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation)= 'EPC' ) OR (ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'Others') )"
    }

    proposalCol4 += `	 ORDER BY  
        tbl_project.project_id, tbl_sub_project.sub_project_id, 
        project_name,  sub_project_name  `;

    try {
        const getProposalDetailsCol4 = await request.query(proposalCol4);

        const response = { getProposalDetailsCol4: getProposalDetailsCol4.recordset }
        res.json(response);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
export default {
    proposalAbstractReportData, getDetailsProposalCol4, getDataProposalReportStageWise, getGrandTotalProposalStagewise,
    getGrandTotalProposalCol4, iwaiProposalAbstractReportData, iwaigetDetailsProposal
};